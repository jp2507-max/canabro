/**
 * Enhanced authentication hook for protected routes
 * Provides simplified authentication state and actions for Expo Router protected routes
 */

import { useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useAuth } from '@/lib/contexts/AuthProvider';

interface SessionInfo {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
}

export function useSession(): SessionInfo {
  const { user, session, loading } = useAuth();

  const sessionInfo = useMemo(() => ({
    isAuthenticated: !!user,
    isLoading: loading,
    user,
    session,
  }), [user, session, loading]);

  return sessionInfo;
}

/**
 * Hook for authentication guards in protected routes
 */
export function useAuthGuard() {
  const { isAuthenticated, isLoading } = useSession();

  return {
    guard: isAuthenticated,
    inverseGuard: !isAuthenticated,
    isLoading,
  };
}

export default useSession;
