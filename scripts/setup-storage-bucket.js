// scripts/setup-storage-bucket.js
// Setup script to create the media storage bucket in Supabase

const { createClient } = require('@supabase/supabase-js');

// Check for required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function setupStorageBucket() {
  console.log('🚀 Setting up Supabase Storage bucket for media files...\n');

  try {
    // Check if bucket already exists
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Failed to list buckets:', listError);
      return;
    }

    const bucketExists = existingBuckets?.some(bucket => bucket.name === 'media');

    if (bucketExists) {
      console.log('✅ Media bucket already exists');
    } else {
      // Create the media bucket
      const { data, error: createError } = await supabase.storage.createBucket('media', {
        public: false, // Keep private, we'll use signed URLs
        fileSizeLimit: 20971520, // 20MB limit
        allowedMimeTypes: [
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/webp',
          'image/gif',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'text/markdown'
        ]
      });

      if (createError) {
        console.error('❌ Failed to create media bucket:', createError);
        return;
      }

      console.log('✅ Created media bucket successfully');
    }

    // Set up storage policies for the bucket
    console.log('\n📝 Setting up storage policies...');

    // First, get existing policies to avoid duplicates
    const { data: existingPolicies, error: policiesError } = await supabase
      .from('storage.policies')
      .select('*')
      .eq('bucket_id', 'media');

    if (policiesError && policiesError.code !== 'PGRST116') {
      console.error('❌ Error checking existing policies:', policiesError);
    }

    // Define policies
    const policies = [
      {
        name: 'Authenticated users can upload',
        definition: `(auth.role() = 'authenticated')`,
        check: `(auth.role() = 'authenticated')`,
        command: 'INSERT'
      },
      {
        name: 'Authenticated users can update their files',
        definition: `(auth.role() = 'authenticated')`,
        check: `(auth.role() = 'authenticated')`,
        command: 'UPDATE'
      },
      {
        name: 'Authenticated users can delete their files',
        definition: `(auth.role() = 'authenticated')`,
        command: 'DELETE'
      },
      {
        name: 'Authenticated users can view files',
        definition: `(auth.role() = 'authenticated')`,
        command: 'SELECT'
      }
    ];

    // Note: Setting RLS policies requires direct database access
    // which is not available through the storage API
    console.log('⚠️  Note: RLS policies need to be set manually in Supabase Dashboard');
    console.log('   Go to Storage > media bucket > Policies and add:');
    console.log('   - Allow authenticated users to upload (INSERT)');
    console.log('   - Allow authenticated users to read (SELECT)');
    console.log('   - Allow authenticated users to update (UPDATE)');
    console.log('   - Allow authenticated users to delete (DELETE)');

    // Create folders structure
    console.log('\n📁 Creating folder structure...');
    
    const folders = [
      'chat-media/',
      'generated-images/',
      'edited-images/',
      'document-uploads/'
    ];

    for (const folder of folders) {
      // Create a placeholder file to establish the folder
      const placeholderContent = new Blob(['# Folder placeholder'], { type: 'text/plain' });
      const { error } = await supabase.storage
        .from('media')
        .upload(`${folder}.placeholder`, placeholderContent, {
          upsert: true
        });

      if (error && error.message !== 'The resource already exists') {
        console.error(`❌ Failed to create folder ${folder}:`, error);
      } else {
        console.log(`✅ Created folder: ${folder}`);
      }
    }

    console.log('\n✨ Storage bucket setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to Storage > Policies');
    console.log('3. Add RLS policies for the media bucket');
    console.log('4. Enable CORS if needed for your domain\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the setup
setupStorageBucket();
