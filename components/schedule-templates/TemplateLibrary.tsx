import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { FlashListWrapper } from '../ui/FlashListWrapper';
import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import NetworkResilientImage from '../ui/NetworkResilientImage';
import { ScheduleTemplate, TemplateTaskData } from '../../lib/models/ScheduleTemplate';
import { SPRING_CONFIGS, SCALE_VALUES } from '../../lib/constants/animations';
import { triggerLightHaptic, triggerMediumHaptic } from '../../lib/utils/haptics';
import { useDatabase } from '../../lib/hooks/useDatabase';
import { Q } from '@nozbe/watermelondb';

// Template categories for filtering
export const TEMPLATE_CATEGORIES = [
  'all',
  'indoor',
  'outdoor',
  'hydroponic',
  'soil',
  'beginner',
  'advanced',
] as const;

export type TemplateCategory = typeof TEMPLATE_CATEGORIES[number];

// Template sorting options
export const TEMPLATE_SORT_OPTIONS = [
  'popular',
  'newest',
  'rating',
  'duration',
] as const;

export type TemplateSortOption = typeof TEMPLATE_SORT_OPTIONS[number];

interface TemplateLibraryProps {
  onTemplateSelect: (template: ScheduleTemplate) => void;
  onTemplatePreview: (template: ScheduleTemplate) => void;
  selectedTemplateId?: string;
  showOnlyPublic?: boolean;
}

interface TemplateCardProps {
  template: ScheduleTemplate;
  onPress: (template: ScheduleTemplate) => void;
  onPreview: (template: ScheduleTemplate) => void;
  isSelected: boolean;
}

// Template card component with animations
const TemplateCard: React.FC<TemplateCardProps> = React.memo(({
  template,
  onPress,
  onPreview,
  isSelected,
}) => {
  const { t } = useTranslation('templates');
  
  // Animation values
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.1);
  const borderOpacity = useSharedValue(isSelected ? 1 : 0);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: shadowOpacity.value,
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
      cancelAnimation(shadowOpacity);
      cancelAnimation(borderOpacity);
    };
  }, []);

  // Gesture handlers
  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(SCALE_VALUES.cardPress, SPRING_CONFIGS.card);
      shadowOpacity.value = withSpring(0.2, SPRING_CONFIGS.quick);
    })
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1, SPRING_CONFIGS.card);
      shadowOpacity.value = withSpring(0.1, SPRING_CONFIGS.quick);
      runOnJS(triggerLightHaptic)();
      runOnJS(onPress)(template);
    });

  const previewGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      'worklet';
      runOnJS(triggerMediumHaptic)();
      runOnJS(onPreview)(template);
    });

  const combinedGesture = Gesture.Race(tapGesture, previewGesture);

  // Calculate template statistics
  const tasksByType = useMemo(() => {
    if (!template.templateData) return {};
    return template.templateData.reduce((acc, task) => {
      acc[task.taskType] = (acc[task.taskType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [template.templateData]);

  const averageDuration = useMemo(() => {
    if (!template.templateData || template.templateData.length === 0) return 0;
    const totalDuration = template.templateData.reduce((sum, task) => sum + task.estimatedDuration, 0);
    return Math.round(totalDuration / template.templateData.length);
  }, [template.templateData]);

  return (
    <GestureDetector gesture={combinedGesture}>
      <Animated.View style={animatedStyle}>
        <ThemedView
          variant="card"
          className="mx-4 mb-4 p-4 relative"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          {/* Selection border */}
          <Animated.View
            style={[animatedBorderStyle]}
            className="absolute inset-0 border-2 border-blue-500 rounded-xl"
          />

          {/* Header */}
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-1 mr-3">
              <ThemedText className="text-lg font-semibold mb-1">
                {template.name}
              </ThemedText>
              {template.description && (
                <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
                  {template.description}
                </ThemedText>
              )}
            </View>
            
            {/* Category badge */}
            <View className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded-full">
              <ThemedText className="text-xs font-medium text-blue-800 dark:text-blue-200">
                {template.category}
              </ThemedText>
            </View>
          </View>

          {/* Statistics row */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <OptimizedIcon name="calendar-outline" size={16} color="#6B7280" />
              <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400 ml-1">
                {template.durationWeeks} {t('templateCard.weeks')}
              </ThemedText>
            </View>
            
            <View className="flex-row items-center">
              <OptimizedIcon name="document-text-outline" size={16} color="#6B7280" />
              <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400 ml-1">
                {template.totalTasks} {t('templateCard.tasks')}
              </ThemedText>
            </View>
            
            <View className="flex-row items-center">
              <OptimizedIcon name="people-outline" size={16} color="#6B7280" />
              <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400 ml-1">
                {template.usageCount}
              </ThemedText>
            </View>
          </View>

          {/* Task type indicators */}
          <View className="flex-row flex-wrap gap-2 mb-3">
            {Object.entries(tasksByType).slice(0, 4).map(([taskType, count]) => (
              <View
                key={taskType}
                className="bg-neutral-100 dark:bg-neutral-700 px-2 py-1 rounded-md flex-row items-center"
              >
                <ThemedText className="text-xs text-neutral-700 dark:text-neutral-300">
                  {taskType}: {count}
                </ThemedText>
              </View>
            ))}
            {Object.keys(tasksByType).length > 4 && (
              <View className="bg-neutral-100 dark:bg-neutral-700 px-2 py-1 rounded-md">
                <ThemedText className="text-xs text-neutral-700 dark:text-neutral-300">
                  +{Object.keys(tasksByType).length - 4} {t('templateCard.more')}
                </ThemedText>
              </View>
            )}
          </View>

          {/* Footer */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <OptimizedIcon name="calendar-outline" size={14} color="#6B7280" />
              <ThemedText className="text-xs text-neutral-600 dark:text-neutral-400 ml-1">
                ~{averageDuration}min {t('templateCard.avgTask')}
              </ThemedText>
            </View>
            
            {template.strainType && (
              <View className="bg-green-100 dark:bg-green-900 px-2 py-1 rounded-full">
                <ThemedText className="text-xs font-medium text-green-800 dark:text-green-200">
                  {template.strainType}
                </ThemedText>
              </View>
            )}
          </View>

          {/* Preview hint */}
          <View className="absolute top-2 right-2">
            <OptimizedIcon name="search-outline" size={16} color="#9CA3AF" />
          </View>
        </ThemedView>
      </Animated.View>
    </GestureDetector>
  );
});

// Main TemplateLibrary component
export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  onTemplateSelect,
  onTemplatePreview,
  selectedTemplateId,
  showOnlyPublic = true,
}) => {
  const { t } = useTranslation('templates');
  const { database } = useDatabase();
  
  // State
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('all');
  const [sortBy, setSortBy] = useState<TemplateSortOption>('popular');
  const [refreshing, setRefreshing] = useState(false);

  // Load templates from database
  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      
      let query = database.get<ScheduleTemplate>('schedule_templates').query();
      
      // Filter by public templates if specified
      if (showOnlyPublic) {
        query = database.get<ScheduleTemplate>('schedule_templates').query(
          Q.where('is_public', true),
          Q.where('is_deleted', Q.notEq(true))
        );
      } else {
        query = database.get<ScheduleTemplate>('schedule_templates').query(
          Q.where('is_deleted', Q.notEq(true))
        );
      }

      const results = await query.fetch();
      setTemplates(results);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  }, [database, showOnlyPublic]);

  // Initial load
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Filter and sort templates
  const filteredAndSortedTemplates = useMemo(() => {
    let filtered = templates;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query) ||
        template.strainType?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.usageCount - a.usageCount;
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'rating':
          // TODO: Implement rating system
          return b.usageCount - a.usageCount;
        case 'duration':
          return a.durationWeeks - b.durationWeeks;
        default:
          return 0;
      }
    });

    return filtered;
  }, [templates, searchQuery, selectedCategory, sortBy]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTemplates();
    setRefreshing(false);
  }, [loadTemplates]);

  // Handle template selection
  const handleTemplatePress = useCallback((template: ScheduleTemplate) => {
    onTemplateSelect(template);
  }, [onTemplateSelect]);

  // Handle template preview
  const handleTemplatePreview = useCallback((template: ScheduleTemplate) => {
    onTemplatePreview(template);
  }, [onTemplatePreview]);

  // Render category filter
  const renderCategoryFilter = () => (
    <View className="px-4 mb-4">
      <FlashListWrapper
        data={TEMPLATE_CATEGORIES}
        horizontal
        showsHorizontalScrollIndicator={false}
        estimatedItemSize={80}
        renderItem={({ item: category }) => (
          <Pressable
            onPress={() => setSelectedCategory(category)}
            className={`mr-3 px-4 py-2 rounded-full ${
              selectedCategory === category
                ? 'bg-blue-500'
                : 'bg-neutral-200 dark:bg-neutral-700'
            }`}
          >
            <ThemedText
              className={`text-sm font-medium ${
                selectedCategory === category
                  ? 'text-white'
                  : 'text-neutral-700 dark:text-neutral-300'
              }`}
            >
              {t(`categories.${category}`)}
            </ThemedText>
          </Pressable>
        )}
      />
    </View>
  );

  // Render sort options
  const renderSortOptions = () => (
    <View className="px-4 mb-4">
      <FlashListWrapper
        data={TEMPLATE_SORT_OPTIONS}
        horizontal
        showsHorizontalScrollIndicator={false}
        estimatedItemSize={80}
        renderItem={({ item: option }) => (
          <Pressable
            onPress={() => setSortBy(option)}
            className={`mr-3 px-3 py-1 rounded-md border ${
              sortBy === option
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                : 'border-neutral-300 dark:border-neutral-600'
            }`}
          >
            <ThemedText
              className={`text-sm ${
                sortBy === option
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              {t(`sortOptions.${option}`)}
            </ThemedText>
          </Pressable>
        )}
      />
    </View>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <OptimizedIcon name="document-text-outline" size={64} color="#9CA3AF" />
      <ThemedText className="text-lg font-medium text-center mt-4 mb-2">
        {searchQuery ? t('emptyState.noResults') : t('emptyState.noTemplates')}
      </ThemedText>
      <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400 text-center">
        {searchQuery ? t('emptyState.tryDifferentSearch') : t('emptyState.createFirst')}
      </ThemedText>
    </View>
  );

  return (
    <ThemedView className="flex-1">
      {/* Search bar */}
      <View className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
        <View className="flex-row items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg px-3 py-2">
          <OptimizedIcon name="search-outline" size={20} color="#6B7280" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor="#9CA3AF"
            className="flex-1 ml-2 text-neutral-900 dark:text-neutral-100"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <OptimizedIcon name="close-circle" size={20} color="#6B7280" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filters and sorting */}
      {renderCategoryFilter()}
      {renderSortOptions()}

      {/* Results count */}
      <View className="px-4 mb-2">
        <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
          {t('resultsCount', { count: filteredAndSortedTemplates.length })}
        </ThemedText>
      </View>

      {/* Template list */}
      <FlashListWrapper
        data={filteredAndSortedTemplates}
        renderItem={({ item }) => (
          <TemplateCard
            template={item}
            onPress={handleTemplatePress}
            onPreview={handleTemplatePreview}
            isSelected={selectedTemplateId === item.id}
          />
        )}
        estimatedItemSize={200}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </ThemedView>
  );
};

export default TemplateLibrary;