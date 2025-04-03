import { router } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '../contexts/AuthProvider';

/**
 * Hook to protect routes that require authentication
 * Redirects to login if user is not authenticated
 */
export function useProtectedRoute() {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Only redirect after auth state is loaded and if user is not authenticated
    if (!loading && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, loading]);

  return { isAuthenticated: !!user, isLoading: loading };
}
