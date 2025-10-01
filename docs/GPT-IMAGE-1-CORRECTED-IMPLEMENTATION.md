# gpt-image-1 Corrected Implementation

## Overview

This document describes the corrected implementation of image generation using OpenAI's `gpt-image-1` model with the Responses API. The previous implementation used an incorrect approach (function calling with `image_generation` tool), while the new implementation uses the correct multimodal output approach.

## Key Changes

### 1. API Approach

**OLD (Incorrect):**
```typescript
// Used function calling paradigm
await openai.responses.create({
  model: "gpt-4.1",
  input: prompt,
  tools: [{ type: 'image_generation' }]  // ❌ Wrong for gpt-image-1
});
```

**NEW (Correct):**
```typescript
// Uses multimodal output paradigm
fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  body: JSON.stringify({
    model: "gpt-image-1",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: previousUrl } // For edits
        ]
      }
    ],
    modalities: ["text", "image"],  // ✅ Request image output
    image: {
      size: "1024x1024",
      quality: "standard",
      format: "png"
    }
  })
});
```

### 2. Event Types for Streaming

**OLD (Incorrect):**
- Listened for: `response.image_generation_call.partial_image` (doesn't exist)
- Listened for: `response.output_item.done` (wrong structure)

**NEW (Correct):**
- Listens for: `response.output_image.delta` (base64 chunks)
- Listens for: `response.output_image.completed` (image finished)
- Listens for: `response.output_text.delta` (optional text)
- Listens for: `response.completed` (full response done)

### 3. Direct Fetch vs SDK

The new implementation uses direct `fetch` calls instead of the OpenAI SDK because the SDK's TypeScript types don't yet support the `modalities` and image-specific parameters for `gpt-image-1`.

### 4. Progressive Image Streaming

**New Feature: ImageCollector Class**
```typescript
class ImageCollector {
  private buffers = new Map<number, string>();
  
  append(index: number, b64Chunk: string) {
    const prev = this.buffers.get(index) ?? "";
    this.buffers.set(index, prev + b64Chunk);
  }
  
  finalize(index: number): Uint8Array | undefined {
    const b64 = this.buffers.get(index);
    if (!b64) return undefined;
    return Buffer.from(b64, "base64");
  }
}
```

This collects base64 chunks as they stream in, allowing for progressive rendering on the client side.

## Features

### 1. Image Generation

**Endpoint:** `POST /api/images/generate`

**Request:**
```json
{
  "prompt": "A futuristic cityscape at sunset",
  "model": "gpt-image-1",
  "format": "png",
  "size": "1024x1024",
  "quality": "standard"
}
```

**Response:**
```json
{
  "url": "https://signed-url.supabase.co/...",
  "format": "png",
  "size": "1024x1024"
}
```

### 2. Streaming Image Generation

**Endpoint:** `POST /api/images/generate-streaming`

**Request:** Same as above

**Response:** Server-Sent Events (SSE)

```typescript
// Event types:
{ type: "partial_image", b64_json: "chunk...", partial_image_index: 1 }
{ type: "saved", url: "https://...", format: "png", storagePath: "...", fileSize: 123456 }
{ type: "done" }
{ type: "error", error: "Error message" }
```

### 3. Multi-Turn Image Editing

**Endpoint:** `POST /api/images/generate` (with previousImageUrl)

**Request:**
```json
{
  "prompt": "Add a stylish green bucket hat with a pink quill",
  "previousImageUrl": "https://url-to-previous-image.com/...",
  "model": "gpt-image-1",
  "format": "png",
  "size": "1024x1024"
}
```

The model will use the previous image as context and modify it according to the new prompt.

### 4. Image Editing with Mask

**Endpoint:** `POST /api/images/edit`

**Request:**
```json
{
  "prompt": "Replace the background with a colorful galaxy",
  "imageUrl": "https://url-to-image.com/...",
  "maskUrl": "https://url-to-mask.com/...",
  "model": "gpt-image-1",
  "format": "png",
  "size": "1024x1024"
}
```

**Mask Format:**
- RGBA PNG where alpha channel controls which pixels can be edited
- Transparent = keep original
- Opaque = allow editing

## Implementation Details

### lib/imageService.ts

**Key Functions:**

1. **`generateImage(options)`** - Non-streaming image generation
2. **`streamGeneratedImage(options)`** - Streaming with progressive updates
3. **`editImage(options)`** - Edit with optional mask support
4. **`pipeImageStreamToSSE(res, generator)`** - SSE helper

### SSE Event Parsing

Uses `eventsource-parser` package to parse Server-Sent Events:

```typescript
import { createParser } from "eventsource-parser";

const parser = createParser((event) => {
  if (event.type === "event" && event.data !== "[DONE]") {
    const json = JSON.parse(event.data);
    onEvent(event.event || "message", json);
  }
});

// Feed chunks to parser
const reader = res.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  parser.feed(new TextDecoder().decode(value));
}
```

## Testing

### Test Image Generation

```bash
curl -X POST http://localhost:3000/api/images/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "prompt": "A serene mountain landscape at dawn",
    "size": "1024x1024"
  }'
```

### Test Streaming

```bash
curl -X POST http://localhost:3000/api/images/generate-streaming \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: text/event-stream" \
  -d '{
    "prompt": "A futuristic robot playing chess",
    "size": "1024x1024"
  }'
```

### Test Multi-Turn Edit

```bash
# First, generate an image
FIRST_IMAGE_URL=$(curl -X POST ... | jq -r '.url')

# Then edit it
curl -X POST http://localhost:3000/api/images/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "{
    \"prompt\": \"Add a colorful rainbow in the sky\",
    \"previousImageUrl\": \"$FIRST_IMAGE_URL\",
    \"size\": \"1024x1024\"
  }"
```

## Comparison with Working Example

The implementation closely follows the working example provided:

| Feature | Working Example | Our Implementation |
|---------|----------------|-------------------|
| Direct fetch API | ✅ | ✅ |
| `modalities` parameter | ✅ | ✅ |
| `image` configuration | ✅ | ✅ |
| Correct event types | ✅ | ✅ |
| ImageCollector class | ✅ | ✅ |
| Multi-turn edits | ✅ | ✅ |
| Masked edits | ✅ | ✅ |
| SSE streaming | ✅ | ✅ |
| eventsource-parser | ✅ | ✅ |

## Dependencies Added

```json
{
  "eventsource-parser": "^1.1.2"
}
```

## Migration Notes

If you have existing code using the old implementation:

1. **Replace tool-based calls** with multimodal input
2. **Update event listeners** to use correct event types
3. **Add `modalities` and `image` configuration** to requests
4. **Use `previousImageUrl`** instead of separate edit endpoints for multi-turn conversations

## References

- [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses)
- [Image Generation with Responses API](https://platform.openai.com/docs/guides/images)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- Working example: See the TypeScript code provided in the task

## Troubleshooting

### Image not generating
- Verify `OPENAI_API_KEY` is set correctly
- Check that `modalities` includes "image"
- Ensure `model` is set to "gpt-image-1"

### No streaming chunks
- Verify event type is `response.output_image.delta`
- Check that `stream: true` is set in request
- Ensure SSE headers are correct

### Edit not working
- Verify image URL is accessible
- Check that `previousImageUrl` or `imageUrl` is valid
- Ensure image format is supported (PNG, JPEG, WEBP)

## Future Enhancements

- [ ] Client-side progressive rendering component
- [ ] Image variation generation
- [ ] Batch image generation
- [ ] Image upscaling support
- [ ] Custom style presets
- [ ] Conversation context for multi-turn editing
