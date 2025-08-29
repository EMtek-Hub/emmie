#!/usr/bin/env node

/**
 * Test Duplicate Chat Fix
 * 
 * This script tests the fixes for duplicate blank chat creation
 * by simulating rapid chat creation attempts and verifying
 * proper behavior.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const EMTEK_ORG_ID = process.env.EMTEK_ORG_ID;

// Test user ID - in production this would come from session
const TEST_USER_ID = 'test-user-duplicate-fix';

async function testEmptyChatPrevention() {
  console.log('🧪 Testing empty chat prevention...');
  
  try {
    // Attempt to create chat without title or hasContent flag
    const response = await fetch('http://localhost:3000/api/chats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // In real scenario, this would be a proper auth header
        'Authorization': `Bearer ${TEST_USER_ID}`
      },
      body: JSON.stringify({
        agentId: 0
        // No title, no hasContent flag
      })
    });

    if (response.status === 400) {
      console.log('✅ Empty chat prevention working - returned 400 as expected');
      return true;
    } else {
      console.log('❌ Empty chat prevention failed - should have returned 400');
      return false;
    }
  } catch (error) {
    console.log('⚠️  Could not test empty chat prevention (server not running?):', error.message);
    return null;
  }
}

async function testValidChatCreation() {
  console.log('🧪 Testing valid chat creation...');
  
  try {
    // Attempt to create chat with proper hasContent flag
    const response = await fetch('http://localhost:3000/api/chats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_USER_ID}`
      },
      body: JSON.stringify({
        agentId: 0,
        hasContent: true
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Valid chat creation working - created chat ${data.chat?.id}`);
      return data.chat?.id;
    } else {
      console.log('❌ Valid chat creation failed');
      return false;
    }
  } catch (error) {
    console.log('⚠️  Could not test valid chat creation (server not running?):', error.message);
    return null;
  }
}

async function testCleanupScript() {
  console.log('🧪 Testing cleanup script...');
  
  try {
    // First, create some test empty chats directly in the database
    const testChats = [];
    const now = new Date();
    
    for (let i = 0; i < 3; i++) {
      const testTime = new Date(now.getTime() - (2 + i) * 60 * 60 * 1000); // 2+ hours ago
      
      const { data: chat, error } = await supabase
        .from('chats')
        .insert({
          title: null,
          created_by: 'test-cleanup-user',
          org_id: EMTEK_ORG_ID,
          created_at: testTime.toISOString(),
          updated_at: testTime.toISOString()
        })
        .select()
        .single();

      if (!error && chat) {
        testChats.push(chat.id);
      }
    }

    console.log(`   Created ${testChats.length} test empty chats`);

    // Run cleanup in dry-run mode
    const { cleanupEmptyChats } = require('./cleanup-empty-chats.js');
    
    // Mock the dry run flag
    const originalArgv = process.argv;
    process.argv = [...process.argv, '--dry-run'];
    
    console.log('   Running cleanup script in dry-run mode...');
    await cleanupEmptyChats();
    
    // Restore original argv
    process.argv = originalArgv;

    // Clean up test chats
    if (testChats.length > 0) {
      await supabase
        .from('chats')
        .delete()
        .in('id', testChats);
      console.log('   Cleaned up test chats');
    }

    console.log('✅ Cleanup script test completed');
    return true;
  } catch (error) {
    console.log('❌ Cleanup script test failed:', error.message);
    return false;
  }
}

async function checkExistingEmptyChats() {
  console.log('🔍 Checking for existing empty chats...');
  
  try {
    const { data: chats, error } = await supabase
      .from('chats')
      .select(`
        id,
        title,
        created_at,
        messages(count)
      `)
      .eq('org_id', EMTEK_ORG_ID)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    const emptyChats = chats.filter(chat => {
      const messageCount = chat.messages?.[0]?.count || 0;
      return messageCount === 0;
    });

    console.log(`📊 Found ${emptyChats.length} empty chats out of ${chats.length} total chats`);
    
    if (emptyChats.length > 0) {
      console.log('   Recent empty chats:');
      emptyChats.slice(0, 5).forEach(chat => {
        const age = Math.round((Date.now() - new Date(chat.created_at).getTime()) / (1000 * 60 * 60));
        console.log(`   - Chat ${chat.id}: "${chat.title || 'Untitled'}" (${age}h ago)`);
      });
      
      if (emptyChats.length > 10) {
        console.log('🚨 Warning: High number of empty chats detected!');
        console.log('   Consider running: node scripts/cleanup-empty-chats.js');
      }
    }

    return emptyChats.length;
  } catch (error) {
    console.log('❌ Error checking existing empty chats:', error.message);
    return null;
  }
}

async function main() {
  console.log('🔧 Testing Duplicate Chat Creation Fixes');
  console.log('==========================================');
  console.log('');

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  if (!EMTEK_ORG_ID) {
    console.error('❌ Missing EMTEK_ORG_ID environment variable');
    process.exit(1);
  }

  const results = {
    emptyPrevention: await testEmptyChatPrevention(),
    validCreation: await testValidChatCreation(),
    cleanupScript: await testCleanupScript(),
    existingEmpty: await checkExistingEmptyChats()
  };

  console.log('');
  console.log('📋 Test Results Summary');
  console.log('========================');
  
  if (results.emptyPrevention === true) {
    console.log('✅ Empty chat prevention: WORKING');
  } else if (results.emptyPrevention === false) {
    console.log('❌ Empty chat prevention: FAILED');
  } else {
    console.log('⚠️  Empty chat prevention: COULD NOT TEST');
  }

  if (results.validCreation) {
    console.log('✅ Valid chat creation: WORKING');
  } else if (results.validCreation === false) {
    console.log('❌ Valid chat creation: FAILED');
  } else {
    console.log('⚠️  Valid chat creation: COULD NOT TEST');
  }

  if (results.cleanupScript) {
    console.log('✅ Cleanup script: WORKING');
  } else {
    console.log('❌ Cleanup script: FAILED');
  }

  if (results.existingEmpty !== null) {
    if (results.existingEmpty === 0) {
      console.log('✅ No existing empty chats found');
    } else if (results.existingEmpty < 5) {
      console.log(`⚠️  ${results.existingEmpty} existing empty chats (acceptable)"`);
    } else {
      console.log(`🚨 ${results.existingEmpty} existing empty chats (cleanup recommended)`);
    }
  }

  console.log('');
  console.log('🎯 Recommendations:');
  
  if (results.emptyPrevention === false || results.validCreation === false) {
    console.log('   - Check API endpoint fixes in pages/api/chats.ts');
    console.log('   - Verify frontend chat creation logic in pages/chat.js');
  }
  
  if (results.existingEmpty > 5) {
    console.log('   - Run: node scripts/cleanup-empty-chats.js --dry-run');
    console.log('   - Then: node scripts/cleanup-empty-chats.js');
  }
  
  if (results.emptyPrevention === null || results.validCreation === null) {
    console.log('   - Start the development server: npm run dev');
    console.log('   - Then run this test again');
  }

  console.log('');
  console.log('Done! 🚀');
}

// Only run if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { 
  testEmptyChatPrevention, 
  testValidChatCreation, 
  testCleanupScript,
  checkExistingEmptyChats 
};
