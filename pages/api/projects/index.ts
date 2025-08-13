import { requireApiPermission } from '../../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID, ensureUser } from '../../../lib/db';
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
      const { data: projects, error } = await supabaseAdmin
        .from('projects')
        .select(`
          *,
          created_by_user:users!projects_created_by_fkey(display_name, email),
          project_members!inner(role),
          _count_facts:project_facts(count),
          _count_chats:chats(count)
        `)
        .eq('org_id', EMTEK_ORG_ID)
        .eq('project_members.user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.json({ projects: projects || [] });
    } catch (error) {
      console.error('Unexpected error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    try {
      // Create project
      const { data: project, error: projectError } = await supabaseAdmin
        .from('projects')
        .insert([{ 
          org_id: EMTEK_ORG_ID, 
          name: name.trim(), 
          description: description?.trim() || null, 
          created_by: userId 
        }])
        .select()
        .single();

      if (projectError) {
        console.error('Project creation error:', projectError);
        return res.status(500).json({ error: projectError.message });
      }

      // Auto-add creator as owner
      const { error: memberError } = await supabaseAdmin
        .from('project_members')
        .insert([{ 
          project_id: project.id, 
          user_id: userId, 
          role: 'owner' 
        }]);

      if (memberError) {
        console.error('Member assignment error:', memberError);
        return res.status(500).json({ error: 'Project created but failed to assign ownership' });
      }

      return res.status(201).json({ project });
    } catch (error) {
      console.error('Unexpected error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).json({ error: 'Method not allowed' });
}
