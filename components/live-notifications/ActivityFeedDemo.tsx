import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ActivityFeed, ActivityItem } from './ActivityFeed';
import { useActivityFeed } from '../../lib/hooks/community/useActivityFeed';
import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { OptimizedIcon } from '../ui/OptimizedIcon';

interface ActivityFeedDemoProps {
  currentUserId?: string;
}

/**
 * Demo component for ActivityFeed
 * 
 * This component demonstrates the ActivityFeed functionality and can be used
 * for testing and development purposes.
 */
export const ActivityFeedDemo: React.FC<ActivityFeedDemoProps> = ({
  currentUserId = 'demo_user_123',
}) => {
  const { t } = useTranslation('community');
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

  // Use the activity feed hook
  const {
    filteredActivities,
    isLoading,
    isRefreshing,
    error,
    refresh,
    updateFilter,
    markActivityAsViewed,
    triggerNotification,
  } = useActivityFeed({
    userId: currentUserId,
    enableRealTime: true,
  });

  // Handle activity press
  const handleActivityPress = async (activity: ActivityItem) => {
    setSelectedActivity(activity);
    
    // Mark as viewed
    await markActivityAsViewed(activity.activityId);
    
    // Trigger notification
    await triggerNotification(activity);
    
    // Show activity details
    Alert.alert(
      activity.title,
      `${activity.description}\n\nActivity Type: ${activity.activityType}\nUser: ${activity.user?.username}\nTime: ${activity.createdAt.toLocaleString()}`,
      [
        { text: 'Close', style: 'cancel' },
        { 
          text: 'View Details', 
          onPress: () => console.log('View activity details:', activity) 
        },
      ]
    );
  };

  // Handle user press
  const handleUserPress = (userId: string) => {
    Alert.alert(
      'User Profile',
      `Navigate to user profile: ${userId}`,
      [{ text: 'OK' }]
    );
  };

  // Handle plant press
  const handlePlantPress = (plantId: string) => {
    Alert.alert(
      'Plant Details',
      `Navigate to plant details: ${plantId}`,
      [{ text: 'OK' }]
    );
  };

  // Error state
  if (error) {
    return (
      <ThemedView className="flex-1 items-center justify-center p-6">
        <OptimizedIcon
          name="warning-outline"
          size={48}
          className="mb-4 text-red-500"
        />
        <ThemedText variant="heading" className="mb-2 text-center text-lg">
          {t('activityFeed.error.title', 'Error Loading Activities')}
        </ThemedText>
        <ThemedText variant="muted" className="mb-4 text-center">
          {error.message || t('activityFeed.error.description', 'Something went wrong while loading activities.')}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1">
      {/* Header */}
      <View className="border-b border-neutral-200 bg-white px-4 py-4 dark:border-neutral-700 dark:bg-neutral-900">
        <ThemedText variant="heading" className="text-xl">
          {t('activityFeed.title', 'Activity Feed Demo')}
        </ThemedText>
        <ThemedText variant="muted" className="mt-1">
          {t('activityFeed.subtitle', `${filteredActivities.length} activities`)}
        </ThemedText>
      </View>

      {/* Activity Feed */}
      <ActivityFeed
        currentUserId={currentUserId}
        onActivityPress={handleActivityPress}
        onUserPress={handleUserPress}
        onPlantPress={handlePlantPress}
        showFilters={true}
        enablePullToRefresh={true}
        maxItems={100}
      />

      {/* Debug Info */}
      {__DEV__ && selectedActivity && (
        <View className="absolute bottom-4 left-4 right-4 rounded-lg bg-black/80 p-3">
          <ThemedText className="text-sm text-white">
            Last selected: {selectedActivity.title}
          </ThemedText>
          <ThemedText className="text-xs text-white/70">
            ID: {selectedActivity.activityId}
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
};

export default ActivityFeedDemo;