-- Chat Agents (Departmental expertise)
create table if not exists chat_agents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  name text not null,
  department text not null, -- IT, HR, Drafting, Engineering, etc.
  description text,
  system_prompt text not null,
  background_instructions text,
  color text default '#6366f1', -- For UI theming
  icon text default 'user', -- Lucide icon name
  is_active boolean default true,
  created_by uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Documents for RAG (Retrieval Augmented Generation)
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  agent_id uuid references chat_agents(id) on delete cascade,
  name text not null,
  original_filename text not null,
  file_size bigint not null,
  mime_type text not null,
  content_text text, -- Extracted text content
  status text check (status in ('processing','ready','failed')) default 'processing',
  upload_path text, -- Storage path for original file
  chunk_count integer default 0,
  uploaded_by uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Document chunks for vector search
create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(1536), -- OpenAI embedding dimension
  token_count integer,
  created_at timestamptz default now()
);

-- Chat agent assignments to chats
alter table chats add column if not exists agent_id uuid references chat_agents(id);

-- Indexes for performance
create index if not exists idx_chat_agents_org_active on chat_agents(org_id, is_active);
create index if not exists idx_documents_agent_status on documents(agent_id, status);
create index if not exists idx_document_chunks_document on document_chunks(document_id);
create index if not exists idx_document_chunks_embedding on document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists idx_chats_agent on chats(agent_id);

-- Update trigger for chat_agents
create trigger update_chat_agents_updated_at
    before update on chat_agents
    for each row execute procedure update_updated_at_column();

-- Update trigger for documents  
create trigger update_documents_updated_at
    before update on documents
    for each row execute procedure update_updated_at_column();

-- Create default chat agents for EMtek
insert into chat_agents (id, org_id, name, department, description, system_prompt, color, icon) values
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'General Assistant', 'General', 'General purpose AI assistant for any questions', 'You are Emmie, a helpful AI assistant. Keep answers concise and always use markdown formatting for better readability.', '#6366f1', 'sparkles'),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'IT Support', 'IT', 'Technical support and IT infrastructure questions', 'You are Emmie, an IT support specialist. Help with technical issues, software problems, network connectivity, and IT infrastructure. Always use markdown formatting and provide step-by-step solutions when possible.', '#059669', 'laptop'),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'HR Assistant', 'HR', 'Human resources, policies, and employee questions', 'You are Emmie, an HR assistant. Help with HR policies, employee benefits, leave requests, and workplace guidelines. Always use markdown formatting and maintain confidentiality.', '#dc2626', 'users'),
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Engineering Support', 'Engineering', 'Engineering drawings, CAD, and technical specifications', 'You are Emmie, an engineering assistant. Help with technical drawings, CAD files, engineering specifications, and design standards. Always use markdown formatting and reference relevant documentation.', '#ea580c', 'wrench'),
('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Drafting Assistant', 'Drafting', 'Technical drafting, blueprints, and design documentation', 'You are Emmie, a drafting specialist. Help with technical drawings, blueprint standards, drafting conventions, and design documentation. Always use markdown formatting and provide precise technical guidance.', '#7c3aed', 'ruler')
on conflict (id) do nothing;
