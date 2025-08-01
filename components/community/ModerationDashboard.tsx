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
import { View, Text, ScrollView, RefreshControl, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { User } from '@supabase/supabase-js';

import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import SegmentedControl, { SegmentedControlOption } from '@/components/ui/SegmentedControl';
import { FlashListWrapper } from '@/components/ui/FlashListWrapper';
import AnimatedButton from '@/components/buttons/AnimatedButton';
import ProtectedRoute from '@/components/ui/ProtectedRoute';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import ModerationIndicator, { ModerationStatus } from './ModerationIndicator';

import { contentModerationService, ModerationResult, ViolationType } from '@/lib/services/content-moderation.service';
import { useSession } from '@/lib/hooks/useSession';
import { triggerMediumHapticSync, triggerLightHapticSync } from '@/lib/utils/haptics';
import { log } from '@/lib/utils/logger';

// ========================================
// 🔧 TYPES & INTERFACES
// ========================================

interface FlaggedContent {
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

interface UserModerationInfo {
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

interface ModerationStats {
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
  
  // State management
  const [activeTab, setActiveTab] = useState<DashboardTab>('flagged');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Mock data - in production, this would come from API calls
  const [flaggedContent] = useState<FlaggedContent[]>([
    {
      id: '1',
      type: 'post',
      title: 'Suspicious growing advice',
      content: 'This post contains potentially harmful growing advice that could damage plants...',
      author: { id: 'user1', name: 'GrowUser123' },
      moderationResult: {
        isAllowed: false,
        confidence: 0.85,
        violations: [
          {
            type: 'inappropriate_content',
            severity: 'high',
            description: 'Harmful growing practices detected',
            confidence: 0.85,
          }
        ],
        suggestedAction: 'flag_for_review',
      },
      reportCount: 3,
      createdAt: new Date('2025-01-30T10:00:00Z'),
      flaggedAt: new Date('2025-01-30T11:00:00Z'),
      status: 'flagged',
    },
    // Add more mock data as needed
  ]);

  const [users] = useState<UserModerationInfo[]>([
    {
      id: 'user1',
      name: 'GrowUser123',
      email: 'user@example.com',
      joinedAt: new Date('2024-12-01'),
      postCount: 45,
      reportCount: 3,
      violationCount: 1,
      status: 'warned',
      lastActivity: new Date('2025-01-30T09:00:00Z'),
    },
    // Add more mock data as needed
  ]);

  const [stats] = useState<ModerationStats>({
    totalModerated: 1247,
    pendingReview: 23,
    approved: 1156,
    flagged: 45,
    blocked: 23,
    violationTypes: {
      spam: 15,
      inappropriate_content: 12,
      harassment: 8,
      misinformation: 5,
      off_topic: 3,
      copyright: 1,
      adult_content: 0,
      violence: 1,
      illegal_content: 0,
      profanity: 0,
    },
    dailyStats: [
      { date: '2025-01-30', moderated: 45, approved: 40, flagged: 5 },
      { date: '2025-01-29', moderated: 52, approved: 48, flagged: 4 },
      { date: '2025-01-28', moderated: 38, approved: 35, flagged: 3 },
    ],
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
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerLightHapticSync();
    
    try {
      // In production, refresh data from API
      await new Promise(resolve => setTimeout(resolve, 1000));
      log.info('[ModerationDashboard] Data refreshed');
    } catch (error) {
      log.error('[ModerationDashboard] Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Handle tab change
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as DashboardTab);
    triggerLightHapticSync();
  }, []);

  // Admin permission check
  const isAdmin = useCallback((user: User | null) => {
    // In production, check user roles/permissions
    return user?.email?.includes('admin') || user?.user_metadata?.role === 'admin';
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
                  {stats.pendingReview} {t('moderationDashboard.pendingReview')}
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
            <FlaggedContentView
              content={flaggedContent}
              loading={loading}
              onAction={(action, contentId) => {
                // Handle moderation actions
                log.info('[ModerationDashboard] Action:', action, 'for content:', contentId);
              }}
            />
          )}

          {activeTab === 'users' && (
            <UserManagementView
              users={users}
              loading={loading}
              onAction={(action, userId) => {
                // Handle user management actions
                log.info('[ModerationDashboard] Action:', action, 'for user:', userId);
              }}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              stats={stats}
              loading={loading}
            />
          )}
        </ScrollView>
      </ThemedView>
    </ProtectedRoute>
  );
};

// ========================================
// 📋 FLAGGED CONTENT VIEW
// ========================================

interface FlaggedContentViewProps {
  content: FlaggedContent[];
  loading: boolean;
  onAction: (action: string, contentId: string) => void;
}

const FlaggedContentView: React.FC<FlaggedContentViewProps> = ({
  content,
  loading,
  onAction,
}) => {
  const { t } = useTranslation('moderation');

  const renderFlaggedItem = useCallback(({ item }: { item: FlaggedContent }) => (
    <FlaggedContentItem
      content={item}
      onAction={onAction}
    />
  ), [onAction]);

  if (content.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-20">
        <OptimizedIcon
          name="checkmark-circle"
          size={64}
          className="text-green-500 mb-4"
        />
        <ThemedText className="text-lg font-medium text-neutral-700 dark:text-neutral-300">
          {t('moderationDashboard.noFlaggedContent')}
        </ThemedText>
        <ThemedText className="text-sm text-neutral-500 dark:text-neutral-400 text-center mt-2">
          {t('moderationDashboard.noFlaggedContentDescription')}
        </ThemedText>
      </View>
    );
  }

  return (
    <View className="flex-1 px-6 py-4">
      <FlashListWrapper
        data={content}
        renderItem={renderFlaggedItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

// ========================================
// 📄 FLAGGED CONTENT ITEM
// ========================================

interface FlaggedContentItemProps {
  content: FlaggedContent;
  onAction: (action: string, contentId: string) => void;
}

const FlaggedContentItem: React.FC<FlaggedContentItemProps> = ({
  content,
  onAction,
}) => {
  const { t } = useTranslation('moderation');

  const handleAction = useCallback((action: string) => {
    triggerMediumHapticSync();
    
    Alert.alert(
      t('moderationDashboard.confirmAction'),
      t('moderationDashboard.confirmActionDescription', { action }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: () => onAction(action, content.id),
        },
      ]
    );
  }, [content.id, onAction, t]);

  return (
    <ThemedView variant="card" className="mb-4 p-4">
      {/* Header */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <View className="flex-row items-center mb-2">
            <ModerationIndicator
              status={content.status}
              violationCount={content.moderationResult.violations.length}
              size="small"
            />
            <View className="ml-2 px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-700">
              <Text className="text-xs font-medium text-neutral-600 dark:text-neutral-400 capitalize">
                {content.type}
              </Text>
            </View>
          </View>
          
          <ThemedText className="font-semibold text-neutral-900 dark:text-white" numberOfLines={2}>
            {content.title}
          </ThemedText>
          
          <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400 mt-1" numberOfLines={3}>
            {content.content}
          </ThemedText>
        </View>
      </View>

      {/* Author and Stats */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 items-center justify-center mr-3">
            <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              {content.author.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {content.author.name}
            </ThemedText>
            <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400">
              {content.reportCount} {t('moderationDashboard.reports')}
            </ThemedText>
          </View>
        </View>
        
        <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400">
          {content.flaggedAt.toLocaleDateString()}
        </ThemedText>
      </View>

      {/* Violations */}
      {content.moderationResult.violations.length > 0 && (
        <View className="mb-4">
          <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            {t('moderationDashboard.violations')}:
          </ThemedText>
          {content.moderationResult.violations.map((violation, index) => (
            <View key={index} className="flex-row items-center mb-1">
              <View className={`w-2 h-2 rounded-full mr-2 ${
                violation.severity === 'critical' ? 'bg-red-500' :
                violation.severity === 'high' ? 'bg-orange-500' :
                violation.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
              }`} />
              <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400 flex-1">
                {violation.description}
              </ThemedText>
              <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400">
                {Math.round(violation.confidence * 100)}%
              </ThemedText>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View className="flex-row space-x-2">
        <AnimatedButton
          title={t('moderationDashboard.approve')}
          onPress={() => handleAction('approve')}
          variant="secondary"
          icon="checkmark"
        />
        <AnimatedButton
          title={t('moderationDashboard.hide')}
          onPress={() => handleAction('hide')}
          variant="secondary"
          icon="eye-outline"
        />
        <AnimatedButton
          title={t('moderationDashboard.delete')}
          onPress={() => handleAction('delete')}
          variant="secondary"
          icon="trash-outline"
        />
      </View>
    </ThemedView>
  );
};

export default ModerationDashboard;

// ========================================
// 👥 USER MANAGEMENT VIEW
// ========================================

interface UserManagementViewProps {
  users: UserModerationInfo[];
  loading: boolean;
  onAction: (action: string, userId: string) => void;
}

const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  loading,
  onAction,
}) => {
  const { t } = useTranslation('moderation');

  const renderUserItem = useCallback(({ item }: { item: UserModerationInfo }) => (
    <UserModerationItem
      user={item}
      onAction={onAction}
    />
  ), [onAction]);

  if (users.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-20">
        <OptimizedIcon
          name="people"
          size={64}
          className="text-blue-500 mb-4"
        />
        <ThemedText className="text-lg font-medium text-neutral-700 dark:text-neutral-300">
          {t('moderationDashboard.noUsers')}
        </ThemedText>
        <ThemedText className="text-sm text-neutral-500 dark:text-neutral-400 text-center mt-2">
          {t('moderationDashboard.noUsersDescription')}
        </ThemedText>
      </View>
    );
  }

  return (
    <View className="flex-1 px-6 py-4">
      <FlashListWrapper
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

// ========================================
// 👤 USER MODERATION ITEM
// ========================================

interface UserModerationItemProps {
  user: UserModerationInfo;
  onAction: (action: string, userId: string) => void;
}

const UserModerationItem: React.FC<UserModerationItemProps> = ({
  user,
  onAction,
}) => {
  const { t } = useTranslation('moderation');

  const handleAction = useCallback((action: string) => {
    triggerMediumHapticSync();
    
    Alert.alert(
      t('moderationDashboard.confirmUserAction'),
      t('moderationDashboard.confirmUserActionDescription', { action, user: user.name }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.confirm'),
          style: action === 'ban' ? 'destructive' : 'default',
          onPress: () => onAction(action, user.id),
        },
      ]
    );
  }, [user.id, user.name, onAction, t]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'warned': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'suspended': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
      case 'banned': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default: return 'text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900/20';
    }
  };

  return (
    <ThemedView variant="card" className="mb-4 p-4">
      {/* Header */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-row items-center flex-1">
          {/* Avatar */}
          <View className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700 items-center justify-center mr-3">
            {user.avatar ? (
              <Text>👤</Text>
            ) : (
              <Text className="text-lg font-medium text-neutral-600 dark:text-neutral-400">
                {user.name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          
          <View className="flex-1">
            <ThemedText className="font-semibold text-neutral-900 dark:text-white">
              {user.name}
            </ThemedText>
            <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
              {user.email}
            </ThemedText>
            <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {t('moderationDashboard.joinedOn')} {user.joinedAt.toLocaleDateString()}
            </ThemedText>
          </View>
        </View>

        {/* Status Badge */}
        <View className={`px-3 py-1 rounded-full ${getStatusColor(user.status)}`}>
          <Text className={`text-xs font-medium capitalize ${getStatusColor(user.status).split(' ')[0]}`}>
            {user.status}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View className="flex-row justify-between mb-4">
        <View className="items-center">
          <ThemedText className="text-lg font-bold text-neutral-900 dark:text-white">
            {user.postCount}
          </ThemedText>
          <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400">
            {t('moderationDashboard.posts')}
          </ThemedText>
        </View>
        
        <View className="items-center">
          <ThemedText className="text-lg font-bold text-orange-600 dark:text-orange-400">
            {user.reportCount}
          </ThemedText>
          <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400">
            {t('moderationDashboard.reports')}
          </ThemedText>
        </View>
        
        <View className="items-center">
          <ThemedText className="text-lg font-bold text-red-600 dark:text-red-400">
            {user.violationCount}
          </ThemedText>
          <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400">
            {t('moderationDashboard.violations')}
          </ThemedText>
        </View>
        
        <View className="items-center">
          <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400">
            {t('moderationDashboard.lastActive')}
          </ThemedText>
          <ThemedText className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
            {user.lastActivity.toLocaleDateString()}
          </ThemedText>
        </View>
      </View>

      {/* Actions */}
      <View className="flex-row space-x-2">
        {user.status === 'active' && (
          <>
            <AnimatedButton
              title={t('moderationDashboard.warn')}
              onPress={() => handleAction('warn')}
              variant="secondary"
              icon="warning"
            />
            <AnimatedButton
              title={t('moderationDashboard.suspend')}
              onPress={() => handleAction('suspend')}
              variant="secondary"
              icon="close"
            />
          </>
        )}
        
        {user.status === 'warned' && (
          <>
            <AnimatedButton
              title={t('moderationDashboard.clearWarning')}
              onPress={() => handleAction('clear_warning')}
              variant="secondary"
              icon="checkmark"
            />
            <AnimatedButton
              title={t('moderationDashboard.suspend')}
              onPress={() => handleAction('suspend')}
              variant="secondary"
              icon="close"
            />
          </>
        )}
        
        {user.status === 'suspended' && (
          <>
            <AnimatedButton
              title={t('moderationDashboard.unsuspend')}
              onPress={() => handleAction('unsuspend')}
              variant="secondary"
              icon="play"
            />
            <AnimatedButton
              title={t('moderationDashboard.ban')}
              onPress={() => handleAction('ban')}
              variant="secondary"
              icon="close"
            />
          </>
        )}
        
        {user.status !== 'banned' && (
          <AnimatedButton
            title={t('moderationDashboard.ban')}
            onPress={() => handleAction('ban')}
            variant="secondary"
            icon="close"
          />
        )}
        
        {user.status === 'banned' && (
          <AnimatedButton
            title={t('moderationDashboard.unban')}
            onPress={() => handleAction('unban')}
            variant="secondary"
            icon="checkmark-circle"
          />
        )}
      </View>
    </ThemedView>
  );
};

// ========================================
// 📊 ANALYTICS VIEW
// ========================================

interface AnalyticsViewProps {
  stats: ModerationStats;
  loading: boolean;
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  stats,
  loading,
}) => {
  const { t } = useTranslation('moderation');

  return (
    <View className="flex-1 px-6 py-4">
      {/* Overview Stats */}
      <ThemedView variant="card" className="mb-6 p-4">
        <ThemedText className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          {t('moderationDashboard.overviewStats')}
        </ThemedText>
        
        <View className="flex-row justify-between">
          <StatItem
            label={t('moderationDashboard.totalModerated')}
            value={stats.totalModerated}
            color="text-blue-600 dark:text-blue-400"
            icon="analytics-outline"
          />
          <StatItem
            label={t('moderationDashboard.pendingReview')}
            value={stats.pendingReview}
            color="text-orange-600 dark:text-orange-400"
            icon="calendar"
          />
          <StatItem
            label={t('moderationDashboard.approved')}
            value={stats.approved}
            color="text-green-600 dark:text-green-400"
            icon="checkmark-circle"
          />
          <StatItem
            label={t('moderationDashboard.blocked')}
            value={stats.blocked}
            color="text-red-600 dark:text-red-400"
            icon="close"
          />
        </View>
      </ThemedView>

      {/* Violation Types */}
      <ThemedView variant="card" className="mb-6 p-4">
        <ThemedText className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          {t('moderationDashboard.violationTypes')}
        </ThemedText>
        
        <View className="space-y-3">
          {Object.entries(stats.violationTypes)
            .filter(([_, count]) => count > 0)
            .sort(([_, a], [__, b]) => b - a)
            .map(([type, count]) => (
              <ViolationTypeItem
                key={type}
                type={type as ViolationType}
                count={count}
                total={Object.values(stats.violationTypes).reduce((sum, c) => sum + c, 0)}
              />
            ))}
        </View>
      </ThemedView>

      {/* Daily Stats */}
      <ThemedView variant="card" className="mb-6 p-4">
        <ThemedText className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          {t('moderationDashboard.dailyStats')}
        </ThemedText>
        
        <View className="space-y-3">
          {stats.dailyStats.map((day, index) => (
            <DailyStatItem
              key={day.date}
              date={day.date}
              moderated={day.moderated}
              approved={day.approved}
              flagged={day.flagged}
            />
          ))}
        </View>
      </ThemedView>
    </View>
  );
};

// ========================================
// 📈 STAT COMPONENTS
// ========================================

interface StatItemProps {
  label: string;
  value: number;
  color: string;
  icon: string;
}

const StatItem: React.FC<StatItemProps> = ({ label, value, color, icon }) => (
  <View className="items-center">
    <OptimizedIcon
      name={icon as any}
      size={24}
      className={`${color} mb-2`}
    />
    <ThemedText className={`text-2xl font-bold ${color}`}>
      {value.toLocaleString()}
    </ThemedText>
    <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
      {label}
    </ThemedText>
  </View>
);

interface ViolationTypeItemProps {
  type: ViolationType;
  count: number;
  total: number;
}

const ViolationTypeItem: React.FC<ViolationTypeItemProps> = ({ type, count, total }) => {
  const { t } = useTranslation('moderation');
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-1">
        <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 capitalize">
          {type.replace('_', ' ')}
        </ThemedText>
        <View className="flex-row items-center mt-1">
          <View className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full mr-3">
            <View 
              className="h-full bg-orange-500 rounded-full"
              style={{ width: `${percentage}%` }}
            />
          </View>
          <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400">
            {percentage.toFixed(1)}%
          </ThemedText>
        </View>
      </View>
      <ThemedText className="text-sm font-bold text-neutral-900 dark:text-white ml-4">
        {count}
      </ThemedText>
    </View>
  );
};

interface DailyStatItemProps {
  date: string;
  moderated: number;
  approved: number;
  flagged: number;
}

const DailyStatItem: React.FC<DailyStatItemProps> = ({ date, moderated, approved, flagged }) => {
  const { t } = useTranslation('moderation');
  const approvalRate = moderated > 0 ? (approved / moderated) * 100 : 0;

  return (
    <View className="flex-row items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-b-0">
      <View className="flex-1">
        <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {new Date(date).toLocaleDateString()}
        </ThemedText>
        <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400">
          {approvalRate.toFixed(1)}% {t('moderationDashboard.approvalRate')}
        </ThemedText>
      </View>
      
      <View className="flex-row space-x-4">
        <View className="items-center">
          <ThemedText className="text-sm font-bold text-blue-600 dark:text-blue-400">
            {moderated}
          </ThemedText>
          <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400">
            {t('moderationDashboard.total')}
          </ThemedText>
        </View>
        
        <View className="items-center">
          <ThemedText className="text-sm font-bold text-green-600 dark:text-green-400">
            {approved}
          </ThemedText>
          <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400">
            {t('moderationDashboard.approved')}
          </ThemedText>
        </View>
        
        <View className="items-center">
          <ThemedText className="text-sm font-bold text-orange-600 dark:text-orange-400">
            {flagged}
          </ThemedText>
          <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400">
            {t('moderationDashboard.flagged')}
          </ThemedText>
        </View>
      </View>
    </View>
  );
};