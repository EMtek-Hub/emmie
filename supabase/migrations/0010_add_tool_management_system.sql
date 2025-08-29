-- Add tool management system for OpenAI Assistants
-- Migration: 0010_add_tool_management_system.sql

-- Table to define available tools
CREATE TABLE IF NOT EXISTS tool_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'general', -- IT Support, Knowledge Base, System Integration, External API
    tool_type TEXT NOT NULL DEFAULT 'function', -- function, code_interpreter, file_search
    function_schema JSONB, -- OpenAI function schema for function tools
    default_config JSONB DEFAULT '{}', -- Default configuration parameters
    is_system BOOLEAN DEFAULT false, -- System tools (cannot be deleted)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    created_by UUID REFERENCES auth.users(id),
    org_id UUID NOT NULL REFERENCES organizations(id)
);

-- Table to link agents with their available tools
CREATE TABLE IF NOT EXISTS agent_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES chat_agents(id) ON DELETE CASCADE,
    tool_id UUID NOT NULL REFERENCES tool_definitions(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}', -- Agent-specific tool configuration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    -- Ensure unique tool per agent
    UNIQUE(agent_id, tool_id)
);

-- Table to store tool execution logs
CREATE TABLE IF NOT EXISTS tool_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES chat_agents(id),
    tool_id UUID NOT NULL REFERENCES tool_definitions(id),
    chat_id UUID REFERENCES chats(id),
    message_id UUID REFERENCES messages(id),
    execution_time_ms INTEGER,
    status TEXT NOT NULL, -- success, error, timeout
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    user_id UUID REFERENCES auth.users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tool_definitions_category ON tool_definitions(category);
CREATE INDEX IF NOT EXISTS idx_tool_definitions_org_active ON tool_definitions(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_agent_tools_agent_enabled ON agent_tools(agent_id, is_enabled);
CREATE INDEX IF NOT EXISTS idx_agent_tools_tool ON agent_tools(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_execution_logs_agent_time ON tool_execution_logs(agent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tool_execution_logs_chat ON tool_execution_logs(chat_id);

-- RLS Policies
ALTER TABLE tool_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_execution_logs ENABLE ROW LEVEL SECURITY;

-- Policies for tool_definitions
CREATE POLICY "tool_definitions_select" ON tool_definitions
    FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "tool_definitions_insert" ON tool_definitions
    FOR INSERT WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "tool_definitions_update" ON tool_definitions
    FOR UPDATE USING (org_id = get_user_org_id());

CREATE POLICY "tool_definitions_delete" ON tool_definitions
    FOR DELETE USING (org_id = get_user_org_id() AND NOT is_system);

-- Policies for agent_tools
CREATE POLICY "agent_tools_select" ON agent_tools
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_agents ca 
            WHERE ca.id = agent_tools.agent_id 
            AND ca.org_id = get_user_org_id()
        )
    );

CREATE POLICY "agent_tools_insert" ON agent_tools
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_agents ca 
            WHERE ca.id = agent_tools.agent_id 
            AND ca.org_id = get_user_org_id()
        )
    );

CREATE POLICY "agent_tools_update" ON agent_tools
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM chat_agents ca 
            WHERE ca.id = agent_tools.agent_id 
            AND ca.org_id = get_user_org_id()
        )
    );

CREATE POLICY "agent_tools_delete" ON agent_tools
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM chat_agents ca 
            WHERE ca.id = agent_tools.agent_id 
            AND ca.org_id = get_user_org_id()
        )
    );

-- Policies for tool_execution_logs
CREATE POLICY "tool_execution_logs_select" ON tool_execution_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_agents ca 
            WHERE ca.id = tool_execution_logs.agent_id 
            AND ca.org_id = get_user_org_id()
        )
    );

CREATE POLICY "tool_execution_logs_insert" ON tool_execution_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_agents ca 
            WHERE ca.id = tool_execution_logs.agent_id 
            AND ca.org_id = get_user_org_id()
        )
    );

-- Function to get tools for a specific agent
CREATE OR REPLACE FUNCTION get_agent_tools(agent_id_param UUID)
RETURNS TABLE (
    tool_id UUID,
    tool_name TEXT,
    display_name TEXT,
    description TEXT,
    category TEXT,
    tool_type TEXT,
    function_schema JSONB,
    config JSONB,
    is_enabled BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        td.id as tool_id,
        td.name as tool_name,
        td.display_name,
        td.description,
        td.category,
        td.tool_type,
        td.function_schema,
        COALESCE(at.config, td.default_config) as config,
        COALESCE(at.is_enabled, false) as is_enabled
    FROM tool_definitions td
    LEFT JOIN agent_tools at ON td.id = at.tool_id AND at.agent_id = agent_id_param
    WHERE td.is_active = true
    AND td.org_id = get_user_org_id()
    ORDER BY td.category, td.display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log tool execution
CREATE OR REPLACE FUNCTION log_tool_execution(
    agent_id_param UUID,
    tool_id_param UUID,
    chat_id_param UUID DEFAULT NULL,
    message_id_param UUID DEFAULT NULL,
    execution_time_ms_param INTEGER DEFAULT NULL,
    status_param TEXT DEFAULT 'success',
    input_data_param JSONB DEFAULT NULL,
    output_data_param JSONB DEFAULT NULL,
    error_message_param TEXT DEFAULT NULL,
    user_id_param UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO tool_execution_logs (
        agent_id,
        tool_id,
        chat_id,
        message_id,
        execution_time_ms,
        status,
        input_data,
        output_data,
        error_message,
        user_id
    ) VALUES (
        agent_id_param,
        tool_id_param,
        chat_id_param,
        message_id_param,
        execution_time_ms_param,
        status_param,
        input_data_param,
        output_data_param,
        error_message_param,
        user_id_param
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default system tools
INSERT INTO tool_definitions (name, display_name, description, category, tool_type, function_schema, is_system, org_id) VALUES
-- Built-in OpenAI tools
('code_interpreter', 'Code Interpreter', 'Execute Python code for data analysis and calculations', 'System Integration', 'code_interpreter', NULL, true, (SELECT id FROM organizations WHERE name = 'EMtek' LIMIT 1)),
('file_search', 'File Search', 'Search through uploaded files and documents', 'Knowledge Base', 'file_search', NULL, true, (SELECT id FROM organizations WHERE name = 'EMtek' LIMIT 1)),

-- Custom EMtek tools based on the Python script
('submit_it_support_ticket', 'IT Support Ticket', 'Submit an IT support ticket to the EMtek helpdesk', 'IT Support', 'function', '{
    "name": "submit_it_support_ticket",
    "description": "Submit an IT support ticket with user details and issue information",
    "parameters": {
        "type": "object",
        "properties": {
            "user_name": {
                "type": "string",
                "description": "Name of the user requesting support"
            },
            "issue_summary": {
                "type": "string",
                "description": "Brief summary of the issue"
            },
            "details": {
                "type": "string",
                "description": "Additional context and details about the issue"
            },
            "priority": {
                "type": "string",
                "enum": ["low", "medium", "high"],
                "description": "Priority level of the issue"
            },
            "request_type": {
                "type": "string",
                "enum": ["hardware_attention", "access_granting", "license_issuance", "general_support"],
                "description": "Type of IT support request"
            }
        },
        "required": ["user_name", "issue_summary", "details"]
    }
}', true, (SELECT id FROM organizations WHERE name = 'EMtek' LIMIT 1)),

('get_system_info', 'System Information', 'Gather system information for troubleshooting', 'IT Support', 'function', '{
    "name": "get_system_info",
    "description": "Retrieve system information including OS, hardware, and performance metrics",
    "parameters": {
        "type": "object",
        "properties": {
            "detailed": {
                "type": "boolean",
                "description": "Whether to include detailed performance metrics",
                "default": false
            }
        }
    }
}', true, (SELECT id FROM organizations WHERE name = 'EMtek' LIMIT 1)),

('document_search', 'Document Search', 'Search EMtek knowledge base and documentation', 'Knowledge Base', 'function', '{
    "name": "document_search",
    "description": "Search EMtek knowledge base for company IT procedures, policies, and documentation",
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The search query to find relevant EMtek knowledge base content"
            },
            "category": {
                "type": "string",
                "enum": ["policy", "procedure", "troubleshooting", "general"],
                "description": "Category of documentation to search"
            }
        },
        "required": ["query"]
    }
}', true, (SELECT id FROM organizations WHERE name = 'EMtek' LIMIT 1)),

('vision_analysis', 'Vision Analysis', 'Analyze uploaded images for IT troubleshooting', 'IT Support', 'function', '{
    "name": "vision_analysis",
    "description": "Analyze uploaded images for IT troubleshooting including screenshots, error messages, and hardware photos",
    "parameters": {
        "type": "object",
        "properties": {
            "analysis_request": {
                "type": "string",
                "description": "Description of what should be analyzed in the uploaded images"
            },
            "focus_area": {
                "type": "string",
                "enum": ["error_message", "hardware", "software_ui", "network_diagram", "general"],
                "description": "Primary focus area for the analysis"
            }
        },
        "required": ["analysis_request"]
    }
}', true, (SELECT id FROM organizations WHERE name = 'EMtek' LIMIT 1))

ON CONFLICT (name) DO NOTHING;

-- Update function to handle updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_tool_definitions_updated_at BEFORE UPDATE ON tool_definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_tools_updated_at BEFORE UPDATE ON agent_tools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE tool_definitions IS 'Registry of all available tools for OpenAI Assistants';
COMMENT ON TABLE agent_tools IS 'Configuration of tools assigned to specific agents';
COMMENT ON TABLE tool_execution_logs IS 'Audit log of tool executions';
COMMENT ON FUNCTION get_agent_tools IS 'Get all tools available to a specific agent with configuration';
COMMENT ON FUNCTION log_tool_execution IS 'Log the execution of a tool for audit and analytics';
