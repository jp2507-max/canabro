import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../lib/contexts/AuthProvider';
import { DatabaseProvider } from '../lib/contexts/DatabaseProvider';
import { NotificationProvider } from '../lib/contexts/NotificationContext';
import { SyncProvider } from '../lib/contexts/SyncContext';
import { ThemeProvider, useTheme } from '../lib/contexts/ThemeContext';

import '../global.css';

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  // Ensure clean nesting of providers without extra whitespace or comments
  return (
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
