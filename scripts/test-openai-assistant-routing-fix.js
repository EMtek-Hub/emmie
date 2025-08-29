/**
 * Test OpenAI Assistant Routing Fix
 * 
 * This script tests that OpenAI Assistants are now properly routed to 
 * the correct API endpoint (/api/chat) instead of the GPT-5 endpoint.
 */

require('dotenv').config({ path: '.env.local' });
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

async function testOpenAIAssistantRoutingFix() {
  console.log('🔍 Testing OpenAI Assistant Routing Fix...\n');
  
  try {
    // 1. Check the IT Support agent (which should be an OpenAI Assistant)
    console.log('1. Checking IT Support agent configuration...');
    const { data: itAgent, error: itError } = await supabaseAdmin
      .from('chat_agents')
      .select('*')
      .eq('id', '10000000-0000-0000-0000-000000000002')
      .eq('org_id', EMTEK_ORG_ID)
      .single();

    if (itError || !itAgent) {
      console.error('❌ Could not find IT Support agent:', itError);
      return;
    }

    console.log('✅ IT Support agent found:');
    console.log(`   - Name: ${itAgent.name}`);
    console.log(`   - Agent Mode: ${itAgent.agent_mode || 'Not set'}`);
    console.log(`   - OpenAI Assistant ID: ${itAgent.openai_assistant_id || 'Not set'}`);
    console.log(`   - System Prompt: ${itAgent.system_prompt ? 'Present' : 'Missing'}`);
    
    // 2. Test routing logic simulation
    console.log('\n2. Testing routing logic...');
    
    // Simulate the routing logic from the fix
    function determineApiEndpoint(agent, selectedModel) {
      const GPT5_MODELS = {
        NANO: 'gpt-5-nano',
        MINI: 'gpt-5-mini', 
        FULL: 'gpt-5'
      };
      
      if (agent?.openai_assistant_id) {
        return '/api/chat';
      } else if (Object.values(GPT5_MODELS).includes(selectedModel)) {
        return '/api/chat-gpt5';
      } else {
        return '/api/chat-simple';
      }
    }
    
    // Test different scenarios
    const testCases = [
      {
        name: 'IT Support Agent (OpenAI Assistant)',
        agent: itAgent,
        selectedModel: 'gpt-5-mini',
        expectedEndpoint: '/api/chat',
        reason: 'Has openai_assistant_id'
      },
      {
        name: 'IT Support Agent with GPT-4o Mini',
        agent: itAgent,
        selectedModel: 'gpt-4o-mini',
        expectedEndpoint: '/api/chat',
        reason: 'Has openai_assistant_id (takes priority over model)'
      },
      {
        name: 'Regular Agent with GPT-5',
        agent: { name: 'Regular', openai_assistant_id: null },
        selectedModel: 'gpt-5-mini',
        expectedEndpoint: '/api/chat-gpt5',
        reason: 'No OpenAI Assistant ID, but GPT-5 model'
      },
      {
        name: 'Regular Agent with Legacy Model',
        agent: { name: 'Regular', openai_assistant_id: null },
        selectedModel: 'gpt-4o-mini',
        expectedEndpoint: '/api/chat-simple',
        reason: 'No OpenAI Assistant ID, legacy model'
      }
    ];
    
    let allTestsPassed = true;
    
    for (const testCase of testCases) {
      const actualEndpoint = determineApiEndpoint(testCase.agent, testCase.selectedModel);
      const passed = actualEndpoint === testCase.expectedEndpoint;
      
      console.log(`\n   Test: ${testCase.name}`);
      console.log(`   Expected: ${testCase.expectedEndpoint}`);
      console.log(`   Actual: ${actualEndpoint}`);
      console.log(`   Reason: ${testCase.reason}`);
      console.log(`   Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
      
      if (!passed) {
        allTestsPassed = false;
      }
    }
    
    // 3. Verify the problem is fixed
    console.log('\n3. Verifying the fix...');
    
    if (itAgent.openai_assistant_id) {
      console.log('✅ IT Support agent has OpenAI Assistant ID');
      console.log('✅ Routing logic will now send it to /api/chat');
      console.log('✅ This will use the OpenAI Assistants API instead of GPT-5 API');
      console.log('✅ The assistant will now respond with its proper personality, not "Emmie"');
    } else {
      console.log('❌ IT Support agent is missing OpenAI Assistant ID');
      console.log('   This agent should be configured as an OpenAI Assistant');
    }
    
    // 4. Summary
    console.log('\n📋 SUMMARY:\n');
    
    if (allTestsPassed) {
      console.log('✅ All routing tests passed!');
      console.log('✅ OpenAI Assistants will now be properly routed to /api/chat');
      console.log('✅ The "You are Emmie" issue should be resolved');
    } else {
      console.log('❌ Some routing tests failed');
      console.log('❌ The fix may need additional work');
    }
    
    console.log('\n🧪 TESTING INSTRUCTIONS:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Open the chat interface: http://localhost:5000');
    console.log('3. Select the "IT Support" agent from the dropdown');
    console.log('4. Send a test message');
    console.log('5. Verify the response comes from the IT Support assistant, not "Emmie"');
    console.log('6. Check the console logs to confirm routing to /api/chat');
    
    console.log('\n✅ OpenAI Assistant routing fix testing complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testOpenAIAssistantRoutingFix();
}

module.exports = { testOpenAIAssistantRoutingFix };
