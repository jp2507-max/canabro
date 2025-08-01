/**
 * Strain Template Recommendations Component
 * 
 * Displays strain-based template recommendations for calendar scheduling.
 * Part of task 6.1: Connect calendar with plant strain characteristics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { StrainCalendarIntegrationService, StrainTemplateRecommendation } from '../../lib/services/StrainCalendarIntegrationService';
import { useButtonAnimation } from '../../lib/animations/useButtonAnimation';
import { log } from '../../lib/utils/logger';

interface StrainTemplateRecommendationsProps {
  strainId: string;
  strainName: string;
  growingEnvironment?: 'indoor' | 'outdoor' | 'hydroponic';
  onTemplateSelect: (templateId: string, templateName: string) => void;
  onClose?: () => void;
}

interface RecommendationCardProps {
  recommendation: StrainTemplateRecommendation;
  onSelect: (templateId: string, templateName: string) => void;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation, onSelect }) => {
  const { animatedStyle, handlers } = useButtonAnimation({
    enableHaptics: true,
    onPress: () => onSelect(recommendation.templateId, recommendation.templateName),
  });

  const getMatchScoreColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const getMatchScoreText = (score: number): string => {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Good Match';
    return 'Fair Match';
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        {...handlers}
        className="bg-surface dark:bg-surface-dark rounded-xl p-4 mb-3 border border-outline/20 dark:border-outline-dark/20"
        accessibilityRole="button"
        accessibilityLabel={`Apply template: ${recommendation.templateName}. ${recommendation.strainType}, estimated duration ${recommendation.estimatedDuration} weeks. Match score ${recommendation.matchScore} percent.`}
        accessibilityHint="Tap to apply this template to your calendar."
      >
        {/* Header with template name and match score */}
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 mr-3">
            <Text className="text-lg font-semibold text-on-surface dark:text-on-surface-dark">
              {recommendation.templateName}
            </Text>
            <Text className="text-sm text-on-surface-variant dark:text-on-surface-variant-dark mt-1">
              {recommendation.strainType} • {recommendation.estimatedDuration} weeks
            </Text>
          </View>
          
          <View className="items-end">
            <View className={`${getMatchScoreColor(recommendation.matchScore)} px-3 py-1 rounded-full`}>
              <Text className="text-xs font-medium text-white">
                {recommendation.matchScore}%
              </Text>
            </View>
            <Text className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark mt-1">
              {getMatchScoreText(recommendation.matchScore)}
            </Text>
          </View>
        </View>

        {/* Reasons for recommendation */}
        <View>
          {recommendation.reasons.map((reason, index) => {
            const isLast = index === recommendation.reasons.length - 1;
            return (
              <View
                key={index}
                className={`flex-row items-center${!isLast ? ' mb-1' : ''}`}
              >
                <View className="w-1.5 h-1.5 bg-primary dark:bg-primary-dark rounded-full mr-2" />
                <Text className="text-sm text-on-surface-variant dark:text-on-surface-variant-dark flex-1">
                  {reason}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Action hint */}
        <View className="mt-3 pt-3 border-t border-outline/10 dark:border-outline-dark/10">
          <Text className="text-xs text-primary dark:text-primary-dark font-medium">
            Tap to apply this template
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export const StrainTemplateRecommendations: React.FC<StrainTemplateRecommendationsProps> = ({
  strainId,
  strainName,
  growingEnvironment = 'indoor',
  onTemplateSelect,
  onClose,
}) => {
  const [recommendations, setRecommendations] = useState<StrainTemplateRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      log.info(`[StrainTemplateRecommendations] Loading recommendations for strain ${strainId}`);
      
      const results = await StrainCalendarIntegrationService.getStrainBasedTemplateRecommendations(
        strainId,
        growingEnvironment
      );
      
      setRecommendations(results);
      log.info(`[StrainTemplateRecommendations] Loaded ${results.length} recommendations`);
    } catch (err) {
      log.error('[StrainTemplateRecommendations] Error loading recommendations:', err);
      setError('Failed to load template recommendations');
    } finally {
      setLoading(false);
    }
  }, [strainId, growingEnvironment]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const handleTemplateSelect = useCallback((templateId: string, templateName: string) => {
    log.info(`[StrainTemplateRecommendations] Template selected: ${templateName}`);
    onTemplateSelect(templateId, templateName);
  }, [onTemplateSelect]);

  const renderRecommendation = useCallback(({ item }: { item: StrainTemplateRecommendation }) => (
    <RecommendationCard
      recommendation={item}
      onSelect={handleTemplateSelect}
    />
  ), [handleTemplateSelect]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center p-6">
        <ActivityIndicator size="large" color="#4F46E5" className="mb-4" />
        <Text className="text-on-surface-variant dark:text-on-surface-variant-dark text-center">
          Finding the best templates for {strainName}...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center p-6">
        <Text className="text-error dark:text-error-dark text-center mb-4">
          {error}
        </Text>
        <Pressable
          onPress={loadRecommendations}
          className="bg-primary dark:bg-primary-dark px-4 py-2 rounded-lg"
          accessibilityRole="button"
          accessibilityLabel="Retry loading recommendations"
        >
          <Text className="text-on-primary dark:text-on-primary-dark font-medium">
            Try Again
          </Text>
        </Pressable>
      </View>
    );
  }

  if (recommendations.length === 0) {
    return (
      <View className="flex-1 justify-center items-center p-6">
        <Text className="text-on-surface-variant dark:text-on-surface-variant-dark text-center mb-2">
          No template recommendations found for {strainName}
        </Text>
        <Text className="text-sm text-on-surface-variant dark:text-on-surface-variant-dark text-center">
          Try creating a custom template for this strain type
        </Text>
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
              Template Recommendations
            </Text>
            <Text className="text-sm text-on-surface-variant dark:text-on-surface-variant-dark mt-1">
              Best templates for {strainName} ({growingEnvironment})
            </Text>
          </View>
          
          {onClose && (
            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-surface-variant dark:bg-surface-variant-dark items-center justify-center"
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Text className="text-on-surface-variant dark:text-on-surface-variant-dark font-bold">
                ×
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Recommendations List */}
      <View className="flex-1 p-4">
        <FlashList
          data={recommendations}
          renderItem={renderRecommendation}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>

      {/* Footer info */}
      <View className="p-4 bg-surface-variant/50 dark:bg-surface-variant-dark/50">
        <Text className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark text-center">
          Recommendations based on strain characteristics, growing environment, and community usage
        </Text>
      </View>
    </View>
  );
};