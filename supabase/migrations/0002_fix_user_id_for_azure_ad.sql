-- Fix user ID schema to support Azure AD object IDs
-- This migration changes user IDs from UUID to TEXT to support Azure AD object IDs

-- Step 1: Drop foreign key constraints that reference users.id
ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_user_id_fkey;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_created_by_fkey;
ALTER TABLE project_facts DROP CONSTRAINT IF EXISTS project_facts_created_by_fkey;
ALTER TABLE project_notes DROP CONSTRAINT IF EXISTS project_notes_created_by_fkey;
ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_created_by_fkey;
ALTER TABLE files DROP CONSTRAINT IF EXISTS files_uploader_id_fkey;

-- Step 2: Change the users.id column type from UUID to TEXT
ALTER TABLE users ALTER COLUMN id TYPE TEXT;

-- Step 3: Change all referencing columns to TEXT
ALTER TABLE project_members ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE projects ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE project_facts ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE project_notes ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE chats ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE files ALTER COLUMN uploader_id TYPE TEXT;

-- Step 4: Recreate the foreign key constraints
ALTER TABLE project_members ADD CONSTRAINT project_members_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE projects ADD CONSTRAINT projects_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE project_facts ADD CONSTRAINT project_facts_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE project_notes ADD CONSTRAINT project_notes_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE chats ADD CONSTRAINT chats_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE files ADD CONSTRAINT files_uploader_id_fkey 
  FOREIGN KEY (uploader_id) REFERENCES users(id);
