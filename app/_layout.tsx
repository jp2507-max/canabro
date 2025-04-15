import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import {
  QueryClient,
  // QueryClientProvider, // Replaced by PersistQueryClientProvider
  onlineManager,
  focusManager,
} from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import * as Network from 'expo-network';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../lib/contexts/AuthProvider';
import { DatabaseProvider } from '../lib/contexts/DatabaseProvider';
import { NotificationProvider } from '../lib/contexts/NotificationContext';
import { SyncProvider } from '../lib/contexts/SyncContext';
import { ThemeProvider, useTheme } from '../lib/contexts/ThemeContext';
import { strainsByTypeQueryOptions } from '../lib/hooks/strains/useStrainsByType'; // Import query options from the new hook

// Removed fetchStrains import

import '../global.css';

SplashScreen.preventAutoHideAsync();

// Create a client with default options for persistence
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours cache time for persisted data
    },
  },
});

// Create the AsyncStorage persister
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  // Optional: throttleTime: 1000, // Default throttle time
});

// --- React Native Specific Query Setup ---

// Online status management
onlineManager.setEventListener((setOnline) => {
  const subscription = Network.addNetworkStateListener((state) => {
    setOnline(!!state.isConnected);
  });
  // Return the cleanup function
  return () => {
    subscription.remove();
  };
});

// Refetch on App focus
function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}
// --- End React Native Specific Query Setup ---

function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();

    // Preload strains data (e.g., sativa) when the app loads using the new options
    queryClient.prefetchQuery(strainsByTypeQueryOptions()); // Use the new options function (defaults to 'sativa')

    // Setup AppState listener for focus management
    const subscription = AppState.addEventListener('change', onAppStateChange);

    // Cleanup listener on unmount
    return () => subscription.remove();
  }, []);

  // Ensure clean nesting of providers without extra whitespace or comments
  return (
    // Use PersistQueryClientProvider instead of QueryClientProvider
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
          <SyncProvider>
            <DatabaseProvider>
              <NotificationProvider>
                <AppWithTheme />
              </NotificationProvider>
            </DatabaseProvider>
          </SyncProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  );
}

// Component to use theme context and render the main app structure
function AppWithTheme() {
  const { isDarkMode } = useTheme();

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Home' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen
          name="plant/[id]"
          options={{
            headerShown: false, // Remove header for this screen
          }}
        />
        {/* Add configuration for the catalog detail screen */}
        <Stack.Screen
          name="catalog/[strain_id]"
          options={{
            headerShown: false, // Hide header during loading and after
          }}
        />
      </Stack>
    </>
  );
}

export default RootLayout;
