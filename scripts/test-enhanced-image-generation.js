const fetch = require('node-fetch');

// Test script for enhanced image generation features
async function testEnhancedImageGeneration() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('Enhanced Image Generation Test Suite');
  console.log('===================================');
  console.log('');
  
  // Note: You'll need to provide a valid session cookie for testing
  const sessionCookie = 'your-session-cookie-here';
  
  if (sessionCookie === 'your-session-cookie-here') {
    console.log('⚠️  Please update the session cookie in this script before running tests');
    console.log('   You can get it from your browser\'s developer tools');
    console.log('');
    return;
  }

  // Test 1: Basic image generation with auto settings
  console.log('Test 1: Basic generation with auto settings');
  console.log('-------------------------------------------');
  try {
    const response = await fetch(`${baseUrl}/api/images/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        prompt: 'A beautiful sunset over mountains',
        size: 'auto',
        quality: 'auto',
        format: 'png',
        background: 'auto'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Basic generation successful');
      console.log(`   - Size: ${data.size}`);
      console.log(`   - Quality: ${data.quality}`);
      console.log(`   - Format: ${data.format}`);
      console.log(`   - File size: ${data.fileSize} bytes`);
      if (data.revisedPrompt) {
        console.log(`   - Revised prompt: ${data.revisedPrompt}`);
      }
    } else {
      console.log('❌ Basic generation failed:', await response.text());
    }
  } catch (error) {
    console.log('❌ Basic generation error:', error.message);
  }
  
  console.log('');

  // Test 2: JPEG with compression
  console.log('Test 2: JPEG generation with compression');
  console.log('----------------------------------------');
  try {
    const response = await fetch(`${baseUrl}/api/images/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        prompt: 'A modern office space with plants',
        size: 'landscape',
        quality: 'high',
        format: 'jpeg',
        compression: 80,
        background: 'opaque'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ JPEG generation successful');
      console.log(`   - Size: ${data.size}`);
      console.log(`   - Format: ${data.format}`);
      console.log(`   - Compression: ${data.compression}%`);
      console.log(`   - Background: ${data.background}`);
      console.log(`   - File size: ${data.fileSize} bytes`);
    } else {
      console.log('❌ JPEG generation failed:', await response.text());
    }
  } catch (error) {
    console.log('❌ JPEG generation error:', error.message);
  }
  
  console.log('');

  // Test 3: WebP with transparency
  console.log('Test 3: WebP generation with transparency');
  console.log('-----------------------------------------');
  try {
    const response = await fetch(`${baseUrl}/api/images/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        prompt: 'A floating geometric shape, minimalist style',
        size: 'square',
        quality: 'medium',
        format: 'webp',
        background: 'transparent',
        compression: 70
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ WebP transparent generation successful');
      console.log(`   - Size: ${data.size}`);
      console.log(`   - Format: ${data.format}`);
      console.log(`   - Background: ${data.background}`);
      console.log(`   - Compression: ${data.compression}%`);
      console.log(`   - File size: ${data.fileSize} bytes`);
    } else {
      console.log('❌ WebP generation failed:', await response.text());
    }
  } catch (error) {
    console.log('❌ WebP generation error:', error.message);
  }
  
  console.log('');

  // Test 4: Portrait format with high quality
  console.log('Test 4: Portrait format with high quality');
  console.log('----------------------------------------');
  try {
    const response = await fetch(`${baseUrl}/api/images/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        prompt: 'A tall skyscraper reaching into the clouds',
        size: 'portrait',
        quality: 'high',
        format: 'png',
        background: 'auto'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Portrait generation successful');
      console.log(`   - Size: ${data.size}`);
      console.log(`   - Quality: ${data.quality}`);
      console.log(`   - Format: ${data.format}`);
      console.log(`   - File size: ${data.fileSize} bytes`);
    } else {
      console.log('❌ Portrait generation failed:', await response.text());
    }
  } catch (error) {
    console.log('❌ Portrait generation error:', error.message);
  }
  
  console.log('');
  console.log('Enhanced Image Generation Tests Complete');
  console.log('=======================================');
  console.log('');
  console.log('Features tested:');
  console.log('✓ Auto size/quality selection');
  console.log('✓ Multiple format support (PNG, JPEG, WebP)');
  console.log('✓ Compression control');
  console.log('✓ Transparent backgrounds');
  console.log('✓ Different aspect ratios');
  console.log('✓ Quality levels');
  console.log('✓ Revised prompt capture');
  console.log('');
  console.log('To run this test:');
  console.log('1. Start your development server (npm run dev)');
  console.log('2. Update the session cookie in this script');
  console.log('3. Run: node scripts/test-enhanced-image-generation.js');
}

// Run the test if this script is executed directly
if (require.main === module) {
  testEnhancedImageGeneration().catch(console.error);
}

module.exports = { testEnhancedImageGeneration };
