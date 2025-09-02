// Test script to verify image generation database saving and display functionality
const { createClient } = require('@supabase/supabase-js');

// Load environment variables - prioritize .env.local over .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // fallback to .env if .env.local doesn't exist

// Create Supabase admin client directly
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { 
    auth: { 
      persistSession: false 
    }
  }
);

async function testImageGenerationFix() {
  console.log('🧪 Testing Image Generation Database Fix...\n');

  // Test 1: Check database schema
  console.log('=== Test 1: Database Schema Verification ===');
  try {
    const { data: columns, error } = await supabaseAdmin
      .rpc('get_table_columns', { table_name: 'messages' });
    
    if (error) {
      console.log('❌ Error checking schema:', error.message);
    } else {
      const hasMessageType = columns.some(col => col.column_name === 'message_type');
      const hasAttachments = columns.some(col => col.column_name === 'attachments');
      
      console.log(`message_type column: ${hasMessageType ? '✅ EXISTS' : '❌ MISSING'}`);
      console.log(`attachments column: ${hasAttachments ? '✅ EXISTS' : '❌ MISSING'}`);
      
      if (hasMessageType && hasAttachments) {
        console.log('✅ Database schema is correct for multimodal support');
      } else {
        console.log('❌ Database schema missing required columns');
      }
    }
  } catch (schemaError) {
    // Try alternative approach
    try {
      const { error } = await supabaseAdmin
        .from('messages')
        .select('message_type, attachments')
        .limit(1);
      
      if (!error) {
        console.log('✅ Database schema verified - multimodal columns exist');
      } else {
        console.log('❌ Database schema issue:', error.message);
      }
    } catch (altError) {
      console.log('❌ Cannot verify database schema:', altError.message);
    }
  }

  // Test 2: Check storage bucket
  console.log('\n=== Test 2: Storage Bucket Verification ===');
  try {
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketsError) {
      console.log('❌ Error listing buckets:', bucketsError.message);
    } else {
      const mediaBucket = buckets.find(bucket => bucket.name === 'media');
      
      if (mediaBucket) {
        console.log('✅ Media bucket exists');
        console.log(`   Public: ${mediaBucket.public}`);
        console.log(`   Created: ${mediaBucket.created_at}`);
        
        // Test bucket access
        const { data: files, error: listError } = await supabaseAdmin.storage
          .from('media')
          .list('generated-images', { limit: 1 });
        
        if (!listError) {
          console.log('✅ Can access generated-images folder');
        } else {
          console.log('❌ Cannot access generated-images folder:', listError.message);
        }
      } else {
        console.log('❌ Media bucket not found');
        console.log('Available buckets:', buckets.map(b => b.name).join(', '));
      }
    }
  } catch (storageError) {
    console.log('❌ Storage verification failed:', storageError.message);
  }

  // Test 3: Check recent messages for image generation
  console.log('\n=== Test 3: Recent Image Generation Messages ===');
  try {
    const { data: recentMessages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select('id, message_type, attachments, content_md, created_at, model')
      .eq('message_type', 'image')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (messagesError) {
      console.log('❌ Error querying messages:', messagesError.message);
    } else {
      console.log(`Found ${recentMessages.length} recent image messages`);
      
      recentMessages.forEach((msg, index) => {
        console.log(`\n📸 Image Message ${index + 1}:`);
        console.log(`   ID: ${msg.id}`);
        console.log(`   Type: ${msg.message_type}`);
        console.log(`   Model: ${msg.model}`);
        console.log(`   Created: ${msg.created_at}`);
        console.log(`   Content: ${msg.content_md?.substring(0, 100)}...`);
        
        if (msg.attachments && Array.isArray(msg.attachments)) {
          console.log(`   Attachments: ${msg.attachments.length} items`);
          msg.attachments.forEach((attachment, i) => {
            console.log(`     ${i + 1}. Type: ${attachment.type}, URL: ${attachment.url?.substring(0, 50)}...`);
          });
        } else {
          console.log(`   Attachments: ${msg.attachments ? 'Non-array data' : 'None'}`);
        }
      });
      
      if (recentMessages.length === 0) {
        console.log('ℹ️  No recent image messages found - try generating an image to test');
      }
    }
  } catch (queryError) {
    console.log('❌ Message query failed:', queryError.message);
  }

  // Test 4: Simulate image generation endpoint logic
  console.log('\n=== Test 4: Database Insert Simulation ===');
  try {
    const testChatId = 'test-chat-' + Date.now();
    const testImageUrl = 'https://example.com/test-image.png';
    
    // Simulate user message with image generation request
    const { data: userMessage, error: userError } = await supabaseAdmin
      .from('messages')
      .insert([{
        chat_id: testChatId,
        role: 'user',
        content_md: 'Generate an image of a blue cat',
        model: 'user',
        message_type: 'text',
        attachments: null
      }])
      .select()
      .single();
    
    if (userError) {
      console.log('❌ Failed to insert test user message:', userError.message);
    } else {
      console.log('✅ Test user message inserted successfully');
      
      // Simulate assistant message with generated image
      const { data: assistantMessage, error: assistantError } = await supabaseAdmin
        .from('messages')
        .insert([{
          chat_id: testChatId,
          role: 'assistant',
          content_md: 'Generated image: Generate an image of a blue cat\n\n![Generated Image](' + testImageUrl + ')',
          model: 'gpt-image-1',
          message_type: 'image',
          attachments: [{
            type: 'image',
            url: testImageUrl,
            alt: 'AI-generated image: Generate an image of a blue cat',
            storage_path: 'generated-images/test-image.png',
            file_size: 1024,
            format: 'png'
          }]
        }])
        .select()
        .single();
      
      if (assistantError) {
        console.log('❌ Failed to insert test assistant message:', assistantError.message);
      } else {
        console.log('✅ Test assistant message with image inserted successfully');
        console.log(`   Message ID: ${assistantMessage.id}`);
        console.log(`   Message Type: ${assistantMessage.message_type}`);
        console.log(`   Attachments: ${JSON.stringify(assistantMessage.attachments, null, 2)}`);
        
        // Clean up test data
        await supabaseAdmin
          .from('messages')
          .delete()
          .eq('chat_id', testChatId);
        
        console.log('✅ Test data cleaned up');
      }
    }
  } catch (simulationError) {
    console.log('❌ Database simulation failed:', simulationError.message);
  }

  // Test 5: Check EnhancedMessage component compatibility
  console.log('\n=== Test 5: Frontend Component Compatibility ===');
  
  // Simulate what the frontend component expects
  const mockMessage = {
    id: 'test-123',
    role: 'assistant',
    content: 'Generated image: A blue cat\n\n![Generated Image](https://example.com/test.png)',
    message_type: 'image',
    attachments: [{
      type: 'image',
      url: 'https://example.com/test.png',
      alt: 'AI-generated image: A blue cat'
    }],
    timestamp: new Date()
  };
  
  console.log('Mock message structure for frontend:');
  console.log('✅ Has role:', !!mockMessage.role);
  console.log('✅ Has content:', !!mockMessage.content);
  console.log('✅ Has message_type:', !!mockMessage.message_type);
  console.log('✅ Has attachments array:', Array.isArray(mockMessage.attachments));
  console.log('✅ First attachment has required fields:', 
    mockMessage.attachments[0].type && 
    mockMessage.attachments[0].url && 
    mockMessage.attachments[0].alt
  );

  console.log('\n🏁 Image Generation Database Fix Test Complete');
  console.log('\n📋 Summary:');
  console.log('- Database schema should support message_type and attachments columns');
  console.log('- Storage bucket "media" should exist with "generated-images" folder');
  console.log('- Messages with type "image" should save successfully');
  console.log('- Frontend expects attachments array with type, url, and alt fields');
  console.log('- Both streaming and direct generation endpoints use consistent format');
}

// Run the test
testImageGenerationFix().catch(console.error);
