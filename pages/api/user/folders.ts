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
      // Get user folders
      const { data: folders, error: foldersError } = await supabaseAdmin
        .from('user_folders')
        .select('*')
        .eq('org_id', EMTEK_ORG_ID)
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (foldersError) {
        console.error('Folders fetch error:', foldersError);
        return res.status(500).json({ error: foldersError.message });
      }

      return res.json({ folders: folders || [] });
    } catch (error) {
      console.error('Unexpected error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    try {
      // Create new folder
      const { data: folder, error: folderError } = await supabaseAdmin
        .from('user_folders')
        .insert({
          name,
          description: description || null,
          user_id: userId,
          org_id: EMTEK_ORG_ID,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (folderError) {
        console.error('Folder creation error:', folderError);
        return res.status(500).json({ error: 'Failed to create folder' });
      }

      return res.json({ folder });
    } catch (error) {
      console.error('Unexpected error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).json({ error: 'Method not allowed' });
}
