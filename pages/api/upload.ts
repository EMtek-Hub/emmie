import { requireApiPermission } from '../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID, ensureUser } from '../../lib/db';
import { openai } from '../../lib/ai';
import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

export const config = {
  api: {
    bodyParser: false, // Disable body parsing, we'll use formidable
    sizeLimit: '20mb',
  },
};

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

  try {
    // Parse the uploaded file
    const form = formidable({
      maxFileSize: 20 * 1024 * 1024, // 20MB
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: 'File is required' });
    }

    // Check file type - support images and common document types
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      // Documents
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/markdown'
    ];

    if (!allowedTypes.includes(file.mimetype || '')) {
      return res.status(400).json({ 
        error: 'Unsupported file type. Supported: Images (JPEG, PNG, WebP, GIF), Documents (PDF, DOCX, DOC, TXT, MD)' 
      });
    }

    // Read file buffer
    const fileBuffer = fs.readFileSync(file.filepath);
    
    // Generate unique filename
    const fileExtension = path.extname(file.originalFilename || file.newFilename);
    const uniqueFilename = `${crypto.randomUUID()}${fileExtension}`;
    const storagePath = `chat-media/${uniqueFilename}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('media')
      .upload(storagePath, fileBuffer, {
        contentType: file.mimetype || 'application/octet-stream',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase storage error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file' });
    }

    // Create signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('media')
      .createSignedUrl(storagePath, 60 * 60);

    if (signedUrlError || !signedUrlData) {
      console.error('Signed URL error:', signedUrlError);
      return res.status(500).json({ error: 'Failed to create signed URL' });
    }

    // Determine file type for frontend and database
    const isImage = file.mimetype?.startsWith('image/');
    const fileType = isImage ? 'image' : 'document';
    
    // Determine chat file type for database
    let chatFileType = 'PLAIN_TEXT';
    if (file.mimetype?.startsWith('image/')) {
      chatFileType = 'IMAGE';
    } else if (file.mimetype === 'application/pdf') {
      chatFileType = 'PDF';
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               file.mimetype === 'application/msword') {
      chatFileType = 'DOCX';
    } else if (file.mimetype === 'text/csv') {
      chatFileType = 'CSV';
    }

    // Upload to OpenAI for documents that benefit from native processing
    let openaiFileId: string | null = null;
    const shouldUploadToOpenAI = file.mimetype === 'application/pdf' || 
                                 file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                                 file.mimetype === 'application/msword';

    if (shouldUploadToOpenAI) {
      try {
        console.log(`Uploading ${file.originalFilename} to OpenAI Files API...`);
        
        // Create a readable stream from the file buffer
        const stream = fs.createReadStream(file.filepath);
        
        const openaiFile = await openai.files.create({
          file: stream,
          purpose: 'user_data'
        });
        
        openaiFileId = openaiFile.id;
        console.log(`Successfully uploaded to OpenAI with file ID: ${openaiFileId}`);
      } catch (openaiError) {
        console.error('OpenAI file upload error:', openaiError);
        // Don't fail the entire upload if OpenAI upload fails
        // The file will still work with Supabase URLs
      }
    }

    // Save file metadata to database
    const { error: dbError } = await supabaseAdmin
      .from('user_files')
      .insert({
        user_id: userId,
        org_id: EMTEK_ORG_ID,
        name: file.originalFilename || file.newFilename,
        original_filename: file.originalFilename || file.newFilename,
        file_size: file.size,
        mime_type: file.mimetype || 'application/octet-stream',
        file_type: fileType,
        storage_path: storagePath,
        status: 'indexed',
        chat_file_type: chatFileType,
        token_count: Math.ceil((file.size || 0) / 4), // Rough estimate
        openai_file_id: openaiFileId
      });

    if (dbError) {
      console.error('Database save error:', dbError);
      // Don't fail the upload, but log the error
    }

    return res.status(200).json({
      url: signedUrlData.signedUrl,
      type: fileType,
      originalName: file.originalFilename || file.newFilename,
      size: file.size,
      mimeType: file.mimetype,
      storagePath: storagePath,
      openaiFileId: openaiFileId,
      success: true
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Upload failed' });
  } finally {
    // Clean up temporary file
    try {
      const form = formidable({});
      const [, files] = await form.parse(req);
      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      if (file?.filepath) {
        fs.unlinkSync(file.filepath);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }
}
