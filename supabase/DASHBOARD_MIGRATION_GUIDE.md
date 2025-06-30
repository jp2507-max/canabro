# Applying Migrations Using the Supabase Dashboard

Since you're experiencing issues with the Supabase CLI, here's how to apply the migration using the Supabase Dashboard:

## Step 1: Access the SQL Editor

1. Go to your Supabase project dashboard at https://supabase.com/dashboard/project/xjzhtjeiohjqktibztpk
2. Navigate to the SQL Editor by clicking on "SQL Editor" in the left sidebar
3. Create a new query by clicking the "+" button

## Step 2: Copy and Paste the Migration Script

Copy the entire contents of the migration file (`20250321_fix_auth_profile_creation.sql`) and paste it into the SQL Editor.

## Step 3: Run the Migration

1. Click the "Run" button to execute the migration script
2. The script will:
   - Enable RLS on all tables
   - Create functions to handle user profile creation
   - Set up triggers for automatic profile creation
   - Fix any orphaned users
   - Create appropriate RLS policies

## Step 4: Verify the Migration

After running the migration, verify that it was successful:

1. Go to "Authentication" > "Policies" in the Supabase Dashboard
2. Check that RLS is enabled for all tables (green "Enabled" status)
3. Verify that the appropriate policies are in place for each table
4. Test authentication in your app

## Step 5: Test User Authentication

1. Try signing in with an existing user
2. Try creating a new user
3. Verify that profiles are created correctly
4. Check that users can access their own data but not others' data

## Troubleshooting

If you encounter any issues:

1. Check the SQL Editor for any error messages
2. Verify that all functions and triggers were created correctly
3. Test the `ensure_user_profile` function manually:

```sql
-- Run for a specific user (replace with an actual user UUID)
SELECT ensure_user_profile('user-uuid-here', 'user-email@example.com');

-- Check if the profile was created
SELECT * FROM profiles WHERE id = 'user-uuid-here';
```

4. Check for any orphaned users and fix them:

```sql
-- Find users without profiles
SELECT id, email 
FROM auth.users u 
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);
```

## Next Steps

Once the migration is successfully applied:

1. Continue developing your app with confidence that authentication and RLS are properly configured
2. Consider setting up the Supabase CLI for future migrations (troubleshoot the password issue)
3. Document any changes you make to the database schema
