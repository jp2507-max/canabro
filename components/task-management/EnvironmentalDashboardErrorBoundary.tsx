/**
 * Environmental Dashboard Error Boundary
 * 
 * Catches errors in the EnvironmentalDashboard component and provides
 * a user-friendly fallback UI.
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class EnvironmentalDashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[EnvironmentalDashboardErrorBoundary] Caught an error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      // Since we can't use hooks in class components, we'll use hardcoded fallback values
      // In a real implementation, these would come from translations
      const title = 'Dashboard Error';
      const description = 'Something went wrong with the environmental dashboard.';
      const retryText = 'Retry';
      
      return (
        <ThemedView className="flex-1 p-4 justify-center">
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
            <View className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-200 dark:border-red-800 max-w-md mx-auto w-full">
              <View className="items-center mb-4">
                <View className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full mb-3">
                  <OptimizedIcon 
                    name="warning" 
                    size={24} 
                    className="text-red-600 dark:text-red-400" 
                  />
                </View>
                <ThemedText className="text-xl font-bold text-center mb-2">
                  {title}
                </ThemedText>
              </View>
              
              <ThemedText className="text-base text-center mb-6 text-gray-700 dark:text-gray-300">
                {description}
              </ThemedText>
              
              <TouchableOpacity
                onPress={this.handleRetry}
                className="bg-primary-600 dark:bg-primary-500 px-4 py-3 rounded-lg active:bg-primary-700 dark:active:bg-primary-600"
              >
                <Text className="text-white font-medium text-center">
                  {retryText}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </ThemedView>
      );
    }

    return this.props.children;
  }
}

// Hook-based wrapper for easier usage
export function useEnvironmentalDashboardErrorBoundary() {
  const { t } = useTranslation();
  
  return {
    ErrorBoundary: EnvironmentalDashboardErrorBoundary,
    t
  };
}
