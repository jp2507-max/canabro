import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '../contexts/AuthProvider';

/**
 * Hook to protect routes that require authentication
 * Redirects to login if user is not authenticated
 */
export function useProtectedRoute() {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    // Only redirect after auth state is loaded and if user is not authenticated
    if (!loading && !user && pathname !== '/login') {
      router.replace('/(auth)/login');
    }
  }, [user, loading, pathname]);

  return { isAuthenticated: !!user, isLoading: loading };
}
