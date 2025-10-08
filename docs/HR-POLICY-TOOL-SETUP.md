# HR Policy Tool Setup Guide

This guide shows you how to set up and use the `search_hr_policies` tool so your AI assistant can answer HR policy questions.

## What the Tool Does

The `search_hr_policies` tool:
- Searches through uploaded HR policy documents
- Uses AI-powered semantic search (vector embeddings)
- Returns relevant policy excerpts to answer user questions
- Works with any HR-related documents (PDFs, text files, etc.)

## Setup Steps

### Step 1: Upload HR Policy Documents

You need to upload your HR policy documents so the AI can search them. There are two ways:

#### Option A: Via API (Programmatic Upload)

Use the documents upload API endpoint:

```bash
# Upload a PDF
curl -X POST https://your-domain.com/api/documents/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@hr-policy-handbook.pdf" \
  -F "agentId=YOUR_AGENT_ID" \
  -F "category=hr_policies"

# Upload a text file
curl -X POST https://your-domain.com/api/documents/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@leave-policy.txt" \
  -F "agentId=YOUR_AGENT_ID" \
  -F "category=hr_policies"
```

#### Option B: Via Database (Direct Insert)

If you have documents already in your system:

```sql
-- Insert document record
INSERT INTO user_documents (
  user_id,
  agent_id,
  name,
  content,
  document_type,
  category
) VALUES (
  'system-user-id',
  'YOUR_AGENT_ID',
  'Employee Handbook 2025',
  'Full text content of your policy document here...',
  'text/plain',
  'hr_policies'
);

-- The system will automatically create embeddings for vector search
```

### Step 2: Enable Tool for HR Agent

#### Option A: Via SQL

```sql
-- Enable search_hr_policies for your HR agent
UPDATE chat_agents 
SET allowed_tools = array_append(allowed_tools, 'search_hr_policies')
WHERE id = 'YOUR_HR_AGENT_ID';

-- Or set all HR-related tools at once
UPDATE chat_agents 
SET allowed_tools = ARRAY[
  'search_hr_policies',
  'log_leave_request',
  'raise_ticket',
  'document_search'
]
WHERE id = 'YOUR_HR_AGENT_ID';
```

#### Option B: Via Settings UI

1. Open your chat interface
2. Click the Settings button (gear icon)
3. Select your HR agent
4. In the "Allowed Tools" section, add: `search_hr_policies`
5. Save changes

### Step 3: Verify Database Setup

The tool requires these database components:

```sql
-- Check if document tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_documents', 'document_chunks');

-- Check if vector search function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'match_document_chunks';
```

If missing, you need to run the document support migration:

```bash
# Run the document support migration
psql -d your_database < supabase/migrations/0007_add_user_folders_and_files.sql
```

### Step 4: Test the Tool

Once set up, test with these queries:

#### Test Query 1: General Policy
```
User: "What is the company's leave policy?"

Expected: AI uses search_hr_policies tool and returns policy details
```

#### Test Query 2: Specific Question
```
User: "How many sick days do employees get per year?"

Expected: AI searches policies and provides specific answer
```

#### Test Query 3: Complex Query
```
User: "What's the process for requesting parental leave?"

Expected: AI finds and explains the parental leave procedure
```

### Step 5: Monitor Logs

Check that it's working:

**Backend Terminal:**
```
🔧 Executing tool: search_hr_policies with args: { query: 'leave policy' }
HR policy search: Found 5 matching chunks
✅ Tool executed successfully: { resultLength: 1245 }
```

**Browser Console:**
```
🔧 Function result received: { name: 'search_hr_policies', status: 'completed' }
```

## Document Format Best Practices

### Organize Your Documents

Structure your HR documents for best search results:

```
hr-policies/
├── employee-handbook.pdf          # General policies
├── leave-policy.txt               # Leave and time off
├── benefits-guide.pdf             # Healthcare, retirement, etc.
├── code-of-conduct.pdf            # Workplace behavior
├── remote-work-policy.txt         # WFH guidelines
└── performance-review-process.pdf # Reviews and feedback
```

### Document Content Tips

**✅ Good Document Structure:**
```markdown
# Leave Policy

## Annual Leave
Employees are entitled to 20 days of paid annual leave per year.
Leave accrues at 1.67 days per month.

## Sick Leave
Employees receive 10 days of paid sick leave annually.
Medical certificate required for absences exceeding 2 consecutive days.

## Parental Leave
- Primary caregiver: 18 weeks paid leave
- Secondary caregiver: 2 weeks paid leave
- Must notify manager at least 4 weeks in advance
```

**❌ Poor Document Structure:**
```
Leave stuff: varies by employee type see manager
Sick days ask HR
```

### Chunk Size Considerations

Documents are automatically split into chunks for vector search:
- Recommended chunk size: 500-1000 words
- Too small: Loses context
- Too large: Less precise matches

## Troubleshooting

### Issue: "No HR policies found"

**Cause:** No documents uploaded or agent not configured

**Solution:**
```sql
-- Check if documents exist for this agent
SELECT id, name, category FROM user_documents 
WHERE agent_id = 'YOUR_AGENT_ID' 
AND category = 'hr_policies';

-- If empty, upload documents first
```

### Issue: Tool not being called

**Cause:** Tool not in agent's allowed_tools

**Solution:**
```sql
-- Check agent's allowed tools
SELECT allowed_tools FROM chat_agents 
WHERE id = 'YOUR_AGENT_ID';

-- Add tool if missing
UPDATE chat_agents 
SET allowed_tools = array_append(allowed_tools, 'search_hr_policies')
WHERE id = 'YOUR_AGENT_ID';
```

### Issue: Search returns irrelevant results

**Cause:** Poor quality embeddings or too low threshold

**Solution:**
1. Improve document quality (clearer headings, better structure)
2. Adjust match_threshold in the tool implementation (currently 0.7)
3. Upload more diverse policy documents

### Issue: "Agent ID required"

**Cause:** agentId not being passed in context

**Solution:**
```typescript
// Ensure agent is selected in chat
const toolContext: ToolContext = {
  agentId: selectedAgent?.id,  // Must be set
  userId: user.id,
  conversationId: chat_id
};
```

## Advanced Configuration

### Custom Search Thresholds

Edit `lib/tools.ts` to adjust search sensitivity:

```typescript
async function executeSearchHRPolicies(
  args: { query: string },
  context: ToolContext
): Promise<ToolResult> {
  // ...
  const { data: chunks } = await supabaseAdmin.rpc(
    'match_document_chunks', 
    {
      agent_id_param: context.agentId,
      query_embedding: queryEmbedding,
      match_threshold: 0.7,  // ← Change this (0.0-1.0)
      match_count: 5         // ← Number of results
    }
  );
  // ...
}
```

**Threshold Guide:**
- `0.8-1.0`: Very strict, exact matches only
- `0.7-0.8`: Balanced (recommended)
- `0.5-0.7`: More lenient, broader results
- `0.0-0.5`: Too loose, irrelevant results

### Category-Based Filtering

To search only specific categories:

```sql
-- Add category filter to document search
SELECT * FROM document_chunks 
WHERE agent_id = 'agent-id'
AND category = 'hr_policies'  -- ← Add this
AND embedding <-> query_embedding < threshold;
```

### Multi-Agent Setup

Different agents can access different HR documents:

```sql
-- HR Bot - full access
UPDATE chat_agents 
SET allowed_tools = ARRAY['search_hr_policies', 'log_leave_request']
WHERE name = 'HR Assistant';

-- Manager Bot - limited access
UPDATE chat_agents 
SET allowed_tools = ARRAY['search_hr_policies']
WHERE name = 'Manager Assistant';

-- General Bot - no HR access
UPDATE chat_agents 
SET allowed_tools = ARRAY['document_search']
WHERE name = 'General Assistant';
```

## Example Use Cases

### Use Case 1: Employee Self-Service

**Setup:**
- Upload all employee-facing policies
- Enable search_hr_policies and log_leave_request
- Train agent to be friendly and helpful

**Example Interaction:**
```
Employee: "I need to take 2 weeks off in June for vacation"
AI: [Uses search_hr_policies] "According to our leave policy, you're 
     entitled to 20 days annual leave. To request time off, I can help 
     you submit a leave request. Would you like me to do that?"
Employee: "Yes please"
AI: [Uses log_leave_request] "I've submitted your leave request..."
```

### Use Case 2: Manager Support

**Setup:**
- Upload performance review guidelines
- Upload management policies
- Enable search_hr_policies and document_search

**Example Interaction:**
```
Manager: "What's the process for conducting a performance review?"
AI: [Uses search_hr_policies] "Here's our performance review process:
     1. Schedule review meeting 2 weeks in advance
     2. Complete evaluation form
     3. Discuss with employee..."
```

### Use Case 3: HR Department

**Setup:**
- Upload all policies (internal and external)
- Enable all HR tools
- Higher search threshold for accuracy

**Example Interaction:**
```
HR: "What are the legal requirements for parental leave in our industry?"
AI: [Uses search_hr_policies] "According to our compliance documentation:
     - Fair Work Act requires minimum 12 weeks unpaid
     - Our policy provides 18 weeks paid for primary caregiver..."
```

## Maintenance

### Regular Updates

Keep policies current:

```sql
-- Update document content
UPDATE user_documents 
SET 
  content = 'Updated policy text...',
  updated_at = NOW()
WHERE name = 'Leave Policy 2025';

-- The system will automatically regenerate embeddings
```

### Monitor Usage

Track which policies are most searched:

```sql
-- Log tool usage (add to your analytics)
CREATE TABLE tool_usage_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_name TEXT,
  query TEXT,
  agent_id UUID,
  user_id TEXT,
  results_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Quality Checks

Periodically test common questions:

1. "What is our leave policy?"
2. "How do I request time off?"
3. "What benefits are available?"
4. "What is the dress code?"
5. "How does the performance review work?"

## Next Steps

1. ✅ Upload your HR policy documents
2. ✅ Enable tool for HR agent
3. ✅ Test with sample queries
4. ✅ Monitor logs and adjust threshold if needed
5. ✅ Train your team on how to ask questions
6. ✅ Set up regular document updates

---

**Need Help?**
- Check logs in browser console and backend terminal
- Review database setup with the SQL queries above
- Ensure documents are properly formatted and categorized
- Test with simple queries first before complex ones
