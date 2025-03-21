# Supabase Configuration for CanaBro

This directory contains Supabase-related migrations, documentation, and configuration files.

## Authentication Fix for "Database error granting user"

If you're experiencing authentication issues with the error `Database error granting user`, follow these steps:

### Option 1: Using the Supabase Dashboard

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy the contents of `migrations/20250321_fix_auth_profile_creation.sql`
4. Paste into the SQL Editor and run the script
5. Try logging in again

### Option 2: Using the Supabase CLI (Recommended)

1. We've installed the Supabase CLI as a dev dependency in the project.
   You can use it through the npm scripts in package.json:
   ```bash
   # Login to Supabase
   npm run supabase:login
   
   # If you have trouble with password input, generate a token at:
   # https://supabase.com/dashboard/account/tokens
   # Then run:
   npx supabase login --token YOUR_ACCESS_TOKEN
   ```

2. Link your project (first time only):
   ```bash
   npx supabase link --project-ref your-project-ref
   ```

3. Run the migration:
   ```bash
   npm run supabase:migration:up
   ```

## Documentation

- [RLS Testing Guide](./RLS_TESTING_GUIDE.md) - Guide for testing Row Level Security policies
- [Supabase CLI Guide](../docs/supabase-cli-guide.md) - Comprehensive guide for using the Supabase CLI

## Migrations

The `migrations` directory contains SQL migration files that should be applied to your Supabase project:

- `20250321_fix_auth_profile_creation.sql` - Fixes RLS policies and ensures user profiles are created automatically

## Local Development

For local development with Supabase:

1. Start a local Supabase instance:
   ```bash
   npm run supabase:start
   ```

2. Check status:
   ```bash
   npm run supabase:status
   ```

3. Stop when finished:
   ```bash
   npm run supabase:stop
   ```

## Troubleshooting

If you encounter issues:

1. Run the debug script:
   ```bash
   npm run debug-auth
   ```

2. Clear authentication storage:
   ```bash
   npm run clear-auth
   ```

3. Check the Supabase setup helper:
   ```bash
   node scripts/setupSupabase.js
   ```
