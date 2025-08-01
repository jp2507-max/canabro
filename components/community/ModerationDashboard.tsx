/**
 * ModerationDashboard - Community management interface for moderators and admins
 * 
 * Features:
 * - Flagged content review with bulk actions
 * - User management tools with suspension/ban capabilities
 * - Moderation analytics and statistics
 * - Protected route with admin permissions
 * - Real-time updates for moderation queue
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { User } from '@supabase/supabase-js';

import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import SegmentedControl, { SegmentedControlOption } from '@/components/ui/SegmentedControl';
import ProtectedRoute from '@/components/ui/ProtectedRoute';

import { contentModerationService, ModerationResult, ViolationType } from '@/lib/services/content-moderation.service';
import { useSession } from '@/lib/hooks/useSession';
import { triggerLightHapticSync } from '@/lib/utils/haptics';
import { log } from '@/lib/utils/logger';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DatabaseErrorHandler } from '@/components/DatabaseErrorHandler';

import FlaggedContentView from '@/components/community/flagged/FlaggedContentView';
import UserManagementView from '@/components/community/users/UserManagementView';
import AnalyticsView from './analytics/AnalyticsView';
import type { ModerationStatus } from './ModerationIndicator';

// ========================================
// 🔧 TYPES & INTERFACES
// ========================================

export interface FlaggedContent {
  id: string;
  type: 'post' | 'comment' | 'question' | 'plant_share';
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  moderationResult: ModerationResult;
  reportCount: number;
  createdAt: Date;
  flaggedAt: Date;
  status: ModerationStatus;
}

export interface UserModerationInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  joinedAt: Date;
  postCount: number;
  reportCount: number;
  violationCount: number;
  status: 'active' | 'warned' | 'suspended' | 'banned';
  lastActivity: Date;
}

export interface ModerationStats {
  totalModerated: number;
  pendingReview: number;
  approved: number;
  flagged: number;
  blocked: number;
  violationTypes: Record<ViolationType, number>;
  dailyStats: {
    date: string;
    moderated: number;
    approved: number;
    flagged: number;
  }[];
}

type DashboardTab = 'flagged' | 'users' | 'analytics';

// ========================================
// 🛡️ MODERATION DASHBOARD COMPONENT
// ========================================

const ModerationDashboard: React.FC = () => {
  const { t } = useTranslation(['moderation', 'common']);
  const { user } = useSession();
  const queryClient = useQueryClient();

  // State management
  const [activeTab, setActiveTab] = useState<DashboardTab>('flagged');
  const [refreshing, setRefreshing] = useState(false);

  // Data fetching with TanStack Query
  // Fetch flagged content
  const {
    data: flaggedContent = [],
    isLoading: flaggedLoading,
    isError: flaggedIsError,
    error: flaggedError,
    refetch: refetchFlagged,
  } = useQuery<FlaggedContent[], Error>({
    queryKey: ['moderation', 'flaggedContent'],
    queryFn: async () => {
      // Prefer a service if available; fallback to API route
      try {
        if ((contentModerationService as any)?.listFlaggedContent) {
          const res = await (contentModerationService as any).listFlaggedContent();
          // Ensure date objects are converted
          return res.map((item: any) => ({
            ...item,
            createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
            flaggedAt: item.flaggedAt ? new Date(item.flaggedAt) : new Date(),
          }));
        }
      } catch (e) {
        // If service call fails, try REST
        log.warn('[ModerationDashboard] contentModerationService.listFlaggedContent failed, trying REST fallback', e);
      }

      const resp = await fetch('/api/moderation/flagged');
      if (!resp.ok) {
        throw new Error(`Failed to fetch flagged content: ${resp.status}`);
      }
      const json = await resp.json();
      return (json?.data ?? json ?? []).map((item: any) => ({
        ...item,
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        flaggedAt: item.flaggedAt ? new Date(item.flaggedAt) : new Date(),
      })) as FlaggedContent[];
    },
  });

  // Fetch moderated users overview (if backend supports)
  const {
    data: users = [],
    isLoading: usersLoading,
    isError: usersIsError,
    error: usersError,
    refetch: refetchUsers,
  } = useQuery<UserModerationInfo[], Error>({
    queryKey: ['moderation', 'users'],
    queryFn: async () => {
      if ((contentModerationService as any)?.listUsersModerationInfo) {
        const res = await (contentModerationService as any).listUsersModerationInfo();
        return res.map((u: any) => ({
          ...u,
          joinedAt: u.joinedAt ? new Date(u.joinedAt) : new Date(),
          lastActivity: u.lastActivity ? new Date(u.lastActivity) : new Date(),
        })) as UserModerationInfo[];
      }
      const resp = await fetch('/api/moderation/users');
      if (!resp.ok) throw new Error(`Failed to fetch moderation users: ${resp.status}`);
      const json = await resp.json();
      return (json?.data ?? json ?? []).map((u: any) => ({
        ...u,
        joinedAt: u.joinedAt ? new Date(u.joinedAt) : new Date(),
        lastActivity: u.lastActivity ? new Date(u.lastActivity) : new Date(),
      })) as UserModerationInfo[];
    },
  });

  // Fetch analytics/stats (if backend supports)
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsIsError,
    error: statsError,
    refetch: refetchStats,
  } = useQuery<ModerationStats, Error>({
    queryKey: ['moderation', 'stats'],
    queryFn: async () => {
      if ((contentModerationService as any)?.getStats) {
        return await (contentModerationService as any).getStats();
      }
      const resp = await fetch('/api/moderation/stats');
      if (!resp.ok) throw new Error(`Failed to fetch moderation stats: ${resp.status}`);
      const json = await resp.json();
      return (json?.data ?? json) as ModerationStats;
    },
  });

  // Segmented control options
  const tabOptions: SegmentedControlOption[] = useMemo(() => [
    {
      key: 'flagged',
      label: t('moderationDashboard.tabs.flaggedContent'),
      icon: 'warning',
      color: 'text-orange-600 dark:text-orange-400',
    },
    {
      key: 'users',
      label: t('moderationDashboard.tabs.userManagement'),
      icon: 'people',
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      key: 'analytics',
      label: t('moderationDashboard.tabs.analytics'),
      icon: 'analytics-outline',
      color: 'text-green-600 dark:text-green-400',
    },
  ], [t]);

  // Handle refresh
  const handleRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    triggerLightHapticSync();

    try {
      if (activeTab === 'flagged') {
        // Ensure we don't return the refetch Promise; just await it
        await refetchFlagged();
        await Promise.allSettled([
          queryClient.invalidateQueries({ queryKey: ['moderation', 'users'] }),
          queryClient.invalidateQueries({ queryKey: ['moderation', 'stats'] }),
        ]);
      } else if (activeTab === 'users') {
        await refetchUsers();
        await Promise.allSettled([
          queryClient.invalidateQueries({ queryKey: ['moderation', 'flaggedContent'] }),
          queryClient.invalidateQueries({ queryKey: ['moderation', 'stats'] }),
        ]);
      } else {
        await refetchStats();
        await Promise.allSettled([
          queryClient.invalidateQueries({ queryKey: ['moderation', 'flaggedContent'] }),
          queryClient.invalidateQueries({ queryKey: ['moderation', 'users'] }),
        ]);
      }
      log.info('[ModerationDashboard] Data refreshed');
    } catch (error) {
      log.error('[ModerationDashboard] Error refreshing data:', error as Error);
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, queryClient, refetchFlagged, refetchStats, refetchUsers]);

  // Handle tab change
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as DashboardTab);
    triggerLightHapticSync();
  }, []);

  // Admin permission check (secure: trust only server-verified app_metadata)
  const isAdmin = useCallback((user: User | null) => {
    const meta = (user?.app_metadata ?? {}) as { role?: string; roles?: string[] };

    // Single role field
    if (typeof meta.role === 'string' && meta.role.length > 0) {
      return meta.role.toLowerCase() === 'admin';
    }

    // Multiple roles array
    if (Array.isArray(meta.roles)) {
      return meta.roles.some(r => typeof r === 'string' && r.toLowerCase() === 'admin');
    }

    return false;
  }, []);

  return (
    <ProtectedRoute
      requireAuth={true}
      customGuard={(user) => isAdmin(user)}
      fallbackPath="/(app)/(tabs)"
    >
      <ThemedView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
        {/* Header */}
        <View className="px-6 pt-safe pb-4 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
          <View className="flex-row items-center justify-between">
            <View>
              <ThemedText className="text-2xl font-bold text-neutral-900 dark:text-white">
                {t('moderationDashboard.title')}
              </ThemedText>
              <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                {t('moderationDashboard.subtitle')}
              </ThemedText>
            </View>
            
            {/* Quick stats */}
            <View className="items-end">
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-orange-500 mr-2" />
                <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {(stats?.pendingReview ?? 0)} {t('moderationDashboard.pendingReview')}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Tab Navigation */}
          <View className="mt-4">
            <SegmentedControl
              options={tabOptions}
              selectedKey={activeTab}
              onSelectionChange={handleTabChange}
            />
          </View>
        </View>

        {/* Content */}
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#6B7280"
              colors={['#6B7280']}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'flagged' && (
            <>
              {flaggedIsError && (
                <View className="px-6 py-4">
                  <DatabaseErrorHandler
                    error={flaggedError as Error}
                    onResolve={async () => {
                      await queryClient.invalidateQueries({ queryKey: ['moderation', 'flaggedContent'] });
                    }}
                    onReset={async () => {
                      await refetchFlagged();
                    }}
                  />
                </View>
              )}
              <FlaggedContentView
                content={flaggedContent}
                loading={flaggedLoading}
                onAction={(action: string, contentId: string) => {
                  log.info('[ModerationDashboard] Action:', action, 'for content:', contentId);
                }}
              />
            </>
          )}

          {activeTab === 'users' && (
            <>
              {usersIsError && (
                <View className="px-6 py-4">
                  <DatabaseErrorHandler
                    error={usersError as Error}
                    onResolve={async () => {
                      await queryClient.invalidateQueries({ queryKey: ['moderation', 'users'] });
                    }}
                    onReset={async () => {
                      await refetchUsers();
                    }}
                  />
                </View>
              )}
              <UserManagementView
                users={users}
                loading={usersLoading}
                onAction={(action: string, userId: string) => {
                  log.info('[ModerationDashboard] Action:', action, 'for user:', userId);
                }}
              />
            </>
          )}

          {activeTab === 'analytics' && (
            <>
              {statsIsError && (
                <View className="px-6 py-4">
                  <DatabaseErrorHandler
                    error={statsError as Error}
                    onResolve={async () => {
                      await queryClient.invalidateQueries({ queryKey: ['moderation', 'stats'] });
                    }}
                    onReset={async () => {
                      await refetchStats();
                    }}
                  />
                </View>
              )}
              {stats && (
                <AnalyticsView
                  stats={stats}
                  loading={statsLoading}
                />
              )}
            </>
          )}
        </ScrollView>
      </ThemedView>
    </ProtectedRoute>
  );
};

// Removed in-file subcomponents as they are extracted to separate modules below.
// Keep default export for main dashboard.
export default ModerationDashboard;
