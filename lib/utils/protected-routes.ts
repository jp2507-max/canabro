/**
 * Protected Routes Utilities
 * Exports all authentication and route protection utilities
 */

import { User } from '@supabase/supabase-js';

// Main hook for session management
export { useSession, useAuthGuard } from '../hooks/useSession';

// Navigation utilities
export { useAuthNavigation, navigateWithAuth, replaceWithAuth } from './auth-navigation';

// Component for route protection
export { ProtectedRoute, withProtectedRoute } from '../../components/ui/ProtectedRoute';

// Re-export auth context
export { useAuth } from '../contexts/AuthProvider';

/**
 * Quick access to common authentication patterns
 */
export const authUtils = {
  // Common guard patterns
  requireAuth: (user: User | null) => !!user,
  requireGuest: (user: User | null) => !user,
  requireVerified: (user: User | null) => !!user?.email_confirmed_at,
  
  // Route paths
  LOGIN_PATH: '/(auth)/login' as const,
  HOME_PATH: '/(app)/(tabs)' as const,
  REGISTER_PATH: '/(auth)/register' as const,
};
