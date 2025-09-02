-- Add thread persistence for OpenAI Assistant conversations
-- Migration: 0011_add_thread_persistence.sql

-- Add openai_thread_id to chats table for persistent conversations
ALTER TABLE chats ADD COLUMN IF NOT EXISTS openai_thread_id TEXT;

-- Create index for efficient thread lookups
CREATE INDEX IF NOT EXISTS idx_chats_thread_id ON chats(openai_thread_id);

-- Create unique constraint to prevent duplicate threads per chat
CREATE UNIQUE INDEX IF NOT EXISTS idx_chats_thread_unique ON chats(openai_thread_id) WHERE openai_thread_id IS NOT NULL;

-- Function to get or create thread ID for a chat
CREATE OR REPLACE FUNCTION get_or_create_thread_id(chat_id_param UUID, new_thread_id TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    existing_thread_id TEXT;
BEGIN
    -- Try to get existing thread ID
    SELECT openai_thread_id INTO existing_thread_id
    FROM chats 
    WHERE id = chat_id_param;
    
    -- If no existing thread and new thread provided, update it
    IF existing_thread_id IS NULL AND new_thread_id IS NOT NULL THEN
        UPDATE chats 
        SET openai_thread_id = new_thread_id
        WHERE id = chat_id_param;
        
        RETURN new_thread_id;
    END IF;
    
    -- Return existing thread ID (could be NULL)
    RETURN existing_thread_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to save thread ID for a chat
CREATE OR REPLACE FUNCTION save_thread_id_for_chat(chat_id_param UUID, thread_id_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE chats 
    SET openai_thread_id = thread_id_param
    WHERE id = chat_id_param;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment for documentation
COMMENT ON COLUMN chats.openai_thread_id IS 'OpenAI Assistant thread ID for maintaining conversation context';
COMMENT ON FUNCTION get_or_create_thread_id IS 'Get existing thread ID or save new one for a chat';
COMMENT ON FUNCTION save_thread_id_for_chat IS 'Save OpenAI thread ID for a specific chat';
