const https = require('https');
const http = require('http');

// Test configuration
const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
const TEST_USER_ID = 'test-user-gpt5';
const TEST_ORG_ID = process.env.EMTEK_ORG_ID || 'emtek-org-id';

// Test cases for GPT-5 integration
const testCases = [
  {
    name: 'Simple Text Response (GPT-5 Nano)',
    input: 'Hello, how are you?',
    expectedModel: 'gpt-5-nano',
    expectsImageGeneration: false,
    expectsToolCall: false
  },
  {
    name: 'Image Generation Request (GPT-5 Mini)',
    input: 'Generate an image of a modern office workspace',
    expectedModel: 'gpt-5-mini',
    expectsImageGeneration: true,
    expectsToolCall: false
  },
  {
    name: 'Complex Code Task (GPT-5 Full)',
    input: 'Debug this JavaScript function that has a memory leak and analyze the performance issues',
    expectedModel: 'gpt-5',
    expectsImageGeneration: false,
    expectsToolCall: false
  },
  {
    name: 'Image Modification Request',
    input: 'Make the clouds in the sky green and add more trees',
    expectedModel: 'gpt-5-mini',
    expectsImageGeneration: true,
    expectsToolCall: false
  },
  {
    name: 'Document Search Tool Call',
    input: 'Search for EMtek security policies about password requirements',
    expectedModel: 'gpt-5-mini',
    expectsImageGeneration: false,
    expectsToolCall: true,
    expectedTool: 'document_search'
  }
];

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.hostname === 'localhost' ? http : https;
    
    const req = protocol.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk.toString();
      });
      
      res.on('end', () => {
        try {
          if (res.headers['content-type']?.includes('application/json')) {
            resolve({
              status: res.statusCode,
              data: JSON.parse(responseData),
              headers: res.headers
            });
          } else {
            resolve({
              status: res.statusCode,
              data: responseData,
              headers: res.headers
            });
          }
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: responseData,
            headers: res.headers
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    
    req.end();
  });
}

// Parse Server-Sent Events
function parseSSEEvents(sseData) {
  const events = [];
  const lines = sseData.split('\n');
  let currentEvent = {};
  
  for (const line of lines) {
    if (line.startsWith('event: ')) {
      currentEvent.event = line.substring(7);
    } else if (line.startsWith('data: ')) {
      try {
        currentEvent.data = JSON.parse(line.substring(6));
      } catch (e) {
        currentEvent.data = line.substring(6);
      }
    } else if (line.trim() === '' && currentEvent.event) {
      events.push({ ...currentEvent });
      currentEvent = {};
    }
  }
  
  return events;
}

// Test GPT-5 chat endpoint
async function testGPT5Chat(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`📝 Input: "${testCase.input}"`);
  
  try {
    const url = new URL(`${BASE_URL}/api/chat`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    };
    
    const requestData = {
      messages: [
        { role: 'user', content: testCase.input }
      ],
      mode: 'normal'
    };
    
    // Add agent ID for document search test
    if (testCase.expectedTool === 'document_search') {
      requestData.agentId = 'test-agent-id';
    }
    
    const response = await makeRequest(options, requestData);
    
    if (response.status !== 200) {
      console.log(`❌ HTTP Error: ${response.status}`);
      console.log(`   Response: ${response.data}`);
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    // Parse SSE events
    const events = parseSSEEvents(response.data);
    
    // Analyze events
    const tokenEvents = events.filter(e => e.event === 'token');
    const imageEvents = events.filter(e => e.event === 'image_generated');
    const toolCallEvents = events.filter(e => e.event === 'tool_call_start');
    const doneEvents = events.filter(e => e.event === 'done');
    
    console.log(`📊 Events received:`);
    console.log(`   - Token events: ${tokenEvents.length}`);
    console.log(`   - Image events: ${imageEvents.length}`);
    console.log(`   - Tool call events: ${toolCallEvents.length}`);
    console.log(`   - Done events: ${doneEvents.length}`);
    
    // Build response content
    const responseContent = tokenEvents.map(e => e.data.delta).join('');
    console.log(`💬 Response content: "${responseContent.substring(0, 100)}..."`);
    
    // Verify expectations
    const results = {
      success: true,
      modelUsed: 'detected from logs', // We'd need to parse console logs for this
      hasImageGeneration: imageEvents.length > 0,
      hasToolCall: toolCallEvents.length > 0,
      toolUsed: toolCallEvents.length > 0 ? toolCallEvents[0].data.toolName : null,
      responseLength: responseContent.length,
      errors: []
    };
    
    // Check image generation expectation
    if (testCase.expectsImageGeneration && !results.hasImageGeneration) {
      results.errors.push('Expected image generation but none occurred');
    } else if (!testCase.expectsImageGeneration && results.hasImageGeneration) {
      results.errors.push('Unexpected image generation occurred');
    }
    
    // Check tool call expectation
    if (testCase.expectsToolCall && !results.hasToolCall) {
      results.errors.push('Expected tool call but none occurred');
    } else if (!testCase.expectsToolCall && results.hasToolCall) {
      results.errors.push('Unexpected tool call occurred');
    }
    
    // Check specific tool
    if (testCase.expectedTool && results.toolUsed !== testCase.expectedTool) {
      results.errors.push(`Expected tool '${testCase.expectedTool}' but got '${results.toolUsed}'`);
    }
    
    // Check if response was generated
    if (responseContent.length === 0) {
      results.errors.push('No response content generated');
    }
    
    if (results.errors.length > 0) {
      console.log(`❌ Test failed:`);
      results.errors.forEach(error => console.log(`   - ${error}`));
      results.success = false;
    } else {
      console.log(`✅ Test passed!`);
    }
    
    return results;
    
  } catch (error) {
    console.log(`❌ Test error: ${error.message}`);
    console.log(`   Full error:`, error);
    return { success: false, error: error.message };
  }
}

// Test image generation endpoint directly
async function testImageGeneration() {
  console.log(`\n🎨 Testing Image Generation API directly`);
  
  try {
    const url = new URL(`${BASE_URL}/api/images/generate`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const requestData = {
      prompt: 'A futuristic office building with glass walls',
      chatId: 'test-chat-id'
    };
    
    const response = await makeRequest(options, requestData);
    
    if (response.status === 200 && response.data.url) {
      console.log(`✅ Image generation successful`);
      console.log(`   📷 URL: ${response.data.url}`);
      console.log(`   🤖 Model: ${response.data.modelUsed || 'not reported'}`);
      return { success: true, url: response.data.url };
    } else {
      console.log(`❌ Image generation failed`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data)}`);
      return { success: false, error: response.data };
    }
    
  } catch (error) {
    console.log(`❌ Image generation error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting GPT-5 Integration Tests');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`👤 Test User: ${TEST_USER_ID}`);
  
  const results = {
    totalTests: testCases.length + 1, // +1 for image generation test
    passedTests: 0,
    failedTests: 0,
    errors: []
  };
  
  // Test image generation endpoint first
  const imageTest = await testImageGeneration();
  if (imageTest.success) {
    results.passedTests++;
  } else {
    results.failedTests++;
    results.errors.push(`Image Generation: ${imageTest.error}`);
  }
  
  // Test each GPT-5 chat case
  for (const testCase of testCases) {
    const result = await testGPT5Chat(testCase);
    if (result.success) {
      results.passedTests++;
    } else {
      results.failedTests++;
      results.errors.push(`${testCase.name}: ${result.error || 'Test failed'}`);
    }
    
    // Wait between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('=' .repeat(50));
  console.log(`Total Tests: ${results.totalTests}`);
  console.log(`✅ Passed: ${results.passedTests}`);
  console.log(`❌ Failed: ${results.failedTests}`);
  console.log(`📈 Success Rate: ${Math.round((results.passedTests / results.totalTests) * 100)}%`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(error => console.log(`   - ${error}`));
  }
  
  if (results.passedTests === results.totalTests) {
    console.log('\n🎉 All tests passed! GPT-5 integration is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
  
  return results;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, testGPT5Chat, testImageGeneration };
