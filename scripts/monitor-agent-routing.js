// scripts/monitor-agent-routing.js
// Real-time monitoring script to track agent endpoint routing

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

class AgentEndpointMonitor {
  constructor() {
    this.isMonitoring = false;
    this.lastMessageId = null;
    this.monitoringInterval = null;
  }

  async startMonitoring() {
    console.log('🎯 STARTING AGENT ENDPOINT MONITORING');
    console.log('====================================');
    console.log('This will monitor new chat messages and show which endpoint is being used.');
    console.log('Press Ctrl+C to stop monitoring.\n');

    this.isMonitoring = true;

    // Get initial latest message ID
    const { data: latestMessage } = await supabaseAdmin
      .from('messages')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    this.lastMessageId = latestMessage?.id;
    console.log(`📌 Starting from message ID: ${this.lastMessageId || 'none'}\n`);

    // Start polling for new messages
    this.pollForNewMessages();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.stopMonitoring();
    });
  }

  async pollForNewMessages() {
    if (!this.isMonitoring) return;

    try {
      // Query for new messages since the last ID
      let query = supabaseAdmin
        .from('messages')
        .select(`
          id,
          model,
          role,
          content_md,
          created_at,
          chat_id,
          chats!inner(
            agent_id,
            chat_agents!inner(name, department, agent_mode, openai_assistant_id)
          )
        `)
        .eq('role', 'assistant')
        .order('created_at', { ascending: true })
        .limit(10);

      if (this.lastMessageId) {
        query = query.gt('id', this.lastMessageId);
      }

      const { data: newMessages, error } = await query;

      if (error) {
        console.error('❌ Error polling messages:', error);
      } else if (newMessages && newMessages.length > 0) {
        console.log(`\n📨 Found ${newMessages.length} new message(s):`);
        
        newMessages.forEach(message => {
          this.analyzeMessage(message);
          this.lastMessageId = Math.max(this.lastMessageId || 0, message.id);
        });
      }

    } catch (error) {
      console.error('❌ Polling error:', error);
    }

    // Schedule next poll
    if (this.isMonitoring) {
      this.monitoringInterval = setTimeout(() => this.pollForNewMessages(), 2000);
    }
  }

  analyzeMessage(message) {
    const agent = message.chats.chat_agents;
    const timestamp = new Date(message.created_at).toLocaleTimeString();
    const model = message.model || 'unknown';
    
    // Determine endpoint type based on model
    let endpointType = '❓ Unknown';
    let indicator = '❓';
    
    if (model.includes('openai-assistant')) {
      endpointType = 'OpenAI Assistant';
      indicator = '🎯';
    } else if (model.includes('gpt-5') || model === 'gpt-5-mini' || model === 'gpt-5-nano') {
      endpointType = 'Emmie (GPT-5)';
      indicator = '🔄';
    } else if (model.includes('gpt-4') || model.includes('gpt-3.5')) {
      endpointType = 'Legacy OpenAI';
      indicator = '🔄';
    }

    // Check if configuration matches actual usage
    const expectedEndpoint = agent.agent_mode === 'openai_assistant' && agent.openai_assistant_id 
      ? 'OpenAI Assistant' 
      : 'Emmie (GPT-5)';
    
    const isCorrectEndpoint = endpointType === expectedEndpoint;
    const statusIndicator = isCorrectEndpoint ? '✅' : '⚠️';
    
    console.log(`\n${statusIndicator} ${timestamp} - ${indicator} ${agent.name} (${agent.department})`);
    console.log(`   Model: ${model}`);
    console.log(`   Endpoint: ${endpointType}`);
    console.log(`   Expected: ${expectedEndpoint}`);
    console.log(`   Configuration: ${agent.agent_mode || 'default'}`);
    
    if (agent.openai_assistant_id) {
      console.log(`   Assistant ID: ${agent.openai_assistant_id}`);
    }
    
    if (!isCorrectEndpoint) {
      console.log(`   🚨 MISMATCH: Agent configured for ${expectedEndpoint} but using ${endpointType}!`);
    }

    // Show content preview if available
    if (message.content_md) {
      const preview = message.content_md.substring(0, 100).replace(/\n/g, ' ');
      console.log(`   Content: "${preview}${message.content_md.length > 100 ? '...' : ''}"`);
    }
  }

  stopMonitoring() {
    console.log('\n🛑 Stopping monitoring...');
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearTimeout(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('✅ Monitoring stopped. Goodbye!');
    process.exit(0);
  }
}

// Live chat monitoring function
async function monitorLiveChats() {
  console.log('💬 LIVE CHAT MONITORING');
  console.log('======================');
  console.log('Monitoring active chats for endpoint usage...\n');

  try {
    // Get active chats (last 10 minutes)
    const tenMinutesAgo = new Date();
    tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

    const { data: activeChats, error } = await supabaseAdmin
      .from('chats')
      .select(`
        id,
        updated_at,
        agent_id,
        chat_agents!inner(name, department, agent_mode, openai_assistant_id)
      `)
      .eq('org_id', EMTEK_ORG_ID)
      .gte('updated_at', tenMinutesAgo.toISOString())
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching active chats:', error);
      return;
    }

    if (!activeChats || activeChats.length === 0) {
      console.log('ℹ️ No active chats in the last 10 minutes');
      return;
    }

    console.log(`📊 Found ${activeChats.length} active chat(s):`);

    for (const chat of activeChats) {
      const agent = chat.chat_agents;
      const lastActivity = new Date(chat.updated_at).toLocaleTimeString();
      
      // Get recent messages for this chat
      const { data: recentMessages } = await supabaseAdmin
        .from('messages')
        .select('model, role, created_at')
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const assistantMessages = recentMessages?.filter(m => m.role === 'assistant') || [];
      
      console.log(`\n🔹 Chat ${chat.id} - ${agent.name}`);
      console.log(`   Last Activity: ${lastActivity}`);
      console.log(`   Configuration: ${agent.agent_mode || 'default'}`);
      
      if (agent.openai_assistant_id) {
        console.log(`   Assistant ID: ${agent.openai_assistant_id}`);
      }

      if (assistantMessages.length > 0) {
        console.log(`   Recent Models Used:`);
        assistantMessages.forEach((msg, index) => {
          const model = msg.model || 'unknown';
          const time = new Date(msg.created_at).toLocaleTimeString();
          
          let indicator = '❓';
          if (model.includes('openai-assistant')) {
            indicator = '🎯';
          } else if (model.includes('gpt-5')) {
            indicator = '🔄';
          }
          
          console.log(`     ${indicator} ${model} (${time})`);
        });
      } else {
        console.log(`   ℹ️ No recent assistant messages`);
      }
    }

  } catch (error) {
    console.error('❌ Live monitoring error:', error);
  }
}

// Database query helper for endpoint verification
async function queryEndpointUsage(timeframe = '1 hour') {
  console.log(`📈 ENDPOINT USAGE ANALYSIS (Last ${timeframe})`);
  console.log('==========================================\n');

  try {
    let timeFilter = new Date();
    
    if (timeframe.includes('hour')) {
      const hours = parseInt(timeframe) || 1;
      timeFilter.setHours(timeFilter.getHours() - hours);
    } else if (timeframe.includes('day')) {
      const days = parseInt(timeframe) || 1;
      timeFilter.setDate(timeFilter.getDate() - days);
    } else if (timeframe.includes('minute')) {
      const minutes = parseInt(timeframe) || 60;
      timeFilter.setMinutes(timeFilter.getMinutes() - minutes);
    }

    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select(`
        model,
        created_at,
        chats!inner(
          agent_id,
          chat_agents!inner(name, department, agent_mode, openai_assistant_id)
        )
      `)
      .eq('role', 'assistant')
      .gte('created_at', timeFilter.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error querying usage:', error);
      return;
    }

    if (!messages || messages.length === 0) {
      console.log(`ℹ️ No assistant messages found in the last ${timeframe}`);
      return;
    }

    // Analyze usage by agent and endpoint
    const usage = {};
    
    messages.forEach(message => {
      const agent = message.chats.chat_agents;
      const model = message.model || 'unknown';
      
      if (!usage[agent.name]) {
        usage[agent.name] = {
          agent,
          emmie: 0,
          assistant: 0,
          unknown: 0,
          models: new Set()
        };
      }
      
      usage[agent.name].models.add(model);
      
      if (model.includes('openai-assistant')) {
        usage[agent.name].assistant++;
      } else if (model.includes('gpt-5') || model.includes('gpt-4') || model.includes('gpt-3.5')) {
        usage[agent.name].emmie++;
      } else {
        usage[agent.name].unknown++;
      }
    });

    console.log(`📊 Usage summary for ${messages.length} messages:\n`);

    Object.values(usage).forEach(agentUsage => {
      const agent = agentUsage.agent;
      const total = agentUsage.emmie + agentUsage.assistant + agentUsage.unknown;
      
      console.log(`🤖 ${agent.name} (${agent.department})`);
      console.log(`   Configuration: ${agent.agent_mode || 'default'}`);
      
      if (agent.openai_assistant_id) {
        console.log(`   Assistant ID: ${agent.openai_assistant_id}`);
      }
      
      console.log(`   Messages: ${total}`);
      console.log(`   🔄 Emmie/GPT: ${agentUsage.emmie} (${Math.round(agentUsage.emmie/total*100)}%)`);
      console.log(`   🎯 Assistant: ${agentUsage.assistant} (${Math.round(agentUsage.assistant/total*100)}%)`);
      
      if (agentUsage.unknown > 0) {
        console.log(`   ❓ Unknown: ${agentUsage.unknown} (${Math.round(agentUsage.unknown/total*100)}%)`);
      }
      
      console.log(`   Models: ${Array.from(agentUsage.models).join(', ')}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Usage analysis error:', error);
  }
}

// Export functions for use in other scripts
module.exports = {
  AgentEndpointMonitor,
  monitorLiveChats,
  queryEndpointUsage
};

// CLI interface
if (require.main === module) {
  const command = process.argv[2] || 'monitor';
  const param = process.argv[3];

  switch (command) {
    case 'monitor':
    case 'watch':
      const monitor = new AgentEndpointMonitor();
      monitor.startMonitoring().catch(console.error);
      break;
      
    case 'live':
      monitorLiveChats().catch(console.error);
      break;
      
    case 'usage':
      const timeframe = param || '1 hour';
      queryEndpointUsage(timeframe).catch(console.error);
      break;
      
    default:
      console.log('🎯 AGENT ENDPOINT MONITOR');
      console.log('========================');
      console.log('');
      console.log('Usage:');
      console.log('  node scripts/monitor-agent-routing.js monitor   # Real-time monitoring');
      console.log('  node scripts/monitor-agent-routing.js live      # Check active chats');
      console.log('  node scripts/monitor-agent-routing.js usage     # Usage analysis (1 hour)');
      console.log('  node scripts/monitor-agent-routing.js usage "2 hours"  # Custom timeframe');
      console.log('');
      console.log('Examples:');
      console.log('  node scripts/monitor-agent-routing.js usage "30 minutes"');
      console.log('  node scripts/monitor-agent-routing.js usage "1 day"');
  }
}
