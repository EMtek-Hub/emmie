// Diagnose agent system prompt issue
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

async function diagnoseAgentSystemPrompt() {
  console.log('🔍 Diagnosing agent system prompt issue...');

  try {
    // Check the IT Support agent configuration
    const { data: agent, error } = await supabaseAdmin
      .from('chat_agents')
      .select('*')
      .eq('id', '10000000-0000-0000-0000-000000000002')
      .eq('org_id', EMTEK_ORG_ID)
      .single();

    if (error) {
      console.error('❌ Error fetching agent:', error);
      return;
    }

    if (!agent) {
      console.log('❌ Agent not found');
      return;
    }

    console.log('✅ Agent found:', {
      id: agent.id,
      name: agent.name,
      is_active: agent.is_active,
      system_prompt: agent.system_prompt ? 'Present' : 'Missing',
      system_prompt_length: agent.system_prompt ? agent.system_prompt.length : 0,
      openai_assistant_id: agent.openai_assistant_id || 'Not set'
    });

    if (agent.system_prompt) {
      console.log('\n📝 System Prompt:');
      console.log(agent.system_prompt);
    } else {
      console.log('\n❌ No system prompt configured - this is the issue!');
    }

    // Check if this is supposed to be an OpenAI Assistant
    if (agent.openai_assistant_id) {
      console.log('\n🤖 This appears to be an OpenAI Assistant configuration');
      console.log('OpenAI Assistant ID:', agent.openai_assistant_id);
      
      // Check if we should be using a different endpoint
      console.log('\n⚠️  OpenAI Assistants should use a different API endpoint!');
      console.log('Current endpoint: /api/chat-gpt5 (GPT-5 Responses API)');
      console.log('Recommended endpoint: /api/chat (OpenAI Assistants API)');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

diagnoseAgentSystemPrompt();
