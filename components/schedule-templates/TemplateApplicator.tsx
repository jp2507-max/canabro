import React, { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, Pressable, Alert } from 'react-native';
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
import { Q } from '@nozbe/watermelondb';

import { FlashListWrapper } from '../ui/FlashListWrapper';
import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import NetworkResilientImage from '../ui/NetworkResilientImage';
import { ScheduleTemplate, TemplateTaskData } from '../../lib/models/ScheduleTemplate';
import { Plant } from '../../lib/models/Plant';
import { PlantTask } from '../../lib/models/PlantTask';
// import { TaskType } from '../../lib/types/taskTypes';
import { SPRING_CONFIGS, SCALE_VALUES } from '../../lib/constants/animations';
import { triggerLightHaptic, triggerHeavyHaptic } from '../../lib/utils/haptics';
import { useDatabase } from '../../lib/hooks/useDatabase';
import { generateUuid } from '../../lib/utils/uuid';
import { addDays, format } from '../../lib/utils/date';
import { isTaskType } from '../../lib/types/taskTypes';

interface TemplateApplicatorProps {
  template: ScheduleTemplate;
  selectedPlants: Plant[];
  onApply: (results: TemplateApplicationResult[]) => void;
  onCancel: () => void;
  visible: boolean;
}

interface TemplateApplicationResult {
  plantId: string;
  plantName: string;
  success: boolean;
  tasksCreated: number;
  error?: string;
  conflictingTasks?: PlantTask[];
}

interface ApplicationSettings {
  startDate: Date;
  replaceExisting: boolean;
  adjustForGrowthStage: boolean;
  skipWeekends: boolean;
  customizations: Record<string, TemplateTaskCustomization>;
}

interface TemplateTaskCustomization {
  taskType: string;
  enabled: boolean;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration?: number;
  notes?: string;
}

interface PlantApplicationPreview {
  plant: Plant;
  tasksToCreate: TemplateTaskData[];
  conflictingTasks: PlantTask[];
  estimatedStartDate: Date;
  totalDuration: number; // in minutes
  warnings: string[];
}

// Plant selection card component
const PlantSelectionCard: React.FC<{
  plant: Plant;
  isSelected: boolean;
  onToggle: (plant: Plant) => void;
  preview?: PlantApplicationPreview;
}> = React.memo(({ plant, isSelected, onToggle, preview }) => {
  const { t } = useTranslation('templates');
  
  // Animation values
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(isSelected ? 1 : 0);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedBorderStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  // Update border when selection changes
  useEffect(() => {
    borderOpacity.value = withSpring(isSelected ? 1 : 0, SPRING_CONFIGS.quick);
  }, [isSelected, borderOpacity]);

  // Cleanup animations
  useEffect(() => {
    return () => {
      cancelAnimation(scale);
      cancelAnimation(borderOpacity);
    };
  }, []);

  // Tap gesture
  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(SCALE_VALUES.cardPress, SPRING_CONFIGS.card);
    })
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1, SPRING_CONFIGS.card);
      runOnJS(triggerLightHaptic)();
      runOnJS(onToggle)(plant);
    });

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View style={animatedStyle}>
        <ThemedView
          variant="card"
          className="mx-4 mb-3 p-4 relative"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          {/* Selection border */}
          <Animated.View
            style={[animatedBorderStyle]}
            className="absolute inset-0 border-2 border-blue-500 rounded-xl"
          />

          <View className="flex-row items-center">
            {/* Plant image */}
            <View className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-700 mr-4">
              {plant.imageUrl ? (
                <NetworkResilientImage
                  url={plant.imageUrl}
                  width={64}
                  height={64}
                />
              ) : (
                <View className="w-full h-full items-center justify-center">
                  <OptimizedIcon name="leaf-outline" size={24} color="#6B7280" />
                </View>
              )}
            </View>

            {/* Plant info */}
            <View className="flex-1">
              <ThemedText className="text-lg font-semibold mb-1">
                {plant.name}
              </ThemedText>
              <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                {plant.strain} • {plant.growthStage}
              </ThemedText>
              <ThemedText className="text-xs text-neutral-500 dark:text-neutral-500">
                {t('applicator.plantedOn', { date: format(new Date(plant.plantedDate), 'MMM dd, yyyy') })}
              </ThemedText>
            </View>

            {/* Selection indicator */}
            <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
              isSelected 
                ? 'bg-blue-500 border-blue-500' 
                : 'border-neutral-300 dark:border-neutral-600'
            }`}>
              {isSelected && (
                <OptimizedIcon name="checkmark" size={16} color="#FFFFFF" />
              )}
            </View>
          </View>

          {/* Preview info */}
          {preview && isSelected && (
            <Animated.View
              entering={FadeInDown.duration(300)}
              exiting={FadeOutUp.duration(200)}
              className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700"
            >
              <View className="flex-row items-center justify-between mb-2">
                <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t('applicator.tasksToCreate')}
                </ThemedText>
                <ThemedText className="text-sm text-blue-600 dark:text-blue-400">
                  {preview.tasksToCreate.length}
                </ThemedText>
              </View>
              
              <View className="flex-row items-center justify-between mb-2">
                <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t('applicator.estimatedDuration')}
                </ThemedText>
                <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
                  {Math.round(preview.totalDuration / 60)}h {preview.totalDuration % 60}m
                </ThemedText>
              </View>

              {preview.conflictingTasks.length > 0 && (
                <View className="flex-row items-center justify-between mb-2">
                  <ThemedText className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    {t('applicator.conflicts')}
                  </ThemedText>
                  <ThemedText className="text-sm text-amber-600 dark:text-amber-400">
                    {preview.conflictingTasks.length}
                  </ThemedText>
                </View>
              )}

              {preview.warnings.length > 0 && (
                <View className="mt-2">
                  {preview.warnings.slice(0, 2).map((warning, index) => (
                    <View key={index} className="flex-row items-start mb-1">
                      <OptimizedIcon name="warning-outline" size={14} color="#F59E0B" />
                      <ThemedText className="text-xs text-amber-600 dark:text-amber-400 ml-1 flex-1">
                        {warning}
                      </ThemedText>
                    </View>
                  ))}
                  {preview.warnings.length > 2 && (
                    <ThemedText className="text-xs text-amber-600 dark:text-amber-400">
                      +{preview.warnings.length - 2} {t('applicator.moreWarnings')}
                    </ThemedText>
                  )}
                </View>
              )}
            </Animated.View>
          )}
        </ThemedView>
      </Animated.View>
    </GestureDetector>
  );
});

// Application settings component
const ApplicationSettings: React.FC<{
  settings: ApplicationSettings;
  onSettingsChange: (settings: ApplicationSettings) => void;
  template: ScheduleTemplate;
}> = ({ settings, onSettingsChange }) => {
  const { t } = useTranslation('templates');

  const handleSettingChange = useCallback((key: keyof ApplicationSettings, value: any) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  }, [settings, onSettingsChange]);

  return (
    <ThemedView className="p-4">
      <ThemedText className="text-lg font-semibold mb-4">
        {t('applicator.applicationSettings')}
      </ThemedText>

      {/* Start date */}
      <View className="mb-4">
        <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          {t('applicator.startDate')}
        </ThemedText>
        <Pressable
          onPress={() => {
            // TODO: Show date picker
            triggerLightHaptic();
          }}
          className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex-row items-center justify-between"
        >
          <ThemedText className="text-neutral-900 dark:text-neutral-100">
            {format(settings.startDate, 'MMM dd, yyyy')}
          </ThemedText>
          <OptimizedIcon name="calendar-outline" size={20} color="#6B7280" />
        </Pressable>
      </View>

      {/* Replace existing tasks */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-1 mr-4">
          <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            {t('applicator.replaceExisting')}
          </ThemedText>
          <ThemedText className="text-xs text-neutral-600 dark:text-neutral-400">
            {t('applicator.replaceExistingDescription')}
          </ThemedText>
        </View>
        <Pressable
          onPress={() => {
            handleSettingChange('replaceExisting', !settings.replaceExisting);
            triggerLightHaptic();
          }}
          className={`w-12 h-6 rounded-full ${
            settings.replaceExisting ? 'bg-blue-500' : 'bg-neutral-300 dark:bg-neutral-600'
          }`}
        >
          <View
            className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${
              settings.replaceExisting ? 'ml-6' : 'ml-0.5'
            }`}
          />
        </Pressable>
      </View>

      {/* Adjust for growth stage */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-1 mr-4">
          <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            {t('applicator.adjustForGrowthStage')}
          </ThemedText>
          <ThemedText className="text-xs text-neutral-600 dark:text-neutral-400">
            {t('applicator.adjustForGrowthStageDescription')}
          </ThemedText>
        </View>
        <Pressable
          onPress={() => {
            handleSettingChange('adjustForGrowthStage', !settings.adjustForGrowthStage);
            triggerLightHaptic();
          }}
          className={`w-12 h-6 rounded-full ${
            settings.adjustForGrowthStage ? 'bg-blue-500' : 'bg-neutral-300 dark:bg-neutral-600'
          }`}
        >
          <View
            className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${
              settings.adjustForGrowthStage ? 'ml-6' : 'ml-0.5'
            }`}
          />
        </Pressable>
      </View>

      {/* Skip weekends */}
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-4">
          <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            {t('applicator.skipWeekends')}
          </ThemedText>
          <ThemedText className="text-xs text-neutral-600 dark:text-neutral-400">
            {t('applicator.skipWeekendsDescription')}
          </ThemedText>
        </View>
        <Pressable
          onPress={() => {
            handleSettingChange('skipWeekends', !settings.skipWeekends);
            triggerLightHaptic();
          }}
          className={`w-12 h-6 rounded-full ${
            settings.skipWeekends ? 'bg-blue-500' : 'bg-neutral-300 dark:bg-neutral-600'
          }`}
        >
          <View
            className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${
              settings.skipWeekends ? 'ml-6' : 'ml-0.5'
            }`}
          />
        </Pressable>
      </View>
    </ThemedView>
  );
};

// Main TemplateApplicator component
export const TemplateApplicator: React.FC<TemplateApplicatorProps> = ({
  template,
  selectedPlants: initialSelectedPlants,
  onApply,
  onCancel,
  visible,
}) => {
  const { t } = useTranslation('templates');
  const { database } = useDatabase();

  // State
  const [selectedPlants, setSelectedPlants] = useState<Plant[]>(initialSelectedPlants);
  const [allPlants, setAllPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(false);
  const [previews, setPreviews] = useState<Record<string, PlantApplicationPreview>>({});
  const [settings, setSettings] = useState<ApplicationSettings>({
    startDate: new Date(),
    replaceExisting: false,
    adjustForGrowthStage: true,
    skipWeekends: false,
    customizations: {},
  });

  // Load all plants
  const loadPlants = useCallback(async () => {
    try {
      const plants = await database.get<Plant>('plants').query().fetch();
      setAllPlants(plants.filter(plant => !plant.isDeleted));
    } catch (error) {
      console.error('Error loading plants:', error);
    }
  }, [database]);

  // Generate preview for a plant
  const generatePreview = useCallback(async (plant: Plant): Promise<PlantApplicationPreview> => {
    const tasksToCreate: TemplateTaskData[] = [];
    const conflictingTasks: PlantTask[] = [];
    const warnings: string[] = [];
    let totalDuration = 0;

    // Get existing tasks for conflict detection
    const existingTasks = await database.get<PlantTask>('plant_tasks')
      .query(
        Q.where('plant_id', plant.id),
        Q.where('status', Q.notEq('completed'))
      )
      .fetch();

    // Process template tasks
    for (const templateTask of template.templateData) {
      const taskDate = addDays(settings.startDate, (templateTask.weekNumber - 1) * 7 + templateTask.dayOfWeek);
      
      // Skip weekends if setting is enabled
      if (settings.skipWeekends && (taskDate.getDay() === 0 || taskDate.getDay() === 6)) {
        continue;
      }

      // Check for conflicts
      const conflictingTask = existingTasks.find(task => 
        task.plantId === plant.id &&
        task.taskType === templateTask.taskType &&
        Math.abs(new Date(task.dueDate).getTime() - taskDate.getTime()) < 24 * 60 * 60 * 1000 // Same day
      );

      if (conflictingTask && !settings.replaceExisting) {
        conflictingTasks.push(conflictingTask);
        warnings.push(t('applicator.taskConflict', { 
          taskType: templateTask.taskType, 
          date: format(taskDate, 'MMM dd') 
        }));
      } else {
        tasksToCreate.push(templateTask);
        totalDuration += templateTask.estimatedDuration;
      }
    }

    // Growth stage warnings
    if (settings.adjustForGrowthStage) {
      const currentStage = plant.growthStage;
      const templateStages = template.templateData.map(task => task.taskType);
      
      if (currentStage === 'flowering' && templateStages.includes('transplant')) {
        warnings.push(t('applicator.growthStageWarning', { stage: currentStage }));
      }
    }

    return {
      plant,
      tasksToCreate,
      conflictingTasks,
      estimatedStartDate: settings.startDate,
      totalDuration,
      warnings,
    };
  }, [database, template, settings, t]);

  // Update previews when settings or selection changes
  useEffect(() => {
    const updatePreviews = async () => {
      const newPreviews: Record<string, PlantApplicationPreview> = {};
      
      for (const plant of selectedPlants) {
        try {
          newPreviews[plant.id] = await generatePreview(plant);
        } catch (error) {
          console.error('Error generating preview for plant:', plant.id, error);
        }
      }
      
      setPreviews(newPreviews);
    };

    if (selectedPlants.length > 0) {
      updatePreviews();
    }
  }, [selectedPlants, generatePreview]);

  // Load plants on mount
  useEffect(() => {
    if (visible) {
      loadPlants();
    }
  }, [visible, loadPlants]);

  // Handle plant selection toggle
  const handlePlantToggle = useCallback((plant: Plant) => {
    setSelectedPlants(prev => {
      const isSelected = prev.some(p => p.id === plant.id);
      if (isSelected) {
        return prev.filter(p => p.id !== plant.id);
      } else {
        return [...prev, plant];
      }
    });
  }, []);

  // Apply template to selected plants
  const handleApply = useCallback(async () => {
    if (selectedPlants.length === 0) {
      Alert.alert(
        t('applicator.noPlants'),
        t('applicator.noPlantsDescription')
      );
      return;
    }

    setLoading(true);
    const results: TemplateApplicationResult[] = [];

    try {
      await database.write(async () => {
        for (const plant of selectedPlants) {
          try {
            const preview = previews[plant.id];
            if (!preview) continue;

            let tasksCreated = 0;

            // Remove existing tasks if replace setting is enabled
            if (settings.replaceExisting && preview.conflictingTasks.length > 0) {
              for (const conflictingTask of preview.conflictingTasks) {
                await conflictingTask.markAsDeleted();
              }
            }

            // Create new tasks
            for (const templateTask of preview.tasksToCreate) {
              const taskDate = addDays(settings.startDate, (templateTask.weekNumber - 1) * 7 + templateTask.dayOfWeek);
              
              await database.get<PlantTask>('plant_tasks').create(task => {
                task.taskId = generateUuid();
                task.plantId = plant.id;
                task.title = templateTask.title;
                task.description = templateTask.description;
                
                // Validate and set task type with proper type safety
                if (!isTaskType(templateTask.taskType)) {
                  throw new Error(`Invalid task type: ${templateTask.taskType}`);
                }
                task.taskType = templateTask.taskType;
                
                task.dueDate = taskDate.toISOString();
                task.status = 'pending';
                task.userId = plant.userId;
                task.priority = templateTask.priority;
                task.estimatedDuration = templateTask.estimatedDuration;
                task.templateId = template.id;
                task.weekNumber = templateTask.weekNumber;
                task.autoGenerated = true;
              });

              tasksCreated++;
            }

            // Increment template usage count
            await template.incrementUsageCount();

            results.push({
              plantId: plant.id,
              plantName: plant.name,
              success: true,
              tasksCreated,
            });

          } catch (error) {
            console.error('Error applying template to plant:', plant.id, error);
            results.push({
              plantId: plant.id,
              plantName: plant.name,
              success: false,
              tasksCreated: 0,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      });

      triggerLightHaptic();
      onApply(results);

    } catch (error) {
      console.error('Error applying template:', error);
      triggerHeavyHaptic();
      Alert.alert(
        t('common.error'),
        t('applicator.applicationError')
      );
    } finally {
      setLoading(false);
    }
  }, [selectedPlants, previews, settings, database, template, onApply, t]);

  if (!visible) return null;

  return (
    <ThemedView className="flex-1 bg-black/50">
      <ThemedView className="flex-1 mt-20 bg-white dark:bg-neutral-900 rounded-t-3xl">
        {/* Header */}
        <View className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <ThemedText className="text-xl font-bold mb-1">
                {t('applicator.applyTemplate')}
              </ThemedText>
              <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
                {template.name}
              </ThemedText>
            </View>
            <Pressable
              onPress={onCancel}
              className="w-8 h-8 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800"
            >
              <OptimizedIcon name="close" size={20} color="#6B7280" />
            </Pressable>
          </View>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Application settings */}
          <ApplicationSettings
            settings={settings}
            onSettingsChange={setSettings}
            template={template}
          />

          {/* Plant selection */}
          <View className="p-4">
            <ThemedText className="text-lg font-semibold mb-4">
              {t('applicator.selectPlants')} ({selectedPlants.length})
            </ThemedText>

            <FlashListWrapper
              data={allPlants}
              renderItem={({ item }) => (
                <PlantSelectionCard
                  plant={item}
                  isSelected={selectedPlants.some(p => p.id === item.id)}
                  onToggle={handlePlantToggle}
                  preview={previews[item.id]}
                />
              )}
              estimatedItemSize={120}
              scrollEnabled={false}
            />
          </View>
        </ScrollView>

        {/* Footer */}
        <View className="p-4 border-t border-neutral-200 dark:border-neutral-700">
          <View className="flex-row space-x-3">
            <Pressable
              onPress={onCancel}
              className="flex-1 py-3 px-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg items-center"
            >
              <ThemedText className="font-medium text-neutral-700 dark:text-neutral-300">
                {t('common.cancel')}
              </ThemedText>
            </Pressable>
            
            <Pressable
              onPress={handleApply}
              disabled={loading || selectedPlants.length === 0}
              className={`flex-1 py-3 px-4 rounded-lg items-center ${
                loading || selectedPlants.length === 0
                  ? 'bg-neutral-300 dark:bg-neutral-700'
                  : 'bg-blue-500'
              }`}
            >
              {loading ? (
                <ThemedText className="font-medium text-white">
                  {t('applicator.applying')}...
                </ThemedText>
              ) : (
                <ThemedText className="font-medium text-white">
                  {t('applicator.applyToPlants', { count: selectedPlants.length })}
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </ThemedView>
    </ThemedView>
  );
};

export default TemplateApplicator;