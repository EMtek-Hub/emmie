// Test GPT-5 Image Generation Integration
const https = require('https');
const http = require('http');

// Test configuration
const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.TEST_API_KEY || 'your-test-api-key';

async function makeRequest(endpoint, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${endpoint}`);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        ...headers
      }
    };

    const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function testChatImageGeneration() {
  console.log('🧪 Testing GPT-5 Chat Image Generation Integration...\n');

  // Test 1: Simple image generation request
  console.log('Test 1: Simple image generation request');
  try {
    const response = await makeRequest('/api/chat', {
      messages: [
        { role: 'user', content: 'Generate an image of a sunny beach with palm trees' }
      ],
      mode: 'normal'
    });

    console.log('Status:', response.status);
    if (response.status === 200) {
      console.log('✅ Chat API responded successfully');
      
      // Check if response indicates image generation
      const responseText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      if (responseText.includes('image_generation_start') || responseText.includes('image_generated')) {
        console.log('✅ Image generation events detected');
      } else {
        console.log('⚠️ No image generation events found in response');
      }
    } else {
      console.log('❌ Chat API failed:', response.data);
    }
  } catch (error) {
    console.log('❌ Test 1 failed:', error.message);
  }

  console.log('\n---\n');

  // Test 2: Direct image generation API
  console.log('Test 2: Direct image generation API');
  try {
    const response = await makeRequest('/api/images/generate', {
      prompt: 'A modern office building with glass windows at sunset',
      size: 'square',
      quality: 'auto',
      format: 'png'
    });

    console.log('Status:', response.status);
    if (response.status === 200) {
      console.log('✅ Direct image generation API succeeded');
      if (response.data.url) {
        console.log('✅ Image URL generated:', response.data.url.substring(0, 100) + '...');
        console.log('✅ Model used:', response.data.model);
        console.log('✅ Model attempts:', response.data.modelAttempts);
        if (response.data.failedModels && response.data.failedModels.length > 0) {
          console.log('⚠️ Failed models:', response.data.failedModels);
        }
      } else {
        console.log('❌ No image URL in response');
      }
    } else {
      console.log('❌ Direct image generation failed:', response.data);
    }
  } catch (error) {
    console.log('❌ Test 2 failed:', error.message);
  }

  console.log('\n---\n');

  // Test 3: Test image detection logic
  console.log('Test 3: Image detection logic test');
  try {
    const { detectImageGenerationRequest } = require('../lib/ai');
    
    const testCases = [
      { text: 'Generate an image of a cat', expected: true },
      { text: 'Create a diagram showing the network topology', expected: true },
      { text: 'Make the sky blue in the image', expected: true },
      { text: 'What is the weather today?', expected: false },
      { text: 'Show me how to configure a router', expected: false },
      { text: 'Draw a flowchart for the process', expected: true },
      { text: 'Can you illustrate this concept?', expected: true }
    ];

    let passed = 0;
    for (const testCase of testCases) {
      const result = detectImageGenerationRequest(testCase.text, []);
      if (result === testCase.expected) {
        console.log(`✅ "${testCase.text}" -> ${result}`);
        passed++;
      } else {
        console.log(`❌ "${testCase.text}" -> ${result} (expected: ${testCase.expected})`);
      }
    }
    
    console.log(`\nImage detection accuracy: ${passed}/${testCases.length} (${Math.round(passed/testCases.length*100)}%)`);
  } catch (error) {
    console.log('❌ Test 3 failed:', error.message);
  }

  console.log('\n---\n');

  // Test 4: Test image models availability
  console.log('Test 4: Image models availability test');
  try {
    const { IMAGE_MODEL_FALLBACKS, generateImageWithFallback } = require('../lib/ai');
    console.log('Available image models:', IMAGE_MODEL_FALLBACKS);
    
    // Test a simple generation to check model availability
    const result = await generateImageWithFallback('A simple red circle on white background', {
      size: 'square',
      quality: 'auto'
    });
    
    console.log('✅ Image generation successful with model:', result.modelUsed);
    console.log('✅ Total attempts:', result.errors.length + 1);
    
    if (result.errors.length > 0) {
      console.log('⚠️ Failed models:');
      result.errors.forEach(error => {
        console.log(`   - ${error.model}: ${error.error.message}`);
      });
    }
  } catch (error) {
    console.log('❌ Test 4 failed:', error.message);
  }

  console.log('\n🏁 Testing complete!');
}

// Test storage bucket setup
async function testStorageSetup() {
  console.log('\n📦 Testing storage bucket setup...');
  
  try {
    const { supabaseAdmin } = require('../lib/db');
    
    // Test media bucket access
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketsError) {
      console.log('❌ Error listing buckets:', bucketsError);
      return;
    }
    
    const mediaBucket = buckets.find(b => b.name === 'media');
    if (mediaBucket) {
      console.log('✅ Media bucket exists');
    } else {
      console.log('⚠️ Media bucket not found. Available buckets:', buckets.map(b => b.name));
    }
    
    // Test file upload capability
    const testBuffer = Buffer.from('test-image-content');
    const testPath = `test-uploads/test-${Date.now()}.txt`;
    
    const { error: uploadError } = await supabaseAdmin.storage
      .from('media')
      .upload(testPath, testBuffer, {
        contentType: 'text/plain',
        upsert: false
      });
    
    if (uploadError) {
      console.log('❌ Upload test failed:', uploadError);
    } else {
      console.log('✅ Upload test successful');
      
      // Clean up test file
      await supabaseAdmin.storage.from('media').remove([testPath]);
      console.log('✅ Test file cleaned up');
    }
    
  } catch (error) {
    console.log('❌ Storage test failed:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting GPT-5 Image Generation Tests\n');
  console.log('Base URL:', BASE_URL);
  console.log('API Key configured:', !!API_KEY);
  console.log('\n' + '='.repeat(50) + '\n');
  
  await testStorageSetup();
  await testChatImageGeneration();
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 Test Summary Complete');
  console.log('\nIf any tests failed, check:');
  console.log('1. OpenAI API key is correctly configured');
  console.log('2. Supabase storage bucket "media" exists and is accessible');
  console.log('3. App is running and accessible at', BASE_URL);
  console.log('4. All environment variables are properly set');
}

// Handle command line execution
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testChatImageGeneration, testStorageSetup };
