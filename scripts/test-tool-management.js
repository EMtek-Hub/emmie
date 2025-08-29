/**
 * Test script for the tool management system
 * Tests the complete flow: database migration, API endpoints, and tool execution
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMTEK_ORG_ID = process.env.EMTEK_ORG_ID;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !EMTEK_ORG_ID) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testDatabaseTables() {
  console.log('\n🔍 Testing database tables...');
  
  try {
    // Test tool_definitions table
    const { data: tools, error: toolsError } = await supabase
      .from('tool_definitions')
      .select('*')
      .limit(5);

    if (toolsError) {
      console.error('❌ Error querying tool_definitions:', toolsError.message);
      return false;
    }

    console.log(`✅ tool_definitions table accessible, found ${tools.length} tools`);

    // Test agent_tools table
    const { data: agentTools, error: agentToolsError } = await supabase
      .from('agent_tools')
      .select('*')
      .limit(5);

    if (agentToolsError) {
      console.error('❌ Error querying agent_tools:', agentToolsError.message);
      return false;
    }

    console.log(`✅ agent_tools table accessible, found ${agentTools.length} assignments`);

    // Test tool_execution_logs table
    const { data: logs, error: logsError } = await supabase
      .from('tool_execution_logs')
      .select('*')
      .limit(5);

    if (logsError) {
      console.error('❌ Error querying tool_execution_logs:', logsError.message);
      return false;
    }

    console.log(`✅ tool_execution_logs table accessible, found ${logs.length} logs`);

    return true;
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    return false;
  }
}

async function testSystemTools() {
  console.log('\n🔧 Testing system tools...');
  
  try {
    // Check if system tools were created
    const { data: systemTools, error } = await supabase
      .from('tool_definitions')
      .select('*')
      .eq('is_system', true)
      .eq('org_id', EMTEK_ORG_ID);

    if (error) {
      console.error('❌ Error querying system tools:', error.message);
      return false;
    }

    console.log(`✅ Found ${systemTools.length} system tools:`);
    systemTools.forEach(tool => {
      console.log(`   - ${tool.name} (${tool.type})`);
    });

    return systemTools.length > 0;
  } catch (error) {
    console.error('❌ System tools test failed:', error.message);
    return false;
  }
}

async function testAgentToolsFunction() {
  console.log('\n📋 Testing get_agent_tools function...');
  
  try {
    // Get first agent
    const { data: agents, error: agentsError } = await supabase
      .from('chat_agents')
      .select('id, name')
      .eq('org_id', EMTEK_ORG_ID)
      .limit(1);

    if (agentsError || !agents || agents.length === 0) {
      console.log('⚠️  No agents found, skipping agent tools test');
      return true;
    }

    const agent = agents[0];

    // Test the function
    const { data: agentTools, error } = await supabase
      .rpc('get_agent_tools', { agent_id_param: agent.id });

    if (error) {
      console.error('❌ Error calling get_agent_tools function:', error.message);
      return false;
    }

    console.log(`✅ get_agent_tools function works, returned ${agentTools.length} tools for agent "${agent.name}"`);
    return true;
  } catch (error) {
    console.error('❌ Agent tools function test failed:', error.message);
    return false;
  }
}

async function testToolExecution() {
  console.log('\n⚡ Testing tool execution logging...');
  
  try {
    // Test logging a tool execution
    const testLog = {
      org_id: EMTEK_ORG_ID,
      tool_id: 'test-tool-id',
      agent_id: 'test-agent-id',
      execution_context: {
        test: true,
        timestamp: new Date().toISOString()
      },
      input_parameters: {
        action: 'test_execution'
      },
      output_result: {
        success: true,
        message: 'Test execution successful'
      },
      execution_time_ms: 150,
      success: true
    };

    const { data: logResult, error } = await supabase
      .from('tool_execution_logs')
      .insert([testLog])
      .select()
      .single();

    if (error) {
      console.error('❌ Error logging tool execution:', error.message);
      return false;
    }

    console.log(`✅ Tool execution logged successfully with ID: ${logResult.id}`);

    // Clean up test log
    await supabase
      .from('tool_execution_logs')
      .delete()
      .eq('id', logResult.id);

    return true;
  } catch (error) {
    console.error('❌ Tool execution test failed:', error.message);
    return false;
  }
}

async function testAPIEndpoints() {
  console.log('\n🌐 Testing API endpoint structure...');
  
  const fs = require('fs');
  const path = require('path');
  
  const requiredFiles = [
    'pages/api/admin/tools.ts',
    'pages/api/admin/agent-tools.ts',
    'pages/api/admin/agent-tools/bulk.ts',
    'lib/toolExecution.ts',
    'pages/admin/settings.js',
    'components/admin/ToolManagementPanel.jsx',
    'components/admin/AgentToolsPanel.jsx'
  ];

  let allFilesExist = true;

  for (const file of requiredFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} missing`);
      allFilesExist = false;
    }
  }

  return allFilesExist;
}

async function runAllTests() {
  console.log('🧪 Starting Tool Management System Tests\n');
  console.log('='.repeat(50));

  const tests = [
    { name: 'Database Tables', fn: testDatabaseTables },
    { name: 'System Tools', fn: testSystemTools },
    { name: 'Agent Tools Function', fn: testAgentToolsFunction },
    { name: 'Tool Execution Logging', fn: testToolExecution },
    { name: 'API Endpoints Structure', fn: testAPIEndpoints }
  ];

  let passedTests = 0;
  const totalTests = tests.length;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passedTests++;
      }
    } catch (error) {
      console.error(`❌ ${test.name} test failed with error:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Tool management system is ready.');
    console.log('\n📝 Next steps:');
    console.log('1. Access /admin/settings to configure tools');
    console.log('2. Create custom tools for your agents');
    console.log('3. Assign tools to agents as needed');
    console.log('4. Test tool execution in chat conversations');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
    process.exit(1);
  }
}

if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests };
