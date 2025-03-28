import { enableScreens } from 'react-native-screens';
enableScreens();

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { DatabaseProvider } from '../lib/contexts/DatabaseProvider';
import { AuthProvider } from '../lib/contexts/AuthProvider';
import { NotificationProvider } from '../lib/contexts/NotificationContext';
import { ThemeProvider, useTheme } from '../lib/contexts/ThemeContext';

// Import CSS for NativeWind
import '../global.css';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function RootLayout() {
  useEffect(() => {
    // Hide the splash screen once the root layout mounts
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <DatabaseProvider>
            <NotificationProvider>
              <AppWithTheme />
            </NotificationProvider>
          </DatabaseProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// Separate component to use theme context
function AppWithTheme() {
  const { isDarkMode } = useTheme();
  
  return (
    <>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Home' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="plant/[id]" 
          options={{ 
            title: 'Plant Details',
            headerBackTitle: 'Back'
          }} 
        />
      </Stack>
    </>
  );
}

// This solves the "missing default export" issue
export default RootLayout;
