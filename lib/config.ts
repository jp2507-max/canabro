/**
 * CanaBro app configuration
 * 
 * This file contains configuration settings for the CanaBro app
 */

import Constants from 'expo-constants';

// Environment detection
export const isExpoGo = Constants.appOwnership === 'expo';
export const isDevelopment = process.env.NODE_ENV === 'development' || isExpoGo;

// Authentication settings
export const authConfig = {
  // Force dev authentication bypass in Expo Go
  forceDevBypass: false, // Disabled auth bypass as we're no longer using Expo Go
  
  // Whether to use a mock database adapter
  useMockAdapter: false, // This setting is overridden in Expo Go anyway
  
  // Default mock user ID for development
  mockUserId: '00000000-0000-0000-0000-000000000000',
  
  // Default mock user email for development
  mockUserEmail: 'dev@example.com',
  
  // Mock token expiry (30 days)
  mockTokenExpiryDays: 30,
  
  // Whether to log auth details for debugging
  enableAuthLogging: isDevelopment
};

// API configuration
export const apiConfig = {
  // Base URL for API requests
  baseUrl: Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || '',
  
  // Default timeout for API requests (in ms)
  timeout: 10000,
  
  // Whether to retry failed requests
  enableRetry: true,
  
  // Maximum number of retries
  maxRetries: 3
};

// Feature flags
export const featureFlags = {
  // Enable the AI diagnosis feature
  enableAiDiagnosis: false,
  
  // Enable the community forum feature
  enableCommunity: true,
  
  // Enable plant tracking
  enablePlantTracking: true,
  
  // Enable grow journal
  enableGrowJournal: true,
  
  // Enable strain catalog
  enableStrainCatalog: true
};

// Export configuration object
export default {
  isExpoGo,
  isDevelopment,
  authConfig,
  apiConfig,
  featureFlags
};
