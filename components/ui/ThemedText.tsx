import React from 'react';
import { Text, TextProps } from 'react-native';

import { useTheme } from '../../lib/contexts/ThemeContext';

interface ThemedTextProps extends TextProps {
  darkClassName?: string;
  lightClassName?: string;
}

function ThemedText({
  children,
  className = '',
  darkClassName = 'text-white',
  lightClassName = 'text-neutral-900',
  style,
  ...props
}: ThemedTextProps) {
  const { isDarkMode } = useTheme();

  const themeSpecificClass = isDarkMode ? darkClassName : lightClassName;

  const combinedClassName = `${className} ${themeSpecificClass}`.trim();

  return (
    <Text className={combinedClassName} style={style} {...props}>
      {children}
    </Text>
  );
}

export default ThemedText;
