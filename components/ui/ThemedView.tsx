import React from 'react';
import { View, ViewProps } from 'react-native';

interface ThemedViewProps extends ViewProps {
  variant?: 'default' | 'card' | 'surface' | 'elevated';
}

function ThemedView({
  children,
  className = '',
  variant = 'default',
  style,
  ...props
}: ThemedViewProps) {
  // Define base classes for each variant using NativeWind dark: prefix
  const variantClasses = {
    default: 'bg-neutral-50 dark:bg-neutral-900',
    card: 'bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700',
    surface: 'bg-neutral-100 dark:bg-neutral-800', 
    elevated: 'bg-white dark:bg-neutral-800 rounded-xl shadow-md',
  };

  const combinedClassName = `${variantClasses[variant]} ${className}`.trim();

  return (
    <View className={combinedClassName} style={style} {...props}>
      {children}
    </View>
  );
}

export default ThemedView;
