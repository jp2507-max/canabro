import React, { useState } from 'react';
import { View, Text } from 'react-native';
import ThemedText from '../ui/ThemedText';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Error boundary using componentDidCatch pattern
  class Boundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
    constructor(props: { children: React.ReactNode }) {
      super(props);
      this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }
    componentDidCatch(error: Error) {
      setHasError(true);
      setError(error);
    }
    render() {
      if (this.state.hasError && this.state.error) {
        return (
          <View className="flex-1 items-center justify-center px-6">
            <ThemedText className="text-xl font-bold mb-2 text-center">Something went wrong</ThemedText>
            <ThemedText className="text-base mb-4 text-center">{this.state.error.message}</ThemedText>
          </View>
        );
      }
      return this.props.children;
    }
  }

  // Use the class-based boundary for error catching
  return <Boundary>{children}</Boundary>;
}
