/**
 * Test script for chat organization by time periods
 * Tests the categorizeChats function logic
 */

// Mock chat data with different timestamps
const mockChatHistory = [
  {
    id: 1,
    title: "Chat from today",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    title: "Chat from yesterday",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 3,
    title: "Chat from 3 days ago",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 4,
    title: "Chat from 10 days ago",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 5,
    title: "Chat from 20 days ago",
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 6,
    title: "Chat from 2 months ago",
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Copy the categorizeChats function from the component
function categorizeChats(chats) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);
  
  const lastWeekStart = new Date(today);
  lastWeekStart.setDate(lastWeekStart.getDate() - 14);
  
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  const categories = {
    today: [],
    yesterday: [],
    thisWeek: [],
    lastWeek: [],
    thisMonth: [],
    lastMonth: [],
    older: []
  };

  chats.forEach(chat => {
    // Use updatedAt for recency, fallback to createdAt
    const chatDate = new Date(chat.updatedAt || chat.createdAt);
    const chatDateOnly = new Date(chatDate.getFullYear(), chatDate.getMonth(), chatDate.getDate());

    if (chatDateOnly.getTime() === today.getTime()) {
      categories.today.push(chat);
    } else if (chatDateOnly.getTime() === yesterday.getTime()) {
      categories.yesterday.push(chat);
    } else if (chatDate >= thisWeekStart && chatDate < yesterday) {
      categories.thisWeek.push(chat);
    } else if (chatDate >= lastWeekStart && chatDate < thisWeekStart) {
      categories.lastWeek.push(chat);
    } else if (chatDate >= thisMonthStart && chatDate < lastWeekStart) {
      categories.thisMonth.push(chat);
    } else if (chatDate >= lastMonthStart && chatDate <= lastMonthEnd) {
      categories.lastMonth.push(chat);
    } else {
      categories.older.push(chat);
    }
  });

  return categories;
}

// Test the function
console.log('Testing chat categorization...\n');
console.log('Current date:', new Date().toLocaleDateString());
console.log('Number of test chats:', mockChatHistory.length);
console.log('\nInput chats:');
mockChatHistory.forEach(chat => {
  console.log(`- ${chat.title}: ${new Date(chat.createdAt).toLocaleDateString()}`);
});

console.log('\n=== CATEGORIZATION RESULTS ===\n');

const categorized = categorizeChats(mockChatHistory);

Object.entries(categorized).forEach(([category, chats]) => {
  if (chats.length > 0) {
    console.log(`${category.toUpperCase()} (${chats.length} chats):`);
    chats.forEach(chat => {
      console.log(`  - ${chat.title} (${new Date(chat.createdAt).toLocaleDateString()})`);
    });
    console.log('');
  }
});

// Verify all chats are categorized
const totalCategorized = Object.values(categorized).reduce((sum, chats) => sum + chats.length, 0);
console.log(`Total chats categorized: ${totalCategorized}/${mockChatHistory.length}`);

if (totalCategorized === mockChatHistory.length) {
  console.log('✅ All chats successfully categorized!');
} else {
  console.log('❌ Some chats were not categorized properly!');
}
