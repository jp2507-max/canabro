import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useSafeRouter } from '@/lib/hooks/useSafeRouter';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import EnhancedKeyboardWrapper from '../../../../components/keyboard/EnhancedKeyboardWrapper';

import { useAuth } from '../../../../lib/contexts/AuthProvider';
import { useTranslation } from 'react-i18next';

interface TaskFormData {
  title: string;
  description: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high';
  category: 'watering' | 'feeding' | 'pruning' | 'inspection' | 'other';
}

export default function AddTaskScreen() {
  const { t } = useTranslation();
  const router = useSafeRouter();
  const { selectedDate } = useLocalSearchParams<{ selectedDate?: string }>();
  const { session: _session } = useAuth();

  // Validate and create a safe date
  const createValidDate = (dateString?: string): Date => {
    if (!dateString) {
      return new Date();
    }

    try {
      const parsedDate = new Date(dateString);

      // Check if the date is valid
      if (isNaN(parsedDate.getTime())) {
        console.warn('Invalid selectedDate provided, using current date:', dateString);
        return new Date();
      }

      return parsedDate;
    } catch (error) {
      console.warn('Error parsing selectedDate, using current date:', dateString, error);
      return new Date();
    }
  };

  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    dueDate: createValidDate(selectedDate),
    priority: 'medium',
    category: 'other',
  });

  const handleSave = async () => {
    if (!formData.title.trim()) {
      return; // Basic validation
    }

    // TODO: Implement task creation logic with database
    console.log('Creating task:', formData);

    // Navigate back to calendar
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <EnhancedKeyboardWrapper className="flex-1" showToolbar={false}>
        <ScrollView className="flex-1 px-4 py-6">
          <View className="space-y-6">
            {/* Task Title */}
            <View>
              <Text className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                {t('calendar.add_task.title', 'Task Title')}
              </Text>
              <TextInput
                className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder={t('calendar.add_task.title_placeholder', 'Enter task title')}
                placeholderTextColor="#9CA3AF"
                value={formData.title}
                onChangeText={(title) => setFormData((prev) => ({ ...prev, title }))}
              />
            </View>

            {/* Description */}
            <View>
              <Text className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                {t('calendar.add_task.description', 'Description (Optional)')}
              </Text>
              <TextInput
                className="h-24 rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder={t('calendar.add_task.description_placeholder', 'Add task details...')}
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                value={formData.description}
                onChangeText={(description) => setFormData((prev) => ({ ...prev, description }))}
              />
            </View>

            {/* Priority Selection */}
            <View>
              <Text className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                {t('calendar.add_task.priority', 'Priority')}
              </Text>
              <View className="flex-row space-x-3">
                {(['low', 'medium', 'high'] as const).map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    className={`flex-1 rounded-lg border py-3 ${
                      formData.priority === priority
                        ? 'border-green-500 bg-green-500'
                        : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'
                    }`}
                    onPress={() => setFormData((prev) => ({ ...prev, priority }))}>
                    <Text
                      className={`text-center font-medium capitalize ${
                        formData.priority === priority
                          ? 'text-white'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                      {t(`calendar.add_task.priority_levels.${priority}`, priority)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Category Selection */}
            <View>
              <Text className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                {t('calendar.add_task.category', 'Category')}
              </Text>
              <View className="space-y-2">
                {(['watering', 'feeding', 'pruning', 'inspection', 'other'] as const).map(
                  (category) => (
                    <TouchableOpacity
                      key={category}
                      className={`rounded-lg border px-4 py-3 ${
                        formData.category === category
                          ? 'border-green-500 bg-green-500'
                          : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'
                      }`}
                      onPress={() => setFormData((prev) => ({ ...prev, category }))}>
                      <Text
                        className={`font-medium capitalize ${
                          formData.category === category
                            ? 'text-white'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                        {t(`calendar.add_task.categories.${category}`, category)}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View className="border-t border-gray-200 px-4 py-6 dark:border-gray-700">
          <View className="flex-row space-x-3">
            <TouchableOpacity
              className="flex-1 rounded-lg bg-gray-200 py-4 dark:bg-gray-700"
              onPress={handleCancel}>
              <Text className="text-center font-semibold text-gray-900 dark:text-white">{t('calendar.add_task.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 rounded-lg py-4 ${
                formData.title.trim() ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
              onPress={handleSave}
              disabled={!formData.title.trim()}>
              <Text className="text-center font-semibold text-white">{t('calendar.add_task.save_task', 'Save Task')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </EnhancedKeyboardWrapper>
    </SafeAreaView>
  );
}
