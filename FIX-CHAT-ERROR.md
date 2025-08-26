# Fix Chat Error - Missing Database Columns

## The Problem
The error "Could not find the 'attachments' column of 'messages'" occurs because the multimodal support migration hasn't been applied to your database.

## Quick Fix - Run SQL in Supabase Dashboard

### Step 1: Open Supabase SQL Editor
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor** (in the left sidebar)

### Step 2: Run This SQL
Copy and paste this entire SQL block into the editor and click **Run**:

```sql
-- Add multimodal support to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments JSONB;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_attachments ON messages USING GIN(attachments);

-- Add documentation comments
COMMENT ON COLUMN messages.attachments IS 'JSON array storing file/image metadata: [{type: "image", url: "signed-url", alt: "description", size: 1024}]';
COMMENT ON COLUMN messages.message_type IS 'Type of message: text, image, file, generated_image, mixed';
```

### Step 3: Verify the Fix
After running the SQL:
1. Refresh your app page (http://localhost:3002/chat)
2. Try sending a message
3. The error should be gone!

## Alternative: For Existing Messages
If you have existing messages and want to update them with default values:

```sql
-- Update existing messages to have default message_type
UPDATE messages 
SET message_type = 'text' 
WHERE message_type IS NULL;

-- Set attachments to null for existing messages
UPDATE messages 
SET attachments = NULL 
WHERE attachments IS NULL;
```

## Testing Multimodal Features
Once the migration is applied:

1. **Test Text Chat**: Send a regular message
2. **Test Image Upload**: Click "+" → "Add photos & files" → Upload an image
3. **Test Image Generation**: Type "Generate an image of a sunset"

## Still Having Issues?

### Check Column Existence
Run this query to verify columns were added:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('attachments', 'message_type');
```

You should see:
- `attachments` | `jsonb`
- `message_type` | `text`

### Reset Schema Cache
If columns exist but you still get errors:
1. Go to Settings → API
2. Click "Reload Schema Cache"
3. Wait 30 seconds and try again

## Complete Migration List
If you want to ensure ALL migrations are applied:

```sql
-- Check which migrations have been run
SELECT * FROM supabase_migrations ORDER BY version;
```

Make sure you have:
- 0001_workchat.sql
- 0002_fix_user_id_for_azure_ad.sql
- 0003_add_chat_updated_at.sql
- 0004_add_chat_agents_and_documents.sql
- 0005_add_vector_search_function.sql
- 0006_add_multimodal_support.sql (THIS ONE IS MISSING)
