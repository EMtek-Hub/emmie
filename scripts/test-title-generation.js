const { supabaseAdmin, EMTEK_ORG_ID } = require('../lib/db');

async function testTitleGeneration() {
  console.log('🔍 Testing chat title generation...\n');

  try {
    // 1. Create a test chat
    console.log('1. Creating test chat...');
    const { data: chat, error: chatError } = await supabaseAdmin
      .from('chats')
      .insert([{
        org_id: EMTEK_ORG_ID,
        title: 'New Chat',
        created_by: 'test-user-id'
      }])
      .select()
      .single();

    if (chatError) {
      console.error('❌ Failed to create chat:', chatError);
      return;
    }
    console.log('✅ Test chat created:', chat.id);

    // 2. Add some test messages
    console.log('\n2. Adding test messages...');
    const messages = [
      {
        chat_id: chat.id,
        role: 'user',
        content_md: 'Hello, I need help with setting up a React project with TypeScript and Next.js'
      },
      {
        chat_id: chat.id,
        role: 'assistant',
        content_md: 'I\'d be happy to help you set up a React project with TypeScript and Next.js! Here\'s a step-by-step guide...'
      }
    ];

    const { error: messagesError } = await supabaseAdmin
      .from('messages')
      .insert(messages);

    if (messagesError) {
      console.error('❌ Failed to add messages:', messagesError);
      return;
    }
    console.log('✅ Test messages added');

    // 3. Test title generation API
    console.log('\n3. Testing title generation API...');
    
    // Simulate the API call
    const fetch = require('node-fetch');
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    
    try {
      const response = await fetch(`${baseUrl}/api/chats/${chat.id}/generate-title`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token` // This won't work without proper auth
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Title generated:', data.title);
      } else {
        console.log('⚠️ API call failed (expected without proper auth):', response.status);
        console.log('   Let\'s test the core logic directly...');
        
        // Test the core logic directly
        await testTitleGenerationDirectly(chat.id);
      }
    } catch (fetchError) {
      console.log('⚠️ Fetch failed (expected in this environment):', fetchError.message);
      console.log('   Testing core logic directly...');
      
      // Test the core logic directly
      await testTitleGenerationDirectly(chat.id);
    }

    // 4. Cleanup
    console.log('\n4. Cleaning up...');
    await supabaseAdmin.from('messages').delete().eq('chat_id', chat.id);
    await supabaseAdmin.from('chats').delete().eq('id', chat.id);
    console.log('✅ Cleanup completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function testTitleGenerationDirectly(chatId) {
  try {
    console.log('\n   Testing core title generation logic...');
    
    // Get chat and verify conditions
    const { data: chat, error: chatError } = await supabaseAdmin
      .from('chats')
      .select('id, created_by, title')
      .eq('id', chatId)
      .eq('org_id', EMTEK_ORG_ID)
      .single();

    if (chatError || !chat) {
      console.error('   ❌ Chat not found:', chatError);
      return;
    }

    console.log('   📄 Chat found:', {
      id: chat.id,
      title: chat.title,
      created_by: chat.created_by
    });

    // Check if title should be generated
    const needsTitle = !chat.title || chat.title.trim() === '' || chat.title === 'New Chat';
    console.log('   🔍 Needs title:', needsTitle);

    if (!needsTitle) {
      console.log('   ⚠️ Chat already has a proper title');
      return;
    }

    // Get messages for title generation
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select('role, content_md')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(6);

    if (messagesError || !messages || messages.length < 2) {
      console.error('   ❌ Not enough messages:', messagesError);
      return;
    }

    console.log('   📝 Messages found:', messages.length);
    console.log('   📝 First user message:', messages.find(m => m.role === 'user')?.content_md?.substring(0, 50) + '...');

    // Check if OpenAI is configured
    try {
      const { openai } = require('../lib/ai');
      console.log('   🤖 OpenAI client available');
      
      // Create conversation summary
      const conversationSummary = messages
        .map(msg => `${msg.role}: ${msg.content_md}`)
        .join('\n');

      console.log('   📋 Conversation summary length:', conversationSummary.length);
      
      // This would call OpenAI but we'll skip for testing
      console.log('   ⚠️ Skipping actual OpenAI call for testing');
      
      // Simulate title generation
      const simulatedTitle = 'React TypeScript Next.js Setup';
      console.log('   🎯 Simulated title:', simulatedTitle);
      
      // Test database update
      const { data: updatedChat, error: updateError } = await supabaseAdmin
        .from('chats')
        .update({ title: simulatedTitle })
        .eq('id', chatId)
        .select()
        .single();

      if (updateError) {
        console.error('   ❌ Failed to update title:', updateError);
        return;
      }

      console.log('   ✅ Title updated successfully:', updatedChat.title);
      
    } catch (aiError) {
      console.error('   ❌ OpenAI configuration issue:', aiError.message);
    }

  } catch (error) {
    console.error('   ❌ Direct test failed:', error);
  }
}

async function checkRecentChats() {
  console.log('\n🔍 Checking recent chats for title issues...\n');
  
  try {
    const { data: chats, error } = await supabaseAdmin
      .from('chats')
      .select('id, title, created_at, updated_at')
      .eq('org_id', EMTEK_ORG_ID)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Failed to fetch chats:', error);
      return;
    }

    console.log('📋 Recent chats:');
    chats.forEach((chat, index) => {
      const needsTitle = !chat.title || chat.title.trim() === '' || chat.title === 'New Chat';
      console.log(`${index + 1}. ID: ${chat.id}`);
      console.log(`   Title: "${chat.title}" ${needsTitle ? '❌ NEEDS TITLE' : '✅'}`);
      console.log(`   Created: ${chat.created_at}`);
      console.log(`   Updated: ${chat.updated_at}`);
      console.log('');
    });

    const chatsNeedingTitles = chats.filter(chat => 
      !chat.title || chat.title.trim() === '' || chat.title === 'New Chat'
    );

    if (chatsNeedingTitles.length > 0) {
      console.log(`⚠️ Found ${chatsNeedingTitles.length} chats that need titles`);
      
      // Check if these chats have enough messages
      for (const chat of chatsNeedingTitles) {
        const { data: messages, error: msgError } = await supabaseAdmin
          .from('messages')
          .select('id, role')
          .eq('chat_id', chat.id);
        
        if (!msgError && messages) {
          console.log(`   Chat ${chat.id}: ${messages.length} messages (${messages.filter(m => m.role === 'user').length} user, ${messages.filter(m => m.role === 'assistant').length} assistant)`);
        }
      }
    } else {
      console.log('✅ All recent chats have proper titles');
    }

  } catch (error) {
    console.error('❌ Failed to check recent chats:', error);
  }
}

// Run the tests
async function main() {
  console.log('🧪 Chat Title Generation Test Suite\n');
  console.log('==================================\n');
  
  await checkRecentChats();
  await testTitleGeneration();
  
  console.log('\n✅ Test suite completed');
  process.exit(0);
}

main().catch(console.error);
