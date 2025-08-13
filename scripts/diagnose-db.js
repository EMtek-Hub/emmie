// Diagnostic script to check Supabase database schema and fix user sync issues
const { createClient } = require('@supabase/supabase-js');

async function diagnoseDatabaseIssue() {
  console.log('🔍 Diagnosing Supabase database schema...\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  console.log('✅ Environment variables present');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);

  // Create Supabase client
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  try {
    // Test basic connection
    console.log('\n🔗 Testing database connection...');
    const { data, error } = await supabase.from('organisations').select('count').limit(1);
    
    if (error) {
      if (error.message.includes('relation "organisations" does not exist')) {
        console.log('❌ WorkChat schema not applied - organisations table missing');
        console.log('\n🛠️  Need to apply WorkChat migration');
        return { needsMigration: true, error: 'Missing WorkChat schema' };
      } else {
        console.log('❌ Database connection failed:', error.message);
        return { needsMigration: false, error: error.message };
      }
    }

    console.log('✅ Database connection successful');

    // Check if EMtek organization exists
    console.log('\n🏢 Checking EMtek organization...');
    const { data: orgData, error: orgError } = await supabase
      .from('organisations')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    if (orgError) {
      if (orgError.code === 'PGRST116') {
        console.log('❌ EMtek organization missing');
        return { needsMigration: false, error: 'Missing EMtek organization' };
      } else {
        console.log('❌ Error checking organization:', orgError.message);
        return { needsMigration: false, error: orgError.message };
      }
    }

    console.log('✅ EMtek organization exists:', orgData.name);

    // Check users table schema
    console.log('\n👤 Checking users table schema...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (userError) {
      console.log('❌ Users table error:', userError.message);
      return { needsMigration: false, error: userError.message };
    }

    console.log('✅ Users table accessible');

    // Test user creation
    console.log('\n🧪 Testing user creation...');
    const testUserId = '12345678-1234-1234-1234-123456789012';
    const testEmail = 'test@emtek.com.au';

    // First try to delete test user if exists
    await supabase.from('users').delete().eq('id', testUserId);

    // Try to create test user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{
        id: testUserId,
        org_id: '00000000-0000-0000-0000-000000000001',
        email: testEmail,
        display_name: 'Test User',
        role: 'member'
      }])
      .select()
      .single();

    if (createError) {
      console.log('❌ User creation failed:', createError.message);
      return { needsMigration: false, error: createError.message };
    }

    console.log('✅ User creation successful');

    // Clean up test user
    await supabase.from('users').delete().eq('id', testUserId);
    console.log('✅ Test user cleaned up');

    console.log('\n🎉 Database schema is correct and working!');
    return { needsMigration: false, error: null };

  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
    return { needsMigration: false, error: err.message };
  }
}

// Run diagnosis if called directly
if (require.main === module) {
  require('dotenv').config({ path: '.env.local' });
  diagnoseDatabaseIssue().then(result => {
    if (result.needsMigration) {
      console.log('\n📋 Next steps:');
      console.log('1. Run the WorkChat migration in your Supabase dashboard');
      console.log('2. Or run: npm run migrate');
      process.exit(1);
    } else if (result.error) {
      console.log('\n❌ Database issue detected:', result.error);
      process.exit(1);
    } else {
      console.log('\n✅ All checks passed!');
      process.exit(0);
    }
  });
}

module.exports = diagnoseDatabaseIssue;
