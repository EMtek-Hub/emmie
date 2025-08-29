# Agent Endpoint Diagnostic Tool

This tool helps you verify whether your agents are using OpenAI Assistant endpoints or falling back to the Emmie multi-agent system.

## Overview

Your system has two modes for agent operation:
- **Emmie Mode**: Uses GPT-5 Responses API with custom tools (default)
- **OpenAI Assistant Mode**: Uses OpenAI Assistants API with thread-based conversations

## Quick Start

```bash
# Check agent configurations and usage
node scripts/diagnose-agent-endpoints.js

# Export detailed results to JSON
node scripts/diagnose-agent-endpoints.js --export

# Skip OpenAI Assistant validation (faster)
node scripts/diagnose-agent-endpoints.js --no-validate

# Show help
node scripts/diagnose-agent-endpoints.js --help
```

## What the Tool Checks

### 🤖 Agent Configurations
- **Agent Mode**: Whether each agent is set to `emmie` or `openai_assistant`
- **Assistant IDs**: Validates format and existence of OpenAI Assistant IDs
- **Active Status**: Identifies inactive agents with unnecessary configurations

### 📈 Usage Analytics
- **Recent Messages**: Analyzes which endpoints were actually used
- **Model Distribution**: Shows usage by model type
- **Timeline**: Daily usage patterns over the last 7 days

### ⚠️ Issue Detection
- Missing Assistant IDs for OpenAI mode agents
- Invalid Assistant ID formats
- Orphaned Assistant IDs on Emmie mode agents
- Inactive agents with unnecessary configurations

## Understanding the Output

### Status Indicators
- ✅ **Success**: Configuration is correct and working
- ⚠️ **Warning**: Minor issues that don't prevent operation
- ❌ **Error**: Critical issues that prevent proper operation

### Agent Modes
- **Emmie Agent**: Uses your custom multi-agent system
- **OpenAI Assistant**: Uses a specific OpenAI Assistant ID

### Message Models
- **gpt-5-\***: Emmie system models (gpt-5-nano, gpt-5-mini, gpt-5)
- **openai-assistant:asst_\***: OpenAI Assistant endpoints

## Configuration Requirements

### Environment Variables
```bash
# Required for the diagnostic tool
NEXT_PUBLIC_SUPABASE_URL=your-actual-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
OPENAI_API_KEY=your-openai-api-key  # Optional, for validation
```

### Database Schema
The tool requires these columns in your `chat_agents` table:
- `agent_mode` (text): 'emmie' or 'openai_assistant'
- `openai_assistant_id` (text): OpenAI Assistant ID when in OpenAI mode

## How to Configure Agents

### Option 1: Admin Interface
1. Go to your admin panel
2. Find the agent configuration cards
3. Expand an agent card
4. Select the appropriate mode:
   - **Emmie Multi-Agent System**: Uses your custom system
   - **OpenAI Assistant**: Enter a valid Assistant ID (starts with `asst_`)

### Option 2: Database Direct
```sql
-- Set agent to use OpenAI Assistant
UPDATE chat_agents 
SET agent_mode = 'openai_assistant', 
    openai_assistant_id = 'asst_your_assistant_id_here'
WHERE id = 'agent_id';

-- Set agent to use Emmie system
UPDATE chat_agents 
SET agent_mode = 'emmie', 
    openai_assistant_id = NULL
WHERE id = 'agent_id';
```

## Troubleshooting

### Environment Issues
```
❌ Placeholder value
```
**Solution**: Update your `.env` file with actual Supabase credentials from your Supabase dashboard.

### Invalid Assistant ID
```
❌ Invalid Assistant ID format (must start with "asst_")
```
**Solution**: Get the correct Assistant ID from your OpenAI dashboard. It should look like `asst_abc123xyz789`.

### Assistant Not Found
```
❌ Assistant ID not found in OpenAI
```
**Solution**: Verify the Assistant exists in your OpenAI account or create a new one.

### Low Usage
```
ℹ️ Only X% of recent messages used OpenAI Assistants
```
**Possible Causes**:
- Users are selecting Emmie agents instead of OpenAI Assistant agents
- OpenAI Assistant agents are configured but not being used
- Assistant IDs are invalid, causing fallback to Emmie

## Understanding the Flow

### When a message is sent:

1. **Agent Selection**: User selects an agent or system chooses default
2. **Mode Check**: System checks `agent_mode` and `openai_assistant_id`
3. **Routing Decision**:
   - If `agent_mode === 'openai_assistant'` AND valid `openai_assistant_id` exists
     → Route to `handleOpenAIAssistantChat()` (OpenAI Assistants API)
   - Otherwise → Route to default Emmie system (GPT-5 Responses API)

### Log Messages to Watch For:
```
🤖 Using OpenAI Assistant: asst_xxx for agent: Agent Name
```
This confirms an agent is using the OpenAI Assistant endpoint.

## Common Patterns

### All Emmie (Default)
```
📊 SUMMARY STATISTICS:
  Total Agents: 5
  OpenAI Assistant Mode: 0
  Emmie Mode: 5
```

### Mixed Usage
```
📊 SUMMARY STATISTICS:
  Total Agents: 5
  OpenAI Assistant Mode: 2
  Emmie Mode: 3

📈 RECENT USAGE:
  OpenAI Assistant endpoints: 45 messages
  Emmie endpoints: 55 messages
```

### Configuration Issues
```
❌ Agent "Support Bot" (IT)
    Mode: OpenAI Assistant
    Issue: Missing OpenAI Assistant ID
```

## Best Practices

1. **Test Configurations**: Use this diagnostic after making agent changes
2. **Monitor Usage**: Run periodically to ensure agents are working as expected
3. **Clean Up**: Remove unnecessary Assistant IDs from Emmie mode agents
4. **Validation**: Keep OpenAI API key configured for validation
5. **Export Data**: Use `--export` for detailed analysis and record keeping

## Export Format

The `--export` option creates a JSON file with:
```json
{
  "timestamp": "2025-01-28T09:22:53.000Z",
  "statistics": { ... },
  "agents": [ ... ],
  "usage": { ... },
  "recommendations": [ ... ]
}
```

This data can be used for:
- Historical tracking
- Automated monitoring
- Integration with other tools
- Detailed analysis
