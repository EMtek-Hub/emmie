import { requireApiPermission } from '../../../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID, ensureUser } from '../../../../lib/db';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = session.user.id;
  const email = session.user.email;
  const displayName = session.user.name;

  try {
    await ensureUser(userId, email, displayName);
  } catch (error) {
    console.error('Error ensuring user:', error);
    return res.status(500).json({ error: 'Failed to sync user data' });
  }

  const { url, folder_id } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    // Create a unique filename based on the URL
    const urlObj = new URL(url);
    const fileName = urlObj.pathname.split('/').pop() || 'link-document';
    const safeName = fileName.length > 0 ? fileName : 'web-document';

    // Save file metadata to database
    const { data: file, error: dbError } = await supabaseAdmin
      .from('user_files')
      .insert({
        user_id: userId,
        org_id: EMTEK_ORG_ID,
        folder_id: folder_id || null,
        name: safeName,
        original_filename: safeName,
        file_size: 0, // Unknown for URLs
        mime_type: 'text/html',
        file_type: 'document',
        storage_path: '', // No storage path for URLs
        link_url: url,
        status: 'indexed',
        chat_file_type: 'PLAIN_TEXT',
        token_count: 1000 // Rough estimate for web content
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database save error:', dbError);
      return res.status(500).json({ error: 'Failed to save file reference' });
    }

    return res.status(200).json({
      success: true,
      file: {
        ...file,
        url: url,
        type: 'link'
      }
    });

  } catch (error) {
    console.error('File from link error:', error);
    return res.status(500).json({ error: 'Failed to create file from link' });
  }
}
