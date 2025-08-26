const { OpenAI } = require('openai');
require('dotenv').config({ path: '.env.local' });

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

async function testImageGeneration() {
  console.log('🔍 OpenAI Image Generation Diagnostic Test');
  console.log('==========================================');
  console.log('');

  // Test 1: Check organization access to gpt-image-1
  console.log('Test 1: Testing gpt-image-1 access');
  console.log('----------------------------------');
  try {
    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: 'A simple blue sky with white clouds',
      size: '1024x1024',
      n: 1
    });

    if (response.data && response.data[0]) {
      const imageData = response.data[0];
      if (imageData.b64_json) {
        console.log('✅ gpt-image-1 is working!');
        console.log(`   - Image generated successfully (base64)`);
        console.log(`   - Base64 data length: ${imageData.b64_json.length}`);
      } else if (imageData.url) {
        console.log('✅ gpt-image-1 is working!');
        console.log(`   - Image generated successfully (URL)`);
        console.log(`   - Image URL: ${imageData.url}`);
      } else {
        console.log('⚠️  gpt-image-1 returned unexpected response format');
        console.log('   Response:', JSON.stringify(response, null, 2));
      }
      if (imageData.revised_prompt) {
        console.log(`   - Revised prompt: ${imageData.revised_prompt}`);
      }
    } else {
      console.log('⚠️  gpt-image-1 returned unexpected response format');
      console.log('   Response:', JSON.stringify(response, null, 2));
    }
  } catch (error) {
    console.log('❌ gpt-image-1 failed');
    console.log(`   - Status: ${error.status}`);
    console.log(`   - Error: ${error.message}`);
    if (error.error) {
      console.log(`   - Details: ${JSON.stringify(error.error, null, 2)}`);
    }
    
    // Check for specific error types
    if (error.status === 403) {
      console.log('   💡 This likely means your organization needs verification for gpt-image-1');
      console.log('   💡 Check your OpenAI developer console for organization verification');
    } else if (error.status === 401) {
      console.log('   💡 API key authentication failed');
    } else if (error.status === 429) {
      console.log('   💡 Rate limit exceeded');
    }
  }
  
  console.log('');

  // Test 2: Test dall-e-3 as fallback
  console.log('Test 2: Testing dall-e-3 fallback');
  console.log('---------------------------------');
  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: 'A simple blue sky with white clouds',
      size: '1024x1024',
      n: 1,
      response_format: 'b64_json'
    });

    if (response.data && response.data[0] && response.data[0].b64_json) {
      console.log('✅ dall-e-3 is working!');
      console.log(`   - Image generated successfully`);
      console.log(`   - Base64 data length: ${response.data[0].b64_json.length}`);
      if (response.data[0].revised_prompt) {
        console.log(`   - Revised prompt: ${response.data[0].revised_prompt}`);
      }
    } else {
      console.log('⚠️  dall-e-3 returned unexpected response format');
    }
  } catch (error) {
    console.log('❌ dall-e-3 failed');
    console.log(`   - Status: ${error.status}`);
    console.log(`   - Error: ${error.message}`);
  }
  
  console.log('');

  // Test 3: Test dall-e-2 as secondary fallback
  console.log('Test 3: Testing dall-e-2 fallback');
  console.log('---------------------------------');
  try {
    const response = await openai.images.generate({
      model: 'dall-e-2',
      prompt: 'A simple blue sky with white clouds',
      size: '1024x1024',
      n: 1,
      response_format: 'b64_json'
    });

    if (response.data && response.data[0] && response.data[0].b64_json) {
      console.log('✅ dall-e-2 is working!');
      console.log(`   - Image generated successfully`);
      console.log(`   - Base64 data length: ${response.data[0].b64_json.length}`);
      // dall-e-2 doesn't have revised_prompt
    } else {
      console.log('⚠️  dall-e-2 returned unexpected response format');
    }
  } catch (error) {
    console.log('❌ dall-e-2 failed');
    console.log(`   - Status: ${error.status}`);
    console.log(`   - Error: ${error.message}`);
  }
  
  console.log('');

  // Test 4: Test different parameters that might affect gpt-image-1
  console.log('Test 4: Testing gpt-image-1 with different parameters');
  console.log('----------------------------------------------------');
  try {
    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: 'A simple blue sky with white clouds',
      size: 'auto',
      quality: 'auto'
    });

    if (response.data && response.data[0] && response.data[0].b64_json) {
      console.log('✅ gpt-image-1 with auto parameters working!');
      console.log(`   - Image generated successfully`);
    }
  } catch (error) {
    console.log('❌ gpt-image-1 with auto parameters failed');
    console.log(`   - Status: ${error.status}`);
    console.log(`   - Error: ${error.message}`);
  }
  
  console.log('');
  console.log('🔍 Diagnostic Summary');
  console.log('====================');
  console.log('');
  console.log('If gpt-image-1 failed with 403 error:');
  console.log('• Your organization needs verification for gpt-image-1');
  console.log('• Visit your OpenAI developer console');
  console.log('• Complete organization verification');
  console.log('');
  console.log('If dall-e-3 or dall-e-2 work:');
  console.log('• Use these as fallback models');
  console.log('• Image generation should work properly');
  console.log('');
  console.log('If all models fail:');
  console.log('• Check API key permissions');
  console.log('• Check billing/usage limits');
  console.log('• Check network connectivity');
  console.log('');
  console.log('Next steps:');
  console.log('1. Run this diagnostic');
  console.log('2. Address any organization verification issues');
  console.log('3. Update the code with working models');
  console.log('4. Add proper fallback logic');
}

// Test organization and billing info
async function checkOrganizationInfo() {
  console.log('📋 Organization Information');
  console.log('===========================');
  try {
    // Note: OpenAI doesn't provide a direct endpoint to check org verification status
    // This is more of a placeholder for future API improvements
    console.log('• Organization verification status must be checked manually in the OpenAI console');
    console.log('• Visit: https://platform.openai.com/organization');
    console.log('• Look for "Organization Verification" status');
    console.log('');
  } catch (error) {
    console.log('❌ Could not retrieve organization info');
  }
}

if (require.main === module) {
  (async () => {
    try {
      await checkOrganizationInfo();
      await testImageGeneration();
    } catch (error) {
      console.error('❌ Diagnostic failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = { testImageGeneration, checkOrganizationInfo };
