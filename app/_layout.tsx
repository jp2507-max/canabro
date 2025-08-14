import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View, ActivityIndicator, useColorScheme as useSystemColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme, colorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { log } from '@/lib/utils/logger';

import { AuthProvider, useAuth } from '../lib/contexts/AuthProvider';
import { DatabaseProvider } from '../lib/contexts/DatabaseProvider';
import { NotificationProvider } from '../lib/contexts/NotificationContext';
import { QueryProvider } from '../lib/contexts/QueryProvider';
import { LanguageProvider } from '../lib/contexts/LanguageProvider';

import { NavigationErrorBoundary } from '../components/ui/ErrorBoundary';
import { SplashScreenController } from '../components/ui/SplashScreenController';

// Import our react-query type declarations to avoid type errors
import '../lib/types/react-query';
import '../global.css';
import * as Sentry from '@sentry/react-native';
// Ensure dayjs timezone plugin is initialized early in the app lifecycle
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

// Theme storage key
const THEME_STORAGE_KEY = 'app-theme-preference';

function RootLayoutContent() {
  const { colorScheme: nativeWindColorScheme } = useColorScheme();
  
  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      <NavigationErrorBoundary>
        <QueryProvider>
          <AuthProvider>
            <SplashScreenController />
            <DatabaseProvider>
              {/* The DatabaseProvider now handles nesting the SyncProvider internally */}
              <NotificationProvider>
                <StatusBar 
                  style={nativeWindColorScheme === 'dark' ? 'light' : 'dark'} 
                  backgroundColor="transparent" 
                />
                <AppNavigator />
              </NotificationProvider>
            </DatabaseProvider>
          </AuthProvider>
        </QueryProvider>
      </NavigationErrorBoundary>
    </View>
  );
}

// App-level navigator implementing Expo Router v5 protected routes
function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <ActivityIndicator 
          size="large" 
          color="#7C3AED" 
          accessibilityRole="progressbar"
          accessibilityLabel="Loading"
        />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Protected routes for authenticated users */}
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      {/* Protected routes for unauthenticated users */}
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* Optional: Add a catch-all route for any unmatched paths */}
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

function RootLayout() {
  const systemColorScheme = useSystemColorScheme();
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Critical: Initialize NativeWind theme system properly
  React.useEffect(() => {
    const initializeTheme = async () => {
      try {
        log.info('[RootLayout] Initializing NativeWind theme system');

        // Check if we have a stored theme preference using our own key
        const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        log.info('[RootLayout] Stored theme:', storedTheme);
        log.info('[RootLayout] System theme:', systemColorScheme);

        // Set initial theme - prefer stored, fallback to system, fallback to light
        const initialTheme = (storedTheme as 'light' | 'dark') ||
                            (systemColorScheme as 'light' | 'dark') ||
                            'light';
        log.info('[RootLayout] Setting initial theme to:', initialTheme);

        // CRITICAL FIX: Use multiple methods to ensure theme is set properly
        // Method 1: Use imperative colorScheme.set
        colorScheme.set(initialTheme);

        // Method 2: Store theme in our own AsyncStorage key for better control
        await AsyncStorage.setItem(THEME_STORAGE_KEY, initialTheme);

        setIsInitialized(true);
        log.info('[RootLayout] Theme initialization complete');
      } catch (error: unknown) {
        // Distinguish AsyncStorage errors from others
        const err = error as { name?: string; message?: string };
        if (err?.name === 'AsyncStorageError' || err?.message?.includes('AsyncStorage')) {
          log.error('[RootLayout] AsyncStorage error during theme initialization:', error);
        } else {
          log.error('[RootLayout] Theme initialization error:', error);
        }
        // Fallback to light mode if there's an error
        colorScheme.set('light');
        try {
          await AsyncStorage.setItem(THEME_STORAGE_KEY, 'light');
        } catch (storageError: unknown) {
          log.error('[RootLayout] Failed to set fallback theme in AsyncStorage:', storageError);
        }
        setIsInitialized(true);
      }
    };

    initializeTheme();
  }, [systemColorScheme]);

  // Don't render until theme is properly initialized
  if (!isInitialized) {
    return null; // or a loading spinner
  }

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <KeyboardProvider>
          <LanguageProvider>
            <RootLayoutContent />
          </LanguageProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
export { THEME_STORAGE_KEY };