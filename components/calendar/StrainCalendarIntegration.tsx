/**
 * Strain Calendar Integration Component
 * 
 * Main component that integrates strain-specific features into the calendar system.
 * Combines template recommendations, flowering predictions, and strain comparisons.
 * Part of task 6.1: Connect calendar with plant strain characteristics
 */

import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { Plant } from '../../lib/models/Plant';
import { FloweringPredictionCard } from './FloweringPredictionCard';
import { StrainTemplateRecommendations } from '../schedule-templates/StrainTemplateRecommendations';
import { StrainScheduleComparison } from './StrainScheduleComparison';
import { useButtonAnimation } from '../../lib/animations/useButtonAnimation';
import { log } from '../../lib/utils/logger';

interface StrainCalendarIntegrationProps {
  plant: Plant;
  onTemplateApply?: (templateId: string, templateName: string) => void;
  onScheduleUpdate?: () => void;
  comparisonStrainId?: string; // Optional strain to compare with
}

interface ActionButtonProps {
  title: string;
  subtitle: string;
  onPress: () => void;
  icon: string;
  disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  title,
  subtitle,
  onPress,
  icon,
  disabled = false,
}) => {
  const { animatedStyle, handlers } = useButtonAnimation({
    enableHaptics: true,
    onPress: disabled ? undefined : onPress,
  });

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        {...handlers}
        disabled={disabled}
        className={`bg-surface dark:bg-surface-dark rounded-xl p-4 border border-outline/20 dark:border-outline-dark/20 ${
          disabled ? 'opacity-50' : ''
        }`}
      >
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-primary/10 dark:bg-primary-dark/10 rounded-full items-center justify-center mr-3">
            <Text className="text-lg">{icon}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-on-surface dark:text-on-surface-dark">
              {title}
            </Text>
            <Text className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark mt-1">
              {subtitle}
            </Text>
          </View>
          <Text className="text-on-surface-variant dark:text-on-surface-variant-dark">
            →
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export const StrainCalendarIntegration: React.FC<StrainCalendarIntegrationProps> = ({
  plant,
  onTemplateApply,
  onScheduleUpdate,
  comparisonStrainId,
}) => {
  const [showTemplateRecommendations, setShowTemplateRecommendations] = useState(false);
  const [showStrainComparison, setShowStrainComparison] = useState(false);

  const handleTemplateSelect = useCallback((templateId: string, templateName: string) => {
    log.info(`[StrainCalendarIntegration] Template selected: ${templateName} for plant ${plant.name}`);
    setShowTemplateRecommendations(false);
    onTemplateApply?.(templateId, templateName);
  }, [plant.name, onTemplateApply]);

  const handleShowTemplateRecommendations = useCallback(() => {
    if (!plant.strainId) {
      log.warn(`[StrainCalendarIntegration] No strain ID for plant ${plant.name}`);
      return;
    }
    setShowTemplateRecommendations(true);
  }, [plant.strainId, plant.name]);

  const handleShowStrainComparison = useCallback(() => {
    if (!plant.strainId || !comparisonStrainId) {
      log.warn(`[StrainCalendarIntegration] Missing strain IDs for comparison`);
      return;
    }
    setShowStrainComparison(true);
  }, [plant.strainId, comparisonStrainId]);

  const hasStrainData = Boolean(plant.strainId);
  const canCompare = Boolean(plant.strainId && comparisonStrainId);

  return (
    <View className="space-y-4">
      {/* Flowering Prediction Card */}
      {hasStrainData && (
        <FloweringPredictionCard
          plant={plant}
          onPredictionUpdate={onScheduleUpdate}
        />
      )}

      {/* Strain-specific Actions */}
      <View className="space-y-3">
        <Text className="text-lg font-semibold text-on-background dark:text-on-background-dark">
          Strain-Specific Features
        </Text>

        <ActionButton
          title="Template Recommendations"
          subtitle={hasStrainData ? "Get templates optimized for this strain" : "Strain data required"}
          icon="📋"
          onPress={handleShowTemplateRecommendations}
          disabled={!hasStrainData}
        />

        {canCompare && (
          <ActionButton
            title="Compare Strain Schedules"
            subtitle="Compare with another strain's growing schedule"
            icon="⚖️"
            onPress={handleShowStrainComparison}
          />
        )}

        {!hasStrainData && (
          <View className="bg-surface-variant/50 dark:bg-surface-variant-dark/50 rounded-xl p-4">
            <Text className="text-sm text-on-surface-variant dark:text-on-surface-variant-dark text-center">
              Add strain information to unlock strain-specific scheduling features
            </Text>
          </View>
        )}
      </View>

      {/* Template Recommendations Modal */}
      <Modal
        visible={showTemplateRecommendations}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {plant.strainId && (
          <StrainTemplateRecommendations
            strainId={plant.strainId}
            strainName={plant.strain}
            growingEnvironment={plant.locationDescription?.toLowerCase().includes('outdoor') ? 'outdoor' : 'indoor'}
            onTemplateSelect={handleTemplateSelect}
            onClose={() => setShowTemplateRecommendations(false)}
          />
        )}
      </Modal>

      {/* Strain Comparison Modal */}
      <Modal
        visible={showStrainComparison}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {plant.strainId && comparisonStrainId && (
          <StrainScheduleComparison
            strainIdA={plant.strainId}
            strainIdB={comparisonStrainId}
            onClose={() => setShowStrainComparison(false)}
          />
        )}
      </Modal>
    </View>
  );
};