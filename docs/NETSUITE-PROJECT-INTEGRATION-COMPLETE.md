# NetSuite Project Integration - Complete

## Overview
Successfully integrated NetSuite project selection into Emmie's project creation workflow. Users can now create Emmie projects by linking to their existing NetSuite projects.

## Implementation Summary

### ✅ **Components Created**

#### 1. **NetSuite Database Utility** (`lib/netsuiteDb.ts`)
- Separate Supabase client for NetSuite sync database
- Functions to query:
  - `getEmployeeByEmail(email)` - Find employee by email
  - `getEmployeeProjects(employeeId)` - Get all projects for employee
  - `getProjectById(projectId)` - Get single project details
  - `searchProjects(query, employeeId)` - Search projects

#### 2. **NetSuite API Endpoint** (`pages/api/netsuite/projects.ts`)
- `GET /api/netsuite/projects` - Fetch user's NetSuite projects
- `GET /api/netsuite/projects?search=query` - Search projects
- Authenticates user via EMtek Hub SSO
- Looks up employee by email (lowercase, trimmed)
- Returns formatted project list

#### 3. **New Project Modal** (`components/projects/NewProjectModal.jsx`)
- Two-tab interface:
  - **Link to NetSuite Project** (default)
  - **Create Custom Project**
- NetSuite tab features:
  - Live search across projects
  - Displays: Project name, company, number, dates
  - Selection interface with visual feedback
- Custom tab for manual project creation
- Creates project via `/api/projects` POST

#### 4. **Database Migration** (`supabase/migrations/0016_add_netsuite_project_linkage.sql`)
Adds NetSuite linkage to Emmie's projects table:
```sql
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS netsuite_project_id bigint;

CREATE INDEX IF NOT EXISTS idx_projects_netsuite_id 
ON projects(netsuite_project_id);
```

### ✅ **Environment Configuration**

Added to `.env.local`:
```env
# NetSuite Sync Database - Separate database for NetSuite integration
NETSUITE_SUPABASE_URL=https://suycnaclrbflnmvanqsd.supabase.co
NETSUITE_SUPABASE_SERVICE_KEY=eyJhbGci...
```

## Architecture

### **Two Database System**

1. **NetSuite Sync Database** (Read-Only)
   - URL: `https://suycnaclrbflnmvanqsd.supabase.co`
   - Tables: `ns_employees`, `ns_projects`, `ns_project_resources`
   - Synced from NetSuite - NEVER write to this database

2. **Emmie Database** (Main Application)
   - URL: `https://shpagletfskkrcuaqqed.supabase.co`
   - Tables: `projects`, `chats`, `messages`, etc.
   - Stores Emmie-specific data + NetSuite references

### **Data Flow**

```
User Email (from session)
  ↓
ns_employees (lookup by email)
  ↓
ns_project_resources (get assigned projects)
  ↓
ns_projects (get project details)
  ↓
Display in modal for selection
  ↓
Create Emmie project with netsuite_project_id reference
```

### **Project Schema**

Emmie `projects` table:
```sql
- id: uuid (Emmie-generated primary key)
- name: text
- description: text
- status: text
- netsuite_project_id: bigint (references ns_projects.id)
- org_id: uuid
- created_by: text
- created_at: timestamp
```

## User Experience

### **Creating a NetSuite-Linked Project:**

1. User navigates to Projects view in `/chat`
2. Clicks "New Project" button
3. Modal opens with "Link to NetSuite Project" tab selected
4. System automatically:
   - Fetches user's email from session
   - Looks up employee in `ns_employees`
   - Gets assigned projects from `ns_project_resources`
   - Displays projects with details
5. User can:
   - Search projects by name, company, or number
   - Click to select a project
   - Click "Create Project" to link
6. Emmie creates project with:
   - Name from NetSuite
   - Description with NetSuite context
   - `netsuite_project_id` storing the link
7. Project appears in projects list

### **Creating a Custom Project:**

1. Click "Create Custom Project" tab
2. Enter name and optional description
3. Click "Create Project"
4. Project created without NetSuite linkage

## Installation Steps

### 1. **Apply Database Migration**

The migration is ready but needs to be applied to your Emmie database. You have two options:

**Option A: Using Supabase Dashboard**
1. Go to https://supabase.com/dashboard/project/shpagletfskkrcuaqqed
2. Navigate to SQL Editor
3. Run this SQL:
```sql
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS netsuite_project_id bigint;

CREATE INDEX IF NOT EXISTS idx_projects_netsuite_id 
ON projects(netsuite_project_id);

COMMENT ON COLUMN projects.netsuite_project_id IS 'Link to NetSuite project ID from ns_projects table';
```

**Option B: Using Supabase CLI** (if installed)
```bash
npx supabase db push
```

### 2. **Restart Development Server**

After applying the migration:
```bash
npm run dev
```

## Testing Checklist

- [ ] Open `/chat` in browser
- [ ] Toggle to "Projects" view
- [ ] Click "New Project" button
- [ ] Verify modal opens with two tabs
- [ ] Verify "Link to NetSuite Project" tab shows your projects
- [ ] Search for a project
- [ ] Select a project
- [ ] Click "Create Project"
- [ ] Verify project appears in projects list
- [ ] Try "Create Custom Project" tab
- [ ] Verify both creation methods work

## Benefits

✅ **Automated Data Entry** - Project info pre-populated from NetSuite
✅ **Single Source of Truth** - NetSuite remains authoritative
✅ **Context-Aware AI** - Emmie can reference NetSuite project data
✅ **Flexible Creation** - Support both NetSuite and custom projects
✅ **User-Specific** - Only shows projects assigned to user

## Future Enhancements

### Phase 1: Real-Time Sync
- [ ] Sync NetSuite project updates to Emmie
- [ ] Show NetSuite status in project cards
- [ ] Display project timeline from NetSuite

### Phase 2: Team Integration
- [ ] Pull team members from `ns_project_resources`
- [ ] Show resource allocations
- [ ] Display roles and hours

### Phase 3: AI Integration
- [ ] AI can query NetSuite data during chats
- [ ] Provide project insights (budget, timeline, completion %)
- [ ] Generate reports from NetSuite data

## Technical Notes

- **Read-Only NetSuite Access**: The integration only reads from NetSuite, never writes
- **Separate Credentials**: Each database has its own Supabase credentials
- **Error Handling**: Graceful fallbacks if NetSuite data unavailable
- **Email Matching**: Uses lowercase + trim for reliable employee lookup
- **Security**: User can only see projects they're assigned to

## Files Modified/Created

**New Files:**
- `lib/netsuiteDb.ts`
- `pages/api/netsuite/projects.ts`
- `components/projects/NewProjectModal.jsx`
- `supabase/migrations/0016_add_netsuite_project_linkage.sql`
- `docs/NETSUITE-PROJECT-INTEGRATION-COMPLETE.md`

**Modified Files:**
- `.env.local` - Added NetSuite credentials
- `components/projects/ProjectsMainContent.jsx` - Integrated modal

## Conclusion

The NetSuite integration is complete and ready to use! Users can now seamlessly create Emmie projects from their NetSuite assignments, bringing enterprise project data into Emmie's AI-powered workspace.
