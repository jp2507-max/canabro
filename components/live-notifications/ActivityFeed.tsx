import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Pressable, RefreshControl } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { FlashListWrapper } from '../ui/FlashListWrapper';
import NetworkResilientImage from '../ui/NetworkResilientImage';
import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import UserAvatar from '../community/UserAvatar';
import { OptimizedIcon, IconName } from '../ui/OptimizedIcon';
import { useButtonAnimation } from '../../lib/animations/useButtonAnimation';
import { useDebounce } from '../../lib/hooks/useDebounce';
import { useDebouncedCallback } from '../../lib/hooks/useDebouncedCallback';
import useWatermelon from '../../lib/hooks/useWatermelon';
import { useNotifications } from '../../lib/hooks/useNotifications';
import { triggerLightHaptic, triggerMediumHaptic } from '../../lib/utils/haptics';
import { COMMUNITY_SCALE_VALUES } from '../../lib/types/community';

dayjs.extend(relativeTime);

// Activity types for the feed
export type ActivityType =
  | 'post_created'
  | 'comment_added'
  | 'plant_updated'
  | 'harvest_completed'
  | 'strain_reviewed'
  | 'achievement_earned'
  | 'group_joined'
  | 'expert_verified'
  | 'user_followed'
  | 'post_liked'
  | 'milestone_reached';

// Activity item interface
export interface ActivityItem {
  activityId: string;
  userId: string;
  activityType: ActivityType;
  title: string;
  description: string;
  metadata: ActivityMetadata;
  visibility: 'public' | 'followers' | 'private';
  engagementStats: EngagementStats;
  createdAt: Date;
  user?: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  };
}

interface ActivityMetadata {
  sourceId: string;
  sourceType: string;
  relatedUsers: string[];
  tags: string[];
  location?: string;
  plantData?: PlantActivityData;
  imageUrl?: string;
  strainName?: string;
  achievementType?: string;
}

interface PlantActivityData {
  plantId: string;
  plantName: string;
  growthStage: string;
  daysSinceStart?: number;
}

interface EngagementStats {
  likes: number;
  comments: number;
  shares: number;
  views: number;
  saves: number;
}

// Filter options for activity feed
export type ActivityFilter = 'all' | 'following' | 'plants' | 'achievements' | 'community';

interface ActivityFilterConfig {
  key: ActivityFilter;
  label: string;
  icon: IconName;
  color: string;
}

interface ActivityFeedProps {
  currentUserId?: string;
  onActivityPress?: (activity: ActivityItem) => void;
  onUserPress?: (userId: string) => void;
  onPlantPress?: (plantId: string) => void;
  showFilters?: boolean;
  initialFilter?: ActivityFilter;
  enablePullToRefresh?: boolean;
  maxItems?: number;
}

const ACTIVITY_FILTERS: ActivityFilterConfig[] = [
  { key: 'all', label: 'All', icon: 'layers-outline', color: '#6366f1' },
  { key: 'following', label: 'Following', icon: 'people-outline', color: '#10b981' },
  { key: 'plants', label: 'Plants', icon: 'leaf-outline', color: '#22c55e' },
  { key: 'achievements', label: 'Achievements', icon: 'medal', color: '#f59e0b' },
  { key: 'community', label: 'Community', icon: 'chatbubble-outline', color: '#8b5cf6' },
];

// Mock data generator for development
const generateMockActivityData = (count: number = 50): ActivityItem[] => {
  const activities: ActivityItem[] = [];
  const activityTypes: ActivityType[] = [
    'post_created', 'comment_added', 'plant_updated', 'harvest_completed',
    'strain_reviewed', 'achievement_earned', 'group_joined', 'expert_verified',
    'user_followed', 'post_liked', 'milestone_reached'
  ];

  const users = [
    { id: '1', username: 'GrowMaster420', avatar_url: 'https://via.placeholder.com/48' },
    { id: '2', username: 'PlantWhisperer', avatar_url: 'https://via.placeholder.com/48' },
    { id: '3', username: 'CannaExpert', avatar_url: 'https://via.placeholder.com/48' },
    { id: '4', username: 'GreenThumb', avatar_url: 'https://via.placeholder.com/48' },
    { id: '5', username: 'HarvestKing', avatar_url: 'https://via.placeholder.com/48' },
  ];

  for (let i = 0; i < count; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    if (!user) continue; // Safety check

    const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
    if (!activityType) continue; // Safety check

    const createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Last 7 days

    activities.push({
      activityId: `activity_${i}`,
      userId: user.id,
      activityType,
      title: getActivityTitle(activityType, user.username || 'Unknown User'),
      description: getActivityDescription(activityType),
      metadata: {
        sourceId: `source_${i}`,
        sourceType: getSourceType(activityType),
        relatedUsers: [],
        tags: ['cannabis', 'growing'],
        imageUrl: Math.random() > 0.5 ? 'https://via.placeholder.com/300x200' : undefined,
        strainName: Math.random() > 0.7 ? 'Blue Dream' : undefined,
        plantData: activityType.includes('plant') ? {
          plantId: `plant_${i}`,
          plantName: `Plant ${i + 1}`,
          growthStage: 'flowering',
          daysSinceStart: Math.floor(Math.random() * 100) + 1,
        } : undefined,
      },
      visibility: 'public',
      engagementStats: {
        likes: Math.floor(Math.random() * 50),
        comments: Math.floor(Math.random() * 20),
        shares: Math.floor(Math.random() * 10),
        views: Math.floor(Math.random() * 200) + 50,
        saves: Math.floor(Math.random() * 15),
      },
      createdAt,
      user,
    });
  }

  return activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

const getActivityTitle = (type: ActivityType, username: string): string => {
  switch (type) {
    case 'post_created': return `${username} shared a new post`;
    case 'comment_added': return `${username} commented on a post`;
    case 'plant_updated': return `${username} updated their plant`;
    case 'harvest_completed': return `${username} completed a harvest`;
    case 'strain_reviewed': return `${username} reviewed a strain`;
    case 'achievement_earned': return `${username} earned an achievement`;
    case 'group_joined': return `${username} joined a group`;
    case 'expert_verified': return `${username} became a verified expert`;
    case 'user_followed': return `${username} followed someone new`;
    case 'post_liked': return `${username} liked a post`;
    case 'milestone_reached': return `${username} reached a milestone`;
    default: return `${username} had activity`;
  }
};

const getActivityDescription = (type: ActivityType): string => {
  switch (type) {
    case 'post_created': return 'Check out their latest growing update';
    case 'comment_added': return 'Join the conversation';
    case 'plant_updated': return 'See the latest progress photos';
    case 'harvest_completed': return 'Congratulations on the successful harvest!';
    case 'strain_reviewed': return 'Read their detailed strain review';
    case 'achievement_earned': return 'Well deserved recognition!';
    case 'group_joined': return 'Welcome to the community';
    case 'expert_verified': return 'Now offering expert advice';
    case 'user_followed': return 'Growing their network';
    case 'post_liked': return 'Showing appreciation for great content';
    case 'milestone_reached': return 'Another step in their growing journey';
    default: return 'Something interesting happened';
  }
};

const getSourceType = (type: ActivityType): string => {
  switch (type) {
    case 'post_created':
    case 'comment_added':
    case 'post_liked':
      return 'post';
    case 'plant_updated':
    case 'harvest_completed':
    case 'milestone_reached':
      return 'plant';
    case 'strain_reviewed':
      return 'strain';
    case 'achievement_earned':
      return 'achievement';
    case 'group_joined':
      return 'group';
    case 'user_followed':
      return 'user';
    default:
      return 'general';
  }
};

const getActivityIcon = (type: ActivityType): IconName => {
  switch (type) {
    case 'post_created': return 'pencil-outline';
    case 'comment_added': return 'chatbubble-outline';
    case 'plant_updated': return 'leaf-outline';
    case 'harvest_completed': return 'checkmark-circle';
    case 'strain_reviewed': return 'star';
    case 'achievement_earned': return 'medal';
    case 'group_joined': return 'people-outline';
    case 'expert_verified': return 'checkmark-circle';
    case 'user_followed': return 'person-add';
    case 'post_liked': return 'heart-outline';
    case 'milestone_reached': return 'star';
    default: return 'default';
  }
};

const getActivityColor = (type: ActivityType): string => {
  switch (type) {
    case 'post_created': return '#6366f1';
    case 'comment_added': return '#8b5cf6';
    case 'plant_updated': return '#22c55e';
    case 'harvest_completed': return '#10b981';
    case 'strain_reviewed': return '#f59e0b';
    case 'achievement_earned': return '#f97316';
    case 'group_joined': return '#06b6d4';
    case 'expert_verified': return '#3b82f6';
    case 'user_followed': return '#ec4899';
    case 'post_liked': return '#ef4444';
    case 'milestone_reached': return '#84cc16';
    default: return '#6b7280';
  }
};

/**
 * ActivityFeed Component
 * 
 * Real-time activity feed for community engagement tracking with:
 * - FlashList virtualization for performance
 * - Intelligent filtering with debounced search
 * - Engagement metrics with haptic feedback
 * - Activity notification triggers
 * - Offline-first architecture with WatermelonDB
 * - Optimized image loading
 */
export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  currentUserId,
  onActivityPress,
  onUserPress,
  onPlantPress,
  showFilters = true,
  initialFilter = 'all',
  enablePullToRefresh = true,
  maxItems = 100,
}) => {
  const { t } = useTranslation('community');
  const { scheduleNotification } = useNotifications();
  const { sync, isSyncing } = useWatermelon();

  // State management
  const [selectedFilter, setSelectedFilter] = useState<ActivityFilter>(initialFilter);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Debounced search for performance (removed unused searchQuery)
  const debouncedSearchQuery = useDebounce('', 300);

  // Initialize mock data (replace with real data fetching)
  useEffect(() => {
    const loadActivities = async () => {
      setIsLoading(true);
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        const mockData = generateMockActivityData(maxItems);
        setActivities(mockData);
      } catch (error) {
        console.error('Failed to load activities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadActivities();
  }, [maxItems]);

  // Filter activities based on selected filter and search query
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Apply filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(activity => {
        switch (selectedFilter) {
          case 'following':
            // In real implementation, check if user follows the activity creator
            return Math.random() > 0.5; // Mock following logic
          case 'plants':
            return ['plant_updated', 'harvest_completed', 'milestone_reached'].includes(activity.activityType);
          case 'achievements':
            return activity.activityType === 'achievement_earned';
          case 'community':
            return ['post_created', 'comment_added', 'group_joined', 'user_followed', 'post_liked'].includes(activity.activityType);
          default:
            return true;
        }
      });
    }

    // Apply search query
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(activity =>
        activity.title.toLowerCase().includes(query) ||
        activity.description.toLowerCase().includes(query) ||
        activity.user?.username?.toLowerCase().includes(query) ||
        activity.metadata.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [activities, selectedFilter, debouncedSearchQuery]);

  // Debounced filter change handler
  const handleFilterChange = useDebouncedCallback(
    async (filter: ActivityFilter) => {
      await triggerLightHaptic();
      setSelectedFilter(filter);
    },
    200
  );

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    if (!enablePullToRefresh) return;

    setIsRefreshing(true);
    await triggerMediumHaptic();

    try {
      // Sync with WatermelonDB
      await sync({ showFeedback: false, force: true });

      // Reload activities (in real implementation, this would fetch from database)
      const refreshedData = generateMockActivityData(maxItems);
      setActivities(refreshedData);
    } catch (error) {
      console.error('Failed to refresh activities:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [enablePullToRefresh, sync, maxItems]);

  // Activity press handler with haptic feedback
  const handleActivityPress = useCallback(async (activity: ActivityItem) => {
    await triggerLightHaptic();

    // Trigger notification for engagement
    if (activity.userId !== currentUserId) {
      await scheduleNotification({
        identifier: `activity_viewed_${activity.activityId}`,
        title: 'Activity Viewed',
        body: `You viewed ${activity.user?.username}'s activity`,
        data: { activityId: activity.activityId, type: 'activity_view' },
        scheduledFor: new Date(Date.now() + 1000), // Immediate notification
      });
    }

    onActivityPress?.(activity);
  }, [currentUserId, onActivityPress, scheduleNotification]);

  // User press handler
  const handleUserPress = useCallback(async (userId: string) => {
    await triggerLightHaptic();
    onUserPress?.(userId);
  }, [onUserPress]);

  // Plant press handler
  const handlePlantPress = useCallback(async (plantId: string) => {
    await triggerLightHaptic();
    onPlantPress?.(plantId);
  }, [onPlantPress]);

  // Render filter button
  const renderFilterButton = useCallback(({ item: filter }: { item: ActivityFilterConfig }) => {
    const isSelected = selectedFilter === filter.key;

    const { animatedStyle, handlers } = useButtonAnimation({
      pressedScale: COMMUNITY_SCALE_VALUES.buttonPress,
      enableHaptics: true,
      hapticStyle: 'light',
      onPress: () => handleFilterChange(filter.key),
    });

    return (
      <Animated.View style={animatedStyle}>
        <Pressable
          {...handlers}
          className={`mr-3 rounded-full px-4 py-2 ${isSelected
              ? 'bg-primary-500'
              : 'bg-neutral-100 dark:bg-neutral-800'
            }`}
          accessibilityRole="button"
          accessibilityLabel={`Filter by ${filter.label}`}
          accessibilityState={{ selected: isSelected }}
        >
          <View className="flex-row items-center">
            <OptimizedIcon
              name={filter.icon}
              size={16}
              className={isSelected ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}
            />
            <ThemedText
              className={`ml-2 text-sm font-medium ${isSelected
                  ? 'text-white'
                  : 'text-neutral-600 dark:text-neutral-400'
                }`}
            >
              {t(`activityFeed.filters.${filter.key}`, filter.label)}
            </ThemedText>
          </View>
        </Pressable>
      </Animated.View>
    );
  }, [selectedFilter, handleFilterChange, t]);

  // Render activity item
  const renderActivityItem = useCallback(({ item: activity }: { item: ActivityItem }) => {
    const { animatedStyle, handlers } = useButtonAnimation({
      pressedScale: COMMUNITY_SCALE_VALUES.cardPress,
      enableHaptics: true,
      hapticStyle: 'light',
      onPress: () => handleActivityPress(activity),
    });

    const timeAgo = dayjs(activity.createdAt).fromNow();
    const activityIcon = getActivityIcon(activity.activityType);
    const activityColor = getActivityColor(activity.activityType);

    return (
      <Animated.View style={animatedStyle} className="mb-3">
        <Pressable
          {...handlers}
          className="rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-800"
          accessibilityRole="button"
          accessibilityLabel={`${activity.title}. ${activity.description}`}
        >
          <View className="flex-row">
            {/* User Avatar */}
            <Pressable
              onPress={() => handleUserPress(activity.userId)}
              className="mr-3"
              accessibilityRole="button"
              accessibilityLabel={`View ${activity.user?.username}'s profile`}
            >
              <UserAvatar
                uri={activity.user?.avatar_url || 'https://via.placeholder.com/40'}
                size={40}
              />
            </Pressable>

            {/* Activity Content */}
            <View className="flex-1">
              {/* Header */}
              <View className="mb-2 flex-row items-center">
                <OptimizedIcon
                  name={activityIcon}
                  size={16}
                  style={{ color: activityColor }}
                />
                <ThemedText className="ml-2 flex-1 text-sm font-medium">
                  {activity.title}
                </ThemedText>
                <ThemedText variant="caption" className="text-xs">
                  {timeAgo}
                </ThemedText>
              </View>

              {/* Description */}
              <ThemedText variant="muted" className="mb-3 text-sm">
                {activity.description}
              </ThemedText>

              {/* Plant Data */}
              {activity.metadata.plantData && (
                <Pressable
                  onPress={() => handlePlantPress(activity.metadata.plantData!.plantId)}
                  className="mb-3 rounded-lg bg-green-50 p-3 dark:bg-green-900/20"
                  accessibilityRole="button"
                  accessibilityLabel={`View plant ${activity.metadata.plantData.plantName}`}
                >
                  <View className="flex-row items-center">
                    <OptimizedIcon
                      name="leaf-outline"
                      size={16}
                      className="text-green-600 dark:text-green-400"
                    />
                    <ThemedText className="ml-2 text-sm font-medium text-green-800 dark:text-green-200">
                      {activity.metadata.plantData.plantName}
                    </ThemedText>
                    <ThemedText className="ml-auto text-xs text-green-600 dark:text-green-400">
                      Day {activity.metadata.plantData.daysSinceStart}
                    </ThemedText>
                  </View>
                </Pressable>
              )}

              {/* Activity Image */}
              {activity.metadata.imageUrl && (
                <View className="mb-3 overflow-hidden rounded-lg">
                  <NetworkResilientImage
                    url={activity.metadata.imageUrl}
                    width="100%"
                    height={150}
                    contentFit="cover"
                    enableRetry={true}
                    showProgress={true}
                    optimize={true}
                    quality={85}
                  />
                </View>
              )}

              {/* Engagement Stats */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center space-x-4">
                  <View className="flex-row items-center">
                    <OptimizedIcon
                      name="heart-outline"
                      size={14}
                      className="text-neutral-500"
                    />
                    <ThemedText variant="caption" className="ml-1">
                      {activity.engagementStats.likes}
                    </ThemedText>
                  </View>
                  <View className="flex-row items-center">
                    <OptimizedIcon
                      name="chatbubble-outline"
                      size={14}
                      className="text-neutral-500"
                    />
                    <ThemedText variant="caption" className="ml-1">
                      {activity.engagementStats.comments}
                    </ThemedText>
                  </View>
                  <View className="flex-row items-center">
                    <OptimizedIcon
                      name="eye-outline"
                      size={14}
                      className="text-neutral-500"
                    />
                    <ThemedText variant="caption" className="ml-1">
                      {activity.engagementStats.views}
                    </ThemedText>
                  </View>
                </View>

                {/* Tags */}
                {activity.metadata.tags.length > 0 && (
                  <View className="flex-row">
                    {activity.metadata.tags.slice(0, 2).map((tag, index) => (
                      <View
                        key={index}
                        className="ml-1 rounded-full bg-neutral-100 px-2 py-1 dark:bg-neutral-700"
                      >
                        <ThemedText variant="caption" className="text-xs">
                          #{tag}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  }, [handleActivityPress, handleUserPress, handlePlantPress]);

  // Loading state
  if (isLoading) {
    return (
      <ThemedView className="flex-1 items-center justify-center p-6">
        <OptimizedIcon
          name="refresh"
          size={32}
          className="mb-4 text-neutral-400"
        />
        <ThemedText variant="muted" className="text-center">
          {t('activityFeed.loading', 'Loading activities...')}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1">
      {/* Filter Bar */}
      {showFilters && (
        <View className="border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
          <FlashListWrapper
            data={ACTIVITY_FILTERS}
            renderItem={renderFilterButton}
            keyExtractor={(item) => item.key}
            horizontal
            showsHorizontalScrollIndicator={false}
            estimatedItemSize={80}
            contentContainerStyle={{ paddingRight: 16 }}
          />
        </View>
      )}

      {/* Activity List */}
      <FlashListWrapper
        data={filteredActivities}
        renderItem={renderActivityItem}
        keyExtractor={(item) => item.activityId}
        estimatedItemSize={120}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          enablePullToRefresh ? (
            <RefreshControl
              refreshing={isRefreshing || isSyncing}
              onRefresh={handleRefresh}
              tintColor="#6366f1"
              colors={['#6366f1']}
            />
          ) : undefined
        }
        ListEmptyComponent={
          <ThemedView className="flex-1 items-center justify-center p-8">
            <OptimizedIcon
              name="notification"
              size={48}
              className="mb-4 text-neutral-400"
            />
            <ThemedText variant="heading" className="mb-2 text-center text-lg">
              {t('activityFeed.empty.title', 'No Activities Yet')}
            </ThemedText>
            <ThemedText variant="muted" className="text-center">
              {t('activityFeed.empty.description', 'Follow other growers and join the community to see activities here.')}
            </ThemedText>
          </ThemedView>
        }
      />
    </ThemedView>
  );
};

export default ActivityFeed;