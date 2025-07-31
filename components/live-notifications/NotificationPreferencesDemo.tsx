import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import NotificationPreferences from './NotificationPreferences';
import { useNotificationPreferences } from '@/lib/hooks/useNotificationPreferences';
import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';

/**
 * Demo screen for testing the NotificationPreferences component
 * This can be used for development and testing purposes
 */
const NotificationPreferencesDemo: React.FC = () => {
  const {
    preferences,
    isLoading,
    error,
    updatePreferences,
  } = useNotificationPreferences();

  const handleSave = async () => {
    // The preferences are automatically saved when updated
    // This is just for demonstration of the save callback
    console.log('Preferences saved:', preferences);
  };

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
        <ThemedView className="flex-1 justify-center items-center p-4">
          <ThemedText variant="heading" className="text-xl mb-2">
            Error Loading Preferences
          </ThemedText>
          <ThemedText variant="muted" className="text-center">
            {error}
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <NotificationPreferences
      preferences={preferences}
      onPreferencesChange={updatePreferences}
      onSave={handleSave}
      isLoading={isLoading}
    />
  );
};

export default NotificationPreferencesDemo;