import { requireApiPermission } from '../../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID } from '../../../lib/db';
import { createResponse, logAIOperation } from '../../../lib/ai';
import { NextApiRequest, NextApiResponse } from 'next';

export const config = { 
  api: { 
    bodyParser: { sizeLimit: '1mb' } 
  } 
};

// JSON schema for knowledge extraction
const knowledgeSchema = {
  type: "object",
  properties: {
    decisions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          value: { type: "string" },
          owner: { type: "string" },
          date: { type: "string" }
        },
        required: ["label", "value"],
        additionalProperties: false
      }
    },
    risks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          value: { type: "string" },
          impact: { type: "string" },
          mitigation: { type: "string" }
        },
        required: ["label", "value"],
        additionalProperties: false
      }
    },
    deadlines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          date: { type: "string" },
          owner: { type: "string" }
        },
        required: ["label", "date"],
        additionalProperties: false
      }
    },
    owners: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          value: { type: "string" }
        },
        required: ["label", "value"],
        additionalProperties: false
      }
    },
    metrics: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          value: { type: "string" },
          date: { type: "string" }
        },
        required: ["label", "value"],
        additionalProperties: false
      }
    }
  },
  required: ["decisions", "risks", "deadlines", "owners", "metrics"],
  additionalProperties: false
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return;
  
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { chatId } = req.body;

  if (!chatId) {
    return res.status(400).json({ error: 'chatId is required' });
  }

  try {
    const startTime = Date.now();

    // Fetch chat with project context
    const { data: chat, error: chatError } = await supabaseAdmin
      .from('chats')
      .select('id, project_id, org_id')
      .eq('id', chatId)
      .eq('org_id', EMTEK_ORG_ID)
      .single();

    if (chatError || !chat || !chat.project_id) {
      return res.status(404).json({ error: 'Chat not found or not a project chat' });
    }

    // Fetch chat messages
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select('role, content_md')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Messages fetch error:', messagesError);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: 'No messages in chat' });
    }

    // Build conversation context
    const conversationText = messages
      .map(m => `${m.role}: ${m.content_md}`)
      .join('\n\n');

    const instructions = `Extract structured project knowledge from the following conversation. Identify:
- Decisions: Key choices made about the project
- Risks: Potential issues or concerns
- Deadlines: Important dates and milestones
- Owners: People responsible for tasks or areas
- Metrics: Measurable indicators or KPIs

Only extract information that is explicitly mentioned. If no information exists for a category, return an empty array.`;

    const input = `Analyze this conversation and extract project knowledge:\n\n${conversationText}`;

    logAIOperation('knowledge_extraction_start', {
      chatId,
      projectId: chat.project_id,
      messageCount: messages.length
    });

    // Use Responses API with structured outputs
    const response = await createResponse({
      model: 'gpt-5-mini', // Use mini for fast structured extraction
      instructions,
      input,
      text: {
        format: {
          type: 'json_schema',
          name: 'knowledge_extraction',
          schema: knowledgeSchema
        }
      },
      reasoning: { effort: 'low' }
    });

    // Parse the JSON response
    let extractedKnowledge;
    try {
      extractedKnowledge = typeof response === 'string' ? JSON.parse(response) : response;
    } catch (parseError) {
      console.error('Failed to parse knowledge extraction:', parseError);
      return res.status(500).json({ error: 'Failed to parse extracted knowledge' });
    }

    // Count total facts extracted
    const totalFacts = 
      (extractedKnowledge.decisions?.length || 0) +
      (extractedKnowledge.risks?.length || 0) +
      (extractedKnowledge.deadlines?.length || 0) +
      (extractedKnowledge.owners?.length || 0) +
      (extractedKnowledge.metrics?.length || 0);

    logAIOperation('knowledge_extraction_complete', {
      chatId,
      projectId: chat.project_id,
      factsExtracted: totalFacts,
      duration: Date.now() - startTime
    });

    // Insert facts into database
    const factsToInsert: any[] = [];

    // Add decisions
    extractedKnowledge.decisions?.forEach((decision: any) => {
      factsToInsert.push({
        project_id: chat.project_id,
        org_id: EMTEK_ORG_ID,
        kind: 'decision',
        label: decision.label,
        value: decision.value,
        owner: decision.owner || null,
        date: decision.date || null,
        source_chat_id: chatId
      });
    });

    // Add risks
    extractedKnowledge.risks?.forEach((risk: any) => {
      factsToInsert.push({
        project_id: chat.project_id,
        org_id: EMTEK_ORG_ID,
        kind: 'risk',
        label: risk.label,
        value: risk.value,
        impact: risk.impact || null,
        mitigation: risk.mitigation || null,
        source_chat_id: chatId
      });
    });

    // Add deadlines
    extractedKnowledge.deadlines?.forEach((deadline: any) => {
      factsToInsert.push({
        project_id: chat.project_id,
        org_id: EMTEK_ORG_ID,
        kind: 'deadline',
        label: deadline.label,
        date: deadline.date,
        owner: deadline.owner || null,
        source_chat_id: chatId
      });
    });

    // Add owners
    extractedKnowledge.owners?.forEach((owner: any) => {
      factsToInsert.push({
        project_id: chat.project_id,
        org_id: EMTEK_ORG_ID,
        kind: 'owner',
        label: owner.label,
        value: owner.value,
        source_chat_id: chatId
      });
    });

    // Add metrics
    extractedKnowledge.metrics?.forEach((metric: any) => {
      factsToInsert.push({
        project_id: chat.project_id,
        org_id: EMTEK_ORG_ID,
        kind: 'metric',
        label: metric.label,
        value: metric.value,
        date: metric.date || null,
        source_chat_id: chatId
      });
    });

    // Insert all facts at once
    if (factsToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('project_facts')
        .insert(factsToInsert);

      if (insertError) {
        console.error('Facts insert error:', insertError);
        return res.status(500).json({ error: 'Failed to save extracted facts' });
      }
    }

    return res.status(200).json({
      success: true,
      factsExtracted: totalFacts,
      breakdown: {
        decisions: extractedKnowledge.decisions?.length || 0,
        risks: extractedKnowledge.risks?.length || 0,
        deadlines: extractedKnowledge.deadlines?.length || 0,
        owners: extractedKnowledge.owners?.length || 0,
        metrics: extractedKnowledge.metrics?.length || 0
      }
    });

  } catch (error: any) {
    console.error('Knowledge extraction error:', error);
    logAIOperation('knowledge_extraction_error', {
      chatId: req.body.chatId,
      error: error.message
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
