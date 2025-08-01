import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import ThemedText from '@/components/ui/ThemedText';
import { FlashListWrapper } from '@/components/ui/FlashListWrapper';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';

import FlaggedContentItem from './FlaggedContentItem';
import type { FlaggedContent } from '../ModerationDashboard';

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

  const renderFlaggedItem = useCallback(
    ({ item }: { item: FlaggedContent }) => (
      <FlaggedContentItem content={item} onAction={onAction} />
    ),
    [onAction]
  );

  if (loading) {
    return (
      <View className="flex-1 px-6 py-6">
        <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
          {t('common:loading')}...
        </ThemedText>
      </View>
    );
  }

  if (!loading && content.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-20">
        <OptimizedIcon name="checkmark-circle" size={64} className="text-green-500 mb-4" />
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

export default FlaggedContentView;
