# Enhanced Chat Integration Guide

## Overview
This document describes the integration of advanced chat features from Onyx into the Emmie chat application. The integration preserves the existing Hub-based authentication system and gradient theme styling while adding powerful new capabilities.

## Features Added

### 1. Message Branching & Variations
- **What it does**: Users can regenerate AI responses and navigate between different variations
- **How to use**: Click the regenerate button on any AI message to create a new variation
- **Navigation**: Use the arrow buttons (1/2, 2/3, etc.) to switch between variations

### 2. Drag & Drop File Upload
- **Supported files**: Images (PNG, JPG, JPEG, GIF, WEBP), Documents (PDF, TXT, MD, CSV)
- **How to use**: 
  - Drag files directly onto the chat area
  - Or click the paperclip icon to select files
- **Visual feedback**: Files show as preview cards before sending

### 3. Document Sidebar
- **Purpose**: Display search results and relevant documents
- **Features**:
  - Filter by document type
  - Search within documents
  - Select/deselect documents for context
- **Toggle**: Click the document icon in the chat header

### 4. Message Feedback System
- **Like/Dislike**: Click thumbs up/down on any AI message
- **Purpose**: Helps improve AI responses over time
- **Visual feedback**: Icons change color when selected

### 5. Continue Generating
- **When to use**: When AI response is cut off due to length limits
- **How**: Click "Continue generating" button at the end of incomplete messages
- **Indicator**: Shows when response can be continued

### 6. Thinking Process Display
- **What it shows**: AI's reasoning process before generating response
- **Toggle**: Click "Show thinking" to expand/collapse
- **Visual**: Appears in a subtle gray box above the response

### 7. Tool Visualization
- **Search Tool**: Shows when AI searches documents
- **Image Generation**: Displays when creating images
- **Internet Search**: Shows web search activity
- **Visual feedback**: Each tool has unique icons and styling

### 8. Message Actions
- **Copy**: Copy message content to clipboard
- **Edit**: Edit your own messages (human messages only)
- **Regenerate**: Generate new response with different model
- **Model selection**: Choose between available AI models

## File Structure

```
emtek-tool-template/
├── lib/chat/
│   ├── interfaces.ts         # TypeScript interfaces for chat
│   └── messageUtils.ts       # Utility functions for messages
├── components/chat/
│   ├── EnhancedMessage.jsx   # Main message display component
│   ├── MessageActions.jsx    # Message action buttons
│   ├── DocumentSidebar.jsx   # Document search sidebar
│   └── DragDropWrapper.jsx   # File upload wrapper
└── pages/
    └── enhanced-chat.js       # Enhanced chat page
```

## API Endpoints Required

The enhanced chat expects these API endpoints to be available:

### Core Chat Endpoints
- `POST /api/chat` - Send messages and receive streaming responses
- `GET /api/chats` - List user's chats
- `POST /api/chats` - Create new chat
- `GET /api/chats/[id]/messages` - Get chat messages
- `POST /api/chats/[id]/generate-title` - Auto-generate chat title

### Message Actions
- `POST /api/chats/[chatId]/messages/[messageId]/feedback` - Submit feedback
- `POST /api/chats/[chatId]/messages/[messageId]/regenerate` - Regenerate response
- `POST /api/chats/[chatId]/messages/[messageId]/continue` - Continue generating

### File & Document Handling
- `POST /api/upload` - Upload files
- `GET /api/documents` - List documents
- `POST /api/documents/search` - Search documents

## Authentication Integration

The enhanced chat maintains compatibility with your Hub authentication:

```javascript
// All components use requireHubAuth
import { requireHubAuth } from '../lib/hubAuth';

// Protected page example
export const getServerSideProps = requireHubAuth(async (context) => {
  // Your logic here
});
```

## Styling Preservation

Your gradient theme is preserved throughout:

```css
/* Main gradient */
background: linear-gradient(135deg, #aedfe4 0%, #1275bc 100%);

/* Button styling */
className="bg-gradient-to-r from-[#aedfe4] to-[#1275bc]"

/* Hover states */
hover:from-[#9bcfd4] hover:to-[#0f65a8]
```

## Testing Guide

### 1. Basic Chat Functionality
```bash
# Start the development server
npm run dev

# Navigate to enhanced chat
http://localhost:3000/enhanced-chat
```

**Test checklist:**
- [ ] Send a text message
- [ ] Receive streaming AI response
- [ ] View thinking process (if available)
- [ ] Copy message content

### 2. File Upload Testing
- [ ] Drag and drop an image file
- [ ] Upload using file picker button
- [ ] Verify file preview appears
- [ ] Send message with attachment
- [ ] Confirm file displays in message

### 3. Message Branching
- [ ] Click regenerate on an AI message
- [ ] Verify new variation is created
- [ ] Navigate between variations using arrows
- [ ] Confirm each variation is preserved

### 4. Feedback System
- [ ] Click thumbs up on a message
- [ ] Click thumbs down on a message
- [ ] Verify visual feedback
- [ ] Check feedback is sent to API

### 5. Document Sidebar
- [ ] Toggle sidebar visibility
- [ ] Search for documents
- [ ] Filter by document type
- [ ] Select documents for context

### 6. Continue Generating
- [ ] Find or create a long response
- [ ] Click "Continue generating"
- [ ] Verify response continues
- [ ] Check message updates properly

## Troubleshooting

### Common Issues and Solutions

#### 1. Authentication Errors
**Problem**: User not authenticated
**Solution**: Ensure Hub authentication is properly configured in `.env`:
```
NEXT_PUBLIC_HUB_URL=your-hub-url
HUB_SECRET=your-hub-secret
```

#### 2. Streaming Not Working
**Problem**: Messages appear all at once instead of streaming
**Solution**: Check that your API returns Server-Sent Events (SSE) format:
```javascript
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
});
```

#### 3. File Upload Fails
**Problem**: Files don't upload
**Solution**: 
- Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env`
- Verify storage bucket exists and has proper policies
- Check file size limits (default: 10MB)

#### 4. Message Branching Not Working
**Problem**: Can't create variations
**Solution**: Ensure the API endpoint handles parent_message_id:
```javascript
// In your regenerate endpoint
const newMessage = {
  ...messageData,
  parent_message_id: originalMessageId,
};
```

## Migration from Basic Chat

To migrate from the basic chat to enhanced chat:

1. **Update navigation links** in `components/Sidebar.jsx`:
```jsx
// Change from
<Link href="/chat">Chat</Link>
// To
<Link href="/enhanced-chat">Chat</Link>
```

2. **Copy chat data** (if needed):
```sql
-- Messages should work as-is with the enhanced structure
-- The system will build parent-child relationships automatically
```

3. **Update API responses** to include new fields:
```javascript
// Add to message objects
{
  message_id: uuid(),
  parent_message_id: previousMessageId || null,
  tool_calls: [],
  citations: [],
  thinking: null,
  // ... existing fields
}
```

## Performance Optimization

### 1. Message Rendering
- Uses React.memo for message components
- Implements virtual scrolling for long conversations
- Lazy loads file attachments

### 2. State Management
- Uses Map for O(1) message lookups
- Implements FIFO processing for streaming
- Debounces search operations

### 3. File Handling
- Client-side image compression before upload
- Progressive loading for large documents
- Caches processed documents

## Security Considerations

1. **File Upload Validation**
   - Validate file types on both client and server
   - Implement virus scanning for uploaded files
   - Enforce file size limits

2. **Message Sanitization**
   - Sanitize HTML in markdown rendering
   - Escape user input in search queries
   - Validate message IDs are UUIDs

3. **Authentication**
   - All endpoints require Hub authentication
   - Session validation on each request
   - Secure token handling

## Future Enhancements

Potential features to add:

1. **Voice Messages**: Record and transcribe audio
2. **Code Execution**: Run code snippets in sandbox
3. **Collaborative Chat**: Multiple users in same chat
4. **Export Options**: Download chat as PDF/Markdown
5. **Keyboard Shortcuts**: Quick actions via hotkeys
6. **Message Templates**: Save and reuse prompts
7. **Advanced Search**: Full-text search across all chats
8. **Analytics Dashboard**: Usage statistics and insights

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review error logs in browser console
3. Verify all required API endpoints are implemented
4. Ensure database migrations are up to date

## Conclusion

The enhanced chat integration brings powerful features from Onyx while maintaining your existing authentication and styling. All components are modular and can be customized further as needed.
