import AsyncStorage from '@react-native-async-storage/async-storage';
import { focusManager } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { AppState, Platform, StyleSheet } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../lib/contexts/AuthProvider';
import { DatabaseProvider } from '../lib/contexts/DatabaseProvider';
import { NotificationProvider } from '../lib/contexts/NotificationContext';
import { ThemeProvider } from '../lib/contexts/ThemeContext';

// Import our react-query type declarations to avoid type errors
import '../lib/types/react-query';

import '../global.css';

import { QueryProvider } from '@/lib/contexts/QueryProvider';

SplashScreen.preventAutoHideAsync();

function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();

    const subscription = AppState.addEventListener('change', onAppStateChange);

    return () => subscription.remove();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <DatabaseProvider>
                {/* The DatabaseProvider now handles nesting the SyncProvider internally */}
                <NotificationProvider>
                  <StatusBar style="auto" />
                  <Stack screenOptions={{ headerShown: false }} />
                </NotificationProvider>
              </DatabaseProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default RootLayout;
