import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';

import StatItem from '@/components/community/analytics/StatItem';
import ViolationTypeItem from '@/components/community/analytics/ViolationTypeItem';
import DailyStatItem from '@/components/community/analytics/DailyStatItem';

import type { ModerationStats } from '../ModerationDashboard';
import type { ViolationType } from '@/lib/services/content-moderation.service';

interface AnalyticsViewProps {
  stats: ModerationStats;
  loading: boolean;
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ stats, loading }) => {
  const { t } = useTranslation('moderation');

  if (loading) {
    return (
      <View
        className="flex-1 px-6 py-6"
        accessible
        accessibilityRole="none"
        accessibilityLiveRegion="polite"
        accessibilityLabel={t('moderation:loadingAnalytics') ?? `${t('common:loading')}...`}
      >
        <ThemedText
          className="text-sm text-neutral-600 dark:text-neutral-400"
          accessible
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
          accessibilityLabel={t('moderation:loadingAnalyticsMessage') ?? `${t('common:loading')}...`}
        >
          {t('common:loading')}...
        </ThemedText>
      </View>
    );
  }

  return (
    <View className="flex-1 px-6 py-4">
      {/* Overview Stats */}
      <ThemedView variant="card" className="mb-6 p-4">
        <ThemedText className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          {t('moderationDashboard.overviewStats')}
        </ThemedText>

        <View
          className="flex-row justify-between"
          accessible={true}
          accessibilityRole="summary"
          accessibilityLabel={
            t('moderationDashboard.overviewStatsA11y', {
              total: stats.totalModerated,
              pending: stats.pendingReview,
              approved: stats.approved,
              blocked: stats.blocked,
            }) ||
            `${t('moderationDashboard.overviewStats')}: ` +
            `${t('moderationDashboard.totalModerated')}: ${stats.totalModerated}, ` +
            `${t('moderationDashboard.pendingReview')}: ${stats.pendingReview}, ` +
            `${t('moderationDashboard.approved')}: ${stats.approved}, ` +
            `${t('moderationDashboard.blocked')}: ${stats.blocked}`
          }
        >
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
            .sort(([, a], [, b]) => b - a)
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
          {stats.dailyStats.map((day) => (
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

export default AnalyticsView;
