import { requireApiPermission } from '../../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID, ensureUser } from '../../../lib/db';
import { openai, DEFAULT_IMAGE_MODEL, IMAGE_GENERATION_CONFIG, ImageFormat, ImageQuality, ImageBackground } from '../../../lib/ai';
import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

export const config = { 
  api: { 
    bodyParser: { sizeLimit: '1mb' } 
  } 
};

type EditBody = {
  imageUrl: string;           // signed URL to the original
  instructions: string;       // e.g., "Blur emails; add red rectangle around the USB-C port"
  size?: "auto" | "1024x1024" | "1792x1024" | "1024x1792" | "256x256" | "512x512";
  quality?: ImageQuality;
  format?: ImageFormat;
  background?: ImageBackground;
  compression?: number;
  inputFidelity?: 'low' | 'high';
  maskUrl?: string;          // Optional mask for inpainting
  chatId?: string;
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
    imageUrl, 
    instructions, 
    size = "auto",
    quality = IMAGE_GENERATION_CONFIG.defaults.quality,
    format = IMAGE_GENERATION_CONFIG.defaults.format,
    background = IMAGE_GENERATION_CONFIG.defaults.background,
    compression,
    inputFidelity = 'low',
    maskUrl,
    chatId 
  } = req.body as EditBody;

  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).json({ error: 'Image URL is required' });
  }

  if (!instructions || typeof instructions !== 'string') {
    return res.status(400).json({ error: 'Edit instructions are required' });
  }

  if (instructions.length > 4000) {
    return res.status(400).json({ error: 'Instructions too long. Maximum 4000 characters.' });
  }

  // Validate compression for jpeg/webp
  if (compression !== undefined && (compression < 0 || compression > 100)) {
    return res.status(400).json({ error: 'Compression must be between 0 and 100' });
  }

  try {
    // Fetch the original image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return res.status(400).json({ error: 'Failed to fetch original image' });
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Create a File object from the buffer for OpenAI API
    const imageFile = new File([imageBuffer], 'image.png', { type: 'image/png' });

    // Fetch mask if provided
    let maskFile: File | undefined;
    if (maskUrl) {
      try {
        const maskResponse = await fetch(maskUrl);
        if (maskResponse.ok) {
          const maskBuffer = Buffer.from(await maskResponse.arrayBuffer());
          maskFile = new File([maskBuffer], 'mask.png', { type: 'image/png' });
        }
      } catch (maskError) {
        console.error('Failed to fetch mask:', maskError);
        return res.status(400).json({ error: 'Failed to fetch mask image' });
      }
    }

    // Convert size for edit API (different from generation API)
    let editSize: "auto" | "1024x1024" | "256x256" | "512x512" | "1536x1024" | "1024x1536";
    if (size === 'auto') {
      editSize = 'auto';
    } else if (size === '1792x1024') {
      editSize = '1536x1024'; // Map to closest supported edit size
    } else if (size === '1024x1792') {
      editSize = '1024x1536'; // Map to closest supported edit size
    } else {
      editSize = size as any;
    }

    // Build OpenAI edit request parameters
    const editParams: any = {
      model: DEFAULT_IMAGE_MODEL,
      prompt: instructions,
      image: imageFile,
      size: editSize,
      n: 1,
      response_format: "b64_json"
    };

    // Add quality if not auto
    if (quality !== 'auto') {
      editParams.quality = quality;
    }

    // Add format and output options
    if (format !== 'png') {
      editParams.output_format = format;
    }

    // Add compression for jpeg/webp
    if (compression !== undefined && (format === 'jpeg' || format === 'webp')) {
      editParams.output_compression = compression;
    }

    // Add background option
    if (background === 'transparent') {
      editParams.background = 'transparent';
    } else if (background === 'opaque') {
      editParams.background = 'opaque';
    }

    // Add input fidelity
    if (inputFidelity === 'high') {
      editParams.input_fidelity = 'high';
    }

    // Add mask for inpainting
    if (maskFile) {
      editParams.input_image_mask = maskFile;
    }

    // Edit image with GPT Image 1
    const edit = await openai.images.edit(editParams);

    const editData = edit.data[0];
    if (!editData.b64_json) {
      throw new Error('No image data received from OpenAI');
    }

    // Convert base64 to buffer
    const editedImageBuffer = Buffer.from(editData.b64_json, 'base64');
    
    // Determine content type and file extension
    const contentType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    const extension = format === 'jpeg' ? 'jpg' : format;
    
    // Generate unique filename
    const uniqueFilename = `edited-${crypto.randomUUID()}.${extension}`;
    const storagePath = `edited-images/${uniqueFilename}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('media')
      .upload(storagePath, editedImageBuffer, {
        contentType: contentType,
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase storage error:', uploadError);
      return res.status(500).json({ error: 'Failed to save edited image' });
    }

    // Create signed URL (valid for 24 hours for edited images)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('media')
      .createSignedUrl(storagePath, 24 * 60 * 60);

    if (signedUrlError || !signedUrlData) {
      console.error('Signed URL error:', signedUrlError);
      return res.status(500).json({ error: 'Failed to create signed URL' });
    }

    // If chatId is provided, store this as a message in the chat
    if (chatId) {
      try {
        await supabaseAdmin
          .from('messages')
          .insert([{
            chat_id: chatId,
            role: 'assistant',
            content_md: `Edited image: ${instructions}`,
            model: DEFAULT_IMAGE_MODEL,
            message_type: 'image',
            attachments: [{
              type: 'image',
              url: signedUrlData.signedUrl,
              alt: `AI-edited image: ${instructions}`
            }]
          }]);
      } catch (messageError) {
        console.error('Failed to save edited image to chat:', messageError);
        // Don't fail the request if we can't save to chat
      }
    }

    return res.status(200).json({
      url: signedUrlData.signedUrl,
      type: 'edited_image',
      alt: `Edited image: ${instructions}`,
      instructions: instructions,
      originalUrl: imageUrl,
      maskUrl: maskUrl,
      size: editSize,
      quality: quality,
      format: format,
      background: background,
      compression: compression,
      inputFidelity: inputFidelity,
      storagePath: storagePath,
      fileSize: editedImageBuffer.length,
      model: DEFAULT_IMAGE_MODEL,
      revisedPrompt: editData.revised_prompt // Include revised prompt if available
    });

  } catch (error: any) {
    console.error('Image editing error:', error);
    
    // Handle specific OpenAI errors
    if (error?.status === 400) {
      return res.status(400).json({ 
        error: 'Invalid image or instructions. Please check your content and try again.' 
      });
    }
    
    if (error?.status === 429) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again later.' 
      });
    }

    return res.status(500).json({ error: 'Image editing failed' });
  }
}
