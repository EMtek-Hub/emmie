import { requireApiPermission } from '../../../../../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID, ensureUser } from '../../../../../../lib/db';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return; // Response already sent

  const userId = session.user.id;
  const email = session.user.email;
  const displayName = session.user.name;
  const { id: projectId, chatId } = req.query;

  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }

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
      // Verify user has access to this project and chat
      const { data: chat, error: chatError } = await supabaseAdmin
        .from('chats')
        .select(`
          id,
          project_id,
          created_by,
          title,
          projects!inner(
            id,
            project_members!inner(user_id, role)
          )
        `)
        .eq('id', chatId)
        .eq('project_id', projectId)
        .eq('org_id', EMTEK_ORG_ID)
        .eq('projects.project_members.user_id', userId)
        .single();

      if (chatError || !chat) {
        return res.status(404).json({ error: 'Chat not found or access denied' });
      }

      // Get all messages for this chat session
      const { data: messages, error: messagesError } = await supabaseAdmin
        .from('messages')
        .select(`
          id,
          role,
          content_md,
          created_at
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Messages fetch error:', messagesError);
        return res.status(500).json({ error: messagesError.message });
      }

      return res.json({ 
        chat,
        messages: messages || []
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET']);
  res.status(405).json({ error: 'Method not allowed' });
}
