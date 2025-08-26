import { requireApiPermission } from '../../../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID, ensureUser } from '../../../../lib/db';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return; // Response already sent

  const userId = session.user.id;
  const email = session.user.email;
  const displayName = session.user.name;
  const { id: chatId } = req.query;

  if (!chatId || typeof chatId !== 'string') {
    return res.status(400).json({ error: 'Chat ID is required' });
  }

  // Ensure user exists in Supabase
  try {
    await ensureUser(userId, email, displayName);
  } catch (error) {
    console.error('Error ensuring user:', error);
    return res.status(500).json({ error: 'Failed to sync user data' });
  }

  if (req.method === 'GET') {
    try {
      // First verify user has access to this chat
      const { data: chat, error: chatError } = await supabaseAdmin
        .from('chats')
        .select('id, created_by, title, agent_id, project_id')
        .eq('id', chatId)
        .eq('org_id', EMTEK_ORG_ID)
        .single();

      if (chatError || !chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      if (chat.created_by !== userId) {
        return res.status(403).json({ error: 'Access denied to this chat' });
      }

      // Get messages for this chat - conditionally include multimodal fields
      let selectFields = `
        id,
        role,
        content_md,
        created_at,
        tokens_in,
        tokens_out,
        model
      `;

      // Try to add multimodal fields if they exist
      try {
        const { error: columnCheck } = await supabaseAdmin
          .from('messages')
          .select('message_type, attachments')
          .limit(0);
        
        if (!columnCheck) {
          // Columns exist, add them to the select
          selectFields = `
            id,
            role,
            content_md,
            created_at,
            tokens_in,
            tokens_out,
            model,
            message_type,
            attachments
          `;
        }
      } catch (e) {
        // Columns don't exist, use basic fields
        console.log('Multimodal columns not found, using basic message fields');
      }

      const { data: messages, error: messagesError } = await supabaseAdmin
        .from('messages')
        .select(selectFields)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Messages fetch error:', messagesError);
        return res.status(500).json({ error: messagesError.message });
      }

      // Format messages for frontend
      const formattedMessages = (messages || []).map((msg: any) => {
        const formattedMsg: any = {
          id: msg.id,
          role: msg.role,
          content: msg.content_md,
          timestamp: new Date(msg.created_at),
          model: msg.model,
          tokensIn: msg.tokens_in,
          tokensOut: msg.tokens_out
        };

        // Include multimodal fields if they exist
        if (msg.message_type !== undefined) {
          formattedMsg.messageType = msg.message_type;
        }
        if (msg.attachments !== undefined) {
          formattedMsg.attachments = msg.attachments;
        }

        return formattedMsg;
      });

      return res.json({ 
        chat: {
          id: chat.id,
          title: chat.title,
          agentId: chat.agent_id,
          projectId: chat.project_id
        },
        messages: formattedMessages 
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET']);
  res.status(405).json({ error: 'Method not allowed' });
}
