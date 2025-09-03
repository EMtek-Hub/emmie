-- Add OpenAI file ID support to user_files table
ALTER TABLE user_files 
ADD COLUMN openai_file_id TEXT NULL;

-- Add index for efficient lookups
CREATE INDEX idx_user_files_openai_file_id ON user_files(openai_file_id);

-- Add comments for documentation
COMMENT ON COLUMN user_files.openai_file_id IS 'OpenAI file ID for native Response API processing';

-- Add similar support to documents table for agent-specific documents
ALTER TABLE documents 
ADD COLUMN openai_file_id TEXT NULL;

CREATE INDEX idx_documents_openai_file_id ON documents(openai_file_id);
COMMENT ON COLUMN documents.openai_file_id IS 'OpenAI file ID for native Response API processing';
