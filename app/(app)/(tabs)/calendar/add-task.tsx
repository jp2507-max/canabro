import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../../../lib/contexts/AuthProvider';

interface TaskFormData {
  title: string;
  description: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high';
  category: 'watering' | 'feeding' | 'pruning' | 'inspection' | 'other';
}

export default function AddTaskScreen() {
  const router = useRouter();
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
      <ScrollView className="flex-1 px-4 py-6">
        <View className="space-y-6">
          {/* Task Title */}
          <View>
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Task Title
            </Text>
            <TextInput
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
              placeholder="Enter task title"
              placeholderTextColor="#9CA3AF"
              value={formData.title}
              onChangeText={(title) => setFormData(prev => ({ ...prev, title }))}
            />
          </View>

          {/* Description */}
          <View>
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Description (Optional)
            </Text>
            <TextInput
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 h-24"
              placeholder="Add task details..."
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              value={formData.description}
              onChangeText={(description) => setFormData(prev => ({ ...prev, description }))}
            />
          </View>

          {/* Priority Selection */}
          <View>
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Priority
            </Text>
            <View className="flex-row space-x-3">
              {(['low', 'medium', 'high'] as const).map((priority) => (
                <TouchableOpacity
                  key={priority}
                  className={`flex-1 py-3 rounded-lg border ${
                    formData.priority === priority
                      ? 'bg-green-500 border-green-500'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                  }`}
                  onPress={() => setFormData(prev => ({ ...prev, priority }))}
                >
                  <Text
                    className={`text-center font-medium capitalize ${
                      formData.priority === priority
                        ? 'text-white'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {priority}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Category Selection */}
          <View>
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Category
            </Text>
            <View className="space-y-2">
              {(['watering', 'feeding', 'pruning', 'inspection', 'other'] as const).map((category) => (
                <TouchableOpacity
                  key={category}
                  className={`py-3 px-4 rounded-lg border ${
                    formData.category === category
                      ? 'bg-green-500 border-green-500'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                  }`}
                  onPress={() => setFormData(prev => ({ ...prev, category }))}
                >
                  <Text
                    className={`font-medium capitalize ${
                      formData.category === category
                        ? 'text-white'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View className="px-4 py-6 border-t border-gray-200 dark:border-gray-700">
        <View className="flex-row space-x-3">
          <TouchableOpacity
            className="flex-1 py-4 rounded-lg bg-gray-200 dark:bg-gray-700"
            onPress={handleCancel}
          >
            <Text className="text-center font-semibold text-gray-900 dark:text-white">
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-4 rounded-lg ${
              formData.title.trim()
                ? 'bg-green-500'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
            onPress={handleSave}
            disabled={!formData.title.trim()}
          >
            <Text className="text-center font-semibold text-white">
              Save Task
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
