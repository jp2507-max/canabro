/**
 * Specialized Error Boundary for CareReminders component
 * Handles database errors and provides user-friendly feedback
 * File: components/notifications/CareRemindersErrorBoundary.tsx
 */

import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { ErrorBoundary } from '../ErrorBoundary';
import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { useButtonAnimation } from '@/lib/animations/useButtonAnimation';
import { triggerLightHapticSync } from '@/lib/utils/haptics';
import Animated from 'react-native-reanimated';

interface CareRemindersErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
}

const CareRemindersErrorFallback: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  const { t } = useTranslation();
  
  const retryAnimation = useButtonAnimation({
    enableHaptics: true,
    hapticStyle: 'light',
    onPress: () => {
      triggerLightHapticSync();
      onRetry?.();
    },
  });

  return (
    <ThemedView className="flex-1 items-center justify-center p-6">
      <ThemedView className="max-w-sm items-center rounded-lg bg-status-danger/5 p-6 border border-status-danger/20">
        <OptimizedIcon
          name="warning"
          size={48}
          className="mb-4 text-status-danger"
        />
        
        <ThemedText variant="heading" className="mb-2 text-center text-lg text-status-danger">
          {t('careReminders.errorTitle')}
        </ThemedText>
        
        <ThemedText variant="muted" className="mb-6 text-center text-sm">
          {t('careReminders.errorDescription')}
        </ThemedText>
        
        <Animated.View style={retryAnimation.animatedStyle}>
          <Pressable {...retryAnimation.handlers}>
            <ThemedView className="flex-row items-center rounded-lg bg-primary-500 px-4 py-2">
              <OptimizedIcon name="refresh" size={16} className="mr-2 text-white" />
              <ThemedText className="font-medium text-white">
                {t('careReminders.retryButton')}
              </ThemedText>
            </ThemedView>
          </Pressable>
        </Animated.View>
      </ThemedView>
    </ThemedView>
  );
};

export const CareRemindersErrorBoundary: React.FC<CareRemindersErrorBoundaryProps> = ({
  children,
  onRetry,
}) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('CareReminders Error Boundary caught error:', error, errorInfo);
    
    // Log additional context for database errors
    if (error.message?.includes('database') || error.message?.includes('query')) {
      console.error('Database error context:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    }
  };

  return (
    <ErrorBoundary
      fallback={<CareRemindersErrorFallback onRetry={onRetry} />}
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  );
};

export default CareRemindersErrorBoundary;
