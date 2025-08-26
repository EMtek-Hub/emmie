import { requireApiPermission } from '../../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID, ensureUser } from '../../../lib/db';
import { generateImageWithFallback, IMAGE_GENERATION_CONFIG, EnhancedImageGenerationOptions, ImageFormat } from '../../../lib/ai';
import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

export const config = { 
  api: { 
    bodyParser: { sizeLimit: '1mb' } 
  } 
};

type GenerateBody = EnhancedImageGenerationOptions;

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
    chatId 
  } = req.body as GenerateBody;

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

  try {
    console.log(`🎨 Image generation requested: "${prompt}"`);
    console.log(`📐 Parameters: size=${size}, quality=${quality}, format=${format}, background=${background}`);

    // Use the new fallback system
    const result = await generateImageWithFallback(prompt, {
      size,
      quality,
      format,
      background,
      compression
    });

    console.log(`✅ Image generated successfully with model: ${result.modelUsed}`);
    if (result.errors.length > 0) {
      console.log(`⚠️ Previous attempts failed:`, result.errors.map(e => `${e.model}: ${e.error.message}`));
    }

    // Extract the generated image data
    const imageData = result.data;
    if (!imageData.b64_json) {
      throw new Error('No image data received from API');
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageData.b64_json, 'base64');
    
    // Determine content type and file extension
    const contentType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    const extension = format === 'jpeg' ? 'jpg' : format;
    
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
      console.error('Supabase storage error:', uploadError);
      return res.status(500).json({ error: 'Failed to save generated image' });
    }

    // Create signed URL (valid for 24 hours for generated images)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('media')
      .createSignedUrl(storagePath, 24 * 60 * 60);

    if (signedUrlError || !signedUrlData) {
      console.error('Signed URL error:', signedUrlError);
      return res.status(500).json({ error: 'Failed to create signed URL' });
    }

    // Note: When called from chat API, the message will be saved by the chat handler
    // This API endpoint just returns the image data

    return res.status(200).json({
      url: signedUrlData.signedUrl,
      type: 'generated_image',
      alt: `AI-generated image: ${prompt}`,
      promptUsed: prompt,
      size: size,
      quality: quality,
      format: format,
      background: background,
      compression: compression,
      storagePath: storagePath,
      fileSize: imageBuffer.length,
      model: result.modelUsed,
      modelAttempts: result.errors.length + 1,
      failedModels: result.errors.map(e => e.model),
      revisedPrompt: imageData.revised_prompt // Include revised prompt if available
    });

  } catch (error: any) {
    console.error('Image generation error:', error);
    
    // Check if the error includes information about failed models
    if (error.message && error.message.includes('All image generation models failed')) {
      try {
        // Extract errors from the fallback system
        const errorMatch = error.message.match(/Errors: (.+)$/);
        if (errorMatch) {
          const parsedErrors = JSON.parse(errorMatch[1]);
          
          // Check for specific common issues
          const hasVerificationIssue = parsedErrors.some((e: any) => 
            e.message.includes('403') || e.message.includes('organization') || e.message.includes('verification')
          );
          
          const hasAuthIssue = parsedErrors.some((e: any) => 
            e.message.includes('401') || e.message.includes('authentication')
          );
          
          const hasRateLimit = parsedErrors.some((e: any) => 
            e.message.includes('429') || e.message.includes('rate limit')
          );

          if (hasVerificationIssue) {
            return res.status(403).json({ 
              error: 'Organization verification required for advanced image models. Using fallback models failed as well.',
              details: 'Please verify your organization in the OpenAI console or contact support.',
              failedModels: parsedErrors
            });
          } else if (hasAuthIssue) {
            return res.status(401).json({ 
              error: 'API authentication failed for all image generation models.',
              details: 'Please check your OpenAI API key configuration.',
              failedModels: parsedErrors
            });
          } else if (hasRateLimit) {
            return res.status(429).json({ 
              error: 'Rate limit exceeded for all available image generation models.',
              details: 'Please try again later.',
              failedModels: parsedErrors
            });
          } else {
            return res.status(500).json({ 
              error: 'All image generation models failed.',
              details: 'Multiple models were attempted but none succeeded.',
              failedModels: parsedErrors
            });
          }
        }
      } catch (parseError) {
        console.error('Error parsing fallback error details:', parseError);
      }
    }
    
    // Handle specific OpenAI errors (for direct calls)
    if (error?.status === 400) {
      return res.status(400).json({ 
        error: 'Invalid prompt. Please check your content and try again.' 
      });
    }
    
    if (error?.status === 403) {
      return res.status(403).json({ 
        error: 'Organization verification required for this image model.',
        details: 'Please verify your organization in the OpenAI console.'
      });
    }
    
    if (error?.status === 429) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again later.' 
      });
    }

    return res.status(500).json({ 
      error: 'Image generation failed',
      details: error.message || 'Unknown error occurred'
    });
  }
}
