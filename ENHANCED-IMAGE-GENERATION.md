# Enhanced Image Generation Implementation

This document outlines the implementation of OpenAI's latest image generation capabilities in the Emmie chat application.

## Overview

The enhanced image generation system implements all the latest features from OpenAI's `gpt-image-1` model, providing superior image quality, flexible output options, and advanced editing capabilities.

## New Features Implemented

### 1. Enhanced Image Generation API (`/api/images/generate`)

#### Auto-Selection
- **Auto Size**: Let the model choose the optimal image dimensions based on the prompt
- **Auto Quality**: Automatic quality selection for best results

#### Multiple Format Support
- **PNG**: Default format, best for images with transparency
- **JPEG**: Faster generation, smaller file sizes, with compression control (0-100%)
- **WebP**: Modern format with both transparency and compression support

#### Flexible Sizing Options
- `auto`: Model chooses optimal size
- `square`: 1024x1024 pixels
- `landscape`: 1792x1024 pixels  
- `portrait`: 1024x1792 pixels
- Direct pixel values: e.g., "1024x1024"

#### Quality Levels
- `auto`: Model chooses optimal quality
- `low`: Faster generation
- `medium`: Balanced quality/speed
- `high`: Best quality

#### Background Options
- `auto`: Model chooses appropriate background
- `transparent`: Transparent background (PNG/WebP only)
- `opaque`: Solid background

#### Additional Features
- **Compression Control**: For JPEG/WebP formats (0-100%)
- **Revised Prompt**: Access to OpenAI's improved prompt
- **Chat Integration**: Automatically save generated images to chat conversations

### 2. Enhanced Image Editing API (`/api/images/edit`)

#### All Generation Features Plus:
- **Mask-based Editing**: Upload a mask for precise inpainting
- **High Input Fidelity**: Better preservation of input image details
- **Multi-format Output**: Edit and output in PNG, JPEG, or WebP
- **Size Mapping**: Automatic conversion between generation and edit size formats

## API Usage Examples

### Basic Image Generation
```javascript
const response = await fetch('/api/images/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A beautiful sunset over mountains',
    size: 'auto',           // Let model choose optimal size
    quality: 'auto',        // Let model choose optimal quality
    format: 'png',          // PNG format
    background: 'auto'      // Let model choose background
  })
});
```

### JPEG with Compression
```javascript
const response = await fetch('/api/images/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A modern office space',
    size: 'landscape',      // 1792x1024 format
    quality: 'high',        // High quality
    format: 'jpeg',         // JPEG format
    compression: 80,        // 80% compression
    background: 'opaque'    // Solid background
  })
});
```

### WebP with Transparency
```javascript
const response = await fetch('/api/images/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A floating geometric shape',
    size: 'square',
    quality: 'medium',
    format: 'webp',
    background: 'transparent',
    compression: 70
  })
});
```

### Image Editing with Mask
```javascript
const response = await fetch('/api/images/edit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imageUrl: 'https://example.com/original.png',
    instructions: 'Replace the pool with a flamingo',
    maskUrl: 'https://example.com/mask.png',  // Mask for inpainting
    size: 'auto',
    quality: 'high',
    format: 'png',
    background: 'transparent',
    inputFidelity: 'high',  // Better preservation of details
    chatId: 'chat-id-123'   // Save to chat
  })
});
```

## Response Format

### Generation Response
```json
{
  "url": "https://signed-url-to-image",
  "type": "generated_image",
  "alt": "AI-generated image: prompt",
  "promptUsed": "Original prompt",
  "revisedPrompt": "OpenAI's improved prompt",
  "size": "1024x1024",
  "quality": "auto",
  "format": "png",
  "background": "auto",
  "compression": 80,
  "storagePath": "generated-images/filename.png",
  "fileSize": 1234567,
  "model": "gpt-image-1"
}
```

### Edit Response
```json
{
  "url": "https://signed-url-to-edited-image",
  "type": "edited_image",
  "alt": "Edited image: instructions",
  "instructions": "Edit instructions",
  "originalUrl": "https://original-image-url",
  "maskUrl": "https://mask-url",
  "size": "auto",
  "quality": "high",
  "format": "png",
  "background": "transparent",
  "compression": null,
  "inputFidelity": "high",
  "storagePath": "edited-images/filename.png",
  "fileSize": 1234567,
  "model": "gpt-image-1",
  "revisedPrompt": "OpenAI's improved instructions"
}
```

## Configuration

### AI Library Configuration
The enhanced configuration is defined in `lib/ai.ts`:

```typescript
export const IMAGE_GENERATION_CONFIG = {
  sizes: {
    auto: 'auto',
    square: '1024x1024',
    landscape: '1792x1024', 
    portrait: '1024x1792'
  },
  qualities: ['auto', 'low', 'medium', 'high'],
  formats: ['png', 'jpeg', 'webp'],
  backgrounds: ['auto', 'transparent', 'opaque'],
  defaults: {
    size: 'auto',
    quality: 'auto',
    format: 'png',
    background: 'auto',
    compression: undefined
  }
};
```

## Error Handling

The APIs include comprehensive error handling for:
- Invalid prompts or instructions
- Unsupported size/quality combinations
- Compression validation (0-100%)
- Image fetch failures
- OpenAI API errors (400, 429, etc.)
- Storage upload failures

## Testing

Use the provided test script to verify functionality:

```bash
node scripts/test-enhanced-image-generation.js
```

The test script covers:
- Auto size/quality selection
- Multiple format support
- Compression control
- Transparent backgrounds
- Different aspect ratios
- Quality levels
- Revised prompt capture

## File Storage

- Generated images: `generated-images/` folder
- Edited images: `edited-images/` folder
- Support for PNG, JPEG, and WebP formats
- Automatic content-type detection
- 24-hour signed URLs for access

## Integration with Chat

Both generation and editing APIs support chat integration:
- Pass `chatId` parameter to save images to chat
- Images appear as message attachments
- Automatic message creation with appropriate metadata

## Next Phases

This completes **Phase 1: Enhanced Image Generation API**. Future phases will include:

- **Phase 2**: Streaming support with partial image delivery
- **Phase 3**: Advanced editing features and mask drawing tools
- **Phase 4**: Responses API integration for multi-turn conversations
- **Phase 5**: Frontend UI enhancements for new options

## Model Compatibility

This implementation uses `gpt-image-1`, OpenAI's latest and most advanced image generation model, which provides:
- Superior instruction following
- Better text rendering in images
- Detailed editing capabilities
- Real-world knowledge integration
- High-quality image generation

## Security Considerations

- All images are stored in Supabase with proper access controls
- Signed URLs expire after 24 hours
- Input validation prevents oversized prompts/instructions
- Compression validation prevents invalid values
- File type validation ensures proper formats
