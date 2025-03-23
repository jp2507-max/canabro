import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider } from '../lib/contexts/DatabaseProvider';
import { AuthProvider } from '../lib/contexts/AuthProvider';
import { NotificationProvider } from '../lib/contexts/NotificationContext';

// Import CSS for NativeWind
import '../global.css';

function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DatabaseProvider>
          <NotificationProvider>
            <StatusBar style="auto" />
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
          </NotificationProvider>
        </DatabaseProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

// This solves the "missing default export" issue
export default RootLayout;
