// lib/db.ts
import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { 
    auth: { 
      persistSession: false 
    }
  }
);

// Helper constants for EMtek single-tenant setup
export const EMTEK_ORG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Ensure user exists in Supabase with EMtek org mapping
 */
export async function ensureUser(hubUserId: string, email: string, displayName?: string) {
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', hubUserId)
    .single();

  if (!existingUser) {
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert([{
        id: hubUserId,
        org_id: EMTEK_ORG_ID,
        email,
        display_name: displayName || null,
        role: 'member'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      throw error;
    }
    return newUser;
  }

  return existingUser;
}
