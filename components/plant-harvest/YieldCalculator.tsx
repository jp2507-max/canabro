import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { Plant } from '../../lib/models/Plant';
import {
  HarvestData,
  calculateYieldMetrics,
  formatWeight,
  convertWeight,
} from '../../lib/utils/yield-calculator';

export interface YieldCalculatorProps {
  plant: Plant;
  harvestData: HarvestData;
  lightWattage?: number;
  growSpaceArea?: number;
  showAdvancedMetrics?: boolean;
  className?: string;
  displayUnit?: 'grams' | 'ounces';
}

interface MetricCardProps {
  icon: import('../ui/OptimizedIcon').IconName;
  label: string;
  value: string;
  subtitle?: string;
  variant?: 'default' | 'success' | 'warning' | 'info';
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  icon, 
  label, 
  value, 
  subtitle, 
  variant = 'default' 
}) => {
  const variantClasses = useMemo(() => {
    switch (variant) {
      case 'success':
        return 'bg-status-success/10 border-status-success/20';
      case 'warning':
        return 'bg-status-warning/10 border-status-warning/20';
      case 'info':
        return 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800';
      default:
        return 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700';
    }
  }, [variant]);

  const iconColor = useMemo(() => {
    switch (variant) {
      case 'success':
        return 'text-status-success';
      case 'warning':
        return 'text-status-warning';
      case 'info':
        return 'text-primary-600 dark:text-primary-400';
      default:
        return 'text-neutral-600 dark:text-neutral-400';
    }
  }, [variant]);

  return (
    <ThemedView className={`rounded-lg border p-4 ${variantClasses}`}>
      <View className="flex-row items-center space-x-3">
        <OptimizedIcon name={icon} size={24} className={iconColor} />
        <View className="flex-1">
          <ThemedText className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">
            {label}
          </ThemedText>
          <ThemedText className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {value}
          </ThemedText>
          {subtitle && (
            <ThemedText className="text-xs text-neutral-500 dark:text-neutral-500">
              {subtitle}
            </ThemedText>
          )}
        </View>
      </View>
    </ThemedView>
  );
};

export const YieldCalculator: React.FC<YieldCalculatorProps> = ({

  plant,
  harvestData,
  lightWattage,
  growSpaceArea,
  showAdvancedMetrics = false,
  className = '',
  displayUnit = 'grams',
}) => {
  const { t } = useTranslation();


  // Determine display unit (grams or ounces) based on plant or user settings
  // For now, allow both for demonstration; could be a prop or context in future
  // displayUnit is now a prop

  // Calculate metrics using correct argument signature
  const metrics = useMemo(() =>
    calculateYieldMetrics(plant, harvestData, lightWattage, growSpaceArea),
    [plant, harvestData, lightWattage, growSpaceArea]
  );

  // Prepare display metrics for UI
  const displayMetrics = useMemo(() => {
    if (!metrics) return {};
    return {
      totalGrowDays: metrics.totalGrowDays ?? 0,
      totalYieldDisplay: metrics.totalYield ?? 0,
      yieldPerDayDisplay: metrics.yieldPerDay ?? 0,
      dryingEfficiency: metrics.dryingEfficiency ?? 0,
      trimPercentage: metrics.trimPercentage ?? 0,
      gramsPerWatt: metrics.gramsPerWatt ?? undefined,
      yieldPerSquareFoot: metrics.yieldPerSquareFoot ?? undefined,
    };
  }, [metrics]);

  const getEfficiencyVariant = (efficiency: number): 'success' | 'warning' | 'default' => {
    if (efficiency >= 20) return 'success';
    if (efficiency >= 15) return 'warning';
    return 'default';
  };

  const getYieldVariant = (yieldPerDay: number): 'success' | 'warning' | 'default' => {
    // These thresholds are in grams per day
    let gramsPerDay = yieldPerDay;
    if (displayUnit === 'ounces') {
      gramsPerDay = convertWeight(yieldPerDay, 'ounces', 'grams');
    }
    if (gramsPerDay >= 1.0) return 'success';
    if (gramsPerDay >= 0.5) return 'warning';
    return 'default';
  };

  return (
    <ThemedView className={`space-y-4 ${className}`}>
      {/* Header */}
      <ThemedView className="items-center space-y-2">
        <OptimizedIcon
          name="stats-chart-outline"
          size={32}
          className="text-primary-600 dark:text-primary-400"
        />
        <ThemedText variant="heading" className="text-xl font-bold">
          {t('yieldCalculator.title')}
        </ThemedText>
        <ThemedText variant="muted" className="text-center text-sm">
          {t('yieldCalculator.subtitle', { plantName: plant.name })}
        </ThemedText>
      </ThemedView>

      {/* Basic Metrics Grid (Flexbox two-column) */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        <View style={{ width: '50%', padding: 8 }}>
          <MetricCard
            icon="calendar-outline"
            label={t('yieldCalculator.metrics.growDays')}
            value={displayMetrics.totalGrowDays?.toString() ?? '0'}
            subtitle={t('yieldCalculator.metrics.growDaysSubtitle')}
            variant="info"
          />
        </View>
        <View style={{ width: '50%', padding: 8 }}>
          <MetricCard
            icon="scale-balance"
            label={t('yieldCalculator.metrics.totalYield')}
            value={formatWeight(displayMetrics.totalYieldDisplay ?? 0, displayUnit)}
            subtitle={t('yieldCalculator.metrics.totalYieldSubtitle')}
            variant={getYieldVariant(displayMetrics.yieldPerDayDisplay ?? 0)}
          />
        </View>
        <View style={{ width: '50%', padding: 8 }}>
          <MetricCard
            icon="arrow-expand-vertical"
            label={t('yieldCalculator.metrics.yieldPerDay')}
            value={formatWeight(displayMetrics.yieldPerDayDisplay ?? 0, displayUnit)}
            subtitle={t('yieldCalculator.metrics.yieldPerDaySubtitle')}
            variant={getYieldVariant(displayMetrics.yieldPerDayDisplay ?? 0)}
          />
        </View>
        <View style={{ width: '50%', padding: 8 }}>
          <MetricCard
            icon="water-outline"
            label={t('yieldCalculator.metrics.dryingEfficiency')}
            value={`${displayMetrics.dryingEfficiency ?? 0}%`}
            subtitle={t('yieldCalculator.metrics.dryingEfficiencySubtitle')}
            variant={getEfficiencyVariant(displayMetrics.dryingEfficiency ?? 0)}
          />
        </View>
      </View>

      {/* Trim Analysis */}
      {displayMetrics.trimPercentage && displayMetrics.trimPercentage > 0 && (
        <MetricCard
          icon="cut-outline"
          label={t('yieldCalculator.metrics.trimPercentage')}
          value={`${displayMetrics.trimPercentage}%`}
          subtitle={t('yieldCalculator.metrics.trimPercentageSubtitle')}
        />
      )}

      {/* Advanced Metrics */}
      {showAdvancedMetrics && (
        <ThemedView className="space-y-4">
          <ThemedText variant="heading" className="text-base font-semibold">
            {t('yieldCalculator.advancedMetrics.title')}
          </ThemedText>
          <View>
            {displayMetrics.gramsPerWatt && (
              <MetricCard
                icon="flash"
                label={t('yieldCalculator.advancedMetrics.gramsPerWatt')}
                value={`${displayMetrics.gramsPerWatt} g/W`}
                subtitle={t('yieldCalculator.advancedMetrics.gramsPerWattSubtitle')}
                variant={displayMetrics.gramsPerWatt >= 1.0 ? 'success' : 'default'}
              />
            )}
            {displayMetrics.yieldPerSquareFoot && (
              <MetricCard
                icon="layers-outline"
                label={t('yieldCalculator.advancedMetrics.yieldPerSqFt')}
                value={`${displayMetrics.yieldPerSquareFoot} g/ft²`}
                subtitle={t('yieldCalculator.advancedMetrics.yieldPerSqFtSubtitle')}
                variant={displayMetrics.yieldPerSquareFoot >= 30 ? 'success' : 'default'}
              />
            )}
          </View>
        </ThemedView>
      )}

      {/* Performance Insights */}
      <ThemedView className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
        <ThemedText variant="heading" className="text-base font-semibold mb-2">
          {t('yieldCalculator.insights.title')}
        </ThemedText>
        <View className="space-y-2">
          {displayMetrics.dryingEfficiency && displayMetrics.dryingEfficiency >= 20 && (
            <View className="flex-row items-center space-x-2">
              <OptimizedIcon name="checkmark-circle" size={16} className="text-status-success" />
              <ThemedText className="text-sm text-status-success">
                {t('yieldCalculator.insights.excellentDrying')}
              </ThemedText>
            </View>
          )}
          {/* Dynamically compare yieldPerDay threshold in display unit */}
          {(() => {
            let threshold = 1.0;
            if (displayUnit === 'ounces') {
              // Convert 1.0 grams to ounces for threshold
              threshold = convertWeight(1.0, 'grams', 'ounces');
            }
            return (displayMetrics.yieldPerDayDisplay ?? 0) >= threshold;
          })() && (
            <View className="flex-row items-center space-x-2">
              <OptimizedIcon name="checkmark-circle" size={16} className="text-status-success" />
              <ThemedText className="text-sm text-status-success">
                {t('yieldCalculator.insights.highYieldPerDay')}
              </ThemedText>
            </View>
          )}
          {displayMetrics.totalGrowDays && displayMetrics.totalGrowDays < 70 && (
            <View className="flex-row items-center space-x-2">
              <OptimizedIcon name="calendar" size={16} className="text-primary-600 dark:text-primary-400" />
              <ThemedText className="text-sm text-primary-600 dark:text-primary-400">
                {t('yieldCalculator.insights.fastGrow')}
              </ThemedText>
            </View>
          )}
          {displayMetrics.trimPercentage && displayMetrics.trimPercentage > 30 && (
            <View className="flex-row items-center space-x-2">
              <OptimizedIcon name="help-circle" size={16} className="text-status-warning" />
              <ThemedText className="text-sm text-status-warning">
                {t('yieldCalculator.insights.highTrimRatio')}
              </ThemedText>
            </View>
          )}
        </View>
      </ThemedView>
    </ThemedView>
  );
};

export default YieldCalculator;