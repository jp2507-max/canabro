import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useAuth } from '../contexts/AuthProvider';

/**
 * Hook to protect routes that require authentication
 * Redirects to login if user is not authenticated
 */
export function useProtectedRoute() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const hasRedirected = useRef(false);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const LOGIN_PATH = '/(auth)/login';
    
    // Only redirect after auth state is loaded, if user is not authenticated,
    // not already on login page, and haven't redirected yet
    if (!loading && !user && pathname !== LOGIN_PATH && !hasRedirected.current) {
      hasRedirected.current = true;
      // Use setTimeout to avoid state update during render
      redirectTimeoutRef.current = setTimeout(() => {
        router.replace(LOGIN_PATH);
        redirectTimeoutRef.current = null;
      }, 0);
    }
    
    // Reset redirect flag when user logs in
    if (user) {
      hasRedirected.current = false;
    }

    // Cleanup function to clear pending timeout
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, [user, loading, pathname]);

  return { isAuthenticated: !!user, isLoading: loading };
}
