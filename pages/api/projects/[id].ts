import { requireApiPermission } from '../../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID, ensureUser } from '../../../lib/db';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return; // Response already sent

  const userId = session.user.id;
  const email = session.user.email;
  const displayName = session.user.name;
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
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
      const { data: project, error } = await supabaseAdmin
        .from('projects')
        .select(`
          *,
          created_by_user:users!projects_created_by_fkey(display_name, email),
          project_members!inner(
            role,
            user:users(display_name, email)
          ),
          _count_facts:project_facts(count),
          _count_chats:chats(count)
        `)
        .eq('id', id)
        .eq('org_id', EMTEK_ORG_ID)
        .eq('project_members.user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Project not found or access denied' });
        }
        console.error('Database error:', error);
        return res.status(500).json({ error: error.message });
      }

      if (!project) {
        return res.status(404).json({ error: 'Project not found or access denied' });
      }

      return res.json({ project });
    } catch (error) {
      console.error('Unexpected error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    const { name, description, status } = req.body;

    try {
      // Check if user has permission to edit this project
      const { data: memberCheck, error: memberError } = await supabaseAdmin
        .from('project_members')
        .select('role')
        .eq('project_id', id)
        .eq('user_id', userId)
        .single();

      if (memberError || !memberCheck || !['owner', 'admin'].includes(memberCheck.role)) {
        return res.status(403).json({ error: 'Insufficient permissions to edit this project' });
      }

      const updates: any = {};
      if (name && typeof name === 'string' && name.trim().length > 0) {
        updates.name = name.trim();
      }
      if (description !== undefined) {
        updates.description = description?.trim() || null;
      }
      if (status && ['active', 'inactive', 'completed'].includes(status)) {
        updates.status = status;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid updates provided' });
      }

      const { data: project, error: updateError } = await supabaseAdmin
        .from('projects')
        .update(updates)
        .eq('id', id)
        .eq('org_id', EMTEK_ORG_ID)
        .select()
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        return res.status(500).json({ error: updateError.message });
      }

      return res.json({ project });
    } catch (error) {
      console.error('Unexpected error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Check if user has permission to delete this project
      const { data: memberCheck, error: memberError } = await supabaseAdmin
        .from('project_members')
        .select('role')
        .eq('project_id', id)
        .eq('user_id', userId)
        .single();

      if (memberError || !memberCheck || memberCheck.role !== 'owner') {
        return res.status(403).json({ error: 'Only project owners can delete projects' });
      }

      // Delete project (cascades will handle related records)
      const { error: deleteError } = await supabaseAdmin
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('org_id', EMTEK_ORG_ID);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        return res.status(500).json({ error: deleteError.message });
      }

      return res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      console.error('Unexpected error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  res.status(405).json({ error: 'Method not allowed' });
}
