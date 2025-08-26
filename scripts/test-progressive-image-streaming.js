const https = require('https');
const http = require('http');

// Test progressive image streaming endpoint
async function testProgressiveImageStreaming() {
  console.log('🧪 Testing Progressive Image Streaming...\n');

  const testCases = [
    {
      name: 'Simple Image Generation',
      prompt: 'A beautiful sunset over mountains with vibrant colors',
      size: 'square',
      quality: 'high',
      format: 'png'
    },
    {
      name: 'Complex Scene Generation', 
      prompt: 'A futuristic city with flying cars, neon lights, and towering skyscrapers at night',
      size: 'landscape',
      quality: 'high',
      format: 'jpeg',
      compression: 85
    },
    {
      name: 'Portrait Image',
      prompt: 'Portrait of a wise old wizard with a long beard and mystical eyes',
      size: 'portrait',
      quality: 'medium',
      format: 'webp'
    }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n📋 Test Case ${i + 1}: ${testCase.name}`);
    console.log(`   Prompt: "${testCase.prompt}"`);
    console.log(`   Parameters: ${testCase.size}, ${testCase.quality}, ${testCase.format}`);
    
    try {
      await testStreamingImageGeneration(testCase);
      console.log(`✅ Test case ${i + 1} completed successfully`);
    } catch (error) {
      console.error(`❌ Test case ${i + 1} failed:`, error.message);
    }
    
    // Wait between tests
    if (i < testCases.length - 1) {
      console.log('\n⏳ Waiting 3 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

function testStreamingImageGeneration(testCase) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      prompt: testCase.prompt,
      size: testCase.size,
      quality: testCase.quality,
      format: testCase.format,
      compression: testCase.compression
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/images/generate-streaming',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    };

    console.log('🌊 Starting streaming request...');
    
    const req = http.request(options, (res) => {
      console.log(`📡 Status: ${res.statusCode}`);
      console.log(`📡 Headers:`, res.headers);

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }

      let eventCount = 0;
      let partialImageCount = 0;
      let hasCompleted = false;
      let hasSaved = false;
      let hasError = false;

      res.setEncoding('utf8');
      
      res.on('data', (chunk) => {
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            eventCount++;
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'partial_image':
                  partialImageCount++;
                  console.log(`📸 Partial image ${partialImageCount} received (index: ${data.partial_image_index})`);
                  console.log(`   Size: ${data.size}, Quality: ${data.quality}, Format: ${data.output_format}`);
                  break;
                  
                case 'completed':
                  hasCompleted = true;
                  console.log(`✅ Image generation completed!`);
                  console.log(`   Final size: ${data.size}, Quality: ${data.quality}`);
                  if (data.usage) {
                    console.log(`   Tokens used: ${data.usage.total_tokens}`);
                  }
                  break;
                  
                case 'saved':
                  hasSaved = true;
                  console.log(`💾 Image saved successfully!`);
                  console.log(`   URL: ${data.url}`);
                  console.log(`   File size: ${(data.fileSize / 1024).toFixed(1)} KB`);
                  break;
                  
                case 'error':
                  hasError = true;
                  console.error(`❌ Streaming error: ${data.error}`);
                  reject(new Error(data.error));
                  break;
                  
                case 'done':
                  console.log(`🏁 Streaming completed`);
                  console.log(`📊 Summary:`);
                  console.log(`   - Total events: ${eventCount}`);
                  console.log(`   - Partial images: ${partialImageCount}`);
                  console.log(`   - Completed: ${hasCompleted}`);
                  console.log(`   - Saved: ${hasSaved}`);
                  console.log(`   - Errors: ${hasError}`);
                  
                  if (hasCompleted && hasSaved && !hasError) {
                    resolve();
                  } else {
                    reject(new Error('Streaming did not complete successfully'));
                  }
                  break;
                  
                default:
                  console.log(`📡 Unknown event: ${data.type}`);
                  break;
              }
            } catch (parseError) {
              console.error('❌ Error parsing event data:', parseError);
            }
          }
        }
      });

      res.on('end', () => {
        console.log('📡 Stream ended');
        if (!hasCompleted || !hasSaved) {
          reject(new Error('Stream ended without completion'));
        }
      });

      res.on('error', (error) => {
        console.error('❌ Response error:', error);
        reject(error);
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error);
      reject(error);
    });

    // Write the request data
    req.write(postData);
    req.end();

    // Timeout after 2 minutes
    setTimeout(() => {
      req.destroy();
      reject(new Error('Request timeout'));
    }, 120000);
  });
}

// Run the tests
if (require.main === module) {
  testProgressiveImageStreaming()
    .then(() => {
      console.log('\n🎉 All progressive image streaming tests completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Progressive image streaming tests failed:', error);
      process.exit(1);
    });
}

module.exports = { testProgressiveImageStreaming };
