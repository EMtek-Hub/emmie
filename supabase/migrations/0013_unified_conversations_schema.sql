-- Unified Conversations Schema for OpenAI Responses API
-- Migration: 0013_unified_conversations_schema.sql

-- Create conversations table for Responses API conversation management
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_conversation_id text, -- OpenAI Responses conversation ID
  org_id uuid REFERENCES organizations(id),
  user_id uuid REFERENCES auth.users(id),
  title text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add conversation_id to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES conversations(id),
ADD COLUMN IF NOT EXISTS response_id text, -- OpenAI response ID
ADD COLUMN IF NOT EXISTS tool_calls jsonb, -- Tool calls made in this message
ADD COLUMN IF NOT EXISTS attachments jsonb; -- File attachments and images

-- Create conversation_vector_stores mapping table for file_search
CREATE TABLE IF NOT EXISTS conversation_vector_stores (
  conversation_id uuid PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  vector_store_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_external_id ON conversations(external_conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_org_id ON conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_response_id ON messages(response_id);

CREATE INDEX IF NOT EXISTS idx_conversation_vector_stores_vector_id ON conversation_vector_stores(vector_store_id);

-- Update trigger for conversations
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_updated_at();

-- Function to get or create conversation for a chat
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  chat_id_param uuid,
  user_id_param uuid,
  org_id_param uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  conversation_id_result uuid;
BEGIN
  -- Try to get existing conversation for this chat
  SELECT c.id INTO conversation_id_result
  FROM conversations c
  JOIN chats ch ON ch.id = chat_id_param
  WHERE c.user_id = user_id_param
    AND (org_id_param IS NULL OR c.org_id = org_id_param)
  ORDER BY c.created_at DESC
  LIMIT 1;
  
  -- If no conversation exists, create one
  IF conversation_id_result IS NULL THEN
    INSERT INTO conversations (user_id, org_id, title)
    VALUES (user_id_param, org_id_param, 'New Conversation')
    RETURNING id INTO conversation_id_result;
  END IF;
  
  RETURN conversation_id_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update conversation with external ID from Responses API
CREATE OR REPLACE FUNCTION update_conversation_external_id(
  conversation_id_param uuid,
  external_id_param text
)
RETURNS boolean AS $$
BEGIN
  UPDATE conversations 
  SET external_conversation_id = external_id_param,
      updated_at = now()
  WHERE id = conversation_id_param;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get or create vector store for conversation
CREATE OR REPLACE FUNCTION get_or_create_vector_store(
  conversation_id_param uuid,
  vector_store_id_param text DEFAULT NULL
)
RETURNS text AS $$
DECLARE
  existing_vector_store_id text;
BEGIN
  -- Try to get existing vector store
  SELECT vector_store_id INTO existing_vector_store_id
  FROM conversation_vector_stores
  WHERE conversation_id = conversation_id_param;
  
  -- If vector store exists, return it
  IF existing_vector_store_id IS NOT NULL THEN
    RETURN existing_vector_store_id;
  END IF;
  
  -- If new vector store ID provided, save it
  IF vector_store_id_param IS NOT NULL THEN
    INSERT INTO conversation_vector_stores (conversation_id, vector_store_id)
    VALUES (conversation_id_param, vector_store_id_param)
    ON CONFLICT (conversation_id) DO UPDATE SET
      vector_store_id = vector_store_id_param;
    
    RETURN vector_store_id_param;
  END IF;
  
  -- Return NULL if no vector store exists or provided
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old conversations (optional maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_conversations(days_old integer DEFAULT 90)
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete conversations older than specified days with no recent activity
  DELETE FROM conversations 
  WHERE updated_at < (now() - INTERVAL '1 day' * days_old)
    AND id NOT IN (
      SELECT DISTINCT conversation_id 
      FROM messages 
      WHERE conversation_id IS NOT NULL 
        AND created_at > (now() - INTERVAL '1 day' * days_old)
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE conversations IS 'Unified conversation tracking for OpenAI Responses API';
COMMENT ON COLUMN conversations.external_conversation_id IS 'OpenAI Responses API conversation ID for server-managed state';
COMMENT ON TABLE conversation_vector_stores IS 'Mapping between conversations and OpenAI vector stores for file_search';

COMMENT ON FUNCTION get_or_create_conversation IS 'Get existing or create new conversation for a chat session';
COMMENT ON FUNCTION update_conversation_external_id IS 'Update conversation with external ID from Responses API';
COMMENT ON FUNCTION get_or_create_vector_store IS 'Get existing or create new vector store mapping for conversation';
COMMENT ON FUNCTION cleanup_old_conversations IS 'Maintenance function to clean up old inactive conversations';

-- Grant permissions (assuming existing RBAC pattern)
GRANT SELECT, INSERT, UPDATE ON conversations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON conversation_vector_stores TO anon, authenticated;

-- RLS policies (following existing pattern)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_vector_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own conversations" ON conversations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access vector stores for their conversations" ON conversation_vector_stores
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );
