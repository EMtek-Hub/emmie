// lib/media/uploader.ts - Media upload and storage management
import crypto from 'crypto';
import { supabaseAdmin } from '../db';

export type ImageFormat = 'png' | 'jpeg' | 'webp';

export interface GeneratedImage {
  url: string;
  storagePath: string;
  format: ImageFormat;
  markdown: string;
}

/**
 * Media uploader for handling image storage
 */
export class MediaUploader {
  /**
   * Determine image format from MIME type
   */
  private getFormat(mimeType?: string): ImageFormat {
    if (!mimeType) return 'png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpeg';
    if (mimeType.includes('webp')) return 'webp';
    return 'png';
  }

  /**
   * Save base64 image to storage and return signed URL
   */
  async save(base64Data: string, mimeType?: string): Promise<GeneratedImage> {
    const format = this.getFormat(mimeType);
    const ext = format === 'jpeg' ? 'jpg' : format;
    const storagePath = `generated-images/ai-${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(base64Data, 'base64');
    const contentType =
      format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';

    // Upload to Supabase storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('media')
      .upload(storagePath, buffer, { contentType, upsert: false });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Create signed URL
    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from('media')
      .createSignedUrl(storagePath, 24 * 60 * 60); // 24 hours

    if (signedError || !signed?.signedUrl) {
      throw new Error(`Signed URL creation failed: ${signedError?.message ?? 'Unknown error'}`);
    }

    const markdown = `![Generated image](${signed.signedUrl})`;
    
    return {
      url: signed.signedUrl,
      storagePath,
      format,
      markdown,
    };
  }
}

/**
 * Extract base64 image from various result formats
 */
export function extractBase64Image(resultField: any): string | null {
  if (!resultField) return null;

  // Direct string
  if (typeof resultField === 'string') {
    return resultField;
  }

  // Array format
  if (Array.isArray(resultField) && resultField.length > 0) {
    const first = resultField[0];
    if (typeof first === 'string') {
      return first;
    }
    if (first && typeof first.b64_json === 'string') {
      return first.b64_json;
    }
  }

  // Object with b64_json
  if (typeof resultField?.b64_json === 'string') {
    return resultField.b64_json;
  }

  // Nested data array
  if (resultField?.data?.[0]?.b64_json) {
    return resultField.data[0].b64_json;
  }

  return null;
}
