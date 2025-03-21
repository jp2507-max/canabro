# CanaBro Authentication System

## Overview

The CanaBro app uses Supabase for authentication. This document explains how authentication is implemented, common issues, and how to handle development vs. production environments.

## Authentication Components

1. **AuthProvider Context** (`lib/contexts/AuthProvider.tsx`):
   - Manages authentication state (session, user)
   - Provides sign-in, sign-up, sign-out functionality
   - Handles session refresh and persistence
   - Uses Supabase Auth with secure storage

2. **Protected Routes** (`lib/hooks/useProtectedRoute.ts`):
   - Custom hook to protect routes requiring authentication
   - Redirects unauthenticated users to login screen
   - Provides loading state for auth checks

3. **Config Settings** (`lib/config.ts`):
   - Controls development mode behavior
   - Manages authentication settings like automatic bypass login

## Expo Go Limitations

> **Note (Updated March 21, 2025)**: Due to technical limitations in Expo Go, we currently use development bypass authentication when running in Expo Go:

1. **SQLite with JSI**: Expo Go doesn't support native SQLite with JSI enabled. As a result, we use a mock database adapter in Expo Go.

2. **Development Bypass**: The app will use a mock user and session when running in Expo Go to avoid authentication issues with the mock database adapter.

3. **Development Build**: For full functionality with real SQLite storage and real Supabase authentication, you'll need to create a development build:
   ```
   npx expo prebuild
   npx expo run:android  # or run:ios
   ```

## Development Mode

In development mode (specifically Expo Go), the app uses a special bypass authentication mechanism to avoid issues with Supabase authentication:

- The `devBypassAuth` function creates a mock user and session
- The `forceDevBypass` config setting determines if this happens automatically (now set to `true` by default)
- A development mode indicator is shown in the UI

## Common Issues and Solutions

### "Cannot read property 'initializeJSI' of null" Error

This error occurs when trying to use the SQLite adapter with JSI in Expo Go, which isn't supported.

**Solutions:**
1. **Use development bypass**: Continue using Expo Go with mock authentication and mock local database
2. **Create development build**: For full functionality, create a development build with `npx expo prebuild`

### "Database error granting user" Error

This error occurs when Supabase cannot properly associate the authenticated user with database permissions.

**Solutions:**

1. **Use Development Bypass** (recommended for Expo Go):
   - In development, you should enable the dev bypass authentication
   - Ensure `forceDevBypass: true` is set in `lib/config.ts`

2. **Fix Supabase Database**:
   - Run the SQL script in `supabase/migrations/20250321_fix_auth_profile_creation.sql` on your Supabase instance
   - This will fix RLS policies and create a trigger to ensure profiles are created

3. **Debug with Scripts**:
   - Use the `scripts/debugAuth.js` script to diagnose authentication issues
   - Run with Node.js: `node scripts/debugAuth.js`

## Row-Level Security (RLS)

CanaBro uses the following RLS policies for profiles:

1. Authenticated users can create their own profile
2. Users can update their own profile
3. All authenticated users can view all profiles

## Supabase Database Schema

The authentication system relies on a properly set up `profiles` table with the following key fields:
- `id` (matches the Supabase Auth user ID)
- `username`
- `created_at`
- `updated_at`
- `auth_provider`
- `email_verified`
- `last_sign_in`

## Best Practices

1. Always use the `useAuth()` hook to access authentication functionality
2. Protect sensitive routes with the `useProtectedRoute()` hook
3. Handle loading states properly to avoid UI flashes
4. Test authentication in both development and production environments
