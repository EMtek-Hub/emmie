require('dotenv').config({ path: '.env.local' });

async function testImageGenerationWithConsoleOutput() {
  console.log('🧪 Testing Image Generation with Console Output...\n');
  
  try {
    const response = await fetch('http://localhost:5000/api/chat-gpt5', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Generate a beautiful sunset over mountains'
          }
        ],
        userId: 'test-user-123',
        chatId: 'test-chat-456'
      })
    });

    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }

    console.log('✅ API Response successful, processing SSE stream...\n');
    
    // Process the SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            console.log('🏁 Stream completed\n');
            break;
          }
          
          try {
            const event = JSON.parse(data);
            console.log('📨 SSE Event received:', JSON.stringify(event, null, 2));
            
            if (event.type === 'image_completed') {
              console.log('🖼️ Image generation completed!');
              console.log('   Image URL:', event.url);
              console.log('   Message ID:', event.messageId);
            }
          } catch (e) {
            console.log('📝 Text chunk:', data);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testImageGenerationWithConsoleOutput();
