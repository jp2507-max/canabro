/**
 * Navigation utilities for protected routes
 * Provides authentication-aware navigation helpers
 */

import { router, Href } from 'expo-router';
import { useAuth } from '@/lib/contexts/AuthProvider';

/**
 * Navigate to a route, redirecting to login if not authenticated
 */
export function navigateWithAuth(href: Href, requireAuth = true) {
  const { user } = useAuth();
  
  if (requireAuth && !user) {
    router.replace('/(auth)/login');
    return;
  }
  
  router.push(href);
}

/**
 * Replace current route, redirecting to login if not authenticated
 */
export function replaceWithAuth(href: Href, requireAuth = true) {
  const { user } = useAuth();
  
  if (requireAuth && !user) {
    router.replace('/(auth)/login');
    return;
  }
  
  router.replace(href);
}

/**
 * Hook for authentication-aware navigation
 */
export function useAuthNavigation() {
  const { user } = useAuth();
  
  const navigateProtected = (href: Href) => {
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    router.push(href);
  };
  
  const replaceProtected = (href: Href) => {
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    router.replace(href);
  };
  
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
