import { NextApiRequest, NextApiResponse } from 'next';
import { requireApiPermission } from '../../../../lib/apiAuth';
import { supabaseAdmin } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return;

  const userId = session.user.id;

  if (req.method === 'POST') {
    // Create new folder
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    // Get org_id from session or user table
    let orgId = session.user.org_id;
    
    if (!orgId) {
      // Fallback: fetch from users table
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('org_id')
        .eq('id', userId)
        .single();
      
      orgId = userData?.org_id;
    }

    if (!orgId) {
      console.error('Missing org_id for user:', userId);
      return res.status(400).json({ 
        error: 'Organization ID is required',
        details: 'User is not associated with an organization'
      });
    }

    try {
      const { data: folder, error } = await supabaseAdmin
        .from('user_folders')
        .insert({
          user_id: userId,
          org_id: orgId,
          name: name.trim()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating folder:', error);
        return res.status(500).json({ error: 'Failed to create folder' });
      }

      return res.status(201).json({ folder });
    } catch (error) {
      console.error('Error creating folder:', error);
      return res.status(500).json({ error: 'Failed to create folder' });
    }
  }

  res.setHeader('Allow', ['POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
