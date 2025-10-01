// scripts/diagnose-image-generation.js
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

// Helper function to detect image generation requests
function detectImageGenerationRequest(message, recentMessages = []) {
  const lowerMessage = message.toLowerCase().trim();
  
  const primaryTriggers = [
    'generate an image',
    'create an image',
    'make an image',
    'make a image',
    'make image',
    'draw',
    'illustrate',
    'create a diagram',
    'show me a picture',
    'generate a graphic',
    'create a visual',
    'make a picture',
    'create a picture',
    'generate a picture',
    'image of',
    'picture of',
    'photo of'
  ];
  
  return primaryTriggers.some(trigger => lowerMessage.includes(trigger));
}

async function testImageDetection() {
  console.log('🔍 Testing image detection...');
  
  const testCases = [
    'generate an image of a cat',
    'create a picture of a dog', 
    'make an image',
    'hello world',
    'what is the weather like?'
  ];
  
  for (const testCase of testCases) {
    const isImageRequest = detectImageGenerationRequest(testCase);
    console.log(`"${testCase}" -> ${isImageRequest ? '✅ DETECTED' : '❌ NOT DETECTED'}`);
  }
}

async function testOpenAIConnection() {
  console.log('\n🔌 Testing OpenAI connection...');
  
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey || openaiKey.includes('your-openai-api-key')) {
      console.error('❌ OpenAI API key not configured');
      return;
    }
    
    const openai = new OpenAI({ apiKey: openaiKey });
    
    // Test basic API connectivity
    console.log('Testing basic API call...');
    const models = await openai.models.list();
    console.log(`✅ Connected to OpenAI - ${models.data.length} models available`);
    
    // Test if GPT-5 is available
    const gpt5Models = models.data.filter(m => m.id.includes('gpt-5'));
    console.log(`GPT-5 models available: ${gpt5Models.map(m => m.id).join(', ') || 'None'}`);
    
    // Test image models
    const imageModels = models.data.filter(m => m.id.includes('dall-e') || m.id.includes('image'));
    console.log(`Image models available: ${imageModels.map(m => m.id).join(', ') || 'None'}`);
    
  } catch (error) {
    console.error('❌ OpenAI connection test failed:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      type: error.type
    });
  }
}

async function testSupabaseConnection() {
  console.log('\n🗄️ Testing Supabase connection...');
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials not configured');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test basic connection
    const { data, error } = await supabase
      .from('chats')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error);
    } else {
      console.log('✅ Supabase connected successfully');
      
      // Test storage bucket
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      if (bucketError) {
        console.error('❌ Storage bucket test failed:', bucketError);
      } else {
        const mediaBucket = buckets.find(b => b.name === 'media');
        if (mediaBucket) {
          console.log('✅ Media storage bucket found');
        } else {
          console.error('❌ Media storage bucket not found');
          console.log('Available buckets:', buckets.map(b => b.name));
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Supabase test failed:', error);
  }
}

async function testImageGeneration() {
  console.log('\n🎨 Testing image generation with correct Responses API approach...');
  
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey || openaiKey.includes('your-openai-api-key')) {
      console.error('❌ OpenAI API key not configured properly');
      return;
    }
    
    const openai = new OpenAI({ apiKey: openaiKey });
    
    console.log('Testing Responses API with correct approach (gpt-4.1 + tool_choice: auto)...');
    
    try {
      const stream = await openai.responses.create({
        model: 'gpt-4.1',                  // Use gpt-4.1 instead of gpt-5
        tools: [{ type: 'image_generation', partial_images: 2 }],
        tool_choice: 'auto',               // Cannot force on gpt-5, use auto
        instructions: 'Generate a simple test image',
        input: [{ role: 'user', content: [{ type: 'input_text', text: 'a simple red cat' }]}],
        stream: true,
      });
      
      console.log('✅ Responses API stream created successfully');
      
      let finalImageB64;
      let eventCount = 0;
      
      for await (const e of stream) {
        eventCount++;
        console.log(`📡 Stream event ${eventCount}: ${e.type}`);
        
        if (e.type === 'response.image_generation_call.partial_image') {
          // Correct event name for preview frames
          console.log(`  🖼️ Preview #${e.partial_image_index} (${e.partial_image_b64?.length || 0} bytes)`);
        } else if (e.type === 'response.completed') {
          // Find the completed image in the output items
          const out = e.response?.output ?? [];
          for (const item of out) {
            if (item.type === 'image_generation_call' && item.status === 'completed' && item.result) {
              finalImageB64 = item.result; // base64 of the final image
              console.log(`  ✅ Final image: ${finalImageB64.length} bytes`);
            }
          }
          break;
        } else if (e.type === 'response.error') {
          console.error('  ❌ Image gen error:', e.error?.message);
          break;
        }
        
        // Don't stop early - let it complete naturally
        // if (eventCount > 15) {
        //   console.log('  ⏹️ Stopping test early (stream working)');
        //   break;
        // }
      }

      if (!finalImageB64) {
        console.error('❌ No final image received from streaming');
        return;
      }
      
      console.log('✅ Responses API streaming test completed successfully');
      
    } catch (apiError) {
      console.error('❌ Responses API test failed:', apiError.message);
      console.error('  Status:', apiError.status);
      console.error('  Type:', apiError.type);
      
      // Test fallback with Direct Images API
      console.log('\nTesting fallback Direct Images API...');
      try {
        const response = await openai.images.generate({
          model: 'gpt-image-1',
          prompt: 'a simple red cat',
          size: '1024x1024',
          n: 1,
          response_format: 'b64_json'
        });
        
        if (response.data && response.data[0] && response.data[0].b64_json) {
          console.log('✅ Direct Images API works, image generated:', response.data[0].b64_json.length, 'bytes');
        }
      } catch (fallbackError) {
        console.error('❌ Direct Images API also failed:', fallbackError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Image generation test failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack?.split('\n')[0],
      name: error.name
    });
  }
}

async function testChatEndpointRouting() {
  console.log('\n🌐 Testing chat endpoint routing logic...');
  
  try {
    const testMessage = 'generate an image of a cat';
    const isDetected = detectImageGenerationRequest(testMessage);
    console.log(`Image request detection: ${isDetected ? '✅ WORKING' : '❌ NOT WORKING'}`);
    
    if (isDetected) {
      console.log('✅ Message would route to image generation in chat-gpt5.ts');
    } else {
      console.log('❌ Message would NOT route to image generation - detection logic failed');
    }
    
  } catch (error) {
    console.error('❌ Endpoint routing test failed:', error);
  }
}

async function main() {
  console.log('🚀 Starting image generation diagnostic...\n');
  
  await testImageDetection();
  await testChatEndpointRouting();
  await testOpenAIConnection();
  await testSupabaseConnection();
  await testImageGeneration();
  
  console.log('\n🏁 Diagnostic complete');
  console.log('\n💡 If Responses API failed but Direct Images API worked,');
  console.log('   the issue is likely that GPT-5 Responses API is not available yet.');
  console.log('   You may need to fall back to Direct Images API for now.');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testImageDetection,
  testImageGeneration,
  testOpenAIConnection,
  testSupabaseConnection,
  testChatEndpointRouting
};
