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
      const { agentId } = req.query;
      
      let query = supabaseAdmin
        .from('documents')
        .select(`
          id,
          agent_id,
          name,
          original_filename,
          file_size,
          mime_type,
          status,
          chunk_count,
          created_at,
          updated_at
        `)
        .eq('org_id', EMTEK_ORG_ID)
        .order('created_at', { ascending: false });

      // Filter by agent if specified
      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      const { data: documents, error } = await query;

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.json({ documents: documents || [] });
    } catch (error) {
      console.error('Unexpected error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET']);
  res.status(405).json({ error: 'Method not allowed' });
}
