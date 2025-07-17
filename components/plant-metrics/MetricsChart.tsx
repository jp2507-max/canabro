/**
 * MetricsChart - Data visualization component for plant metrics
 * 
 * Features:
 * - Line charts with optimal range highlighting
 * - Interactive data points with tooltips
 * - Time range selector (7d, 30d, 90d, all)
 * - Responsive design with NativeWind v4
 * - Dark mode support
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Dimensions, Alert, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useColorScheme } from 'nativewind';
import dayjs from 'dayjs';

import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import { usePlantMetrics } from '@/lib/hooks/plants/usePlantMetrics';
import { PlantMetrics as PlantMetricsModel } from '@/lib/models/PlantMetrics';
import { PlantMetrics as PlantMetricsType } from '@/lib/types/plant';
import { triggerLightHaptic } from '@/lib/utils/haptics';

// Get screen dimensions for responsive chart sizing
const screenWidth = Dimensions.get('window').width;

// Time range options
type TimeRange = '7d' | '30d' | '90d' | 'all';

interface TimeRangeOption {
  value: TimeRange;
  label: string;
  days?: number;
}

// Metric type definitions with optimal ranges
interface MetricConfig {
  key: keyof PlantMetricsType;
  label: string;
  unit: string;
  optimalRange?: [number, number];
  color: string;
  darkColor: string;
}

const METRIC_CONFIGS: MetricConfig[] = [
  {
    key: 'height',
    label: 'metricsChart.metrics.height',
    unit: 'cm',
    color: '#3b82f6', // blue-500
    darkColor: '#60a5fa', // blue-400
  },
  {
    key: 'ph_level',
    label: 'metricsChart.metrics.phLevel',
    unit: 'pH',
    optimalRange: [6.0, 7.0],
    color: '#f59e0b', // amber-500
    darkColor: '#fbbf24', // amber-400
  },
  {
    key: 'temperature',
    label: 'metricsChart.metrics.temperature',
    unit: '°C',
    optimalRange: [20, 26],
    color: '#ef4444', // red-500
    darkColor: '#f87171', // red-400
  },
  {
    key: 'humidity',
    label: 'metricsChart.metrics.humidity',
    unit: '%',
    optimalRange: [40, 60],
    color: '#06b6d4', // cyan-500
    darkColor: '#22d3ee', // cyan-400
  },
  {
    key: 'node_count',
    label: 'metricsChart.metrics.nodeCount',
    unit: '',
    color: '#8b5cf6', // violet-500
    darkColor: '#a78bfa', // violet-400
  },
];

interface MetricsChartProps {
  plantId: string;
  metricType?: keyof PlantMetricsType;
  timeRange?: TimeRange;
  showOptimalRange?: boolean;
  className?: string;
}

export const MetricsChart: React.FC<MetricsChartProps> = ({
  plantId,
  metricType = 'height',
  timeRange: initialTimeRange = '30d',
  showOptimalRange = true,
  className = '',
}) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(initialTimeRange);
  const [selectedMetric, setSelectedMetric] = useState<keyof PlantMetricsType>(metricType);

  // Time range options
  const timeRangeOptions: TimeRangeOption[] = [
    { value: '7d', label: t('metricsChart.timeRanges.7d'), days: 7 },
    { value: '30d', label: t('metricsChart.timeRanges.30d'), days: 30 },
    { value: '90d', label: t('metricsChart.timeRanges.90d'), days: 90 },
    { value: 'all', label: t('metricsChart.timeRanges.all') },
  ];

  // Calculate date range for data fetching
  const dateRange = useMemo(() => {
    const endDate = dayjs().format('YYYY-MM-DD');
    let startDate: string | undefined;

    const selectedOption = timeRangeOptions.find(option => option.value === selectedTimeRange);
    if (selectedOption?.days) {
      startDate = dayjs().subtract(selectedOption.days, 'day').format('YYYY-MM-DD');
    }

    return { startDate, endDate };
  }, [selectedTimeRange]);

  // Fetch metrics data
  const { data: metricsData, loading, error, refetch } = usePlantMetrics(plantId, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    fetchOnMount: true,
  });

  // Get current metric configuration
  const currentMetricConfig = METRIC_CONFIGS.find(config => config.key === selectedMetric);

  // Process data for chart
  const chartData = useMemo(() => {
    if (!metricsData || !currentMetricConfig) {
      return null;
    }

    // Filter and sort data - use created_at (snake_case)
    const filteredData = metricsData
      .filter(metric => metric[selectedMetric] != null)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (filteredData.length === 0) {
      return null;
    }

    // Prepare chart data
    const labels = filteredData.map(metric => 
      dayjs(metric.created_at).format(selectedTimeRange === '7d' ? 'MM/DD' : 'MM/DD')
    );

    const values = filteredData.map(metric => {
      const value = metric[selectedMetric] as number;
      return value || 0;
    });

    return {
      labels,
      datasets: [
        {
          data: values,
          color: (_opacity = 1) => isDark ? currentMetricConfig.darkColor : currentMetricConfig.color,
          strokeWidth: 2,
        },
      ],
    };
  }, [metricsData, selectedMetric, selectedTimeRange, currentMetricConfig, isDark]);

  // Chart configuration
  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: isDark ? '#1f2937' : '#ffffff',
    backgroundGradientTo: isDark ? '#1f2937' : '#ffffff',
    decimalPlaces: currentMetricConfig?.key === 'ph_level' ? 1 : 0,
    color: (_opacity = 1) => isDark ? `rgba(156, 163, 175, ${_opacity})` : `rgba(107, 114, 128, ${_opacity})`,
    labelColor: (_opacity = 1) => isDark ? `rgba(209, 213, 219, ${_opacity})` : `rgba(55, 65, 81, ${_opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: currentMetricConfig ? (isDark ? currentMetricConfig.darkColor : currentMetricConfig.color) : '#3b82f6',
    },
    propsForBackgroundLines: {
      strokeDasharray: '', // solid lines
      stroke: isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 0.8)',
      strokeWidth: 1,
    },
  };

  // Handle time range selection
  const handleTimeRangeChange = (range: TimeRange) => {
    setSelectedTimeRange(range);
    triggerLightHaptic();
  };

  // Handle metric selection
  const handleMetricChange = (metric: keyof PlantMetricsType) => {
    setSelectedMetric(metric);
    triggerLightHaptic();
  };

  // Handle chart data point press
  const handleDataPointClick = (data: { index?: number }) => {
    if (data.index !== undefined && metricsData && metricsData[data.index]) {
      const metric = metricsData[data.index];
      if (metric) {
        const value = metric[selectedMetric] as number;
        const date = dayjs(metric.created_at).format('MMM DD, YYYY');
        
        Alert.alert(
          t('metricsChart.dataPoint.title'),
          t('metricsChart.dataPoint.message', {
            metric: t(currentMetricConfig?.label || ''),
            value: value?.toFixed(currentMetricConfig?.key === 'ph_level' ? 1 : 0),
            unit: currentMetricConfig?.unit || '',
            date,
          })
        );
        triggerLightHaptic();
      }
    }
  };

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
            {t('metricsChart.loading')}
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
            {t('metricsChart.error')}
          </ThemedText>
          <TouchableOpacity
            className="bg-blue-500 dark:bg-blue-600 px-4 py-2 rounded-lg"
            onPress={() => refetch()}
          >
            <ThemedText className="text-white font-medium">
              {t('metricsChart.retry')}
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
          {t('metricsChart.title')}
        </ThemedText>
        
        {/* Metric Selector */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="mb-3"
        >
          <ThemedView className="flex-row space-x-2">
            {METRIC_CONFIGS.map((config) => (
              <TouchableOpacity
                key={config.key}
                onPress={() => handleMetricChange(config.key)}
              >
                <ThemedView
                  className={`px-3 py-2 rounded-lg border ${
                    selectedMetric === config.key
                      ? 'bg-blue-500 dark:bg-blue-600 border-blue-500 dark:border-blue-600'
                      : 'bg-neutral-100 dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600'
                  }`}
                >
                  <ThemedText 
                    className={`text-sm font-medium ${
                      selectedMetric === config.key
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
        <ThemedView className="flex-row space-x-2">
          {timeRangeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => handleTimeRangeChange(option.value)}
            >
              <ThemedView
                className={`px-3 py-1 rounded-md ${
                  selectedTimeRange === option.value
                    ? 'bg-neutral-200 dark:bg-neutral-600'
                    : 'bg-transparent'
                }`}
              >
                <ThemedText 
                  className={`text-sm ${
                    selectedTimeRange === option.value
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
              {t('metricsChart.noData')}
            </ThemedText>
            <ThemedText className="text-center text-sm text-neutral-500 dark:text-neutral-500">
              {t('metricsChart.noDataDescription')}
            </ThemedText>
          </ThemedView>
        ) : (
          <ThemedView>
            {/* Optimal Range Indicator */}
            {showOptimalRange && currentMetricConfig?.optimalRange && (
              <ThemedView className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <ThemedView className="flex-row items-center space-x-2">
                  <OptimizedIcon 
                    name="checkmark-circle" 
                    size={16} 
                    className="text-green-600 dark:text-green-400" 
                  />
                  <ThemedText className="text-sm font-medium text-green-800 dark:text-green-200">
                    {t('metricsChart.optimalRange')}: {currentMetricConfig.optimalRange[0]} - {currentMetricConfig.optimalRange[1]} {currentMetricConfig.unit}
                  </ThemedText>
                </ThemedView>
              </ThemedView>
            )}

            {/* Chart */}
            <LineChart
              data={chartData}
              width={screenWidth - 64} // Account for padding
              height={220}
              chartConfig={chartConfig}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
              onDataPointClick={handleDataPointClick}
              withInnerLines={true}
              withOuterLines={true}
              withVerticalLines={true}
              withHorizontalLines={true}
              withDots={true}
              withShadow={false}
            />

            {/* Chart Legend */}
            <ThemedView className="mt-4 flex-row items-center justify-center space-x-4">
              <ThemedView className="flex-row items-center space-x-2">
                <ThemedView 
                  className="w-3 h-3 rounded-full"
                  style={{ 
                    backgroundColor: currentMetricConfig ? (isDark ? currentMetricConfig.darkColor : currentMetricConfig.color) : '#3b82f6' 
                  }}
                />
                <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
                  {t(currentMetricConfig?.label || '')} ({currentMetricConfig?.unit || ''})
                </ThemedText>
              </ThemedView>
            </ThemedView>
          </ThemedView>
        )}
      </ThemedView>
    </ThemedView>
  );
};