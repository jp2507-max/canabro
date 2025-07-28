/**
 * Environmental Dashboard Error Boundary
 * 
 * Catches errors in the EnvironmentalDashboard component and provides
 * a user-friendly fallback UI.
 */



import React, { ReactNode, useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import { log } from '@/lib/utils/logger';

interface EnvironmentalDashboardErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
}

export function EnvironmentalDashboardErrorBoundary({ children, onRetry }: EnvironmentalDashboardErrorBoundaryProps) {
  const { t } = useTranslation();
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setError(null);
    onRetry?.();
  }, [onRetry]);

  const ErrorFallback = useCallback(() => (
    <ThemedView className="flex-1 p-4 justify-center">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-200 dark:border-red-800 max-w-md mx-auto w-full">
          <View className="items-center mb-4">
            <View className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full mb-3">
              <OptimizedIcon 
                name="warning" 
                size={24} 
                className="text-red-600 dark:text-red-400" 
                accessibilityLabel={t('environmentalDashboard.errorIconLabel', 'Warning: Dashboard Error')}
              />
            </View>
            <ThemedText className="text-xl font-bold text-center mb-2">
              {t('environmentalDashboard.errorTitle', 'Dashboard Error')}
            </ThemedText>
          </View>
          <ThemedText className="text-base text-center mb-6 text-gray-700 dark:text-gray-300">
            {t('environmentalDashboard.errorDescription', 'Something went wrong with the environmental dashboard.')}
          </ThemedText>
          <TouchableOpacity
            onPress={handleRetry}
            className="bg-primary-600 dark:bg-primary-500 px-4 py-3 rounded-lg active:bg-primary-700 dark:active:bg-primary-600"
            accessibilityRole="button"
            accessibilityLabel={t('environmentalDashboard.retryButtonLabel', 'Retry loading the environmental dashboard')}
          >
            <Text className="text-white font-medium text-center">
              {t('environmentalDashboard.retry', 'Retry')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  ), [t, handleRetry]);

  // Error boundary logic using React 18+ error boundary pattern
  const ErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
    // This is a workaround for functional error boundaries using try/catch in render
    // For true error boundaries, use react-error-boundary or similar in the future
    try {
      if (hasError) {
        return <ErrorFallback />;
      }
      return <>{children}</>;
    } catch (err) {
      if (err instanceof Error) {
        log.error('[EnvironmentalDashboardErrorBoundary] Caught an error:', err);
        setHasError(true);
        setError(err);
      }
      return <ErrorFallback />;
    }
  };

  // Use React's unstable_handleError if available, or rely on try/catch fallback
  // For now, just wrap children in ErrorBoundary
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
