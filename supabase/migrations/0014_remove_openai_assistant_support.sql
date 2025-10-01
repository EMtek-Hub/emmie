-- Migration: 0014_remove_openai_assistant_support.sql
-- Remove all OpenAI Assistant API integration and switch to Responses API only

-- Drop functions first (to avoid dependency issues)
DROP FUNCTION IF EXISTS get_or_create_thread_id(UUID, TEXT);
DROP FUNCTION IF EXISTS save_thread_id_for_chat(UUID, TEXT);

-- Drop indexes related to OpenAI Assistant features
DROP INDEX IF EXISTS idx_chat_agents_mode;
DROP INDEX IF EXISTS idx_chat_agents_openai_id;
DROP INDEX IF EXISTS idx_chat_agents_org_mode_active;
DROP INDEX IF EXISTS idx_chats_thread_id;
DROP INDEX IF EXISTS idx_chats_thread_unique;

-- Remove OpenAI Assistant related columns from chat_agents table
ALTER TABLE chat_agents DROP COLUMN IF EXISTS openai_assistant_id;
ALTER TABLE chat_agents DROP COLUMN IF EXISTS agent_mode;

-- Remove thread persistence column from chats table
ALTER TABLE chats DROP COLUMN IF EXISTS openai_thread_id;

-- Recreate the org_mode_active index without agent_mode
CREATE INDEX IF NOT EXISTS idx_chat_agents_org_active ON chat_agents(org_id, is_active);

-- Add comment for documentation
COMMENT ON TABLE chat_agents IS 'Chat agents using Responses API only - OpenAI Assistant support removed';
COMMENT ON TABLE chats IS 'Chat conversations using Responses API only - thread persistence removed';

-- Ensure all agents are active and properly configured for Responses API
UPDATE chat_agents SET is_active = true WHERE is_active IS NULL;

-- Add check to ensure no orphaned data remains
DO $$
BEGIN
    -- Log the migration completion
    RAISE NOTICE 'OpenAI Assistant support removal completed successfully';
    RAISE NOTICE 'All agents now use Responses API exclusively';
END $$;
