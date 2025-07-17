// Supabase Config
import Constants from 'expo-constants';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// RapidAPI Config
export const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
export const RAPIDAPI_HOST = 'the-weed-db.p.rapidapi.com';

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
  // Dynamically read password reset redirect URL from Expo Constants extra, with fallback for dev
  passwordResetRedirectTo:
    (Constants.expoConfig?.extra?.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL ||
      (Constants.manifest && (Constants.manifest as any).extra?.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL) ||
      'exp://127.0.0.1:8081/--/reset-password'), // Fallback for local dev
  // To support multiple environments, set EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL in your .env or CI/CD
  // and ensure it is included in app.config.js extra section.
};

// Validate essential configuration
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Supabase URL or Anon Key is missing. Please check your .env file.');
  // Optionally throw an error or provide default values if appropriate
  // throw new Error('Supabase configuration is incomplete.');
}

if (!RAPIDAPI_KEY) {
  console.warn(
    'RapidAPI Key is missing. External strain API calls will fail. Please set EXPO_PUBLIC_RAPIDAPI_KEY in your .env file.'
  );
  console.warn('Example: EXPO_PUBLIC_RAPIDAPI_KEY=your_key_here');
  console.warn(
    'Note: The EXPO_PUBLIC_ prefix is required for client-side access in React Native/Expo.'
  );
}
