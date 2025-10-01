# 🤖 Emmie - AI Chat Assistant System

**Version**: 2.0.0  
**Last Updated**: January 9, 2025  
**Status**: Production Ready ✅

Emmie is a sophisticated multi-agent AI chat assistant system built with Next.js, featuring OpenAI Assistant integration, document upload capabilities with RAG (Retrieval Augmented Generation), image generation, and advanced tool management.

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Quick Start](#quick-start)
5. [Development Setup](#development-setup)
6. [Production Deployment](#production-deployment)
7. [Agent Management](#agent-management)
8. [Image Generation](#image-generation)
9. [Document Management & RAG](#document-management--rag)
10. [Tool Management](#tool-management)
11. [Database Schema](#database-schema)
12. [API Reference](#api-reference)
13. [Troubleshooting](#troubleshooting)
14. [Maintenance](#maintenance)

---

## 🎯 System Overview

Emmie is an enterprise-grade AI chat assistant system designed for departmental knowledge management and task automation. It provides:

- **Multi-Agent Chat**: Department-specific AI assistants (IT, HR, Engineering, Drafting, General)
- **Dual AI Backend**: OpenAI Assistant API + GPT-5 Responses API
- **Document Intelligence**: Upload documents for contextual Q&A using vector search
- **Image Generation**: AI-powered image creation with progressive streaming
- **Tool Integration**: Custom tool execution and management system
- **Enterprise Authentication**: Integration with EMtek Hub OAuth2/OIDC

### Current Operational Status
✅ **OpenAI Assistant Integration**: Fully operational with thread persistence  
✅ **Image Generation**: Centralized service with database storage  
✅ **Document Upload & RAG**: Vector search with OpenAI embeddings  
✅ **Tool Management**: Complete CRUD operations and agent assignment  
✅ **Chat System**: Duplicate prevention, error handling, streaming responses  

---

## 🏗️ Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Services      │
│                 │    │                 │    │                 │
│ • Next.js       │◄──►│ • API Routes    │◄──►│ • OpenAI API    │
│ • React         │    │ • Auth Middleware│    │ • Supabase      │
│ • Tailwind CSS  │    │ • Chat Handlers │    │ • Vector Store  │
│ • SSE Streaming │    │ • File Upload   │    │ • Storage       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### AI Backend Architecture

**Dual Endpoint System:**
- **OpenAI Assistant API**: For agents with `agent_mode='openai_assistant'`
- **GPT-5 Responses API**: For agents with `agent_mode='emmie'` (default)

**Request Routing:**
```javascript
if (agent.agent_mode === 'openai_assistant' && agent.openai_assistant_id) {
  // Use OpenAI Assistant with thread persistence
  return handleOpenAIAssistantChat();
} else {
  // Use GPT-5 with enhanced features (image gen, tools)
  return handleEmmieChat();
}
```

### Database Architecture

**Core Tables:**
- `chats` - Chat sessions with agent assignment
- `messages` - Chat messages with multimodal support
- `chat_agents` - Department-specific AI agents
- `documents` - Uploaded document metadata
- `document_chunks` - Text chunks with vector embeddings
- `tools` - Custom tool definitions
- `agent_tools` - Tool assignments to agents

---

## ✨ Features

### 🤖 Multi-Agent Chat System
- **5 Specialized Agents**: IT Support, HR Assistant, Engineering Support, Drafting Assistant, General Assistant
- **Agent Switching**: Easy agent selection at bottom of chat interface
- **Persistent Conversations**: Thread memory maintained across sessions
- **Real-time Streaming**: SSE-based message streaming with heartbeat

### 🎨 Image Generation
- **Progressive Streaming**: Real-time image generation with partial updates
- **Multiple Models**: Support for GPT-5 image models
- **Storage Integration**: Automatic Supabase storage with signed URLs
- **Database Persistence**: Images saved with metadata and accessibility

### 📄 Document Intelligence
- **File Upload**: PDF, DOCX, DOC, TXT, MD support
- **Text Extraction**: Automatic content extraction and chunking
- **Vector Search**: OpenAI embeddings with semantic similarity
- **Contextual Q&A**: RAG-powered responses using relevant document chunks

### 🛠️ Tool Management
- **Custom Tools**: Define and execute custom functionality
- **Agent Assignment**: Assign tools to specific agents
- **Execution Logging**: Complete audit trail of tool usage
- **Bulk Operations**: Manage multiple tool assignments

### 🔐 Authentication & Security
- **EMtek Hub Integration**: Centralized OAuth2/OIDC authentication
- **Session Management**: Secure HttpOnly cookies
- **Group-based Access**: Azure AD group mapping
- **Local Development**: Mock authentication for development

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- OpenAI API key
- EMtek Hub access (production) or local development mode

### Installation

1. **Clone and Install**
   ```bash
   git clone https://github.com/EMtek-Hub/emmie.git
   cd emmie
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```

3. **Configure Environment Variables**
   ```env
   # OpenAI Configuration
   OPENAI_API_KEY=sk-...
   
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Local Development (optional)
   LOCAL_DEV_MODE=true
   
   # Production (EMtek Hub Integration)
   HUB_URL=https://hub.emtek.au
   NEXT_PUBLIC_HUB_URL=https://hub.emtek.au
   NEXT_PUBLIC_TOOL_URL=https://your-domain.com
   TOOL_SLUG=emmie
   ```

4. **Database Setup**
   ```bash
   # Apply all migrations
   npx supabase migration up
   ```

5. **Start Development**
   ```bash
   npm run dev
   ```

6. **Access Application**
   - Local: http://localhost:3000
   - Automatically redirects to `/chat` in local dev mode

---

## 💻 Development Setup

### Local Development Mode

For development without EMtek Hub integration:

```bash
# Enable local development mode
echo "LOCAL_DEV_MODE=true" >> .env.local
npm run dev
```

**Mock User Session:**
- User ID: `dev-user-123`
- Email: `developer@emtek.local`
- Name: `Local Developer`
- Groups: `['emmie-users', 'developers']`

### Database Migrations

**Apply All Migrations:**
```bash
npx supabase migration up
```

**Key Migrations:**
- `0004_add_chat_agents_and_documents.sql` - Multi-agent and document system
- `0005_add_vector_search_function.sql` - Vector search functionality
- `0006_add_multimodal_support.sql` - Image and attachment support
- `0009_add_openai_assistant_support.sql` - OpenAI Assistant integration
- `0010_add_tool_management_system.sql` - Tool management
- `0011_add_thread_persistence.sql` - Thread persistence for OpenAI Assistants

### Testing

**Verify Agent Endpoints:**
```bash
node scripts/verify-agent-endpoints.js
```

**Monitor Real-time Usage:**
```bash
node scripts/monitor-agent-routing.js monitor
```

**Test Image Generation:**
```bash
node scripts/test-centralized-image-generation.js
```

**Clean Up Empty Chats:**
```bash
node scripts/cleanup-empty-chats.js --dry-run
node scripts/cleanup-empty-chats.js
```

---

## 🌐 Production Deployment

### Netlify Deployment

1. **Build Configuration** (netlify.toml already configured)
   ```toml
   [build]
     command = "npm ci && npm run build"
     publish = ".next"
   ```

2. **Environment Variables**
   ```env
   # Required Production Variables
   HUB_URL=https://hub.emtek.au
   NEXT_PUBLIC_HUB_URL=https://hub.emtek.au
   NEXT_PUBLIC_TOOL_URL=https://your-domain.netlify.app
   TOOL_SLUG=emmie
   OPENAI_API_KEY=sk-...
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. **EMtek Hub Registration**
   - Register tool in EMtek Hub admin panel
   - Configure callback URLs
   - Set up Azure AD group mappings

### Verification

**Production Checklist:**
- [ ] Build completes successfully
- [ ] Environment variables set correctly
- [ ] EMtek Hub authentication working
- [ ] Database migrations applied
- [ ] OpenAI API key valid
- [ ] Supabase connection working
- [ ] Image generation functional
- [ ] Document upload working

---

## 🤖 Agent Management

### Agent Configuration

**Database Structure:**
```sql
CREATE TABLE chat_agents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  department VARCHAR(100),
  description TEXT,
  system_prompt TEXT,
  background_instructions TEXT,
  agent_mode VARCHAR(50) DEFAULT 'emmie',
  openai_assistant_id VARCHAR(255),
  color VARCHAR(7) DEFAULT '#3b82f6',
  icon VARCHAR(50) DEFAULT 'message-circle',
  is_active BOOLEAN DEFAULT true
);
```

### Agent Modes

**Emmie Mode** (`agent_mode='emmie'`):
- Uses GPT-5 Responses API
- Supports image generation
- Full tool integration
- Advanced multimodal capabilities

**OpenAI Assistant Mode** (`agent_mode='openai_assistant'`):
- Uses OpenAI Assistant API
- Requires `openai_assistant_id`
- Thread-based persistence
- Background instructions support

### Adding New Agents

```sql
INSERT INTO chat_agents (
  name, department, description, system_prompt, 
  background_instructions, agent_mode, color, icon
) VALUES (
  'Sales Assistant', 'Sales', 
  'Sales processes and customer management',
  'You are Emmie, a sales assistant. Help with customer inquiries.',
  'Focus on CRM processes and sales methodology.',
  'emmie', '#10b981', 'dollar-sign'
);
```

### Agent Endpoint Verification

**Check Agent Configuration:**
```bash
node scripts/verify-agent-endpoints.js
```

**Expected Output:**
```
🤖 Agent: IT Support (Technical)
   Mode: openai_assistant
   Assistant ID: asst_abc123xyz
   🎯 STATUS: Using OpenAI Assistant
```

---

## 🎨 Image Generation

### Centralized Image Service

**Service Architecture:**
- **Location**: `lib/imageService.ts`
- **Pattern**: Async generator with progressive events
- **Storage**: Supabase `media` bucket with signed URLs
- **Database**: Automatic message storage with attachments

### Usage Example

```typescript
import { streamGeneratedImage } from '../lib/imageService';

for await (const event of streamGeneratedImage({
  prompt: "A blue cat sitting on a desk",
  model: "gpt-image-1",
  chatId: "chat-123"
})) {
  if (event.type === 'partial_image') {
    // Handle progressive image loading
  }
  if (event.type === 'saved') {
    // Handle final image with URL
  }
}
```

### Event Contract

```typescript
// Progressive image events
{ type: 'partial_image', b64_json: string, partial_image_index: number }

// Final image saved
{ type: 'saved', url: string, format: string, fileSize: number, storagePath: string }

// Error handling
{ type: 'error', error: string }

// Completion
{ type: 'done' }
```

### Integration Points

**Chat API** (`/api/chat.ts`):
- Detects image generation requests
- Streams progress via SSE
- Saves final images to database

**GPT-5 API** (`/api/chat-gpt5.ts`):
- Enhanced GPT-5 functionality
- Integrated image generation
- Consistent event streaming

**Dedicated Endpoint** (`/api/images/generate-stream.ts`):
- Direct image generation
- Same event contract
- SSE streaming support

---

## 📄 Document Management & RAG

### Document Upload System

**Supported Formats:**
- PDF (`.pdf`)
- Microsoft Word (`.docx`, `.doc`)
- Plain Text (`.txt`)
- Markdown (`.md`)

**Upload Process:**
1. **File Validation**: Type and size checking (10MB limit)
2. **Text Extraction**: Format-specific content extraction
3. **Chunking**: ~500-word chunks with overlap
4. **Embedding Generation**: OpenAI embeddings for each chunk
5. **Storage**: Chunks stored with vector embeddings

### Vector Search Integration

**Search Function:**
```sql
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 10,
  agent_id int DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  content text,
  similarity float
);
```

**Usage in Chat:**
1. User question → OpenAI embedding
2. Vector similarity search in database
3. Relevant chunks included in chat context
4. AI generates response using documents + question

### Document Management API

**Upload Document:**
```bash
POST /api/documents/upload
Content-Type: multipart/form-data

{
  "file": [FILE],
  "agentId": 123
}
```

**List Documents:**
```bash
GET /api/documents
```

**Delete Document:**
```bash
DELETE /api/documents/[id]
```

---

## 🛠️ Tool Management

### Tool System Architecture

**Database Schema:**
```sql
CREATE TABLE tools (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  function_definition JSONB,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE agent_tools (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER REFERENCES chat_agents(id),
  tool_id INTEGER REFERENCES tools(id),
  is_active BOOLEAN DEFAULT true
);
```

### Tool Execution

**Service**: `lib/toolExecution.ts`
- Handles tool calls from AI models
- Executes custom functions
- Logs tool usage for audit
- Returns results to chat stream

### Tool Management API

**Create Tool:**
```bash
POST /api/admin/tools
{
  "name": "Weather Check",
  "description": "Get current weather",
  "function_definition": {
    "name": "get_weather",
    "parameters": {
      "type": "object",
      "properties": {
        "location": {"type": "string"}
      }
    }
  }
}
```

**Assign Tool to Agent:**
```bash
POST /api/admin/agent-tools
{
  "agentId": 123,
  "toolId": 456
}
```

**Bulk Tool Assignment:**
```bash
POST /api/admin/agent-tools/bulk
{
  "agentId": 123,
  "toolIds": [456, 789, 012]
}
```

---

## 🗄️ Database Schema

### Core Tables

**Chats Table:**
```sql
CREATE TABLE chats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  agent_id INTEGER REFERENCES chat_agents(id),
  title TEXT,
  openai_thread_id TEXT, -- For OpenAI Assistant persistence
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Messages Table:**
```sql
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  chat_id TEXT REFERENCES chats(id),
  role TEXT NOT NULL, -- 'user' | 'assistant'
  content TEXT,
  content_md TEXT,
  message_type TEXT DEFAULT 'text', -- 'text' | 'image'
  attachments JSONB, -- For images and files
  model TEXT, -- e.g., 'gpt-5-mini', 'openai-assistant:asst_abc123'
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Chat Agents Table:**
```sql
CREATE TABLE chat_agents (
  id SERIAL PRIMARY KEY,
  org_id TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  department VARCHAR(100),
  description TEXT,
  system_prompt TEXT,
  background_instructions TEXT,
  agent_mode VARCHAR(50) DEFAULT 'emmie',
  openai_assistant_id VARCHAR(255),
  color VARCHAR(7) DEFAULT '#3b82f6',
  icon VARCHAR(50) DEFAULT 'message-circle',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Documents & Vector Storage:**
```sql
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  file_type VARCHAR(10),
  file_size INTEGER,
  agent_id INTEGER REFERENCES chat_agents(id),
  status VARCHAR(20) DEFAULT 'processing', -- 'processing' | 'ready' | 'error'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE document_chunks (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id),
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI embedding dimension
  chunk_index INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes

**Performance Optimization:**
```sql
-- Vector search index
CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Chat queries
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_agent_id ON chats(agent_id);
```

---

## 📡 API Reference

### Chat APIs

**Main Chat Endpoint:**
```
POST /api/chat
```
- Handles both OpenAI Assistant and GPT-5 routing
- Server-Sent Events (SSE) streaming
- Automatic agent detection and routing

**GPT-5 Enhanced Chat:**
```
POST /api/chat-gpt5
```
- GPT-5 specific functionality
- Image generation integration
- Tool execution support

### Agent APIs

**List Agents:**
```
GET /api/agents
```

**Get Agent by ID:**
```
GET /api/agents/[id]
```

**Admin Agent Management:**
```
POST /api/admin/agents    # Create
PUT /api/admin/agents     # Update
DELETE /api/admin/agents  # Delete
```

### Document APIs

**Upload Document:**
```
POST /api/documents/upload
```

**List Documents:**
```
GET /api/documents
```

**Document Details:**
```
GET /api/documents/[id]
```

### Image Generation APIs

**Stream Image Generation:**
```
POST /api/images/generate-stream
```

**Direct Image Generation:**
```
POST /api/images/generate
```

### Tool Management APIs

**Tool CRUD:**
```
GET /api/admin/tools       # List
POST /api/admin/tools      # Create
PUT /api/admin/tools       # Update
DELETE /api/admin/tools    # Delete
```

**Agent-Tool Assignment:**
```
GET /api/admin/agent-tools     # List assignments
POST /api/admin/agent-tools    # Assign tool
DELETE /api/admin/agent-tools  # Remove assignment
POST /api/admin/agent-tools/bulk # Bulk operations
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. OpenAI Assistant Not Working

**Symptoms:**
- Agent configured for OpenAI Assistant but using GPT-5
- Model shows `gpt-5-mini` instead of `openai-assistant:asst_xxx`

**Debug Steps:**
```bash
# Check agent configuration
node scripts/verify-agent-endpoints.js

# Check specific agent
SELECT agent_mode, openai_assistant_id FROM chat_agents WHERE id = [agent_id];
```

**Fixes:**
- Verify `openai_assistant_id` is set and valid
- Check OpenAI API key has assistant access
- Confirm assistant exists in OpenAI dashboard

#### 2. Image Generation Failing

**Symptoms:**
- Images not saving to database
- Empty `content_md` in messages
- Image generation errors

**Debug Steps:**
```bash
# Test image generation
node scripts/test-centralized-image-generation.js

# Check recent image generations
SELECT model, content_md, attachments FROM messages 
WHERE message_type = 'image' 
ORDER BY created_at DESC LIMIT 5;
```

**Fixes:**
- Verify OpenAI API key has image generation access
- Check Supabase storage bucket permissions
- Ensure `media` bucket exists

#### 3. Document Upload Issues

**Symptoms:**
- Upload fails with errors
- Documents not processed
- Vector search not working

**Debug Steps:**
```bash
# Check document processing
SELECT id, name, status FROM documents 
WHERE status != 'ready' 
ORDER BY created_at DESC;

# Check vector embeddings
SELECT COUNT(*) FROM document_chunks WHERE embedding IS NOT NULL;
```

**Fixes:**
- Verify file size under 10MB limit
- Check OpenAI API key for embeddings access
- Ensure `pgvector` extension enabled in Supabase

#### 4. Chat Duplication

**Symptoms:**
- Multiple blank chats created
- Empty chat sessions

**Solution:**
```bash
# Clean up empty chats
node scripts/cleanup-empty-chats.js --dry-run
node scripts/cleanup-empty-chats.js
```

#### 5. Authentication Issues

**Local Development:**
```bash
# Enable local dev mode
echo "LOCAL_DEV_MODE=true" >> .env.local
npm run dev
```

**Production:**
- Verify EMtek Hub configuration
- Check environment variables
- Confirm tool registration in Hub

### Monitoring & Diagnostics

**Real-time Agent Monitoring:**
```bash
node scripts/monitor-agent-routing.js monitor
```

**Agent Endpoint Verification:**
```bash
node scripts/verify-agent-endpoints.js
```

**Database Health Check:**
```bash
node scripts/diagnose-db.js
```

---

## 🔄 Maintenance

### Regular Tasks

**Weekly:**
- Clean up empty chats: `node scripts/cleanup-empty-chats.js`
- Verify agent endpoints: `node scripts/verify-agent-endpoints.js`
- Check error logs and performance

**Monthly:**
- Review and archive old conversations
- Update agent configurations as needed
- Monitor storage usage and costs

**Quarterly:**
- Review and update system documentation
- Evaluate new OpenAI features and integration opportunities
- Performance optimization review

### Updates & Migrations

**Before Deploying Updates:**
1. Run test suite: `npm test`
2. Verify build: `npm run build`
3. Test critical features locally
4. Check agent endpoint verification
5. Review environment variables

**Database Migrations:**
```bash
# Apply new migrations
npx supabase migration up

# Verify migration status
npx supabase migration list
```

### Backup & Recovery

**Supabase Backups:**
- Automatic daily backups enabled
- Manual backup before major changes
- Test restoration procedures quarterly

**Configuration Backup:**
- Agent configurations
- Tool definitions
- Environment variables
- API keys (secure storage)

---

## 📈 Performance Optimization

### Database Optimization

**Vector Search Performance:**
```sql
-- Monitor vector search performance
EXPLAIN ANALYZE SELECT * FROM match_document_chunks(
  '[0.1, 0.2, ...]'::vector, 0.78, 10, 123
);

-- Optimize vector index
REINDEX INDEX document_chunks_embedding_idx;
```

**Query Optimization:**
- Use appropriate indexes for frequent queries
- Monitor slow query logs
- Optimize chat history loading

### API Performance

**Caching Strategies:**
- Agent configurations (rarely change)
- Document metadata
- Tool definitions

**Rate Limiting:**
- Implement rate limiting for image generation
- Monitor OpenAI API usage and costs
- Set appropriate request timeouts

### Frontend Optimization

**Chat Interface:**
- Implement virtual scrolling for long conversations
- Optimize image loading with progressive enhancement
- Cache agent configurations client-side

---

## 🔮 Roadmap & Future Enhancements

### Short Term (Next Quarter)
- [ ] Enhanced tool discovery and suggestions
- [ ] Conversation templates and quick actions
- [ ] Advanced document categorization
- [ ] Usage analytics and reporting

### Medium Term (Next 6 Months)
- [ ] Multi-language support
- [ ] Voice input/output capabilities
- [ ] Advanced workflow automation
- [ ] Integration with more file types (Excel, PowerPoint)

### Long Term (Next Year)
- [ ] Agent-to-agent conversations
- [ ] Custom model fine-tuning
- [ ] Advanced security and compliance features
- [ ] Enterprise integrations (SharePoint, Teams, etc.)

---

## 📞 Support & Contact

### Development Support
- **GitHub Issues**: Create issues for bugs and feature requests
- **Documentation**: This file and inline code comments
- **Testing**: Comprehensive test scripts in `/scripts` directory

### Production Support
- **EMtek Hub**: Contact Hub administrators for authentication issues
- **Supabase**: Database and storage related issues
- **OpenAI**: API limits and model access issues

### Contributing
1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Update documentation
5. Submit pull request

---

**Last Updated**: January 9, 2025  
**Documentation Version**: 2.0.0  
**System Status**: ✅ Fully Operational
