-- User folders for organizing documents
create table if not exists user_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  org_id uuid not null references organisations(id) on delete cascade,
  name text not null,
  description text,
  parent_folder_id uuid references user_folders(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- User files for personal document management
create table if not exists user_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  org_id uuid not null references organisations(id) on delete cascade,
  folder_id uuid references user_folders(id) on delete set null,
  document_id uuid references documents(id) on delete cascade,
  name text not null,
  original_filename text not null,
  file_size bigint not null,
  mime_type text not null,
  file_type text check (file_type in ('document', 'image', 'spreadsheet', 'presentation', 'pdf', 'text', 'other')) default 'other',
  storage_path text not null,
  link_url text, -- For files created from links
  status text check (status in ('uploading', 'processing', 'indexed', 'failed')) default 'uploading',
  token_count integer,
  chat_file_type text check (chat_file_type in ('IMAGE', 'PLAIN_TEXT', 'PDF', 'DOCX', 'CSV')) default 'PLAIN_TEXT',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- File indexing status tracking
create table if not exists file_indexing_status (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references user_files(id) on delete cascade,
  status text check (status in ('pending', 'indexing', 'indexed', 'failed')) default 'pending',
  error_message text,
  indexed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Assistant folder assignments (which folders are available to which assistants/agents)
create table if not exists agent_folder_assignments (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references chat_agents(id) on delete cascade,
  folder_id uuid not null references user_folders(id) on delete cascade,
  created_at timestamptz default now(),
  unique(agent_id, folder_id)
);

-- Assistant file assignments (which files are available to which assistants/agents)
create table if not exists agent_file_assignments (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references chat_agents(id) on delete cascade,
  file_id uuid not null references user_files(id) on delete cascade,
  created_at timestamptz default now(),
  unique(agent_id, file_id)
);

-- Chat message file attachments
create table if not exists message_file_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  file_id uuid not null references user_files(id) on delete cascade,
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_user_folders_user on user_folders(user_id);
create index if not exists idx_user_folders_org on user_folders(org_id);
create index if not exists idx_user_folders_parent on user_folders(parent_folder_id);
create index if not exists idx_user_files_user on user_files(user_id);
create index if not exists idx_user_files_folder on user_files(folder_id);
create index if not exists idx_user_files_status on user_files(status);
create index if not exists idx_file_indexing_status_file on file_indexing_status(file_id);
create index if not exists idx_agent_folder_assignments_agent on agent_folder_assignments(agent_id);
create index if not exists idx_agent_file_assignments_agent on agent_file_assignments(agent_id);
create index if not exists idx_message_file_attachments_message on message_file_attachments(message_id);

-- Update triggers
create trigger update_user_folders_updated_at
    before update on user_folders
    for each row execute procedure update_updated_at_column();

create trigger update_user_files_updated_at
    before update on user_files
    for each row execute procedure update_updated_at_column();

create trigger update_file_indexing_status_updated_at
    before update on file_indexing_status
    for each row execute procedure update_updated_at_column();

-- Create default folders for existing users
insert into user_folders (user_id, org_id, name, description)
select distinct 
  u.id,
  u.org_id,
  'My Documents',
  'Default folder for personal documents'
from users u
where not exists (
  select 1 from user_folders f 
  where f.user_id = u.id and f.name = 'My Documents'
);
