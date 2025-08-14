import { requireApiPermission } from '../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID, ensureUser } from '../../lib/db';
import { openai, DEFAULT_CHAT_MODEL } from '../../lib/ai';
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

  const { chatId, projectId, messages, mode } = req.body;
  const userId = session.user.id;
  const email = session.user.email;
  const displayName = session.user.name;

  try {
    // Ensure user exists
    await ensureUser(userId, email, displayName);

    // 1) Ensure chat exists
    let chat_id = chatId;
    if (!chat_id) {
      const { data: chat, error } = await supabaseAdmin
        .from('chats')
        .insert([{
          org_id: EMTEK_ORG_ID,
          project_id: projectId || null,
          title: null,
          mode: mode || 'normal',
          created_by: userId
        }])
        .select()
        .single();

      if (error) {
        console.error('Chat creation error:', error);
        return res.status(500).json({ error: error.message });
      }
      chat_id = chat.id;
    }

    // 2) Insert user message
    const userContent = messages[messages.length - 1]?.content || '';
    const { data: userMsg, error: umErr } = await supabaseAdmin
      .from('messages')
      .insert([{
        chat_id,
        role: 'user',
        content_md: userContent,
        model: 'user'
      }])
      .select()
      .single();

    if (umErr) {
      console.error('User message error:', umErr);
      return res.status(500).json({ error: umErr.message });
    }

    // 3) Prepare SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    });

    const send = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // 4) Stream from OpenAI
      const systemPrompt = projectId 
        ? `You are Emmie, an AI assistant helping with project management and collaboration. Keep answers concise and helpful. Always use markdown formatting for better readability. When discussing projects, focus on actionable insights, decisions, risks, and deadlines.`
        : `You are Emmie, a helpful AI assistant. Keep answers concise and always use markdown formatting for better readability.`;

      const stream = await openai.chat.completions.create({
        model: DEFAULT_CHAT_MODEL,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ]
      });

      let assistantMd = '';
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content || '';
        if (delta) {
          assistantMd += delta;
          send('token', { delta });
        }
      }

      // 5) Save assistant message
      const { data: aMsg, error: amErr } = await supabaseAdmin
        .from('messages')
        .insert([{
          chat_id,
          role: 'assistant',
          content_md: assistantMd,
          model: DEFAULT_CHAT_MODEL
        }])
        .select()
        .single();

      if (amErr) {
        console.error('Assistant message error:', amErr);
        send('error', { error: amErr.message });
        return res.end();
      }

      // 6) (Non-blocking) extract knowledge if project chat
      if (projectId && process.env.APP_BASE_URL) {
        fetch(`${process.env.APP_BASE_URL}/api/project-knowledge/extract`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            cookie: req.headers.cookie || '' 
          },
          body: JSON.stringify({ chatId: chat_id })
        }).catch((error) => {
          console.error('Knowledge extraction failed:', error);
        });
      }

      send('done', { chatId: chat_id, messageId: aMsg.id });
      res.end();

    } catch (streamError) {
      console.error('Streaming error:', streamError);
      send('error', { error: 'Failed to generate response' });
      res.end();
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
