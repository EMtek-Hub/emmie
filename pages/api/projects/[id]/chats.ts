import { requireApiPermission } from '../../../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID, ensureUser } from '../../../../lib/db';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return; // Response already sent

  const userId = session.user.id;
  const email = session.user.email;
  const displayName = session.user.name;
  const { id: projectId } = req.query;

  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
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
      // Verify user has access to this project
      const { data: membership } = await supabaseAdmin
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .single();

      if (!membership) {
        return res.status(403).json({ error: 'Access denied to this project' });
      }

      // Get recent chats with message counts
      const { data: chats, error: chatsError } = await supabaseAdmin
        .from('chats')
        .select(`
          id,
          title,
          created_at,
          updated_at,
          created_by,
          messages(count)
        `)
        .eq('project_id', projectId)
        .eq('org_id', EMTEK_ORG_ID)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (chatsError) {
        console.error('Chats fetch error:', chatsError);
        return res.status(500).json({ error: chatsError.message });
      }

      return res.json({ chats: chats || [] });
    } catch (error) {
      console.error('Unexpected error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET']);
  res.status(405).json({ error: 'Method not allowed' });
}
