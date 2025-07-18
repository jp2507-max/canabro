import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import ThemedView from './ThemedView';
import ThemedText from './ThemedText';
import { OptimizedIcon } from './OptimizedIcon';
import { NotificationBadge } from './NotificationBadge';
import { usePlantAttention } from '@/lib/hooks/usePlantAttention';

interface PlantAttentionSummaryProps {
  plantIds?: string[];
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export const PlantAttentionSummary: React.FC<PlantAttentionSummaryProps> = ({
  plantIds,
  showDetails = true,
  compact = false,
  className = '',
}) => {
  const { t } = useTranslation();
  const {
    totalPlantsNeedingAttention,
    urgentPlantsCount,
    highPriorityPlantsCount,
    loading,
  } = usePlantAttention(plantIds);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: withSpring(loading ? 0.5 : 1, { damping: 15, stiffness: 400 }),
    };
  }, [loading]);

  if (loading) {
    return (
      <Animated.View style={animatedStyle}>
        <ThemedView className={`flex-row items-center ${className}`}>
          <OptimizedIcon
            name="refresh"
            size={16}
            className="text-neutral-400 dark:text-neutral-600"
          />
          <ThemedText className="ml-2 text-sm text-neutral-500 dark:text-neutral-400">
            {t('common.loading')}
          </ThemedText>
        </ThemedView>
      </Animated.View>
    );
  }

  if (totalPlantsNeedingAttention === 0) {
    return (
      <Animated.View style={animatedStyle}>
        <ThemedView className={`flex-row items-center ${className}`}>
          <OptimizedIcon
            name="checkmark-circle"
            size={compact ? 16 : 20}
            className="text-primary-500"
          />
          {!compact && (
            <ThemedText className="ml-2 text-sm font-medium text-primary-500">
              {t('careReminders.noActiveReminders')}
            </ThemedText>
          )}
        </ThemedView>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <ThemedView className={`${className}`}>
        {compact ? (
          <View className="flex-row items-center space-x-2">
            {urgentPlantsCount > 0 && (
              <NotificationBadge
                count={urgentPlantsCount}
                priority="urgent"
                size="small"
                animate={true}
              />
            )}
            {highPriorityPlantsCount > 0 && (
              <NotificationBadge
                count={highPriorityPlantsCount}
                priority="high"
                size="small"
                animate={true}
              />
            )}
            {totalPlantsNeedingAttention > urgentPlantsCount + highPriorityPlantsCount && (
              <NotificationBadge
                count={totalPlantsNeedingAttention - urgentPlantsCount - highPriorityPlantsCount}
                priority="medium"
                size="small"
                animate={true}
              />
            )}
          </View>
        ) : (
          <View className="space-y-2">
            {/* Header */}
            <View className="flex-row items-center">
              <OptimizedIcon
                name="warning"
                size={20}
                className="text-status-warning"
              />
              <ThemedText className="ml-2 text-base font-semibold text-neutral-900 dark:text-white">
                {t('plantAttention.needsAttention')}
              </ThemedText>
              <NotificationBadge
                count={totalPlantsNeedingAttention}
                priority="medium"
                size="small"
                className="ml-2"
                animate={true}
              />
            </View>

            {/* Details */}
            {showDetails && (
              <View className="space-y-1">
                {urgentPlantsCount > 0 && (
                  <View className="flex-row items-center">
                    <NotificationBadge
                      count={urgentPlantsCount}
                      priority="urgent"
                      size="small"
                      animate={false}
                    />
                    <ThemedText className="ml-2 text-sm text-status-danger">
                      {t('plantAttention.priorityUrgent')}
                    </ThemedText>
                  </View>
                )}
                
                {highPriorityPlantsCount > 0 && (
                  <View className="flex-row items-center">
                    <NotificationBadge
                      count={highPriorityPlantsCount}
                      priority="high"
                      size="small"
                      animate={false}
                    />
                    <ThemedText className="ml-2 text-sm text-status-warning">
                      {t('plantAttention.priorityHigh')}
                    </ThemedText>
                  </View>
                )}
                
                {totalPlantsNeedingAttention > urgentPlantsCount + highPriorityPlantsCount && (
                  <View className="flex-row items-center">
                    <NotificationBadge
                      count={totalPlantsNeedingAttention - urgentPlantsCount - highPriorityPlantsCount}
                      priority="medium"
                      size="small"
                      animate={false}
                    />
                    <ThemedText className="ml-2 text-sm text-primary-500">
                      {t('plantAttention.priorityMedium')}
                    </ThemedText>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ThemedView>
    </Animated.View>
  );
};

interface PlantAttentionBadgeProps {
  plantIds?: string[];
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const PlantAttentionBadge: React.FC<PlantAttentionBadgeProps> = ({
  plantIds,
  size = 'medium',
  className = '',
}) => {
  const {
    totalPlantsNeedingAttention,
    urgentPlantsCount,
    highPriorityPlantsCount,
    loading,
  } = usePlantAttention(plantIds);

  if (loading || totalPlantsNeedingAttention === 0) {
    return null;
  }

  // Determine the highest priority level
  const priority = urgentPlantsCount > 0 
    ? 'urgent' 
    : highPriorityPlantsCount > 0 
    ? 'high' 
    : 'medium';

  return (
    <NotificationBadge
      count={totalPlantsNeedingAttention}
      priority={priority}
      size={size}
      className={className}
      animate={true}
    />
  );
};