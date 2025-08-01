import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import ThemedText from '@/components/ui/ThemedText';
import { FlashListWrapper } from '@/components/ui/FlashListWrapper';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';

import UserModerationItem from './UserModerationItem';
import type { UserModerationInfo } from '../ModerationDashboard';

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

  const renderUserItem = useCallback(
    ({ item }: { item: UserModerationInfo }) => (
      <UserModerationItem user={item} onAction={onAction} />
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

  if (!loading && users.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-20">
        <OptimizedIcon name="people" size={64} className="text-blue-500 mb-4" />
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

export default UserManagementView;
