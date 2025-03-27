import React, { useState, useEffect } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, isToday, parseISO } from 'date-fns';
import supabase from '../../lib/supabase';
import { useAuth } from '../../lib/contexts/AuthProvider';
import { useTheme } from '../../lib/contexts/ThemeContext';
import { useNotifications, TaskNotificationParams } from '../../lib/contexts/NotificationContext';
import ThemedView from '../../components/ui/ThemedView';
import ThemedText from '../../components/ui/ThemedText';
import { isExpoGo } from '../../lib/config';
import useWatermelon from '../../lib/hooks/useWatermelon';
import { Q } from '@nozbe/watermelondb';
import { PlantTask } from '../../lib/models/PlantTask';
import { Database } from '@nozbe/watermelondb';

// Types for plant tasks
interface PlantTaskData {
  id: string;
  taskId: string;
  plantId: string;
  plantName: string; // Will be joined from plants
  taskType: 'water' | 'feed' | 'prune' | 'transplant' | 'harvest' | 'other';
  title: string;
  description: string | null;
  dueDate: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  notificationId?: string | null;
}

export default function CalendarScreen() {
  const { theme, isDarkMode } = useTheme();
  const { session } = useAuth();
  const { 
    isNotificationsEnabled, 
    requestPermissions, 
    scheduleTaskNotification, 
    cancelTaskNotification 
  } = useNotifications();
  const { plantTasks, plants, sync, isSyncing } = useWatermelon();
  
  const [tasks, setTasks] = useState<PlantTaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Fetch tasks from WatermelonDB
  const fetchTasks = async () => {
    try {
      if (!session?.user) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      // Format dates for query
      const startDate = format(selectedDate, 'yyyy-MM-dd');
      const endDate = format(addDays(selectedDate, 1), 'yyyy-MM-dd');
      
      // Query tasks for the selected date that are pending
      const tasksRecords = await plantTasks.query(
        Q.and(
          Q.where('status', 'pending'),
          Q.where('due_date', startDate),
          Q.where('user_id', session.user.id)
        )
      ).fetch();
      
      // We need to get the plant names, so let's fetch related plants
      const plantIds = tasksRecords.map(task => task.plantId);
      
      // Get unique plant IDs
      const uniquePlantIds = [...new Set(plantIds)];
      
      // Fetch plants info if there are any plant IDs
      let plantsMap: {[key: string]: string} = {};
      
      if (uniquePlantIds.length > 0) {
        const plantsRecords = await plants.query(
          Q.where('plant_id', Q.oneOf(uniquePlantIds as string[]))
        ).fetch();
        
        // Create a map of plantId to plantName
        plantsMap = plantsRecords.reduce((acc, plant) => {
          acc[plant.plantId] = plant.name;
          return acc;
        }, {} as {[key: string]: string});
      }
      
      // Map tasks to the format expected by the UI
      const tasksData: PlantTaskData[] = tasksRecords.map((task: PlantTask) => ({
        id: task.id,
        taskId: task.taskId,
        plantId: task.plantId,
        plantName: plantsMap[task.plantId] || 'Unknown Plant',
        taskType: task.taskType as 'water' | 'feed' | 'prune' | 'transplant' | 'harvest' | 'other',
        title: task.title,
        description: task.description || null,
        dueDate: task.dueDate,
        status: task.status,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        notificationId: task.notificationId
      }));
      
      // Sort tasks (if needed)
      tasksData.sort((a, b) => 
        a.plantName.localeCompare(b.plantName) || 
        a.title.localeCompare(b.title)
      );
      
      setTasks(tasksData);
      
      // Schedule notifications for tasks that don't have them yet
      if (isNotificationsEnabled) {
        tasksData.forEach((task: PlantTaskData) => {
          if (!task.notificationId) {
            scheduleNotificationForTask(task);
          }
        });
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Schedule notification for a task
  const scheduleNotificationForTask = async (task: PlantTaskData) => {
    try {
      if (!isNotificationsEnabled) {
        const permissionGranted = await requestPermissions();
        if (!permissionGranted) return;
      }

      const notificationParams: TaskNotificationParams = {
        taskId: task.id,
        plantId: task.plantId,
        plantName: task.plantName,
        taskType: task.taskType,
        taskTitle: task.title,
        dueDate: parseISO(task.dueDate)
      };

      const notificationId = await scheduleTaskNotification(notificationParams);
      
      if (notificationId && task.id) {
        // Update the task with the notification ID in WatermelonDB
        try {
          const taskRecord = await plantTasks.find(task.id);
          
          await taskRecord.database.write(async () => {
            await taskRecord.update((t: any) => {
              t.notificationId = notificationId;
            });
          });
        } catch (error) {
          console.error('Error updating task with notification ID:', error);
        }
        
        // Also update the Supabase database if not in Expo Go
        if (!isExpoGo) {
          const { error } = await supabase
            .from('plant_tasks')
            .update({ notification_id: notificationId })
            .eq('id', task.id);
            
          if (error) {
            console.error('Error updating task with notification ID in Supabase:', error);
          }
        }
      }
    } catch (err) {
      console.error('Error scheduling notification for task:', err);
    }
  };

  // Mark task as completed
  const markTaskAsCompleted = async (taskId: string) => {
    try {
      setLoading(true);
      
      // Find the task to get its notification ID
      const task = tasks.find(t => t.id === taskId);
      
      if (task?.notificationId) {
        // Cancel the notification
        await cancelTaskNotification(taskId);
      }
      
      // Update the task status in WatermelonDB
      try {
        const taskRecord = await plantTasks.find(taskId);
        
        await taskRecord.database.write(async () => {
          await taskRecord.update((t: any) => {
            t.status = 'completed';
          });
        });
        
        // Sync with Supabase
        await sync();
        
        // Refresh the task list
        await fetchTasks();
      } catch (error) {
        console.error('Error updating task status in WatermelonDB:', error);
        throw error;
      }
      
    } catch (err) {
      console.error('Error marking task as completed:', err);
      Alert.alert('Error', 'Failed to update task status');
    } finally {
      setLoading(false);
    }
  };

  // Refresh the tasks list
  const handleRefresh = async () => {
    setRefreshing(true);
    
    // Sync with Supabase
    await sync();
    
    // Fetch updated tasks
    await fetchTasks();
  };

  // Navigate to the plant detail page
  const navigateToPlant = (plantId: string) => {
    router.push(`/plant/${plantId}`);
  };

  // Load tasks on mount and when selected date changes
  useEffect(() => {
    fetchTasks();
  }, [selectedDate]);

  const renderDateSelector = () => {
    const dates = [];
    for (let i = -3; i <= 3; i++) {
      const date = addDays(new Date(), i);
      dates.push(date);
    }

    return (
      <View className="flex-row">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {dates.map((date, index) => {
            const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            const currentDate = isToday(date);
            
            return (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedDate(date)}
                className={`items-center justify-center mx-2 w-16 h-16 rounded-full ${
                  isSelected
                    ? 'bg-green-600'
                    : currentDate
                    ? 'bg-green-100 dark:bg-green-900'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                <ThemedText
                  className={`text-xs ${
                    isSelected
                      ? 'text-white'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {format(date, 'E')}
                </ThemedText>
                <ThemedText
                  className={`text-lg font-bold ${
                    isSelected
                      ? 'text-white'
                      : currentDate
                      ? 'text-green-700 dark:text-green-500'
                      : 'text-gray-800 dark:text-gray-300'
                  }`}
                >
                  {format(date, 'd')}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderTaskItem = ({ item }: { item: PlantTaskData }) => {
    return (
      <ThemedView className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-4 overflow-hidden">
        <View className="flex-row p-4">
          {/* Task type icon */}
          <View
            className={`mr-4 h-12 w-12 rounded-full items-center justify-center ${
              item.taskType === 'water'
                ? 'bg-blue-100 dark:bg-blue-900'
                : item.taskType === 'feed'
                ? 'bg-yellow-100 dark:bg-yellow-900'
                : item.taskType === 'prune'
                ? 'bg-green-100 dark:bg-green-900'
                : item.taskType === 'transplant'
                ? 'bg-purple-100 dark:bg-purple-900'
                : item.taskType === 'harvest'
                ? 'bg-red-100 dark:bg-red-900'
                : 'bg-gray-100 dark:bg-gray-700'
            }`}
          >
            <Ionicons
              name={
                item.taskType === 'water'
                  ? 'water'
                  : item.taskType === 'feed'
                  ? 'nutrition'
                  : item.taskType === 'prune'
                  ? 'cut'
                  : item.taskType === 'transplant'
                  ? 'swap-horizontal'
                  : item.taskType === 'harvest'
                  ? 'basket'
                  : 'calendar'
              }
              size={24}
              color={
                item.taskType === 'water'
                  ? '#3b82f6'
                  : item.taskType === 'feed'
                  ? '#f59e0b'
                  : item.taskType === 'prune'
                  ? '#10b981'
                  : item.taskType === 'transplant'
                  ? '#8b5cf6'
                  : item.taskType === 'harvest'
                  ? '#ef4444'
                  : '#6b7280'
              }
            />
          </View>

          {/* Task details */}
          <View className="flex-1">
            <ThemedText className="font-bold text-lg mb-1">
              {item.title}
            </ThemedText>
            
            <TouchableOpacity
              onPress={() => navigateToPlant(item.plantId)}
              className="flex-row items-center mb-1"
            >
              <Ionicons
                name="leaf"
                size={14}
                color={isDarkMode ? '#10b981' : '#047857'}
              />
              <ThemedText className="text-green-700 dark:text-green-500 ml-1 text-sm">
                {item.plantName}
              </ThemedText>
            </TouchableOpacity>
            
            {item.description && (
              <ThemedText className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                {item.description}
              </ThemedText>
            )}
            
            <View className="flex-row items-center">
              <Ionicons
                name="time-outline"
                size={14}
                color={isDarkMode ? '#d1d5db' : '#6b7280'}
              />
              <ThemedText className="text-gray-500 dark:text-gray-400 ml-1 text-xs">
                {format(parseISO(item.dueDate), 'h:mm a')}
              </ThemedText>
            </View>
          </View>

          {/* Complete button */}
          <TouchableOpacity
            onPress={() => markTaskAsCompleted(item.id)}
            className="self-center ml-2 bg-green-100 dark:bg-green-900 h-10 w-10 rounded-full items-center justify-center"
          >
            <Ionicons
              name="checkmark"
              size={24}
              color={isDarkMode ? '#10b981' : '#047857'}
            />
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ThemedView className="px-4 pt-2 pb-4">
        <ThemedText className="text-2xl font-bold mb-4">Calendar</ThemedText>
        {renderDateSelector()}
      </ThemedView>

      {error ? (
        <View className="flex-1 justify-center items-center px-4">
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={isDarkMode ? '#f87171' : '#ef4444'}
          />
          <ThemedText className="mt-2 text-center text-gray-600 dark:text-gray-400">
            {error}
          </ThemedText>
          <TouchableOpacity
            onPress={handleRefresh}
            className="mt-4 bg-green-600 py-2 px-4 rounded-lg"
          >
            <ThemedText className="text-white font-medium">Try Again</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTaskItem}
          contentContainerClassName="px-4 pb-4"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#16a34a']}
              tintColor={isDarkMode ? '#16a34a' : '#16a34a'}
            />
          }
          ListEmptyComponent={
            loading ? (
              <View className="flex-1 justify-center items-center py-12">
                <ActivityIndicator size="large" color="#16a34a" />
              </View>
            ) : (
              <View className="flex-1 justify-center items-center py-12">
                <Ionicons
                  name="calendar-outline"
                  size={48}
                  color={isDarkMode ? '#9ca3af' : '#6b7280'}
                />
                <ThemedText className="mt-2 text-center text-gray-600 dark:text-gray-400">
                  No tasks scheduled for {format(selectedDate, 'MMMM d, yyyy')}
                </ThemedText>
                <TouchableOpacity
                  onPress={() => router.push('/plant/task/add')}
                  className="mt-4 flex-row items-center bg-green-600 py-2 px-4 rounded-lg"
                >
                  <Ionicons name="add" size={16} color="white" />
                  <ThemedText className="ml-1 text-white font-medium">
                    Add New Task
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}
