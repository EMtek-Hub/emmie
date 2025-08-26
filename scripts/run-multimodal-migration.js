// scripts/run-multimodal-migration.js
// Script to apply the multimodal support migration to the database

const { createClient } = require('@supabase/supabase-js');

// Check for required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function runMigration() {
  console.log('🚀 Applying multimodal support migration...\n');

  try {
    // Check if columns already exist
    const { data: existingColumns, error: checkError } = await supabase
      .from('messages')
      .select('attachments, message_type')
      .limit(1);

    if (!checkError || checkError.code === 'PGRST204') {
      // Column doesn't exist, apply migration
      console.log('📝 Adding attachments and message_type columns...');
      
      const migrationSQL = `
        -- Add multimodal support to messages
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments JSONB;
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';

        -- Add index for message types and attachments
        CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
        CREATE INDEX IF NOT EXISTS idx_messages_attachments ON messages USING GIN(attachments);

        -- Add comments for documentation
        COMMENT ON COLUMN messages.attachments IS 'JSON array storing file/image metadata: [{type: "image", url: "signed-url", alt: "description", size: 1024}]';
        COMMENT ON COLUMN messages.message_type IS 'Type of message: text, image, file, generated_image, mixed';
      `;

      // Execute the migration using the service role key
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: migrationSQL
      }).single();

      if (error) {
        // Try alternative approach - direct database query
        console.log('⚠️  Direct RPC failed, trying alternative approach...');
        
        // Execute statements one by one
        const statements = [
          `ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments JSONB`,
          `ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text'`,
          `CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type)`,
          `CREATE INDEX IF NOT EXISTS idx_messages_attachments ON messages USING GIN(attachments)`
        ];

        for (const stmt of statements) {
          console.log(`Executing: ${stmt.substring(0, 50)}...`);
          
          // Note: This approach requires manual execution in Supabase Dashboard
          console.log(`⚠️  Please run this SQL manually in Supabase Dashboard SQL Editor:`);
          console.log(`\n${stmt};\n`);
        }
        
        console.log('\n📋 Manual Steps Required:');
        console.log('1. Go to your Supabase Dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Run the following SQL:');
        console.log('\n```sql');
        console.log(migrationSQL);
        console.log('```\n');
        
      } else {
        console.log('✅ Migration applied successfully!');
      }
    } else if (checkError.code !== 'PGRST204') {
      console.log('✅ Columns already exist, migration not needed');
    }

    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    const { data: testData, error: testError } = await supabase
      .from('messages')
      .select('id, attachments, message_type')
      .limit(1);

    if (!testError) {
      console.log('✅ Migration verified successfully!');
      console.log('   - attachments column: ✓');
      console.log('   - message_type column: ✓');
    } else if (testError.code === 'PGRST204') {
      console.log('⚠️  Migration needs to be applied manually (see instructions above)');
    } else {
      console.log('❌ Migration verification failed:', testError.message);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    
    console.log('\n📋 Manual Migration Instructions:');
    console.log('Since the automated migration failed, please:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and run the SQL from: supabase/migrations/0006_add_multimodal_support.sql');
  }
}

// Run the migration
runMigration();
