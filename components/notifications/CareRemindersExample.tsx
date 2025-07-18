import React from 'react';
import { View, Pressable } from 'react-native';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import CareReminders from './CareReminders';
import type { Plant } from '@/lib/models/Plant';

interface CareRemindersExampleProps {
  plant?: Plant;
}

const CareRemindersExample: React.FC<CareRemindersExampleProps> = ({ plant }) => {
  const handleAddReminder = () => {
    // TODO: Implement add reminder logic or navigation
  };

  return (
    <View className="flex-1 pt-safe h-screen-safe">
      <CareReminders plantId={plant?.id} />
      <ThemedView className="mt-4 rounded-lg bg-primary px-4 py-2">
        <Pressable
          onPress={handleAddReminder}
          accessibilityRole="button"
          accessibilityLabel="Add Reminder"
        >
          <ThemedView className="flex-row items-center justify-center">
            <OptimizedIcon name="add" size={20} color="text-onPrimary" className="mr-2" />
            <ThemedText className="text-onPrimary font-semibold text-base">Add Reminder</ThemedText>
          </ThemedView>
        </Pressable>
      </ThemedView>
    </View>
  );
};

export default CareRemindersExample;
