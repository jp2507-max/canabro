import React from 'react';
import { View, Button } from 'react-native';
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
      <Button title="Add Reminder" onPress={handleAddReminder} />
    </View>
  );
};

export default CareRemindersExample;
