import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../lib/contexts/AuthProvider';
import { DatabaseProvider } from '../lib/contexts/DatabaseProvider';
import { NotificationProvider } from '../lib/contexts/NotificationContext';
import { QueryProvider } from '../lib/contexts/QueryProvider';
import { LanguageProvider } from '../lib/contexts/LanguageProvider';
import { NavigationErrorBoundary } from '../components/ui/ErrorBoundary';

// Import our react-query type declarations to avoid type errors
import '../lib/types/react-query';
import '../global.css';


function RootLayout() {
  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <KeyboardProvider>
          <LanguageProvider>
            <View className="flex-1 bg-neutral-50 dark:bg-neutral-900">
              <NavigationErrorBoundary>
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
              </NavigationErrorBoundary>
            </View>
          </LanguageProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default RootLayout;
