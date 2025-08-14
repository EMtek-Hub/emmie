const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const EMTEK_ORG_ID = '00000000-0000-0000-0000-000000000001';

// Create Supabase admin client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupDevUser() {
  const DEV_USER_ID = '00000000-0000-0000-0000-000000000002';
  const DEV_EMAIL = 'dev@emtek.au';
  const DEV_NAME = 'Dev User';

  try {
    console.log('🚀 Setting up dev user...');

    // 1. Create dev user
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert({
        id: DEV_USER_ID,
        org_id: EMTEK_ORG_ID,
        email: DEV_EMAIL,
        display_name: DEV_NAME,
        role: 'admin'
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (userError) {
      console.error('❌ Error creating dev user:', userError);
      process.exit(1);
    }

    console.log('✅ Dev user created:', user.email);

    // 2. Create test project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .upsert({
        id: '00000000-0000-0000-0000-000000000003',
        org_id: EMTEK_ORG_ID,
        name: 'Test Project',
        description: 'A test project for development and chat testing',
        status: 'active',
        created_by: DEV_USER_ID
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (projectError) {
      console.error('❌ Error creating test project:', projectError);
      process.exit(1);
    }

    console.log('✅ Test project created:', project.name);

    // 3. Add dev user as project owner
    const { error: memberError } = await supabase
      .from('project_members')
      .upsert({
        project_id: project.id,
        user_id: DEV_USER_ID,
        role: 'owner'
      }, {
        onConflict: 'project_id,user_id'
      });

    if (memberError) {
      console.error('❌ Error adding project membership:', memberError);
      process.exit(1);
    }

    console.log('✅ Dev user added as project owner');

    // 4. Add some sample project facts
    const facts = [
      {
        project_id: project.id,
        kind: 'decision',
        label: 'Architecture Decision',
        value: 'Using Next.js with Supabase backend for rapid development',
        owner: 'Dev Team',
        created_by: DEV_USER_ID
      },
      {
        project_id: project.id,
        kind: 'risk',
        label: 'Performance Risk',
        value: 'Large chat histories may slow down page loads',
        impact: 'Medium',
        mitigation: 'Implement pagination and lazy loading',
        created_by: DEV_USER_ID
      },
      {
        project_id: project.id,
        kind: 'deadline',
        label: 'MVP Release',
        value: 'Initial version with chat functionality',
        date: '2025-09-01',
        owner: 'Product Team',
        created_by: DEV_USER_ID
      }
    ];

    const { error: factsError } = await supabase
      .from('project_facts')
      .upsert(facts, {
        onConflict: 'id'
      });

    if (factsError) {
      console.warn('⚠️ Warning: Could not create sample facts:', factsError.message);
    } else {
      console.log('✅ Sample project facts created');
    }

    console.log('\n🎉 Dev setup complete!');
    console.log('\n📋 Login details:');
    console.log(`   User ID: ${DEV_USER_ID}`);
    console.log(`   Email: ${DEV_EMAIL}`);
    console.log(`   Name: ${DEV_NAME}`);
    console.log(`   Project ID: ${project.id}`);
    console.log('\n💡 You can now test the chat functionality in the project view.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  setupDevUser();
}

module.exports = { setupDevUser };
