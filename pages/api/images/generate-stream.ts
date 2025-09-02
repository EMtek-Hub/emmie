import { requireApiPermission } from '../../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID, ensureUser } from '../../../lib/db';
import { openai, DEFAULT_IMAGE_MODEL, IMAGE_GENERATION_CONFIG, EnhancedImageGenerationOptions } from '../../../lib/ai';
import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

export const config = { 
  api: { 
    bodyParser: { sizeLimit: '1mb' } 
  } 
};

type StreamGenerateBody = EnhancedImageGenerationOptions & {
  partialImages?: number; // 0-3 partial images to receive
  stream?: boolean;       // Enable streaming
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

  const { 
    prompt, 
    size = IMAGE_GENERATION_CONFIG.defaults.size,
    quality = IMAGE_GENERATION_CONFIG.defaults.quality,
    format = IMAGE_GENERATION_CONFIG.defaults.format,
    background = IMAGE_GENERATION_CONFIG.defaults.background,
    compression,
    chatId,
    partialImages = 2, // Default to 2 partial images
    stream = true
  } = req.body as StreamGenerateBody;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (prompt.length > 4000) {
    return res.status(400).json({ error: 'Prompt too long. Maximum 4000 characters.' });
  }

  // Validate partialImages parameter
  if (partialImages < 0 || partialImages > 3) {
    return res.status(400).json({ error: 'partialImages must be between 0 and 3' });
  }

  // Validate compression for jpeg/webp
  if (compression !== undefined && (compression < 0 || compression > 100)) {
    return res.status(400).json({ error: 'Compression must be between 0 and 100' });
  }

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Send initial progress event
    sendEvent('progress', { 
      stage: 'starting', 
      message: 'Initializing image generation...' 
    });

    // Convert size from our config to OpenAI format for regular API
    let openaiSize: "auto" | "1024x1024" | "1792x1024" | "1024x1792" | "1536x1024" | "1024x1536" | "256x256" | "512x512";
    if (size === 'auto') {
      openaiSize = 'auto';
    } else if (size === 'square') {
      openaiSize = '1024x1024';
    } else if (size === 'landscape') {
      openaiSize = '1792x1024';
    } else if (size === 'portrait') {
      openaiSize = '1024x1792';
    } else {
      openaiSize = size as any;
    }

    // Convert size for Responses API (different supported sizes)
    let responsesApiSize: "auto" | "1024x1024" | "1536x1024" | "1024x1536";
    if (size === 'auto') {
      responsesApiSize = 'auto';
    } else if (size === 'square') {
      responsesApiSize = '1024x1024';
    } else if (size === 'landscape' || size === '1792x1024') {
      responsesApiSize = '1536x1024'; // Map to closest supported size
    } else if (size === 'portrait' || size === '1024x1792') {
      responsesApiSize = '1024x1536'; // Map to closest supported size
    } else {
      responsesApiSize = '1024x1024'; // Default fallback
    }

    if (stream && partialImages > 0) {
      // Simulated streaming for better UX while we wait for full Responses API support
      sendEvent('progress', { 
        stage: 'generating', 
        message: 'Generating image with streaming preview...',
        partialImages: partialImages
      });

      // Send simulated partial images (placeholder for real streaming)
      for (let i = 1; i <= partialImages; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate generation time
        
        sendEvent('partial_image', {
          imageData: null, // Placeholder - would contain actual partial image data
          partialIndex: i,
          totalPartials: partialImages,
          stage: 'partial',
          message: `Generating... (${i}/${partialImages} partial images)`
        });
      }

      sendEvent('progress', { 
        stage: 'finalizing', 
        message: 'Completing final image...' 
      });

      // Generate the actual final image using regular API
      const generateParams: any = {
        model: DEFAULT_IMAGE_MODEL,
        prompt: prompt,
        size: openaiSize,
        n: 1
      };

      // Add quality if not auto
      if (quality !== 'auto') {
        generateParams.quality = quality;
      }

      // Add format and output options
      if (format !== 'png') {
        generateParams.output_format = format;
      }

      // Add compression for jpeg/webp
      if (compression !== undefined && (format === 'jpeg' || format === 'webp')) {
        generateParams.output_compression = compression;
      }

      // Add background option
      if (background === 'transparent') {
        generateParams.background = 'transparent';
      } else if (background === 'opaque') {
        generateParams.background = 'opaque';
      }

      // Generate final image
      const imageGeneration = await openai.images.generate(generateParams);
      const imageData = imageGeneration.data[0];

      if (!imageData.b64_json) {
        throw new Error('No image data received from GPT Image 1');
      }

      // Process final image
      await processFinalImage(imageData.b64_json, {
        prompt,
        revisedPrompt: imageData.revised_prompt,
        openaiSize,
        quality,
        format,
        background,
        compression,
        chatId
      }, sendEvent);

    } else {
      // Fall back to regular generation API
      sendEvent('progress', { 
        stage: 'generating', 
        message: 'Generating image...' 
      });

      // Build OpenAI request parameters
      const generateParams: any = {
        model: DEFAULT_IMAGE_MODEL,
        prompt: prompt,
        size: openaiSize,
        n: 1
      };

      // Add quality if not auto
      if (quality !== 'auto') {
        generateParams.quality = quality;
      }

      // Add format and output options
      if (format !== 'png') {
        generateParams.output_format = format;
      }

      // Add compression for jpeg/webp
      if (compression !== undefined && (format === 'jpeg' || format === 'webp')) {
        generateParams.output_compression = compression;
      }

      // Add background option
      if (background === 'transparent') {
        generateParams.background = 'transparent';
      } else if (background === 'opaque') {
        generateParams.background = 'opaque';
      }

      // Generate image using GPT Image 1
      const imageGeneration = await openai.images.generate(generateParams);
      const imageData = imageGeneration.data[0];

      if (!imageData.b64_json) {
        throw new Error('No image data received from GPT Image 1');
      }

      // Process final image
      await processFinalImage(imageData.b64_json, {
        prompt,
        revisedPrompt: imageData.revised_prompt,
        openaiSize,
        quality,
        format,
        background,
        compression,
        chatId
      }, sendEvent);
    }

  } catch (error: any) {
    console.error('Streaming image generation error:', error);
    
    sendEvent('error', {
      error: error.message || 'Image generation failed',
      stage: 'error'
    });
  } finally {
    sendEvent('done', { stage: 'complete' });
    res.end();
  }
}

// Helper function to process and save the final image
async function processFinalImage(
  imageB64: string, 
  metadata: {
    prompt: string;
    revisedPrompt?: string | null;
    openaiSize: any;
    quality: any;
    format: any;
    background: any;
    compression?: number;
    chatId?: string;
  },
  sendEvent: (event: string, data: any) => void
) {
  // Convert base64 to buffer
  const imageBuffer = Buffer.from(imageB64, 'base64');
  
  // Determine content type and file extension
  const contentType = metadata.format === 'jpeg' ? 'image/jpeg' : metadata.format === 'webp' ? 'image/webp' : 'image/png';
  const extension = metadata.format === 'jpeg' ? 'jpg' : metadata.format;
  
  // Generate unique filename
  const uniqueFilename = `generated-${crypto.randomUUID()}.${extension}`;
  const storagePath = `generated-images/${uniqueFilename}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabaseAdmin.storage
    .from('media')
    .upload(storagePath, imageBuffer, {
      contentType: contentType,
      upsert: false
    });

  if (uploadError) {
    throw new Error('Failed to save generated image');
  }

  // Create signed URL
  const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
    .from('media')
    .createSignedUrl(storagePath, 24 * 60 * 60);

  if (signedUrlError || !signedUrlData) {
    throw new Error('Failed to create signed URL');
  }

  // Save to chat if chatId provided
  if (metadata.chatId) {
    try {
      const { data: assistantMessage, error: messageError } = await supabaseAdmin
        .from('messages')
        .insert([{
          chat_id: metadata.chatId,
          role: 'assistant',
          content_md: `Generated image: ${metadata.prompt}`,
          model: DEFAULT_IMAGE_MODEL,
          message_type: 'image',
          attachments: [{
            type: 'image',
            url: signedUrlData.signedUrl,
            alt: `AI-generated image: ${metadata.prompt}`,
            storage_path: storagePath,
            file_size: imageBuffer.length,
            format: metadata.format
          }]
        }])
        .select();
      
      if (messageError) {
        console.error('Failed to save generated image to chat:', messageError);
        throw new Error(`Database insert failed: ${messageError.message}`);
      } else {
        console.log('✅ Successfully saved image message to database:', assistantMessage?.[0]?.id);
      }
    } catch (messageError) {
      console.error('Failed to save generated image to chat:', messageError);
      // Don't fail the request if we can't save to chat, but log the error
    }
  }

  // Send final image event
  sendEvent('final_image', {
    url: signedUrlData.signedUrl,
    type: 'generated_image',
    alt: `AI-generated image: ${metadata.prompt}`,
    promptUsed: metadata.prompt,
    revisedPrompt: metadata.revisedPrompt,
    size: metadata.openaiSize,
    quality: metadata.quality,
    format: metadata.format,
    background: metadata.background,
    compression: metadata.compression,
    storagePath: storagePath,
    fileSize: imageBuffer.length,
    model: DEFAULT_IMAGE_MODEL
  });
}
