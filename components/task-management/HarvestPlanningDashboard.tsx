import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Alert } from 'react-native';
import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { useButtonAnimation } from '../../lib/animations/useButtonAnimation';
import { triggerMediumHaptic } from '../../lib/utils/haptics';
import { log } from '../../lib/utils/logger';
import { formatDate, addDays } from '../../lib/utils/date';
import Animated from 'react-native-reanimated';

import { Plant } from '../../lib/models/Plant';
import { HarvestPredictionService, HarvestPrediction, HarvestWindow } from '../../lib/services/HarvestPredictionService';
import { HarvestPreparationAutomator } from '../../lib/services/HarvestPreparationAutomator';
import { PostHarvestScheduler } from '../../lib/services/PostHarvestScheduler';
import { HarvestDataIntegrator, HarvestComparison, FuturePlanningData } from '../../lib/services/HarvestDataIntegrator';

interface HarvestPlanningDashboardProps {
  plants: Plant[];
  onPlantSelect?: (plant: Plant) => void;
  onTasksGenerated?: () => void;
}

interface DashboardData {
  upcomingHarvests: Array<{
    plant: Plant;
    prediction: HarvestPrediction;
    window: HarvestWindow;
  }>;
  harvestComparison?: HarvestComparison;
  futurePlanning?: FuturePlanningData;
  readyForPreparation: Plant[];
}

interface TabButtonProps {
  tab: 'overview' | 'predictions' | 'analytics' | 'planning';
  label: string;
  activeTab: 'overview' | 'predictions' | 'analytics' | 'planning';
  setActiveTab: (tab: 'overview' | 'predictions' | 'analytics' | 'planning') => void;
}

const TabButton: React.FC<TabButtonProps> = ({ tab, label, activeTab, setActiveTab }) => {
  const { animatedStyle, handlers } = useButtonAnimation({
    enableHaptics: true,
    onPress: () => setActiveTab(tab),
  });

  const isActive = activeTab === tab;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        {...handlers}
        className={`px-4 py-2 rounded-lg mr-2 ${
          isActive 
            ? 'bg-primary-500 dark:bg-primary-400' 
            : 'bg-surface-200 dark:bg-surface-700'
        }`}
      >
        <ThemedText 
          className={`text-sm font-medium ${
            isActive 
              ? 'text-white dark:text-gray-900' 
              : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          {label}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
};

export const HarvestPlanningDashboard: React.FC<HarvestPlanningDashboardProps> = ({
  plants,
  onPlantSelect,
  onTasksGenerated,
}) => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    upcomingHarvests: [],
    readyForPreparation: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'predictions' | 'analytics' | 'planning'>('overview');

  useEffect(() => {
    loadDashboardData();
  }, [plants]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      log.info('[HarvestPlanningDashboard] Loading dashboard data');

      const upcomingHarvests = [];
      const readyForPreparation = [];

      // Get predictions for flowering plants
      const floweringPlants = plants.filter(p => 
        ['flowering', 'late-flowering', 'pre-flowering'].includes(p.growthStage) && !p.harvestDate
      );

      for (const plant of floweringPlants) {
        try {
          const prediction = await HarvestPredictionService.predictHarvestDate(plant);
          const window = await HarvestPredictionService.calculateHarvestWindow(plant);
          
          upcomingHarvests.push({ plant, prediction, window });

          // Check if ready for harvest preparation
          const shouldTrigger = await HarvestPreparationAutomator.shouldTriggerHarvestPreparation(plant);
          if (shouldTrigger) {
            readyForPreparation.push(plant);
          }
        } catch (error) {
          log.error(`[HarvestPlanningDashboard] Error processing plant ${plant.id}:`, error);
        }
      }

      // Get harvest comparison for completed plants
      const harvestedPlants = plants.filter(p => p.harvestDate);
      let harvestComparison: HarvestComparison | undefined;
      let futurePlanning: FuturePlanningData | undefined;

      if (harvestedPlants.length > 0) {
        try {
          harvestComparison = await HarvestDataIntegrator.compareHarvests(harvestedPlants);
          futurePlanning = await HarvestDataIntegrator.generateFuturePlanningData(harvestedPlants);
        } catch (error) {
          log.error('[HarvestPlanningDashboard] Error loading analytics:', error);
        }
      }

      setDashboardData({
        upcomingHarvests: upcomingHarvests.sort((a, b) => a.prediction.daysRemaining - b.prediction.daysRemaining),
        harvestComparison,
        futurePlanning,
        readyForPreparation,
      });

      log.info(`[HarvestPlanningDashboard] Loaded data for ${upcomingHarvests.length} upcoming harvests`);
    } catch (error) {
      log.error('[HarvestPlanningDashboard] Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePreparationTasks = async (plant: Plant) => {
    try {
      triggerMediumHaptic();
      log.info(`[HarvestPlanningDashboard] Generating preparation tasks for plant ${plant.id}`);

      await HarvestPreparationAutomator.scheduleHarvestPreparationTasks(plant);
      
      Alert.alert(
        'Tasks Generated',
        `Harvest preparation tasks have been created for ${plant.name}`,
        [{ text: 'OK', onPress: onTasksGenerated }]
      );
    } catch (error) {
      log.error('[HarvestPlanningDashboard] Error generating preparation tasks:', error);
      Alert.alert('Error', 'Failed to generate preparation tasks');
    }
  };

  const handleMarkAsHarvested = async (plant: Plant) => {
    Alert.alert(
      'Mark as Harvested',
      `Mark ${plant.name} as harvested?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Harvest',
          onPress: async () => {
            try {
              await PostHarvestScheduler.markPlantAsHarvested(plant, {
                harvestDate: new Date(),
                notes: 'Harvested via dashboard',
              });
              
              Alert.alert(
                'Harvest Complete',
                'Post-harvest tasks have been scheduled',
                [{ text: 'OK', onPress: () => loadDashboardData() }]
              );
            } catch (error) {
              log.error('[HarvestPlanningDashboard] Error marking as harvested:', error);
              Alert.alert('Error', 'Failed to mark plant as harvested');
            }
          },
        },
      ]
    );
  };

  const renderTabButton = (tab: typeof activeTab, label: string) => {
    return (
      <TabButton
        tab={tab}
        label={label}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    );
  };

  if (loading) {
    return (
      <ThemedView className="flex-1 justify-center items-center p-4">
        <ThemedText className="text-gray-500 dark:text-gray-400">
          Loading harvest planning data...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1">
      {/* Header */}
      <View className="p-4 border-b border-gray-200 dark:border-gray-700">
        <ThemedText className="text-2xl font-bold mb-2">
          Harvest Planning
        </ThemedText>
        <ThemedText className="text-gray-600 dark:text-gray-400 mb-4">
          Plan and track your harvest timeline
        </ThemedText>

        {/* Tab Navigation */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row">
            {renderTabButton('overview', 'Overview')}
            {renderTabButton('predictions', 'Predictions')}
            {renderTabButton('analytics', 'Analytics')}
            {renderTabButton('planning', 'Planning')}
          </View>
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 p-4">
        {activeTab === 'overview' && (
          <OverviewTab 
            data={dashboardData}
            onGeneratePreparationTasks={handleGeneratePreparationTasks}
            onMarkAsHarvested={handleMarkAsHarvested}
            onPlantSelect={onPlantSelect}
          />
        )}
        
        {activeTab === 'predictions' && (
          <PredictionsTab 
            upcomingHarvests={dashboardData.upcomingHarvests}
            onPlantSelect={onPlantSelect}
          />
        )}
        
        {activeTab === 'analytics' && (
          <AnalyticsTab 
            harvestComparison={dashboardData.harvestComparison}
          />
        )}
        
        {activeTab === 'planning' && (
          <PlanningTab 
            futurePlanning={dashboardData.futurePlanning}
          />
        )}
      </ScrollView>
    </ThemedView>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{
  data: DashboardData;
  onGeneratePreparationTasks: (plant: Plant) => void;
  onMarkAsHarvested: (plant: Plant) => void;
  onPlantSelect?: (plant: Plant) => void;
}> = ({ data, onGeneratePreparationTasks, onMarkAsHarvested, onPlantSelect }) => {
  return (
    <View>
      {/* Quick Stats */}
      <View className="bg-surface-100 dark:bg-surface-800 rounded-xl p-4 mb-4">
        <ThemedText className="text-lg font-semibold mb-3">Quick Stats</ThemedText>
        <View className="flex-row justify-between">
          <View className="items-center">
            <ThemedText className="text-2xl font-bold text-primary-500">
              {data.upcomingHarvests.length}
            </ThemedText>
            <ThemedText className="text-sm text-gray-600 dark:text-gray-400">
              Upcoming
            </ThemedText>
          </View>
          <View className="items-center">
            <ThemedText className="text-2xl font-bold text-yellow-500">
              {data.readyForPreparation.length}
            </ThemedText>
            <ThemedText className="text-sm text-gray-600 dark:text-gray-400">
              Need Prep
            </ThemedText>
          </View>
          <View className="items-center">
            <ThemedText className="text-2xl font-bold text-green-500">
              {data.harvestComparison?.plants.length || 0}
            </ThemedText>
            <ThemedText className="text-sm text-gray-600 dark:text-gray-400">
              Completed
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Ready for Preparation */}
      {data.readyForPreparation.length > 0 && (
        <View className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 mb-4 border border-yellow-200 dark:border-yellow-800">
          <ThemedText className="text-lg font-semibold mb-3 text-yellow-800 dark:text-yellow-200">
            Ready for Harvest Preparation
          </ThemedText>
          {data.readyForPreparation.map((plant) => (
            <View key={plant.id} className="flex-row items-center justify-between py-2">
              <Pressable 
                onPress={() => onPlantSelect?.(plant)}
                className="flex-1"
              >
                <ThemedText className="font-medium">{plant.name}</ThemedText>
                <ThemedText className="text-sm text-gray-600 dark:text-gray-400">
                  {plant.strain} • {plant.growthStage}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => onGeneratePreparationTasks(plant)}
                className="bg-yellow-500 px-3 py-1 rounded-lg"
              >
                <ThemedText className="text-white text-sm font-medium">
                  Generate Tasks
                </ThemedText>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Next Harvests */}
      <View className="bg-surface-100 dark:bg-surface-800 rounded-xl p-4">
        <ThemedText className="text-lg font-semibold mb-3">Next Harvests</ThemedText>
        {data.upcomingHarvests.slice(0, 3).map(({ plant, prediction }) => (
          <View key={plant.id} className="flex-row items-center justify-between py-3 border-b border-gray-200 dark:border-gray-600 last:border-b-0">
            <Pressable 
              onPress={() => onPlantSelect?.(plant)}
              className="flex-1"
            >
              <ThemedText className="font-medium">{plant.name}</ThemedText>
              <ThemedText className="text-sm text-gray-600 dark:text-gray-400">
                {prediction.daysRemaining} days • {prediction.confidence} confidence
              </ThemedText>
            </Pressable>
            {prediction.daysRemaining <= 0 && (
              <Pressable
                onPress={() => onMarkAsHarvested(plant)}
                className="bg-red-500 px-3 py-1 rounded-lg"
              >
                <ThemedText className="text-white text-sm font-medium">
                  Harvest
                </ThemedText>
              </Pressable>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

// Predictions Tab Component
const PredictionsTab: React.FC<{
  upcomingHarvests: DashboardData['upcomingHarvests'];
  onPlantSelect?: (plant: Plant) => void;
}> = ({ upcomingHarvests, onPlantSelect }) => {
  return (
    <View>
      {upcomingHarvests.map(({ plant, prediction, window }) => (
        <Pressable
          key={plant.id}
          onPress={() => onPlantSelect?.(plant)}
          className="bg-surface-100 dark:bg-surface-800 rounded-xl p-4 mb-4"
        >
          <View className="flex-row items-center justify-between mb-3">
            <ThemedText className="text-lg font-semibold">{plant.name}</ThemedText>
            <View className={`px-2 py-1 rounded-full ${
              prediction.confidence === 'high' ? 'bg-green-100 dark:bg-green-900/20' :
              prediction.confidence === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
              'bg-red-100 dark:bg-red-900/20'
            }`}>
              <ThemedText className={`text-xs font-medium ${
                prediction.confidence === 'high' ? 'text-green-800 dark:text-green-200' :
                prediction.confidence === 'medium' ? 'text-yellow-800 dark:text-yellow-200' :
                'text-red-800 dark:text-red-200'
              }`}>
                {prediction.confidence} confidence
              </ThemedText>
            </View>
          </View>

          <ThemedText className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {plant.strain} • {plant.growthStage}
          </ThemedText>

          <View className="bg-surface-200 dark:bg-surface-700 rounded-lg p-3 mb-3">
            <ThemedText className="text-sm font-medium mb-2">Harvest Window</ThemedText>
            <View className="space-y-1">
              <View className="flex-row justify-between">
                <ThemedText className="text-sm text-gray-600 dark:text-gray-400">Early:</ThemedText>
                <ThemedText className="text-sm">{formatDate(window.earlyHarvest, 'MMM DD')}</ThemedText>
              </View>
              <View className="flex-row justify-between">
                <ThemedText className="text-sm text-gray-600 dark:text-gray-400">Optimal:</ThemedText>
                <ThemedText className="text-sm font-medium">{formatDate(window.optimalHarvest, 'MMM DD')}</ThemedText>
              </View>
              <View className="flex-row justify-between">
                <ThemedText className="text-sm text-gray-600 dark:text-gray-400">Late:</ThemedText>
                <ThemedText className="text-sm">{formatDate(window.lateHarvest, 'MMM DD')}</ThemedText>
              </View>
            </View>
          </View>

          <View className="bg-surface-200 dark:bg-surface-700 rounded-lg p-3">
            <ThemedText className="text-sm font-medium mb-2">Readiness: {window.currentReadiness}%</ThemedText>
            <View className="bg-gray-300 dark:bg-gray-600 rounded-full h-2">
              <View 
                className="bg-primary-500 h-2 rounded-full"
                style={{ width: `${window.currentReadiness}%` }}
              />
            </View>
          </View>

          {prediction.recommendations.length > 0 && (
            <View className="mt-3">
              <ThemedText className="text-sm font-medium mb-2">Recommendations:</ThemedText>
              {prediction.recommendations.slice(0, 2).map((rec, index) => (
                <ThemedText key={index} className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  • {rec}
                </ThemedText>
              ))}
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
};

// Analytics Tab Component
const AnalyticsTab: React.FC<{
  harvestComparison?: HarvestComparison;
}> = ({ harvestComparison }) => {
  if (!harvestComparison) {
    return (
      <ThemedView className="flex-1 justify-center items-center py-12">
        <ThemedText className="text-gray-500 dark:text-gray-400 text-center">
          No harvest data available for analysis
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <View>
      {/* Performance Summary */}
      <View className="bg-surface-100 dark:bg-surface-800 rounded-xl p-4 mb-4">
        <ThemedText className="text-lg font-semibold mb-3">Performance Summary</ThemedText>
        <View className="flex-row justify-between mb-4">
          <View className="items-center">
            <ThemedText className="text-2xl font-bold text-primary-500">
              {harvestComparison.averageYield.toFixed(1)}g
            </ThemedText>
            <ThemedText className="text-sm text-gray-600 dark:text-gray-400">
              Avg Yield
            </ThemedText>
          </View>
          <View className="items-center">
            <ThemedText className="text-2xl font-bold text-green-500">
              {harvestComparison.plants.length}
            </ThemedText>
            <ThemedText className="text-sm text-gray-600 dark:text-gray-400">
              Harvests
            </ThemedText>
          </View>
        </View>

        <View className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
          <ThemedText className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
            Best Performer: {harvestComparison.bestPerformer.plantName}
          </ThemedText>
          <ThemedText className="text-sm text-green-700 dark:text-green-300">
            {harvestComparison.bestPerformer.finalWeights.dry}g • {harvestComparison.bestPerformer.strain}
          </ThemedText>
        </View>
      </View>

      {/* Success Factors */}
      {harvestComparison.commonSuccessFactors.length > 0 && (
        <View className="bg-surface-100 dark:bg-surface-800 rounded-xl p-4 mb-4">
          <ThemedText className="text-lg font-semibold mb-3">Success Factors</ThemedText>
          {harvestComparison.commonSuccessFactors.map((factor, index) => (
            <ThemedText key={index} className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              • {factor}
            </ThemedText>
          ))}
        </View>
      )}

      {/* Improvement Suggestions */}
      {harvestComparison.improvementSuggestions.length > 0 && (
        <View className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
          <ThemedText className="text-lg font-semibold mb-3 text-yellow-800 dark:text-yellow-200">
            Improvement Suggestions
          </ThemedText>
          {harvestComparison.improvementSuggestions.map((suggestion, index) => (
            <ThemedText key={index} className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
              • {suggestion}
            </ThemedText>
          ))}
        </View>
      )}
    </View>
  );
};

// Planning Tab Component
const PlanningTab: React.FC<{
  futurePlanning?: FuturePlanningData;
}> = ({ futurePlanning }) => {
  if (!futurePlanning) {
    return (
      <ThemedView className="flex-1 justify-center items-center py-12">
        <ThemedText className="text-gray-500 dark:text-gray-400 text-center">
          No planning data available
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <View>
      {/* Capacity Planning */}
      <View className="bg-surface-100 dark:bg-surface-800 rounded-xl p-4 mb-4">
        <ThemedText className="text-lg font-semibold mb-3">Capacity Planning</ThemedText>
        <View className="space-y-3">
          <View className="flex-row justify-between">
            <ThemedText className="text-gray-600 dark:text-gray-400">Max Concurrent Plants:</ThemedText>
            <ThemedText className="font-medium">{futurePlanning.capacityPlanning.maxConcurrentPlants}</ThemedText>
          </View>
          <View className="flex-row justify-between">
            <ThemedText className="text-gray-600 dark:text-gray-400">Harvest Frequency:</ThemedText>
            <ThemedText className="font-medium">Every {futurePlanning.capacityPlanning.harvestFrequency} days</ThemedText>
          </View>
          <View className="flex-row justify-between">
            <ThemedText className="text-gray-600 dark:text-gray-400">Yearly Projection:</ThemedText>
            <ThemedText className="font-medium">{futurePlanning.capacityPlanning.yearlyProjection} harvests</ThemedText>
          </View>
        </View>
      </View>

      {/* Optimal Planting Dates */}
      <View className="bg-surface-100 dark:bg-surface-800 rounded-xl p-4 mb-4">
        <ThemedText className="text-lg font-semibold mb-3">Optimal Planting Dates</ThemedText>
        <View className="flex-row flex-wrap">
          {futurePlanning.optimalPlantingDates.slice(0, 4).map((date, index) => (
            <View key={index} className="bg-primary-100 dark:bg-primary-900/20 rounded-lg px-3 py-2 mr-2 mb-2">
              <ThemedText className="text-sm font-medium text-primary-800 dark:text-primary-200">
                {formatDate(date, 'MMM DD')}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>

      {/* Recommended Strains */}
      {futurePlanning.recommendedStrains.length > 0 && (
        <View className="bg-surface-100 dark:bg-surface-800 rounded-xl p-4">
          <ThemedText className="text-lg font-semibold mb-3">Recommended Strains</ThemedText>
          {futurePlanning.recommendedStrains.map((strain, index) => (
            <View key={index} className="bg-green-100 dark:bg-green-900/20 rounded-lg px-3 py-2 mb-2">
              <ThemedText className="text-sm font-medium text-green-800 dark:text-green-200">
                {strain}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};