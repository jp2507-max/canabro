import React, { useCallback } from 'react';
import { View, Text, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import AnimatedButton from '@/components/buttons/AnimatedButton';
import ModerationIndicator from '../ModerationIndicator';
import { triggerMediumHapticSync } from '@/lib/utils/haptics';

import type { FlaggedContent } from '../ModerationDashboard';

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
              <View
                className={`w-2 h-2 rounded-full mr-2 ${
                  violation.severity === 'critical'
                    ? 'bg-red-500'
                    : violation.severity === 'high'
                    ? 'bg-orange-500'
                    : violation.severity === 'medium'
                    ? 'bg-yellow-500'
                    : 'bg-blue-500'
                }`}
              />
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

export default FlaggedContentItem;
