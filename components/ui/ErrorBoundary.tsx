import React from 'react';
import { View, Text } from 'react-native';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="mb-2 text-center text-xl font-bold text-neutral-900 dark:text-white">
            Something went wrong
          </Text>
          <Text className="mb-4 text-center text-base text-neutral-700 dark:text-neutral-300">
            {this.state.error.message}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}
