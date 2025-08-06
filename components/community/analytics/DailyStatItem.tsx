import React from 'react';
import { View } from 'react-native';
import ThemedText from '@/components/ui/ThemedText';
import { useTranslation } from 'react-i18next';

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
    <View
      className="flex-row items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-b-0"
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${new Date(date).toLocaleDateString()}. ${approvalRate.toFixed(1)}% ${t('moderationDashboard.approvalRate')}. ${t('moderationDashboard.total')}: ${moderated}. ${t('moderationDashboard.approved')}: ${approved}. ${t('moderationDashboard.flagged')}: ${flagged}.`}
    >
      <View
        className="flex-1"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <ThemedText
          className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          accessibilityRole="text"
          accessibilityLabel={new Date(date).toLocaleDateString()}
          accessible={false}
        >
          {new Date(date).toLocaleDateString()}
        </ThemedText>
        <ThemedText
          className="text-xs text-neutral-500 dark:text-neutral-400"
          accessibilityRole="text"
          accessibilityLabel={`${approvalRate.toFixed(1)}% ${t('moderationDashboard.approvalRate')}`}
          accessible={false}
        >
          {approvalRate.toFixed(1)}% {t('moderationDashboard.approvalRate')}
        </ThemedText>
      </View>

      <View className="flex-row space-x-4" accessible={false} importantForAccessibility="no-hide-descendants">
        <View className="items-center" accessible={false}>
          <ThemedText
            className="text-sm font-bold text-blue-600 dark:text-blue-400"
            accessibilityRole="text"
            accessibilityLabel={`${t('moderationDashboard.total')}: ${moderated}`}
            accessible={false}
          >
            {moderated}
          </ThemedText>
          <ThemedText
            className="text-xs text-neutral-500 dark:text-neutral-400"
            accessibilityRole="text"
            accessibilityLabel={t('moderationDashboard.total')}
            accessible={false}
          >
            {t('moderationDashboard.total')}
          </ThemedText>
        </View>

        <View className="items-center" accessible={false}>
          <ThemedText
            className="text-sm font-bold text-green-600 dark:text-green-400"
            accessibilityRole="text"
            accessibilityLabel={`${t('moderationDashboard.approved')}: ${approved}`}
            accessible={false}
          >
            {approved}
          </ThemedText>
          <ThemedText
            className="text-xs text-neutral-500 dark:text-neutral-400"
            accessibilityRole="text"
            accessibilityLabel={t('moderationDashboard.approved')}
            accessible={false}
          >
            {t('moderationDashboard.approved')}
          </ThemedText>
        </View>

        <View className="items-center" accessible={false}>
          <ThemedText
            className="text-sm font-bold text-orange-600 dark:text-orange-400"
            accessibilityRole="text"
            accessibilityLabel={`${t('moderationDashboard.flagged')}: ${flagged}`}
            accessible={false}
          >
            {flagged}
          </ThemedText>
          <ThemedText
            className="text-xs text-neutral-500 dark:text-neutral-400"
            accessibilityRole="text"
            accessibilityLabel={t('moderationDashboard.flagged')}
            accessible={false}
          >
            {t('moderationDashboard.flagged')}
          </ThemedText>
        </View>
      </View>
    </View>
  );
};

export default DailyStatItem;
