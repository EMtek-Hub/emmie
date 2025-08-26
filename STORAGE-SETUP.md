# Supabase Storage Setup Guide

## Problem
The multimodal features require a Supabase Storage bucket named `media` which doesn't exist yet.

## Quick Setup

### Step 1: Create the Storage Bucket
Run the setup script to create the bucket:

```bash
# Load environment variables and run the setup script
node -r dotenv/config scripts/setup-storage-bucket.js dotenv_config_path=.env.local
```

### Step 2: Configure Bucket Policies (Manual)

After running the script, you need to manually configure RLS policies in the Supabase Dashboard:

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Storage** → **media** bucket
3. Click on **Policies** tab
4. Add the following policies:

#### INSERT Policy (Upload)
```sql
-- Allow authenticated users to upload files
(auth.role() = 'authenticated')
```

#### SELECT Policy (View)
```sql
-- Allow authenticated users to view files
(auth.role() = 'authenticated')
```

#### UPDATE Policy (Update)
```sql
-- Allow authenticated users to update their files
(auth.role() = 'authenticated')
```

#### DELETE Policy (Delete)
```sql
-- Allow authenticated users to delete their files
(auth.role() = 'authenticated')
```

### Step 3: Configure CORS (if needed)

If you're accessing from a different domain:

1. Go to **Storage** → **Configuration**
2. Add your domain to CORS allowed origins
3. Example CORS configuration:
```json
{
  "allowed_origins": ["http://localhost:3000", "https://your-domain.com"],
  "allowed_methods": ["GET", "POST", "PUT", "DELETE"],
  "allowed_headers": ["*"],
  "exposed_headers": ["*"],
  "max_age": 3600
}
```

## Storage Structure

The setup script creates the following folder structure:
- `chat-media/` - User uploaded files in chat
- `generated-images/` - AI-generated images
- `edited-images/` - AI-edited images
- `document-uploads/` - Document files

## File Limits

- **Max file size**: 20MB
- **Allowed types**: 
  - Images: JPEG, PNG, WebP, GIF
  - Documents: PDF, DOC, DOCX, TXT, MD

## Troubleshooting

### Bucket Already Exists
If you get an error that the bucket already exists, that's fine - the script checks for this.

### Permission Denied
Make sure you're using the `SUPABASE_SERVICE_ROLE_KEY` (not the anon key) in your `.env.local`

### CORS Issues
If uploads work but you can't view images, check CORS settings in Supabase Dashboard.

## Testing the Setup

After setup, test the storage:

1. Go to `/chat` in your app
2. Click the "+" button → "Add photos & files"
3. Upload a test image
4. If successful, you should see the image preview

## Manual Bucket Creation (Alternative)

If the script doesn't work, create the bucket manually:

1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `media`
4. Public: No (we use signed URLs)
5. File size limit: 20MB
6. Allowed MIME types: (add the types listed above)
7. Save and configure policies as described above
