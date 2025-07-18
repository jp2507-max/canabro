import React from 'react';
import Animated, { useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import { OptimizedIcon } from './OptimizedIcon';
import ThemedView from './ThemedView';
import ThemedText from './ThemedText';

interface NotificationBadgeProps {
  count?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  className?: string;
  animate?: boolean;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count = 0,
  priority = 'medium',
  size = 'medium',
  showIcon = true,
  className = '',
  animate = true,
}) => {
  // Don't render if count is 0
  if (count === 0) return null;

  const getPriorityColors = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-status-danger border-status-danger/20';
      case 'high':
        return 'bg-status-warning border-status-warning/20';
      case 'medium':
        return 'bg-primary-500 border-primary-500/20';
      default:
        return 'bg-neutral-500 border-neutral-500/20 dark:bg-neutral-400 dark:border-neutral-400/20';
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'small':
        return 'h-4 w-4 min-w-4';
      case 'large':
        return 'h-8 w-8 min-w-8';
      default:
        return 'h-6 w-6 min-w-6';
    }
  };

  const getTextSize = (size: string) => {
    switch (size) {
      case 'small':
        return 'text-xs';
      case 'large':
        return 'text-sm';
      default:
        return 'text-xs';
    }
  };

  const getIconSize = (size: string) => {
    switch (size) {
      case 'small':
        return 10;
      case 'large':
        return 16;
      default:
        return 12;
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    if (!animate) return {};
    
    return {
      transform: [
        {
          scale: withSequence(
            withSpring(1.2, { damping: 15, stiffness: 400 }),
            withSpring(1, { damping: 15, stiffness: 400 })
          ),
        },
      ],
    };
  }, [animate]);

  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <Animated.View style={animatedStyle}>
      <ThemedView
        className={`
          ${getSizeClasses(size)}
          ${getPriorityColors(priority)}
          ${className}
          flex-row items-center justify-center rounded-full border-2 shadow-sm
        `}
      >
        {showIcon && count === 1 ? (
          <OptimizedIcon
            name="warning"
            size={getIconSize(size)}
            className="text-white"
          />
        ) : (
          <ThemedText
            className={`${getTextSize(size)} font-bold text-white`}
            numberOfLines={1}
          >
            {displayCount}
          </ThemedText>
        )}
      </ThemedView>
    </Animated.View>
  );
};

interface AttentionIndicatorProps {
  priority: 'low' | 'medium' | 'high' | 'urgent';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  animate?: boolean;
}

export const AttentionIndicator: React.FC<AttentionIndicatorProps> = ({
  priority,
  size = 'medium',
  className = '',
  animate = true,
}) => {
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'warning';
      case 'high':
        return 'warning-outline';
      case 'medium':
        return 'help-circle';
      default:
        return 'checkmark-circle';
    }
  };

  const getPriorityColors = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-status-danger/10 border-status-danger text-status-danger';
      case 'high':
        return 'bg-status-warning/10 border-status-warning text-status-warning';
      case 'medium':
        return 'bg-primary-500/10 border-primary-500 text-primary-500';
      default:
        return 'bg-neutral-500/10 border-neutral-500 text-neutral-500 dark:bg-neutral-400/10 dark:border-neutral-400 dark:text-neutral-400';
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'small':
        return 'h-5 w-5';
      case 'large':
        return 'h-8 w-8';
      default:
        return 'h-6 w-6';
    }
  };

  const getIconSize = (size: string) => {
    switch (size) {
      case 'small':
        return 12;
      case 'large':
        return 20;
      default:
        return 16;
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    if (!animate) return {};
    
    return {
      transform: [
        {
          scale: withSequence(
            withSpring(1.1, { damping: 15, stiffness: 400 }),
            withSpring(1, { damping: 15, stiffness: 400 })
          ),
        },
      ],
    };
  }, [animate]);

  return (
    <Animated.View style={animatedStyle}>
      <ThemedView
        className={`
          ${getSizeClasses(size)}
          ${getPriorityColors(priority)}
          ${className}
          flex items-center justify-center rounded-full border-2
        `}
      >
        <OptimizedIcon
          name={getPriorityIcon(priority)}
          size={getIconSize(size)}
          className={getPriorityColors(priority).split(' ').find(c => c.startsWith('text-')) || 'text-neutral-500'}
        />
      </ThemedView>
    </Animated.View>
  );
};