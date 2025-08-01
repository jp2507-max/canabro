import React, { useCallback } from 'react';
import { View, Text, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import AnimatedButton from '@/components/buttons/AnimatedButton';
import { triggerMediumHapticSync } from '@/lib/utils/haptics';

import type { UserModerationInfo } from '../ModerationDashboard';

interface UserModerationItemProps {
  user: UserModerationInfo;
  onAction: (action: string, userId: string) => void;
}

const UserModerationItem: React.FC<UserModerationItemProps> = ({ user, onAction }) => {
  const { t } = useTranslation('moderation');

  const handleAction = useCallback(
    (action: string) => {
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
    },
    [user.id, user.name, onAction, t]
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'warned':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'suspended':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
      case 'banned':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900/20';
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

export default UserModerationItem;
