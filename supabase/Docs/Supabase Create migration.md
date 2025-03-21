---
# Specify the following for Cascade rules
description: Guidelines for writing Postgres migrations in the context of Canabro app
globs: "supabase/migrations/**/*.sql"
---

# Supabase Migrations in Canabro

This document explains how to create and manage database migrations for the Canabro application using Supabase.

## Overview

Database migrations are a way to manage changes to your database schema over time. In Canabro, we use Supabase migrations to:

1. Track and version database schema changes
2. Deploy consistent schema changes across environments
3. Set up initial database state for new deployments
4. Fix database-related issues like authentication problems

## Migration Structure

### Directory Structure

```
/supabase
  /migrations
    /<timestamp>_migration_name.sql
    /20250321_fix_auth_profile_creation.sql
    /20250315_create_initial_schema.sql
  /seed
    /seed.sql
```

### Naming Convention

- Use timestamp prefix: `YYYYMMDD_descriptive_name.sql`
- Use lowercase and underscores for readability
- Make names descriptive of what the migration does

## Creating Migrations

### Manual Creation

1. Create a new SQL file in the `/supabase/migrations` directory
2. Name it following the convention (e.g., `20250330_add_plant_categories.sql`)
3. Write SQL statements for the changes needed

### Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Generate a new migration
supabase migration new add_plant_categories

# Apply migrations
supabase db push
```

## Migration Best Practices

1. **Idempotent Migrations**: Use `CREATE OR REPLACE` and `IF NOT EXISTS` clauses
2. **Atomic Changes**: Each migration should represent a cohesive set of changes
3. **Forward-only**: Avoid breaking changes; add columns instead of removing them
4. **Include Rollbacks**: Where possible, include `-- Rollback:` comments

## Example Migrations

### Initial Schema Setup

```sql
-- Migration: 20250315_create_initial_schema.sql

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create plants table
CREATE TABLE IF NOT EXISTS public.plants (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  strain TEXT,
  planted_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'active',
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create diary_entries table
CREATE TABLE IF NOT EXISTS public.diary_entries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plant_id BIGINT NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  images TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

-- Create necessary indexes
CREATE INDEX IF NOT EXISTS plants_user_id_idx ON public.plants(user_id);
CREATE INDEX IF NOT EXISTS diary_entries_plant_id_idx ON public.diary_entries(plant_id);
CREATE INDEX IF NOT EXISTS diary_entries_user_id_idx ON public.diary_entries(user_id);
```

### Fix Authentication Issues

```sql
-- Migration: 20250321_fix_auth_profile_creation.sql

-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, created_at, updated_at)
  VALUES (NEW.id, split_part(NEW.email, '@', 1), NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create profiles for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Set up RLS policies for profiles
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
CREATE POLICY "Users can create their own profile" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view all profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

-- Fix any orphaned users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id, email 
    FROM auth.users u 
    WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
  LOOP
    INSERT INTO public.profiles (id, username, created_at, updated_at)
    VALUES (user_record.id, split_part(user_record.email, '@', 1), NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END;
$$;
```

## Applying Migrations

### Manual Application

1. Go to the Supabase dashboard
2. Navigate to the SQL Editor
3. Open the migration file
4. Run the SQL statements

### Using Supabase CLI

```bash
# Apply all pending migrations
supabase db push

# Reset and apply all migrations (CAUTION: destroys data)
supabase db reset
```

## Troubleshooting Migrations

1. **Syntax Errors**: Ensure SQL follows PostgreSQL syntax
2. **Failed Migrations**: Check logs in the Supabase dashboard
3. **Conflicts**: Resolve existing objects or use IF NOT EXISTS clauses
4. **Performance Issues**: Consider adding indexes for large tables
5. **Testing**: Always test migrations in development before production

## Migration for Authentication Fix

For the "Database error granting user" issue in Canabro, run the `20250321_fix_auth_profile_creation.sql` migration. This will:

1. Set up proper RLS policies for the profiles table
2. Create a trigger to automatically create profiles for new users
3. Fix any existing users without profiles
