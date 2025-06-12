import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../lib/contexts/AuthProvider';
import { DatabaseProvider } from '../lib/contexts/DatabaseProvider';
import { NotificationProvider } from '../lib/contexts/NotificationContext';
import { QueryProvider } from '../lib/contexts/QueryProvider';
import { useAppInitialization } from '../lib/hooks/useAppInitialization';

// Import our react-query type declarations to avoid type errors
import '../lib/types/react-query';
import '../global.css';

function LoadingScreen({ error, retry }: { error?: string | null; retry?: () => void }) {
  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-900 justify-center items-center">
      {error ? (
        <View className="items-center space-y-4 px-6">
          <Text className="text-red-500 text-lg font-semibold text-center">
            Initialization Error
          </Text>
          <Text className="text-neutral-600 dark:text-neutral-300 text-center">
            {error}
          </Text>
          {retry && (
            <Text 
              className="text-blue-500 text-base font-medium mt-4 px-4 py-2 border border-blue-500 rounded-lg"
              onPress={retry}
            >
              Retry
            </Text>
          )}
        </View>
      ) : (
        <View className="items-center space-y-4">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-neutral-600 dark:text-neutral-300 text-base">
            Loading your cannabis companion...
          </Text>
        </View>
      )}
    </View>
  );
}

function RootLayout() {
  const { isInitialized, isLoading, error, retry } = useAppInitialization({
    enableAssetPreloading: true,
    enableMemoryOptimization: true,
    enablePerformanceMonitoring: !__DEV__,
    splashScreenDelay: 1500, // Show splash for 1.5 seconds minimum
    assetPreloadTimeout: 10000,
  });

  // Show loading screen during initialization
  if (isLoading || !isInitialized) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <LoadingScreen error={error} retry={retry} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <View className="flex-1 bg-neutral-50 dark:bg-neutral-900">
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
        </View>
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
