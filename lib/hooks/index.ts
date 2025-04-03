import useWatermelon from './useWatermelon';

/**
 * Export all hooks from a single entry point
 */

// Authentication hooks
export * from './useProtectedRoute';

// Database hooks
export * from './useDatabase';
export { useWatermelon };

// Supabase base hooks
export * from './supabase';

// Plant-related hooks
export * from './plants';

// Diary-related hooks
export * from './diary';
