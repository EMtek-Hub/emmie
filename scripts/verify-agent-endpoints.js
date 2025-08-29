// scripts/verify-agent-endpoints.js
// Diagnostic script to verify which endpoints agents are using

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

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

// Helper constants for EMtek single-tenant setup
const EMTEK_ORG_ID = '00000000-0000-0000-0000-000000000001';

async function verifyAgentEndpoints() {
  console.log('🔍 AGENT ENDPOINT VERIFICATION DIAGNOSTIC');
  console.log('=========================================\n');

  try {
    // 1. Fetch all agents and their configurations
    console.log('📋 Fetching agent configurations...');
    
    const { data: agents, error } = await supabaseAdmin
      .from('chat_agents')
      .select(`
        id,
        name,
        department,
        agent_mode,
        openai_assistant_id,
        is_active,
        created_at,
        updated_at
      `)
      .eq('org_id', EMTEK_ORG_ID)
      .order('department', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Error fetching agents:', error);
      return;
    }

    if (!agents || agents.length === 0) {
      console.log('⚠️ No agents found in the system');
      return;
    }

    console.log(`✅ Found ${agents.length} agent(s)\n`);

    // 2. Analyze each agent's configuration
    const emmieAgents = [];
    const assistantAgents = [];
    const misconfiguredAgents = [];

    agents.forEach(agent => {
      console.log(`🤖 Agent: ${agent.name} (${agent.department})`);
      console.log(`   ID: ${agent.id}`);
      console.log(`   Active: ${agent.is_active ? '✅' : '❌'}`);
      console.log(`   Mode: ${agent.agent_mode || 'undefined'}`);
      console.log(`   Assistant ID: ${agent.openai_assistant_id || 'none'}`);
      
      // Categorize agents
      if (agent.agent_mode === 'openai_assistant') {
        if (agent.openai_assistant_id && agent.openai_assistant_id.trim()) {
          assistantAgents.push(agent);
          console.log(`   🎯 STATUS: Using OpenAI Assistant (${agent.openai_assistant_id})`);
        } else {
          misconfiguredAgents.push(agent);
          console.log(`   ⚠️ STATUS: MISCONFIGURED - Mode is 'openai_assistant' but no Assistant ID`);
        }
      } else if (agent.agent_mode === 'emmie' || !agent.agent_mode) {
        emmieAgents.push(agent);
        console.log(`   🔄 STATUS: Using Emmie (GPT-5) endpoint`);
      } else {
        misconfiguredAgents.push(agent);
        console.log(`   ❌ STATUS: UNKNOWN mode: ${agent.agent_mode}`);
      }
      
      console.log('');
    });

    // 3. Provide summary
    console.log('📊 ENDPOINT USAGE SUMMARY');
    console.log('========================');
    console.log(`🔄 Emmie (GPT-5) Agents: ${emmieAgents.length}`);
    console.log(`🎯 OpenAI Assistant Agents: ${assistantAgents.length}`);
    console.log(`⚠️ Misconfigured Agents: ${misconfiguredAgents.length}\n`);

    // 4. Show detailed breakdown
    if (emmieAgents.length > 0) {
      console.log('🔄 EMMIE ENDPOINT AGENTS:');
      emmieAgents.forEach(agent => {
        console.log(`   • ${agent.name} (${agent.department}) - Mode: ${agent.agent_mode || 'default'}`);
      });
      console.log('');
    }

    if (assistantAgents.length > 0) {
      console.log('🎯 OPENAI ASSISTANT ENDPOINT AGENTS:');
      assistantAgents.forEach(agent => {
        console.log(`   • ${agent.name} (${agent.department}) - Assistant: ${agent.openai_assistant_id}`);
      });
      console.log('');
    }

    if (misconfiguredAgents.length > 0) {
      console.log('⚠️ MISCONFIGURED AGENTS (NEED ATTENTION):');
      misconfiguredAgents.forEach(agent => {
        console.log(`   • ${agent.name} (${agent.department}) - Issue: ${
          agent.agent_mode === 'openai_assistant' && !agent.openai_assistant_id 
            ? 'Missing Assistant ID' 
            : `Unknown mode: ${agent.agent_mode}`
        }`);
      });
      console.log('');
    }

    // 5. Check recent chat usage to verify actual routing
    console.log('📨 CHECKING RECENT CHAT USAGE (Last 24 hours)...');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: recentChats, error: chatsError } = await supabaseAdmin
      .from('chats')
      .select(`
        id,
        agent_id,
        created_at,
        chat_agents!inner(name, agent_mode, openai_assistant_id)
      `)
      .eq('org_id', EMTEK_ORG_ID)
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (!chatsError && recentChats && recentChats.length > 0) {
      console.log(`✅ Found ${recentChats.length} recent chat(s):`);
      
      recentChats.forEach(chat => {
        const agent = chat.chat_agents;
        const endpointType = agent.agent_mode === 'openai_assistant' && agent.openai_assistant_id 
          ? `🎯 OpenAI Assistant (${agent.openai_assistant_id})` 
          : '🔄 Emmie (GPT-5)';
        
        console.log(`   • ${new Date(chat.created_at).toLocaleString()} - ${agent.name} - ${endpointType}`);
      });
      console.log('');
    } else {
      console.log('ℹ️ No recent chats found to analyze\n');
    }

    // 6. Check for messages with model indicators
    console.log('🔍 CHECKING MESSAGE MODEL INDICATORS...');
    
    const { data: recentMessages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select(`
        id,
        model,
        chat_id,
        created_at,
        chats!inner(
          agent_id,
          chat_agents!inner(name, agent_mode, openai_assistant_id)
        )
      `)
      .eq('role', 'assistant')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (!messagesError && recentMessages && recentMessages.length > 0) {
      console.log(`✅ Analyzing ${recentMessages.length} recent assistant messages:`);
      
      const modelUsage = {};
      
      recentMessages.forEach(message => {
        const agent = message.chats.chat_agents;
        const model = message.model || 'unknown';
        
        if (!modelUsage[agent.name]) {
          modelUsage[agent.name] = {
            agent,
            models: {},
            total: 0
          };
        }
        
        modelUsage[agent.name].models[model] = (modelUsage[agent.name].models[model] || 0) + 1;
        modelUsage[agent.name].total++;
      });

      Object.values(modelUsage).forEach(usage => {
        const agent = usage.agent;
        const expectedEndpoint = agent.agent_mode === 'openai_assistant' && agent.openai_assistant_id 
          ? 'OpenAI Assistant' 
          : 'Emmie (GPT-5)';
        
        console.log(`\n   🤖 ${agent.name}:`);
        console.log(`      Expected: ${expectedEndpoint}`);
        console.log(`      Models used:`);
        
        Object.entries(usage.models).forEach(([model, count]) => {
          const isAssistantModel = model.includes('openai-assistant');
          const isGPT5Model = model.includes('gpt-5') || model === 'gpt-5-mini' || model === 'gpt-5-nano';
          
          let indicator = '❓';
          if (isAssistantModel) {
            indicator = '🎯'; // OpenAI Assistant
          } else if (isGPT5Model) {
            indicator = '🔄'; // Emmie/GPT-5
          }
          
          console.log(`         ${indicator} ${model}: ${count} message(s)`);
        });
      });
      console.log('');
    } else {
      console.log('ℹ️ No recent assistant messages found to analyze\n');
    }

    // 7. Provide verification recommendations
    console.log('💡 VERIFICATION RECOMMENDATIONS');
    console.log('==============================');
    console.log('To confirm agents are using the correct endpoints:');
    console.log('');
    console.log('1. 🔍 Check Console Logs:');
    console.log('   - Look for "🤖 Using OpenAI Assistant: [assistant-id] for agent: [name]"');
    console.log('   - Look for "🚀 Using GPT-5 Responses API with model: [model]"');
    console.log('');
    console.log('2. 📊 Monitor Model Field in Database:');
    console.log('   - OpenAI Assistant responses have model: "openai-assistant:[assistant-id]"');
    console.log('   - Emmie responses have model: "gpt-5-mini", "gpt-5-nano", or "gpt-5"');
    console.log('');
    console.log('3. 🧪 Test Specific Agents:');
    console.log('   - Send test messages to each agent');
    console.log('   - Check the response model in the database');
    console.log('   - Verify console logs show correct routing');
    console.log('');
    console.log('4. 🔧 Admin Interface:');
    console.log('   - Use /admin/settings to view and modify agent configurations');
    console.log('   - Toggle between "emmie" and "openai_assistant" modes');
    console.log('   - Ensure OpenAI Assistant IDs are properly set');

    // 8. Configuration validation
    if (misconfiguredAgents.length > 0) {
      console.log('\n⚠️ CONFIGURATION ISSUES TO FIX:');
      console.log('===============================');
      misconfiguredAgents.forEach(agent => {
        console.log(`\n🔧 Agent: ${agent.name}`);
        if (agent.agent_mode === 'openai_assistant' && !agent.openai_assistant_id) {
          console.log('   Issue: OpenAI Assistant mode but no Assistant ID');
          console.log(`   Fix: Either set an Assistant ID or change mode to 'emmie'`);
          console.log(`   SQL: UPDATE chat_agents SET agent_mode='emmie' WHERE id='${agent.id}';`);
        } else {
          console.log(`   Issue: Unknown agent_mode: ${agent.agent_mode}`);
          console.log(`   Fix: Set mode to 'emmie' or 'openai_assistant'`);
          console.log(`   SQL: UPDATE chat_agents SET agent_mode='emmie' WHERE id='${agent.id}';`);
        }
      });
    }

    console.log('\n✅ Agent endpoint verification complete!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run the verification
if (require.main === module) {
  verifyAgentEndpoints().catch(console.error);
}

module.exports = { verifyAgentEndpoints };
