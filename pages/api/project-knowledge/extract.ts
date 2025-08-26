import { requireApiPermission } from '../../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID } from '../../../lib/db';
import { openai, GPT5_MODELS, selectGPT5Model } from '../../../lib/ai';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { chatId } = req.body;

  if (!chatId) {
    return res.status(400).json({ error: 'Chat ID is required' });
  }

  try {
    // Get last ~30 messages from the chat
    const { data: msgs, error: msgError } = await supabaseAdmin
      .from('messages')
      .select('role, content_md, created_at')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (msgError) {
      console.error('Message fetch error:', msgError);
      return res.status(500).json({ error: msgError.message });
    }

    if (!msgs || msgs.length === 0) {
      return res.json({ ok: true, message: 'No messages to extract from' });
    }

    // Build conversation context
    const conversation = msgs
      .reverse() // Put back in chronological order
      .map(m => `${m.role.toUpperCase()}: ${m.content_md}`)
      .join('\n---\n');

    const prompt = `
From the following conversation, extract structured project knowledge in strict JSON format.

Extract:
- decisions: Array of {label: string, value: string, owner?: string, date?: string}
- risks: Array of {label: string, value: string, impact?: string, mitigation?: string}
- deadlines: Array of {label: string, date: string, owner?: string}
- owners: Array of {label: string, person: string}
- metrics: Array of {label: string, value: string, as_of_date?: string}
- notes: Array of strings (≤10 short bullets helpful for future retrieval)

Only extract clear, actionable information. If no relevant information is found, return empty arrays.
Return ONLY valid JSON, no additional text.

Conversation:
${conversation}
    `;

    // Use GPT-5 for better structured data extraction
    const selectedModel = selectGPT5Model({
      isComplexTask: true, // Structured extraction is complex
      messageLength: conversation.length
    });

    const completion = await openai.responses.create({
      model: selectedModel,
      instructions: 'You extract structured project knowledge as strict JSON. Return only valid JSON with no additional text or formatting.',
      input: prompt,
      reasoning: { effort: 'medium' as any } // Medium reasoning for structured extraction
    });

    // Parse JSON with error handling
    let extractedData: any = {
      decisions: [],
      risks: [],
      deadlines: [],
      owners: [],
      metrics: [],
      notes: []
    };

    try {
      const content = completion.output_text || '{}';
      extractedData = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content:', completion.output_text);
      // Continue with empty data rather than failing
    }

    // Hand off to commit endpoint (preserve SSO cookie)
    if (process.env.APP_BASE_URL) {
      await fetch(`${process.env.APP_BASE_URL}/api/project-knowledge/commit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          cookie: req.headers.cookie || '' 
        },
        body: JSON.stringify({ chatId, ...extractedData })
      });
    }

    res.json({ ok: true, extracted: extractedData });

  } catch (error) {
    console.error('Knowledge extraction error:', error);
    return res.status(500).json({ error: 'Failed to extract knowledge' });
  }
}
