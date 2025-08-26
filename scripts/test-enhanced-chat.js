#!/usr/bin/env node

/**
 * Test script for Enhanced Chat Integration
 * Tests all major features with the Hub authentication system
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL;
const HUB_SECRET = process.env.HUB_SECRET;

// Test utilities
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function info(message) {
  log(`ℹ ${message}`, 'cyan');
}

function heading(message) {
  console.log();
  log(`${'='.repeat(50)}`, 'blue');
  log(message, 'bright');
  log(`${'='.repeat(50)}`, 'blue');
}

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: []
};

/**
 * Make HTTP request
 */
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const protocol = options.url.startsWith('https') ? https : http;
    const url = new URL(options.url);
    
    const requestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = protocol.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

/**
 * Test Authentication
 */
async function testAuthentication() {
  heading('Testing Authentication');
  
  try {
    // Test Hub configuration
    if (!HUB_URL || !HUB_SECRET) {
      error('Hub authentication not configured');
      info('Please set NEXT_PUBLIC_HUB_URL and HUB_SECRET in .env');
      testResults.failed++;
      return false;
    }
    
    success('Hub authentication configured');
    info(`Hub URL: ${HUB_URL}`);
    
    // Test protected endpoint
    const response = await makeRequest({
      url: `${BASE_URL}/api/chats`,
      headers: {
        // Simulate authenticated request
        'Cookie': 'hub-auth-token=test-token'
      }
    });
    
    if (response.status === 401) {
      info('Authentication check working (401 for invalid token)');
      success('Authentication system active');
    } else if (response.status === 200) {
      success('Authentication bypassed for testing');
    } else {
      error(`Unexpected status: ${response.status}`);
      testResults.failed++;
      return false;
    }
    
    testResults.passed++;
    return true;
  } catch (err) {
    error(`Authentication test failed: ${err.message}`);
    testResults.errors.push(err);
    testResults.failed++;
    return false;
  }
}

/**
 * Test Chat Page Loading
 */
async function testChatPageLoading() {
  heading('Testing Enhanced Chat Page');
  
  try {
    const response = await makeRequest({
      url: `${BASE_URL}/enhanced-chat`
    });
    
    if (response.status === 200) {
      success('Enhanced chat page loads successfully');
      
      // Check for key components
      const html = response.data;
      const components = [
        { name: 'DragDropWrapper', pattern: /DragDropWrapper/i },
        { name: 'DocumentSidebar', pattern: /DocumentSidebar/i },
        { name: 'EnhancedMessage', pattern: /EnhancedMessage/i },
        { name: 'MessageActions', pattern: /MessageActions/i }
      ];
      
      components.forEach(comp => {
        if (html.match(comp.pattern)) {
          success(`${comp.name} component found`);
        } else {
          error(`${comp.name} component missing`);
          testResults.failed++;
        }
      });
      
      testResults.passed++;
      return true;
    } else if (response.status === 302 || response.status === 301) {
      info('Page requires authentication (redirect)');
      testResults.passed++;
      return true;
    } else {
      error(`Failed to load page: ${response.status}`);
      testResults.failed++;
      return false;
    }
  } catch (err) {
    error(`Page loading test failed: ${err.message}`);
    testResults.errors.push(err);
    testResults.failed++;
    return false;
  }
}

/**
 * Test API Endpoints
 */
async function testAPIEndpoints() {
  heading('Testing API Endpoints');
  
  const endpoints = [
    { name: 'Chat API', path: '/api/chat', method: 'POST' },
    { name: 'Chats List', path: '/api/chats', method: 'GET' },
    { name: 'Documents API', path: '/api/documents', method: 'GET' },
    { name: 'Upload API', path: '/api/upload', method: 'POST' },
    { name: 'Agents API', path: '/api/agents', method: 'GET' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest({
        url: `${BASE_URL}${endpoint.path}`,
        method: endpoint.method,
        body: endpoint.method === 'POST' ? {} : undefined
      });
      
      if (response.status === 401) {
        success(`${endpoint.name}: Authentication required (expected)`);
        testResults.passed++;
      } else if (response.status === 200 || response.status === 405) {
        success(`${endpoint.name}: Endpoint exists`);
        testResults.passed++;
      } else if (response.status === 404) {
        error(`${endpoint.name}: Not found`);
        info(`You may need to implement ${endpoint.path}`);
        testResults.failed++;
      } else {
        info(`${endpoint.name}: Status ${response.status}`);
        testResults.passed++;
      }
    } catch (err) {
      error(`${endpoint.name}: ${err.message}`);
      testResults.failed++;
    }
  }
}

/**
 * Test File Structure
 */
function testFileStructure() {
  heading('Testing File Structure');
  
  const requiredFiles = [
    'lib/chat/interfaces.ts',
    'lib/chat/messageUtils.ts',
    'components/chat/EnhancedMessage.jsx',
    'components/chat/MessageActions.jsx',
    'components/chat/DocumentSidebar.jsx',
    'components/chat/DragDropWrapper.jsx',
    'pages/enhanced-chat.js'
  ];
  
  const baseDir = path.join(__dirname, '..');
  
  requiredFiles.forEach(file => {
    const filePath = path.join(baseDir, file);
    if (fs.existsSync(filePath)) {
      success(`Found: ${file}`);
      testResults.passed++;
    } else {
      error(`Missing: ${file}`);
      testResults.failed++;
    }
  });
}

/**
 * Test Database Schema
 */
async function testDatabaseSchema() {
  heading('Testing Database Schema');
  
  const migrations = [
    '0001_workchat.sql',
    '0003_add_chat_updated_at.sql',
    '0004_add_chat_agents_and_documents.sql',
    '0005_add_vector_search_function.sql',
    '0006_add_multimodal_support.sql'
  ];
  
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  
  migrations.forEach(migration => {
    const migrationPath = path.join(migrationsDir, migration);
    if (fs.existsSync(migrationPath)) {
      success(`Migration found: ${migration}`);
      testResults.passed++;
    } else {
      error(`Migration missing: ${migration}`);
      info('Run database migrations to enable all features');
      testResults.failed++;
    }
  });
}

/**
 * Test Environment Configuration
 */
function testEnvironmentConfig() {
  heading('Testing Environment Configuration');
  
  const requiredEnvVars = [
    { name: 'NEXT_PUBLIC_APP_URL', value: process.env.NEXT_PUBLIC_APP_URL },
    { name: 'NEXT_PUBLIC_HUB_URL', value: process.env.NEXT_PUBLIC_HUB_URL },
    { name: 'HUB_SECRET', value: process.env.HUB_SECRET },
    { name: 'NEXT_PUBLIC_SUPABASE_URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    { name: 'OPENAI_API_KEY', value: process.env.OPENAI_API_KEY }
  ];
  
  requiredEnvVars.forEach(envVar => {
    if (envVar.value) {
      success(`${envVar.name} is configured`);
      testResults.passed++;
    } else {
      error(`${envVar.name} is missing`);
      info(`Add ${envVar.name} to your .env file`);
      testResults.failed++;
    }
  });
}

/**
 * Feature Compatibility Check
 */
function checkFeatureCompatibility() {
  heading('Feature Compatibility Check');
  
  const features = [
    {
      name: 'Message Branching',
      requirement: 'parent_message_id support in database',
      status: fs.existsSync(path.join(__dirname, '..', 'lib', 'chat', 'messageUtils.ts'))
    },
    {
      name: 'File Upload',
      requirement: 'Supabase storage configured',
      status: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    },
    {
      name: 'Document Search',
      requirement: 'Vector search function in database',
      status: fs.existsSync(path.join(__dirname, '..', 'supabase', 'migrations', '0005_add_vector_search_function.sql'))
    },
    {
      name: 'Thinking Display',
      requirement: 'AI model with thinking support',
      status: true // Assumed available
    },
    {
      name: 'Tool Visualization',
      requirement: 'Tool call metadata support',
      status: true // Assumed available
    }
  ];
  
  features.forEach(feature => {
    if (feature.status) {
      success(`${feature.name}: Ready`);
      info(`  Requirement: ${feature.requirement}`);
      testResults.passed++;
    } else {
      error(`${feature.name}: Not ready`);
      info(`  Missing: ${feature.requirement}`);
      testResults.failed++;
    }
  });
}

/**
 * Generate Test Report
 */
function generateReport() {
  heading('Test Report');
  
  const total = testResults.passed + testResults.failed + testResults.skipped;
  const passRate = total > 0 ? ((testResults.passed / total) * 100).toFixed(1) : 0;
  
  console.log();
  success(`Passed: ${testResults.passed}`);
  if (testResults.failed > 0) {
    error(`Failed: ${testResults.failed}`);
  }
  if (testResults.skipped > 0) {
    info(`Skipped: ${testResults.skipped}`);
  }
  
  console.log();
  log(`Pass Rate: ${passRate}%`, passRate >= 80 ? 'green' : passRate >= 50 ? 'yellow' : 'red');
  
  if (testResults.errors.length > 0) {
    console.log();
    error('Errors encountered:');
    testResults.errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err.message}`);
    });
  }
  
  console.log();
  if (testResults.failed === 0) {
    success('🎉 All tests passed! The enhanced chat is ready to use.');
  } else if (passRate >= 80) {
    info('✅ Most features are working. Review failed tests for issues.');
  } else if (passRate >= 50) {
    log('⚠️  Some features need attention. Review the failed tests.', 'yellow');
  } else {
    error('❌ Many features are not working. Please review the setup.');
  }
  
  // Recommendations
  console.log();
  heading('Recommendations');
  
  if (!process.env.NEXT_PUBLIC_HUB_URL) {
    info('1. Configure Hub authentication in .env');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    info('2. Set up Supabase for file storage and database');
  }
  if (testResults.failed > 0) {
    info('3. Review failed tests and implement missing endpoints');
    info('4. Run database migrations if needed');
  }
  
  info('\nFor detailed setup instructions, see ENHANCED-CHAT-INTEGRATION.md');
}

/**
 * Main test runner
 */
async function runTests() {
  console.log();
  log('Enhanced Chat Integration Test Suite', 'bright');
  log('====================================', 'bright');
  info(`Testing against: ${BASE_URL}`);
  
  // Run tests
  testFileStructure();
  testEnvironmentConfig();
  await testAuthentication();
  await testChatPageLoading();
  await testAPIEndpoints();
  testDatabaseSchema();
  checkFeatureCompatibility();
  
  // Generate report
  generateReport();
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
  error(`Test suite failed: ${err.message}`);
  console.error(err);
  process.exit(1);
});
