/**
 * TaskAnalyticsChart - Data visualization component for task completion analytics
 * 
 * Features:
 * - Task completion rate charts with trend analysis
 * - Interactive data points with task insights
 * - Time range selector (7d, 30d, 90d, all)
 * - Task type filtering and comparison
 * - Pattern recognition and optimization suggestions
 * - Responsive design with NativeWind v4
 * - Dark mode support
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Dimensions, Alert, TouchableOpacity } from 'react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { useColorScheme } from 'nativewind';
import dayjs from 'dayjs';

import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import { useTaskAnalytics, TaskAnalyticsData, OptimizationSuggestion } from '@/lib/hooks/useTaskAnalytics';
import { TaskType } from '@/lib/types/taskTypes';
import { triggerLightHaptic } from '@/lib/utils/haptics';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { colors } from '@/lib/constants/colors';

// Time range options
type TimeRange = '7d' | '30d' | '90d' | 'all';
type ChartType = 'completion' | 'trends' | 'patterns';

interface TimeRangeOption {
  value: TimeRange;
  label: string;
  days?: number;
}

// Chart type definitions
interface ChartTypeConfig {
  key: ChartType;
  label: string;
  icon: 'checkmark-circle' | 'stats-chart-outline';
}

// Chart data interface
type ChartData = {
  data: any[];
  legend?: { label: string; color: string; }[];
  type: 'bar' | 'line';
  color?: string;
};

const CHART_TYPES: ChartTypeConfig[] = [
  {
    key: 'completion',
    label: 'taskAnalytics.chartTypes.completion',
    icon: 'checkmark-circle',
  },
  {
    key: 'trends',
    label: 'taskAnalytics.chartTypes.trends',
    icon: 'stats-chart-outline',
  },
  {
    key: 'patterns',
    label: 'taskAnalytics.chartTypes.patterns',
    icon: 'stats-chart-outline',
  },
];

// Task type colors
const TASK_TYPE_COLORS = {
  watering: { light: colors.semantic.info[500], dark: colors.semantic.info[400] },
  feeding: { light: colors.semantic.success[500], dark: colors.semantic.success[400] },
  inspection: { light: colors.semantic.warning[500], dark: colors.semantic.warning[400] },
  pruning: { light: colors.semantic.danger[500], dark: colors.semantic.danger[400] },
  harvest: { light: colors.primary[500], dark: colors.primary[400] },
  transplant: { light: colors.semantic.warning[400], dark: colors.semantic.warning[300] },
  training: { light: colors.semantic.info[400], dark: colors.semantic.info[300] },
  defoliation: { light: colors.semantic.success[400], dark: colors.semantic.success[300] },
  flushing: { light: colors.semantic.danger[400], dark: colors.semantic.danger[300] },
} as const;

interface TaskAnalyticsChartProps {
  plantId?: string;
  taskTypes?: TaskType[];
  timeRange?: TimeRange;
  chartType?: ChartType;
  showSuggestions?: boolean;
  className?: string;
}

export const TaskAnalyticsChart: React.FC<TaskAnalyticsChartProps> = React.memo(({
  plantId,
  taskTypes,
  timeRange: initialTimeRange = '30d',
  chartType: initialChartType = 'completion',
  showSuggestions = true,
  className = '',
}) => {
  // Responsive screen width state
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  useEffect(() => {
    const onChange = ({ window }: { window: { width: number } }) => {
      setScreenWidth(window.width);
    };
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => {
      if (typeof subscription?.remove === 'function') {
        subscription.remove();
      }
    };
  }, []);

  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(initialTimeRange);
  const [selectedChartType, setSelectedChartType] = useState<ChartType>(initialChartType);
  const [selectedTaskTypes, setSelectedTaskTypes] = useState<TaskType[]>(taskTypes || []);

  // Time range options
  const timeRangeOptions: TimeRangeOption[] = [
    { value: '7d', label: t('taskAnalytics.timeRanges.7d'), days: 7 },
    { value: '30d', label: t('taskAnalytics.timeRanges.30d'), days: 30 },
    { value: '90d', label: t('taskAnalytics.timeRanges.90d'), days: 90 },
    { value: 'all', label: t('taskAnalytics.timeRanges.all') },
  ];

  // Calculate date range for data fetching
  const dateRange = useMemo(() => {
    const endDate = new Date();
    let startDate: Date | undefined;

    const selectedOption = timeRangeOptions.find(option => option.value === selectedTimeRange);
    if (selectedOption?.days) {
      startDate = dayjs().subtract(selectedOption.days, 'day').toDate();
    }

    return { startDate, endDate };
  }, [selectedTimeRange]);

  // Fetch analytics data
  const { data: analyticsData, loading, error, refetch } = useTaskAnalytics({
    plantId,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    taskTypes: selectedTaskTypes.length > 0 ? selectedTaskTypes : undefined,
    fetchOnMount: true,
  });

  // Process chart data based on selected type
  const chartData = useMemo(() => {
    if (!analyticsData) return null;

    switch (selectedChartType) {
      case 'completion':
        return processCompletionChartData(analyticsData, isDark);
      case 'trends':
        return processTrendsChartData(analyticsData, selectedTimeRange, isDark);
      case 'patterns':
        return processPatternsChartData(analyticsData, isDark);
      default:
        return null;
    }
  }, [analyticsData, selectedChartType, selectedTimeRange, isDark]);

  // Handle time range selection
  const handleTimeRangeChange = (range: TimeRange) => {
    setSelectedTimeRange(range);
    triggerLightHaptic();
  };

  // Handle chart type selection
  const handleChartTypeChange = (type: ChartType) => {
    setSelectedChartType(type);
    triggerLightHaptic();
  };

  // Handle task type filter toggle
  const handleTaskTypeToggle = useCallback((taskType: TaskType) => {
    setSelectedTaskTypes(prev => {
      const isSelected = prev.includes(taskType);
      if (isSelected) {
        return prev.filter(type => type !== taskType);
      } else {
        return [...prev, taskType];
      }
    });
    triggerLightHaptic();
  }, []);

  if (loading) {
    return (
      <ThemedView className={`p-6 ${className}`}>
        <ThemedView className="flex-row items-center justify-center space-x-2">
          <OptimizedIcon
            name="loading1"
            size={20}
            className="text-neutral-500 dark:text-neutral-400"
          />
          <ThemedText className="text-neutral-600 dark:text-neutral-400">
            {t('taskAnalytics.loading')}
          </ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView className={`p-6 ${className}`}>
        <ThemedView className="items-center space-y-3">
          <OptimizedIcon
            name="warning"
            size={24}
            className="text-red-500 dark:text-red-400"
          />
          <ThemedText className="text-center text-neutral-600 dark:text-neutral-400">
            {t('taskAnalytics.error')}
          </ThemedText>
          <TouchableOpacity
            className="bg-blue-500 dark:bg-blue-600 px-4 py-2 rounded-lg"
            onPress={() => refetch()}
          >
            <ThemedText className="text-white font-medium">
              {t('taskAnalytics.retry')}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView className={`bg-white dark:bg-neutral-800 rounded-xl ${className}`}>
      {/* Header */}
      <ThemedView className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <ThemedText className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          {t('taskAnalytics.title')}
        </ThemedText>

        {/* Chart Type Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-3"
        >
          <ThemedView className="flex-row space-x-2">
            {CHART_TYPES.map((config) => (
              <TouchableOpacity
                key={config.key}
                onPress={() => handleChartTypeChange(config.key)}
              >
                <ThemedView
                  className={`px-3 py-2 rounded-lg border flex-row items-center space-x-2 ${selectedChartType === config.key
                    ? 'bg-blue-500 dark:bg-blue-600 border-blue-500 dark:border-blue-600'
                    : 'bg-neutral-100 dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600'
                    }`}
                >
                  <OptimizedIcon
                    name={config.icon}
                    size={16}
                    className={
                      selectedChartType === config.key
                        ? 'text-white'
                        : 'text-neutral-700 dark:text-neutral-300'
                    }
                  />
                  <ThemedText
                    className={`text-sm font-medium ${selectedChartType === config.key
                      ? 'text-white'
                      : 'text-neutral-700 dark:text-neutral-300'
                      }`}
                  >
                    {t(config.label)}
                  </ThemedText>
                </ThemedView>
              </TouchableOpacity>
            ))}
          </ThemedView>
        </ScrollView>

        {/* Time Range Selector */}
        <ThemedView className="flex-row space-x-2 mb-3">
          {timeRangeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => handleTimeRangeChange(option.value)}
            >
              <ThemedView
                className={`px-3 py-1 rounded-md ${selectedTimeRange === option.value
                  ? 'bg-neutral-200 dark:bg-neutral-600'
                  : 'bg-transparent'
                  }`}
              >
                <ThemedText
                  className={`text-sm ${selectedTimeRange === option.value
                    ? 'text-neutral-900 dark:text-neutral-100 font-medium'
                    : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                >
                  {option.label}
                </ThemedText>
              </ThemedView>
            </TouchableOpacity>
          ))}
        </ThemedView>

        {/* Task Type Filter */}
        <ThemedView>
          <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            {t('taskAnalytics.filters.taskTypes')}
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row space-x-2"
          >
            {Object.keys(TASK_TYPE_COLORS).map((taskType) => {
              const isSelected = selectedTaskTypes.includes(taskType as TaskType);
              const taskTypeColor = getTaskTypeColor(taskType as TaskType, isDark);
              
              return (
                <TouchableOpacity
                  key={taskType}
                  onPress={() => handleTaskTypeToggle(taskType as TaskType)}
                  accessible={true}
                  accessibilityLabel={`Toggle ${taskType} filter`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <ThemedView
                    className={`px-3 py-2 rounded-lg border flex-row items-center space-x-2 ${
                      isSelected
                        ? 'border-opacity-100'
                        : 'bg-neutral-100 dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600'
                    }`}
                    style={isSelected ? { 
                      backgroundColor: `${taskTypeColor}20`, 
                      borderColor: taskTypeColor 
                    } : {}}
                  >
                    <ThemedView
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: taskTypeColor }}
                    />
                    <ThemedText
                      className={`text-sm font-medium ${
                        isSelected
                          ? 'text-neutral-900 dark:text-neutral-100'
                          : 'text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      {t(`tasks.types.${taskType}`)}
                    </ThemedText>
                  </ThemedView>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </ThemedView>
      </ThemedView>

      {/* Chart Content */}
      <ThemedView className="p-4">
        {!chartData ? (
          <ThemedView className="items-center py-12 space-y-3">
            <OptimizedIcon
              name="stats-chart-outline"
              size={48}
              className="text-neutral-400 dark:text-neutral-500"
            />
            <ThemedText className="text-center text-neutral-600 dark:text-neutral-400">
              {t('taskAnalytics.noData')}
            </ThemedText>
            <ThemedText className="text-center text-sm text-neutral-500 dark:text-neutral-500">
              {t('taskAnalytics.noDataDescription')}
            </ThemedText>
          </ThemedView>
        ) : (
          <ThemedView>
            {/* Overall Stats */}
            {analyticsData && (
              <ThemedView className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <ThemedView className="flex-row justify-between items-center">
                  <ThemedView>
                    <ThemedText className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      {t('taskAnalytics.overallStats.completionRate')}
                    </ThemedText>
                    <ThemedText className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {analyticsData.overallStats.overallCompletionRate.toFixed(1)}%
                    </ThemedText>
                  </ThemedView>
                  <ThemedView className="items-end">
                    <ThemedText className="text-sm text-blue-700 dark:text-blue-300">
                      {analyticsData.overallStats.completedTasks} / {analyticsData.overallStats.totalTasks} {t('taskAnalytics.overallStats.tasks')}
                    </ThemedText>
                    <ThemedText className="text-xs text-blue-600 dark:text-blue-400">
                      {analyticsData.overallStats.averageTasksPerDay.toFixed(1)} {t('taskAnalytics.overallStats.tasksPerDay')}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
              </ThemedView>
            )}

            {/* Chart */}
            <ThemedView
              accessible={true}
              accessibilityLabel="Task analytics chart"
              accessibilityHint="Displays task completion analytics and trends"
            >
              <ErrorBoundary fallback={<ChartErrorFallback />}>
                {renderChart(chartData, screenWidth, isDark)}
              </ErrorBoundary>
            </ThemedView>

            {/* Chart Legend */}
            {(chartData as ChartData)?.legend && (
              <ThemedView className="mt-4">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <ThemedView className="flex-row items-center space-x-4">
                    {(chartData as ChartData).legend!.map((item: { label: string; color: string; }, index: number) => (
                      <ThemedView key={index} className="flex-row items-center space-x-2">
                        <ThemedView
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
                          {item.label}
                        </ThemedText>
                      </ThemedView>
                    ))}
                  </ThemedView>
                </ScrollView>
              </ThemedView>
            )}
          </ThemedView>
        )}
      </ThemedView>

      {/* Optimization Suggestions */}
      {showSuggestions && analyticsData?.suggestions && analyticsData.suggestions.length > 0 && (
        <ThemedView className="p-4 border-t border-neutral-200 dark:border-neutral-700">
          <ThemedText className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
            {t('taskAnalytics.suggestions.title')}
          </ThemedText>
          <ThemedView className="space-y-2">
            {analyticsData.suggestions.slice(0, 3).map((suggestion, index) => (
              <SuggestionCard key={index} suggestion={suggestion} />
            ))}
          </ThemedView>
        </ThemedView>
      )}
    </ThemedView>
  );
});

/**
 * Chart Error Fallback Component
 */
const ChartErrorFallback: React.FC = () => {
  const { t } = useTranslation();

  return (
    <ThemedView className="items-center py-8 space-y-3">
      <OptimizedIcon
        name="warning"
        size={32}
        className="text-red-500 dark:text-red-400"
      />
      <ThemedText className="text-center text-neutral-600 dark:text-neutral-400">
        {t('taskAnalytics.chartError', 'Chart rendering error')}
      </ThemedText>
      <ThemedText className="text-center text-sm text-neutral-500 dark:text-neutral-500">
        {t('taskAnalytics.chartErrorDescription', 'Please try refreshing or contact support')}
      </ThemedText>
    </ThemedView>
  );
};

/**
 * Suggestion Card Component
 */
interface SuggestionCardProps {
  suggestion: OptimizationSuggestion;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion }) => {
  const { t } = useTranslation();

  const impactColors = {
    low: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800',
    medium: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    high: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  };

  const impactIcons: Record<'low' | 'medium' | 'high', 'help-circle' | 'warning-outline' | 'warning'> = {
    low: 'help-circle',
    medium: 'warning-outline',
    high: 'warning',
  };

  return (
    <ThemedView className={`p-3 rounded-lg border ${impactColors[suggestion.impact]}`}>
      <ThemedView className="flex-row items-start space-x-3">
        <OptimizedIcon
          name={impactIcons[suggestion.impact]}
          size={20}
          className={`mt-0.5 ${suggestion.impact === 'high' ? 'text-red-600 dark:text-red-400' :
            suggestion.impact === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
              'text-gray-600 dark:text-gray-400'
            }`}
        />
        <ThemedView className="flex-1">
          <ThemedText className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">
            {suggestion.title}
          </ThemedText>
          <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
            {suggestion.description}
          </ThemedText>
          <ThemedView className="flex-row items-center mt-2 space-x-2">
            <ThemedView className={`px-2 py-1 rounded-full ${suggestion.impact === 'high' ? 'bg-red-100 dark:bg-red-900/30' :
              suggestion.impact === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                'bg-gray-100 dark:bg-gray-900/30'
              }`}>
              <ThemedText className={`text-xs font-medium ${suggestion.impact === 'high' ? 'text-red-800 dark:text-red-200' :
                suggestion.impact === 'medium' ? 'text-yellow-800 dark:text-yellow-200' :
                  'text-gray-800 dark:text-gray-200'
                }`}>
                {t(`taskAnalytics.suggestions.impact.${suggestion.impact}`)}
              </ThemedText>
            </ThemedView>
            {suggestion.actionable && (
              <ThemedView className="px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <ThemedText className="text-xs font-medium text-blue-800 dark:text-blue-200">
                  {t('taskAnalytics.suggestions.actionable')}
                </ThemedText>
              </ThemedView>
            )}
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
};

/**
 * Process completion chart data
 */
function processCompletionChartData(data: TaskAnalyticsData, isDark: boolean) {
  const chartData = data.completionRates.map((rate) => ({
    value: rate.completionRate,
    label: rate.taskType.substring(0, 3).toUpperCase(),
    frontColor: getTaskTypeColor(rate.taskType, isDark),
    onPress: () => {
      Alert.alert(
        `${rate.taskType} Tasks`,
        `Completion Rate: ${rate.completionRate.toFixed(1)}%\n` +
        `Completed: ${rate.completedTasks}/${rate.totalTasks}\n` +
        `Overdue: ${rate.overdueCount}\n` +
        `Avg. Completion Time: ${rate.averageCompletionTime.toFixed(1)} hours from due date`
      );
    },
  }));

  const legend = data.completionRates.map(rate => ({
    label: rate.taskType,
    color: getTaskTypeColor(rate.taskType, isDark),
  }));

  return { data: chartData, legend, type: 'bar' as const };
}

/**
 * Process trends chart data
 */
function processTrendsChartData(data: TaskAnalyticsData, timeRange: TimeRange, isDark: boolean) {
  const getDateFormat = (timeRange: TimeRange): string => {
    switch (timeRange) {
      case '7d':
        return 'MM/DD';
      case '30d':
        return 'MM/DD';
      case '90d':
        return 'MMM';
      case 'all':
        return 'MMM YY';
      default:
        return 'MM/DD';
    }
  };

  const chartData = data.trends.map((trend, index) => ({
    value: trend.completionRate,
    label: index % Math.ceil(data.trends.length / 6) === 0
      ? dayjs(trend.date).format(getDateFormat(timeRange))
      : '',
    dataPointText: `${trend.completionRate.toFixed(0)}%`,
    onFocus: () => {
      Alert.alert(
        'Daily Performance',
        `Date: ${dayjs(trend.date).format('MMM DD, YYYY')}\n` +
        `Completion Rate: ${trend.completionRate.toFixed(1)}%\n` +
        `Completed: ${trend.completedTasks}/${trend.totalTasks}\n` +
        `Average Delay: ${trend.averageDelay.toFixed(1)} hours`
      );
    },
  }));

  return {
    data: chartData,
    type: 'line' as const,
    color: isDark ? '#60A5FA' : '#3B82F6',
  };
}

/**
 * Process patterns chart data
 */
function processPatternsChartData(data: TaskAnalyticsData, isDark: boolean) {
  const chartData = data.patterns.map(pattern => ({
    value: pattern.consistencyScore,
    label: pattern.taskType.substring(0, 3).toUpperCase(),
    frontColor: getTaskTypeColor(pattern.taskType, isDark),
    onPress: () => {
      Alert.alert(
        `${pattern.taskType} Pattern`,
        `Consistency Score: ${pattern.consistencyScore.toFixed(1)}%\n` +
        `Best Day: ${pattern.bestCompletionDay}\n` +
        `Best Hour: ${pattern.bestCompletionHour}:00\n` +
        `Avg. Duration: ${pattern.averageDuration.toFixed(0)} minutes`
      );
    },
  }));

  const legend = data.patterns.map(pattern => ({
    label: pattern.taskType,
    color: getTaskTypeColor(pattern.taskType, isDark),
  }));

  return { data: chartData, legend, type: 'bar' as const };
}

/**
 * Get task type color
 */
function getTaskTypeColor(taskType: TaskType, isDark: boolean): string {
  const colors = TASK_TYPE_COLORS[taskType as keyof typeof TASK_TYPE_COLORS];
  return colors ? (isDark ? colors.dark : colors.light) : (isDark ? '#60A5FA' : '#3B82F6');
}

/**
 * Render chart based on type
 */
const renderChart = (chartData: ChartData, screenWidth: number, isDark: boolean) => {
  const chartWidth = screenWidth - 64;
  
  // Get appropriate colors for chart elements based on theme
  const xAxisColor = isDark ? colors.darkNeutral[300] : colors.neutral[300];
  const verticalLinesColor = isDark ? colors.darkNeutral[200] : colors.neutral[200];

  if (chartData.type === 'bar') {
    return (
      <BarChart
        data={chartData.data}
        width={chartWidth}
        height={220}
        barWidth={30}
        spacing={20}
        isAnimated
        animationDuration={800}
        yAxisThickness={0}
        xAxisThickness={1}
        xAxisColor={xAxisColor}
        showValuesAsTopLabel
        topLabelTextStyle={{ fontSize: 12, fontWeight: '600' }}
        // Enhanced styling
        roundedTop
        roundedBottom
        gradientColor={chartData.color || '#3B82F6'}
        showGradient
        // Improved interactions
        showLine={false}
        initialSpacing={10}
        endSpacing={10}
      />
    );
  } else {
    return (
      <LineChart
        data={chartData.data}
        width={chartWidth}
        height={220}
        curved
        color={chartData.color}
        thickness={3}
        dataPointsColor={chartData.color}
        dataPointsRadius={5}
        isAnimated
        animationDuration={800}
        // Enhanced styling
        areaChart
        startFillColor={chartData.color}
        endFillColor={chartData.color}
        startOpacity={0.3}
        endOpacity={0.1}
        // Better grid
        showVerticalLines
        verticalLinesColor={verticalLinesColor}
        verticalLinesThickness={1}
        // Better spacing
        initialSpacing={0}
        endSpacing={20}
      />
    );
  }
};