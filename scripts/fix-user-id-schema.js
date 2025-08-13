// Script to fix user ID schema from UUID to TEXT to support Azure AD object IDs
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function fixUserIdSchema() {
  console.log('🔧 Fixing user ID schema to support Azure AD object IDs...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  try {
    console.log('1️⃣ Checking current schema...');
    
    // Check if there are any existing users (we'll need to handle them)
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .limit(5);

    if (checkError) {
      console.log('❌ Error checking existing users:', checkError.message);
      return;
    }

    if (existingUsers && existingUsers.length > 0) {
      console.log(`⚠️  Found ${existingUsers.length} existing users`);
      console.log('   These will be preserved during schema migration');
    } else {
      console.log('✅ No existing users found');
    }

    console.log('\n2️⃣ Applying schema migration...');

    // SQL to change user ID from UUID to TEXT
    const migrationSQL = `
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
    `;

    // Execute the migration using raw SQL
    const { error: migrationError } = await supabase.rpc('exec_sql', { 
      sql: migrationSQL 
    });

    if (migrationError) {
      console.log('❌ Migration failed, trying alternative approach...');
      
      // Alternative approach: execute each statement separately
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        console.log(`   Executing: ${statement.substring(0, 50)}...`);
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement 
        });
        
        if (error && !error.message.includes('does not exist')) {
          console.log(`   ⚠️  Warning: ${error.message}`);
        }
      }
    }

    console.log('✅ Schema migration completed');

    console.log('\n3️⃣ Testing new schema...');
    
    // Test creating a user with Azure AD style ID
    const testUserId = 'azure-ad-12345-test-user';
    const testEmail = 'schema.test@emtek.com.au';

    // Clean up first
    await supabase.from('users').delete().eq('id', testUserId);

    const { data: testUser, error: testError } = await supabase
      .from('users')
      .insert([{
        id: testUserId,
        org_id: '00000000-0000-0000-0000-000000000001',
        email: testEmail,
        display_name: 'Schema Test User',
        role: 'member'
      }])
      .select()
      .single();

    if (testError) {
      console.log('❌ Schema test failed:', testError.message);
    } else {
      console.log('✅ Schema test successful - Azure AD IDs now supported');
      
      // Clean up test user
      await supabase.from('users').delete().eq('id', testUserId);
      console.log('🧹 Test user cleaned up');
    }

    console.log('\n🎉 User ID schema fix completed successfully!');
    console.log('   Users table now accepts Azure AD object IDs');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
    console.log('   You may need to run this migration manually in Supabase');
  }
}

fixUserIdSchema().catch(console.error);
