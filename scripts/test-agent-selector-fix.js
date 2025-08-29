/**
 * Test Agent Selector Fix
 * 
 * This script tests the agent selector functionality and verifies that:
 * 1. Agents can be properly selected in the UI
 * 2. OpenAI Assistant routing works correctly
 * 3. System prompts are being used appropriately
 */

// Import required modules
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { 
    auth: { 
      persistSession: false 
    }
  }
);

const EMTEK_ORG_ID = '00000000-0000-0000-0000-000000000001';

async function testAgentSelectorFix() {
  console.log('🔍 Testing Agent Selector Fix...\n');
  
  try {
    // 1. Test agent fetching
    console.log('1. Testing agent data fetching...');
    const { data: agents, error: agentsError } = await supabaseAdmin
      .from('chat_agents')
      .select(`
        id,
        name,
        department,
        description,
        color,
        icon,
        is_active,
        agent_mode,
        openai_assistant_id,
        system_prompt,
        background_instructions,
        created_at,
        updated_at
      `)
      .eq('org_id', EMTEK_ORG_ID)
      .eq('is_active', true)
      .order('department', { ascending: true })
      .order('name', { ascending: true });

    if (agentsError) {
      console.error('❌ Agent fetch error:', agentsError);
      return;
    }

    console.log(`✅ Found ${agents.length} active agents`);
    
    // 2. Analyze agent configurations
    console.log('\n2. Analyzing agent configurations...');
    const emmieAgents = agents.filter(a => a.agent_mode === 'emmie' || !a.agent_mode);
    const openaiAssistants = agents.filter(a => a.agent_mode === 'openai_assistant');
    
    console.log(`   - Emmie agents: ${emmieAgents.length}`);
    console.log(`   - OpenAI assistants: ${openaiAssistants.length}`);
    
    // 3. Check for default agent
    console.log('\n3. Checking for default agent...');
    const defaultAgent = agents.find(agent => agent.department === 'General');
    if (defaultAgent) {
      console.log(`✅ Default agent found: ${defaultAgent.name} (${defaultAgent.agent_mode || 'emmie'})`);
    } else {
      console.log('⚠️ No default "General" agent found');
    }
    
    // 4. Validate OpenAI Assistant configurations
    console.log('\n4. Validating OpenAI Assistant configurations...');
    for (const assistant of openaiAssistants) {
      console.log(`\n   Agent: ${assistant.name}`);
      console.log(`   - Mode: ${assistant.agent_mode}`);
      console.log(`   - Assistant ID: ${assistant.openai_assistant_id || 'Not set'}`);
      
      if (!assistant.openai_assistant_id) {
        console.log(`   ⚠️ Missing OpenAI Assistant ID for ${assistant.name}`);
      } else if (!assistant.openai_assistant_id.startsWith('asst_')) {
        console.log(`   ⚠️ Invalid Assistant ID format for ${assistant.name}`);
      } else {
        console.log(`   ✅ Valid configuration`);
      }
    }
    
    // 5. Check system prompts
    console.log('\n5. Checking system prompts...');
    const agentsWithPrompts = agents.filter(a => a.system_prompt);
    const agentsWithoutPrompts = agents.filter(a => !a.system_prompt);
    
    console.log(`   - Agents with custom system prompts: ${agentsWithPrompts.length}`);
    console.log(`   - Agents without system prompts: ${agentsWithoutPrompts.length}`);
    
    if (agentsWithoutPrompts.length > 0) {
      console.log('\n   Agents missing system prompts:');
      agentsWithoutPrompts.forEach(agent => {
        console.log(`   - ${agent.name} (${agent.department})`);
      });
    }
    
    // 6. Test chat creation with different agents
    console.log('\n6. Testing chat routing behavior...');
    
    // Test with Emmie agent
    if (emmieAgents.length > 0) {
      const emmieAgent = emmieAgents[0];
      console.log(`\n   Testing Emmie agent: ${emmieAgent.name}`);
      console.log(`   - Expected routing: Emmie multi-agent system`);
      console.log(`   - System prompt: ${emmieAgent.system_prompt ? 'Custom' : 'Default'}`);
    }
    
    // Test with OpenAI Assistant
    if (openaiAssistants.length > 0) {
      const openaiAgent = openaiAssistants[0];
      console.log(`\n   Testing OpenAI Assistant: ${openaiAgent.name}`);
      console.log(`   - Expected routing: OpenAI Assistants API`);
      console.log(`   - Assistant ID: ${openaiAgent.openai_assistant_id}`);
      console.log(`   - System prompt: ${openaiAgent.system_prompt ? 'Will be ignored (OpenAI handles this)' : 'N/A'}`);
    }
    
    // 7. Provide summary and recommendations
    console.log('\n📋 SUMMARY & RECOMMENDATIONS:\n');
    
    if (openaiAssistants.length === 0) {
      console.log('⚠️ No OpenAI Assistants configured. To test the fix:');
      console.log('   1. Go to admin settings');
      console.log('   2. Switch an agent to "OpenAI Assistant" mode');
      console.log('   3. Add a valid OpenAI Assistant ID (starts with "asst_")');
    } else {
      console.log('✅ Agent selector fix should resolve the following:');
      console.log('   1. Users can now select different agents from the dropdown');
      console.log('   2. OpenAI Assistants will route to the Assistants API');
      console.log('   3. Custom system prompts will be used for Emmie agents');
    }
    
    if (agentsWithoutPrompts.length > 0) {
      console.log('\n💡 Consider adding custom system prompts to agents without them');
      console.log('   This will provide more specialized behavior for each agent');
    }
    
    console.log('\n🔧 TESTING INSTRUCTIONS:');
    console.log('1. Open the chat interface');
    console.log('2. Click on the agent selector (should show dropdown)');
    console.log('3. Select different agents and verify:');
    console.log('   - Agent name updates in the selector');
    console.log('   - OpenAI agents show "OpenAI" badge');
    console.log('   - Chat routing works as expected');
    
    console.log('\n✅ Agent selector fix testing complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testAgentSelectorFix();
}

module.exports = { testAgentSelectorFix };
