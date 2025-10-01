# Production API Failures Analysis & Fixes

## Issues Identified

Based on console errors from production deployment:

### 1. 504 Gateway Timeout - `/api/chat-gpt5`
**Error**: `POST https://emmie.emtek.au/api/chat-gpt5 504 (Gateway Timeout)`

**Root Cause**: 
- The `chat-gpt5.ts` endpoint has `maxDuration: 25` seconds
- Netlify function timeout is set to 26 seconds
- AI streaming operations are taking longer than allowed timeout
- Serverless functions are timing out during GPT-5 streaming

### 2. 404 Not Found - Chat Messages Endpoint
**Error**: `GET https://emmie.emtek.au/api/chats/f87258bd-7583-4278-ba95-265d44a96163/messages 404 (Not Found)`

**Root Cause**:
- Dynamic route `/api/chats/[id]/messages.ts` not being properly handled in production
- Chat ID exists (chat history loads successfully), but messages endpoint fails
- Netlify dynamic route configuration issue

### 3. 404 Not Found - Delete Chat Endpoint  
**Error**: `DELETE https://emmie.emtek.au/api/chats 404 (Not Found)`

**Root Cause**:
- Delete endpoint exists in `/api/chats.ts` but returning 404
- Potential routing or method handling issue in production deployment

## Technical Analysis

### Chat Messages Route Issue
The route `/api/chats/[id]/messages.ts` works in development but fails in production. This is a common Next.js serverless deployment issue where dynamic routes need explicit redirect rules.

### Timeout Configuration Mismatch
```typescript
// chat-gpt5.ts has:
export const config = { 
  maxDuration: 25  // 25 seconds
};

// netlify.toml has:
[functions]
  timeout = 26  // 26 seconds
```

The TIMEOUT_MS constant in chat-gpt5.ts is set to 24000ms (24 seconds), but actual AI operations can exceed this.

### Missing Netlify Route Configurations
The `netlify.toml` has some redirect rules but may be missing critical dynamic route mappings.

## Proposed Fixes

### Fix 1: Update Netlify Configuration
Add comprehensive redirect rules for all dynamic API routes:

```toml
# Add to netlify.toml
[[redirects]]
  from = "/api/chats/:id/messages"
  to = "/.netlify/functions/___netlify-handler"
  status = 200

[[redirects]]
  from = "/api/chats/:id/*"
  to = "/.netlify/functions/___netlify-handler"
  status = 200

[[redirects]]
  from = "/api/chats"
  to = "/.netlify/functions/___netlify-handler"
  status = 200
```

### Fix 2: Increase Timeout Limits
```typescript
// In chat-gpt5.ts - increase timeout allowances:
export const config = { 
  api: { 
    bodyParser: { sizeLimit: '1mb' } 
  },
  maxDuration: 30  // Increase to 30 seconds
};

// Update timeout constant:
const TIMEOUT_MS = 28000; // 28 seconds to be safe
```

```toml
# In netlify.toml - increase function timeout:
[functions]
  timeout = 30
```

### Fix 3: Add Error Handling for Route Failures
Add fallback error handling in the frontend for failed API calls:

```javascript
// Enhanced error handling in chat.js:
const loadChat = async (chatId) => {
  try {
    const response = await fetch(`/api/chats/${chatId}/messages`);
    if (!response.ok) {
      if (response.status === 404) {
        console.error('Chat messages not found, chat may have been deleted');
        // Refresh chat list to remove stale entries
        await loadChatHistory();
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    // ... rest of code
  } catch (error) {
    console.error('Failed to load chat:', error);
    // Handle gracefully - don't break the UI
  }
};
```

### Fix 4: Implement Graceful Timeout Handling
```typescript
// In chat-gpt5.ts - add better timeout handling:
if (checkTimeout()) {
  console.log('⏰ Timeout reached, saving partial response');
  // Save partial response before timing out
  if (fullResponse.trim()) {
    const { data: assistantMsg } = await supabaseAdmin
      .from('messages')
      .insert([{
        chat_id,
        role: 'assistant',
        content_md: fullResponse + '\n\n_[Response was truncated due to timeout]_',
        model: 'gpt-5',
        metadata: { timed_out: true, partial_response: true }
      }])
      .select()
      .single();
  }
  send({ timeout_warning: true, partial_response: fullResponse });
  break;
}
```

## Priority Actions

1. **Immediate**: Update `netlify.toml` with comprehensive redirect rules
2. **High**: Increase timeout configurations across the board  
3. **Medium**: Add better error handling in frontend
4. **Low**: Implement graceful timeout handling

## Testing Required

After implementing fixes:
1. Test chat message loading in production
2. Test chat deletion functionality  
3. Test long-running AI conversations
4. Verify timeout handling works correctly
5. Test edge cases with non-existent chat IDs

## Notes

- The 504 timeout on chat-gpt5 indicates users are having successful conversations that exceed 25 seconds
- Chat history API works (200 status), so auth and basic routing is functional
- The 404s suggest deployment-specific routing issues rather than code problems
