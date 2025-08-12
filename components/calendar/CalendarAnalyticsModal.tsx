import React from 'react';
import { Modal, View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { TaskAnalyticsChart } from '@/components/task-management/TaskAnalyticsChart';

interface CalendarAnalyticsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CalendarAnalyticsModal: React.FC<CalendarAnalyticsModalProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ThemedView className="flex-1 bg-white dark:bg-neutral-900 pt-safe h-screen-safe">
        {/* Header */}
        <View className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex-row items-center justify-between">
          <ThemedText className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {t('calendar.analytics.title', 'Calendar Analytics')}
          </ThemedText>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('calendar.analytics.close', 'Close')}
            className="px-3 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800"
          >
            <ThemedText className="text-sm text-neutral-700 dark:text-neutral-300">
              {t('common.close', 'Close')}
            </ThemedText>
          </Pressable>
        </View>

        {/* Content */}
        <ThemedView className="flex-1 p-4">
          <TaskAnalyticsChart className="flex-1" />
        </ThemedView>
      </ThemedView>
    </Modal>
  );
};

export default CalendarAnalyticsModal;


