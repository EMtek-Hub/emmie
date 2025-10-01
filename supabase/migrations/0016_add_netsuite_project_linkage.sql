-- Add NetSuite project linkage to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS netsuite_project_id bigint;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_netsuite_id 
ON projects(netsuite_project_id);

-- Add comment
COMMENT ON COLUMN projects.netsuite_project_id IS 'Link to NetSuite project ID from ns_projects table';
