# Image Generation Troubleshooting Guide

## Problem: SVG Generation Instead of Real Images

If you're seeing SVG code generated as text instead of actual images when requesting "generate an image of blue sky", this guide will help you diagnose and fix the issue.

## Quick Diagnosis

Run the diagnostic script to identify the root cause:

```bash
cd emtek-tool-template
node scripts/diagnose-image-generation.js
```

## Common Issues and Solutions

### 1. Organization Verification Required (Most Common)

**Symptoms:**
- SVG code generated instead of images
- 403 errors in logs
- "Organization verification required" messages

**Root Cause:**
OpenAI requires organization verification for access to `gpt-image-1` model.

**Solution:**
1. Visit [OpenAI Organization Settings](https://platform.openai.com/organization)
2. Complete organization verification process
3. Wait for approval (can take 1-2 business days)
4. Test again after approval

**Temporary Workaround:**
The system will automatically fall back to `dall-e-3` or `dall-e-2` if `gpt-image-1` is not available.

### 2. API Key Issues

**Symptoms:**
- 401 authentication errors
- All models failing
- "API authentication failed" messages

**Solution:**
1. Check your `.env` file has valid `OPENAI_API_KEY`
2. Verify the API key has proper permissions
3. Check billing limits aren't exceeded
4. Regenerate API key if necessary

### 3. Rate Limits

**Symptoms:**
- 429 errors
- "Rate limit exceeded" messages
- Works sometimes, fails other times

**Solution:**
1. Wait for rate limit to reset
2. Implement request queuing if needed
3. Upgrade OpenAI plan for higher limits

### 4. Model-Specific Parameters

**Issue:**
Some parameters only work with specific models.

**Model Compatibility:**
- `gpt-image-1`: Supports all parameters (quality, format, background, compression)
- `dall-e-3`: Limited parameter support (quality as 'hd'/'standard', no background/compression)
- `dall-e-2`: Basic parameters only (size, prompt)

## System Architecture

### Fallback System
The system now uses automatic fallback:
1. Try `gpt-image-1` first (best quality, most features)
2. If that fails, try `dall-e-3` (good quality, some features)
3. If that fails, try `dall-e-2` (basic functionality)
4. If all fail, show detailed error message

### Error Handling
- **Chat API**: Falls back to text response if image generation fails
- **Direct API**: Returns detailed error information
- **Logging**: Comprehensive logging for debugging

## Testing Image Generation

### Test with Direct API Call
```bash
# Test the image generation API directly
curl -X POST http://localhost:3000/api/images/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "prompt": "A beautiful blue sky with white clouds",
    "size": "square",
    "format": "png"
  }'
```

### Test through Chat Interface
1. Open the chat interface
2. Type: "generate an image of a blue sky"
3. Check for:
   - Actual image generation (not SVG code)
   - Proper error messages if it fails
   - Fallback to text response if needed

## Configuration

### Environment Variables Required
```bash
OPENAI_API_KEY=sk-your-api-key-here
APP_BASE_URL=http://localhost:3000  # For local development
```

### Model Configuration
Located in `lib/ai.ts`:
```typescript
export const IMAGE_MODEL_FALLBACKS = [
  'gpt-image-1',    // Primary (requires org verification)
  'dall-e-3',       // Fallback 1
  'dall-e-2'        // Fallback 2
];
```

## Monitoring and Logs

### Key Log Messages
- `🎨 Attempting image generation with [model]...` - Model attempt
- `✅ Image generation successful with [model]` - Success
- `❌ [model] failed: [error]` - Failure with reason
- `💡 [model] requires organization verification` - Verification needed

### Frontend Error Messages
- "Organization verification required" - Need to verify org
- "Rate limit exceeded" - Too many requests
- "Image generation failed, continuing with text response" - Fallback active

## Troubleshooting Steps

### Step 1: Run Diagnostic
```bash
node scripts/diagnose-image-generation.js
```

### Step 2: Check Logs
Look for error patterns in your application logs:
- 403 errors → Organization verification needed
- 401 errors → API key issues
- 429 errors → Rate limiting
- Other errors → Check OpenAI status page

### Step 3: Verify Environment
1. Check `.env` file has all required variables
2. Verify API key is valid and has permissions
3. Check billing account status
4. Ensure proper model access

### Step 4: Test Fallback
If `gpt-image-1` doesn't work, the system should automatically use `dall-e-3` or `dall-e-2`. If none work, check your OpenAI account status.

## Advanced Configuration

### Customize Model Order
Edit `lib/ai.ts` to change fallback order:
```typescript
export const IMAGE_MODEL_FALLBACKS = [
  'dall-e-3',      // Use dall-e-3 as primary
  'dall-e-2',      // Fallback to dall-e-2
  'gpt-image-1'    // Try gpt-image-1 last
];
```

### Disable Fallback
To force only one model, modify the array:
```typescript
export const IMAGE_MODEL_FALLBACKS = [
  'dall-e-3'       // Only use dall-e-3
];
```

## Getting Help

### Check OpenAI Status
- [OpenAI Status Page](https://status.openai.com/)
- [OpenAI Community](https://community.openai.com/)

### Debug Information
When reporting issues, include:
1. Output from diagnostic script
2. Relevant log messages
3. Your organization verification status
4. Which models work/don't work

### Common Error Codes
- `400`: Invalid prompt or parameters
- `401`: Authentication failed
- `403`: Organization verification required
- `429`: Rate limit exceeded
- `500`: Server error (check OpenAI status)

## Success Indicators

You'll know it's working when:
1. ✅ Diagnostic script shows at least one model working
2. ✅ "generate an image of blue sky" returns actual image
3. ✅ No SVG code in chat responses
4. ✅ Proper error handling for failed generations
5. ✅ Automatic fallback between models working

---

**Last Updated:** August 18, 2025
**Status:** ✅ Comprehensive troubleshooting system implemented
