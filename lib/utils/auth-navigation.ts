/**
 * Navigation utilities for protected routes
 * Provides authentication-aware navigation helpers
 */

import { router, Href } from 'expo-router';
import { useAuth } from '@/lib/contexts/AuthProvider';
import { User } from '@supabase/supabase-js';

/**
 * Replace current route, redirecting to login if not authenticated
 */
export function replaceWithAuth(href: Href, user: User | null, requireAuth = true) {
  if (requireAuth && !user) {
    router.replace('/(auth)/login');
    return;
  }
  
  router.replace(href);
}

/**
 * Hook for authentication-aware navigation
 */
function useAuthNavigation() {
  const { user } = useAuth();

  /**
   * Navigate to a route, redirecting to login if not authenticated
   */
  const navigateWithAuth = (href: Href, requireAuth = true) => {
    if (requireAuth && !user) {
      router.replace('/(auth)/login');
      return;
    }
    
    router.push(href);
  };

  /**
   * Navigate to a protected route (alias for navigateWithAuth with requireAuth=true)
   */
  const navigateProtected = (href: Href) => {
    navigateWithAuth(href, true);
  };

  /**
   * Replace current route with a protected route (alias for replaceWithAuth with requireAuth=true)
   */
  const replaceProtected = (href: Href) => {
    replaceWithAuth(href, user, true);
  };

  /**
   * Navigate to home route, redirecting to login if not authenticated
   */
  const navigateToHome = () => {
    if (user) {
      router.replace('/(app)/(tabs)');
    } else {
      router.replace('/(auth)/login');
    }
  };

  return {
    navigateProtected,
    replaceProtected,
    navigateToHome,
    isAuthenticated: !!user,
  };
}

export default useAuthNavigation;
