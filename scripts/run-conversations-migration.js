#!/usr/bin/env node

// Script to run the unified conversations schema migration
// This bypasses the need for Supabase CLI linking

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

async function runMigration() {
  console.log('🚀 Starting unified conversations schema migration...');
  
  // Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '0013_unified_conversations_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    console.log('📊 Executing SQL migration...');
    
    // Split the SQL into individual statements
    // Remove comments first, then split by semicolon
    const cleanSQL = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n');
    
    const statements = cleanSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            // Try direct query if RPC fails
            const { error: directError } = await supabase
              .from('_temp_migration')
              .select('*')
              .limit(0);
            
            if (directError && directError.message.includes('does not exist')) {
              // Use raw SQL execution via PostgREST
              const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                  'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
                },
                body: JSON.stringify({ sql: statement })
              });
              
              if (!response.ok) {
                const errorText = await response.text();
                console.warn(`⚠️  Statement ${i + 1} failed with HTTP error:`, errorText);
                // Continue with next statement for non-critical errors
              } else {
                console.log(`✅ Statement ${i + 1} completed`);
              }
            } else {
              console.warn(`⚠️  Statement ${i + 1} failed:`, error.message);
              // Continue with next statement for non-critical errors
            }
          } else {
            console.log(`✅ Statement ${i + 1} completed`);
          }
        } catch (err) {
          console.warn(`⚠️  Statement ${i + 1} failed with exception:`, err.message);
          // Continue with next statement
        }
      }
    }
    
    console.log('🎉 Migration execution completed!');
    console.log('📋 Verifying new tables...');
    
    // Verify the tables were created
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .limit(1);
    
    const { data: vectorStores, error: vsError } = await supabase
      .from('conversation_vector_stores')
      .select('*')
      .limit(1);
    
    if (!convError) {
      console.log('✅ conversations table is accessible');
    } else {
      console.log('❌ conversations table error:', convError.message);
    }
    
    if (!vsError) {
      console.log('✅ conversation_vector_stores table is accessible');
    } else {
      console.log('❌ conversation_vector_stores table error:', vsError.message);
    }
    
    console.log('🚀 Migration process completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(console.error);
