import useWatermelon from './useWatermelon';

/**
 * Export all hooks from a single entry point
 */

// Authentication hooks
export * from './useProtectedRoute';

// Keyboard and UI hooks
export * from './useEnhancedKeyboard';

// Database hooks
export * from './useDatabase';
export { useWatermelon };

// Supabase base hooks
export * from './supabase';

// Plant-related hooks
export * from './plants';

// Diary-related hooks
export * from './diary';
