const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function testImageDisplay() {
  console.log('🧪 Testing Image Display End-to-End Flow');
  console.log('=' * 50);

  try {
    // Step 1: Create a new chat
    console.log('\n1️⃣ Creating new chat...');
    const createChatResponse = await fetch(`${BASE_URL}/api/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.TOOL_API_KEY
      },
      body: JSON.stringify({
        title: 'Image Display Test',
        agentId: null,
        projectId: null
      })
    });

    if (!createChatResponse.ok) {
      throw new Error(`Failed to create chat: ${createChatResponse.statusText}`);
    }

    const chatData = await createChatResponse.json();
    const chatId = chatData.chat.id;
    console.log(`✅ Chat created with ID: ${chatId}`);

    // Step 2: Send a message requesting image generation
    console.log('\n2️⃣ Sending image generation request...');
    const chatResponse = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.TOOL_API_KEY
      },
      body: JSON.stringify({
        message: 'generate an image of a blue sky with white clouds',
        chatId: chatId,
        agentId: null,
        projectId: null
      })
    });

    if (!chatResponse.ok) {
      throw new Error(`Failed to send chat message: ${chatResponse.statusText}`);
    }

    // Read the stream response
    console.log('📡 Reading stream response...');
    let responseText = '';
    let imageGenerated = false;
    let assistantMessageId = null;

    const reader = chatResponse.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            
            if (parsed.type === 'message_saved' && parsed.role === 'assistant') {
              assistantMessageId = parsed.messageId;
              console.log(`✅ Assistant message saved with ID: ${assistantMessageId}`);
            }
            
            if (parsed.type === 'content') {
              responseText += parsed.content;
            }
            
            if (parsed.type === 'image_generated') {
              imageGenerated = true;
              console.log(`✅ Image generated successfully`);
              console.log(`   Model: ${parsed.model}`);
              console.log(`   Model attempts: ${parsed.modelAttempts}`);
              console.log(`   Storage URL: ${parsed.attachmentUrl}`);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    if (!imageGenerated) {
      throw new Error('Image generation was not successful');
    }

    if (!assistantMessageId) {
      throw new Error('Assistant message ID not found');
    }

    // Step 3: Wait a moment for database write to complete
    console.log('\n3️⃣ Waiting for database write to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Fetch messages from the API
    console.log('\n4️⃣ Fetching messages from API...');
    const messagesResponse = await fetch(`${BASE_URL}/api/chats/${chatId}/messages`, {
      headers: {
        'x-api-key': process.env.TOOL_API_KEY
      }
    });

    if (!messagesResponse.ok) {
      throw new Error(`Failed to fetch messages: ${messagesResponse.statusText}`);
    }

    const messagesData = await messagesResponse.json();
    console.log(`✅ Retrieved ${messagesData.messages.length} messages`);

    // Step 5: Check if assistant message has attachments
    console.log('\n5️⃣ Checking message attachments...');
    const assistantMessage = messagesData.messages.find(
      msg => msg.role === 'assistant' && msg.id === assistantMessageId
    );

    if (!assistantMessage) {
      throw new Error('Assistant message not found in API response');
    }

    console.log('📋 Assistant message structure:');
    console.log(`   ID: ${assistantMessage.id}`);
    console.log(`   Role: ${assistantMessage.role}`);
    console.log(`   Message Type: ${assistantMessage.messageType}`);
    console.log(`   Has Attachments: ${!!assistantMessage.attachments}`);

    if (assistantMessage.attachments && assistantMessage.attachments.length > 0) {
      console.log(`✅ Found ${assistantMessage.attachments.length} attachment(s):`);
      assistantMessage.attachments.forEach((attachment, index) => {
        console.log(`   Attachment ${index + 1}:`);
        console.log(`     Type: ${attachment.type}`);
        console.log(`     URL: ${attachment.url}`);
        console.log(`     File Name: ${attachment.fileName || 'N/A'}`);
      });
    } else {
      throw new Error('❌ No attachments found in assistant message!');
    }

    // Step 6: Test frontend image rendering capability
    console.log('\n6️⃣ Testing frontend compatibility...');
    
    // Check if the attachment URLs are accessible
    for (const attachment of assistantMessage.attachments) {
      if (attachment.type === 'image') {
        console.log(`🔍 Testing image URL: ${attachment.url}`);
        
        try {
          const imageResponse = await fetch(attachment.url);
          if (imageResponse.ok) {
            const contentType = imageResponse.headers.get('content-type');
            console.log(`✅ Image accessible, Content-Type: ${contentType}`);
          } else {
            console.log(`⚠️  Image URL returned status: ${imageResponse.status}`);
          }
        } catch (error) {
          console.log(`⚠️  Could not access image URL: ${error.message}`);
        }
      }
    }

    console.log('\n🎉 Image Display Test Complete!');
    console.log('=' * 50);
    console.log('✅ Chat creation: PASSED');
    console.log('✅ Image generation: PASSED');
    console.log('✅ Message saving: PASSED');
    console.log('✅ Attachment storage: PASSED');
    console.log('✅ Messages API response: PASSED');
    console.log('✅ Attachment inclusion: PASSED');
    
    console.log(`\n🌐 Test Chat URL: ${BASE_URL}/chat?id=${chatId}`);
    console.log('💡 You can now visit this URL to verify the image displays correctly in the frontend.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Helper function to repeat string
String.prototype.repeat = function(num) {
  return new Array(num + 1).join(this);
};

testImageDisplay();
