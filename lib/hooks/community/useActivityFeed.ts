import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { ActivityItem, ActivityType, ActivityFilter } from '../../../components/live-notifications/ActivityFeed';
import useWatermelon from '../useWatermelon';
import { useDebounce } from '../useDebounce';
import { useDebouncedCallback } from '../useDebouncedCallback';
import { useNotifications } from '../useNotifications';
import supabase from '../../supabase';

interface UseActivityFeedOptions {
  userId?: string;
  filter?: ActivityFilter;
  searchQuery?: string;
  limit?: number;
  enableRealTime?: boolean;
}

interface UseActivityFeedReturn {
  activities: ActivityItem[];
  filteredActivities: ActivityItem[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  updateFilter: (filter: ActivityFilter) => void;
  updateSearchQuery: (query: string) => void;
  markActivityAsViewed: (activityId: string) => Promise<void>;
  triggerNotification: (activity: ActivityItem) => Promise<void>;
}

/**
 * Hook for managing activity feed data with real-time updates
 * 
 * Features:
 * - Real-time activity updates via Supabase
 * - Intelligent filtering and search
 * - Offline-first with WatermelonDB sync
 * - Activity notification triggers
 * - Performance optimizations with debouncing
 */
export function useActivityFeed(options: UseActivityFeedOptions = {}): UseActivityFeedReturn {
  const {
    userId,
    filter = 'all',
    searchQuery = '',
    limit = 50,
    enableRealTime = true,
  } = options;

  const { t } = useTranslation('community');
  const queryClient = useQueryClient();
  const { sync, isSyncing } = useWatermelon();
  const { scheduleNotification } = useNotifications();

  // State management
  const [currentFilter, setCurrentFilter] = useState<ActivityFilter>(filter);
  const [currentSearchQuery, setCurrentSearchQuery] = useState(searchQuery);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewedActivities, setViewedActivities] = useState<Set<string>>(new Set());

  // Debounced search for performance
  const debouncedSearchQuery = useDebounce(currentSearchQuery, 300);

  // Fetch activities from database
  const {
    data: activities = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['activities', userId, currentFilter, limit],
    queryFn: async (): Promise<ActivityItem[]> => {
      // In a real implementation, this would fetch from Supabase
      // For now, we'll return mock data that matches the expected structure
      return generateMockActivityData(limit);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!userId,
  });

  // Real-time subscription for activity updates
  useEffect(() => {
    if (!enableRealTime || !userId) return;

    const channel = supabase
      .channel(`activities:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_activities', // This table would need to be created
        },
        (payload) => {
          console.log('Activity update received:', payload);
          // Invalidate and refetch activities
          queryClient.invalidateQueries({ queryKey: ['activities'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enableRealTime, userId, queryClient]);

  // Filter activities based on current filter and search query
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Apply activity type filter
    if (currentFilter !== 'all') {
      filtered = filtered.filter(activity => {
        switch (currentFilter) {
          case 'following':
            // In real implementation, check if user follows the activity creator
            return activity.metadata.relatedUsers.includes(userId || '');
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

    // Apply search query filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(activity =>
        activity.title.toLowerCase().includes(query) ||
        activity.description.toLowerCase().includes(query) ||
        activity.user?.username?.toLowerCase().includes(query) ||
        activity.metadata.tags.some(tag => tag.toLowerCase().includes(query)) ||
        activity.metadata.strainName?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [activities, currentFilter, debouncedSearchQuery, userId]);

  // Refresh activities
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Sync with WatermelonDB first
      await sync({ showFeedback: false, force: true });

      // Refetch activities
      await refetch();
    } catch (error) {
      console.error('Failed to refresh activities:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [sync, refetch]);

  // Load more activities (pagination)
  const loadMore = useCallback(async () => {
    // In a real implementation, this would fetch the next page
    console.log('Loading more activities...');
  }, []);

  // Update filter with debouncing
  const updateFilter = useDebouncedCallback(
    (newFilter: ActivityFilter) => {
      setCurrentFilter(newFilter);
    },
    200
  );

  // Update search query
  const updateSearchQuery = useCallback((query: string) => {
    setCurrentSearchQuery(query);
  }, []);

  // Mark activity as viewed
  const markActivityAsViewed = useCallback(async (activityId: string) => {
    if (viewedActivities.has(activityId)) return;

    setViewedActivities(prev => new Set(prev).add(activityId));

    // In a real implementation, this would update the database
    try {
      // await supabase
      //   .from('activity_views')
      //   .insert({ activity_id: activityId, user_id: userId, viewed_at: new Date() });
      console.log(`Marked activity ${activityId} as viewed`);
    } catch (error) {
      console.error('Failed to mark activity as viewed:', error);
    }
  }, [viewedActivities, userId]);

  // Trigger notification for activity engagement
  const triggerNotification = useCallback(async (activity: ActivityItem) => {
    if (activity.userId === userId) return; // Don't notify for own activities

    try {
      await scheduleNotification({
        identifier: `activity_engagement_${activity.activityId}`,
        title: t('notifications.activityEngagement.title', 'Activity Engagement'),
        body: t('notifications.activityEngagement.body', {
          username: activity.user?.username || 'Someone',
          action: getActivityActionText(activity.activityType),
        }),
        data: {
          activityId: activity.activityId,
          userId: activity.userId,
          type: 'activity_engagement',
        },
        scheduledFor: new Date(Date.now() + 1000), // Immediate notification
      });
    } catch (error) {
      console.error('Failed to trigger activity notification:', error);
    }
  }, [userId, scheduleNotification, t]);

  return {
    activities,
    filteredActivities,
    isLoading,
    isRefreshing: isRefreshing || isSyncing,
    error,
    hasMore: activities.length >= limit, // Simple check, would be more sophisticated in real implementation
    refresh,
    loadMore,
    updateFilter,
    updateSearchQuery,
    markActivityAsViewed,
    triggerNotification,
  };
}

// Helper function to get activity action text for notifications
function getActivityActionText(activityType: ActivityType): string {
  switch (activityType) {
    case 'post_created': return 'created a post';
    case 'comment_added': return 'added a comment';
    case 'plant_updated': return 'updated their plant';
    case 'harvest_completed': return 'completed a harvest';
    case 'strain_reviewed': return 'reviewed a strain';
    case 'achievement_earned': return 'earned an achievement';
    case 'group_joined': return 'joined a group';
    case 'expert_verified': return 'became verified';
    case 'user_followed': return 'followed someone';
    case 'post_liked': return 'liked a post';
    case 'milestone_reached': return 'reached a milestone';
    default: return 'had activity';
  }
}

// Mock data generator (same as in ActivityFeed component)
function generateMockActivityData(count: number = 50): ActivityItem[] {
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

  // Ensure we have data to work with
  if (users.length === 0 || activityTypes.length === 0) {
    return [];
  }

  for (let i = 0; i < count; i++) {
    const userIndex = Math.floor(Math.random() * users.length);
    const activityTypeIndex = Math.floor(Math.random() * activityTypes.length);

    // Ensure indices are within bounds
    if (userIndex >= users.length || activityTypeIndex >= activityTypes.length) {
      continue;
    }

    const user = users[userIndex];
    const activityType = activityTypes[activityTypeIndex];

    // Additional safety check (though should not be needed with proper bounds checking)
    if (!user || !activityType) {
      continue;
    }

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
        relatedUsers: Math.random() > 0.7 ? ['user1', 'user2'] : [],
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
}

function getActivityTitle(type: ActivityType, username: string): string {
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
}

function getActivityDescription(type: ActivityType): string {
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
}

function getSourceType(type: ActivityType): string {
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
}