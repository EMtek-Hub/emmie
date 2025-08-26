import { requireApiPermission } from '../../../lib/apiAuth';
import { supabaseAdmin, ensureUser } from '../../../lib/db';
import { generateImageWithProgressiveStreaming, EnhancedImageGenerationOptions, ProgressiveImageEvent } from '../../../lib/ai';
import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

export const config = { 
  api: { 
    bodyParser: { sizeLimit: '1mb' } 
  } 
};

type GenerateStreamingBody = EnhancedImageGenerationOptions;

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

  const { 
    prompt, 
    size = 'auto',
    quality = 'auto',
    format = 'png',
    background = 'auto',
    compression,
    chatId 
  } = req.body as GenerateStreamingBody;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (prompt.length > 4000) {
    return res.status(400).json({ error: 'Prompt too long. Maximum 4000 characters.' });
  }

  // Validate compression for jpeg/webp
  if (compression !== undefined && (compression < 0 || compression > 100)) {
    return res.status(400).json({ error: 'Compression must be between 0 and 100' });
  }

  // Set up Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  try {
    console.log(`🎨 Progressive image generation requested: "${prompt}"`);
    console.log(`📐 Parameters: size=${size}, quality=${quality}, format=${format}, background=${background}`);

    // Start the progressive streaming
    const stream = await generateImageWithProgressiveStreaming(prompt, {
      size,
      quality,
      format,
      background,
      compression
    });

    let finalImageData: any = null;
    let storagePath: string = '';
    let signedUrl: string = '';

    for await (const event of stream) {
      console.log(`📡 Streaming event: ${event.type}`);

      // Send event to client
      res.write(`data: ${JSON.stringify(event)}\n\n`);

      // Handle completion to save image
      if (event.type === 'completed' && event.b64_json) {
        try {
          finalImageData = event;
          
          // Convert base64 to buffer
          const imageBuffer = Buffer.from(event.b64_json, 'base64');
          
          // Determine content type and file extension
          const contentType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
          const extension = format === 'jpeg' ? 'jpg' : format;
          
          // Generate unique filename
          const uniqueFilename = `generated-${crypto.randomUUID()}.${extension}`;
          storagePath = `generated-images/${uniqueFilename}`;

          // Upload to Supabase Storage
          const { error: uploadError } = await supabaseAdmin.storage
            .from('media')
            .upload(storagePath, imageBuffer, {
              contentType: contentType,
              upsert: false
            });

          if (uploadError) {
            console.error('Supabase storage error:', uploadError);
            res.write(`data: ${JSON.stringify({
              type: 'error',
              error: 'Failed to save generated image'
            })}\n\n`);
            break;
          }

          // Create signed URL (valid for 24 hours for generated images)
          const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
            .from('media')
            .createSignedUrl(storagePath, 24 * 60 * 60);

          if (signedUrlError || !signedUrlData) {
            console.error('Signed URL error:', signedUrlError);
            res.write(`data: ${JSON.stringify({
              type: 'error',
              error: 'Failed to create signed URL'
            })}\n\n`);
            break;
          }

          signedUrl = signedUrlData.signedUrl;

          // Send final result with storage information
          const finalResult = {
            type: 'saved',
            url: signedUrl,
            alt: `AI-generated image: ${prompt}`,
            promptUsed: prompt,
            size: event.size,
            quality: event.quality,
            format: event.output_format,
            background: event.background,
            compression: compression,
            storagePath: storagePath,
            fileSize: imageBuffer.length,
            usage: event.usage,
            created_at: event.created_at
          };

          res.write(`data: ${JSON.stringify(finalResult)}\n\n`);
          console.log(`✅ Progressive image generation completed and saved`);
          
        } catch (saveError: any) {
          console.error('Error saving completed image:', saveError);
          res.write(`data: ${JSON.stringify({
            type: 'error',
            error: 'Failed to save completed image: ' + saveError.message
          })}\n\n`);
        }
      }

      // Handle errors
      if (event.type === 'error') {
        console.error(`❌ Progressive generation error: ${event.error}`);
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: event.error
        })}\n\n`);
        break;
      }
    }

  } catch (error: any) {
    console.error('Progressive image generation error:', error);
    
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error.message || 'Progressive image generation failed'
    })}\n\n`);
    
  } finally {
    // Close the connection
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  }
}
