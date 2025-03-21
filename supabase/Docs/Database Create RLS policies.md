---
# Specify the following for Cascade rules
description: Guidelines for writing Postgres Row Level Security policies
globs: "**/*.sql"
---

# Database: Create RLS policies

You're a Supabase Postgres expert in writing row level security policies. Your purpose is to generate a policy with the constraints given by the user. You should first retrieve schema information to write policies for, usually the 'public' schema.

The output should use the following instructions:

- The generated SQL must be valid SQL.
- You can use only CREATE POLICY or ALTER POLICY queries, no other queries are allowed.
- Always use double apostrophe in SQL strings (eg. 'Night''s watch')
- You can add short explanations to your messages.
- The result should be a valid markdown. The SQL code should be wrapped in ``` (including sql language tag).
- Always use "auth.uid()" instead of "current_user".
- SELECT policies should always have USING but not WITH CHECK
- INSERT policies should always have WITH CHECK but not USING
- UPDATE policies should always have WITH CHECK and most often have USING
- DELETE policies should always have USING but not WITH CHECK
- Don't use `FOR ALL`. Instead separate into 4 separate policies for select, insert, update, and delete.
- The policy name should be short but detailed text explaining the policy, enclosed in double quotes.
- Always put explanations as separate text. Never use inline SQL comments.
- If the user asks for something that's not related to SQL policies, explain to the user
  that you can only help with policies.
- Discourage `RESTRICTIVE` policies and encourage `PERMISSIVE` policies, and explain why.

The output should look like this:

```sql
CREATE POLICY "My descriptive policy." ON books FOR INSERT to authenticated USING ( (select auth.uid()) = author_id ) WITH ( true );
```

Since you are running in a Supabase environment, take note of these Supabase-specific additions below.

## Authenticated and unauthenticated roles

Supabase maps every request to one of the roles:

- `anon`: an unauthenticated request (the user is not logged in)
- `authenticated`: an authenticated request (the user is logged in)

These are actually [Postgres Roles](/docs/guides/database/postgres/roles). You can use these roles within your Policies using the `TO` clause:

```sql
create policy "Profiles are viewable by everyone"
on profiles
for select
to authenticated, anon
using ( true );

-- OR

create policy "Public profiles are viewable only by authenticated users"
on profiles
for select
to authenticated
using ( true );
```

Note that `for ...` must be added after the table but before the roles. `to ...` must be added after `for ...`:

### Incorrect

```sql
create policy "Public profiles are viewable only by authenticated users"
on profiles
to authenticated
for select
using ( true );
```

### Correct

```sql
create policy "Public profiles are viewable only by authenticated users"
on profiles
for select
to authenticated
using ( true );
```

## Multiple operations

PostgreSQL policies do not support specifying multiple operations in a single FOR clause. You need to create separate policies for each operation.

### Incorrect

```sql
create policy "Profiles can be created and deleted by any user"
on profiles
for insert, delete -- cannot create a policy on multiple operators
to authenticated
with check ( true )
using ( true );
```

### Correct

```sql
create policy "Profiles can be created by any user"
on profiles
for insert
to authenticated
with check ( true );

create policy "Profiles can be deleted by any user"
on profiles
for delete
to authenticated
using ( true );
```

## Helper functions

Supabase provides some helper functions that make it easier to write Policies.

### `auth.uid()`

Returns the ID of the user making the request.

### `auth.jwt()`

Returns the JWT of the user making the request. Anything that you store in the user's `raw_app_meta_data` column or the `raw_user_meta_data` column will be accessible using this function. It's essential to know the distinction between these two:

- `raw_user_meta_data` - can be updated by the authenticated user using the `supabase.auth.update()` function. It is not a good place to store authorization data.
- `raw_app_meta_data` - cannot be updated by the user, so it's a good place to store authorization data.

The `auth.jwt()` function is extremely versatile. For example, if you store some team data inside `app_metadata`, you can use it to determine whether a particular user belongs to a team. For example, if this was an array of IDs:

```sql
create policy "User is in team"
on my_table
to authenticated
using ( team_id in (select auth.jwt() -> 'app_metadata' -> 'teams'));
```

### MFA

The `auth.jwt()` function can be used to check for [Multi-Factor Authentication](/docs/guides/auth/auth-mfa#enforce-rules-for-mfa-logins). For example, you could restrict a user from updating their profile unless they have at least 2 levels of authentication (Assurance Level 2):

```sql
create policy "Restrict updates."
on profiles
as permissive
for update
to authenticated using (
  (select auth.jwt()->>'aal') = 'aal2'
);
```

## RLS performance recommendations

Every authorization system has an impact on performance. While row level security is powerful, the performance impact is crucial to keep in mind. This is especially true for queries that scan every row in a table - like many `select` operations, including those using limit, offset, and ordering.

Based on a series of [tests](https://github.com/GaryAustin1/RLS-Performance), we have a few recommendations for RLS:

### Add indexes

Make sure you've added [indexes](/docs/guides/database/postgres/indexes) on any columns used within the Policies which are not already indexed (or primary keys). For a Policy like this:

```sql
create policy "Users can access their own records" on test_table
to authenticated
using ( (select auth.uid()) = user_id );
```

You can add an index like:

```sql
create index userid
on test_table
using btree (user_id);
```

### Call functions with `select`

You can use `select` statement to improve policies that use functions. For example, instead of this:

```sql
create policy "Users can access their own records" on test_table
to authenticated
using ( auth.uid() = user_id );
```

You can do:

```sql
create policy "Users can access their own records" on test_table
to authenticated
using ( (select auth.uid()) = user_id );
```

This method works well for JWT functions like `auth.uid()` and `auth.jwt()` as well as `security definer` Functions. Wrapping the function causes an `initPlan` to be run by the Postgres optimizer, which allows it to "cache" the results per-statement, rather than calling the function on each row.

Caution: You can only use this technique if the results of the query or function do not change based on the row data.

### Minimize joins

You can often rewrite your Policies to avoid joins between the source and the target table. Instead, try to organize your policy to fetch all the relevant data from the target table into an array or set, then you can use an `IN` or `ANY` operation in your filter.

For example, this is an example of a slow policy which joins the source `test_table` to the target `team_user`:

```sql
create policy "Users can access records belonging to their teams" on test_table
to authenticated
using (
  (select auth.uid()) in (
    select user_id
    from team_user
    where team_user.team_id = team_id -- joins to the source "test_table.team_id"
  )
);
```

We can rewrite this to avoid this join, and instead select the filter criteria into a set:

```sql
create policy "Users can access records belonging to their teams" on test_table
to authenticated
using (
  team_id in (
    select team_id
    from team_user
    where user_id = (select auth.uid()) -- no join
  )
);
```

### Specify roles in your policies

Always use the Role of inside your policies, specified by the `TO` operator. For example, instead of this query:

```sql
create policy "Users can access their own records" on rls_test
using ( auth.uid() = user_id );
```

Use:

```sql
create policy "Users can access their own records" on rls_test
to authenticated
using ( (select auth.uid()) = user_id );
```

This prevents the policy `( (select auth.uid()) = user_id )` from running for any `anon` users, since the execution stops at the `to authenticated` step.

# Row Level Security (RLS) Policies in Canabro

This document outlines the Row Level Security (RLS) policies used in the Canabro application to protect user data and ensure proper access control.

## What is Row Level Security?

Row Level Security (RLS) is a feature of PostgreSQL that allows for fine-grained control over which rows in a table a user can access. In Supabase, RLS is used to restrict access to data based on who is making the request. It enables us to:

1. Prevent users from accessing other users' private data
2. Allow selective sharing of data between users
3. Create public/private data visibility rules
4. Implement complex access patterns based on user roles or relationships

## RLS Implementation in Canabro

### General Principles

1. **Default Deny**: All tables have RLS enabled with no default access
2. **Explicit Policies**: Access is explicitly granted through policies
3. **Least Privilege**: Users only have access to what they need
4. **Role-Based**: Policies are applied based on user roles (anonymous vs. authenticated)

### Common Policy Types

#### Profile Policies

```sql
-- Allow authenticated users to view all profiles
CREATE POLICY "Users can view all profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated users to create their own profile
CREATE POLICY "Users can create their own profile" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

#### User-Owned Resource Policies (Plants, Journals, etc.)

```sql
-- Users can view public resources
CREATE POLICY "Users can view public resources" 
ON public.resource_table FOR SELECT 
TO authenticated 
USING (is_public = true OR user_id = auth.uid());

-- Users can create their own resources
CREATE POLICY "Users can create own resources" 
ON public.resource_table FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- Users can update their own resources
CREATE POLICY "Users can update own resources" 
ON public.resource_table FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own resources
CREATE POLICY "Users can delete own resources" 
ON public.resource_table FOR DELETE 
TO authenticated 
USING (user_id = auth.uid());
```

#### Social Interaction Policies (Comments, Likes, Follows)

```sql
-- Everyone can view social interactions
CREATE POLICY "Everyone can view social interactions" 
ON public.social_table FOR SELECT 
TO authenticated 
USING (true);

-- Users can create interactions linked to themselves
CREATE POLICY "Users can create own interactions" 
ON public.social_table FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- Users can only modify their own interactions
CREATE POLICY "Users can modify own interactions" 
ON public.social_table FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own interactions
CREATE POLICY "Users can delete own interactions" 
ON public.social_table FOR DELETE 
TO authenticated 
USING (user_id = auth.uid());
```

## Table-Specific RLS Policies

### Profiles Table

| Policy Name | Operation | For | Condition |
|-------------|-----------|-----|-----------|
| Users can view all profiles | SELECT | authenticated | true |
| Users can create their own profile | INSERT | authenticated | auth.uid() = id |
| Users can update their own profile | UPDATE | authenticated | auth.uid() = id |

### Grow Journals Table

| Policy Name | Operation | For | Condition |
|-------------|-----------|-----|-----------|
| Journals are viewable by everyone | SELECT | authenticated | is_public = true OR user_id = auth.uid() |
| Users can create their own journals | INSERT | authenticated | user_id = auth.uid() |
| Users can update own journals | UPDATE | authenticated | user_id = auth.uid() |
| Users can delete own journals | DELETE | authenticated | user_id = auth.uid() |

### Journal Entries Table

| Policy Name | Operation | For | Condition |
|-------------|-----------|-----|-----------|
| Users can view entries of public journals | SELECT | authenticated | EXISTS (SELECT 1 FROM grow_journals WHERE id = journal_entries.journal_id AND (is_public = true OR user_id = auth.uid())) |
| Users can create entries in own journals | INSERT | authenticated | EXISTS (SELECT 1 FROM grow_journals WHERE id = NEW.journal_id AND user_id = auth.uid()) |
| Users can update own journal entries | UPDATE | authenticated | user_id = auth.uid() |
| Users can delete own journal entries | DELETE | authenticated | user_id = auth.uid() |

### Posts Table

| Policy Name | Operation | For | Condition |
|-------------|-----------|-----|-----------|
| Posts are viewable by everyone | SELECT | authenticated | true |
| Users can create their own posts | INSERT | authenticated | user_id = auth.uid() |
| Users can update own posts | UPDATE | authenticated | user_id = auth.uid() |
| Users can delete own posts | DELETE | authenticated | user_id = auth.uid() |

### Comments Table 

| Policy Name | Operation | For | Condition |
|-------------|-----------|-----|-----------|
| Comments are viewable by everyone | SELECT | authenticated | true |
| Users can create comments | INSERT | authenticated | user_id = auth.uid() |
| Users can update own comments | UPDATE | authenticated | user_id = auth.uid() |
| Users can delete own comments | DELETE | authenticated | user_id = auth.uid() |

### Likes Table

| Policy Name | Operation | For | Condition |
|-------------|-----------|-----|-----------|
| Likes are viewable by everyone | SELECT | authenticated | true |
| Users can create likes | INSERT | authenticated | user_id = auth.uid() |
| Users can delete own likes | DELETE | authenticated | user_id = auth.uid() |

### Follows Table

| Policy Name | Operation | For | Condition |
|-------------|-----------|-----|-----------|
| Follows are viewable by everyone | SELECT | authenticated | true |
| Users can follow others | INSERT | authenticated | follower_id = auth.uid() |
| Users can unfollow | DELETE | authenticated | follower_id = auth.uid() |

### Strains Table

| Policy Name | Operation | For | Condition |
|-------------|-----------|-----|-----------|
| Strains are viewable by everyone | SELECT | authenticated | true |
| Users can create strains | INSERT | authenticated | created_by = auth.uid() |
| Creators can update their own strains | UPDATE | authenticated | created_by = auth.uid() |

### Strain Reviews Table

| Policy Name | Operation | For | Condition |
|-------------|-----------|-----|-----------|
| Strain reviews are viewable by everyone | SELECT | authenticated | true |
| Users can create their own strain reviews | INSERT | authenticated | user_id = auth.uid() |
| Users can update their own strain reviews | UPDATE | authenticated | user_id = auth.uid() |
| Users can delete their own strain reviews | DELETE | authenticated | user_id = auth.uid() |

### Notifications Table

| Policy Name | Operation | For | Condition |
|-------------|-----------|-----|-----------|
| Users can view their own notifications | SELECT | authenticated | user_id = auth.uid() |
| System can create notifications | INSERT | authenticated | true |
| Users can mark notifications as read | UPDATE | authenticated | user_id = auth.uid() |
| Users can delete own notifications | DELETE | authenticated | user_id = auth.uid() |

## Triggers and Functions for RLS

### Profile Creation Trigger

The `on_auth_user_created` trigger automatically creates a profile record when a new user signs up:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    username, 
    created_at, 
    updated_at,
    auth_provider,
    email_verified,
    last_sign_in
  )
  VALUES (
    NEW.id, 
    split_part(NEW.email, '@', 1), 
    NOW(), 
    NOW(),
    'email',
    false,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Ensure User Profile Function

This helper function ensures a user profile exists, creating one if needed:

```sql
CREATE OR REPLACE FUNCTION public.ensure_user_profile(
  user_id uuid,
  username_param text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_id uuid;
  derived_username text;
BEGIN
  -- Check if profile exists
  SELECT id INTO profile_id FROM profiles WHERE id = user_id;
  
  -- If profile doesn't exist, create it
  IF profile_id IS NULL THEN
    -- Get username from auth.users if not provided
    IF username_param IS NULL THEN
      SELECT email INTO derived_username FROM auth.users WHERE id = user_id;
      derived_username := split_part(derived_username, '@', 1);
    ELSE
      derived_username := username_param;
    END IF;
    
    -- Insert new profile
    INSERT INTO profiles (id, username, created_at, updated_at)
    VALUES (user_id, derived_username, NOW(), NOW())
    RETURNING id INTO profile_id;
  END IF;
  
  RETURN profile_id;
END;
$$;
```

## Testing RLS Policies

To test RLS policies, you can impersonate different users in the Supabase dashboard:

1. Go to the SQL Editor in the Supabase dashboard
2. Run the following to impersonate a user:
   ```sql
   -- Impersonate a specific user
   SELECT set_config('request.jwt.claims', '{"sub": "USER_UUID", "role": "authenticated"}', false);
   
   -- Try to access data
   SELECT * FROM your_table;
   ```

3. To return to normal:
   ```sql
   -- Reset to default
   SELECT set_config('request.jwt.claims', '', false);
   ```

## Common RLS Patterns

### Public vs. Private Resources

For resources that can be either public or private:

```sql
CREATE POLICY "Access public or own resources"
ON table_name FOR SELECT
TO authenticated
USING (is_public = true OR user_id = auth.uid());
```

### Owner and Collaborators

For resources that have an owner but can be shared with collaborators:

```sql
CREATE POLICY "Owner and collaborators can access"
ON table_name FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM collaborators 
    WHERE resource_id = table_name.id 
    AND user_id = auth.uid()
  )
);
```

### Role-Based Access

For different access levels based on user roles:

```sql
CREATE POLICY "Admin can do anything"
ON table_name FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);
```

## Best Practices for RLS

1. **Test Thoroughly**: Test all policies with different user scenarios
2. **Keep It Simple**: Use simple, clear policies when possible
3. **Avoid Performance Issues**: Be mindful of complex USING conditions
4. **Document Everything**: Keep this document updated as policies change
5. **Set Default Deny**: Always start with no access and add policies
6. **Use Functions**: Reuse logic with functions for complex conditions
7. **Consider Edge Cases**: What happens with deleted users or resources?
8. **Audit Regularly**: Review policies periodically for security issues
