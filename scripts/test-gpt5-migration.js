#!/usr/bin/env node

/**
 * Test script for GPT-5 migration verification
 * Tests all migrated endpoints to ensure they work with the new GPT-5 Responses API
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

// Import fetch for Node.js
const fetch = require('node-fetch');

const ENDPOINTS_TO_TEST = [
  {
    name: 'Chat Simple (GPT-5 Nano)',
    endpoint: '/api/chat-simple',
    method: 'POST',
    payload: {
      messages: [
        { role: 'user', content: 'Hello, test the simple chat endpoint.' }
      ]
    }
  },
  {
    name: 'Title Generation (GPT-5 Nano)', 
    endpoint: '/api/chats/{chatId}/generate-title',
    method: 'POST',
    payload: {},
    requiresChatId: true
  },
  {
    name: 'GPT-5 Chat with Tools',
    endpoint: '/api/chat-gpt5',
    method: 'POST',
    payload: {
      messages: [
        { role: 'user', content: 'Can you help me with project management?' }
      ]
    }
  }
];

async function testEndpoint(test) {
  console.log(`\n🧪 Testing: ${test.name}`);
  console.log(`📍 Endpoint: ${test.endpoint}`);
  
  try {
    let url = `${process.env.APP_BASE_URL || 'http://localhost:3000'}${test.endpoint}`;
    
    // Handle endpoints that need a chat ID
    if (test.requiresChatId) {
      // For title generation, we need to create a chat first
      console.log('   🔧 Creating test chat first...');
      
      const chatResponse = await fetch(`${process.env.APP_BASE_URL || 'http://localhost:3000'}/api/chat-simple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': process.env.TEST_SESSION_COOKIE || ''
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Test message for title generation' },
            { role: 'assistant', content: 'This is a test conversation about project planning and development.' }
          ]
        })
      });
      
      if (!chatResponse.ok) {
        throw new Error(`Failed to create test chat: ${chatResponse.status}`);
      }
      
      // Read the SSE stream to get chat ID
      const reader = chatResponse.body?.getReader();
      const decoder = new TextDecoder();
      let chatId = null;
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const text = decoder.decode(value);
          const lines = text.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.chatId && !data.chatId.startsWith('temp-')) {
                  chatId = data.chatId;
                  break;
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
          
          if (chatId) break;
        }
        reader.releaseLock();
      }
      
      if (!chatId) {
        throw new Error('Could not extract chat ID from response');
      }
      
      console.log(`   ✅ Created test chat: ${chatId}`);
      url = url.replace('{chatId}', chatId);
    }
    
    const response = await fetch(url, {
      method: test.method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': process.env.TEST_SESSION_COOKIE || ''
      },
      body: JSON.stringify(test.payload)
    });
    
    console.log(`   📊 Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    // Handle different response types
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('text/event-stream')) {
      // SSE response - read the stream
      console.log('   📡 Reading SSE stream...');
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let chunks = [];
      let hasContent = false;
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const text = decoder.decode(value);
          chunks.push(text);
          
          // Look for actual content
          if (text.includes('data: ') && text.includes('delta')) {
            hasContent = true;
          }
        }
        reader.releaseLock();
      }
      
      console.log(`   ✅ Stream completed (${chunks.length} chunks received)`);
      if (hasContent) {
        console.log('   ✅ Contains response content');
      }
      
    } else if (contentType.includes('application/json')) {
      // JSON response
      const data = await response.json();
      console.log('   ✅ JSON response received');
      
      if (data.title) {
        console.log(`   📝 Generated title: "${data.title}"`);
      }
      
      if (data.extracted) {
        console.log(`   📊 Extracted knowledge: ${Object.keys(data.extracted).length} categories`);
      }
      
    } else {
      // Other response
      const text = await response.text();
      console.log(`   ✅ Response received (${text.length} chars)`);
    }
    
    console.log(`   ✅ ${test.name} - PASSED`);
    return true;
    
  } catch (error) {
    console.log(`   ❌ ${test.name} - FAILED`);
    console.log(`   💥 Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting GPT-5 Migration Test Suite');
  console.log('=====================================');
  
  // Check environment
  if (!process.env.APP_BASE_URL && !process.env.NEXT_PUBLIC_APP_URL) {
    console.log('⚠️  APP_BASE_URL not set, using http://localhost:3000');
  }
  
  if (!process.env.TEST_SESSION_COOKIE) {
    console.log('⚠️  TEST_SESSION_COOKIE not set - some tests may fail due to auth');
  }
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ OPENAI_API_KEY not set - tests will fail');
    process.exit(1);
  }
  
  let passed = 0;
  let total = ENDPOINTS_TO_TEST.length;
  
  for (const test of ENDPOINTS_TO_TEST) {
    const success = await testEndpoint(test);
    if (success) passed++;
  }
  
  console.log('\n🏁 Test Results');
  console.log('===============');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! GPT-5 migration is working correctly.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});
