#!/usr/bin/env node

/**
 * Cleanup Empty Chats Script
 * 
 * This script removes empty chat sessions that have no messages.
 * These can occur due to:
 * - Failed chat creation attempts
 * - Interrupted chat sessions
 * - Race conditions in chat creation
 * 
 * Usage: node scripts/cleanup-empty-chats.js [--dry-run]
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const EMTEK_ORG_ID = process.env.EMTEK_ORG_ID;
const isDryRun = process.argv.includes('--dry-run');

async function cleanupEmptyChats() {
  console.log('🧹 Starting empty chat cleanup...');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'ACTUAL CLEANUP'}`);
  console.log('');

  try {
    // Find chats with no messages
    const { data: emptyChats, error: findError } = await supabase
      .from('chats')
      .select(`
        id,
        title,
        created_at,
        updated_at,
        created_by,
        messages(count)
      `)
      .eq('org_id', EMTEK_ORG_ID)
      .order('created_at', { ascending: false });

    if (findError) {
      throw new Error(`Failed to find empty chats: ${findError.message}`);
    }

    // Filter chats that truly have no messages
    const chatsWithNoMessages = emptyChats.filter(chat => {
      const messageCount = chat.messages?.[0]?.count || 0;
      return messageCount === 0;
    });

    console.log(`📊 Found ${chatsWithNoMessages.length} empty chats out of ${emptyChats.length} total chats`);

    if (chatsWithNoMessages.length === 0) {
      console.log('✅ No empty chats to clean up!');
      return;
    }

    // Group by creation time for better reporting
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentChats = chatsWithNoMessages.filter(chat => 
      new Date(chat.created_at) > oneDayAgo
    );
    const oldChats = chatsWithNoMessages.filter(chat => 
      new Date(chat.created_at) <= oneWeekAgo
    );
    const mediumChats = chatsWithNoMessages.filter(chat => 
      new Date(chat.created_at) <= oneDayAgo && new Date(chat.created_at) > oneWeekAgo
    );

    console.log(`📈 Breakdown:`);
    console.log(`  - Recent (< 1 day): ${recentChats.length}`);
    console.log(`  - Medium (1-7 days): ${mediumChats.length}`);
    console.log(`  - Old (> 7 days): ${oldChats.length}`);
    console.log('');

    // Only delete chats older than 1 hour to avoid deleting chats being actively created
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const chatsToDelete = chatsWithNoMessages.filter(chat => 
      new Date(chat.created_at) < oneHourAgo
    );

    if (chatsToDelete.length === 0) {
      console.log('ℹ️  No empty chats older than 1 hour found. Skipping cleanup to avoid deleting active chats.');
      return;
    }

    console.log(`🗑️  Will delete ${chatsToDelete.length} empty chats older than 1 hour:`);
    
    // Show details of chats to be deleted
    chatsToDelete.forEach(chat => {
      const age = Math.round((now.getTime() - new Date(chat.created_at).getTime()) / (1000 * 60 * 60));
      console.log(`  - Chat ${chat.id}: "${chat.title || 'Untitled'}" (${age}h old)`);
    });
    console.log('');

    if (isDryRun) {
      console.log('🔍 DRY RUN: No chats were actually deleted.');
      return;
    }

    // Delete the empty chats
    const chatIds = chatsToDelete.map(chat => chat.id);
    const { error: deleteError } = await supabase
      .from('chats')
      .delete()
      .in('id', chatIds);

    if (deleteError) {
      throw new Error(`Failed to delete empty chats: ${deleteError.message}`);
    }

    console.log(`✅ Successfully deleted ${chatsToDelete.length} empty chats!`);
    
    // Show summary
    const deletedByAge = {
      recent: chatsToDelete.filter(chat => new Date(chat.created_at) > oneDayAgo).length,
      medium: chatsToDelete.filter(chat => 
        new Date(chat.created_at) <= oneDayAgo && new Date(chat.created_at) > oneWeekAgo
      ).length,
      old: chatsToDelete.filter(chat => new Date(chat.created_at) <= oneWeekAgo).length
    };

    console.log('📊 Deleted breakdown:');
    console.log(`  - Recent (< 1 day): ${deletedByAge.recent}`);
    console.log(`  - Medium (1-7 days): ${deletedByAge.medium}`);
    console.log(`  - Old (> 7 days): ${deletedByAge.old}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  }
}

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('  - NEXT_PUBLIC_SUPABASE_URL');
    console.error('  - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  if (!EMTEK_ORG_ID) {
    console.error('❌ Missing EMTEK_ORG_ID environment variable');
    process.exit(1);
  }

  await cleanupEmptyChats();
}

// Only run if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { cleanupEmptyChats };
