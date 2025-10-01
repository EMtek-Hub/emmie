# 🤖 Emmie - AI Chat Assistant System

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.0-black.svg)
![React](https://img.shields.io/badge/React-18.2-blue.svg)
![Status](https://img.shields.io/badge/status-production%20ready-green.svg)

Emmie is a sophisticated multi-agent AI chat assistant system built for enterprise departmental knowledge management and task automation. Features include OpenAI Assistant integration, document upload with RAG, AI image generation, and advanced tool management.

## 🎯 What is Emmie?

Emmie is an enterprise-grade AI chat assistant that provides:

- **🤖 Multi-Agent Chat**: Department-specific AI assistants (IT, HR, Engineering, Drafting, General)
- **🧠 OpenAI Responses API**: Unified endpoint with OpenAI Assistant fallback for specific agents
- **📄 Document Intelligence**: Upload documents for contextual Q&A using vector search
- **🎨 Image Generation**: AI-powered image creation with progressive streaming
- **🛠️ Tool Integration**: Custom tool execution and management system
- **🔐 Enterprise Auth**: EMtek Hub OAuth2/OIDC integration with Azure AD

## ✨ Key Features

### ✅ **Fully Operational Systems**
- **OpenAI Assistant Integration**: Thread persistence and streaming responses
- **Image Generation**: Centralized service with database storage
- **Document RAG**: Vector search with OpenAI embeddings
- **Tool Management**: Complete CRUD operations and agent assignment
- **Chat System**: Duplicate prevention, error handling, real-time streaming

### 🤖 **Multi-Agent System**
- **5 Specialized Agents**: Each optimized for specific departments
- **Smart Routing**: Automatic endpoint selection (OpenAI Assistant vs GPT-5)
- **Agent Switching**: Easy selection in chat interface
- **Persistent Memory**: Conversation continuity across sessions

### 📄 **Document Intelligence**
- **File Support**: PDF, DOCX, DOC, TXT, MD (10MB limit)
- **Smart Processing**: Automatic text extraction and chunking
- **Vector Search**: Semantic similarity matching
- **Contextual Answers**: RAG-powered responses using uploaded documents

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- OpenAI API key
- EMtek Hub access (production) or local development mode

### Installation

```bash
# Clone repository
git clone https://github.com/EMtek-Hub/emmie.git
cd emmie

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
```

### Environment Configuration

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

### Database Setup

```bash
# Apply all migrations
npx supabase migration up
```

### Start Development

```bash
# Start development server
npm run dev

# Visit http://localhost:3000
# Automatically redirects to /chat in local dev mode
```

## 🏗️ Architecture

### System Overview

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

### Unified API Architecture

```javascript
// Single /api/chat endpoint with intelligent routing
export default async function handler(req, res) {
  // Check if agent uses OpenAI Assistant
  if (agent.agent_mode === 'openai_assistant' && agent.openai_assistant_id) {
    return handleOpenAIAssistantChat(); // Thread persistence & streaming
  }
  
  // Default: OpenAI Responses API with full feature set
  const response = await openai.responses.create({
    model: selectedModel,
    instructions: systemPrompt,
    input: buildResponsesInput(userMessage, images),
    tools: availableTools,
    reasoning: { effort: reasoningEffort }
  });
}
```

## 📋 Available Agents

| Agent | Department | Capabilities | Backend |
|-------|------------|--------------|---------|
| **General Assistant** | General | All-purpose assistance | Responses API |
| **IT Support** | Technical | Technical troubleshooting | OpenAI Assistant |
| **HR Assistant** | Human Resources | HR policies and procedures | Responses API |
| **Engineering Support** | Engineering | Technical specifications | Responses API |
| **Drafting Assistant** | Design | Blueprint standards | OpenAI Assistant |

## 🛠️ Development Tools

### Testing & Verification

```bash
# Verify agent endpoints
node scripts/verify-agent-endpoints.js

# Monitor real-time usage
node scripts/monitor-agent-routing.js monitor

# Test image generation
node scripts/test-centralized-image-generation.js

# Clean up empty chats
node scripts/cleanup-empty-chats.js --dry-run
```

### Local Development Mode

For development without EMtek Hub:

```bash
# Enable local development with mock authentication
echo "LOCAL_DEV_MODE=true" >> .env.local
npm run dev
```

**Mock Session:**
- User: `developer@emtek.local`
- Groups: `['emmie-users', 'developers']`
- Full access to all features

## 🌐 Production Deployment

### Netlify Deployment

1. **Environment Variables** (set in Netlify dashboard):
   ```env
   HUB_URL=https://hub.emtek.au
   NEXT_PUBLIC_HUB_URL=https://hub.emtek.au
   NEXT_PUBLIC_TOOL_URL=https://your-domain.netlify.app
   TOOL_SLUG=emmie
   OPENAI_API_KEY=sk-...
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Build Configuration** (already configured in `netlify.toml`):
   ```toml
   [build]
     command = "npm ci && npm run build"
     publish = ".next"
   ```

3. **EMtek Hub Registration**:
   - Register tool in EMtek Hub admin panel
   - Configure callback URLs and Azure AD group mappings

## 📚 Documentation

### Complete Documentation

📖 **[EMMIE-SYSTEM-DOCUMENTATION.md](./EMMIE-SYSTEM-DOCUMENTATION.md)** - Comprehensive system documentation including:

- Complete architecture overview
- Agent management guide
- Image generation system
- Document upload & RAG
- Tool management
- Database schema
- API reference
- Troubleshooting guide
- Maintenance procedures

### Quick References

- **[LOCAL-DEVELOPMENT.md](./LOCAL-DEVELOPMENT.md)** - Local development setup
- **Agent Verification**: `node scripts/verify-agent-endpoints.js`
- **Real-time Monitoring**: `node scripts/monitor-agent-routing.js monitor`

## 🔧 Common Tasks

### Agent Management

```bash
# Check agent configurations
node scripts/verify-agent-endpoints.js

# Monitor which agents are being used
node scripts/monitor-agent-routing.js usage "24 hours"
```

### Image Generation

```bash
# Test image generation system
node scripts/test-centralized-image-generation.js

# Check recent image generations in database
SELECT model, content_md, attachments FROM messages 
WHERE message_type = 'image' 
ORDER BY created_at DESC LIMIT 5;
```

### Maintenance

```bash
# Clean up empty chats (recommended weekly)
node scripts/cleanup-empty-chats.js --dry-run
node scripts/cleanup-empty-chats.js

# Verify system health
node scripts/verify-agent-endpoints.js
```

## 🚨 Troubleshooting

### Quick Diagnostics

1. **Agent Issues**: `node scripts/verify-agent-endpoints.js`
2. **Image Generation**: `node scripts/test-centralized-image-generation.js`
3. **Chat Problems**: `node scripts/cleanup-empty-chats.js --dry-run`
4. **Authentication**: Set `LOCAL_DEV_MODE=true` for local testing

### Common Issues

- **OpenAI Assistant not working**: Check `openai_assistant_id` configuration
- **Images not saving**: Verify Supabase storage bucket permissions
- **Document upload fails**: Check file size (10MB limit) and OpenAI API access
- **Chat duplicates**: Run cleanup script: `node scripts/cleanup-empty-chats.js`

## 📞 Support

- **GitHub Issues**: Bug reports and feature requests
- **Complete Documentation**: [EMMIE-SYSTEM-DOCUMENTATION.md](./EMMIE-SYSTEM-DOCUMENTATION.md)
- **EMtek Hub**: Authentication and deployment issues
- **Testing Scripts**: Comprehensive diagnostics in `/scripts` directory

## 🔄 System Status

### ✅ Operational Systems
- Multi-agent chat with department specialization
- OpenAI Assistant integration with thread persistence
- Centralized image generation with progressive streaming
- Document upload with RAG-powered Q&A
- Tool management with agent assignment
- Duplicate chat prevention and error handling

### 📈 Recent Updates
- **January 9, 2025**: Complete OpenAI Assistant integration
- **January 9, 2025**: Centralized image generation service
- **January 9, 2025**: Fixed chat duplication issues
- **January 9, 2025**: Enhanced document processing pipeline

---

**Version**: 2.0.0  
**Status**: Production Ready ✅  
**Last Updated**: January 9, 2025

For complete system documentation, see [EMMIE-SYSTEM-DOCUMENTATION.md](./EMMIE-SYSTEM-DOCUMENTATION.md)
