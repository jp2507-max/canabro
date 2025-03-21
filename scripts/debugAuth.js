/**
 * CanaBro Authentication Debugging Script
 * 
 * This script helps diagnose and fix authentication issues with Supabase.
 * Run this script with Node.js to test authentication and create necessary resources.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Load environment variables from .env file
require('dotenv').config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
  console.error('Make sure you have EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}

// Create a Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt for user input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Run various auth tests
async function runAuthTests() {
  console.log('\n====== CANABRO AUTH DEBUGGER ======\n');
  console.log(`Supabase URL: ${supabaseUrl}`);
  
  try {
    // Test 1: Check if we can connect to Supabase
    console.log('\n--- Test 1: Checking Supabase connection ---');
    const { data: testData, error: testError } = await supabase.from('profiles').select('count').limit(1);
    
    if (testError) {
      console.error('❌ Failed to connect to Supabase:', testError.message);
      console.log('Make sure your Supabase instance is running and credentials are correct');
    } else {
      console.log('✅ Successfully connected to Supabase');
    }
    
    // Test 2: Check RLS policies on profiles table
    console.log('\n--- Test 2: Checking Row Level Security policies ---');
    try {
      const { data: policiesData } = await supabase.rpc('check_rls_policies', { target_table: 'profiles' });
      console.log('RLS Policies for profiles table:');
      console.log(policiesData || 'No policies found or function not available');
    } catch (err) {
      console.log('❌ Could not check RLS policies (function may not exist)');
    }
    
    // Test 3: Test user creation
    console.log('\n--- Test 3: Test authentication ---');
    const email = await prompt('Enter email for test user: ');
    const password = await prompt('Enter password for test user: ');
    
    console.log('Attempting to sign up test user...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (authError) {
      console.error('❌ Auth sign up failed:', authError.message);
    } else {
      console.log('✅ Auth sign up successful');
      console.log(`User ID: ${authData.user?.id}`);
      
      // Test 4: Create profile
      console.log('\n--- Test 4: Create profile for user ---');
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        username: email.split('@')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        auth_provider: 'email',
        email_verified: false,
        last_sign_in: new Date().toISOString()
      });
      
      if (profileError) {
        console.error('❌ Profile creation failed:', profileError.message);
        
        // Try to fix the issue by generating a SQL fix script
        console.log('\nGenerating SQL fix script...');
        const fixScript = generateFixScript();
        const fixScriptPath = path.join(__dirname, 'auth_fix.sql');
        fs.writeFileSync(fixScriptPath, fixScript);
        console.log(`SQL fix script generated at: ${fixScriptPath}`);
        console.log('Run this script in your Supabase SQL editor to fix authentication issues');
      } else {
        console.log('✅ Profile creation successful');
      }
      
      // Test 5: Try signing in
      console.log('\n--- Test 5: Test sign in ---');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) {
        console.error('❌ Sign in failed:', signInError.message);
      } else {
        console.log('✅ Sign in successful');
      }
    }
    
  } catch (error) {
    console.error('❌ An unexpected error occurred:', error);
  }
  
  rl.close();
  console.log('\n==== DEBUG COMPLETE ====\n');
}

// Generate a SQL fix script based on common issues
function generateFixScript() {
  return `-- Generated Auth Fix Script
-- Run this in your Supabase SQL Editor

-- 1. Make sure RLS is enabled on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Clean up any conflicting policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can view public profiles" ON profiles;

-- 3. Create proper RLS policies
-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can create their own profile" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow users to view all profiles
CREATE POLICY "Users can view all profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

-- 4. Create a function to automatically create profiles for new users
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

-- 5. Create a trigger to automatically create profiles for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- 7. Fix any orphaned users
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
`;
}

// Run the tests
runAuthTests();
