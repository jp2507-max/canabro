import NetInfo from '@react-native-community/netinfo';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import * as React from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { mmkvPersister } from '@/lib/storage/mmkvPersister';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Retry failed queries 2 times after the initial failure
            retry: 2,
            // Consider data fresh for 5 minutes
            staleTime: 1000 * 60 * 5,
            // Cache data for 24 hours
            gcTime: 1000 * 60 * 60 * 24,
            // Only refetch on window focus in development
            refetchOnWindowFocus: __DEV__,
            // Retry on reconnect
            refetchOnReconnect: true,
            // Don't refetch on mount if the data isn't stale
            refetchOnMount: true,
            // Always enable structural sharing to minimize re-renders
            structuralSharing: true,
          },
        },
      })
  );

  // ---------------------------------------------------------------------------
  // Mount-guarded effects to prevent React 18 Strict Mode state update warnings
  // ---------------------------------------------------------------------------
  
  // Handle app state changes with mount guard
  React.useEffect(() => {
    let isMounted = true;
    
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (isMounted && Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active');
      }
    });
    
    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  // Handle online state with mount guard
  React.useEffect(() => {
    let isMounted = true;
    
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (isMounted) {
        onlineManager.setOnline(!!state.isConnected);
      }
    });
    
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: mmkvPersister,
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        buster: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
      }}
      // Clear cache on any structural error during hydration
      onSuccess={() => {
        console.log('[QueryProvider] Cache successfully restored');
      }}
      onError={() => {
        console.log('[QueryProvider] Error restoring cache, purging');
        queryClient.clear();
      }}>
      {children}
    </PersistQueryClientProvider>
  );
}

export const QueriesProvider = QueryProvider;
