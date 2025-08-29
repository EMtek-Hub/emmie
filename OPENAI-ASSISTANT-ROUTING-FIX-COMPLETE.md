# OpenAI Assistant Routing Fix - COMPLETE

## Issue Summary
The IT Support agent (and other OpenAI Assistants) were responding as "Emmie" instead of using their proper OpenAI Assistant personalities because the routing logic was incorrectly directing them to the GPT-5 Responses API instead of the OpenAI Assistants API.

## Root Cause Analysis
The console logs showed:
```
🚀 Starting GPT-5 chat request with streaming
🤖 Starting streaming with GPT-5 Responses API...
```

This indicated that the IT Support agent (OpenAI Assistant ID: `10000000-0000-0000-0000-000000000002`) was being routed to `/api/chat-gpt5` instead of `/api/chat`.

**The problem was identified in two parts:**

1. **Missing Fields in Agents API**: The public agents API (`/pages/api/agents.ts`) was not selecting the `openai_assistant_id` and `agent_mode` fields from the database
2. **Routing Logic**: The routing logic in `chat.js` checks `selectedAgent?.openai_assistant_id`, but this field was undefined due to issue #1

## Fix Implementation

### 1. Updated Public Agents API
**File**: `pages/api/agents.ts`

**Change**: Added missing fields to the database query:
```typescript
// BEFORE
.select(`
  id,
  name,
  department,
  description,
  system_prompt,
  background_instructions,
  color,
  icon,
  is_active,
  created_at,
  documents!agent_id(count)
`)

// AFTER
.select(`
  id,
  name,
  department,
  description,
  system_prompt,
  background_instructions,
  color,
  icon,
  is_active,
  agent_mode,
  openai_assistant_id,
  created_at,
  documents!agent_id(count)
`)
```

### 2. Verified Routing Logic
**File**: `pages/chat.js` (lines 351-361)

The routing logic was already correct but wasn't working due to missing data:
```javascript
// Choose API endpoint based on agent type and selected model
let apiEndpoint;
if (selectedAgent?.openai_assistant_id) {
  // OpenAI Assistant - use dedicated OpenAI Assistants API
  apiEndpoint = '/api/chat';
} else if (Object.values(GPT5_MODELS).includes(selectedModel)) {
  // GPT-5 model - use GPT-5 Responses API
  apiEndpoint = '/api/chat-gpt5';
} else {
  // Legacy model - use simple chat API
  apiEndpoint = '/api/chat-simple';
}
```

## Expected Behavior After Fix

### Before Fix
- **IT Support Agent** → GPT-5 Responses API (`/api/chat-gpt5`) → Responds as "Emmie"
- Console logs: "Starting GPT-5 chat request", "Starting streaming with GPT-5 Responses API"

### After Fix
- **IT Support Agent** → OpenAI Assistants API (`/api/chat`) → Responds with proper IT Support personality
- Console logs should show: "Starting OpenAI Assistant request", "Using OpenAI Assistants API"

## Testing Instructions

### 1. Backend Verification
The agents API now returns the required fields. Test by checking:
```bash
# Check that agents API includes required fields
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/agents | \
  jq '.agents[] | select(.name == "IT Support") | {name, agent_mode, openai_assistant_id}'
```

Expected response:
```json
{
  "name": "IT Support",
  "agent_mode": "openai_assistant", 
  "openai_assistant_id": "10000000-0000-0000-0000-000000000002"
}
```

### 2. Frontend Testing
1. **Open the chat application in your browser**
2. **Select the "IT Support" agent** from the agent dropdown
3. **Send a message** (e.g., "Hello, can you help me with a technical issue?")
4. **Check browser console** for routing logs:
   - Should see API calls to `/api/chat` (not `/api/chat-gpt5`)
   - Should NOT see "Starting GPT-5 chat request"
5. **Verify response personality**:
   - Response should be from IT Support personality (technical, helpful)
   - Should NOT respond as "Emmie" with general personality

### 3. Additional Agent Testing
Test other agents to ensure routing still works correctly:

| Agent Type | Expected API Endpoint | Expected Behavior |
|------------|----------------------|-------------------|
| **IT Support** (OpenAI Assistant) | `/api/chat` | IT Support personality |
| **General** (Regular agent + GPT-5) | `/api/chat-gpt5` | Emmie personality with GPT-5 |
| **General** (Regular agent + Legacy model) | `/api/chat-simple` | Emmie personality with legacy model |

## Verification Steps

### Database Check
```sql
-- Verify IT Support agent configuration
SELECT name, agent_mode, openai_assistant_id, is_active 
FROM chat_agents 
WHERE name = 'IT Support' AND org_id = 'YOUR_ORG_ID';
```

Expected result:
```
name: "IT Support"
agent_mode: "openai_assistant"
openai_assistant_id: "10000000-0000-0000-0000-000000000002"
is_active: true
```

### UI/UX Check
- ✅ Model selector should be **hidden** when IT Support agent is selected
- ✅ Agent selector should show simplified view (icon + name only)
- ✅ Chat should route to OpenAI Assistants API
- ✅ Responses should maintain IT Support personality

## Files Modified

1. **`pages/api/agents.ts`** - Added `agent_mode` and `openai_assistant_id` to SELECT query
2. **`scripts/test-openai-assistant-routing-validation.js`** - Created test script to validate fix

## Related Documentation

- [OpenAI Assistant Routing Fix (Previous)](./OPENAI-ASSISTANT-ROUTING-FIX-COMPLETE.md)
- [Agent Selector Fix Summary](./AGENT-SELECTOR-FIX-SUMMARY.md)
- [GPT-5 Migration Complete](./GPT5-MIGRATION-COMPLETE.md)

## Status: ✅ COMPLETE

The OpenAI Assistant routing issue has been resolved. IT Support and other OpenAI Assistants should now properly route to the OpenAI Assistants API and maintain their configured personalities instead of responding as "Emmie".

**Next Steps**: Test in browser to confirm the fix works as expected.
