import { NextApiRequest, NextApiResponse } from 'next';
import { requireApiPermission } from '../../../../lib/apiAuth';
import { supabaseAdmin } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return;

  const userId = session.user.id;

  if (req.method === 'POST') {
    const { fileIds, folderId } = req.body;

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'File IDs array is required' });
    }

    // folderId can be null (moving to root) or a valid folder ID
    if (folderId !== null && typeof folderId !== 'string') {
      return res.status(400).json({ error: 'Invalid folder ID' });
    }

    try {
      // If folderId is provided, verify it exists and belongs to user
      if (folderId) {
        const { data: folder, error: folderError } = await supabaseAdmin
          .from('user_folders')
          .select('id')
          .eq('id', folderId)
          .eq('user_id', userId)
          .single();

        if (folderError || !folder) {
          return res.status(404).json({ error: 'Folder not found' });
        }
      }

      // Move files - update their folder_id
      const { data: updatedFiles, error: updateError } = await supabaseAdmin
        .from('user_files')
        .update({ folder_id: folderId })
        .in('id', fileIds)
        .eq('user_id', userId)
        .select();

      if (updateError) {
        console.error('Error moving files:', updateError);
        return res.status(500).json({ error: 'Failed to move files' });
      }

      return res.status(200).json({ 
        success: true,
        movedCount: updatedFiles?.length || 0
      });
    } catch (error) {
      console.error('File move error:', error);
      return res.status(500).json({ error: 'Failed to move files' });
    }
  }

  res.setHeader('Allow', ['POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
