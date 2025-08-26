import { requireApiPermission } from '../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID, ensureUser } from '../../lib/db';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return; // Response already sent

  const userId = session.user.id;
  const email = session.user.email;
  const displayName = session.user.name;

  // Ensure user exists in Supabase
  try {
    await ensureUser(userId, email, displayName);
  } catch (error) {
    console.error('Error ensuring user:', error);
    return res.status(500).json({ error: 'Failed to sync user data' });
  }

  if (req.method === 'GET') {
    try {
      // Get recent chats for this user with message counts and agent info
      const { data: chats, error: chatsError } = await supabaseAdmin
        .from('chats')
        .select(`
          id,
          title,
          created_at,
          updated_at,
          created_by,
          project_id,
          agent_id,
          projects(name),
          chat_agents(name, department, color),
          messages(count)
        `)
        .eq('org_id', EMTEK_ORG_ID)
        .eq('created_by', userId)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (chatsError) {
        console.error('Chats fetch error:', chatsError);
        return res.status(500).json({ error: chatsError.message });
      }

      // Format the response to include computed fields
      const formattedChats = (chats || []).map((chat: any) => ({
        id: chat.id,
        title: chat.title || 'New Chat',
        updatedAt: chat.updated_at,
        createdAt: chat.created_at,
        projectId: chat.project_id,
        projectName: chat.projects?.[0]?.name,
        agentId: chat.agent_id,
        agentName: chat.chat_agents?.[0]?.name,
        agentDepartment: chat.chat_agents?.[0]?.department,
        agentColor: chat.chat_agents?.[0]?.color,
        messageCount: chat.messages?.[0]?.count || 0
      }));

      return res.json({ chats: formattedChats });
    } catch (error) {
      console.error('Unexpected error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    const { title, projectId, agentId } = req.body;
    
    try {
      // Create new chat session
      const { data: chat, error: chatError } = await supabaseAdmin
        .from('chats')
        .insert({
          title: title || null,
          created_by: userId,
          org_id: EMTEK_ORG_ID,
          project_id: projectId || null,
          agent_id: agentId || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (chatError) {
        console.error('Chat creation error:', chatError);
        return res.status(500).json({ error: 'Failed to create chat' });
      }

      return res.json({ chat });
    } catch (error) {
      console.error('Unexpected error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    const { chatId } = req.body;
    
    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID is required' });
    }

    try {
      // Verify user has access to this chat
      const { data: chat, error: chatError } = await supabaseAdmin
        .from('chats')
        .select('id, created_by')
        .eq('id', chatId)
        .eq('org_id', EMTEK_ORG_ID)
        .single();

      if (chatError || !chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      if (chat.created_by !== userId) {
        return res.status(403).json({ error: 'Access denied to this chat' });
      }

      // Delete the chat (messages will be deleted via cascade)
      const { error: deleteError } = await supabaseAdmin
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (deleteError) {
        console.error('Chat deletion error:', deleteError);
        return res.status(500).json({ error: 'Failed to delete chat' });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error('Unexpected error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  res.status(405).json({ error: 'Method not allowed' });
}
