# Multi-Agent Chat System Setup Guide

This guide explains how to set up and use the multi-agent chat system with document upload capabilities for departmental knowledge bases.

## Overview

The multi-agent chat system allows users to:
- Chat with different AI agents specialized for different departments (IT, HR, Engineering, Drafting, etc.)
- Upload documents to departmental knowledge bases
- Get contextually relevant responses based on uploaded documents
- Manage agents and documents through an admin interface

## Features

### ✅ Implemented Features

- **Multi-Agent Chat Interface**: Simple agent switcher at the bottom of chat
- **Department-Specific Agents**: Pre-configured agents for IT, HR, Engineering, Drafting, and General assistance
- **Document Upload System**: Support for PDF, DOCX, DOC, TXT, and MD files
- **Vector Search**: RAG (Retrieval Augmented Generation) using OpenAI embeddings
- **Settings Interface**: Admin panel for managing agents and documents
- **Document Processing**: Automatic text extraction and chunking
- **Agent Management**: Create, edit, and manage chat agents

### 🎯 Key Components

1. **Chat Interface** (`/chat`)
   - Agent selector with department-specific assistants
   - Real-time streaming responses
   - Document context integration

2. **Settings Interface** (`/settings`)
   - Agent management (create, edit, configure)
   - Document upload and management
   - Drag-and-drop file upload

3. **API Endpoints**
   - `/api/agents` - Agent CRUD operations
   - `/api/documents` - Document management
   - `/api/documents/upload` - File upload with processing
   - `/api/chat` - Enhanced chat with vector search

## Database Schema

The system adds several new tables:

### `chat_agents`
- Stores departmental chat agents
- Configurable system prompts and background instructions
- Color and icon theming
- Active/inactive status

### `documents`
- Stores uploaded document metadata
- Links documents to specific agents
- Processing status tracking

### `document_chunks`
- Stores text chunks with vector embeddings
- Enables semantic search across document content

## Setup Instructions

### 1. Install Dependencies

```bash
npm install formidable mammoth pdf-parse
npm install --save-dev @types/formidable
```

### 2. Apply Database Migrations

Run the following migrations in order:

```bash
# Apply the chat agents and documents schema
supabase migration up --file 0004_add_chat_agents_and_documents.sql

# Apply the vector search function
supabase migration up --file 0005_add_vector_search_function.sql
```

### 3. Configure Environment Variables

Ensure your `.env.local` has the OpenAI API key for embeddings:

```env
OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Verify Supabase Extensions

Make sure the `vector` extension is enabled in Supabase:

```sql
create extension if not exists vector;
```

## Usage Guide

### For End Users

1. **Access Chat Interface**
   - Navigate to `/chat`
   - Select the appropriate department agent at the bottom
   - Ask questions relevant to that department

2. **Agent Selection**
   - **General Assistant**: General purpose questions
   - **IT Support**: Technical issues, software problems
   - **HR Assistant**: HR policies, employee benefits
   - **Engineering Support**: Technical drawings, specifications
   - **Drafting Assistant**: Blueprint standards, design docs

### For Administrators

1. **Access Settings**
   - Click the settings icon in the chat sidebar
   - Navigate to `/settings`

2. **Manage Agents**
   - **Agents Tab**: View, create, and edit chat agents
   - Configure system prompts and background instructions
   - Set agent colors and icons
   - Enable/disable agents

3. **Upload Documents**
   - **Documents Tab**: Upload files for specific agents
   - Select the target agent before uploading
   - Drag-and-drop or click to upload files
   - Monitor processing status

## Document Processing Pipeline

1. **Upload**: Files are uploaded via the web interface
2. **Text Extraction**: Content is extracted based on file type
   - PDF: Uses `pdf-parse`
   - DOCX/DOC: Uses `mammoth`
   - TXT/MD: Direct text reading
3. **Chunking**: Text is split into ~500-word chunks
4. **Embedding**: Each chunk gets an OpenAI embedding vector
5. **Storage**: Chunks and embeddings are stored in the database

## Vector Search Process

When a user asks a question:

1. **Query Embedding**: User question is converted to a vector
2. **Similarity Search**: Database finds most relevant document chunks
3. **Context Building**: Relevant chunks are included in the chat context
4. **Response Generation**: AI generates response using both the question and relevant documents

## Customization Options

### Adding New Agents

```sql
INSERT INTO chat_agents (org_id, name, department, description, system_prompt, color, icon) 
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Sales Assistant', 
  'Sales', 
  'Sales processes and customer management',
  'You are Emmie, a sales assistant. Help with customer inquiries, sales processes, and CRM questions.',
  '#10b981',
  'dollar-sign'
);
```

### Configuring System Prompts

Each agent can have:
- **System Prompt**: Primary instruction defining the agent's role
- **Background Instructions**: Additional context or specialized knowledge

### File Type Support

Currently supported formats:
- PDF (`.pdf`)
- Microsoft Word (`.docx`, `.doc`) 
- Plain Text (`.txt`)
- Markdown (`.md`)

To add more formats, extend the upload handler in `/api/documents/upload.ts`.

## Troubleshooting

### Common Issues

1. **Upload Fails**
   - Check file size (10MB limit)
   - Verify file type is supported
   - Ensure agent is selected

2. **No Document Context in Responses**
   - Check if documents are marked as "ready"
   - Verify vector search function is installed
   - Check OpenAI API key configuration

3. **Vector Search Not Working**
   - Ensure `pgvector` extension is enabled
   - Verify the `match_document_chunks` function exists
   - Check embedding generation isn't failing

### Monitoring

- Check document processing status in the Documents tab
- Monitor server logs for upload/processing errors
- Verify embeddings are being generated (not null in database)

## Performance Considerations

- **Large Documents**: Automatically chunked for better processing
- **Vector Index**: Uses IVFFlat index for fast similarity search
- **Background Processing**: Document processing happens asynchronously
- **Embedding Costs**: OpenAI charges per token for embeddings

## Security Notes

- File uploads are validated for type and size
- Documents are organization-scoped
- Only authenticated users can upload/manage documents
- Agent access is controlled via active/inactive status

## Future Enhancements

Potential improvements:
- Support for more file types (Excel, PowerPoint, etc.)
- Advanced document management (versioning, categories)
- Agent-to-agent conversations
- Document summarization
- Usage analytics and reporting
