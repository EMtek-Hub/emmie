-- Migration: Add Mode Support and Integrations for Assistant-Style Agents
-- This migration adds:
-- 1. Mode support (prompt/tools/hybrid) for agents
-- 2. Tool configuration per agent
-- 3. Integration management for external services

-- Add mode and allowed_tools columns to chat_agents
ALTER TABLE chat_agents 
ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'hybrid' 
CHECK (mode IN ('prompt', 'tools', 'hybrid'));

ALTER TABLE chat_agents
ADD COLUMN IF NOT EXISTS allowed_tools JSONB DEFAULT '["document_search", "vision_analysis", "web_search_preview", "code_interpreter"]'::jsonb;

-- Create agent_integrations table for external service configurations
CREATE TABLE IF NOT EXISTS agent_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('ticketing', 'email', 'webhook', 'api')),
  name TEXT NOT NULL,
  endpoint_url TEXT,
  auth_header_key TEXT DEFAULT 'X-API-Key',
  auth_token TEXT, -- Store encrypted in production
  config JSONB DEFAULT '{}'::jsonb, -- Additional configuration
  is_active BOOLEAN DEFAULT true,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, integration_type, name)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_agent_integrations_org_type ON agent_integrations(org_id, integration_type, is_active);

-- Update trigger for agent_integrations
CREATE TRIGGER update_agent_integrations_updated_at
    BEFORE UPDATE ON agent_integrations
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Set all existing agents to hybrid mode with comprehensive default tools
UPDATE chat_agents 
SET 
  mode = 'hybrid',
  allowed_tools = '["document_search", "vision_analysis", "web_search_preview", "code_interpreter", "image_generation"]'::jsonb
WHERE org_id = '00000000-0000-0000-0000-000000000001';

-- Add IT-specific tools to IT Support agent
UPDATE chat_agents 
SET allowed_tools = '["document_search", "vision_analysis", "web_search_preview", "code_interpreter", "raise_ticket", "search_tickets"]'::jsonb
WHERE department = 'IT' AND org_id = '00000000-0000-0000-0000-000000000001';

-- Add HR-specific tools to HR Assistant agent
UPDATE chat_agents 
SET allowed_tools = '["document_search", "web_search_preview", "log_leave_request", "search_hr_policies", "raise_ticket"]'::jsonb
WHERE department = 'HR' AND org_id = '00000000-0000-0000-0000-000000000001';

-- Add Engineering/Drafting tools
UPDATE chat_agents 
SET allowed_tools = '["document_search", "vision_analysis", "web_search_preview", "code_interpreter", "image_generation", "search_technical_docs"]'::jsonb
WHERE department IN ('Engineering', 'Drafting') AND org_id = '00000000-0000-0000-0000-000000000001';

-- Create default ticketing integration (placeholder - user will configure)
INSERT INTO agent_integrations (
  org_id, 
  integration_type, 
  name, 
  endpoint_url, 
  auth_header_key,
  auth_token,
  config,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'ticketing',
  'EMtek Ticketing System',
  'https://tickets.emtek.local/api/create',
  'X-API-Key',
  'CONFIGURE_ME', -- User needs to set this
  '{"timeout": 30000, "retries": 3}'::jsonb,
  false -- Disabled until configured
) ON CONFLICT (org_id, integration_type, name) DO NOTHING;

-- Create default email integration for leave requests
INSERT INTO agent_integrations (
  org_id,
  integration_type,
  name,
  endpoint_url,
  config,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'email',
  'Leave Request Notifications',
  NULL, -- Email uses SMTP, not HTTP endpoint
  '{
    "to": "hr@emtek.au",
    "subject_prefix": "[Emmie AI] Leave Request:",
    "from": "emmie@emtek.au"
  }'::jsonb,
  true
) ON CONFLICT (org_id, integration_type, name) DO NOTHING;

-- Add comments for documentation
COMMENT ON COLUMN chat_agents.mode IS 'Execution mode: prompt (no tools), tools (prefer tools), hybrid (balanced)';
COMMENT ON COLUMN chat_agents.allowed_tools IS 'Array of tool names this agent can use';
COMMENT ON TABLE agent_integrations IS 'External service integrations for ticketing, email, webhooks, etc.';
