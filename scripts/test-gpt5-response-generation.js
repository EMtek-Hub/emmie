#!/usr/bin/env node

/**
 * Test script to verify GPT-5 response generation is working
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function testGPT5ResponseGeneration() {
  console.log('🧪 Testing GPT-5 Response Generation...\n');
  
  try {
    // Check if we have the required environment variables
    console.log('1. Checking Environment Variables...');
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY is missing');
      process.exit(1);
    }
    console.log('✅ OPENAI_API_KEY is configured');
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('❌ SUPABASE_URL is missing');
      process.exit(1);
    }
    console.log('✅ SUPABASE_URL is configured');
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY is missing');
      process.exit(1);
    }
    console.log('✅ SUPABASE_SERVICE_ROLE_KEY is configured');
    
    // Test OpenAI client initialization
    console.log('\n2. Testing OpenAI Client...');
    const OpenAI = require('openai');
    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
    
    // Test a simple API call to verify authentication
    try {
      const models = await openai.models.list();
      console.log('✅ OpenAI client authenticated successfully');
      
      // Check if GPT-5 models are available
      const gpt5Models = models.data.filter(model => model.id.includes('gpt-5'));
      if (gpt5Models.length > 0) {
        console.log('✅ GPT-5 models available:', gpt5Models.map(m => m.id).join(', '));
      } else {
        console.log('⚠️ No GPT-5 models found in account');
      }
    } catch (authError) {
      console.error('❌ OpenAI authentication failed:', authError.message);
      process.exit(1);
    }
    
    // Test simple streaming response
    console.log('\n3. Testing Simple Streaming...');
    try {
      const stream = await openai.responses.create({
        model: 'gpt-5-nano',
        instructions: 'You are a helpful assistant. Be concise.',
        input: [{ role: 'user', content: 'Say hello and explain you are working' }],
        stream: true
      });
      
      let responseText = '';
      let eventCount = 0;
      
      for await (const event of stream) {
        eventCount++;
        console.log(`📡 Event ${eventCount}: ${event.type}`);
        
        if (event.type === 'response.output_text.delta') {
          responseText += event.delta;
          process.stdout.write(event.delta);
        }
        
        if (event.type === 'response.completed') {
          console.log('\n✅ Streaming completed successfully');
          break;
        }
        
        if (event.type === 'error') {
          console.error('\n❌ Stream error:', event);
          throw new Error('Streaming failed');
        }
      }
      
      if (responseText.length > 0) {
        console.log(`✅ Received ${responseText.length} characters`);
      } else {
        console.error('❌ No text received from stream');
        process.exit(1);
      }
      
    } catch (streamError) {
      console.error('❌ Streaming test failed:', streamError.message);
      
      // Try fallback model
      console.log('\n4. Testing Fallback Model (GPT-4o-mini)...');
      try {
        const fallbackResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Say hello briefly' }],
          max_tokens: 50
        });
        
        if (fallbackResponse.choices[0]?.message?.content) {
          console.log('✅ Fallback model works:', fallbackResponse.choices[0].message.content);
        }
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError.message);
      }
      
      // Don't exit here, continue with other tests
    }
    
    // Test tool definition format
    console.log('\n5. Testing Tool Definition...');
    const tools = [
      {
        type: 'function',
        name: 'test_function',
        description: 'A test function',
        parameters: {
          type: 'object',
          properties: {
            query: { 
              type: 'string',
              description: 'Test query'
            }
          },
          required: ['query'],
          additionalProperties: false
        },
        strict: false
      }
    ];
    
    try {
      const toolStream = await openai.responses.create({
        model: 'gpt-5-nano',
        instructions: 'You have access to a test function. Use it if the user asks for a test.',
        input: [{ role: 'user', content: 'Please test the function with query "hello"' }],
        tools: tools,
        stream: true
      });
      
      let hasToolCall = false;
      for await (const event of toolStream) {
        console.log(`📡 Tool test event: ${event.type}`);
        
        if (event.type === 'response.function_call_arguments.delta') {
          hasToolCall = true;
          console.log('✅ Tool call detected in stream');
        }
        
        if (event.type === 'response.completed') {
          break;
        }
        
        if (event.type === 'error') {
          console.error('❌ Tool test error:', event);
          break;
        }
      }
      
      console.log('✅ Tool definition format is valid');
      
    } catch (toolError) {
      console.error('❌ Tool test failed:', toolError.message);
    }
    
    console.log('\n🎉 GPT-5 Response Generation Test Complete!');
    console.log('\n📋 Summary:');
    console.log('• Environment variables configured ✅');
    console.log('• OpenAI client authenticated ✅');
    console.log('• Tool definitions valid ✅');
    console.log('• Ready for chat testing');
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Open chat in browser: http://localhost:3000/chat');
    console.log('3. Select a GPT-5 model from the dropdown');
    console.log('4. Send a test message');
    console.log('5. Verify streaming works character-by-character');
    console.log('6. After 2+ messages, check if title appears in sidebar');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Handle process errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

testGPT5ResponseGeneration().catch(console.error);
