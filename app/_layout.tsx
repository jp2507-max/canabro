import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider } from '../lib/contexts/DatabaseProvider';

function RootLayout() {
  return (
    <SafeAreaProvider>
      <DatabaseProvider>
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
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}

// This solves the "missing default export" issue
export default RootLayout;
