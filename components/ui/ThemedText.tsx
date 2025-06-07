import React from 'react';
import { Text, TextProps } from 'react-native';

interface ThemedTextProps extends TextProps {
  variant?: 'default' | 'muted' | 'heading' | 'caption';
}

function ThemedText({
  children,
  className = '',
  variant = 'default',
  style,
  ...props
}: ThemedTextProps) {
  // Define base classes for each variant using NativeWind dark: prefix
  const variantClasses = {
    default: 'text-neutral-900 dark:text-neutral-100',
    muted: 'text-neutral-600 dark:text-neutral-400',
    heading: 'text-neutral-900 dark:text-white font-bold',
    caption: 'text-neutral-500 dark:text-neutral-500 text-sm',
  };

  const combinedClassName = `${variantClasses[variant]} ${className}`.trim();

  return (
    <Text className={combinedClassName} style={style} {...props}>
      {children}
    </Text>
  );
}

export default ThemedText;
