# Chat Feature Deployment Guide

This document outlines the steps to deploy the new project chat functionality safely.

## ✅ Pre-Deployment Checklist

### 1. Database Migration
- [ ] Apply migration `0003_add_chat_updated_at.sql`
- [ ] Verify migration runs without errors
- [ ] Check that `updated_at` field is added to `chats` table

### 2. Schema Verification
The APIs now correctly use your existing schema:
- ✅ `chats.created_by` (not `user_id`)
- ✅ `messages` table (not `chat_messages`)
- ✅ `messages.content_md` field (not `content`)
- ✅ Proper foreign key relationships

### 3. API Endpoints Added
- ✅ `/api/projects/[id].ts` - Get individual project details
- ✅ `/api/projects/[id]/ask.ts` - Updated for schema compatibility
- ✅ `/api/projects/[id]/chats.ts` - List project chats  
- ✅ `/api/projects/[id]/chats/[chatId]/messages.ts` - Get chat messages

### 4. Features Implemented
- ✅ **Persistent Chat Conversations** - All messages saved to database
- ✅ **Chat History Loading** - Previous conversations restored on page load
- ✅ **Project-Specific Context** - AI has access to project facts, notes, and knowledge
- ✅ **Graceful Fallbacks** - Welcome message if no chat history exists
- ✅ **Error Handling** - Proper error responses and user feedback

## 🚀 Deployment Steps

### Step 1: Apply Migration
```bash
# Apply the new migration
supabase db push

# Or manually run the migration SQL
```

### Step 2: Set Up Dev User (Optional)
```bash
# Create test user and project for development
node scripts/setup-dev-user.js
```

### Step 3: Deploy Application
```bash
# Your regular deployment process
npm run build
# Deploy to your hosting platform
```

### Step 4: Verify Functionality
1. **Project Loading**: Navigate to `/projects/[id]` - should load without errors
2. **Chat Interface**: Click "Start Chat" or navigate to Chat tab
3. **Message Persistence**: Send a message, refresh page, verify it's restored
4. **Project Context**: Ask questions about the project - AI should reference project data

## 🔧 Troubleshooting

### Common Issues & Solutions

**"Project not found" error:**
- User needs to be a member of the project via `project_members` table
- Run dev setup script to create test data

**Chat not saving:**
- Check Supabase logs for insertion errors
- Verify `updated_at` trigger is working
- Check API authentication

**Messages not loading:**
- Verify chat history API returns correct field names (`content_md`)
- Check console for JavaScript errors

### Database Verification Queries

```sql
-- Check if migration applied
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'chats' AND column_name = 'updated_at';

-- Check dev user setup
SELECT * FROM users WHERE email = 'dev@emtek.au';

-- Check test project
SELECT p.name, pm.role FROM projects p 
JOIN project_members pm ON p.id = pm.project_id 
WHERE p.name = 'Test Project';
```

## 📋 Testing Checklist

### Manual Testing
- [ ] Load project page without errors
- [ ] Send chat message and get AI response
- [ ] Refresh page - previous messages visible
- [ ] AI references project facts in responses
- [ ] Multiple projects maintain separate chat histories
- [ ] Graceful handling when no chat history exists

### API Testing
```bash
# Test project endpoint
curl -X GET "/api/projects/[project-id]"

# Test chat history
curl -X GET "/api/projects/[project-id]/chats"

# Test sending message
curl -X POST "/api/projects/[project-id]/ask" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

## ⚡ Performance Considerations

- Chat history is limited to 50 recent sessions
- Messages are loaded in chronological order
- Consider pagination for large chat histories in future
- Database indexes on `project_id` and `created_at` for efficient queries

## 🔒 Security Notes

- All endpoints require authentication via `requireApiPermission`
- Project access verified via `project_members` table
- User data synced with `ensureUser` function
- Organization isolation via `EMTEK_ORG_ID`

## 📈 Monitoring

After deployment, monitor:
- Chat message creation success rates
- API response times for chat endpoints
- Database query performance
- User engagement with chat features

## 🎯 Future Enhancements

Ready for future development:
- Chat session management (continuing conversations)
- Message search and filtering
- Export chat transcripts
- Team shared conversations
- File attachments in chat
- Voice message support

---

**Deployment Status**: ✅ Ready for production
**Safe to Deploy**: ✅ Yes - All changes are backward compatible
**Breaking Changes**: ❌ None
