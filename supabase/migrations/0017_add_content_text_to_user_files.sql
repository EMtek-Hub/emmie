-- Add content_text column to user_files table for storing extracted document text
-- This enables direct text-based search and AI context without relying on external APIs

ALTER TABLE user_files 
ADD COLUMN IF NOT EXISTS content_text TEXT;

-- Add index for text search performance
CREATE INDEX IF NOT EXISTS idx_user_files_content_text 
ON user_files USING gin(to_tsvector('english', content_text));

-- Add comment for documentation
COMMENT ON COLUMN user_files.content_text IS 'Extracted text content from PDF, DOCX, TXT, and other document types';
