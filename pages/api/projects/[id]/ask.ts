import { requireApiPermission } from '../../../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID } from '../../../../lib/db';
import { openai, DEFAULT_CHAT_MODEL } from '../../../../lib/ai';
import { NextApiRequest, NextApiResponse } from 'next';

export const config = { 
  api: { 
    bodyParser: { sizeLimit: '1mb' } 
  } 
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return;
  
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id: projectId } = req.query;
  const { question } = req.body;

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Question is required' });
  }

  try {
    // Load project and verify access
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, org_id, name, description, knowledge_summary_md')
      .eq('id', projectId)
      .eq('org_id', EMTEK_ORG_ID)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify user has access to this project
    const { data: membership } = await supabaseAdmin
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', session.user.id)
      .single();

    if (!membership) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    // Load recent facts grouped by kind
    const { data: facts, error: factsError } = await supabaseAdmin
      .from('project_facts')
      .select('id, kind, label, value, owner, date, impact, mitigation, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (factsError) {
      console.error('Facts fetch error:', factsError);
      return res.status(500).json({ error: factsError.message });
    }

    // Load recent notes
    const { data: notes, error: notesError } = await supabaseAdmin
      .from('project_notes')
      .select('note_md, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (notesError) {
      console.error('Notes fetch error:', notesError);
      return res.status(500).json({ error: notesError.message });
    }

    // TODO: In future, add embeddings search here for RAG
    const ragSnippets: any[] = []; // Placeholder for RAG snippets

    // SSE setup
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    });

    const send = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // Build context for the AI
      const context = `
# Project: ${project.name}

## Description
${project.description || 'No description provided'}

## Knowledge Summary
${project.knowledge_summary_md || 'No summary available yet'}

## Project Facts

### Decisions
${(facts || []).filter(f => f.kind === 'decision').map(f => 
  `- **${f.label}**: ${f.value}${f.owner ? ` (Owner: ${f.owner})` : ''}${f.date ? ` (Date: ${f.date})` : ''}`
).join('\n') || 'None recorded'}

### Risks
${(facts || []).filter(f => f.kind === 'risk').map(f => 
  `- **${f.label}**: ${f.value}${f.impact ? ` (Impact: ${f.impact})` : ''}${f.mitigation ? ` (Mitigation: ${f.mitigation})` : ''}`
).join('\n') || 'None recorded'}

### Deadlines
${(facts || []).filter(f => f.kind === 'deadline').map(f => 
  `- **${f.label}**: ${f.date}${f.owner ? ` (Owner: ${f.owner})` : ''}`
).join('\n') || 'None recorded'}

### Owners & Responsibilities
${(facts || []).filter(f => f.kind === 'owner').map(f => 
  `- **${f.label}**: ${f.value}`
).join('\n') || 'None recorded'}

### Metrics
${(facts || []).filter(f => f.kind === 'metric').map(f => 
  `- **${f.label}**: ${f.value}${f.date ? ` (As of: ${f.date})` : ''}`
).join('\n') || 'None recorded'}

## Recent Notes
${(notes || []).map(n => `- ${n.note_md}`).join('\n') || 'None recorded'}

${ragSnippets.length > 0 ? `## Additional Context\n${ragSnippets.map((s, i) => `[S${i+1}] ${s.title}\n${s.content}`).join('\n\n')}` : ''}
      `;

      const stream = await openai.chat.completions.create({
        model: DEFAULT_CHAT_MODEL,
        stream: true,
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant helping with project analysis. You have access to comprehensive project information including decisions, risks, deadlines, owners, metrics, and notes. 

Answer questions accurately based on the provided context. If you reference specific information, be clear about what type of fact it is (decision, risk, deadline, etc.). 

If you reference RAG snippets, cite them as [S1], [S2], etc. 

Use markdown formatting for clarity. Be concise but thorough.`
          },
          {
            role: 'user',
            content: `Based on the following project information, please answer this question: "${question}"\n\n${context}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content || '';
        if (delta) {
          send('token', { delta });
        }
      }

      send('done', {});
      res.end();

    } catch (streamError) {
      console.error('Streaming error:', streamError);
      send('error', { error: 'Failed to generate response' });
      res.end();
    }

  } catch (error) {
    console.error('Project ask error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
