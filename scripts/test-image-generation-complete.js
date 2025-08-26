// Test script to verify image generation functionality
const OpenAI = require('openai');

// Load environment variables - prioritize .env.local over .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // fallback to .env if .env.local doesn't exist

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

// Simple image detection function for testing
function detectImageGenerationRequest(message, recentMessages = []) {
  const lowerMessage = message.toLowerCase().trim();
  
  const primaryTriggers = [
    'generate an image',
    'create an image',
    'make an image',
    'draw',
    'illustrate',
    'create a diagram',
    'show me a picture',
    'generate a graphic',
    'create a visual',
    'make a picture',
    'image of',
    'picture of'
  ];
  
  return primaryTriggers.some(trigger => lowerMessage.includes(trigger));
}

async function testImageGeneration() {
  console.log('🧪 Testing Image Generation System...\n');

  // Test 1: Environment Setup
  console.log('=== Test 1: Environment Setup ===');
  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ OPENAI_API_KEY not found in environment');
    return;
  } else {
    console.log('✅ OPENAI_API_KEY found');
  }

  // Test 2: Image Detection
  console.log('\n=== Test 2: Image Detection Logic ===');
  const testMessages = [
    "generate an image of a cat",
    "make the sky blue", 
    "create a diagram of network architecture",
    "Hello, how are you?",
    "can you help me debug this code?"
  ];

  const conversationHistory = [
    { role: 'assistant', content: 'I\'ve generated an image for you', messageType: 'image' }
  ];

  testMessages.forEach(msg => {
    const isImageRequest = detectImageGenerationRequest(msg, conversationHistory);
    console.log(`"${msg}" -> ${isImageRequest ? '✅ IMAGE' : '❌ TEXT'}`);
  });

  // Test 3: Direct OpenAI Image Generation with DALL-E 3
  console.log('\n=== Test 3: DALL-E 3 API Test ===');
  try {
    console.log('Testing with dall-e-3...');
    const directResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: 'A simple test image of a blue circle on white background',
      size: '1024x1024',
      response_format: 'b64_json',
      n: 1
    });
    
    if (directResponse.data?.[0]?.b64_json) {
      console.log('✅ DALL-E 3 API working - image generated');
      console.log(`   Base64 length: ${directResponse.data[0].b64_json.length} chars`);
      console.log(`   Revised prompt: ${directResponse.data[0].revised_prompt || 'N/A'}`);
    } else {
      console.log('❌ DALL-E 3 API failed - no b64_json data');
      console.log('   Response:', JSON.stringify(directResponse.data, null, 2));
    }
  } catch (directError) {
    console.log('❌ DALL-E 3 API failed:', directError.message);
    if (directError.status) console.log(`   Status: ${directError.status}`);
  }

  // Test 4: GPT Image 1 Model
  console.log('\n=== Test 4: GPT Image 1 Model Test ===');
  try {
    console.log('Testing with gpt-image-1...');
    const gptImageResponse = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: 'A simple test image of a red square on white background',
      size: '1024x1024',
      n: 1
    });
    
    if (gptImageResponse.data?.[0]) {
      const imageData = gptImageResponse.data[0];
      if (imageData.b64_json) {
        console.log('✅ GPT Image 1 returned base64 data');
        console.log(`   Base64 length: ${imageData.b64_json.length} chars`);
      } else if (imageData.url) {
        console.log('✅ GPT Image 1 returned URL:', imageData.url);
        
        // Test URL to base64 conversion
        try {
          const response = await fetch(imageData.url);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const base64Data = Buffer.from(arrayBuffer).toString('base64');
            console.log(`✅ URL to base64 conversion successful: ${base64Data.length} chars`);
          } else {
            console.log(`❌ Failed to fetch image: ${response.status} ${response.statusText}`);
          }
        } catch (fetchError) {
          console.log('❌ URL to base64 conversion failed:', fetchError.message);
        }
      } else {
        console.log('❌ GPT Image 1 returned no usable image data');
        console.log('   Response:', JSON.stringify(imageData, null, 2));
      }
    } else {
      console.log('❌ GPT Image 1 returned no data');
    }
  } catch (gptImageError) {
    console.log('❌ GPT Image 1 failed:', gptImageError.message);
    if (gptImageError.status === 403) {
      console.log('   💡 This might require organization verification');
    } else if (gptImageError.status === 404) {
      console.log('   💡 Model may not be available to your organization');
    }
    if (gptImageError.status) console.log(`   Status: ${gptImageError.status}`);
  }

  // Test 5: DALL-E 2 Fallback
  console.log('\n=== Test 5: DALL-E 2 Fallback Test ===');
  try {
    console.log('Testing with dall-e-2...');
    const dalle2Response = await openai.images.generate({
      model: 'dall-e-2',
      prompt: 'A simple test image of a green triangle',
      size: '1024x1024',
      response_format: 'b64_json',
      n: 1
    });
    
    if (dalle2Response.data?.[0]?.b64_json) {
      console.log('✅ DALL-E 2 API working - image generated');
      console.log(`   Base64 length: ${dalle2Response.data[0].b64_json.length} chars`);
    } else {
      console.log('❌ DALL-E 2 API failed - no b64_json data');
    }
  } catch (dalle2Error) {
    console.log('❌ DALL-E 2 API failed:', dalle2Error.message);
    if (dalle2Error.status) console.log(`   Status: ${dalle2Error.status}`);
  }

  // Test 6: Check Package.json and Dependencies
  console.log('\n=== Test 6: Dependencies Check ===');
  try {
    const packageJson = require('../package.json');
    console.log(`OpenAI SDK version: ${packageJson.dependencies?.openai || 'Not found'}`);
    console.log(`Node.js version: ${process.version}`);
    
    // Check if we're in a Next.js environment
    if (packageJson.dependencies?.next) {
      console.log(`Next.js version: ${packageJson.dependencies.next}`);
    }
    
    console.log('✅ Dependencies check complete');
    
  } catch (depError) {
    console.log('❌ Dependencies check failed:', depError.message);
  }

  // Test 7: Simple Fallback System Test
  console.log('\n=== Test 7: Simple Fallback System ===');
  const models = ['gpt-image-1', 'dall-e-3', 'dall-e-2'];
  let successfulModel = null;
  
  for (const model of models) {
    try {
      console.log(`Trying ${model}...`);
      const params = {
        model: model,
        prompt: 'A simple test: yellow star on blue background',
        size: '1024x1024',
        n: 1
      };
      
      // Add response_format for models that support it
      if (model === 'dall-e-3' || model === 'dall-e-2') {
        params.response_format = 'b64_json';
      }
      
      const response = await openai.images.generate(params);
      
      if (response.data?.[0]) {
        console.log(`✅ ${model} succeeded!`);
        successfulModel = model;
        
        const imageData = response.data[0];
        if (imageData.b64_json) {
          console.log(`   Got base64 data: ${imageData.b64_json.length} chars`);
        } else if (imageData.url) {
          console.log(`   Got URL: ${imageData.url}`);
        }
        break;
      }
    } catch (error) {
      console.log(`❌ ${model} failed: ${error.message}`);
      continue;
    }
  }
  
  if (successfulModel) {
    console.log(`\n🎉 Fallback system working! Best model: ${successfulModel}`);
  } else {
    console.log('\n💥 All models failed in fallback test');
  }

  console.log('\n🏁 Image Generation Test Complete');
  console.log('\n📋 Summary:');
  console.log('- If DALL-E 3 works: Primary model is functional');
  console.log('- If GPT Image 1 works: Advanced features available'); 
  console.log('- If DALL-E 2 works: Basic fallback is available');
  console.log('- If all fail: Check API key and organization settings');
}

// Run the test
testImageGeneration().catch(console.error);
