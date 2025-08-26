// Diagnostic script to test upload functionality and storage configuration
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables - prioritize .env.local over .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // fallback to .env if .env.local doesn't exist

async function diagnoseUploadIssues() {
  console.log('🔍 Diagnosing Upload Issues...\n');

  // Test 1: Environment Variables
  console.log('=== Test 1: Environment Variables ===');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl) {
    console.log('❌ NEXT_PUBLIC_SUPABASE_URL not found');
    return;
  } else {
    console.log('✅ NEXT_PUBLIC_SUPABASE_URL found');
    console.log(`   URL: ${supabaseUrl}`);
  }
  
  if (!supabaseServiceKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found');
    return;
  } else {
    console.log('✅ SUPABASE_SERVICE_ROLE_KEY found');
    console.log(`   Key length: ${supabaseServiceKey.length} chars`);
  }

  // Test 2: Supabase Connection
  console.log('\n=== Test 2: Supabase Connection ===');
  let supabase;
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase client created successfully');
  } catch (error) {
    console.log('❌ Failed to create Supabase client:', error.message);
    return;
  }

  // Test 3: Storage Bucket Existence
  console.log('\n=== Test 3: Storage Bucket Check ===');
  try {
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.log('❌ Failed to list buckets:', bucketsError.message);
      return;
    }
    
    console.log('✅ Successfully listed buckets');
    console.log(`   Found ${buckets.length} buckets:`);
    buckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
    });
    
    const mediaBucket = buckets.find(bucket => bucket.name === 'media');
    if (mediaBucket) {
      console.log('✅ "media" bucket exists');
    } else {
      console.log('❌ "media" bucket NOT found');
      console.log('   📝 Need to create "media" bucket for uploads');
    }
  } catch (error) {
    console.log('❌ Error checking buckets:', error.message);
  }

  // Test 4: Storage Permissions
  console.log('\n=== Test 4: Storage Permissions Test ===');
  try {
    // Try to create a test file
    const testContent = 'test upload content';
    const testFileName = `test-${Date.now()}.txt`;
    const testPath = `test-uploads/${testFileName}`;
    
    console.log(`Attempting to upload test file: ${testPath}`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media')
      .upload(testPath, testContent, {
        contentType: 'text/plain',
        upsert: false
      });
    
    if (uploadError) {
      console.log('❌ Test upload failed:', uploadError.message);
      
      // Check specific error types
      if (uploadError.message.includes('bucket')) {
        console.log('   💡 Bucket-related error - check bucket existence and policies');
      } else if (uploadError.message.includes('permission') || uploadError.message.includes('policy')) {
        console.log('   💡 Permission error - check RLS policies and bucket permissions');
      } else if (uploadError.message.includes('duplicate')) {
        console.log('   💡 File already exists - this is actually good news for permissions');
      }
    } else {
      console.log('✅ Test upload successful');
      console.log(`   Uploaded to: ${uploadData.path}`);
      
      // Test creating signed URL
      console.log('Testing signed URL creation...');
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('media')
        .createSignedUrl(testPath, 60);
      
      if (signedUrlError) {
        console.log('❌ Signed URL creation failed:', signedUrlError.message);
      } else {
        console.log('✅ Signed URL created successfully');
        console.log(`   URL: ${signedUrlData.signedUrl}`);
      }
      
      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from('media')
        .remove([testPath]);
      
      if (deleteError) {
        console.log('⚠️ Failed to clean up test file:', deleteError.message);
      } else {
        console.log('✅ Test file cleaned up');
      }
    }
  } catch (error) {
    console.log('❌ Storage permissions test error:', error.message);
  }

  // Test 5: List existing files in upload directories
  console.log('\n=== Test 5: Existing Files Check ===');
  try {
    // Check chat-media directory (user uploads)
    const { data: chatMediaFiles, error: chatMediaError } = await supabase.storage
      .from('media')
      .list('chat-media', { limit: 10 });
    
    if (chatMediaError) {
      console.log('❌ Failed to list chat-media files:', chatMediaError.message);
    } else {
      console.log(`✅ Found ${chatMediaFiles.length} files in chat-media/`);
      if (chatMediaFiles.length > 0) {
        console.log('   Recent files:');
        chatMediaFiles.slice(0, 3).forEach(file => {
          console.log(`   - ${file.name} (${file.metadata?.size || 'unknown size'})`);
        });
      }
    }
    
    // Check generated-images directory (AI generated)
    const { data: generatedFiles, error: generatedError } = await supabase.storage
      .from('media')
      .list('generated-images', { limit: 10 });
    
    if (generatedError) {
      console.log('❌ Failed to list generated-images files:', generatedError.message);
    } else {
      console.log(`✅ Found ${generatedFiles.length} files in generated-images/`);
      if (generatedFiles.length > 0) {
        console.log('   Recent files:');
        generatedFiles.slice(0, 3).forEach(file => {
          console.log(`   - ${file.name} (${file.metadata?.size || 'unknown size'})`);
        });
      }
    }
  } catch (error) {
    console.log('❌ Error listing existing files:', error.message);
  }

  // Test 6: Check formidable dependency
  console.log('\n=== Test 6: Dependencies Check ===');
  try {
    const packageJson = require('../package.json');
    
    const requiredDeps = {
      'formidable': 'File upload parsing',
      '@supabase/supabase-js': 'Supabase client',
      'crypto': 'UUID generation (built-in)'
    };
    
    Object.entries(requiredDeps).forEach(([dep, description]) => {
      if (dep === 'crypto') {
        console.log(`✅ ${dep} - ${description} (Node.js built-in)`);
      } else if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
        const version = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep];
        console.log(`✅ ${dep} v${version} - ${description}`);
      } else {
        console.log(`❌ ${dep} NOT FOUND - ${description}`);
      }
    });
    
  } catch (error) {
    console.log('❌ Error checking dependencies:', error.message);
  }

  // Test 7: Create a test image file and try uploading
  console.log('\n=== Test 7: Test Image Upload ===');
  try {
    // Create a minimal test PNG (1x1 pixel, base64 encoded)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAHgixRdOgAAAABJRU5ErkJggg==';
    const testImageBuffer = Buffer.from(testImageBase64, 'base64');
    const testImagePath = `test-images/test-${Date.now()}.png`;
    
    console.log('Uploading test PNG image...');
    
    const { data: imageUploadData, error: imageUploadError } = await supabase.storage
      .from('media')
      .upload(testImagePath, testImageBuffer, {
        contentType: 'image/png',
        upsert: false
      });
    
    if (imageUploadError) {
      console.log('❌ Test image upload failed:', imageUploadError.message);
    } else {
      console.log('✅ Test image upload successful');
      
      // Clean up
      await supabase.storage.from('media').remove([testImagePath]);
    }
    
  } catch (error) {
    console.log('❌ Test image upload error:', error.message);
  }

  // Summary and Recommendations
  console.log('\n🏁 Diagnosis Complete');
  console.log('\n📋 Recommendations:');
  console.log('1. If bucket "media" is missing, create it in Supabase dashboard');
  console.log('2. If permissions fail, check RLS policies on the storage bucket');
  console.log('3. If all tests pass, the issue might be in the frontend or API endpoint');
  console.log('4. Check browser network tab for failed requests during upload');
  console.log('5. Verify the upload form is sending POST requests to /api/upload');
}

// Run the diagnosis
diagnoseUploadIssues().catch(console.error);
