# WorkChat Integration Setup Guide

This guide walks you through setting up the WorkChat AI-powered project collaboration system in your EMtek Hub tool template.

## Overview

WorkChat adds:
- **AI-powered project chats** with OpenAI integration
- **Automatic knowledge extraction** from conversations (decisions, risks, deadlines)
- **"Ask the Project"** feature for instant answers using RAG
- **Structured project management** with facts, notes, and metrics
- **Supabase backend** for data persistence and vector embeddings

## Prerequisites

1. **Supabase Project**: Create a new Supabase project at [supabase.com](https://supabase.com)
2. **OpenAI API Key**: Get your API key from [OpenAI Platform](https://platform.openai.com)
3. **EMtek Hub**: Existing EMtek Hub authentication setup (already configured in this template)

## Setup Steps

### 1. Install Dependencies

Dependencies have been added to `package.json`. Install them:

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and configure:

```env
# EMtek Hub Integration (already configured)
HUB_URL=https://hub.emtek.au
TOOL_ORIGIN=https://your-tool-domain.emtek.com.au
TOOL_SLUG=your-tool-slug

# Tool Configuration
NEXT_PUBLIC_TOOL_NAME=WorkChat Projects
NEXT_PUBLIC_TOOL_DESCRIPTION=AI-powered project collaboration

# Supabase Integration - Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI Integration - Required  
OPENAI_API_KEY=sk-your-openai-api-key

# App Configuration
APP_BASE_URL=https://your-tool-domain.emtek.com.au
```

### 3. Database Setup

#### Enable pgvector Extension

In your Supabase SQL Editor, run:

```sql
create extension if not exists vector;
```

#### Run Migration

Copy the contents of `supabase/migrations/0001_workchat.sql` and run it in your Supabase SQL Editor. This creates:

- Organizations, users, projects tables
- Chat and message tables  
- Project facts and notes for knowledge extraction
- Embeddings table for future RAG features
- Model runs for AI operations

### 4. Supabase Configuration

#### Service Role Key
1. Go to **Settings > API** in your Supabase dashboard
2. Copy the **Service Role** key (not the anon key)
3. Add it to your `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`

#### Row Level Security (Optional)
The current setup uses server-side permission checks. You can optionally enable RLS policies for additional security.

### 5. OpenAI Setup

1. Create an account at [OpenAI Platform](https://platform.openai.com)
2. Generate an API key
3. Add it to `.env.local` as `OPENAI_API_KEY`

**Model Configuration:**
- Default chat model: `gpt-4` (configurable in `lib/ai.ts`)
- Embedding model: `text-embedding-3-small`

### 6. Test the Integration

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Create a test project:**
   - Navigate to `/projects`
   - Click "New Project"
   - Fill in project details

3. **Test AI chat:**
   - Open your project
   - Start a chat conversation
   - Discuss project decisions, risks, or deadlines
   - Check that knowledge is automatically extracted

4. **Test "Ask the Project":**
   - Use the "Ask" feature to query your project
   - Verify it returns relevant information

## File Structure

### Core Files Added

```
lib/
├── db.ts              # Supabase admin client & helpers
├── ai.ts              # OpenAI client & utilities  
├── markdown.ts        # Markdown rendering utilities

pages/api/
├── projects/
│   ├── index.ts       # GET/POST projects
│   └── [id]/ask.ts    # "Ask the Project" endpoint
├── chat.ts            # Streaming chat with OpenAI
└── project-knowledge/
    ├── extract.ts     # Extract knowledge from chat
    └── commit.ts      # Save extracted knowledge

pages/projects/
├── index.js           # Projects list page
├── new.js             # Create project page
└── [id]/              # Project pages (to be added)

supabase/migrations/
└── 0001_workchat.sql  # Database schema
```

## Security & Permissions

### Authentication Flow
1. **Page Protection**: All pages use `requireHubAuth()`
2. **API Protection**: All API routes use `requireApiPermission()`  
3. **Data Isolation**: All queries filtered by EMtek org ID
4. **Server-only**: Supabase access restricted to server-side only

### User Mapping
- Hub `session.user.id` → Supabase `users.id`
- Hub `session.user.email` → Supabase `users.email`
- Hard-coded EMtek org ID: `00000000-0000-0000-0000-000000000001`

## Usage Guide

### Creating Projects
1. Navigate to `/projects`
2. Click "New Project"
3. Provide name and description
4. System automatically creates project and assigns you as owner

### AI Chat
1. Open a project
2. Start a chat conversation  
3. Discuss project topics naturally
4. AI automatically extracts:
   - **Decisions**: Key choices made
   - **Risks**: Potential issues identified
   - **Deadlines**: Important dates
   - **Owners**: Responsibility assignments
   - **Metrics**: Measurable outcomes

### Ask the Project
1. Use the "Ask" feature in any project
2. Natural language questions like:
   - "What are our main risks?"
   - "Who owns the frontend development?"
   - "What decisions have we made about the database?"
3. AI provides answers based on extracted knowledge

## Customization Options

### AI Models
Edit `lib/ai.ts` to change:
- Chat model (default: `gpt-4`)
- Embedding model (default: `text-embedding-3-small`)
- Temperature and other parameters

### Knowledge Extraction
Modify the prompt in `pages/api/project-knowledge/extract.ts` to:
- Extract different types of facts
- Change extraction criteria
- Adjust JSON structure

### UI Styling
All pages use existing EMtek Hub styling patterns:
- CSS variables for colors
- Consistent card layouts
- Sidebar navigation

## Troubleshooting

### Common Issues

**Supabase Connection Failed**
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check `SUPABASE_SERVICE_ROLE_KEY` is the service role key, not anon key

**OpenAI API Errors**
- Verify `OPENAI_API_KEY` is valid and has sufficient credits
- Check model availability (gpt-4 requires API access)

**Knowledge Extraction Not Working**
- Ensure `APP_BASE_URL` is set correctly
- Check browser network tab for failed requests
- Verify the extract/commit API endpoints are accessible

**Database Errors**
- Confirm the migration ran successfully
- Check Supabase logs for detailed error messages
- Verify EMtek organization exists in the database

### Development Tips

1. **Check Supabase Logs**: Use the Supabase dashboard logs for database debugging
2. **Monitor API Calls**: Use browser dev tools to inspect API requests
3. **Test Incrementally**: Start with project creation, then chat, then knowledge extraction

## Next Steps

### Phase 3 - Additional Features (Optional)

1. **Project Overview Pages**: Create `/projects/[id]/index.js`
2. **Real-time Chat**: Add WebSocket support for live chat
3. **File Uploads**: Implement file management and embedding
4. **RAG Enhancement**: Add vector similarity search to "Ask the Project"
5. **Project Analytics**: Dashboard with metrics and insights

### Production Deployment

1. **Environment Variables**: Set production values in your deployment platform
2. **Database Scaling**: Consider Supabase Pro for higher usage
3. **OpenAI Rate Limits**: Monitor usage and implement rate limiting if needed
4. **Monitoring**: Add logging and error tracking

## Support

For EMtek Hub integration issues, contact the Hub team.
For WorkChat-specific questions, refer to the code comments and this documentation.
