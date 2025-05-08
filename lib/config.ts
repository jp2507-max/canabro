// Supabase Config
import Constants from 'expo-constants';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Environment Config
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isExpoGo = !!Constants.appOwnership && Constants.appOwnership === 'expo';

// Auth Config (Define the missing object)
export const authConfig = {
  forceDevBypass: false, // Set to true to enable dev bypass (ensure devBypassAuth logic is uncommented)
  enableAuthLogging: isDevelopment, // Enable logging only in development
  mockUserId: 'mock-user-id', // Placeholder ID for dev bypass
  mockUserEmail: 'dev@example.com', // Placeholder email for dev bypass
  mockTokenExpiryDays: 7, // Placeholder expiry for dev bypass
};

// Validate essential configuration
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Supabase URL or Anon Key is missing. Please check your .env file.');
  // Optionally throw an error or provide default values if appropriate
  // throw new Error('Supabase configuration is incomplete.');
}
