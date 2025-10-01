#!/usr/bin/env node

/**
 * UI Image Generation Verification Script
 * Verifies that image generation through the UI properly saves to database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyUIImageGeneration() {
  console.log('🔍 Verifying UI Image Generation...\n');

  try {
    // Check for the most recent chat (the dog image test)
    const chatId = '03c74d6b-28e3-4c93-a2fe-43126378a5de';
    
    console.log(`📋 Looking for chat: ${chatId}`);
    
    // Get chat messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    
    if (messagesError) {
      console.error('❌ Error fetching messages:', messagesError);
      return;
    }
    
    console.log(`📨 Found ${messages.length} messages in chat`);
    
    messages.forEach((msg, index) => {
      console.log(`\n📝 Message ${index + 1}:`);
      console.log(`  - ID: ${msg.id}`);
      console.log(`  - Role: ${msg.role}`);
      console.log(`  - Content: ${msg.content_md ? msg.content_md.substring(0, 100) + '...' : 'No content'}`);
      console.log(`  - Tokens In: ${msg.tokens_in || 0}`);
      console.log(`  - Tokens Out: ${msg.tokens_out || 0}`);
      console.log(`  - Model: ${msg.model || 'Not specified'}`);
      console.log(`  - Attachments: ${msg.attachments || 'None'}`);
      console.log(`  - Message Type: ${msg.message_type || 'text'}`);
      
      // Check if this is an assistant message with image content
      if (msg.role === 'assistant' && msg.content_md) {
        const hasImageMarkdown = msg.content_md.includes('![') || msg.content_md.includes('Generated Image');
        console.log(`  - Contains Image Markdown: ${hasImageMarkdown ? '✅' : '❌'}`);
        
        if (hasImageMarkdown) {
          // Extract image URLs from markdown
          const imageUrls = msg.content_md.match(/!\[.*?\]\((.*?)\)/g);
          if (imageUrls) {
            console.log(`  - Image URLs found: ${imageUrls.length}`);
            imageUrls.forEach((url, i) => {
              const extractedUrl = url.match(/\((.*?)\)/)[1];
              console.log(`    ${i + 1}. ${extractedUrl}`);
            });
          }
        }
      }
    });
    
    // Check for recent image storage entries
    console.log('\n🖼️ Checking recent image uploads in storage...');
    
    // Check both possible bucket locations
    const buckets = ['generated-images', 'media'];
    let allFiles = [];
    
    for (const bucket of buckets) {
      console.log(`📂 Checking bucket: ${bucket}`);
      
      const { data: files, error: storageError } = await supabase
        .storage
        .from(bucket)
        .list('generated-images', {
          limit: 10,
          sortBy: { column: 'created_at', order: 'desc' }
        });
      
      if (storageError) {
        console.log(`   ❌ Error checking ${bucket}:`, storageError.message);
      } else {
        console.log(`   📁 Found ${files.length} files in ${bucket}/generated-images`);
        files.forEach((file, index) => {
          console.log(`     ${index + 1}. ${file.name} (${file.metadata?.size || 'unknown'} bytes) - ${file.created_at}`);
        });
        allFiles.push(...files.map(f => ({ ...f, bucket })));
      }
    }
    
    const files = allFiles;
    
    console.log(`\n📁 Total files found: ${files.length}`);
    
    // Try to get signed URLs for recent images
    if (files && files.length > 0) {
      console.log('\n🔗 Testing signed URL generation...');
      const recentFile = files[0];
      
      const { data: signedUrl, error: urlError } = await supabase
        .storage
        .from('generated-images')
        .createSignedUrl(recentFile.name, 3600);
      
      if (urlError) {
        console.error('❌ Error creating signed URL:', urlError);
      } else {
        console.log('✅ Signed URL created successfully');
        console.log(`🔗 URL: ${signedUrl.signedUrl.substring(0, 100)}...`);
      }
    }
    
    console.log('\n✅ UI Image Generation Verification Complete!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run verification
verifyUIImageGeneration().catch(console.error);
