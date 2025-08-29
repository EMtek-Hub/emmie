// scripts/debug-assistant-routing.js
// Debug script to trace why OpenAI Assistant routing fails

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const icons = {
  success: '✅',
  warning: '⚠️ ',
  error: '❌',
  info: 'ℹ️ ',
  search: '🔍',
  bug: '🐛',
  gear: '⚙️ '
};

async function debugAssistantRouting() {
  console.log(`${icons.bug}${colors.bright}${colors.cyan} DEBUGGING ASSISTANT ROUTING ${colors.reset}`);
  console.log(`${'='.repeat(50)}\n`);

  try {
    // Initialize Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log(`${icons.search}${colors.cyan}Analyzing agent configurations and recent usage...${colors.reset}\n`);

    // Get OpenAI Assistant agents
    const { data: assistantAgents, error: agentError } = await supabase
      .from('chat_agents')
      .select('*')
      .eq('agent_mode', 'openai_assistant')
      .eq('is_active', true);

    if (agentError) {
      console.error(`${icons.error}${colors.red}Failed to fetch assistant agents: ${agentError.message}${colors.reset}`);
      return;
    }

    console.log(`${icons.info}${colors.bright}OpenAI Assistant Agents:${colors.reset}`);
    for (const agent of assistantAgents) {
      console.log(`  ${icons.gear} ${agent.name} (${agent.department})`);
      console.log(`    ID: ${agent.id}`);
      console.log(`    Assistant ID: ${agent.openai_assistant_id}`);
      console.log(`    Active: ${agent.is_active}`);
      console.log();
    }

    // Get recent chats that used these agents
    const assistantAgentIds = assistantAgents.map(a => a.id);
    
    const { data: recentChats, error: chatError } = await supabase
      .from('chats')
      .select('id, agent_id, created_at, created_by')
      .in('agent_id', assistantAgentIds)
      .order('created_at', { ascending: false })
      .limit(20);

    if (chatError) {
      console.error(`${icons.error}${colors.red}Failed to fetch recent chats: ${chatError.message}${colors.reset}`);
      return;
    }

    console.log(`${icons.search}${colors.bright}Recent Chats with OpenAI Assistant Agents (Last 20):${colors.reset}`);
    
    if (recentChats.length === 0) {
      console.log(`  ${icons.warning}${colors.yellow}No recent chats found using OpenAI Assistant agents${colors.reset}\n`);
    } else {
      for (const chat of recentChats) {
        const agent = assistantAgents.find(a => a.id === chat.agent_id);
        console.log(`  Chat ${chat.id}: ${agent?.name || 'Unknown'} - ${new Date(chat.created_at).toLocaleDateString()}`);
      }
      console.log();
    }

    // Analyze messages from these chats
    if (recentChats.length > 0) {
      const chatIds = recentChats.map(c => c.id);
      
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('chat_id, model, role, created_at')
        .in('chat_id', chatIds)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })
        .limit(50);

      if (msgError) {
        console.error(`${icons.error}${colors.red}Failed to fetch messages: ${msgError.message}${colors.reset}`);
        return;
      }

      console.log(`${icons.search}${colors.bright}Messages from OpenAI Assistant Chats:${colors.reset}`);
      
      const modelCounts = {};
      let openaiAssistantCount = 0;
      let emmieCount = 0;

      for (const msg of messages) {
        const model = msg.model || 'unknown';
        modelCounts[model] = (modelCounts[model] || 0) + 1;
        
        if (model.startsWith('openai-assistant:')) {
          openaiAssistantCount++;
        } else {
          emmieCount++;
        }
      }

      console.log(`  Total messages analyzed: ${messages.length}`);
      console.log(`  OpenAI Assistant messages: ${openaiAssistantCount}`);
      console.log(`  Emmie fallback messages: ${emmieCount}`);
      console.log();

      console.log(`${icons.info}${colors.bright}Model Distribution:${colors.reset}`);
      for (const [model, count] of Object.entries(modelCounts).sort(([,a], [,b]) => b - a)) {
        const isOpenAI = model.startsWith('openai-assistant:');
        const color = isOpenAI ? colors.blue : colors.yellow;
        const status = isOpenAI ? '✅ OpenAI Assistant' : '⚠️  Emmie Fallback';
        console.log(`  ${color}${model}${colors.reset}: ${count} messages ${status}`);
      }
      console.log();

      // Check for specific routing issues
      console.log(`${icons.bug}${colors.bright}Potential Issues:${colors.reset}`);
      
      if (openaiAssistantCount === 0 && emmieCount > 0) {
        console.log(`  ${icons.error}${colors.red}CRITICAL: All messages from OpenAI Assistant chats used Emmie models${colors.reset}`);
        console.log(`  ${colors.red}This indicates the routing logic is failing${colors.reset}`);
        console.log();
        
        // Check for common issues
        console.log(`${icons.search}${colors.bright}Diagnostic Checks:${colors.reset}`);
        
        // Check if EMTEK_ORG_ID is correctly set
        console.log(`  1. Checking EMTEK_ORG_ID configuration...`);
        const { data: orgCheck } = await supabase
          .from('chat_agents')
          .select('org_id')
          .eq('agent_mode', 'openai_assistant')
          .limit(1)
          .single();
        
        if (orgCheck) {
          console.log(`     Agent org_id: ${orgCheck.org_id}`);
          console.log(`     Expected: Check if this matches EMTEK_ORG_ID in your code`);
        }
        
        // Check for agent lookup issues
        console.log(`  2. Checking agent lookup...`);
        for (const agent of assistantAgents) {
          const { data: lookupTest, error: lookupError } = await supabase
            .from('chat_agents')
            .select('*')
            .eq('id', agent.id)
            .eq('is_active', true)
            .single();
          
          if (lookupError) {
            console.log(`     ${icons.error}${colors.red}Agent ${agent.name} lookup failed: ${lookupError.message}${colors.reset}`);
          } else {
            console.log(`     ${icons.success}${colors.green}Agent ${agent.name} lookup successful${colors.reset}`);
            console.log(`       Mode: ${lookupTest.agent_mode}`);
            console.log(`       Assistant ID: ${lookupTest.openai_assistant_id}`);
          }
        }
        
        console.log(`  3. Checking for console logs...`);
        console.log(`     Look for this log message in your app console:`);
        console.log(`     ${colors.cyan}"🤖 Using OpenAI Assistant: asst_xxx for agent: Agent Name"${colors.reset}`);
        console.log(`     If you don't see this message, the routing condition is failing`);
        
      } else if (openaiAssistantCount > 0) {
        console.log(`  ${icons.success}${colors.green}Some messages successfully used OpenAI Assistant endpoints${colors.reset}`);
        console.log(`  ${icons.info}${colors.blue}This suggests intermittent routing issues${colors.reset}`);
      }
    }

    // Check for environment issues
    console.log(`\n${icons.gear}${colors.bright}Environment Configuration:${colors.reset}`);
    console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
    console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);
    
    // Final recommendations
    console.log(`\n${icons.info}${colors.bright}Next Steps:${colors.reset}`);
    console.log(`  1. Check your browser's developer console for the OpenAI Assistant log message`);
    console.log(`  2. Verify the EMTEK_ORG_ID constant in your chat.ts matches your actual org_id`);
    console.log(`  3. Test with a simple console.log in the routing condition to see if it's reached`);
    console.log(`  4. Check if handleOpenAIAssistantChat function is executing without errors`);

  } catch (error) {
    console.error(`${icons.error}${colors.red}Debug script failed: ${error.message}${colors.reset}`);
  }
}

if (require.main === module) {
  debugAssistantRouting();
}

module.exports = debugAssistantRouting;
