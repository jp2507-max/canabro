/**
 * Utility script to clear all stored authentication data
 * 
 * Run this with Node.js when you want to reset the authentication state:
 * npx expo-env-info
 * npx expo start --clear
 */

console.log(`
======================================
CANABRO AUTHENTICATION CLEARER
======================================

To completely clear your authentication state:

1. Delete the app from your device
2. In Expo Go, press the "..." menu on your app and select "Clear Data" 
3. Restart the Expo development server with:
   npx expo start --clear

For development server issues:
- Press 'm' to toggle the menu in Expo CLI
- Press 'r' to restart bundler
- Press 'c' to clear cache
- Press 'd' to open developer tools

For Supabase RLS policy testing:
- Run the SQL script in your Supabase dashboard:
  supabase/migrations/20250321_fix_auth_profile_creation.sql

For detailed auth debugging:
- Run: node scripts/debugAuth.js

======================================
`);
