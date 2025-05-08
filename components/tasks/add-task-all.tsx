import { Ionicons } from '@expo/vector-icons';
import { Database } from '@nozbe/watermelondb';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ThemedText from '../../../components/ui/ThemedText';
import ThemedView from '../../../components/ui/ThemedView';
import { useTheme } from '../../../lib/contexts/ThemeContext';
import useWatermelon from '../../../lib/hooks/useWatermelon';
import { PlantTask } from '../../../lib/models/PlantTask';

// Task type definitions
const TASK_TYPES = [
  {
    id: 'watering',
    name: 'Watering',
    icon: 'water-outline',
    color: '#3b82f6',
  },
  {
    id: 'feeding',
    name: 'Feeding',
    icon: 'leaf-outline',
    color: '#8b5cf6',
  },
  {
    id: 'pruning',
    name: 'Pruning',
    icon: 'cut-outline',
    color: '#10b981',
  },
  {
    id: 'harvesting',
    name: 'Harvesting',
    icon: 'basket-outline',
    color: '#f59e0b',
  },
];

export default function AddTaskToAllPlantsScreen() {
  const { theme, isDarkMode } = useTheme();
  const router = useRouter();
  const { database } = useWatermelon();
  
  const [selectedTaskType, setSelectedTaskType] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle adding tasks to all plants
  const handleAddTaskToAllPlants = async () => {
    if (!selectedTaskType || !taskTitle) {
      Alert.alert('Required Fields', 'Please select a task type and enter a title');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Get all plants
      const plantsCollection = database.get('plants');
      const allPlants = await plantsCollection.query().fetch();
      
      if (allPlants.length === 0) {
        Alert.alert('No Plants', 'You need to add plants before creating tasks for them');
        setIsSubmitting(false);
        return;
      }
      
      // Create tasks for all plants
      await database.write(async () => {
        const tasksCollection = database.get<PlantTask>('plant_tasks');
        const taskCreationPromises = allPlants.map(plant => 
          tasksCollection.create((task) => {
            task.taskId = `task-${Date.now()}-${plant.id}`;
            task.plantId = plant.id;
            task.title = taskTitle;
            task.description = taskDescription;
            task.taskType = selectedTaskType;
            task.dueDate = dueDate.toISOString();
            task.status = 'pending';
            // Generate a user ID (should be from auth context in real app)
            task.userId = 'current-user';
          })
        );
        
        await Promise.all(taskCreationPromises);
      });
      
      Alert.alert(
        'Success',
        `Task added to all ${allPlants.length} plants`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error adding tasks:', error);
      Alert.alert('Error', 'Failed to add tasks');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-black">
      <ThemedView className="flex-1 px-4">
        {/* Header */}
        <View className="flex-row items-center justify-between py-4">
          <TouchableOpacity 
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color={isDarkMode ? theme.colors.neutral[300] : theme.colors.neutral[700]} 
            />
          </TouchableOpacity>
          <ThemedText 
            className="text-xl font-bold"
            lightClassName="text-neutral-800"
            darkClassName="text-white"
          >
            Add Task to All Plants
          </ThemedText>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView 
          className="flex-1"
          showsVerticalScrollIndicator={false}
        >
          {/* Task Type Section */}
          <View className="mb-6">
            <ThemedText 
              className="mb-2 text-base font-medium"
              lightClassName="text-neutral-700"
              darkClassName="text-neutral-300"
            >
              Task Type
            </ThemedText>
            
            <View className="flex-row flex-wrap">
              {TASK_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  className={`mr-2 mb-2 flex-row items-center rounded-full px-4 py-2 ${
                    selectedTaskType === type.id 
                      ? '' 
                      : isDarkMode 
                        ? 'bg-neutral-800' 
                        : 'bg-neutral-200'
                  }`}
                  style={{ 
                    backgroundColor: selectedTaskType === type.id ? type.color : undefined
                  }}
                  onPress={() => setSelectedTaskType(type.id)}
                >
                  <Ionicons 
                    name={type.icon as any} 
                    size={16} 
                    color={
                      selectedTaskType === type.id 
                        ? 'white' 
                        : isDarkMode 
                          ? theme.colors.neutral[300] 
                          : theme.colors.neutral[700]
                    } 
                    style={{ marginRight: 6 }}
                  />
                  <ThemedText
                    className="text-sm"
                    lightClassName={selectedTaskType === type.id ? 'text-white' : 'text-neutral-700'}
                    darkClassName={selectedTaskType === type.id ? 'text-white' : 'text-neutral-300'}
                  >
                    {type.name}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Task Details Form */}
          <View className="mb-6">
            <ThemedText 
              className="mb-2 text-base font-medium"
              lightClassName="text-neutral-700"
              darkClassName="text-neutral-300"
            >
              Task Details
            </ThemedText>
            
            {/* Task Title Input */}
            <View 
              className="mb-4 rounded-xl px-4 py-3"
              style={{ 
                backgroundColor: isDarkMode ? theme.colors.neutral[800] : theme.colors.neutral[100] 
              }}
            >
              <ThemedText 
                className="mb-1 text-xs"
                lightClassName="text-neutral-500"
                darkClassName="text-neutral-400"
              >
                Title
              </ThemedText>
              <TextInput
                value={taskTitle}
                onChangeText={setTaskTitle}
                placeholder="Enter task title"
                placeholderTextColor={isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]}
                className="text-base"
                style={{ 
                  color: isDarkMode ? theme.colors.neutral[200] : theme.colors.neutral[800] 
                }}
              />
            </View>
            
            {/* Task Description Input */}
            <View 
              className="mb-4 rounded-xl px-4 py-3"
              style={{ 
                backgroundColor: isDarkMode ? theme.colors.neutral[800] : theme.colors.neutral[100] 
              }}
            >
              <ThemedText 
                className="mb-1 text-xs"
                lightClassName="text-neutral-500"
                darkClassName="text-neutral-400"
              >
                Description (Optional)
              </ThemedText>
              <TextInput
                value={taskDescription}
                onChangeText={setTaskDescription}
                placeholder="Enter task description"
                placeholderTextColor={isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]}
                className="text-base"
                multiline
                numberOfLines={3}
                style={{ 
                  color: isDarkMode ? theme.colors.neutral[200] : theme.colors.neutral[800],
                  textAlignVertical: 'top'
                }}
              />
            </View>

            {/* Due Date Selector */}
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="flex-row items-center justify-between rounded-xl px-4 py-3"
              style={{ 
                backgroundColor: isDarkMode ? theme.colors.neutral[800] : theme.colors.neutral[100] 
              }}
            >
              <View>
                <ThemedText 
                  className="mb-1 text-xs"
                  lightClassName="text-neutral-500"
                  darkClassName="text-neutral-400"
                >
                  Due Date
                </ThemedText>
                <ThemedText
                  className="text-base"
                  lightClassName="text-neutral-800"
                  darkClassName="text-neutral-200"
                >
                  {formatDate(dueDate)}
                </ThemedText>
              </View>
              <Ionicons 
                name="calendar-outline" 
                size={20} 
                color={isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[500]} 
              />
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={dueDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  const currentDate = selectedDate || dueDate;
                  setShowDatePicker(false);
                  setDueDate(currentDate);
                }}
              />
            )}
          </View>
        </ScrollView>

        {/* Bottom Action Button */}
        <View className="py-4">
          <TouchableOpacity
            className="items-center justify-center rounded-full py-3"
            style={{ backgroundColor: theme.colors.primary[500] }}
            onPress={handleAddTaskToAllPlants}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <ThemedText
                className="text-base font-medium"
                lightClassName="text-white"
                darkClassName="text-white"
              >
                Add Task to All Plants
              </ThemedText>
            )}
          </TouchableOpacity>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}