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

export default DailyStatItem;
