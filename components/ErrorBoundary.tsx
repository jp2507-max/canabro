/**
 * React Error Boundary for graceful error handling
 * File: components/ErrorBoundary.tsx
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

import { globalErrorHandler } from '../lib/utils/errorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  translations?: {
    somethingWentWrong: string;
    unexpectedError: string;
    tryAgain: string;
  };
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to global handler
    globalErrorHandler(error, { componentStack: errorInfo.componentStack || undefined });
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      const { translations } = this.props;
      return (
        <View className="flex-1 justify-center items-center p-6 bg-neutral-50 dark:bg-neutral-900">
          <View className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-200 dark:border-red-800 max-w-sm">
            <Text className="text-red-800 dark:text-red-200 font-semibold text-lg mb-2">
              {translations?.somethingWentWrong || 'Something went wrong'}
            </Text>
            <Text className="text-red-600 dark:text-red-300 text-sm mb-4">
              {__DEV__ ? this.state.error?.message : (translations?.unexpectedError || 'An unexpected error occurred. Please try again.')}
            </Text>
            <TouchableOpacity
              onPress={this.handleReset}
              className="bg-red-600 dark:bg-red-700 px-4 py-2 rounded-md"
            >
              <Text className="text-white font-medium text-center">{translations?.tryAgain || 'Try Again'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
}

// Translated ErrorBoundary wrapper
export function TranslatedErrorBoundary({ children, fallback, onError }: Omit<Props, 'translations'>) {
  const { t } = useTranslation('common');
  
  const translations = {
    somethingWentWrong: t('somethingWentWrong'),
    unexpectedError: t('unexpectedError'),
    tryAgain: t('tryAgain'),
  };

  return (
    <ErrorBoundary translations={translations} fallback={fallback} onError={onError}>
      {children}
    </ErrorBoundary>
  );
}
