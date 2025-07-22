import {
  triggerLightHapticSync,
  triggerMediumHaptic,
  triggerWarningHaptic,
} from '@/lib/utils/haptics';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View, Alert, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
// Modern animation imports
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnUI,
  interpolateColor as rInterpolateColor,
} from 'react-native-reanimated';

import { OptimizedIcon, IconName } from '../ui/OptimizedIcon';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';
import { MetricsInputForm } from '../plant-metrics/MetricsInputForm';
import { HarvestForm } from '../plant-harvest/HarvestForm';
import { useDatabase } from '@/lib/contexts/DatabaseProvider';
import { Plant } from '@/lib/models/Plant';
import { PlantMetrics } from '@/lib/models/PlantMetrics';

interface PlantActionsProps {
  plantId: string;
  onDelete: () => void;
}

interface ActionItemProps {
  iconName: IconName;
  label: string;
  onPress: () => void;
  isDestructive?: boolean;
  subLabel?: string;
}

// Modern animated action item component
function ActionItem({
  iconName,
  label,
  onPress,
  isDestructive = false,
  subLabel,
}: ActionItemProps) {
  // Reanimated v3 shared values
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);
  const shadowOpacity = useSharedValue(0.1);

  // Animated styles with React Compiler compatibility
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const backgroundColor = rInterpolateColor(
      pressed.value,
      [0, 1],
      isDestructive
        ? ['rgba(0, 0, 0, 0)', 'rgba(239, 68, 68, 0.1)']
        : ['rgba(0, 0, 0, 0)', 'rgba(34, 197, 94, 0.1)']
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
      shadowOpacity: shadowOpacity.value,
    };
  });

  // Modern gesture handling
  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
      pressed.value = withTiming(1, { duration: 150 });
      shadowOpacity.value = withTiming(0.2, { duration: 150 });

      // Run haptics on JS thread
      requestAnimationFrame(() => {
        triggerLightHapticSync();
      });
    })
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      pressed.value = withTiming(0, { duration: 200 });
      shadowOpacity.value = withTiming(0.1, { duration: 200 });

      // Execute onPress on JS thread
      requestAnimationFrame(() => {
        onPress();
      });
    });

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View style={animatedStyle}>
        <View
          className="flex-row items-center px-1 py-4"
          accessible
          accessibilityLabel={label}
          accessibilityRole="button">
          <View
            className={`rounded-xl p-3 ${
              isDestructive
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-primary-100 dark:bg-primary-900/30'
            }`}>
            <OptimizedIcon
              name={iconName}
              size={24}
              color={isDestructive ? '#ef4444' : '#10b981'}
            />
          </View>
          <View className="ml-4 flex-1">
            <ThemedText
              className={`text-lg font-semibold ${
                isDestructive
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-neutral-900 dark:text-white'
              }`}>
              {label}
            </ThemedText>
            {subLabel && (
              <ThemedText variant="muted" className="mt-0.5 text-sm">
                {subLabel}
              </ThemedText>
            )}
          </View>
          {!isDestructive && !subLabel && (
            <OptimizedIcon name="chevron-forward" size={20} color="#9ca3af" />
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

export function PlantActions({ plantId, onDelete }: PlantActionsProps) {
  const { t } = useTranslation('plants');
  const { database } = useDatabase();
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [showHarvestModal, setShowHarvestModal] = useState(false);
  const [plant, setPlant] = useState<Plant | null>(null);

  // Load plant data when modals are opened
  React.useEffect(() => {
    if ((showMetricsModal || showHarvestModal) && database) {
      const loadPlant = async () => {
        try {
          const plantRecord = await database.collections.get<Plant>('plants').find(plantId);
          setPlant(plantRecord);
        } catch (error) {
          console.error('Error loading plant:', error);
        }
      };
      loadPlant();
    }
  }, [showMetricsModal, showHarvestModal, database, plantId]);
  
  const handleGrowJournal = useCallback(() => {
    triggerMediumHaptic();
    router.push({
      pathname: '/(app)/plant/[id]/journal',
      params: { id: plantId },
    });
  }, [plantId]);

  const handleMetrics = useCallback(() => {
    triggerMediumHaptic();
    setShowMetricsModal(true);
  }, []);

  const handleHarvest = useCallback(() => {
    triggerMediumHaptic();
    setShowHarvestModal(true);
  }, []);

  const handleMetricsSubmit = useCallback(async (data: any) => {
    if (!database || !plant) return;
    
    try {
      await database.write(async () => {
        // Update plant with basic metrics
        await plant.update((p) => {
          if (data.healthPercentage !== undefined) p.healthPercentage = data.healthPercentage;
          if (data.nextWateringDays !== undefined) p.nextWateringDays = data.nextWateringDays;
          if (data.nextNutrientDays !== undefined) p.nextNutrientDays = data.nextNutrientDays;
          if (data.height !== undefined) p.height = data.height;
          if (data.nodeCount !== undefined) p.nodeCount = data.nodeCount;
          if (data.stemDiameter !== undefined) p.stemDiameter = data.stemDiameter;
          if (data.phLevel !== undefined) p.phLevel = data.phLevel;
          if (data.ecPpm !== undefined) p.ecPpm = data.ecPpm;
          if (data.temperature !== undefined) p.temperature = data.temperature;
          if (data.humidity !== undefined) p.humidity = data.humidity;
          if (data.vpd !== undefined) p.vpd = data.vpd;
          if (data.trichomeStatus !== undefined) p.trichomeStatus = data.trichomeStatus;
          if (data.pistilBrownPercentage !== undefined) p.pistilBrownPercentage = data.pistilBrownPercentage;
          if (data.budDensity !== undefined) p.budDensity = data.budDensity;
        });

        // Create metrics record
        const metricsCollection = database.collections.get<PlantMetrics>('plant_metrics');
        await metricsCollection.create((metrics) => {
          metrics.plantId = plantId;
          if (data.healthPercentage !== undefined) metrics.healthPercentage = data.healthPercentage;
          if (data.nextWateringDays !== undefined) metrics.nextWateringDays = data.nextWateringDays;
          if (data.nextNutrientDays !== undefined) metrics.nextNutrientDays = data.nextNutrientDays;
          if (data.height !== undefined) metrics.height = data.height;
          if (data.heightUnit !== undefined) metrics.heightUnit = data.heightUnit;
          if (data.nodeCount !== undefined) metrics.nodeCount = data.nodeCount;
          if (data.stemDiameter !== undefined) metrics.stemDiameter = data.stemDiameter;
          if (data.phLevel !== undefined) metrics.phLevel = data.phLevel;
          if (data.ecPpm !== undefined) metrics.ecPpm = data.ecPpm;
          if (data.temperature !== undefined) metrics.temperature = data.temperature;
          if (data.temperatureUnit !== undefined) metrics.temperatureUnit = data.temperatureUnit;
          if (data.humidity !== undefined) metrics.humidity = data.humidity;
          if (data.vpd !== undefined) metrics.vpd = data.vpd;
          if (data.trichomeStatus !== undefined) metrics.trichomeStatus = data.trichomeStatus;
          if (data.pistilBrownPercentage !== undefined) metrics.pistilBrownPercentage = data.pistilBrownPercentage;
          if (data.budDensity !== undefined) metrics.budDensity = data.budDensity;
          if (data.notes !== undefined) metrics.notes = data.notes;
        });
      });

      setShowMetricsModal(false);
      Alert.alert(t('success'), t('metricsUpdated'));
    } catch (error) {
      console.error('Error saving metrics:', error);
      Alert.alert(t('error'), t('failedToSaveMetrics'));
    }
  }, [database, plant, plantId, t]);

  const handleHarvestSubmit = useCallback(async (data: any) => {
    if (!database || !plant) return;
    
    try {
      await database.write(async () => {
        await plant.update((p) => {
          p.wetWeight = data.wetWeight || data.wet_weight; // Support both formats for backward compatibility
          p.dryWeight = data.dryWeight || data.dry_weight;
          p.trimWeight = data.trimWeight || data.trim_weight;
          p.harvestDate = data.harvestDate || data.harvest_date;
          p.growthStage = 'harvest';
        });
      });

      setShowHarvestModal(false);
      Alert.alert(t('success'), t('harvestRecorded'));
    } catch (error) {
      console.error('Error saving harvest:', error);
      Alert.alert(t('error'), t('failedToSaveHarvest'));
    }
  }, [database, plant, t]);

  const handleDelete = useCallback(() => {
    triggerWarningHaptic();
    onDelete();
  }, [onDelete]);

  return (
    <>
      <ThemedView variant="card" className="mb-4 mt-2 rounded-3xl p-2 shadow-lg">
        <ActionItem iconName="journal-outline" label={t('growJournal')} onPress={handleGrowJournal} />

        <View className="mx-4 h-px bg-neutral-200 dark:bg-neutral-700" />

        <ActionItem
          iconName="stats-chart-outline"
          label={t('metrics')}
          onPress={handleMetrics}
          subLabel={t('trackPlantHealth')}
        />

        <View className="mx-4 h-px bg-neutral-200 dark:bg-neutral-700" />

        <ActionItem
          iconName="leaf-outline"
          label={t('harvest')}
          onPress={handleHarvest}
          subLabel={t('recordHarvestData')}
        />

        <View className="mx-4 h-px bg-neutral-200 dark:bg-neutral-700" />

        <ActionItem
          iconName="trash-outline"
          label={t('deletePlant')}
          onPress={handleDelete}
          isDestructive
        />
      </ThemedView>

      {/* Metrics Modal */}
      <Modal
        visible={showMetricsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMetricsModal(false)}
      >
        <ThemedView className="flex-1">
          {plant && (
            <MetricsInputForm
              plantId={plantId}
              onSubmit={handleMetricsSubmit}
              onCancel={() => setShowMetricsModal(false)}
            />
          )}
        </ThemedView>
      </Modal>

      {/* Harvest Modal */}
      <Modal
        visible={showHarvestModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHarvestModal(false)}
      >
        <ThemedView className="flex-1">
          {plant && (
            <HarvestForm
              plant={plant}
              onSubmit={handleHarvestSubmit}
              onCancel={() => setShowHarvestModal(false)}
            />
          )}
        </ThemedView>
      </Modal>
    </>
  );
}
