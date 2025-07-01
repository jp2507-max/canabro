/**
 * Enhanced Context Provider with Memory Leak Prevention
 * Wraps any context provider to ensure proper cleanup
 */

import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useResourceCleanup } from '@/lib/hooks/useResourceCleanup';

interface ProviderWrapperProps {
  children: React.ReactNode;
  name: string;
}

export function ProviderWrapper({ children, name }: ProviderWrapperProps) {
  const mountedRef = useRef(true);
  const { cleanupAllResources } = useResourceCleanup();

  useEffect(() => {
    console.warn(`✅ ${name} Provider mounted`);
    
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background' && mountedRef.current) {
        console.warn(`🧹 ${name} Provider: App backgrounded, cleaning up`);
        // Force cleanup of any lingering resources
        cleanupAllResources();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      mountedRef.current = false;
      subscription?.remove();
      cleanupAllResources();
      console.warn(`🧹 ${name} Provider unmounted`);
    };
  }, [name, cleanupAllResources]);

  return <>{children}</>;
}
