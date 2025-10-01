import { requireApiPermission } from '../../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID, ensureUser } from '../../../lib/db';
import { openai, generateEmbedding, logAIOperation } from '../../../lib/ai';
import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// Document processing imports
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

export const config = {
  api: {
    bodyParser: false, // Disable body parsing, we'll use formidable
    sizeLimit: '10mb',
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

  // Ensure user exists in Supabase
  try {
    await ensureUser(userId, email, displayName);
  } catch (error) {
    console.error('Error ensuring user:', error);
    return res.status(500).json({ error: 'Failed to sync user data' });
  }

  try {
    // Parse the uploaded file
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    
    const agentId = Array.isArray(fields.agentId) ? fields.agentId[0] : fields.agentId;
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file || !agentId) {
      return res.status(400).json({ error: 'File and agentId are required' });
    }

    // Verify agent exists and belongs to the organization
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('chat_agents')
      .select('id, name')
      .eq('id', agentId)
      .eq('org_id', EMTEK_ORG_ID)
      .eq('is_active', true)
      .single();

    if (agentError || !agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Check file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain', 'text/markdown'];
    if (!allowedTypes.includes(file.mimetype || '')) {
      return res.status(400).json({ error: 'Unsupported file type. Supported: PDF, DOCX, DOC, TXT, MD' });
    }

    // Upload to OpenAI for native processing (PDFs and Word docs benefit most)
    let openaiFileId: string | null = null;
    const shouldUploadToOpenAI = file.mimetype === 'application/pdf' || 
                                 file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                                 file.mimetype === 'application/msword';

    if (shouldUploadToOpenAI) {
      try {
        console.log(`Uploading agent document ${file.originalFilename} to OpenAI Files API...`);
        
        // Create a readable stream from the file
        const stream = fs.createReadStream(file.filepath);
        
        const openaiFile = await openai.files.create({
          file: stream,
          purpose: 'user_data'
        });
        
        openaiFileId = openaiFile.id;
        console.log(`Successfully uploaded agent document to OpenAI with file ID: ${openaiFileId}`);
      } catch (openaiError) {
        console.error('OpenAI file upload error for agent document:', openaiError);
        // Continue without OpenAI file ID - the document will still work with local processing
      }
    }

    // Create document record
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .insert([{
        org_id: EMTEK_ORG_ID,
        agent_id: agentId,
        name: file.originalFilename || file.newFilename,
        original_filename: file.originalFilename || file.newFilename,
        file_size: file.size,
        mime_type: file.mimetype,
        status: 'processing',
        uploaded_by: userId,
        openai_file_id: openaiFileId
      }])
      .select()
      .single();

    if (docError) {
      console.error('Document creation error:', docError);
      return res.status(500).json({ error: 'Failed to create document record' });
    }

    // Log document upload start
    logAIOperation('document_upload_start', {
      userId,
      agentId,
      fileName: file.originalFilename || file.newFilename,
      fileSize: file.size,
      mimeType: file.mimetype || '',
      hasOpenAIFile: !!openaiFileId
    });

    // Process the document asynchronously
    processDocument(document.id, file.filepath, file.mimetype || '', userId);

    return res.status(201).json({ 
      document: {
        ...document,
        status: 'processing'
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Upload failed' });
  }
}

// Process document in the background
async function processDocument(documentId: string, filePath: string, mimeType: string, userId?: string) {
  const startTime = Date.now();
  
  try {
    // Extract text based on file type
    let text = '';
    
    if (mimeType === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      text = data.text;
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword') {
      const dataBuffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      text = result.value;
    } else if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
      text = fs.readFileSync(filePath, 'utf8');
    }

    if (!text.trim()) {
      throw new Error('No text content extracted');
    }

    // Update document with extracted text
    await supabaseAdmin
      .from('documents')
      .update({
        content_text: text,
        status: 'ready'
      })
      .eq('id', documentId);

    // Create chunks
    const chunks = chunkText(text, 500); // 500 words per chunk
    const chunkRecords = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Generate embedding for the chunk using centralized helper
      let embedding = null;
      try {
        embedding = await generateEmbedding(chunk);
      } catch (embeddingError) {
        console.error('Embedding generation failed for chunk:', embeddingError);
        // Continue without embedding
      }

      chunkRecords.push({
        document_id: documentId,
        chunk_index: i,
        content: chunk,
        embedding,
        token_count: estimateTokens(chunk)
      });
    }

    // Insert all chunks
    const { error: chunkError } = await supabaseAdmin
      .from('document_chunks')
      .insert(chunkRecords);

    if (chunkError) {
      console.error('Chunk insertion error:', chunkError);
      throw chunkError;
    }

    // Update document with chunk count
    await supabaseAdmin
      .from('documents')
      .update({
        chunk_count: chunks.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    console.log(`Document ${documentId} processed successfully with ${chunks.length} chunks`);

    // Log successful completion
    if (userId) {
      logAIOperation('document_processing_complete', {
        userId,
        documentId,
        chunkCount: chunks.length,
        duration: Date.now() - startTime,
        textLength: text.length
      });
    }

  } catch (error) {
    console.error('Document processing error:', error);
    
    // Log error
    if (userId) {
      logAIOperation('document_processing_error', {
        userId,
        documentId,
        error: error.message,
        duration: Date.now() - startTime
      });
    }
    
    // Mark document as failed
    await supabaseAdmin
      .from('documents')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);
  } finally {
    // Clean up temporary file
    try {
      fs.unlinkSync(filePath);
    } catch (cleanupError) {
      console.error('File cleanup error:', cleanupError);
    }
  }
}

// Utility function to chunk text
function chunkText(text: string, maxWords: number = 500): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  
  for (let i = 0; i < words.length; i += maxWords) {
    const chunk = words.slice(i, i + maxWords).join(' ');
    if (chunk.trim()) {
      chunks.push(chunk.trim());
    }
  }
  
  return chunks.length > 0 ? chunks : [text];
}

// Utility function to estimate token count
function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}
