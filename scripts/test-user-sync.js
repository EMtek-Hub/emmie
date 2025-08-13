// Test script to simulate user sync without authentication
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const EMTEK_ORG_ID = '00000000-0000-0000-0000-000000000001';

async function testUserSync() {
  console.log('🧪 Testing user sync with sample data...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  // Test scenarios
  const testCases = [
    {
      name: 'Valid UUID user',
      userId: '12345678-1234-1234-1234-123456789012',
      email: 'test.user@emtek.com.au',
      displayName: 'Test User'
    },
    {
      name: 'Non-UUID user ID (like Azure AD)',
      userId: 'azure-ad-object-id-12345',
      email: 'azure.user@emtek.com.au', 
      displayName: 'Azure User'
    },
    {
      name: 'Long Azure AD object ID',
      userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      email: 'long.id@emtek.com.au',
      displayName: 'Long ID User'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: ${testCase.name}`);
    console.log(`   User ID: ${testCase.userId}`);
    console.log(`   Email: ${testCase.email}`);

    try {
      // Clean up first
      await supabase.from('users').delete().eq('id', testCase.userId);

      // Check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', testCase.userId)
        .single();

      if (!existingUser) {
        console.log('   ➤ User does not exist, creating...');
        
        const { data: newUser, error } = await supabase
          .from('users')
          .insert([{
            id: testCase.userId,
            org_id: EMTEK_ORG_ID,
            email: testCase.email,
            display_name: testCase.displayName,
            role: 'member'
          }])
          .select()
          .single();

        if (error) {
          console.log('   ❌ Creation failed:', error.message);
          console.log('   Error details:', {
            code: error.code,
            details: error.details,
            hint: error.hint
          });
        } else {
          console.log('   ✅ User created successfully');
          
          // Clean up
          await supabase.from('users').delete().eq('id', testCase.userId);
          console.log('   🧹 Test user cleaned up');
        }
      } else {
        console.log('   ✅ User already exists');
      }

    } catch (err) {
      console.log('   ❌ Unexpected error:', err.message);
    }
  }

  console.log('\n🎯 Testing email uniqueness constraint...');
  
  // Test duplicate email scenario
  const user1 = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'duplicate@emtek.com.au'
  };
  const user2 = {
    id: '22222222-2222-2222-2222-222222222222', 
    email: 'duplicate@emtek.com.au'
  };

  try {
    // Clean up first
    await supabase.from('users').delete().eq('email', user1.email);

    // Create first user
    await supabase.from('users').insert([{
      id: user1.id,
      org_id: EMTEK_ORG_ID,
      email: user1.email,
      display_name: 'First User',
      role: 'member'
    }]);
    console.log('✅ First user created');

    // Try to create second user with same email
    const { error } = await supabase.from('users').insert([{
      id: user2.id,
      org_id: EMTEK_ORG_ID,
      email: user2.email,
      display_name: 'Second User',
      role: 'member'
    }]);

    if (error) {
      console.log('❌ Duplicate email rejected (expected):', error.message);
    } else {
      console.log('⚠️  Duplicate email allowed (unexpected)');
    }

    // Clean up
    await supabase.from('users').delete().eq('email', user1.email);
    console.log('🧹 Duplicate test cleaned up');

  } catch (err) {
    console.log('❌ Duplicate test error:', err.message);
  }

  console.log('\n✅ User sync testing completed');
}

testUserSync().catch(console.error);
