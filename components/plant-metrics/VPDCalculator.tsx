/**
 * VPDCalculator - Utility component for Vapor Pressure Deficit calculations
 * 
 * Features:
 * - Real-time VPD calculation from temperature and humidity
 * - Optimal range indicators
 * - Unit conversion support
 * - Visual feedback for optimal/suboptimal ranges
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon, IconName, IconSVG } from '@/components/ui/OptimizedIcon';
// Type guard to ensure only valid icon names are used
function isValidIconName(name: string): name is IconName {
  return name in IconSVG;
}
import { PlantMetrics } from '@/lib/models/PlantMetrics';

interface VPDCalculatorProps {
  temperature?: number;
  humidity?: number;
  temperatureUnit?: 'celsius' | 'fahrenheit';
  showDetails?: boolean;
  className?: string;
}

export const VPDCalculator: React.FC<VPDCalculatorProps> = ({
  temperature,
  humidity,
  temperatureUnit = 'celsius',
  showDetails = false,
  className = '',
}) => {
  const { t } = useTranslation();

  // Calculate VPD if both temperature and humidity are provided
  const vpd = React.useMemo(() => {
    if (temperature && humidity) {
      return PlantMetrics.calculateVPD(temperature, humidity, temperatureUnit);
    }
    return null;
  }, [temperature, humidity, temperatureUnit]);

  // Determine VPD status
  const getVPDStatus = (vpdValue: number) => {
    if (vpdValue >= 0.8 && vpdValue <= 1.5) {
      return {
        status: 'optimal',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
        icon: 'checkmark-circle',
        message: t('vpdCalculator.optimal'),
      };
    } else if (vpdValue < 0.8) {
      return {
        status: 'low',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        icon: 'chevron-down',
        message: t('vpdCalculator.tooLow'),
      };
    } else {
      return {
        status: 'high',
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        borderColor: 'border-orange-200 dark:border-orange-800',
        icon: 'chevron-up',
        message: t('vpdCalculator.tooHigh'),
      };
    }
  };

  if (!vpd) {
    return (
      <ThemedView className={`p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg ${className}`}>
        <ThemedView className="flex-row items-center space-x-2">
          <OptimizedIcon 
            name="help-circle" 
            size={16} 
            className="text-neutral-500 dark:text-neutral-400" 
          />
          <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
            {t('vpdCalculator.enterTempHumidity')}
          </ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  const status = getVPDStatus(vpd);

  return (
    <ThemedView className={`p-4 rounded-lg border ${status.bgColor} ${status.borderColor} ${className}`}>
      <ThemedView className="flex-row items-center justify-between">
        <ThemedView className="flex-row items-center space-x-2">
          <OptimizedIcon
            name={isValidIconName(status.icon) ? status.icon : 'help-circle'}
            size={18}
            className={status.color}
          />
          <ThemedText className={`font-medium ${status.color}`}>
            VPD: {vpd} kPa
          </ThemedText>
        </ThemedView>
        
        <ThemedText className={`text-sm ${status.color}`}>
          {status.message}
        </ThemedText>
      </ThemedView>

      {showDetails && (
        <ThemedView className="mt-3 space-y-2">
          <ThemedText className="text-xs text-neutral-600 dark:text-neutral-400">
            {t('vpdCalculator.calculation')}:
          </ThemedText>
          
          <ThemedView className="space-y-1">
            <ThemedText className="text-xs text-neutral-500 dark:text-neutral-500">
              • {t('vpdCalculator.temperature')}: {temperature}°{temperatureUnit === 'celsius' ? 'C' : 'F'}
            </ThemedText>
            <ThemedText className="text-xs text-neutral-500 dark:text-neutral-500">
              • {t('vpdCalculator.humidity')}: {humidity}%
            </ThemedText>
          </ThemedView>

          <ThemedView className="mt-3 p-2 bg-neutral-100 dark:bg-neutral-700 rounded">
            <ThemedText className="text-xs text-neutral-600 dark:text-neutral-400">
              {t('vpdCalculator.optimalRange')}: 0.8 - 1.5 kPa
            </ThemedText>
            <ThemedText className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
              {t('vpdCalculator.rangeDescription')}
            </ThemedText>
          </ThemedView>
        </ThemedView>
      )}
    </ThemedView>
  );
};

// Standalone VPD calculation hook for use in other components
export const useVPDCalculation = (
  temperature?: number,
  humidity?: number,
  temperatureUnit: 'celsius' | 'fahrenheit' = 'celsius'
) => {
  return React.useMemo(() => {
    if (temperature && humidity) {
      const vpd = PlantMetrics.calculateVPD(temperature, humidity, temperatureUnit);
      const isOptimal = vpd >= 0.8 && vpd <= 1.5;
      const isLow = vpd < 0.8;
      const isHigh = vpd > 1.5;
      
      return {
        vpd,
        isOptimal,
        isLow,
        isHigh,
        status: isOptimal ? 'optimal' : isLow ? 'low' : 'high',
      };
    }
    return null;
  }, [temperature, humidity, temperatureUnit]);
};