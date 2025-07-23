/**
 * Protected Route Component
 * Provides component-level route protection with flexible authentication checks
 */

import React, { ReactNode } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect, Href } from 'expo-router';
import { User, Session } from '@supabase/supabase-js';

import { useSession } from '@/lib/hooks/useSession';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  fallbackPath?: Href;
  loadingComponent?: ReactNode;
  customGuard?: (user: User | null, session: Session | null) => boolean;
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  fallbackPath,
  loadingComponent,
  customGuard,
}: ProtectedRouteProps) {
  const { user, session, isLoading } = useSession();

  // Show loading state while checking authentication
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <ActivityIndicator size="large" className="text-primary-600" />
      </View>
    );
  }

  // Use custom guard if provided
  if (customGuard) {
    const hasAccess = customGuard(user, session);
    if (!hasAccess) {
      const redirectPath = fallbackPath || (requireAuth ? '/(auth)/login' as Href : '/(app)/(tabs)' as Href);
      return <Redirect href={redirectPath} />;
    }
    return <>{children}</>;
  }

  // Standard authentication check
  const isAuthenticated = !!user;
  
  if (requireAuth && !isAuthenticated) {
    return <Redirect href={fallbackPath || '/(auth)/login'} />;
  }
  
  if (!requireAuth && isAuthenticated) {
    return <Redirect href={fallbackPath || '/(app)/(tabs)'} />;
  }

  return <>{children}</>;
}

/**
 * Higher-order component for protecting routes
 */
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'> = {}
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

export default ProtectedRoute;
