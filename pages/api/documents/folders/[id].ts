import { NextApiRequest, NextApiResponse } from 'next';
import { requireApiPermission } from '../../../../lib/apiAuth';
import { supabaseAdmin } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return;

  const { id } = req.query;
  const userId = session.user.id;

  if (req.method === 'PATCH') {
    // Rename folder
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    try {
      const { data: folder, error } = await supabaseAdmin
        .from('user_folders')
        .update({ name: name.trim() })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error renaming folder:', error);
        return res.status(500).json({ error: 'Failed to rename folder' });
      }

      if (!folder) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      return res.status(200).json({ folder });
    } catch (error) {
      console.error('Error renaming folder:', error);
      return res.status(500).json({ error: 'Failed to rename folder' });
    }
  }

  if (req.method === 'DELETE') {
    // Delete folder and all its files
    try {
      // First, get all files in this folder to delete from storage
      const { data: files, error: filesError } = await supabaseAdmin
        .from('user_files')
        .select('id, storage_path')
        .eq('folder_id', id)
        .eq('user_id', userId);

      if (filesError) {
        console.error('Error fetching folder files:', filesError);
        return res.status(500).json({ error: 'Failed to delete folder' });
      }

      // Delete files from storage
      if (files && files.length > 0) {
        const storagePaths = files
          .map(f => f.storage_path)
          .filter(Boolean);

        if (storagePaths.length > 0) {
          const { error: storageError } = await supabaseAdmin.storage
            .from('media')
            .remove(storagePaths);

          if (storageError) {
            console.error('Storage deletion error:', storageError);
            // Continue with database deletion even if storage fails
          }
        }

        // Delete files from database
        const { error: deleteFilesError } = await supabaseAdmin
          .from('user_files')
          .delete()
          .eq('folder_id', id)
          .eq('user_id', userId);

        if (deleteFilesError) {
          console.error('Error deleting folder files:', deleteFilesError);
          return res.status(500).json({ error: 'Failed to delete folder files' });
        }
      }

      // Delete the folder itself
      const { error: deleteFolderError } = await supabaseAdmin
        .from('user_folders')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (deleteFolderError) {
        console.error('Error deleting folder:', deleteFolderError);
        return res.status(500).json({ error: 'Failed to delete folder' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Folder deletion error:', error);
      return res.status(500).json({ error: 'Failed to delete folder' });
    }
  }

  res.setHeader('Allow', ['PATCH', 'DELETE']);
  return res.status(405).json({ error: 'Method not allowed' });
}
