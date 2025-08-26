# Multimodal Features Test Guide

## Prerequisites
Ensure these environment variables are set in your `.env.local`:
```bash
OPENAI_API_KEY=your-api-key-here
TOOL_SLUG=emmie
```

## Test Scenarios

### 1. Image Upload & Vision Analysis
1. Open the chat interface at `/chat`
2. Click the "+" button next to the message input
3. Select "Add photos & files"
4. Upload an image (screenshot, diagram, or photo)
5. Add a message like "What do you see in this image?" or "Analyze this screenshot"
6. Send the message
7. **Expected**: Emmie should analyze the image using GPT-4o vision capabilities

### 2. Image Generation
1. In the chat, type: "Generate an image of a futuristic office space with plants"
2. Or click "+" and select "Create image", then describe what you want
3. **Expected**: Emmie should generate an image using GPT Image 1

### 3. Image Editing
To test image editing via API (since it's not directly exposed in the UI yet):
```bash
# First, get a signed URL from an uploaded image
# Then make a POST request to /api/images/edit
curl -X POST http://localhost:3000/api/images/edit \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "imageUrl": "https://your-signed-url",
    "instructions": "Add a red circle around the main object",
    "size": "1024x1024"
  }'
```

### 4. Mixed Mode (Text + Images)
1. Upload multiple images
2. Ask a question that references them
3. **Expected**: Emmie should process both text and images together

## Multimodal Features Summary

### ✅ Implemented Features:
1. **Image Upload** (`/api/upload`)
   - Supports: JPEG, PNG, WebP, GIF
   - Max size: 20MB
   - Stores in Supabase Storage with signed URLs

2. **Vision Analysis** (`/api/chat`)
   - Uses GPT-4o for image understanding
   - Automatically switches models when images are present
   - Stores image attachments with messages

3. **Image Generation** (`/api/images/generate`)
   - Uses GPT Image 1 model
   - Sizes: 1024x1024, 1024x1792, 1792x1024
   - Quality levels: low, medium, high
   - Auto-saves to Supabase Storage

4. **Image Editing** (`/api/images/edit`)
   - Uses GPT Image 1 for edits
   - Accepts instructions to modify images
   - Sizes: 256x256, 512x512, 1024x1024

### Model Configuration:
- **Chat Model**: GPT-5
- **Vision Model**: GPT-4o (for image analysis)
- **Image Model**: GPT Image 1 (for generation/editing)

## Troubleshooting

### If image upload fails:
1. Check Supabase Storage bucket exists: `media`
2. Verify bucket is public or has proper RLS policies
3. Check CORS settings in Supabase Storage

### If image generation fails:
1. Verify OpenAI API key has access to GPT Image 1
2. Check rate limits on your OpenAI account
3. Ensure prompt doesn't violate content policies

### If vision analysis doesn't work:
1. Verify GPT-4o is accessible with your API key
2. Check that images are properly uploaded first
3. Ensure signed URLs are valid (1 hour expiry)

## API Endpoints Reference

### Upload File
```typescript
POST /api/upload
Content-Type: multipart/form-data
Body: file (binary)
Response: { url, type, originalName, size, mimeType }
```

### Generate Image
```typescript
POST /api/images/generate
Body: { 
  prompt: string,
  size?: "1024x1024" | "1024x1792" | "1792x1024",
  quality?: "low" | "medium" | "high",
  chatId?: string
}
Response: { url, type, alt, promptUsed, size, quality }
```

### Edit Image
```typescript
POST /api/images/edit
Body: {
  imageUrl: string,
  instructions: string,
  size?: "256x256" | "512x512" | "1024x1024"
}
Response: { url, type, alt, instructions, originalUrl, size }
```

### Chat with Images
```typescript
POST /api/chat
Body: {
  chatId?: string,
  messages: Array<{role, content}>,
  agentId?: string,
  imageUrls?: string[] // URLs from upload endpoint
}
Response: Server-Sent Events stream
