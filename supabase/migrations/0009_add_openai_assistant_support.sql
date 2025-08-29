-- Add OpenAI Assistant support to chat_agents table
-- Migration: 0009_add_openai_assistant_support.sql

-- Add columns to support OpenAI Assistants integration
ALTER TABLE chat_agents 
ADD COLUMN IF NOT EXISTS openai_assistant_id TEXT,
ADD COLUMN IF NOT EXISTS agent_mode TEXT DEFAULT 'emmie' CHECK (agent_mode IN ('emmie', 'openai_assistant'));

-- Add comment for documentation
COMMENT ON COLUMN chat_agents.openai_assistant_id IS 'OpenAI Assistant ID when using OpenAI Assistants API instead of Emmie';
COMMENT ON COLUMN chat_agents.agent_mode IS 'Agent mode: emmie (default multi-agent) or openai_assistant';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_agents_mode ON chat_agents(agent_mode);
CREATE INDEX IF NOT EXISTS idx_chat_agents_openai_id ON chat_agents(openai_assistant_id) 
WHERE openai_assistant_id IS NOT NULL;

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_chat_agents_org_mode_active ON chat_agents(org_id, agent_mode, is_active);

-- Update existing agents to use 'emmie' mode by default (they're already using it)
UPDATE chat_agents SET agent_mode = 'emmie' WHERE agent_mode IS NULL;
