/**
 * Weather Integration Component
 * 
 * Integrates weather data with task scheduling and provides weather-based
 * task modifications for outdoor growing operations.
 * 
 * Task 6.2 Implementation:
 * - Implement weather-based task modifications
 * - Display weather conditions affecting plant care
 * - Provide weather-based scheduling recommendations
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { log } from '@/lib/utils/logger';

import { 
  EnvironmentalDataIntegrationService,
  WeatherConditions,
  ScheduleAdjustment
} from '@/lib/services/EnvironmentalDataIntegrationService';

interface WeatherIntegrationProps {
  plantIds: string[];
  onWeatherAdjustments?: (adjustments: ScheduleAdjustment[]) => void;
}

interface WeatherDisplayProps {
  weather: WeatherConditions;
  isOutdoorGrowing: boolean;
}

interface WeatherRecommendationProps {
  weather: WeatherConditions;
  recommendations: string[];
}

/**
 * Weather Display Component
 */
const WeatherDisplay: React.FC<WeatherDisplayProps> = React.memo(({ weather, isOutdoorGrowing }) => {
  const { t } = useTranslation();

  const weatherIcon = useMemo(() => {
    switch (weather.conditions) {
      case 'sunny':
        return '☀️';
      case 'cloudy':
        return '☁️';
      case 'rainy':
        return '🌧️';
      case 'stormy':
        return '⛈️';
      default:
        return '🌤️';
    }
  }, [weather.conditions]);

  const temperatureColor = useMemo(() => {
    if (weather.temperature > 30) return 'text-red-600 dark:text-red-400';
    if (weather.temperature < 15) return 'text-blue-600 dark:text-blue-400';
    return 'text-green-600 dark:text-green-400';
  }, [weather.temperature]);

  const humidityColor = useMemo(() => {
    if (weather.humidity > 70) return 'text-orange-600 dark:text-orange-400';
    if (weather.humidity < 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  }, [weather.humidity]);

  return (
    <ThemedView className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Text className="text-2xl mr-3">{weatherIcon}</Text>
          <View>
            <ThemedText className="text-lg font-semibold capitalize">
              {t(`weather.conditions.${weather.conditions}`)}
            </ThemedText>
            {!isOutdoorGrowing && (
              <ThemedText className="text-xs text-gray-500 dark:text-gray-400">
                {t('weather.indoorNote')}
              </ThemedText>
            )}
          </View>
        </View>
        {isOutdoorGrowing && (
          <View className="bg-green-100 dark:bg-green-900 px-2 py-1 rounded-full">
            <ThemedText className="text-xs font-medium text-green-800 dark:text-green-200">
              {t('weather.outdoor')}
            </ThemedText>
          </View>
        )}
      </View>

      <View className="flex-row justify-between mb-3">
        <View className="flex-1 mr-2">
          <ThemedText className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {t('weather.temperature')}
          </ThemedText>
          <ThemedText className={`text-xl font-bold ${temperatureColor}`}>
            {weather.temperature.toFixed(1)}°C
          </ThemedText>
        </View>
        <View className="flex-1 ml-2">
          <ThemedText className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {t('weather.humidity')}
          </ThemedText>
          <ThemedText className={`text-xl font-bold ${humidityColor}`}>
            {weather.humidity.toFixed(1)}%
          </ThemedText>
        </View>
      </View>

      {(weather.precipitation !== undefined || weather.windSpeed !== undefined || weather.uvIndex !== undefined) && (
        <View className="border-t border-gray-200 dark:border-gray-700 pt-3">
          <View className="flex-row justify-between">
            {weather.precipitation !== undefined && (
              <View className="flex-1">
                <ThemedText className="text-xs text-gray-500 dark:text-gray-400">
                  {t('weather.precipitation')}
                </ThemedText>
                <ThemedText className="text-sm font-medium">
                  {weather.precipitation.toFixed(1)}mm
                </ThemedText>
              </View>
            )}
            {weather.windSpeed !== undefined && (
              <View className="flex-1">
                <ThemedText className="text-xs text-gray-500 dark:text-gray-400">
                  {t('weather.windSpeed')}
                </ThemedText>
                <ThemedText className="text-sm font-medium">
                  {weather.windSpeed.toFixed(1)} km/h
                </ThemedText>
              </View>
            )}
            {weather.uvIndex !== undefined && (
              <View className="flex-1">
                <ThemedText className="text-xs text-gray-500 dark:text-gray-400">
                  {t('weather.uvIndex')}
                </ThemedText>
                <ThemedText className="text-sm font-medium">
                  {weather.uvIndex.toFixed(0)}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      )}
    </ThemedView>
  );
});

/**
 * Weather Recommendations Component
 */
const WeatherRecommendations: React.FC<WeatherRecommendationProps> = React.memo(({ weather, recommendations }) => {
  const { t } = useTranslation();

  if (recommendations.length === 0) {
    return null;
  }

  const getRecommendationIcon = (recommendation: string): string => {
    if (recommendation.toLowerCase().includes('water')) return '💧';
    if (recommendation.toLowerCase().includes('protect')) return '🛡️';
    if (recommendation.toLowerCase().includes('ventilat')) return '💨';
    if (recommendation.toLowerCase().includes('shade')) return '🌳';
    if (recommendation.toLowerCase().includes('harvest')) return '🌾';
    return '💡';
  };

  const getRecommendationPriority = (recommendation: string): 'high' | 'medium' | 'low' => {
    if (recommendation.toLowerCase().includes('urgent') || recommendation.toLowerCase().includes('immediate')) {
      return 'high';
    }
    if (recommendation.toLowerCase().includes('consider') || recommendation.toLowerCase().includes('monitor')) {
      return 'medium';
    }
    return 'low';
  };

  const getPriorityStyles = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
      case 'medium':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
    }
  };

  return (
    <ThemedView className="mb-4">
      <ThemedText className="text-lg font-semibold mb-3">
        {t('weather.recommendations')}
      </ThemedText>
      {recommendations.map((recommendation, index) => {
        const priority = getRecommendationPriority(recommendation);
        const icon = getRecommendationIcon(recommendation);
        const styles = getPriorityStyles(priority);

        return (
          <ThemedView key={index} className={`rounded-lg p-3 mb-2 border ${styles}`}>
            <View className="flex-row items-start">
              <Text className="text-base mr-3">{icon}</Text>
              <View className="flex-1">
                <ThemedText className={`text-sm ${styles.split(' ').pop()}`}>
                  {recommendation}
                </ThemedText>
                {priority === 'high' && (
                  <View className="mt-1">
                    <ThemedText className="text-xs font-medium text-red-600 dark:text-red-400">
                      {t('weather.highPriority')}
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
          </ThemedView>
        );
      })}
    </ThemedView>
  );
});

/**
 * Main Weather Integration Component
 */
export const WeatherIntegration: React.FC<WeatherIntegrationProps> = ({
  plantIds,
  onWeatherAdjustments,
}) => {
  const { t } = useTranslation();
  const [weather, setWeather] = useState<WeatherConditions | null>(null);
  const [isOutdoorGrowing, setIsOutdoorGrowing] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Mock weather data - in a real implementation, this would fetch from a weather API
  const fetchWeatherData = async (): Promise<WeatherConditions> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock weather data - replace with actual weather API integration
    const mockWeather: WeatherConditions = {
      temperature: 22 + Math.random() * 10, // 22-32°C
      humidity: 45 + Math.random() * 30, // 45-75%
      pressure: 1013 + Math.random() * 20, // 1013-1033 hPa
      windSpeed: Math.random() * 15, // 0-15 km/h
      precipitation: Math.random() > 0.7 ? Math.random() * 10 : 0, // 30% chance of rain
      uvIndex: Math.random() * 11, // 0-11
      conditions: ['sunny', 'cloudy', 'rainy', 'stormy'][Math.floor(Math.random() * 4)] as any,
    };

    return mockWeather;
  };

  const generateWeatherRecommendations = (weather: WeatherConditions, isOutdoor: boolean): string[] => {
    const recommendations: string[] = [];

    if (!isOutdoor) {
      recommendations.push(t('weather.indoorRecommendation'));
      return recommendations;
    }

    // Temperature-based recommendations
    if (weather.temperature > 30) {
      recommendations.push(t('weather.hotWeatherRecommendation'));
      recommendations.push(t('weather.increaseWateringFrequency'));
    } else if (weather.temperature < 15) {
      recommendations.push(t('weather.coldWeatherRecommendation'));
      recommendations.push(t('weather.protectFromFrost'));
    }

    // Humidity-based recommendations
    if (weather.humidity > 70) {
      recommendations.push(t('weather.highHumidityRecommendation'));
    } else if (weather.humidity < 40) {
      recommendations.push(t('weather.lowHumidityRecommendation'));
    }

    // Precipitation-based recommendations
    if (weather.precipitation && weather.precipitation > 5) {
      recommendations.push(t('weather.heavyRainRecommendation'));
      recommendations.push(t('weather.adjustWateringSchedule'));
    }

    // Wind-based recommendations
    if (weather.windSpeed && weather.windSpeed > 20) {
      recommendations.push(t('weather.strongWindRecommendation'));
    }

    // UV-based recommendations
    if (weather.uvIndex && weather.uvIndex > 8) {
      recommendations.push(t('weather.highUVRecommendation'));
    }

    // Storm conditions
    if (weather.conditions === 'stormy') {
      recommendations.push(t('weather.stormRecommendation'));
    }

    return recommendations;
  };

  const checkOutdoorGrowing = async (): Promise<boolean> => {
    try {
      if (plantIds.length === 0) return false;

      // Check if any plants are grown outdoors
      // This would typically query the plant database
      // For now, we'll simulate this check
      const hasOutdoorPlants = Math.random() > 0.5; // 50% chance for demo
      return hasOutdoorPlants;
    } catch (error) {
      log.error('[WeatherIntegration] Error checking outdoor growing:', error);
      return false;
    }
  };

  const applyWeatherAdjustments = async () => {
    try {
      if (!weather || !isOutdoorGrowing) return;

      const adjustments = await EnvironmentalDataIntegrationService.implementWeatherBasedModifications(
        plantIds,
        weather
      );

      if (adjustments.length > 0) {
        log.info(`[WeatherIntegration] Applied ${adjustments.length} weather-based adjustments`);
        
        if (onWeatherAdjustments) {
          onWeatherAdjustments(adjustments);
        }

        // Show user notification about adjustments
        Alert.alert(
          t('weather.adjustmentsApplied'),
          t('weather.adjustmentsAppliedMessage', { count: adjustments.length }),
          [{ text: t('common.ok') }]
        );
      }
    } catch (error) {
      log.error('[WeatherIntegration] Error applying weather adjustments:', error);
    }
  };

  const loadWeatherData = async () => {
    try {
      setIsLoading(true);

      const [weatherData, outdoorCheck] = await Promise.all([
        fetchWeatherData(),
        checkOutdoorGrowing(),
      ]);

      setWeather(weatherData);
      setIsOutdoorGrowing(outdoorCheck);
      setLastUpdated(new Date());

      const weatherRecommendations = generateWeatherRecommendations(weatherData, outdoorCheck);
      setRecommendations(weatherRecommendations);

      log.info(`[WeatherIntegration] Loaded weather data: ${weatherData.conditions}, ${weatherData.temperature}°C`);
    } catch (error) {
      log.error('[WeatherIntegration] Error loading weather data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (plantIds.length > 0) {
      loadWeatherData();
    }
  }, [plantIds]);

  // Auto-refresh weather data every 30 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (plantIds.length > 0) {
        loadWeatherData();
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [plantIds]);

  if (isLoading) {
    return (
      <ThemedView className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center justify-center">
          <Text className="text-2xl mr-3">🌤️</Text>
          <ThemedText className="text-gray-600 dark:text-gray-400">
            {t('weather.loading')}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!weather) {
    return (
      <ThemedView className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center justify-center">
          <Text className="text-2xl mr-3">❌</Text>
          <ThemedText className="text-gray-600 dark:text-gray-400">
            {t('weather.unavailable')}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <View>
      <WeatherDisplay weather={weather} isOutdoorGrowing={isOutdoorGrowing} />
      
      <WeatherRecommendations weather={weather} recommendations={recommendations} />

      {isOutdoorGrowing && (
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-1">
            {lastUpdated && (
              <ThemedText className="text-xs text-gray-500 dark:text-gray-400">
                {t('weather.lastUpdated')}: {lastUpdated.toLocaleTimeString()}
              </ThemedText>
            )}
          </View>
          <View className="flex-row space-x-2">
            <Pressable
              onPress={loadWeatherData}
              className="bg-blue-500 dark:bg-blue-600 px-3 py-2 rounded-lg"
            >
              <ThemedText className="text-white text-sm font-medium">
                {t('weather.refresh')}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={applyWeatherAdjustments}
              className="bg-green-500 dark:bg-green-600 px-3 py-2 rounded-lg"
            >
              <ThemedText className="text-white text-sm font-medium">
                {t('weather.applyAdjustments')}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};

export default WeatherIntegration;