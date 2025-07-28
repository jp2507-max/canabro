import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { FlashListWrapper } from '../../components/ui/FlashListWrapper';
import NetworkResilientImage from '../../components/ui/NetworkResilientImage';
import { useButtonAnimation } from '../../lib/animations/useButtonAnimation';
import { triggerMediumHaptic } from '../../lib/utils/haptics';
import { log } from '../../lib/utils/logger';
import { formatDate, addDays, getDaysUntil } from '../../lib/utils/date';
import Animated from 'react-native-reanimated';

import { Plant } from '../../lib/models/Plant';
import { HarvestPrediction, HarvestWindow } from '../../lib/services/HarvestPredictionService';
import { HarvestAnalytics } from '../../lib/services/HarvestDataIntegrator';

interface HarvestTimelineViewProps {
  plants: Plant[];
  onPlantPress?: (plant: Plant) => void;
  onHarvestPress?: (plant: Plant) => void;
  showAnalytics?: boolean;
}

interface TimelineItem {
  id: string;
  plant: Plant;
  prediction?: HarvestPrediction;
  harvestWindow?: HarvestWindow;
  analytics?: HarvestAnalytics;
  type: 'upcoming' | 'ready' | 'completed';
  daysFromNow: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface FilterButtonProps {
  filter: 'all' | 'upcoming' | 'ready' | 'completed';
  label: string;
  selectedFilter: 'all' | 'upcoming' | 'ready' | 'completed';
  onFilterChange: (filter: 'all' | 'upcoming' | 'ready' | 'completed') => void;
}

const FilterButton: React.FC<FilterButtonProps> = ({
  filter,
  label,
  selectedFilter,
  onFilterChange,
}) => {
  const { animatedStyle, handlers } = useButtonAnimation({
    enableHaptics: true,
    onPress: () => onFilterChange(filter),
  });

  const isSelected = selectedFilter === filter;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        {...handlers}
        className={`px-4 py-2 rounded-full mr-2 ${
          isSelected 
            ? 'bg-primary-500 dark:bg-primary-400' 
            : 'bg-surface-200 dark:bg-surface-700'
        }`}
      >
        <ThemedText 
          className={`text-sm font-medium ${
            isSelected 
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

export const HarvestTimelineView: React.FC<HarvestTimelineViewProps> = ({
  plants,
  onPlantPress,
  onHarvestPress,
  showAnalytics = false,
}) => {
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'upcoming' | 'ready' | 'completed'>('all');

  useEffect(() => {
    loadTimelineData();
  }, [plants]);

  const loadTimelineData = async () => {
    try {
      setLoading(true);
      log.info('[HarvestTimelineView] Loading timeline data for plants');

      const items: TimelineItem[] = [];
      const today = new Date();

      for (const plant of plants) {
        if (plant.harvestDate) {
          // Completed harvest
          const daysFromNow = -getDaysUntil(plant.harvestDate);
          items.push({
            id: plant.id,
            plant,
            type: 'completed',
            daysFromNow,
            priority: 'low',
          });
        } else if (plant.expectedHarvestDate) {
          // Upcoming harvest
          const expectedDate = new Date(plant.expectedHarvestDate);
          const daysFromNow = getDaysUntil(expectedDate);
          
          let type: TimelineItem['type'] = 'upcoming';
          let priority: TimelineItem['priority'] = 'low';

          if (daysFromNow <= 0) {
            type = 'ready';
            priority = 'critical';
          } else if (daysFromNow <= 7) {
            type = 'ready';
            priority = 'high';
          } else if (daysFromNow <= 14) {
            priority = 'medium';
          }

          items.push({
            id: plant.id,
            plant,
            type,
            daysFromNow,
            priority,
          });
        }
      }

      // Sort by days from now (ready first, then upcoming, then completed)
      items.sort((a, b) => {
        if (a.type === 'ready' && b.type !== 'ready') return -1;
        if (b.type === 'ready' && a.type !== 'ready') return 1;
        if (a.type === 'upcoming' && b.type === 'completed') return -1;
        if (b.type === 'upcoming' && a.type === 'completed') return 1;
        return a.daysFromNow - b.daysFromNow;
      });

      setTimelineItems(items);
      log.info(`[HarvestTimelineView] Loaded ${items.length} timeline items`);
    } catch (error) {
      log.error('[HarvestTimelineView] Error loading timeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (selectedFilter === 'all') return timelineItems;
    return timelineItems.filter(item => item.type === selectedFilter);
  }, [timelineItems, selectedFilter]);

  const renderTimelineItem = ({ item }: { item: TimelineItem }) => (
    <TimelineItemCard
      item={item}
      onPress={() => onPlantPress?.(item.plant)}
      onHarvestPress={() => onHarvestPress?.(item.plant)}
      showAnalytics={showAnalytics}
    />
  );

  const renderFilterButton = (filter: typeof selectedFilter, label: string) => {
    return (
      <FilterButton
        filter={filter}
        label={label}
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
      />
    );
  };

  if (loading) {
    return (
      <ThemedView className="flex-1 justify-center items-center p-4">
        <ThemedText className="text-gray-500 dark:text-gray-400">
          Loading harvest timeline...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1">
      {/* Header */}
      <View className="p-4 border-b border-gray-200 dark:border-gray-700">
        <ThemedText className="text-2xl font-bold mb-2">
          Harvest Timeline
        </ThemedText>
        <ThemedText className="text-gray-600 dark:text-gray-400 mb-4">
          Track your plants from flowering to harvest
        </ThemedText>

        {/* Filter Buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row">
            {renderFilterButton('all', 'All')}
            {renderFilterButton('ready', 'Ready')}
            {renderFilterButton('upcoming', 'Upcoming')}
            {renderFilterButton('completed', 'Completed')}
          </View>
        </ScrollView>
      </View>

      {/* Timeline List */}
      <FlashListWrapper
        data={filteredItems}
        renderItem={renderTimelineItem}
        estimatedItemSize={120}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <ThemedView className="flex-1 justify-center items-center py-12">
            <ThemedText className="text-gray-500 dark:text-gray-400 text-center">
              {selectedFilter === 'all' 
                ? 'No plants in your timeline yet'
                : `No ${selectedFilter} harvests`
              }
            </ThemedText>
          </ThemedView>
        }
      />
    </ThemedView>
  );
};

interface TimelineItemCardProps {
  item: TimelineItem;
  onPress: () => void;
  onHarvestPress: () => void;
  showAnalytics: boolean;
}

const TimelineItemCard: React.FC<TimelineItemCardProps> = ({
  item,
  onPress,
  onHarvestPress,
  showAnalytics,
}) => {
  const { animatedStyle, handlers } = useButtonAnimation({
    enableHaptics: true,
    onPress,
  });

  const getStatusColor = () => {
    switch (item.type) {
      case 'ready': return 'bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'upcoming': return 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'completed': return 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      default: return 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusText = () => {
    switch (item.type) {
      case 'ready':
        return item.daysFromNow <= 0 ? 'Ready to harvest!' : `Ready in ${item.daysFromNow} days`;
      case 'upcoming':
        return `${item.daysFromNow} days to harvest`;
      case 'completed':
        return `Harvested ${Math.abs(item.daysFromNow)} days ago`;
      default:
        return 'Unknown status';
    }
  };

  const getPriorityIndicator = () => {
    if (item.priority === 'critical') return '🔴';
    if (item.priority === 'high') return '🟡';
    if (item.priority === 'medium') return '🟠';
    return '🟢';
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        {...handlers}
        className={`rounded-xl border-2 p-4 mb-3 ${getStatusColor()}`}
      >
        <View className="flex-row items-center">
          {/* Plant Image */}
          <View className="w-16 h-16 rounded-lg overflow-hidden mr-4">
            <NetworkResilientImage
              url={item.plant.imageUrl || null}
              width={64}
              height={64}
            />
          </View>

          {/* Plant Info */}
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <ThemedText className="text-lg font-semibold mr-2">
                {item.plant.name}
              </ThemedText>
              <Text className="text-lg">{getPriorityIndicator()}</Text>
            </View>
            
            <ThemedText className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {item.plant.strain} • {item.plant.growthStage}
            </ThemedText>
            
            <ThemedText className={`text-sm font-medium ${
              item.type === 'ready' ? 'text-red-600 dark:text-red-400' :
              item.type === 'upcoming' ? 'text-yellow-600 dark:text-yellow-400' :
              'text-green-600 dark:text-green-400'
            }`}>
              {getStatusText()}
            </ThemedText>

            {/* Expected/Actual Harvest Date */}
            {(item.plant.expectedHarvestDate || item.plant.harvestDate) && (
              <ThemedText className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {item.plant.harvestDate 
                  ? `Harvested: ${formatDate(item.plant.harvestDate, 'MMM DD, YYYY')}`
                  : `Expected: ${formatDate(new Date(item.plant.expectedHarvestDate!), 'MMM DD, YYYY')}`
                }
              </ThemedText>
            )}
          </View>

          {/* Action Button */}
          {item.type === 'ready' && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                triggerMediumHaptic();
                onHarvestPress();
              }}
              className="bg-primary-500 dark:bg-primary-400 px-4 py-2 rounded-lg"
            >
              <ThemedText className="text-white dark:text-gray-900 font-medium text-sm">
                Harvest
              </ThemedText>
            </Pressable>
          )}
        </View>

        {/* Analytics Preview */}
        {showAnalytics && item.analytics && (
          <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
            <View className="flex-row justify-between">
              <View className="flex-1 mr-2">
                <ThemedText className="text-xs text-gray-500 dark:text-gray-500">
                  Dry Weight
                </ThemedText>
                <ThemedText className="text-sm font-medium">
                  {item.analytics.finalWeights.dry || 0}g
                </ThemedText>
              </View>
              <View className="flex-1 mr-2">
                <ThemedText className="text-xs text-gray-500 dark:text-gray-500">
                  Growth Days
                </ThemedText>
                <ThemedText className="text-sm font-medium">
                  {item.analytics.totalGrowthDays}
                </ThemedText>
              </View>
              <View className="flex-1">
                <ThemedText className="text-xs text-gray-500 dark:text-gray-500">
                  Yield/Day
                </ThemedText>
                <ThemedText className="text-sm font-medium">
                  {item.analytics.yieldPerDay.toFixed(2)}g
                </ThemedText>
              </View>
            </View>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};