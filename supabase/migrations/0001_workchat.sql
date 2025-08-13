-- Extensions
create extension if not exists vector;

-- Organisations & users (mapped from Hub)
create table if not exists organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists users (
  id uuid primary key,
  org_id uuid not null references organisations(id) on delete cascade,
  email text not null unique,
  display_name text,
  role text check (role in ('admin','member')) default 'member',
  created_at timestamptz default now()
);

-- Projects & membership
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  name text not null,
  description text,
  status text default 'active',
  knowledge_summary_md text default '',
  last_summarised_at timestamptz,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

create table if not exists project_members (
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text check (role in ('owner','editor','viewer')) default 'viewer',
  added_at timestamptz default now(),
  primary key (project_id, user_id)
);

-- Facts & notes (promoted from chat)
create table if not exists project_facts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  kind text check (kind in ('decision','risk','deadline','owner','metric','assumption')) not null,
  label text not null,
  value text not null,
  owner text,
  date date,
  impact text,
  mitigation text,
  source_message_id uuid,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

create table if not exists project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  message_id uuid,
  note_md text not null,
  tags text[],
  created_by uuid references users(id),
  created_at timestamptz default now()
);

-- Chats & messages
create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  title text,
  mode text check (mode in ('normal','research')) default 'normal',
  created_by uuid references users(id),
  created_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats(id) on delete cascade,
  role text check (role in ('system','user','assistant','tool')) not null,
  content_md text not null,
  tokens_in int,
  tokens_out int,
  model text,
  created_at timestamptz default now()
);

create table if not exists message_artifacts (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  type text check (type in ('image','file','link')) not null,
  url text not null,
  meta jsonb,
  created_at timestamptz default now()
);

-- Files
create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  uploader_id uuid references users(id),
  name text not null,
  mime text,
  size bigint,
  storage_path text,
  tags text[],
  created_at timestamptz default now()
);

-- Model runs (image/file/research)
create table if not exists model_runs (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats(id) on delete cascade,
  parent_message_id uuid references messages(id) on delete set null,
  kind text check (kind in ('image_gen','file_gen','research')) not null,
  status text check (status in ('queued','running','succeeded','failed')) not null default 'queued',
  model text,
  params jsonb,
  result jsonb,
  error text,
  created_at timestamptz default now(),
  finished_at timestamptz
);

-- Embeddings (pgvector)
create table if not exists embeddings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  scope text check (scope in ('project','chat')) not null,
  ref_table text not null,
  ref_id uuid not null,
  chunk_index int not null,
  content text not null,
  embedding vector(1536) not null,
  meta jsonb,
  created_at timestamptz default now()
);
create index if not exists embeddings_vec_idx on embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 150);
create index if not exists embeddings_meta_idx on embeddings (org_id, project_id, scope, ref_table, ref_id);

-- Research logs
create table if not exists research_logs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references model_runs(id) on delete cascade,
  step int not null,
  action text not null,
  input jsonb,
  output jsonb,
  created_at timestamptz default now()
);

-- Create default EMtek organisation
insert into organisations (id, name) values ('00000000-0000-0000-0000-000000000001', 'EMtek')
on conflict (id) do nothing;
