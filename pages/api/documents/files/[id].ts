import { NextApiRequest, NextApiResponse } from 'next';
import { requireApiPermission } from '../../../../lib/apiAuth';
import { supabaseAdmin } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return;

  const { id } = req.query;
  const userId = session.user.id;

  if (req.method === 'DELETE') {
    try {
      // Get file info to delete from storage
      const { data: file, error: fetchError } = await supabaseAdmin
        .from('user_files')
        .select('storage_path, user_id')
        .eq('id', id)
        .single();

      if (fetchError || !file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Ensure user owns the file
      if (file.user_id !== userId) {
        return res.status(403).json({ error: 'Not authorized to delete this file' });
      }

      // Delete from storage if path exists
      if (file.storage_path) {
        const { error: storageError } = await supabaseAdmin.storage
          .from('media')
          .remove([file.storage_path]);

        if (storageError) {
          console.error('Storage deletion error:', storageError);
          // Continue with database deletion even if storage fails
        }
      }

      // Delete from database
      const { error: deleteError } = await supabaseAdmin
        .from('user_files')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Database deletion error:', deleteError);
        return res.status(500).json({ error: 'Failed to delete file' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('File deletion error:', error);
      return res.status(500).json({ error: 'Failed to delete file' });
    }
  }

  res.setHeader('Allow', ['DELETE']);
  return res.status(405).json({ error: 'Method not allowed' });
}
