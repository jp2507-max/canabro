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
import { isExpoGo, authConfig } from '../../lib/config';

// Types for plant tasks
interface PlantTask {
  id: string;
  plant_id: string;
  plant_name: string; // Joined from plants table
  task_type: 'water' | 'feed' | 'prune' | 'transplant' | 'harvest' | 'other';
  title: string;
  description: string | null;
  due_date: string;
  status: 'pending' | 'completed' | 'skipped';
  created_at: string;
  updated_at: string;
  notification_id?: string | null;
}

// Mock data for development
const MOCK_TASKS: PlantTask[] = [
  {
    id: '1',
    plant_id: '1',
    plant_name: 'Northern Lights',
    task_type: 'water',
    title: 'Water plant',
    description: 'Water until runoff appears at the bottom',
    due_date: new Date().toISOString(),
    status: 'pending',
    created_at: new Date(2024, 2, 15).toISOString(),
    updated_at: new Date(2024, 3, 1).toISOString()
  },
  {
    id: '2',
    plant_id: '2',
    plant_name: 'Blue Dream',
    task_type: 'feed',
    title: 'Apply nutrients',
    description: 'Use half-strength bloom nutrients',
    due_date: new Date().toISOString(),
    status: 'pending',
    created_at: new Date(2024, 1, 10).toISOString(),
    updated_at: new Date(2024, 2, 28).toISOString()
  },
  {
    id: '3',
    plant_id: '3',
    plant_name: 'Girl Scout Cookies',
    task_type: 'prune',
    title: 'Remove lower leaves',
    description: 'Remove yellowing and dying leaves',
    due_date: addDays(new Date(), 1).toISOString(),
    status: 'pending',
    created_at: new Date(2024, 3, 1).toISOString(),
    updated_at: new Date(2024, 3, 10).toISOString()
  }
];

export default function CalendarScreen() {
  const { theme, isDarkMode } = useTheme();
  const { session } = useAuth();
  const { 
    isNotificationsEnabled, 
    requestPermissions, 
    scheduleTaskNotification, 
    cancelTaskNotification 
  } = useNotifications();
  const [tasks, setTasks] = useState<PlantTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Fetch tasks from Supabase or use mock data in dev mode
  const fetchTasks = async () => {
    try {
      // Use mock data if in Expo Go with dev bypass enabled
      if (isExpoGo && authConfig.forceDevBypass) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        setTasks(MOCK_TASKS);
        setError(null);
        return;
      }

      if (!session?.user) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      // Query tasks with plant information
      const { data, error: queryError } = await supabase
        .from('plant_tasks')
        .select(`
          *,
          plants:plant_id (name)
        `)
        .eq('status', 'pending')
        .gte('due_date', format(selectedDate, 'yyyy-MM-dd'))
        .lt('due_date', format(addDays(selectedDate, 1), 'yyyy-MM-dd'))
        .order('due_date', { ascending: true });

      if (queryError) {
        throw queryError;
      }

      // Format the data to include plant_name from the join
      const formattedTasks = data?.map(task => ({
        ...task,
        plant_name: task.plants?.name || 'Unknown Plant'
      })) || [];

      setTasks(formattedTasks);
      
      // Schedule notifications for tasks that don't have them yet
      if (isNotificationsEnabled) {
        formattedTasks.forEach(task => {
          if (!task.notification_id) {
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
  const scheduleNotificationForTask = async (task: PlantTask) => {
    try {
      if (!isNotificationsEnabled) {
        const permissionGranted = await requestPermissions();
        if (!permissionGranted) return;
      }

      const notificationParams: TaskNotificationParams = {
        taskId: task.id,
        plantId: task.plant_id,
        plantName: task.plant_name,
        taskType: task.task_type,
        taskTitle: task.title,
        dueDate: parseISO(task.due_date)
      };

      const notificationId = await scheduleTaskNotification(notificationParams);
      
      if (notificationId) {
        // Update the task with the notification ID
        const { error } = await supabase
          .from('plant_tasks')
          .update({ notification_id: notificationId })
          .eq('id', task.id);
          
        if (error) {
          console.error('Error updating task with notification ID:', error);
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
      
      if (task?.notification_id) {
        // Cancel the notification
        await cancelTaskNotification(taskId);
      }
      
      // Update the task status
      const { error } = await supabase
        .from('plant_tasks')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);
        
      if (error) {
        throw error;
      }
      
      // Refresh the task list
      await fetchTasks();
      
    } catch (err) {
      console.error('Error marking task as completed:', err);
      Alert.alert('Error', 'Failed to update task status');
    } finally {
      setLoading(false);
    }
  };

  // Refresh the tasks list
  const onRefresh = async () => {
    setRefreshing(true);
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

  const renderTaskItem = ({ item }: { item: PlantTask }) => {
    return (
      <ThemedView className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-4 overflow-hidden">
        <View className="flex-row p-4">
          {/* Task type icon */}
          <View
            className={`mr-4 h-12 w-12 rounded-full items-center justify-center ${
              item.task_type === 'water'
                ? 'bg-blue-100 dark:bg-blue-900'
                : item.task_type === 'feed'
                ? 'bg-yellow-100 dark:bg-yellow-900'
                : item.task_type === 'prune'
                ? 'bg-green-100 dark:bg-green-900'
                : item.task_type === 'transplant'
                ? 'bg-purple-100 dark:bg-purple-900'
                : item.task_type === 'harvest'
                ? 'bg-red-100 dark:bg-red-900'
                : 'bg-gray-100 dark:bg-gray-700'
            }`}
          >
            <Ionicons
              name={
                item.task_type === 'water'
                  ? 'water'
                  : item.task_type === 'feed'
                  ? 'nutrition'
                  : item.task_type === 'prune'
                  ? 'cut'
                  : item.task_type === 'transplant'
                  ? 'swap-horizontal'
                  : item.task_type === 'harvest'
                  ? 'basket'
                  : 'calendar'
              }
              size={24}
              color={
                item.task_type === 'water'
                  ? '#3b82f6'
                  : item.task_type === 'feed'
                  ? '#f59e0b'
                  : item.task_type === 'prune'
                  ? '#10b981'
                  : item.task_type === 'transplant'
                  ? '#8b5cf6'
                  : item.task_type === 'harvest'
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
              onPress={() => navigateToPlant(item.plant_id)}
              className="flex-row items-center mb-1"
            >
              <Ionicons
                name="leaf"
                size={14}
                color={isDarkMode ? '#10b981' : '#047857'}
              />
              <ThemedText className="text-green-700 dark:text-green-500 ml-1 text-sm">
                {item.plant_name}
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
                {format(parseISO(item.due_date), 'h:mm a')}
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
            onPress={fetchTasks}
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
              onRefresh={onRefresh}
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
