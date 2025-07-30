/**
 * Flowering Prediction Card Component
 * 
 * Displays flowering time and harvest date predictions based on strain characteristics.
 * Part of task 6.1: Connect calendar with plant strain characteristics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';

import { StrainCalendarIntegrationService, FloweringPrediction } from '../../lib/services/StrainCalendarIntegrationService';
import { Plant } from '../../lib/models/Plant';
import { formatDate, getDaysUntil } from '../../lib/utils/date';
import { log } from '../../lib/utils/logger';

interface FloweringPredictionCardProps {
  plant: Plant;
  onPredictionUpdate?: (prediction: FloweringPrediction | null) => void;
  compact?: boolean;
}

interface PredictionStageProps {
  title: string;
  date: Date;
  isActive: boolean;
  isCompleted: boolean;
  daysUntil: number;
}

const PredictionStage: React.FC<PredictionStageProps> = ({
  title,
  date,
  isActive,
  isCompleted,
  daysUntil,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isActive ? 1 : 0.6),
      transform: [{ scale: withSpring(isActive ? 1.02 : 1) }],
    };
  });

  // Use semantic tokens for status colors
  const getStatusColor = (): string => {
    if (isCompleted) return 'bg-success-500'; // completed = success
    if (isActive) return 'bg-primary-500 dark:bg-primary-600'; // active = primary
    return 'bg-neutral-200 dark:bg-neutral-700'; // default = neutral surface
  };

  const getStatusText = (): string => {
    if (isCompleted) return 'Completed';
    if (daysUntil < 0) return `${Math.abs(daysUntil)} days overdue`;
    if (daysUntil === 0) return 'Today';
    if (daysUntil === 1) return 'Tomorrow';
    return `${daysUntil} days`;
  };

  return (
    <Animated.View style={animatedStyle} className="flex-row items-center mb-3">
      {/* Status indicator */}
      <View className={`w-3 h-3 rounded-full ${getStatusColor()} mr-3`} />
      
      {/* Content */}
      <View className="flex-1">
        <Text className="text-sm font-medium text-on-surface dark:text-on-surface-dark">
          {title}
        </Text>
        <Text className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark">
          {formatDate(date)} • {getStatusText()}
        </Text>
      </View>
    </Animated.View>
  );
};

const ConfidenceBadge: React.FC<{ level: 'low' | 'medium' | 'high' }> = ({ level }) => {
  // Use semantic tokens for confidence colors
  const getConfidenceColor = (): string => {
    switch (level) {
      case 'high': return 'bg-success-500';
      case 'medium': return 'bg-warning-500';
      case 'low': return 'bg-warning-600';
    }
  };

  const getConfidenceText = (): string => {
    switch (level) {
      case 'high': return 'High Confidence';
      case 'medium': return 'Medium Confidence';
      case 'low': return 'Low Confidence';
    }
  };

  return (
    <View className={`${getConfidenceColor()} px-2 py-1 rounded-full`}>
      <Text className="text-xs font-medium text-white">
        {getConfidenceText()}
      </Text>
    </View>
  );
};

export const FloweringPredictionCard: React.FC<FloweringPredictionCardProps> = ({
  plant,
  onPredictionUpdate,
  compact = false,
}) => {
  const [prediction, setPrediction] = useState<FloweringPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!compact);

  const loadPrediction = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      log.info(`[FloweringPrediction] Loading prediction for plant ${plant.name}`);
      
      const result = await StrainCalendarIntegrationService.predictFloweringAndHarvest(plant);
      
      setPrediction(result);
      onPredictionUpdate?.(result);
      
      if (result) {
        log.info(`[FloweringPrediction] Prediction loaded for ${plant.name}`);
      } else {
        log.warn(`[FloweringPrediction] No prediction available for ${plant.name}`);
      }
    } catch (err) {
      log.error('[FloweringPrediction] Error loading prediction:', err);
      setError('Failed to load flowering prediction');
    } finally {
      setLoading(false);
    }
  }, [plant, onPredictionUpdate]);

  useEffect(() => {
    loadPrediction();
  }, [loadPrediction]);

  const getCurrentStage = (): 'vegetative' | 'flowering' | 'harvest' => {
    if (!prediction) return 'vegetative';
    
    const now = new Date();
    if (now >= prediction.expectedHarvestDate) return 'harvest';
    if (now >= prediction.expectedFloweringStart) return 'flowering';
    return 'vegetative';
  };

  const toggleExpanded = useCallback(() => {
    if (compact) {
      setExpanded(!expanded);
    }
  }, [compact, expanded]);

  if (loading) {
    return (
      <View className="bg-surface dark:bg-surface-dark rounded-xl p-4 mb-4">
        <View className="flex-row items-center">
          <View className="w-4 h-4 border-2 border-primary dark:border-primary-dark border-t-transparent rounded-full animate-spin mr-3" />
          <Text className="text-sm text-on-surface-variant dark:text-on-surface-variant-dark">
            Calculating flowering prediction...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !prediction) {
    return (
      <View className="bg-surface dark:bg-surface-dark rounded-xl p-4 mb-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-on-surface-variant dark:text-on-surface-variant-dark flex-1">
            {error || 'Flowering prediction not available'}
          </Text>
          <Pressable
            onPress={loadPrediction}
            className="bg-primary dark:bg-primary-dark px-3 py-1 rounded-lg ml-3"
            accessibilityRole="button"
            accessibilityLabel="Retry loading flowering prediction"
          >
            <Text className="text-xs text-on-primary dark:text-on-primary-dark font-medium">
              Retry
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const currentStage = getCurrentStage();
  const floweringDaysUntil = getDaysUntil(prediction.expectedFloweringStart);
  const harvestDaysUntil = getDaysUntil(prediction.expectedHarvestDate);

  return (
    <View className="bg-surface dark:bg-surface-dark rounded-xl p-4 mb-4 border border-outline/20 dark:border-outline-dark/20">
      {/* Header */}
      <Pressable
        onPress={toggleExpanded}
        disabled={!compact}
        accessibilityRole="button"
        accessibilityLabel="Toggle flowering prediction details"
      >
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-1">
            <Text className="text-lg font-semibold text-on-surface dark:text-on-surface-dark">
              Flowering Prediction
            </Text>
            <Text className="text-sm text-on-surface-variant dark:text-on-surface-variant-dark">
              {prediction.strainName}
            </Text>
          </View>
          
          <View className="flex-row items-center space-x-2">
            <ConfidenceBadge level={prediction.confidenceLevel} />
            {compact && (
              <Text className="text-on-surface-variant dark:text-on-surface-variant-dark">
                {expanded ? '−' : '+'}
              </Text>
            )}
          </View>
        </View>
      </Pressable>

      {/* Prediction stages */}
      {expanded && (
        <View className="space-y-2">
          <PredictionStage
            title="Flowering Start"
            date={prediction.expectedFloweringStart}
            isActive={currentStage === 'vegetative'}
            isCompleted={currentStage !== 'vegetative'}
            daysUntil={floweringDaysUntil}
          />
          
          <PredictionStage
            title="Flowering End"
            date={prediction.expectedFloweringEnd}
            isActive={currentStage === 'flowering'}
            isCompleted={currentStage === 'harvest'}
            daysUntil={getDaysUntil(prediction.expectedFloweringEnd)}
          />
          
          <PredictionStage
            title="Harvest Ready"
            date={prediction.expectedHarvestDate}
            isActive={currentStage === 'harvest'}
            isCompleted={false}
            daysUntil={harvestDaysUntil}
          />

          {/* Factors affecting prediction */}
          {prediction.factors.length > 0 && (
            <View className="mt-4 pt-3 border-t border-outline/10 dark:border-outline-dark/10">
              <Text className="text-xs font-medium text-on-surface-variant dark:text-on-surface-variant-dark mb-2">
                Prediction factors:
              </Text>
              {prediction.factors.map((factor, index) => (
                <Text
                  key={index}
                  className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark mb-1"
                >
                  • {factor}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Compact summary */}
      {!expanded && compact && (
        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-on-surface-variant dark:text-on-surface-variant-dark">
            Flowering in {floweringDaysUntil > 0 ? `${floweringDaysUntil} days` : 'progress'}
          </Text>
          <Text className="text-sm text-on-surface-variant dark:text-on-surface-variant-dark">
            Harvest in {harvestDaysUntil > 0 ? `${harvestDaysUntil} days` : 'ready'}
          </Text>
        </View>
      )}
    </View>
  );
};