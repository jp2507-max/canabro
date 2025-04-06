import React from 'react';
import { View, ViewProps } from 'react-native';

import { useTheme } from '../../lib/contexts/ThemeContext';

interface ThemedViewProps extends ViewProps {
  darkClassName?: string;
  lightClassName?: string;
}

function ThemedView({
  children,
  className = '',
  darkClassName = '',
  lightClassName = '',
  style,
  ...props
}: ThemedViewProps) {
  const { isDarkMode } = useTheme();

  const themeSpecificClass = isDarkMode ? darkClassName : lightClassName;

  // Slightly more robust class name combination
  const combinedClassName = [className, themeSpecificClass].filter(Boolean).join(' ');

  return (
    <View className={combinedClassName} style={style} {...props}>
      {children}
    </View>
  );
}

export default ThemedView;
