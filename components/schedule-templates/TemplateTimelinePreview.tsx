import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
} from 'react-native-reanimated';

import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { ScheduleTemplate, TemplateTaskData } from '../../lib/models/ScheduleTemplate';
import { SPRING_CONFIGS } from '../../lib/constants/animations';

interface TemplateTimelinePreviewProps {
  template: ScheduleTemplate;
  maxWeeksToShow?: number;
  showTaskDetails?: boolean;
}

interface TimelineWeekProps {
  weekNumber: number;
  tasks: TemplateTaskData[];
  isLast: boolean;
  animationDelay: number;
}

// Task type colors and icons
const TASK_TYPE_CONFIG = {
  watering: { color: '#3B82F6', icon: 'water-outline', bgColor: '#EFF6FF' },
  feeding: { color: '#10B981', icon: 'nutrition-outline', bgColor: '#F0FDF4' },
  pruning: { color: '#F59E0B', icon: 'cut-outline', bgColor: '#FFFBEB' },
  inspection: { color: '#8B5CF6', icon: 'search-outline', bgColor: '#F5F3FF' },
  harvesting: { color: '#EF4444', icon: 'leaf-outline', bgColor: '#FEF2F2' },
  default: { color: '#6B7280', icon: 'default', bgColor: '#F9FAFB' },
} as const;

// Priority colors
const PRIORITY_COLORS = {
  low: '#10B981',
  medium: '#F59E0B', 
  high: '#EF4444',
  critical: '#DC2626',
} as const;

// Task item component
const TaskItem: React.FC<{ task: TemplateTaskData; showDetails: boolean }> = ({ 
  task, 
  showDetails 
}) => {
  const config = TASK_TYPE_CONFIG[task.taskType as keyof typeof TASK_TYPE_CONFIG] || TASK_TYPE_CONFIG.default;
  const priorityColor = PRIORITY_COLORS[task.priority];

  return (
    <View className="flex-row items-center mb-2 p-2 rounded-lg" style={{ backgroundColor: config.bgColor }}>
      <View 
        className="w-8 h-8 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: config.color }}
      >
        <OptimizedIcon name={config.icon} size={16} color="white" />
      </View>
      
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <ThemedText className="font-medium text-sm" style={{ color: config.color }}>
            {task.title}
          </ThemedText>
          <View className="flex-row items-center">
            <View 
              className="w-2 h-2 rounded-full mr-2"
              style={{ backgroundColor: priorityColor }}
            />
            <ThemedText className="text-xs text-neutral-500">
              {task.estimatedDuration}min
            </ThemedText>
          </View>
        </View>
        
        {showDetails && task.description && (
          <ThemedText className="text-xs text-neutral-600 mt-1">
            {task.description}
          </ThemedText>
        )}
        
        {showDetails && task.requiredSupplies && task.requiredSupplies.length > 0 && (
          <View className="flex-row flex-wrap mt-1">
            {task.requiredSupplies.slice(0, 3).map((supply, index) => (
              <View key={index} className="bg-neutral-200 dark:bg-neutral-700 px-2 py-1 rounded mr-1 mb-1">
                <ThemedText className="text-xs">{supply}</ThemedText>
              </View>
            ))}
            {task.requiredSupplies.length > 3 && (
              <View className="bg-neutral-200 dark:bg-neutral-700 px-2 py-1 rounded">
                <ThemedText className="text-xs">+{task.requiredSupplies.length - 3}</ThemedText>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

// Timeline week component
const TimelineWeek: React.FC<TimelineWeekProps> = ({ 
  weekNumber, 
  tasks, 
  isLast, 
  animationDelay 
}) => {
  const { t } = useTranslation('templates');
  
  // Animation values
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const scale = useSharedValue(0.9);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value }
    ],
  }));

  // Start animation with delay
  React.useEffect(() => {
    const startAnimation = () => {
      opacity.value = withDelay(
        animationDelay,
        withSpring(1, SPRING_CONFIGS.stagger)
      );
      translateY.value = withDelay(
        animationDelay,
        withSpring(0, SPRING_CONFIGS.stagger)
      );
      scale.value = withDelay(
        animationDelay,
        withSpring(1, SPRING_CONFIGS.stagger)
      );
    };

    startAnimation();
  }, [animationDelay, opacity, translateY, scale]);

  // Group tasks by day
  const tasksByDay = useMemo(() => {
    const grouped: Record<number, TemplateTaskData[]> = {};
    tasks.forEach(task => {
      if (!grouped[task.dayOfWeek]) {
        grouped[task.dayOfWeek] = [];
      }
      grouped[task.dayOfWeek]!.push(task);
    });
    return grouped;
  }, [tasks]);

  const totalDuration = useMemo(() => {
    return tasks.reduce((sum, task) => sum + task.estimatedDuration, 0);
  }, [tasks]);

  return (
    <Animated.View style={animatedStyle} className="mb-6">
      <View className="flex-row items-center mb-3">
        <View className="w-10 h-10 rounded-full bg-blue-500 items-center justify-center mr-3">
          <ThemedText className="text-white font-bold text-sm">{weekNumber}</ThemedText>
        </View>
        <View className="flex-1">
          <ThemedText className="font-semibold text-base">
            Week {weekNumber}
          </ThemedText>
          <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
            {tasks.length} tasks • ~{Math.round(totalDuration / 60)}h total
          </ThemedText>
        </View>
      </View>

      {/* Timeline connector */}
      {!isLast && (
        <View className="absolute left-5 top-10 w-0.5 h-full bg-neutral-300 dark:bg-neutral-600" />
      )}

      {/* Tasks grouped by day */}
      <View className="ml-13">
        {Object.entries(tasksByDay)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([dayOfWeek, dayTasks]) => (
            <View key={dayOfWeek} className="mb-4">
              <View className="flex-row items-center mb-2">
                <View className="w-6 h-6 rounded-full bg-neutral-300 dark:bg-neutral-600 items-center justify-center mr-2">
                  <ThemedText className="text-xs font-medium">{dayOfWeek}</ThemedText>
                </View>
                <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Day {dayOfWeek}
                </ThemedText>
              </View>
              
              <View className="ml-8">
                {dayTasks.map((task, index) => (
                  <TaskItem 
                    key={`${task.taskType}-${index}`} 
                    task={task} 
                    showDetails={false}
                  />
                ))}
              </View>
            </View>
          ))}
      </View>
    </Animated.View>
  );
};

// Main timeline preview component
export const TemplateTimelinePreview: React.FC<TemplateTimelinePreviewProps> = ({
  template,
  maxWeeksToShow = 8,
  showTaskDetails = false,
}) => {
  const { t } = useTranslation('templates');

  // Group tasks by week
  const tasksByWeek = useMemo(() => {
    if (!template.templateData) return {};
    
    return template.templateData.reduce((acc, task) => {
      if (!acc[task.weekNumber]) {
        acc[task.weekNumber] = [];
      }
      acc[task.weekNumber]!.push(task);
      return acc;
    }, {} as Record<number, TemplateTaskData[]>);
  }, [template.templateData]);

  // Get weeks to display
  const weeksToShow = useMemo(() => {
    const weeks = Object.keys(tasksByWeek)
      .map(Number)
      .sort((a, b) => a - b)
      .slice(0, maxWeeksToShow);
    
    return weeks;
  }, [tasksByWeek, maxWeeksToShow]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalTasks = template.totalTasks;
    const totalDuration = template.templateData?.reduce((sum, task) => sum + task.estimatedDuration, 0) || 0;
    const avgTasksPerWeek = template.averageTasksPerWeek;
    const taskTypes = Object.keys(template.tasksByType || {});

    return {
      totalTasks,
      totalDuration: Math.round(totalDuration / 60), // Convert to hours
      avgTasksPerWeek,
      taskTypes: taskTypes.length,
    };
  }, [template]);

  if (!template.templateData || template.templateData.length === 0) {
    return (
      <ThemedView className="flex-1 items-center justify-center p-8">
        <OptimizedIcon name="document-text-outline" size={48} color="#9CA3AF" />
        <ThemedText className="text-lg font-medium mt-4 mb-2 text-center">
          No Timeline Available
        </ThemedText>
        <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400 text-center">
          This template doesn't have any tasks defined yet.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1">
      {/* Header with template info */}
      <View className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <ThemedText className="text-xl font-bold mb-2">{template.name}</ThemedText>
        {template.description && (
          <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
            {template.description}
          </ThemedText>
        )}
        
        {/* Statistics */}
        <View className="flex-row justify-between">
          <View className="items-center">
            <ThemedText className="text-lg font-bold text-blue-600">{stats.totalTasks}</ThemedText>
            <ThemedText className="text-xs text-neutral-500">Total Tasks</ThemedText>
          </View>
          <View className="items-center">
            <ThemedText className="text-lg font-bold text-green-600">{stats.totalDuration}h</ThemedText>
            <ThemedText className="text-xs text-neutral-500">Total Time</ThemedText>
          </View>
          <View className="items-center">
            <ThemedText className="text-lg font-bold text-purple-600">{stats.avgTasksPerWeek}</ThemedText>
            <ThemedText className="text-xs text-neutral-500">Avg/Week</ThemedText>
          </View>
          <View className="items-center">
            <ThemedText className="text-lg font-bold text-orange-600">{stats.taskTypes}</ThemedText>
            <ThemedText className="text-xs text-neutral-500">Task Types</ThemedText>
          </View>
        </View>
      </View>

      {/* Timeline */}
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {weeksToShow.map((weekNumber, index) => (
          <TimelineWeek
            key={weekNumber}
            weekNumber={weekNumber}
            tasks={tasksByWeek[weekNumber] || []}
            isLast={index === weeksToShow.length - 1}
            animationDelay={index * 100}
          />
        ))}
        
        {Object.keys(tasksByWeek).length > maxWeeksToShow && (
          <View className="items-center py-4">
            <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
              +{Object.keys(tasksByWeek).length - maxWeeksToShow} more weeks
            </ThemedText>
          </View>
        )}
      </ScrollView>

      {/* Legend */}
      <View className="p-4 border-t border-neutral-200 dark:border-neutral-700">
        <ThemedText className="text-sm font-medium mb-2">Task Types</ThemedText>
        <View className="flex-row flex-wrap">
          {Object.entries(TASK_TYPE_CONFIG).slice(0, -1).map(([type, config]) => (
            <View key={type} className="flex-row items-center mr-4 mb-2">
              <View 
                className="w-4 h-4 rounded-full mr-2"
                style={{ backgroundColor: config.color }}
              />
              <ThemedText className="text-xs capitalize">{type}</ThemedText>
            </View>
          ))}
        </View>
      </View>
    </ThemedView>
  );
};

export default TemplateTimelinePreview;