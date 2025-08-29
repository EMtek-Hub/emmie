# Agent Endpoint Verification Guide

This guide explains how to confirm whether your agents are using the OpenAI Assistant endpoint or falling back to the Emmie (GPT-5) endpoint.

## Quick Start

### 1. Run Static Verification
```bash
node scripts/verify-agent-endpoints.js
```

### 2. Monitor Real-Time Usage
```bash
node scripts/monitor-agent-routing.js monitor
```

### 3. Check Recent Usage
```bash
node scripts/monitor-agent-routing.js usage "1 hour"
```

## Understanding Agent Configuration

### Agent Modes
- **`emmie`** or **`null`**: Uses Emmie (GPT-5) endpoint
- **`openai_assistant`**: Uses OpenAI Assistant endpoint (requires `openai_assistant_id`)

### Configuration Check
```sql
SELECT id, name, agent_mode, openai_assistant_id 
FROM chat_agents 
WHERE org_id = 'your-org-id' 
ORDER BY name;
```

## Endpoint Detection Methods

### 1. Database Model Field
Check the `model` field in the `messages` table:

**OpenAI Assistant responses:**
- Model format: `openai-assistant:[assistant-id]`
- Example: `openai-assistant:asst_abc123xyz`

**Emmie (GPT-5) responses:**
- Model format: `gpt-5-mini`, `gpt-5-nano`, or `gpt-5`
- Example: `gpt-5-mini`

### 2. Console Log Patterns
Look for these log messages in your application console:

**OpenAI Assistant:**
```
🤖 Using OpenAI Assistant: asst_abc123xyz for agent: IT Support
```

**Emmie (GPT-5):**
```
🚀 Using GPT-5 Responses API with model: gpt-5-mini
```

### 3. Code Path Analysis
In `pages/api/chat.ts`, the routing logic is:

```javascript
// Check if agent uses OpenAI Assistant
if (agent.agent_mode === 'openai_assistant' && agent.openai_assistant_id) {
  console.log(`🤖 Using OpenAI Assistant: ${agent.openai_assistant_id} for agent: ${agent.name}`);
  return handleOpenAIAssistantChat(/*...*/);
}
// Otherwise, falls back to Emmie (GPT-5)
```

## Verification Scripts

### verify-agent-endpoints.js

**Purpose:** Static analysis of agent configurations and recent usage

**Output includes:**
- Agent configuration summary
- Endpoint categorization
- Recent chat analysis
- Message model indicators
- Configuration issues

**Sample Output:**
```
🤖 Agent: IT Support (Technical)
   ID: agent-123
   Active: ✅
   Mode: openai_assistant
   Assistant ID: asst_abc123xyz
   🎯 STATUS: Using OpenAI Assistant (asst_abc123xyz)
```

### monitor-agent-routing.js

**Purpose:** Real-time monitoring of endpoint usage

**Commands:**
- `monitor`: Real-time message monitoring
- `live`: Check active chats
- `usage [timeframe]`: Usage analysis

**Sample Output:**
```
✅ 14:30:15 - 🎯 IT Support (Technical)
   Model: openai-assistant:asst_abc123xyz
   Endpoint: OpenAI Assistant
   Expected: OpenAI Assistant
   Configuration: openai_assistant
```

## Troubleshooting Common Issues

### Issue 1: Agent configured for OpenAI Assistant but using Emmie

**Symptoms:**
- Agent has `agent_mode: 'openai_assistant'`
- Agent has valid `openai_assistant_id`
- But messages show model like `gpt-5-mini`

**Possible Causes:**
1. OpenAI Assistant API error/failure
2. Invalid assistant ID
3. OpenAI API key issues
4. Assistant not found

**Debug Steps:**
1. Check console logs for errors
2. Verify assistant ID exists in OpenAI dashboard
3. Test assistant ID directly with OpenAI API
4. Check environment variables

### Issue 2: Agent missing Assistant ID

**Symptoms:**
- Agent has `agent_mode: 'openai_assistant'`
- But `openai_assistant_id` is null/empty

**Fix:**
```sql
-- Either set assistant ID
UPDATE chat_agents 
SET openai_assistant_id = 'asst_your_id_here' 
WHERE id = 'agent-id';

-- Or change to Emmie mode
UPDATE chat_agents 
SET agent_mode = 'emmie', openai_assistant_id = null 
WHERE id = 'agent-id';
```

### Issue 3: Unknown agent mode

**Symptoms:**
- Agent has invalid `agent_mode` value

**Fix:**
```sql
UPDATE chat_agents 
SET agent_mode = 'emmie' 
WHERE agent_mode NOT IN ('emmie', 'openai_assistant');
```

## Step-by-Step Verification Process

### Step 1: Check Agent Configuration
```bash
node scripts/verify-agent-endpoints.js
```

Look for:
- ✅ Properly configured agents
- ⚠️ Misconfigured agents
- Agent mode summary

### Step 2: Send Test Messages
1. Open chat interface
2. Select specific agent
3. Send test message
4. Note the response time and behavior

### Step 3: Verify in Database
```sql
SELECT 
    m.model,
    m.created_at,
    ca.name as agent_name,
    ca.agent_mode,
    ca.openai_assistant_id
FROM messages m
JOIN chats c ON m.chat_id = c.id
JOIN chat_agents ca ON c.agent_id = ca.id
WHERE m.role = 'assistant'
ORDER BY m.created_at DESC
LIMIT 10;
```

### Step 4: Monitor Real-Time
```bash
node scripts/monitor-agent-routing.js monitor
```

Send messages and watch for real-time endpoint detection.

### Step 5: Analyze Usage Patterns
```bash
node scripts/monitor-agent-routing.js usage "24 hours"
```

Review usage statistics by agent and endpoint.

## Key Indicators

### ✅ OpenAI Assistant Working Correctly
- Model field: `openai-assistant:[id]`
- Console log: `🤖 Using OpenAI Assistant`
- Configuration matches usage
- Faster response times (typically)

### ✅ Emmie (GPT-5) Working Correctly  
- Model field: `gpt-5-mini`, `gpt-5-nano`, or `gpt-5`
- Console log: `🚀 Using GPT-5 Responses API`
- Configuration matches usage
- Supports advanced features (image generation, tools)

### ⚠️ Configuration Mismatch
- Expected OpenAI Assistant but using Emmie
- Expected Emmie but using different model
- Missing assistant ID
- Invalid configuration

## Environment Verification

### Required Environment Variables
```bash
# Required for OpenAI Assistant
OPENAI_API_KEY=sk-...

# Check if set
echo $OPENAI_API_KEY
```

### Assistant ID Validation
Test assistant exists:
```bash
curl https://api.openai.com/v1/assistants/asst_your_id \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "OpenAI-Beta: assistants=v2"
```

## Admin Interface

### Viewing Configurations
1. Navigate to `/admin/settings`
2. View agent configurations
3. Toggle between modes
4. Update assistant IDs

### Bulk Updates
Use the admin API:
```javascript
// Switch agent to OpenAI Assistant
PUT /api/admin/agents
{
  "agentId": "agent-123",
  "agent_mode": "openai_assistant",
  "openai_assistant_id": "asst_abc123xyz"
}

// Switch agent to Emmie
PUT /api/admin/agents
{
  "agentId": "agent-123", 
  "agent_mode": "emmie"
}
```

## Performance Considerations

### OpenAI Assistant
- **Pros:** Potentially faster, dedicated assistant behavior
- **Cons:** Limited to OpenAI capabilities, requires assistant setup

### Emmie (GPT-5)
- **Pros:** Advanced features, image generation, custom tools
- **Cons:** Potentially slower, more complex processing

## Conclusion

Use the verification scripts regularly to ensure your agents are using the correct endpoints. The combination of static analysis and real-time monitoring provides comprehensive visibility into your agent routing behavior.

For ongoing monitoring, consider running:
```bash
# Daily verification
node scripts/verify-agent-endpoints.js

# Real-time monitoring during active use
node scripts/monitor-agent-routing.js monitor
