/**
 * ModerationIndicator - Visual indicator for content moderation status
 * 
 * Features:
 * - Visual indicators for different moderation states
 * - Animated status badges
 * - Integration with existing post components
 * - Accessibility support
 */

import React from 'react';
import { View, Text } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withRepeat,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';
import { OptimizedIcon, IconName } from '../ui/OptimizedIcon';
import { useTranslation } from 'react-i18next';

export type ModerationStatus = 
  | 'approved' 
  | 'pending_review' 
  | 'flagged' 
  | 'hidden' 
  | 'blocked' 
  | 'reported';

interface ModerationIndicatorProps {
  status: ModerationStatus;
  violationCount?: number;
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
}

const ModerationIndicator: React.FC<ModerationIndicatorProps> = ({
  status,
  violationCount = 0,
  showDetails = false,
  size = 'medium',
  animated = true,
}) => {
  const { t } = useTranslation('community');
  
  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Start pulse animation for attention-grabbing statuses
  React.useEffect(() => {
    if (animated && (status === 'flagged' || status === 'reported')) {
      scale.value = withRepeat(
        withSequence(
          withSpring(1.1, { damping: 15, stiffness: 400 }),
          withSpring(1, { damping: 15, stiffness: 400 })
        ),
        -1,
        true
      );
    }

    // Cleanup to prevent memory leaks / stray animations
    return () => {
      // Stop any ongoing animation on this shared value
      cancelAnimation(scale);
      // Optionally reset to a stable value to avoid residual transforms
      scale.value = 1;
    };
  }, [status, animated]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Get status configuration
  const getStatusConfig = (): {
    icon: IconName;
    color: string;
    bgColor: string;
    borderColor: string;
    label: string;
  } | null => {
    switch (status) {
      case 'approved':
        return {
          icon: 'checkmark-circle',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          label: t('moderationIndicator.approved'),
        };
      case 'pending_review':
        return {
          icon: 'calendar',
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          label: t('moderationIndicator.pendingReview'),
        };
      case 'flagged':
        return {
          icon: 'warning', // 'flag' not in IconName; use closest existing warning symbol
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          borderColor: 'border-orange-200 dark:border-orange-800',
          label: t('moderationIndicator.flagged'),
        };
      case 'hidden':
        return {
          icon: 'eye-outline', // 'eye-off' not in IconName; use view icon
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800',
          label: t('moderationIndicator.hidden'),
        };
      case 'blocked':
        return {
          icon: 'close-circle', // 'ban' not in IconName; use close-circle to indicate blocked
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          label: t('moderationIndicator.blocked'),
        };
      case 'reported':
        return {
          icon: 'warning',
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          label: t('moderationIndicator.reported'),
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  // Size configurations
  const sizeConfig = {
    small: {
      iconSize: 14,
      textSize: 'text-xs',
      padding: 'px-2 py-1',
      spacing: 'mr-1',
    },
    medium: {
      iconSize: 16,
      textSize: 'text-sm',
      padding: 'px-3 py-1.5',
      spacing: 'mr-2',
    },
    large: {
      iconSize: 20,
      textSize: 'text-base',
      padding: 'px-4 py-2',
      spacing: 'mr-3',
    },
  };

  const currentSize = sizeConfig[size];

  return (
    <Animated.View 
      style={animatedStyle}
      className={`flex-row items-center rounded-full border ${config.bgColor} ${config.borderColor} ${currentSize.padding}`}
      accessibilityRole="text"
      accessibilityLabel={`${config.label}${violationCount > 0 ? ` - ${violationCount} violations` : ''}`}
    >
      <OptimizedIcon
        name={config.icon}
        size={currentSize.iconSize}
        className={`${config.color} ${currentSize.spacing}`}
      />
      
      <Text className={`font-medium ${config.color} ${currentSize.textSize}`}>
        {config.label}
      </Text>

      {showDetails && violationCount > 0 && (
        <View className={`ml-2 rounded-full bg-white dark:bg-neutral-800 px-2 py-0.5`}>
          <Text className={`${currentSize.textSize} font-bold ${config.color}`}>
            {violationCount}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

export default ModerationIndicator;
