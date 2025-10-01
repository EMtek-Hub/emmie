# Fix for "Failed to sync user data" Error

## Problem Identified ✅

The "Failed to sync user data" error occurs because:

1. **Schema Mismatch**: Your Supabase `users` table has `id` column defined as `UUID` type
2. **Azure AD Integration**: EMtek Hub sends Azure AD object IDs which are text strings, not UUIDs
3. **Database Rejection**: PostgreSQL rejects non-UUID strings when trying to insert into UUID columns

**Error Code**: `22P02 - invalid input syntax for type uuid`

## Root Cause

When a user authenticates through EMtek Hub, the system tries to call `ensureUser()` with an Azure AD object ID like `"azure-ad-object-id-12345"`, but the database expects a UUID format like `"12345678-1234-1234-1234-123456789012"`.

## Solution

Change the `users` table schema to use `TEXT` instead of `UUID` for user IDs to support Azure AD object IDs.

## How to Fix

### Option 1: Run Migration in Supabase Dashboard (Recommended)

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to your project: `shpagletfskkrcuaqqed`
3. Go to **SQL Editor**
4. Copy and paste the contents of `supabase/migrations/0002_fix_user_id_for_azure_ad.sql`
5. Click **Run** to execute the migration

### Option 2: Use Supabase CLI (if you have it installed)

```bash
npx supabase db push
```

### Option 3: Manual Schema Changes

If you prefer to do it manually in the Supabase dashboard:

1. Go to **Database** > **Tables** > **users**
2. Edit the `id` column and change type from `uuid` to `text`
3. Update all foreign key references in other tables:
   - `project_members.user_id`
   - `projects.created_by`
   - `project_facts.created_by`
   - `project_notes.created_by`
   - `chats.created_by`
   - `files.uploader_id`

## Verification

After applying the migration, you can test the fix by:

1. Restarting your application: `npm run dev`
2. Authenticating through EMtek Hub
3. Accessing `/projects` or any protected page
4. The "Failed to sync user data" error should be resolved

## Test Scripts Available

- `scripts/diagnose-db.js` - Checks database schema health
- `scripts/test-user-sync.js` - Tests user creation with various ID formats
- `scripts/fix-user-id-schema.js` - Automated fix script (may need privileges)

## Files Created/Modified

- ✅ `supabase/migrations/0002_fix_user_id_for_azure_ad.sql` - Migration file
- ✅ `scripts/diagnose-db.js` - Database diagnostic tool
- ✅ `scripts/test-user-sync.js` - User sync testing tool
- ✅ `pages/api/debug/test-user-sync.js` - API endpoint for testing

## Expected Outcome

After applying this fix:
- ✅ Azure AD object IDs will be accepted as user IDs
- ✅ EMtek Hub authentication will work seamlessly  
- ✅ User sync will complete successfully
- ✅ Projects and other features will be accessible

## Next Steps

1. **Apply the migration** using one of the options above
2. **Test authentication** by accessing your application
3. **Remove debug files** (optional) once everything is working:
   - `pages/api/debug/test-user-sync.js`
   - `scripts/test-user-sync.js`
   - `scripts/fix-user-id-schema.js`

The core issue has been identified and the solution is ready to implement! 🎉
