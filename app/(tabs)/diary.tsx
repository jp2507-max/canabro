import React, { useState, useEffect } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View, TouchableOpacity, Alert } from 'react-native';
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
      fetchTasks();
      
      // Show success message
      Alert.alert('Success', 'Task marked as completed!');
    } catch (err) {
      console.error('Error marking task as completed:', err);
      Alert.alert('Error', 'Failed to mark task as completed');
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchTasks();
  }, [session, selectedDate]);

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  // Navigate to plant detail screen
  const handleTaskPress = (plantId: string) => {
    router.push(`/plant/${plantId}`);
  };

  // Render a date selector
  const renderDateSelector = () => {
    const dates = Array(7).fill(0).map((_, i) => addDays(new Date(), i));
    
    return (
      <View className="flex-row py-4">
        <FlatList
          horizontal
          data={dates}
          keyExtractor={(item) => item.toISOString()}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = format(selectedDate, 'yyyy-MM-dd') === format(item, 'yyyy-MM-dd');
            return (
              <Pressable
                className={`mx-2 py-2 px-4 rounded-full ${isSelected ? 'bg-primary-500' : ''}`}
                onPress={() => setSelectedDate(item)}
              >
                <ThemedText 
                  className={`text-center ${isSelected ? 'text-white' : ''}`}
                >
                  {isToday(item) ? 'Today' : format(item, 'E, MMM d')}
                </ThemedText>
              </Pressable>
            );
          }}
        />
      </View>
    );
  };

  // Render a task card
  const renderTaskCard = ({ item }: { item: PlantTask }) => {
    // Get task icon based on type
    const getTaskIcon = (type: string) => {
      switch (type) {
        case 'water':
          return 'water-outline';
        case 'feed':
          return 'flask-outline';
        case 'prune':
          return 'cut-outline';
        case 'transplant':
          return 'leaf-outline';
        case 'harvest':
          return 'basket-outline';
        default:
          return 'calendar-outline';
      }
    };

    // Get task color based on type
    const getTaskColor = (type: string) => {
      switch (type) {
        case 'water':
          return theme.colors.special.watering;
        case 'feed':
          return theme.colors.special.feeding;
        case 'prune':
          return theme.colors.primary[500];
        case 'transplant':
          return theme.colors.status.warning;
        case 'harvest':
          return theme.colors.special.harvesting;
        default:
          return theme.colors.neutral[400];
      }
    };

    return (
      <Pressable onPress={() => handleTaskPress(item.plant_id)}>
        <ThemedView 
          className="mb-4 rounded-2xl overflow-hidden"
          lightClassName="bg-white" 
          darkClassName="bg-neutral-100"
          style={{ ...theme.shadows.md }}
        >
          <View className="p-4 flex-row">
            {/* Task icon */}
            <View 
              className="w-12 h-12 rounded-full justify-center items-center mr-4"
              style={{ backgroundColor: `${getTaskColor(item.task_type)}20` }}
            >
              <Ionicons 
                name={getTaskIcon(item.task_type)} 
                size={24} 
                color={getTaskColor(item.task_type)} 
              />
            </View>
            
            <View className="flex-1">
              {/* Title and plant name */}
              <ThemedText className="text-lg font-bold" lightClassName="text-neutral-800" darkClassName="text-neutral-800">
                {item.title}
              </ThemedText>
              
              <ThemedText className="text-sm mt-1" lightClassName="text-neutral-600" darkClassName="text-neutral-600">
                Plant: {item.plant_name}
              </ThemedText>
              
              {/* Description (truncated) */}
              {item.description && (
                <ThemedText 
                  className="text-sm mt-2" 
                  lightClassName="text-neutral-600" 
                  darkClassName="text-neutral-600"
                  numberOfLines={2}
                >
                  {item.description}
                </ThemedText>
              )}
            </View>
            
            {/* Complete button */}
            <TouchableOpacity
              className="justify-center items-center ml-2"
              onPress={() => markTaskAsCompleted(item.id)}
            >
              <View 
                className="w-10 h-10 rounded-full justify-center items-center"
                style={{ backgroundColor: theme.colors.primary[100] }}
              >
                <Ionicons 
                  name="checkmark" 
                  size={20} 
                  color={theme.colors.primary[600]} 
                />
              </View>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-primary-50">
      <ThemedView className="flex-1 px-4" lightClassName="bg-primary-50" darkClassName="bg-neutral-900">
        {/* Header */}
        <View className="flex-row justify-between items-center pt-2 pb-0">
          <ThemedText className="text-2xl font-bold" lightClassName="text-neutral-800" darkClassName="text-neutral-100">
            Calendar
          </ThemedText>
          <Pressable onPress={() => router.push('/task/new')}>
            <Ionicons name="add-circle" size={32} color={theme.colors.primary[500]} />
          </Pressable>
        </View>

        {/* Date selector */}
        {renderDateSelector()}

        {/* Tasks list */}
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          </View>
        ) : (
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id}
            renderItem={renderTaskCard}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <ThemedView 
                className="rounded-2xl p-6 items-center justify-center my-8" 
                lightClassName="bg-white" 
                darkClassName="bg-neutral-100"
                style={{ ...theme.shadows.sm }}
              >
                <Ionicons name="calendar-outline" size={48} color={theme.colors.neutral[400]} />
                <ThemedText 
                  className="text-lg font-medium mt-4 mb-2 text-center" 
                  lightClassName="text-neutral-700" 
                  darkClassName="text-neutral-700"
                >
                  No tasks for this day
                </ThemedText>
                <ThemedText 
                  className="text-center" 
                  lightClassName="text-neutral-500" 
                  darkClassName="text-neutral-500"
                >
                  Select a different day or add a new task
                </ThemedText>
              </ThemedView>
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary[500]]}
                tintColor={theme.colors.primary[500]}
              />
            }
          />
        )}
      </ThemedView>
    </SafeAreaView>
  );
}
