# Upload & Image Generation Setup Guide

## 🚨 Root Cause Identified

Both **image uploads not working** and **image generation not working** are caused by the same issue:

**Missing `.env` file with required environment variables**

I've created a `.env` file with placeholder values, but you need to replace them with your actual credentials.

## 🔧 Step-by-Step Fix

### 1. Set Up Supabase (Required for Uploads)

#### Get Your Supabase Credentials:
1. Go to https://supabase.com/dashboard
2. Select your project (or create one if needed)
3. Go to **Settings** > **API**
4. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Service Role Key** (the `service_role` key, NOT the `anon` key)

#### Update `.env` file:
```bash
# Replace these placeholder values in your .env file:
NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
```

### 2. Create Storage Bucket

#### In Supabase Dashboard:
1. Go to **Storage** section
2. Create a new bucket called **`media`**
3. Set it as **Public** (for image sharing)
4. Or run the automated script:

```bash
cd emtek-tool-template
node scripts/setup-storage-bucket.js
```

### 3. Set Up OpenAI (Required for Image Generation)

#### Get Your OpenAI API Key:
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-`)

#### Update `.env` file:
```bash
# Replace this placeholder value:
OPENAI_API_KEY=sk-your-actual-openai-api-key
```

### 4. Test Everything Works

#### Test Uploads:
```bash
cd emtek-tool-template
node scripts/diagnose-upload-issues.js
```

#### Test Image Generation:
```bash
cd emtek-tool-template
node scripts/test-image-generation-complete.js
```

## 📁 Where Files Are Stored

### Generated Images (AI Created)
- **Location**: Supabase Storage bucket `media`
- **Path**: `generated-images/generated-{uuid}.{extension}`
- **Access**: 24-hour signed URLs
- **Handled by**: `/api/images/generate.ts`

### Uploaded Images (User Uploads)
- **Location**: Supabase Storage bucket `media`
- **Path**: `chat-media/{uuid}.{extension}`
- **Access**: 1-hour signed URLs  
- **Handled by**: `/api/upload.ts`

## 🔍 Troubleshooting

### If Uploads Still Don't Work:

#### 1. Check Bucket Permissions
- Ensure `media` bucket exists in Supabase
- Check RLS (Row Level Security) policies
- Verify bucket is properly configured

#### 2. Check API Endpoints
- Test `/api/upload` endpoint directly
- Check browser network tab for errors
- Verify formidable dependency is installed

#### 3. Check File Types & Sizes
- Supported: Images (JPEG, PNG, WebP, GIF), Documents (PDF, DOCX, TXT, MD)
- Max size: 20MB
- Ensure files meet these requirements

### If Image Generation Still Doesn't Work:

#### 1. OpenAI Organization Verification
- `gpt-image-1` may require organization verification
- Check OpenAI console for verification status
- System will automatically fall back to `dall-e-3` and `dall-e-2`

#### 2. API Key Permissions
- Ensure API key has image generation permissions
- Check usage limits in OpenAI dashboard
- Verify billing is set up correctly

#### 3. Test Individual Models
```bash
# Test each model individually:
node scripts/test-image-generation-complete.js
```

## 🎯 Quick Fix Summary

**To fix uploads and image generation immediately:**

1. **Copy your Supabase URL and Service Role Key** into `.env`
2. **Copy your OpenAI API Key** into `.env`
3. **Create `media` bucket** in Supabase Storage
4. **Run diagnostic scripts** to verify everything works

## 🔒 Security Notes

- **Never commit `.env` to git** (it's in `.gitignore`)
- **Use Service Role Key for server-side operations** (never expose in frontend)
- **Store generated images with signed URLs** for security
- **Set appropriate expiration times** (1 hour for uploads, 24 hours for generated images)

## 📋 Environment Variables Reference

```bash
# Required for EMtek Hub Integration
HUB_URL=https://hub.emtek.au
TOOL_ORIGIN=https://tool-a.emtek.com.au
TOOL_SLUG=tool-a

# Required for App
NEXT_PUBLIC_TOOL_NAME=Emmie AI Assistant
NEXT_PUBLIC_TOOL_DESCRIPTION=EMtek's intelligent IT Assistant

# Required for Uploads & Storage
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Required for Image Generation & AI
OPENAI_API_KEY=sk-your-openai-api-key

# Optional
APP_BASE_URL=http://localhost:3000
```

## ✅ Verification Checklist

- [ ] `.env` file exists with real credentials
- [ ] Supabase `media` bucket created
- [ ] Upload diagnostic script passes all tests
- [ ] Image generation diagnostic script passes
- [ ] Test upload through browser works
- [ ] Test image generation through chat works
- [ ] Images display correctly in chat
- [ ] Generated images save to storage properly

Once all steps are complete, both uploads and image generation should work perfectly!
