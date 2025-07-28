/**
 * Environmental Dashboard Component
 * 
 * Displays environmental data integration with calendar and task management.
 * Shows environmental trends, alerts, and recommendations for plant care planning.
 * 
 * Task 6.2 Implementation:
 * - Connect calendar with plant metrics and conditions
 * - Display environmental trend analysis for planning
 * - Show environmental alerts and recommendations
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { FlashListWrapper } from '@/components/ui/FlashListWrapper';
import { log } from '@/lib/utils/logger';
import { formatEnvironmentalValue } from '@/lib/utils/environmental-formatting';
import { EnvironmentalDashboardErrorBoundary } from '@/components/task-management/EnvironmentalDashboardErrorBoundary';

import { 
  EnvironmentalDataIntegrationService,
  EnvironmentalTrend,
  EnvironmentalAlert,
  ScheduleAdjustment
} from '@/lib/services/EnvironmentalDataIntegrationService';

interface EnvironmentalDashboardProps {
  plantIds: string[];
  selectedDate: Date;
  onScheduleAdjustment?: (adjustments: ScheduleAdjustment[]) => void;
}

interface TrendCardProps {
  trend: EnvironmentalTrend;
}

interface AlertCardProps {
  alert: EnvironmentalAlert;
}

interface AdjustmentCardProps {
  adjustment: ScheduleAdjustment;
}

/**
 * Environmental Trend Card Component
 */
const TrendCard: React.FC<TrendCardProps> = React.memo(({ trend }) => {
  const { t } = useTranslation();

  const trendColor = useMemo(() => {
    switch (trend.trend) {
      case 'increasing':
        return trend.isOptimal ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400';
      case 'decreasing':
        return trend.isOptimal ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  }, [trend.trend, trend.isOptimal]);

  const trendIcon = useMemo(() => {
    switch (trend.trend) {
      case 'increasing':
        return '↗️';
      case 'decreasing':
        return '↘️';
      default:
        return '➡️';
    }
  }, [trend.trend]);

  const formatMetricValue = (metric: string, value: number): string => {
    return formatEnvironmentalValue(metric, value);
  };

  const currentValue = trend.values[trend.values.length - 1]?.value || 0;

  return (
    <ThemedView className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-3 border border-gray-200 dark:border-gray-700">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <ThemedText className="text-lg font-semibold capitalize">
            {t(`environmental.metrics.${trend.metric}`, trend.metric)}
          </ThemedText>
          <Text className="ml-2 text-lg">{trendIcon}</Text>
        </View>
        <View className={`px-2 py-1 rounded-full ${trend.isOptimal ? 'bg-green-100 dark:bg-green-900' : 'bg-orange-100 dark:bg-orange-900'}`}>
          <ThemedText className={`text-xs font-medium ${trend.isOptimal ? 'text-green-800 dark:text-green-200' : 'text-orange-800 dark:text-orange-200'}`}>
            {trend.isOptimal ? t('environmental.optimal') : t('environmental.suboptimal')}
          </ThemedText>
        </View>
      </View>

      <View className="flex-row items-center justify-between mb-3">
        <View>
          <ThemedText className="text-sm text-gray-600 dark:text-gray-400">
            {t('environmental.current')}
          </ThemedText>
          <ThemedText className="text-xl font-bold">
            {formatMetricValue(trend.metric, currentValue)}
          </ThemedText>
        </View>
        <View>
          <ThemedText className="text-sm text-gray-600 dark:text-gray-400">
            {t('environmental.prediction')}
          </ThemedText>
          <ThemedText className={`text-lg font-semibold ${trendColor}`}>
            {formatMetricValue(trend.metric, trend.prediction)}
          </ThemedText>
        </View>
      </View>

      <View className="mb-3">
        <ThemedText className={`text-sm font-medium ${trendColor}`}>
          {t('environmental.trend')}: {t(`environmental.trends.${trend.trend}`)}
          {trend.changeRate !== 0 && (
            <ThemedText className="text-xs text-gray-500 dark:text-gray-400">
              {' '}({trend.changeRate > 0 ? '+' : ''}{trend.changeRate.toFixed(2)}/day)
            </ThemedText>
          )}
        </ThemedText>
      </View>

      {trend.recommendations.length > 0 && (
        <View>
          <ThemedText className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('environmental.recommendations')}:
          </ThemedText>
          {trend.recommendations.slice(0, 2).map((recommendation, index) => (
            <ThemedText key={index} className="text-xs text-gray-600 dark:text-gray-400 ml-2">
              • {recommendation}
            </ThemedText>
          ))}
        </View>
      )}
    </ThemedView>
  );
});

/**
 * Environmental Alert Card Component
 */
const AlertCard: React.FC<AlertCardProps> = React.memo(({ alert }) => {
  const { t } = useTranslation();

  const alertStyles = useMemo(() => {
    switch (alert.alertType) {
      case 'critical':
        return {
          container: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
          icon: '🚨',
          iconColor: 'text-red-600 dark:text-red-400',
          textColor: 'text-red-800 dark:text-red-200',
        };
      case 'warning':
        return {
          container: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
          icon: '⚠️',
          iconColor: 'text-orange-600 dark:text-orange-400',
          textColor: 'text-orange-800 dark:text-orange-200',
        };
      default:
        return {
          container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
          icon: 'ℹ️',
          iconColor: 'text-blue-600 dark:text-blue-400',
          textColor: 'text-blue-800 dark:text-blue-200',
        };
    }
  }, [alert.alertType]);

  const formatValue = (metric: string, value: number): string => {
    return formatEnvironmentalValue(metric, value);
  };

  return (
    <ThemedView className={`rounded-lg p-4 mb-3 border ${alertStyles.container}`}>
      <View className="flex-row items-start">
        <Text className="text-lg mr-3">{alertStyles.icon}</Text>
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-2">
            <ThemedText className={`font-semibold ${alertStyles.textColor}`}>
              {alert.message}
            </ThemedText>
            <View className={`px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800`}>
              <ThemedText className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {alert.metric}
              </ThemedText>
            </View>
          </View>

          <View className="flex-row items-center mb-3">
            <ThemedText className={`text-sm ${alertStyles.textColor}`}>
              {t('environmental.current')}: {formatValue(alert.metric, alert.currentValue)}
            </ThemedText>
            <ThemedText className="text-sm text-gray-500 dark:text-gray-400 ml-4">
              {t('environmental.optimal')}: {formatValue(alert.metric, alert.optimalRange.min)}-{formatValue(alert.metric, alert.optimalRange.max)}
            </ThemedText>
          </View>

          {alert.recommendedActions.length > 0 && (
            <View>
              <ThemedText className={`text-sm font-medium ${alertStyles.textColor} mb-1`}>
                {t('environmental.actions')}:
              </ThemedText>
              {alert.recommendedActions.slice(0, 2).map((action, index) => (
                <ThemedText key={index} className={`text-xs ${alertStyles.textColor} ml-2`}>
                  • {action}
                </ThemedText>
              ))}
            </View>
          )}
        </View>
      </View>
    </ThemedView>
  );
});

/**
 * Schedule Adjustment Card Component
 */
const AdjustmentCard: React.FC<AdjustmentCardProps> = React.memo(({ adjustment }) => {
  const { t } = useTranslation();

  const adjustmentIcon = adjustment.adjustmentHours > 0 ? '⏰' : '⚡';
  const adjustmentColor = adjustment.adjustmentHours > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400';

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <ThemedView className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-3 border border-gray-200 dark:border-gray-700">
      <View className="flex-row items-start">
        <Text className="text-lg mr-3">{adjustmentIcon}</Text>
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-2">
            <ThemedText className="font-semibold">
              {t('environmental.scheduleAdjusted')}
            </ThemedText>
            <View className={`px-2 py-1 rounded-full ${adjustment.priority === 'critical' ? 'bg-red-100 dark:bg-red-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
              <ThemedText className={`text-xs font-medium ${adjustment.priority === 'critical' ? 'text-red-800 dark:text-red-200' : 'text-gray-600 dark:text-gray-400'}`}>
                {t(`tasks.priority.${adjustment.priority}`)}
              </ThemedText>
            </View>
          </View>

          <ThemedText className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {adjustment.reason}
          </ThemedText>

          <View className="flex-row items-center justify-between mb-2">
            <View>
              <ThemedText className="text-xs text-gray-500 dark:text-gray-400">
                {t('environmental.originalTime')}
              </ThemedText>
              <ThemedText className="text-sm">
                {formatDate(adjustment.originalDueDate)} {formatTime(adjustment.originalDueDate)}
              </ThemedText>
            </View>
            <Text className={`text-lg ${adjustmentColor}`}>→</Text>
            <View>
              <ThemedText className="text-xs text-gray-500 dark:text-gray-400">
                {t('environmental.adjustedTime')}
              </ThemedText>
              <ThemedText className={`text-sm font-medium ${adjustmentColor}`}>
                {formatDate(adjustment.adjustedDueDate)} {formatTime(adjustment.adjustedDueDate)}
              </ThemedText>
            </View>
          </View>

          {adjustment.environmentalFactors.length > 0 && (
            <View>
              <ThemedText className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {t('environmental.factors')}:
              </ThemedText>
              <View className="flex-row flex-wrap">
                {adjustment.environmentalFactors.map((factor, index) => (
                  <View key={index} className="bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-1 mr-2 mb-1">
                    <ThemedText className="text-xs text-gray-600 dark:text-gray-300">
                      {factor}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    </ThemedView>
  );
});

/**
 * Main Environmental Dashboard Component
 */
export const EnvironmentalDashboard: React.FC<EnvironmentalDashboardProps> = ({
  plantIds,
  selectedDate,
  onScheduleAdjustment,
}) => {
  const { t } = useTranslation();
  const [trends, setTrends] = useState<EnvironmentalTrend[]>([]);
  const [alerts, setAlerts] = useState<EnvironmentalAlert[]>([]);
  const [adjustments, setAdjustments] = useState<ScheduleAdjustment[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEnvironmentalData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }

      // Defensive: check for valid plantIds
      if (!Array.isArray(plantIds) || plantIds.length === 0) {
        setTrends([]);
        setAlerts([]);
        setAdjustments([]);
        setRecommendations([]);
        return;
      }

      // Since we've validated plantIds is a non-empty array, we can safely access the first plant ID
      const firstPlantId = plantIds[0] as string;

      // Prepare all promises - no need for redundant length checks since we know plantIds is non-empty
      const trendsPromise = EnvironmentalDataIntegrationService.analyzeEnvironmentalTrends(firstPlantId, 7);
      const alertsPromise = Promise.all(plantIds.map(plantId =>
        EnvironmentalDataIntegrationService.generateEnvironmentalAlerts(plantId)
      )).then(results => results.flat());
      const adjustmentsPromise = EnvironmentalDataIntegrationService.integrateEnvironmentalDataWithCalendar(
        plantIds,
        {
          start: selectedDate,
          end: new Date(selectedDate.getTime() + (5 * 24 * 60 * 60 * 1000)) // 5 days
        }
      );

      const [trendsData, alertsData, adjustmentsData] = await Promise.all([
        trendsPromise,
        alertsPromise,
        adjustmentsPromise,
      ]);
      
      // Get planning recommendations for the first plant
      const planningRecommendations = await EnvironmentalDataIntegrationService.getEnvironmentalRecommendationsForPlanning(firstPlantId, 7);

      setTrends(trendsData);
      setAlerts(alertsData);
      setAdjustments(adjustmentsData);
      setRecommendations(planningRecommendations);
      setError(null);
      
      // Notify parent component about schedule adjustments
      if (adjustmentsData.length > 0 && onScheduleAdjustment) {
        onScheduleAdjustment(adjustmentsData);
      }
      
      log.info(`[EnvironmentalDashboard] Loaded environmental data: ${trendsData.length} trends, ${alertsData.length} alerts, ${adjustmentsData.length} adjustments`);
    } catch (err) {
      log.error('[EnvironmentalDashboard] Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      Alert.alert(
        t('environmental.errorTitle'),
        t('environmental.dataLoadErrorMessage')
      );
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEnvironmentalData();
  }, [plantIds, selectedDate]);

  const onRefresh = () => {
    loadEnvironmentalData(true);
  };

  const dashboardSections = useMemo(() => {
    const sections = [];

    // Critical alerts first
    const criticalAlerts = alerts.filter(alert => alert.alertType === 'critical');
    if (criticalAlerts.length > 0) {
      sections.push({
        title: t('environmental.criticalAlerts'),
        data: criticalAlerts,
        type: 'alerts' as const,
      });
    }

    // Schedule adjustments
    if (adjustments.length > 0) {
      sections.push({
        title: t('environmental.scheduleAdjustments'),
        data: adjustments,
        type: 'adjustments' as const,
      });
    }

    // Environmental trends
    if (trends.length > 0) {
      sections.push({
        title: t('environmental.trends'),
        data: trends,
        type: 'trends' as const,
      });
    }

    // Other alerts
    const otherAlerts = alerts.filter(alert => alert.alertType !== 'critical');
    if (otherAlerts.length > 0) {
      sections.push({
        title: t('environmental.alerts'),
        data: otherAlerts,
        type: 'alerts' as const,
      });
    }

    // Planning recommendations
    if (recommendations.length > 0) {
      sections.push({
        title: t('environmental.planningRecommendations'),
        data: recommendations,
        type: 'recommendations' as const,
      });
    }

    return sections;
  }, [alerts, adjustments, trends, recommendations, t]);

  const renderSectionItem = ({ item }: { item: any }) => {
    const { type, data } = item;
    switch (type) {
      case 'trends':
        return <TrendCard trend={data} />;
      case 'alerts':
        return <AlertCard alert={data} />;
      case 'adjustments':
        return <AdjustmentCard adjustment={data} />;
      case 'recommendations':
        return (
          <ThemedView className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-2 border border-blue-200 dark:border-blue-800">
            <View className="flex-row items-start">
              <Text className="text-base mr-2">💡</Text>
              <ThemedText className="text-sm text-blue-800 dark:text-blue-200 flex-1">
                {data}
              </ThemedText>
            </View>
          </ThemedView>
        );
      default:
        return null;
    }
  };

  // Flatten sections into items for FlashList
  const flatData = useMemo(() => {
    const items: any[] = [];
    dashboardSections.forEach(section => {
      // Add section header
      items.push({
        type: 'header',
        data: section,
        id: `header-${section.type}`,
      });
      // Add section items
      section.data.forEach((item: any, index: number) => {
        items.push({
          type: section.type,
          data: item,
          id: `${section.type}-${index}`,
        });
      });
    });
    return items;
  }, [dashboardSections]);

  const renderFlatItem = ({ item }: { item: any }) => {
    if (item.type === 'header') {
      return renderSectionHeader({ section: item.data });
    }
    return renderSectionItem({ item });
  };

  const renderSectionHeader = ({ section }: { section: any }) => (
    <ThemedView className="bg-gray-50 dark:bg-gray-900 px-4 py-2 mb-2">
      <ThemedText className="text-lg font-semibold text-gray-800 dark:text-gray-200">
        {section.title}
      </ThemedText>
    </ThemedView>
  );

  if (isLoading) {
    return (
      <ThemedView className="flex-1 justify-center items-center p-4">
        <ThemedText className="text-gray-600 dark:text-gray-400">
          {t('environmental.loadingData')}
        </ThemedText>
      </ThemedView>
    );
  }

  if (plantIds.length === 0) {
    return (
      <ThemedView className="flex-1 justify-center items-center p-4">
        <Text className="text-4xl mb-2">🌱</Text>
        <ThemedText className="text-gray-600 dark:text-gray-400 text-center">
          {t('environmental.noPlants')}
        </ThemedText>
      </ThemedView>
    );
  }

  if (dashboardSections.length === 0) {
    return (
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        className="flex-1"
      >
        <ThemedView className="flex-1 justify-center items-center p-8">
          <Text className="text-4xl mb-4">✅</Text>
          <ThemedText className="text-lg font-semibold text-center mb-2">
            {t('environmental.allGood')}
          </ThemedText>
          <ThemedText className="text-gray-600 dark:text-gray-400 text-center">
            {t('environmental.noIssues')}
          </ThemedText>
        </ThemedView>
      </ScrollView>
    );
  }

  return (
    <FlashListWrapper
      data={flatData}
      renderItem={renderFlatItem}
      estimatedItemSize={120}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
      accessibilityLabel="Environmental data list"
      accessibilityRole="list"
    />
  );
};

const EnvironmentalDashboardWithErrorBoundary: React.FC<EnvironmentalDashboardProps> = (props) => {
  const handleRetry = () => {
    // Reload data when retry is clicked
    // This would be handled by the parent component in a real implementation
  };
  
  return (
    <EnvironmentalDashboardErrorBoundary onRetry={handleRetry}>
      <EnvironmentalDashboard {...props} />
    </EnvironmentalDashboardErrorBoundary>
  );
};

export default EnvironmentalDashboardWithErrorBoundary;