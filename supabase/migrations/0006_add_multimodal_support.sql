-- Add multimodal support to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments JSONB;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';

-- Add index for message types and attachments
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_attachments ON messages USING GIN(attachments);

-- Add comments for documentation
COMMENT ON COLUMN messages.attachments IS 'JSON array storing file/image metadata: [{type: "image", url: "signed-url", alt: "description", size: 1024}]';
COMMENT ON COLUMN messages.message_type IS 'Type of message: text, image, file, generated_image, mixed';
