#!/usr/bin/env node

/**
 * Build verification script for Netlify deployment
 * This script verifies that all necessary components are in place for a successful build
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying build configuration...\n');

// Check package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
if (!packageJson.scripts || !packageJson.scripts.build) {
  console.error('❌ Build script missing in package.json');
  process.exit(1);
}
console.log('✅ package.json build script found');

// Check next.config.js
const nextConfigPath = path.join(process.cwd(), 'next.config.js');
if (!fs.existsSync(nextConfigPath)) {
  console.error('❌ next.config.js not found');
  process.exit(1);
}
console.log('✅ next.config.js found');

// Check netlify.toml
const netlifyConfigPath = path.join(process.cwd(), 'netlify.toml');
if (!fs.existsSync(netlifyConfigPath)) {
  console.error('❌ netlify.toml not found');
  process.exit(1);
}
console.log('✅ netlify.toml found');

// Check dependencies
console.log('\n📦 Checking dependencies...');
if (!packageJson.dependencies || !packageJson.dependencies.next) {
  console.error('❌ Next.js dependency missing');
  process.exit(1);
}
console.log('✅ Next.js dependency found');

if (!packageJson.dependencies.react) {
  console.error('❌ React dependency missing');
  process.exit(1);
}
console.log('✅ React dependency found');

console.log('\n🎉 Build configuration verification passed!');
console.log('\n📋 Environment variables required for deployment:');
console.log('   - HUB_URL');
console.log('   - TOOL_ORIGIN');
console.log('   - TOOL_SLUG');
console.log('   - NEXT_PUBLIC_TOOL_NAME');
console.log('   - NEXT_PUBLIC_TOOL_DESCRIPTION');
