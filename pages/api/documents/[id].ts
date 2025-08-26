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
    return res.status(400).json({ error: 'Valid document ID is required' });
  }

  // Ensure user exists in Supabase
  try {
    await ensureUser(userId, email, displayName);
  } catch (error) {
    console.error('Error ensuring user:', error);
    return res.status(500).json({ error: 'Failed to sync user data' });
  }

  if (req.method === 'DELETE') {
    try {
      // Check if document exists and belongs to the organization
      const { data: existingDocument, error: fetchError } = await supabaseAdmin
        .from('documents')
        .select('id, name, agent_id')
        .eq('id', id)
        .eq('org_id', EMTEK_ORG_ID)
        .single();

      if (fetchError || !existingDocument) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Delete document chunks first (due to foreign key constraint)
      const { error: chunksError } = await supabaseAdmin
        .from('document_chunks')
        .delete()
        .eq('document_id', id);

      if (chunksError) {
        console.error('Error deleting document chunks:', chunksError);
        return res.status(500).json({ error: 'Failed to delete document chunks' });
      }

      // Delete the document
      const { error: deleteError } = await supabaseAdmin
        .from('documents')
        .delete()
        .eq('id', id)
        .eq('org_id', EMTEK_ORG_ID);

      if (deleteError) {
        console.error('Database error:', deleteError);
        return res.status(500).json({ error: deleteError.message });
      }

      return res.json({ 
        message: 'Document deleted successfully',
        documentId: id
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'GET') {
    try {
      // Get document details
      const { data: document, error } = await supabaseAdmin
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
          updated_at,
          chat_agents!inner(name, department)
        `)
        .eq('id', id)
        .eq('org_id', EMTEK_ORG_ID)
        .single();

      if (error || !document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      return res.json({ document });
    } catch (error) {
      console.error('Unexpected error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'DELETE']);
  res.status(405).json({ error: 'Method not allowed' });
}
