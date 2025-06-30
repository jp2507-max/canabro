---
# Specify the following for Cascade rules
description: Guidelines for writing Supabase database functions in the context of Canabro app
globs: "**/*.sql"
---

# Supabase Functions in Canabro

This document outlines how to create and use Supabase database functions in the Canabro application.

## Overview

Supabase functions are PostgreSQL functions that allow us to encapsulate complex business logic on the database side. In Canabro, we use them for:

1. Automatic profile creation when users sign up
2. Plant-related operations and data validation
3. Complex queries that would be inefficient to perform client-side

## Creating Supabase Functions

### Basic Function Structure

```sql
CREATE OR REPLACE FUNCTION function_name(param1 type, param2 type)
RETURNS return_type
LANGUAGE plpgsql
SECURITY DEFINER  -- or SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  -- Variable declarations
BEGIN
  -- Function logic
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Error handling
END;
$$;
```

### Security Considerations

- `SECURITY DEFINER`: Function runs with the privileges of the creator (similar to "sudo")
- `SECURITY INVOKER`: Function runs with the privileges of the caller (default, more secure)
- Always set `search_path` to prevent search path attacks

## Key Functions in Canabro

### User Profile Management

```sql
-- Function to ensure a user profile exists
CREATE OR REPLACE FUNCTION public.ensure_user_profile(
  user_id uuid,
  user_email text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  username text;
BEGIN
  -- Extract username from email
  username := split_part(user_email, '@', 1);
  
  -- Insert or update profile
  INSERT INTO profiles (
    id, username, created_at, updated_at
  )
  VALUES (
    user_id, username, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();
    
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in ensure_user_profile: %', SQLERRM;
    RETURN false;
END;
$$;

-- Trigger function for automatic profile creation
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

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Plant Management Functions

```sql
-- Calculate plant growth stage based on metadata
CREATE OR REPLACE FUNCTION public.calculate_plant_stage(
  planted_date timestamp with time zone,
  plant_type text
) RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  days_since_planting integer;
  stage text;
BEGIN
  days_since_planting := EXTRACT(DAY FROM (NOW() - planted_date));
  
  -- Logic depends on plant type
  IF plant_type = 'cannabis' THEN
    IF days_since_planting < 14 THEN
      stage := 'seedling';
    ELSIF days_since_planting < 30 THEN
      stage := 'vegetative';
    ELSIF days_since_planting < 80 THEN
      stage := 'flowering';
    ELSE
      stage := 'harvest';
    END IF;
  ELSE
    -- Default logic for other plants
    IF days_since_planting < 10 THEN
      stage := 'seedling';
    ELSIF days_since_planting < 40 THEN
      stage := 'growing';
    ELSE
      stage := 'mature';
    END IF;
  END IF;
  
  RETURN stage;
END;
$$;

-- Get plant statistics for a user
CREATE OR REPLACE FUNCTION public.get_user_plant_stats(
  user_uuid uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_plants', COUNT(*),
    'active_plants', COUNT(*) FILTER (WHERE status = 'active'),
    'harvested_plants', COUNT(*) FILTER (WHERE status = 'harvested'),
    'seedling_count', COUNT(*) FILTER (WHERE 
      calculate_plant_stage(planted_date, plant_type) = 'seedling'
    ),
    'vegetative_count', COUNT(*) FILTER (WHERE 
      calculate_plant_stage(planted_date, plant_type) = 'vegetative'
    ),
    'flowering_count', COUNT(*) FILTER (WHERE 
      calculate_plant_stage(planted_date, plant_type) = 'flowering'
    ),
    'harvest_count', COUNT(*) FILTER (WHERE 
      calculate_plant_stage(planted_date, plant_type) = 'harvest'
    )
  )
  INTO result
  FROM plants
  WHERE user_id = user_uuid;
  
  RETURN result;
END;
$$;
```

## Calling Functions

### From Supabase Client

```typescript
// Ensure user profile exists
const { data, error } = await supabase.rpc(
  'ensure_user_profile',
  { user_id: userId, user_email: email }
);

// Get plant statistics
const { data, error } = await supabase.rpc(
  'get_user_plant_stats',
  { user_uuid: userId }
);
```

### From SQL

```sql
-- Call a function directly in SQL
SELECT ensure_user_profile('00000000-0000-0000-0000-000000000000', 'test@example.com');

-- Use function result in a query
SELECT * FROM plants
WHERE calculate_plant_stage(planted_date, plant_type) = 'flowering';
```

## Best Practices

1. Keep functions focused on a single responsibility
2. Choose the appropriate security context (DEFINER vs INVOKER)
3. Always set search_path to prevent search path attacks
4. Include error handling with EXCEPTION blocks
5. Log errors with RAISE LOG for debugging
6. Use transactions for operations that need to be atomic
7. Document function purpose, parameters, and return values
8. Consider performance implications for frequently called functions

## Testing Functions

```sql
-- Test a function
DO $$
BEGIN
  PERFORM ensure_user_profile('00000000-0000-0000-0000-000000000000', 'test@example.com');
  RAISE NOTICE 'Test completed';
END;
$$;

-- Check if function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'ensure_user_profile';
