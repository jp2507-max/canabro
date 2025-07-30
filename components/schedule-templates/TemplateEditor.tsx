import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, ScrollView, Pressable, Alert, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  cancelAnimation,
  FadeInDown,
  FadeOutUp,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { FlashListWrapper } from '../ui/FlashListWrapper';
import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { EnhancedTextInput } from '../ui/EnhancedTextInput';
import { EnhancedKeyboardWrapper } from '../keyboard/EnhancedKeyboardWrapper';
import { ScheduleTemplate, TemplateTaskData } from '../../lib/models/ScheduleTemplate';
import { TaskType, isTaskType } from '../../lib/types/taskTypes';
import { SPRING_CONFIGS, SCALE_VALUES } from '../../lib/constants/animations';
import { triggerLightHaptic, triggerMediumHaptic, triggerHeavyHaptic } from '../../lib/utils/haptics';
import { useDatabase } from '../../lib/hooks/useDatabase';
import { generateUuid } from '../../lib/utils/uuid';

// Template categories
const TEMPLATE_CATEGORIES = [
  'indoor',
  'outdoor',
  'hydroponic',
  'soil',
  'beginner',
  'advanced',
] as const;

type TemplateCategory = typeof TEMPLATE_CATEGORIES[number];

// Strain types
const STRAIN_TYPES = ['indica', 'sativa', 'hybrid'] as const;
type StrainType = typeof STRAIN_TYPES[number];

// Task priorities
const TASK_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
type TaskPriority = typeof TASK_PRIORITIES[number];

// Common task templates library
const COMMON_TASK_TEMPLATES: Omit<TemplateTaskData, 'weekNumber' | 'dayOfWeek'>[] = [
  {
    taskType: 'watering',
    title: 'Water Plants',
    description: 'Check soil moisture and water as needed',
    priority: 'medium',
    estimatedDuration: 15,
    requiredSupplies: ['Water', 'pH meter'],
  },
  {
    taskType: 'feeding',
    title: 'Nutrient Feeding',
    description: 'Apply nutrient solution according to growth stage',
    priority: 'high',
    estimatedDuration: 30,
    requiredSupplies: ['Nutrients', 'pH meter', 'EC meter'],
  },
  {
    taskType: 'inspection',
    title: 'Plant Health Check',
    description: 'Inspect plants for pests, diseases, and deficiencies',
    priority: 'medium',
    estimatedDuration: 20,
    requiredSupplies: ['Magnifying glass', 'Notebook'],
  },
  {
    taskType: 'pruning',
    title: 'Pruning & Trimming',
    description: 'Remove dead leaves and unnecessary growth',
    priority: 'medium',
    estimatedDuration: 45,
    requiredSupplies: ['Pruning shears', 'Gloves'],
  },
  {
    taskType: 'training',
    title: 'Plant Training',
    description: 'LST, HST, or SCROG training techniques',
    priority: 'low',
    estimatedDuration: 60,
    requiredSupplies: ['Training wire', 'Clips', 'Net'],
  },
  {
    taskType: 'defoliation',
    title: 'Defoliation',
    description: 'Strategic leaf removal for light penetration',
    priority: 'medium',
    estimatedDuration: 30,
    requiredSupplies: ['Pruning shears', 'Gloves'],
  },
  {
    taskType: 'flushing',
    title: 'Flushing',
    description: 'Flush plants with plain water before harvest',
    priority: 'high',
    estimatedDuration: 20,
    requiredSupplies: ['pH-adjusted water'],
  },
  {
    taskType: 'harvest',
    title: 'Harvest',
    description: 'Harvest mature plants',
    priority: 'critical',
    estimatedDuration: 120,
    requiredSupplies: ['Trimming scissors', 'Drying rack', 'Gloves'],
  },
];

// Task type colors for visual distinction
const TASK_COLORS: Record<TaskType, string> = {
  watering: '#3B82F6',      // Blue
  feeding: '#10B981',       // Green
  inspection: '#F59E0B',    // Amber
  pruning: '#EF4444',       // Red
  harvest: '#8B5CF6',       // Purple
  transplant: '#F97316',    // Orange
  training: '#06B6D4',      // Cyan
  defoliation: '#84CC16',   // Lime
  flushing: '#6366F1',      // Indigo
};

// Priority colors
const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: '#6B7280',           // Gray
  medium: '#F59E0B',        // Amber
  high: '#EF4444',          // Red
  critical: '#DC2626',      // Dark Red
};

interface TemplateEditorProps {
  template?: ScheduleTemplate;
  onSave: (templateData: TemplateEditorData) => void;
  onCancel: () => void;
  onPreview?: (templateData: TemplateEditorData) => void;
}

interface TemplateEditorData {
  name: string;
  description: string;
  category: TemplateCategory;
  strainType?: StrainType;
  durationWeeks: number;
  isPublic: boolean;
  templateData: TemplateTaskData[];
}

interface DraggedTask {
  id: string;
  task: TemplateTaskData;
  originalWeek: number;
  originalDay: number;
}

interface WeekViewProps {
  weekNumber: number;
  tasks: TemplateTaskData[];
  onTaskAdd: (weekNumber: number, dayOfWeek: number, task: Omit<TemplateTaskData, 'weekNumber' | 'dayOfWeek'>) => void;
  onTaskRemove: (weekNumber: number, dayOfWeek: number, taskIndex: number) => void;
  onTaskMove: (fromWeek: number, fromDay: number, toWeek: number, toDay: number, taskIndex: number) => void;
  draggedTask: DraggedTask | null;
  onDragStart: (task: TemplateTaskData, weekNumber: number, dayOfWeek: number, taskIndex: number) => void;
  onDragEnd: () => void;
}

// Task card component with drag functionality
const TaskCard: React.FC<{
  task: TemplateTaskData;
  weekNumber: number;
  dayOfWeek: number;
  taskIndex: number;
  onRemove: () => void;
  onDragStart: (task: TemplateTaskData, weekNumber: number, dayOfWeek: number, taskIndex: number) => void;
  isDragging: boolean;
}> = React.memo(({ task, weekNumber, dayOfWeek, taskIndex, onRemove, onDragStart, isDragging }) => {
  const { t } = useTranslation('templates');
  
  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.1);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
    shadowOpacity: shadowOpacity.value,
  }));

  // Cleanup animations
  useEffect(() => {
    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      cancelAnimation(shadowOpacity);
    };
  }, []);

  // Update opacity when dragging state changes
  useEffect(() => {
    opacity.value = withSpring(isDragging ? 0.5 : 1, SPRING_CONFIGS.quick);
  }, [isDragging, opacity]);

  // Long press gesture for drag initiation
  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      'worklet';
      scale.value = withSpring(SCALE_VALUES.cardPress, SPRING_CONFIGS.card);
      shadowOpacity.value = withSpring(0.3, SPRING_CONFIGS.quick);
      runOnJS(triggerMediumHaptic)();
      runOnJS(onDragStart)(task, weekNumber, dayOfWeek, taskIndex);
    })
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1, SPRING_CONFIGS.card);
      shadowOpacity.value = withSpring(0.1, SPRING_CONFIGS.quick);
    });

  // Tap gesture for quick actions
  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.95, SPRING_CONFIGS.quick);
    })
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1, SPRING_CONFIGS.quick);
      runOnJS(triggerLightHaptic)();
    });

  const combinedGesture = Gesture.Race(longPressGesture, tapGesture);

  return (
    <GestureDetector gesture={combinedGesture}>
      <Animated.View style={animatedStyle}>
        <ThemedView
          className="mb-2 p-3 rounded-lg border-l-4 relative"
          style={{
            borderLeftColor: TASK_COLORS[task.taskType as TaskType] || '#6B7280',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowRadius: 3,
            elevation: 2,
          }}
        >
          {/* Remove button */}
          <Pressable
            onPress={onRemove}
            className="absolute top-1 right-1 w-6 h-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900"
          >
            <OptimizedIcon name="close" size={12} color="#EF4444" />
          </Pressable>

          {/* Task content */}
          <View className="pr-8">
            <ThemedText className="text-sm font-semibold mb-1">
              {task.title}
            </ThemedText>
            
            {task.description && (
              <ThemedText className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                {task.description}
              </ThemedText>
            )}

            {/* Task metadata */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
                />
                <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400">
                  {task.estimatedDuration}min
                </ThemedText>
              </View>
              
              <View className="bg-neutral-100 dark:bg-neutral-700 px-2 py-1 rounded-md">
                <ThemedText className="text-xs text-neutral-700 dark:text-neutral-300">
                  {task.taskType}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Drag indicator */}
          <View className="absolute bottom-1 right-1">
            <OptimizedIcon name="layers-outline" size={12} color="#9CA3AF" />
          </View>
        </ThemedView>
      </Animated.View>
    </GestureDetector>
  );
});

// Day column component with drop zone
const DayColumn: React.FC<{
  dayOfWeek: number;
  weekNumber: number;
  tasks: TemplateTaskData[];
  onTaskAdd: (weekNumber: number, dayOfWeek: number, task: Omit<TemplateTaskData, 'weekNumber' | 'dayOfWeek'>) => void;
  onTaskRemove: (weekNumber: number, dayOfWeek: number, taskIndex: number) => void;
  onTaskMove: (fromWeek: number, fromDay: number, toWeek: number, toDay: number, taskIndex: number) => void;
  draggedTask: DraggedTask | null;
  onDragStart: (task: TemplateTaskData, weekNumber: number, dayOfWeek: number, taskIndex: number) => void;
  onDragEnd: () => void;
}> = ({ dayOfWeek, weekNumber, tasks, onTaskAdd, onTaskRemove, onTaskMove, draggedTask, onDragStart, onDragEnd }) => {
  const { t } = useTranslation('templates');
  
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayTasks = tasks.filter(task => task.dayOfWeek === dayOfWeek);

  // Drop zone animation
  const dropZoneOpacity = useSharedValue(0);
  const dropZoneScale = useSharedValue(0.95);

  const dropZoneStyle = useAnimatedStyle(() => ({
    opacity: dropZoneOpacity.value,
    transform: [{ scale: dropZoneScale.value }],
  }));

  // Show drop zone when dragging
  useEffect(() => {
    if (draggedTask) {
      dropZoneOpacity.value = withSpring(1, SPRING_CONFIGS.quick);
      dropZoneScale.value = withSpring(1, SPRING_CONFIGS.quick);
    } else {
      dropZoneOpacity.value = withSpring(0, SPRING_CONFIGS.quick);
      dropZoneScale.value = withSpring(0.95, SPRING_CONFIGS.quick);
    }
  }, [draggedTask, dropZoneOpacity, dropZoneScale]);

  // Handle drop
  const handleDrop = useCallback(() => {
    if (draggedTask) {
      if (draggedTask.originalWeek !== weekNumber || draggedTask.originalDay !== dayOfWeek) {
        // Move task to new position
        const taskIndex = tasks.findIndex(t => 
          t.weekNumber === draggedTask.originalWeek && 
          t.dayOfWeek === draggedTask.originalDay &&
          t.title === draggedTask.task.title
        );
        
        if (taskIndex !== -1) {
          onTaskMove(draggedTask.originalWeek, draggedTask.originalDay, weekNumber, dayOfWeek, taskIndex);
        }
      }
      onDragEnd();
      triggerLightHaptic();
    }
  }, [draggedTask, weekNumber, dayOfWeek, tasks, onTaskMove, onDragEnd]);

  return (
    <ThemedView className="flex-1 mx-1">
      {/* Day header */}
      <ThemedView className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-t-lg">
        <ThemedText className="text-sm font-medium text-center">
          {dayNames[dayOfWeek]}
        </ThemedText>
      </ThemedView>

      {/* Tasks container */}
      <ThemedView className="flex-1 p-2 bg-neutral-50 dark:bg-neutral-900 rounded-b-lg min-h-[200px] relative">
        {/* Drop zone overlay */}
        {draggedTask && (
          <Animated.View
            style={[dropZoneStyle]}
            className="absolute inset-0 border-2 border-dashed border-blue-500 bg-blue-50 dark:bg-blue-900 rounded-lg items-center justify-center z-10"
          >
            <Pressable onPress={handleDrop} className="flex-1 w-full items-center justify-center">
              <OptimizedIcon name="add-outline" size={32} color="#3B82F6" />
              <ThemedText className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                {t('editor.dropHere')}
              </ThemedText>
            </Pressable>
          </Animated.View>
        )}

        {/* Task list */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {dayTasks.map((task, index) => (
            <TaskCard
              key={`${task.title}-${index}`}
              task={task}
              weekNumber={weekNumber}
              dayOfWeek={dayOfWeek}
              taskIndex={index}
              onRemove={() => onTaskRemove(weekNumber, dayOfWeek, index)}
              onDragStart={onDragStart}
              isDragging={draggedTask?.id === `${weekNumber}-${dayOfWeek}-${index}`}
            />
          ))}
        </ScrollView>

        {/* Add task button */}
        {!draggedTask && (
          <Pressable
            onPress={() => {
              // Show task template selector
              // For now, add a default inspection task
              const defaultTask = COMMON_TASK_TEMPLATES[2]; // inspection
              if (defaultTask) {
                onTaskAdd(weekNumber, dayOfWeek, defaultTask);
              }
              triggerLightHaptic();
            }}
            className="mt-2 p-2 border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg items-center justify-center"
          >
            <OptimizedIcon name="add-outline" size={20} color="#6B7280" />
            <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {t('editor.addTask')}
            </ThemedText>
          </Pressable>
        )}
      </ThemedView>
    </ThemedView>
  );
};

// Week view component
const WeekView: React.FC<WeekViewProps> = ({
  weekNumber,
  tasks,
  onTaskAdd,
  onTaskRemove,
  onTaskMove,
  draggedTask,
  onDragStart,
  onDragEnd,
}) => {
  const { t } = useTranslation('templates');

  return (
    <ThemedView className="mb-6">
      {/* Week header */}
      <ThemedView className="mb-3 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
        <ThemedText className="text-lg font-semibold text-blue-800 dark:text-blue-200">
          {t('editor.week')} {weekNumber}
        </ThemedText>
        <ThemedText className="text-sm text-blue-600 dark:text-blue-400">
          {tasks.filter(task => task.weekNumber === weekNumber).length} {t('editor.tasks')}
        </ThemedText>
      </ThemedView>

      {/* Days grid */}
      <View className="flex-row">
        {Array.from({ length: 7 }, (_, dayIndex) => (
          <DayColumn
            key={dayIndex}
            dayOfWeek={dayIndex}
            weekNumber={weekNumber}
            tasks={tasks}
            onTaskAdd={onTaskAdd}
            onTaskRemove={onTaskRemove}
            onTaskMove={onTaskMove}
            draggedTask={draggedTask}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </View>
    </ThemedView>
  );
};

// Task template library modal
const TaskTemplateLibrary: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSelectTemplate: (template: Omit<TemplateTaskData, 'weekNumber' | 'dayOfWeek'>) => void;
}> = ({ visible, onClose, onSelectTemplate }) => {
  const { t } = useTranslation('templates');

  if (!visible) return null;

  return (
    <ThemedView className="absolute inset-0 bg-black/50 items-center justify-center z-50">
      <ThemedView className="w-4/5 max-h-4/5 bg-white dark:bg-neutral-800 rounded-xl p-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <ThemedText className="text-lg font-semibold">
            {t('editor.taskLibrary')}
          </ThemedText>
          <Pressable onPress={onClose}>
            <OptimizedIcon name="close" size={24} color="#6B7280" />
          </Pressable>
        </View>

        {/* Task templates list */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {COMMON_TASK_TEMPLATES.map((template, index) => (
            <Pressable
              key={index}
              onPress={() => {
                onSelectTemplate(template);
                onClose();
                triggerLightHaptic();
              }}
              className="p-3 mb-2 border border-neutral-200 dark:border-neutral-700 rounded-lg"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <ThemedText className="font-medium mb-1">
                    {template.title}
                  </ThemedText>
                  <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                    {template.description}
                  </ThemedText>
                  <View className="flex-row items-center">
                    <View
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: TASK_COLORS[template.taskType as TaskType] }}
                    />
                    <ThemedText className="text-xs text-neutral-500">
                      {template.taskType} • {template.estimatedDuration}min
                    </ThemedText>
                  </View>
                </View>
                <OptimizedIcon name="add-outline" size={24} color="#3B82F6" />
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </ThemedView>
    </ThemedView>
  );
};

// Main TemplateEditor component
export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  template,
  onSave,
  onCancel,
  onPreview,
}) => {
  const { t } = useTranslation('templates');
  const { database } = useDatabase();

  // Form state
  const [formData, setFormData] = useState<TemplateEditorData>({
    name: template?.name || '',
    description: template?.description || '',
    category: (template?.category as TemplateCategory) || 'indoor',
    strainType: (template?.strainType as StrainType) || undefined,
    durationWeeks: template?.durationWeeks || 12,
    isPublic: template?.isPublic || false,
    templateData: template?.templateData || [],
  });

  // UI state
  const [draggedTask, setDraggedTask] = useState<DraggedTask | null>(null);
  const [showTaskLibrary, setShowTaskLibrary] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Validation
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = t('editor.validation.nameRequired');
    }

    if (formData.durationWeeks < 1 || formData.durationWeeks > 52) {
      errors.durationWeeks = t('editor.validation.durationRange');
    }

    if (formData.templateData.length === 0) {
      errors.tasks = t('editor.validation.tasksRequired');
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, t]);

  // Task management functions
  const handleTaskAdd = useCallback((weekNumber: number, dayOfWeek: number, task: Omit<TemplateTaskData, 'weekNumber' | 'dayOfWeek'>) => {
    const newTask: TemplateTaskData = {
      ...task,
      weekNumber,
      dayOfWeek,
    };

    setFormData(prev => ({
      ...prev,
      templateData: [...prev.templateData, newTask],
    }));
  }, []);

  const handleTaskRemove = useCallback((weekNumber: number, dayOfWeek: number, taskIndex: number) => {
    setFormData(prev => ({
      ...prev,
      templateData: prev.templateData.filter((task, index) => {
        if (task.weekNumber === weekNumber && task.dayOfWeek === dayOfWeek) {
          const dayTasks = prev.templateData.filter(t => t.weekNumber === weekNumber && t.dayOfWeek === dayOfWeek);
          return dayTasks.indexOf(task) !== taskIndex;
        }
        return true;
      }),
    }));
  }, []);

  const handleTaskMove = useCallback((fromWeek: number, fromDay: number, toWeek: number, toDay: number, taskIndex: number) => {
    setFormData(prev => {
      const newTemplateData = [...prev.templateData];
      const fromTasks = newTemplateData.filter(task => task.weekNumber === fromWeek && task.dayOfWeek === fromDay);
      
      if (taskIndex < fromTasks.length) {
        const taskToMove = fromTasks[taskIndex];
        if (taskToMove) {
          const globalIndex = newTemplateData.indexOf(taskToMove);
          
          if (globalIndex !== -1) {
            newTemplateData[globalIndex] = {
              ...taskToMove,
              weekNumber: toWeek,
              dayOfWeek: toDay,
            };
          }
        }
      }

      return {
        ...prev,
        templateData: newTemplateData,
      };
    });
  }, []);

  const handleDragStart = useCallback((task: TemplateTaskData, weekNumber: number, dayOfWeek: number, taskIndex: number) => {
    setDraggedTask({
      id: `${weekNumber}-${dayOfWeek}-${taskIndex}`,
      task,
      originalWeek: weekNumber,
      originalDay: dayOfWeek,
    });
    triggerMediumHaptic();
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedTask(null);
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    if (validateForm()) {
      onSave(formData);
      triggerLightHaptic();
    } else {
      triggerHeavyHaptic();
    }
  }, [formData, validateForm, onSave]);

  // Handle preview
  const handlePreview = useCallback(() => {
    if (onPreview) {
      onPreview(formData);
      triggerLightHaptic();
    }
  }, [formData, onPreview]);

  // Generate weeks array
  const weeks = useMemo(() => {
    return Array.from({ length: formData.durationWeeks }, (_, index) => index + 1);
  }, [formData.durationWeeks]);

  return (
    <EnhancedKeyboardWrapper>
      <ThemedView className="flex-1">
        {/* Header */}
        <ThemedView className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <View className="flex-row items-center justify-between">
            <ThemedText className="text-xl font-bold">
              {template ? t('editor.editTemplate') : t('editor.createTemplate')}
            </ThemedText>
            <View className="flex-row">
              {onPreview && (
                <Pressable
                  onPress={handlePreview}
                  className="mr-3 px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded-lg"
                >
                  <ThemedText className="text-blue-700 dark:text-blue-300 font-medium">
                    {t('editor.preview')}
                  </ThemedText>
                </Pressable>
              )}
              <Pressable
                onPress={onCancel}
                className="mr-3 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg"
              >
                <ThemedText className="text-neutral-700 dark:text-neutral-300 font-medium">
                  {t('common.cancel')}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSave}
                className="px-4 py-2 bg-blue-500 rounded-lg"
              >
                <ThemedText className="text-white font-medium">
                  {t('common.save')}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </ThemedView>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Basic Information */}
          <ThemedView className="p-4">
            <ThemedText className="text-lg font-semibold mb-4">
              {t('editor.basicInfo')}
            </ThemedText>

            <EnhancedTextInput
              label={t('editor.templateName')}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              placeholder={t('editor.templateNamePlaceholder')}
              error={validationErrors.name}
              maxLength={100}
              showCharacterCount
            />

            <EnhancedTextInput
              label={t('editor.description')}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              placeholder={t('editor.descriptionPlaceholder')}
              multiline
              maxLength={500}
              showCharacterCount
            />

            {/* Category and strain type selectors */}
            <View className="flex-row space-x-4 mb-4">
              <View className="flex-1">
                <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {t('editor.category')}
                </ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {TEMPLATE_CATEGORIES.map((category) => (
                    <Pressable
                      key={category}
                      onPress={() => setFormData(prev => ({ ...prev, category }))}
                      className={`mr-2 px-3 py-2 rounded-lg ${
                        formData.category === category
                          ? 'bg-blue-500'
                          : 'bg-neutral-200 dark:bg-neutral-700'
                      }`}
                    >
                      <ThemedText
                        className={`text-sm ${
                          formData.category === category
                            ? 'text-white'
                            : 'text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {t(`categories.${category}`)}
                      </ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Duration weeks */}
            <View className="mb-4">
              <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                {t('editor.durationWeeks')}
              </ThemedText>
              <View className="flex-row items-center">
                <Pressable
                  onPress={() => setFormData(prev => ({ 
                    ...prev, 
                    durationWeeks: Math.max(1, prev.durationWeeks - 1) 
                  }))}
                  className="w-10 h-10 bg-neutral-200 dark:bg-neutral-700 rounded-lg items-center justify-center"
                >
                  <OptimizedIcon name="close" size={20} color="#6B7280" />
                </Pressable>
                
                <ThemedText className="mx-4 text-lg font-semibold min-w-[40px] text-center">
                  {formData.durationWeeks}
                </ThemedText>
                
                <Pressable
                  onPress={() => setFormData(prev => ({ 
                    ...prev, 
                    durationWeeks: Math.min(52, prev.durationWeeks + 1) 
                  }))}
                  className="w-10 h-10 bg-neutral-200 dark:bg-neutral-700 rounded-lg items-center justify-center"
                >
                  <OptimizedIcon name="add" size={20} color="#6B7280" />
                </Pressable>
              </View>
              {validationErrors.durationWeeks && (
                <ThemedText className="text-red-500 text-sm mt-1">
                  {validationErrors.durationWeeks}
                </ThemedText>
              )}
            </View>

            {/* Public toggle */}
            <View className="flex-row items-center justify-between mb-4">
              <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t('editor.makePublic')}
              </ThemedText>
              <Pressable
                onPress={() => setFormData(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                className={`w-12 h-6 rounded-full ${
                  formData.isPublic ? 'bg-blue-500' : 'bg-neutral-300 dark:bg-neutral-600'
                }`}
              >
                <View
                  className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${
                    formData.isPublic ? 'ml-6' : 'ml-0.5'
                  }`}
                />
              </Pressable>
            </View>
          </ThemedView>

          {/* Week-by-week planning */}
          <ThemedView className="p-4">
            <View className="flex-row items-center justify-between mb-4">
              <ThemedText className="text-lg font-semibold">
                {t('editor.weeklyPlanning')}
              </ThemedText>
              <Pressable
                onPress={() => setShowTaskLibrary(true)}
                className="px-3 py-2 bg-green-100 dark:bg-green-900 rounded-lg"
              >
                <ThemedText className="text-green-700 dark:text-green-300 font-medium">
                  {t('editor.taskLibrary')}
                </ThemedText>
              </Pressable>
            </View>

            {validationErrors.tasks && (
              <ThemedText className="text-red-500 text-sm mb-4">
                {validationErrors.tasks}
              </ThemedText>
            )}

            {/* Weeks */}
            {weeks.map((weekNumber) => (
              <WeekView
                key={weekNumber}
                weekNumber={weekNumber}
                tasks={formData.templateData}
                onTaskAdd={handleTaskAdd}
                onTaskRemove={handleTaskRemove}
                onTaskMove={handleTaskMove}
                draggedTask={draggedTask}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              />
            ))}
          </ThemedView>
        </ScrollView>

        {/* Task Template Library Modal */}
        <TaskTemplateLibrary
          visible={showTaskLibrary}
          onClose={() => setShowTaskLibrary(false)}
          onSelectTemplate={(template) => {
            if (selectedWeek !== null && selectedDay !== null) {
              handleTaskAdd(selectedWeek, selectedDay, template);
              setSelectedWeek(null);
              setSelectedDay(null);
            }
          }}
        />
      </ThemedView>
    </EnhancedKeyboardWrapper>
  );
};

export default TemplateEditor;