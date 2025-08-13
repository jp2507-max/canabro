/**
 * Strain Schedule Comparison Component
 * 
 * Displays comparison between different strain schedules for optimization.
 * Part of task 6.1: Connect calendar with plant strain characteristics
 * R6-AC5: WHEN comparing plants THEN the calendar SHALL show how different schedules affected outcomes
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { StrainCalendarIntegrationService } from '../../lib/services/StrainCalendarIntegrationService';
import type { StrainScheduleComparison as StrainScheduleComparisonType } from '../../lib/services/StrainCalendarIntegrationService';
import { TaskType } from '../../lib/types/taskTypes';
import { log } from '../../lib/utils/logger';

interface StrainScheduleComparisonProps {
  strainIdA: string;
  strainIdB: string;
  onClose?: () => void;
}

interface TaskFrequencyComparisonProps {
  taskType: TaskType;
  difference: number;
}

interface BasicStrainInfo {
  name: string;
  type?: string;
  floweringTime?: number;
  growDifficulty?: string;
}

interface StrainInfoCardProps {
  strain: BasicStrainInfo;
  label: string;
}

const TaskFrequencyComparison: React.FC<TaskFrequencyComparisonProps> = ({
  taskType,
  difference,
}) => {
  const getDifferenceColor = (diff: number): string => {
    if (Math.abs(diff) < 10) return 'text-muted-foreground'; // semantic neutral
    if (diff > 0) return 'text-success-foreground'; // semantic positive
    return 'text-error-foreground'; // semantic negative
  };

  const getDifferenceText = (diff: number): string => {
    if (Math.abs(diff) < 5) return 'Similar frequency';
    if (diff > 0) return `${diff}% more frequent`;
    return `${Math.abs(diff)}% less frequent`;
  };

  const getTaskTypeLabel = (type: TaskType): string => {
    const labels: Record<TaskType, string> = {
      watering: 'Watering',
      feeding: 'Feeding',
      inspection: 'Inspection',
      pruning: 'Pruning',
      training: 'Training',
      defoliation: 'Defoliation',
      flushing: 'Flushing',
      harvest: 'Harvest',
      transplant: 'Transplant',
    };
    return labels[type] || type;
  };

  return (
    <View className="flex-row justify-between items-center py-2 border-b border-outline/10 dark:border-outline-dark/10">
      <Text className="text-sm text-on-surface dark:text-on-surface-dark">
        {getTaskTypeLabel(taskType)}
      </Text>
      <Text className={`text-sm font-medium ${getDifferenceColor(difference)}`}>
        {getDifferenceText(difference)}
      </Text>
    </View>
  );
};

const StrainInfoCard: React.FC<StrainInfoCardProps> = ({ strain, label }) => {
  return (
    <View className="bg-surface-variant/50 dark:bg-surface-variant-dark/50 rounded-lg p-3 flex-1">
      <Text className="text-xs font-medium text-primary dark:text-primary-dark mb-1">
        {label}
      </Text>
      <Text className="text-lg font-bold text-on-surface dark:text-on-surface-dark mb-1">
        {strain.name}
      </Text>
      <View className="space-y-1">
        <Text className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark">
          Type: {strain.type}
        </Text>
        {strain.floweringTime && (
          <Text className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark">
            Flowering: {strain.floweringTime} weeks
          </Text>
        )}
        {strain.growDifficulty && (
          <Text className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark">
            Difficulty: {strain.growDifficulty}
          </Text>
        )}
      </View>
    </View>
  );
};

const TimelineDifference: React.FC<{
  title: string;
  difference: number;
  unit: string;
}> = ({ title, difference, unit }) => {
  const getDifferenceColor = (diff: number): string => {
    if (Math.abs(diff) < 1) return 'text-on-surface-variant dark:text-on-surface-variant-dark';
    if (diff > 0) return 'text-warning dark:text-warning-dark';
    return 'text-success dark:text-success-dark';
  };

  const getDifferenceText = (diff: number, unit: string): string => {
    if (Math.abs(diff) < 1) return 'Same timeline';
    if (diff > 0) return `${Math.abs(diff)} ${unit} longer`;
    return `${Math.abs(diff)} ${unit} shorter`;
  };

  return (
    <View className="flex-row justify-between items-center py-2">
      <Text className="text-sm text-on-surface dark:text-on-surface-dark">
        {title}
      </Text>
      <Text className={`text-sm font-medium ${getDifferenceColor(difference)}`}>
        {getDifferenceText(difference, unit)}
      </Text>
    </View>
  );
};

export const StrainScheduleComparison: React.FC<StrainScheduleComparisonProps> = ({
  strainIdA,
  strainIdB,
  onClose,
}) => {
  const [comparison, setComparison] = useState<StrainScheduleComparisonType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadComparison = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      log.info(`[StrainComparison] Comparing strains ${strainIdA} and ${strainIdB}`);
      
      const result = await StrainCalendarIntegrationService.compareStrainSchedules(
        strainIdA,
        strainIdB
      );
      
      setComparison(result);
      
      if (result) {
        log.info(`[StrainComparison] Comparison completed`);
      } else {
        log.warn(`[StrainComparison] No comparison data available`);
      }
    } catch (err) {
      log.error('[StrainComparison] Error loading comparison:', err);
      setError('Failed to load strain comparison');
    } finally {
      setLoading(false);
    }
  }, [strainIdA, strainIdB]);

  useEffect(() => {
    loadComparison();
  }, [loadComparison]);

  if (loading) {
    return (
      <View className="flex-1 bg-background dark:bg-background-dark">
        <View className="flex-1 justify-center items-center p-6">
          <View
            className="w-8 h-8 border-2 border-primary dark:border-primary-dark border-t-transparent rounded-full animate-spin mb-4"
            accessibilityRole="progressbar"
            accessibilityLabel="Loading, comparing strain schedules"
          />
          <Text className="text-on-surface-variant dark:text-on-surface-variant-dark text-center">
            Comparing strain schedules...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !comparison) {
    return (
      <View className="flex-1 bg-background dark:bg-background-dark">
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-error dark:text-error-dark text-center mb-4">
            {error || 'Comparison data not available'}
          </Text>
          <Pressable
            onPress={loadComparison}
            className="bg-primary dark:bg-primary-dark px-4 py-2 rounded-lg"
          >
            <Text className="text-on-primary dark:text-on-primary-dark font-medium">
              Try Again
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      {/* Header */}
      <View className="p-4 border-b border-outline/20 dark:border-outline-dark/20">
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-xl font-bold text-on-background dark:text-on-background-dark">
              Strain Schedule Comparison
            </Text>
            <Text className="text-sm text-on-surface-variant dark:text-on-surface-variant-dark mt-1">
              Compare growing schedules and optimize your cultivation
            </Text>
          </View>
          
          {onClose && (
            <Pressable
              onPress={onClose}
              accessibilityLabel="Close"
              accessibilityRole="button"
              className="w-8 h-8 rounded-full bg-surface-variant dark:bg-surface-variant-dark items-center justify-center"
            >
              <Text className="text-on-surface-variant dark:text-on-surface-variant-dark font-bold">
                ×
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Strain Info Cards */}
        <View className="p-4">
          <View className="flex-row space-x-3 mb-6">
            <StrainInfoCard strain={comparison.strainA} label="Strain A" />
            <StrainInfoCard strain={comparison.strainB} label="Strain B" />
          </View>

          {/* Task Frequency Differences */}
          <View className="bg-surface dark:bg-surface-dark rounded-xl p-4 mb-4">
            <Text className="text-lg font-semibold text-on-surface dark:text-on-surface-dark mb-3">
              Task Frequency Differences
            </Text>
            <Text className="text-sm text-on-surface-variant dark:text-on-surface-variant-dark mb-4">
              How often each strain requires different care tasks
            </Text>
            
            {Object.entries(comparison.taskFrequencyDifferences).map(([taskType, difference]) => (
              <TaskFrequencyComparison
                key={taskType}
                taskType={taskType as TaskType}
                difference={difference as number}
              />
            ))}
          </View>

          {/* Timeline Differences */}
          <View className="bg-surface dark:bg-surface-dark rounded-xl p-4 mb-4">
            <Text className="text-lg font-semibold text-on-surface dark:text-on-surface-dark mb-3">
              Timeline Differences
            </Text>
            <Text className="text-sm text-on-surface-variant dark:text-on-surface-variant-dark mb-4">
              How the growing timelines compare between strains
            </Text>
            
            <TimelineDifference
              title="Harvest Date"
              difference={comparison.timelineDifferences.harvestDate}
              unit="days"
            />
            <TimelineDifference
              title="Total Cycle"
              difference={comparison.timelineDifferences.totalCycle}
              unit="days"
            />
          </View>

          {/* Compatibility Flags */}
          {comparison.conflicts && comparison.conflicts.length > 0 && (
            <View
              className="bg-warning/10 dark:bg-warning-dark/10 rounded-xl p-4 mb-4"
              accessibilityRole="list"
              accessibilityLabel="Compatibility flags"
            >
              <Text
                className="text-lg font-semibold text-warning dark:text-warning-dark mb-3"
                accessibilityRole="header"
              >
                Compatibility Flags
              </Text>
              {comparison.conflicts.map((c, i) => (
                <View
                  key={i}
                  className="flex-row items-start mb-2"
                  accessible
                  accessibilityLabel={c}
                >
                  <View
                    className="w-2 h-2 bg-warning dark:bg-warning-dark rounded-full mt-2 mr-3"
                    accessible={false}
                  />
                  <Text
                    className="text-sm text-on-surface dark:text-on-surface-dark flex-1"
                    accessibilityRole="text"
                  >
                    {c}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Optimization Recommendations */}
          {comparison.recommendations.length > 0 && (
            <View className="bg-surface dark:bg-surface-dark rounded-xl p-4 mb-4">
              <Text className="text-lg font-semibold text-on-surface dark:text-on-surface-dark mb-3">
                Optimization Recommendations
              </Text>
              <Text className="text-sm text-on-surface-variant dark:text-on-surface-variant-dark mb-4">
                Tips for optimizing your growing schedule
              </Text>
              
              {comparison.recommendations.map((recommendation: string, index: number) => (
                <View key={index} className="flex-row items-start mb-3">
                  <View className="w-2 h-2 bg-primary dark:bg-primary-dark rounded-full mt-2 mr-3" />
                  <Text className="text-sm text-on-surface dark:text-on-surface-dark flex-1">
                    {recommendation}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Summary */}
          <View className="bg-primary/10 dark:bg-primary-dark/10 rounded-xl p-4">
            <Text className="text-sm font-medium text-primary dark:text-primary-dark mb-2">
              Summary
            </Text>
            <Text className="text-sm text-on-surface dark:text-on-surface-dark">
              Use this comparison to optimize your growing schedule and choose the best strain 
              for your available time and resources. Consider the task frequency differences 
              when planning multiple plants.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};
