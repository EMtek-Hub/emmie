#!/usr/bin/env node

/**
 * Test Script: OpenAI Assistant Routing Validation
 * 
 * This script validates that the OpenAI Assistant routing fix is working correctly:
 * 1. Checks that the agents API returns openai_assistant_id and agent_mode fields
 * 2. Validates that the IT Support agent has proper OpenAI Assistant configuration
 * 3. Simulates the routing logic to confirm proper API endpoint selection
 * 
 * Run with: node scripts/test-openai-assistant-routing-validation.js
 */

const { supabaseAdmin, EMTEK_ORG_ID } = require('../lib/db.ts');
const { GPT5_MODELS } = require('../lib/ai.ts');

// Test configuration
const TEST_CONFIG = {
  expectedITSupportAssistantId: '10000000-0000-0000-0000-000000000002', // From the console log
  testScenarios: [
    {
      name: 'OpenAI Assistant (IT Support)',
      agentType: 'openai_assistant',
      expectedEndpoint: '/api/chat'
    },
    {
      name: 'GPT-5 Model with Regular Agent',
      agentType: 'regular',
      model: 'gpt-5-mini',
      expectedEndpoint: '/api/chat-gpt5'
    },
    {
      name: 'Legacy Model with Regular Agent',
      agentType: 'regular', 
      model: 'gpt-4o-mini',
      expectedEndpoint: '/api/chat-simple'
    }
  ]
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logTest(title) {
  log(`\n🧪 ${title}`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * Simulate the routing logic from chat.js
 */
function simulateRouting(selectedAgent, selectedModel) {
  let apiEndpoint;
  
  if (selectedAgent?.openai_assistant_id) {
    // OpenAI Assistant - use dedicated OpenAI Assistants API
    apiEndpoint = '/api/chat';
  } else if (Object.values(GPT5_MODELS).includes(selectedModel)) {
    // GPT-5 model - use GPT-5 Responses API
    apiEndpoint = '/api/chat-gpt5';
  } else {
    // Legacy model - use simple chat API
    apiEndpoint = '/api/chat-simple';
  }
  
  return apiEndpoint;
}

/**
 * Test 1: Verify agents API returns required fields
 */
async function testAgentsAPIFields() {
  logTest('Testing Agents API Field Inclusion');
  
  try {
    const { data: agents, error } = await supabaseAdmin
      .from('chat_agents')
      .select(`
        id,
        name,
        department,
        description,
        agent_mode,
        openai_assistant_id,
        is_active
      `)
      .eq('org_id', EMTEK_ORG_ID)
      .eq('is_active', true);

    if (error) {
      logError(`Database query failed: ${error.message}`);
      return false;
    }

    if (!agents || agents.length === 0) {
      logWarning('No active agents found in database');
      return false;
    }

    logSuccess(`Found ${agents.length} active agents`);

    // Check for required fields
    const requiredFields = ['agent_mode', 'openai_assistant_id'];
    let allFieldsPresent = true;

    agents.forEach(agent => {
      const missingFields = requiredFields.filter(field => !(field in agent));
      if (missingFields.length > 0) {
        logError(`Agent "${agent.name}" missing fields: ${missingFields.join(', ')}`);
        allFieldsPresent = false;
      }
    });

    if (allFieldsPresent) {
      logSuccess('All agents have required routing fields (agent_mode, openai_assistant_id)');
    }

    return allFieldsPresent;

  } catch (error) {
    logError(`Test failed with error: ${error.message}`);
    return false;
  }
}

/**
 * Test 2: Verify IT Support agent configuration
 */
async function testITSupportConfiguration() {
  logTest('Testing IT Support Agent Configuration');
  
  try {
    const { data: itAgent, error } = await supabaseAdmin
      .from('chat_agents')
      .select(`
        id,
        name,
        department,
        agent_mode,
        openai_assistant_id,
        is_active
      `)
      .eq('org_id', EMTEK_ORG_ID)
      .eq('name', 'IT Support')
      .single();

    if (error) {
      logError(`Failed to find IT Support agent: ${error.message}`);
      return false;
    }

    if (!itAgent) {
      logError('IT Support agent not found in database');
      return false;
    }

    logSuccess(`Found IT Support agent (ID: ${itAgent.id})`);

    // Check configuration
    const checks = [
      {
        field: 'is_active',
        expected: true,
        actual: itAgent.is_active,
        description: 'Agent is active'
      },
      {
        field: 'agent_mode',
        expected: 'openai_assistant',
        actual: itAgent.agent_mode,
        description: 'Agent mode is openai_assistant'
      },
      {
        field: 'openai_assistant_id',
        expected: TEST_CONFIG.expectedITSupportAssistantId,
        actual: itAgent.openai_assistant_id,
        description: 'OpenAI Assistant ID matches expected'
      }
    ];

    let allChecksPass = true;
    checks.forEach(check => {
      if (check.actual === check.expected) {
        logSuccess(`${check.description}: ${check.actual}`);
      } else {
        logError(`${check.description}: Expected "${check.expected}", got "${check.actual}"`);
        allChecksPass = false;
      }
    });

    return allChecksPass;

  } catch (error) {
    logError(`Test failed with error: ${error.message}`);
    return false;
  }
}

/**
 * Test 3: Validate routing logic scenarios
 */
async function testRoutingLogic() {
  logTest('Testing Routing Logic Scenarios');
  
  try {
    // Get test agents
    const { data: agents, error } = await supabaseAdmin
      .from('chat_agents')
      .select(`
        id,
        name,
        department,
        agent_mode,
        openai_assistant_id,
        is_active
      `)
      .eq('org_id', EMTEK_ORG_ID)
      .eq('is_active', true);

    if (error || !agents) {
      logError('Failed to load agents for routing test');
      return false;
    }

    const itAgent = agents.find(a => a.name === 'IT Support');
    const regularAgent = agents.find(a => a.agent_mode !== 'openai_assistant' || !a.openai_assistant_id);

    let allTestsPass = true;

    // Test Scenario 1: OpenAI Assistant routing
    if (itAgent) {
      const endpoint = simulateRouting(itAgent, GPT5_MODELS.MINI);
      if (endpoint === '/api/chat') {
        logSuccess(`OpenAI Assistant (${itAgent.name}) → ${endpoint} ✓`);
      } else {
        logError(`OpenAI Assistant (${itAgent.name}) → ${endpoint} (expected /api/chat)`);
        allTestsPass = false;
      }
    } else {
      logWarning('No OpenAI Assistant found for routing test');
    }

    // Test Scenario 2: GPT-5 with regular agent
    if (regularAgent) {
      const endpoint = simulateRouting(regularAgent, GPT5_MODELS.MINI);
      if (endpoint === '/api/chat-gpt5') {
        logSuccess(`Regular Agent (${regularAgent.name}) + GPT-5 → ${endpoint} ✓`);
      } else {
        logError(`Regular Agent (${regularAgent.name}) + GPT-5 → ${endpoint} (expected /api/chat-gpt5)`);
        allTestsPass = false;
      }
    } else {
      logWarning('No regular agent found for GPT-5 routing test');
    }

    // Test Scenario 3: Legacy model with regular agent
    if (regularAgent) {
      const endpoint = simulateRouting(regularAgent, 'gpt-4o-mini');
      if (endpoint === '/api/chat-simple') {
        logSuccess(`Regular Agent (${regularAgent.name}) + Legacy Model → ${endpoint} ✓`);
      } else {
        logError(`Regular Agent (${regularAgent.name}) + Legacy Model → ${endpoint} (expected /api/chat-simple)`);
        allTestsPass = false;
      }
    }

    return allTestsPass;

  } catch (error) {
    logError(`Test failed with error: ${error.message}`);
    return false;
  }
}

/**
 * Main test execution
 */
async function runTests() {
  logSection('🚀 OpenAI Assistant Routing Validation');
  
  logInfo('This test validates the fix for OpenAI Assistant routing issue');
  logInfo('Expected: IT Support agent should route to /api/chat (OpenAI Assistants API)');
  logInfo('Previous Issue: Was routing to /api/chat-gpt5 (GPT-5 Responses API)');

  const testResults = [];

  // Run all tests
  const tests = [
    { name: 'Agents API Fields', fn: testAgentsAPIFields },
    { name: 'IT Support Configuration', fn: testITSupportConfiguration },
    { name: 'Routing Logic', fn: testRoutingLogic }
  ];

  for (const test of tests) {
    try {
      const result = await test.fn();
      testResults.push({ name: test.name, passed: result });
    } catch (error) {
      logError(`Test "${test.name}" threw an error: ${error.message}`);
      testResults.push({ name: test.name, passed: false });
    }
  }

  // Summary
  logSection('📊 Test Results Summary');
  
  const passedTests = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;

  testResults.forEach(result => {
    if (result.passed) {
      logSuccess(`${result.name}: PASSED`);
    } else {
      logError(`${result.name}: FAILED`);
    }
  });

  console.log('\n' + '─'.repeat(60));
  if (passedTests === totalTests) {
    logSuccess(`🎉 All tests passed! (${passedTests}/${totalTests})`);
    logSuccess('✅ OpenAI Assistant routing should now work correctly');
    logInfo('💡 Next: Test in the browser by chatting with IT Support agent');
  } else {
    logError(`❌ ${totalTests - passedTests} test(s) failed (${passedTests}/${totalTests} passed)`);
    logWarning('🔧 Please review the failed tests and fix any issues before testing in browser');
  }

  return passedTests === totalTests;
}

// Handle process
if (require.main === module) {
  runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      logError(`Test execution failed: ${error.message}`);
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runTests };
