/**
 * Sensor Data Handler Component
 * 
 * Handles real-time sensor data integration for automated task scheduling
 * and environmental monitoring in the calendar system.
 * 
 * Task 6.2 Implementation:
 * - Add sensor data integration for automated scheduling
 * - Process real-time sensor readings
 * - Display sensor status and readings
 * - Trigger automatic schedule adjustments based on sensor data
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as haptics from '@/lib/utils/haptics';
import { View, Text, Pressable, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { FlashListWrapper } from '@/components/ui/FlashListWrapper';
import { log } from '@/lib/utils/logger';

import { 
  EnvironmentalDataIntegrationService,
  SensorReading,
  ScheduleAdjustment
} from '@/lib/services/EnvironmentalDataIntegrationService';

interface SensorDataHandlerProps {
  plantIds: string[];
  onSensorAdjustments?: (adjustments: ScheduleAdjustment[]) => void;
}

interface SensorCardProps {
  sensor: SensorStatus;
  onToggle: (sensorId: string) => void;
}

interface SensorReadingCardProps {
  reading: SensorReading;
}


type SensorType = 'environmental' | 'soil' | 'light' | 'multi';

interface SensorStatus {
  sensorId: string;
  plantId: string;
  plantName: string;
  sensorType: SensorType;
  isActive: boolean;
  isConnected: boolean;
  lastReading?: SensorReading;
  batteryLevel?: number;
  signalStrength?: number;
}

/**
 * Sensor Card Component
 */
const SensorCard: React.FC<SensorCardProps> = React.memo(({ sensor, onToggle }) => {
  const { t } = useTranslation();

  const sensorIcon = useMemo(() => {
    switch (sensor.sensorType) {
      case 'environmental':
        return '🌡️';
      case 'soil':
        return '🌱';
      case 'light':
        return '💡';
      case 'multi':
        return '📊';
      default:
        return '📡';
    }
  }, [sensor.sensorType]);

  const statusColor = useMemo(() => {
    if (!sensor.isConnected) return 'text-red-600 dark:text-red-400';
    if (!sensor.isActive) return 'text-gray-600 dark:text-gray-400';
    return 'text-green-600 dark:text-green-400';
  }, [sensor.isConnected, sensor.isActive]);

  const statusText = useMemo(() => {
    if (!sensor.isConnected) return t('sensors.disconnected');
    if (!sensor.isActive) return t('sensors.inactive');
    return t('sensors.active');
  }, [sensor.isConnected, sensor.isActive, t]);

  const formatSensorValue = (reading: SensorReading, metric: string): string => {
    switch (metric) {
      case 'temperature':
        return reading.temperature ? `${reading.temperature.toFixed(1)}°C` : '--';
      case 'humidity':
        return reading.humidity ? `${reading.humidity.toFixed(1)}%` : '--';
      case 'soilMoisture':
        return reading.soilMoisture ? `${reading.soilMoisture.toFixed(1)}%` : '--';
      case 'lightIntensity':
        return reading.lightIntensity ? `${reading.lightIntensity.toFixed(0)} PPFD` : '--';
      case 'ph':
        return reading.ph ? reading.ph.toFixed(2) : '--';
      case 'ec':
        return reading.ec ? `${reading.ec.toFixed(0)} ppm` : '--';
      case 'co2':
        return reading.co2 ? `${reading.co2.toFixed(0)} ppm` : '--';
      default:
        return '--';
    }
  };

  return (
    <ThemedView className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-3 border border-gray-200 dark:border-gray-700">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1">
          <Text className="text-2xl mr-3">{sensorIcon}</Text>
          <View className="flex-1">
            <ThemedText className="font-semibold">
              {sensor.plantName}
            </ThemedText>
            <ThemedText className="text-sm text-gray-600 dark:text-gray-400">
              {t(`sensors.types.${sensor.sensorType}`)} • {sensor.sensorId}
            </ThemedText>
          </View>
        </View>
        <View className="flex-row items-center">
          <View className={`w-2 h-2 rounded-full mr-2 ${sensor.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <ThemedText className={`text-sm font-medium ${statusColor}`}>
            {statusText}
          </ThemedText>
        </View>
      </View>

      {sensor.lastReading && (
        <View className="mb-3">
          <ThemedText className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('sensors.latestReadings')}:
          </ThemedText>
          <View className="flex-row flex-wrap">
            {sensor.lastReading.temperature !== undefined && (
              <View className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 mr-2 mb-2">
                <ThemedText className="text-xs text-gray-600 dark:text-gray-400">
                  {t('sensors.temperature')}
                </ThemedText>
                <ThemedText className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {formatSensorValue(sensor.lastReading, 'temperature')}
                </ThemedText>
              </View>
            )}
            {sensor.lastReading.humidity !== undefined && (
              <View className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg px-3 py-2 mr-2 mb-2">
                <ThemedText className="text-xs text-gray-600 dark:text-gray-400">
                  {t('sensors.humidity')}
                </ThemedText>
                <ThemedText className="text-sm font-medium text-cyan-800 dark:text-cyan-200">
                  {formatSensorValue(sensor.lastReading, 'humidity')}
                </ThemedText>
              </View>
            )}
            {sensor.lastReading.soilMoisture !== undefined && (
              <View className="bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2 mr-2 mb-2">
                <ThemedText className="text-xs text-gray-600 dark:text-gray-400">
                  {t('sensors.soilMoisture')}
                </ThemedText>
                <ThemedText className="text-sm font-medium text-green-800 dark:text-green-200">
                  {formatSensorValue(sensor.lastReading, 'soilMoisture')}
                </ThemedText>
              </View>
            )}
            {sensor.lastReading.lightIntensity !== undefined && (
              <View className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg px-3 py-2 mr-2 mb-2">
                <ThemedText className="text-xs text-gray-600 dark:text-gray-400">
                  {t('sensors.lightIntensity')}
                </ThemedText>
                <ThemedText className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {formatSensorValue(sensor.lastReading, 'lightIntensity')}
                </ThemedText>
              </View>
            )}
            {sensor.lastReading.ph !== undefined && (
              <View className="bg-purple-50 dark:bg-purple-900/20 rounded-lg px-3 py-2 mr-2 mb-2">
                <ThemedText className="text-xs text-gray-600 dark:text-gray-400">
                  {t('sensors.ph')}
                </ThemedText>
                <ThemedText className="text-sm font-medium text-purple-800 dark:text-purple-200">
                  {formatSensorValue(sensor.lastReading, 'ph')}
                </ThemedText>
              </View>
            )}
            {sensor.lastReading.ec !== undefined && (
              <View className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg px-3 py-2 mr-2 mb-2">
                <ThemedText className="text-xs text-gray-600 dark:text-gray-400">
                  {t('sensors.ec')}
                </ThemedText>
                <ThemedText className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
                  {formatSensorValue(sensor.lastReading, 'ec')}
                </ThemedText>
              </View>
            )}
          </View>
          <ThemedText className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('sensors.lastUpdated')}: {sensor.lastReading.timestamp.toLocaleTimeString()}
          </ThemedText>
        </View>
      )}

      {(sensor.batteryLevel !== undefined || sensor.signalStrength !== undefined) && (
        <View className="flex-row justify-between items-center mb-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          {sensor.batteryLevel !== undefined && (
            <View className="flex-row items-center">
              <Text className="mr-1">🔋</Text>
              <ThemedText className={`text-sm ${sensor.batteryLevel < 20 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {sensor.batteryLevel}%
              </ThemedText>
            </View>
          )}
          {sensor.signalStrength !== undefined && (
            <View className="flex-row items-center">
              <Text className="mr-1">📶</Text>
              <ThemedText className={`text-sm ${sensor.signalStrength < 30 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {sensor.signalStrength}%
              </ThemedText>
            </View>
          )}
        </View>
      )}

      <View className="flex-row justify-between items-center">
        <Pressable
          onPress={() => onToggle(sensor.sensorId)}
          className={`px-4 py-2 rounded-lg ${sensor.isActive ? 'bg-red-500 dark:bg-red-600' : 'bg-green-500 dark:bg-green-600'}`}
          accessibilityRole="button"
          accessibilityState={{ selected: sensor.isActive }}
        >
          <ThemedText className="text-white text-sm font-medium">
            {sensor.isActive ? t('sensors.deactivate') : t('sensors.activate')}
          </ThemedText>
        </Pressable>
        {sensor.lastReading && (
          <ThemedText className="text-xs text-gray-500 dark:text-gray-400">
            {t('sensors.readingAge')}: {Math.floor((Date.now() - sensor.lastReading.timestamp.getTime()) / 60000)}m
          </ThemedText>
        )}
      </View>
    </ThemedView>
  );
});

/**
 * Sensor Reading Card Component
 */
const SensorReadingCard: React.FC<SensorReadingCardProps> = React.memo(({ reading }) => {
  const { t } = useTranslation();

  const getReadingIcon = (reading: SensorReading): string => {
    if (reading.soilMoisture !== undefined && reading.soilMoisture < 30) return '🚨';
    if (reading.temperature !== undefined && (reading.temperature > 30 || reading.temperature < 15)) return '⚠️';
    if (reading.ph !== undefined && (reading.ph < 5.5 || reading.ph > 7.0)) return '⚠️';
    return '📊';
  };

  const getReadingPriority = (reading: SensorReading): 'high' | 'medium' | 'low' => {
    if (reading.soilMoisture !== undefined && reading.soilMoisture < 20) return 'high';
    if (reading.temperature !== undefined && (reading.temperature > 35 || reading.temperature < 10)) return 'high';
    if (reading.ph !== undefined && (reading.ph < 5.0 || reading.ph > 7.5)) return 'high';
    if (reading.soilMoisture !== undefined && reading.soilMoisture < 30) return 'medium';
    if (reading.temperature !== undefined && (reading.temperature > 30 || reading.temperature < 15)) return 'medium';
    return 'low';
  };

  const priority = getReadingPriority(reading);
  const icon = getReadingIcon(reading);

  const priorityStyles = useMemo(() => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'medium':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      default:
        return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  }, [priority]);

  return (
    <ThemedView className={`rounded-lg p-3 mb-2 border ${priorityStyles}`}>
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <Text className="text-lg mr-2">{icon}</Text>
          <ThemedText className="font-medium">
            {t('sensors.newReading')}
          </ThemedText>
        </View>
        <ThemedText className="text-xs text-gray-500 dark:text-gray-400">
          {reading.timestamp.toLocaleTimeString()}
        </ThemedText>
      </View>

      <View className="flex-row flex-wrap">
        {Object.entries({
          temperature: reading.temperature,
          humidity: reading.humidity,
          soilMoisture: reading.soilMoisture,
          lightIntensity: reading.lightIntensity,
          ph: reading.ph,
          ec: reading.ec,
          co2: reading.co2,
        }).map(([key, value]) => {
          if (value === undefined) return null;
          
          return (
            <View key={key} className="bg-white dark:bg-gray-800 rounded px-2 py-1 mr-2 mb-1">
              <ThemedText className="text-xs text-gray-600 dark:text-gray-400">
                {t(`sensors.${key}`)}
              </ThemedText>
              <ThemedText className="text-sm font-medium">
                {key === 'temperature' ? `${value.toFixed(1)}°C` :
                 key === 'humidity' || key === 'soilMoisture' ? `${value.toFixed(1)}%` :
                 key === 'ph' ? value.toFixed(2) :
                 key === 'lightIntensity' ? `${value.toFixed(0)} PPFD` :
                 `${value.toFixed(0)} ppm`}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </ThemedView>
  );
});

/**
 * Main Sensor Data Handler Component
 */
export const SensorDataHandler: React.FC<SensorDataHandlerProps> = ({
  plantIds,
  onSensorAdjustments,
}) => {
  const { t } = useTranslation();
  const [sensors, setSensors] = useState<SensorStatus[]>([]);
  const [recentReadings, setRecentReadings] = useState<SensorReading[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Mock sensor data - in a real implementation, this would connect to actual sensors
  const generateMockSensors = useCallback((): SensorStatus[] => {
    if (plantIds.length === 0) return [];

    const sensorTypes: SensorType[] = ['environmental', 'soil', 'light', 'multi'];

    return plantIds.map((plantId, index) => {
      // Guarantee a SensorType fallback in case of unexpected index
      const sensorType = sensorTypes[index % sensorTypes.length] ?? 'environmental';
      return {
        sensorId: `sensor_${plantId.slice(-4)}_${index + 1}`,
        plantId,
        plantName: `Plant ${index + 1}`,
        sensorType,
        isActive: Math.random() > 0.2, // 80% active
        isConnected: Math.random() > 0.1, // 90% connected
        batteryLevel: Math.floor(Math.random() * 100),
        signalStrength: Math.floor(Math.random() * 100),
        lastReading: {
          sensorId: `sensor_${plantId.slice(-4)}_${index + 1}`,
          plantId,
          timestamp: new Date(Date.now() - Math.random() * 300000), // Last 5 minutes
          temperature: 18 + Math.random() * 15, // 18-33°C
          humidity: 40 + Math.random() * 40, // 40-80%
          soilMoisture: 20 + Math.random() * 60, // 20-80%
          lightIntensity: Math.random() * 1000, // 0-1000 PPFD
          ph: 5.5 + Math.random() * 2, // 5.5-7.5
          ec: 800 + Math.random() * 1000, // 800-1800 ppm
          co2: 400 + Math.random() * 600, // 400-1000 ppm
        },
      };
    });
  }, [plantIds]);

  const generateMockReading = useCallback((sensorId: string, plantId: string): SensorReading => ({
    sensorId,
    plantId,
    timestamp: new Date(),
    temperature: 18 + Math.random() * 15,
    humidity: 40 + Math.random() * 40,
    soilMoisture: 20 + Math.random() * 60,
    lightIntensity: Math.random() * 1000,
    ph: 5.5 + Math.random() * 2,
    ec: 800 + Math.random() * 1000,
    co2: 400 + Math.random() * 600,
  }), []);

  const processSensorReadings = async (readings: SensorReading[]) => {
    try {
      if (readings.length === 0) return;

      // Process readings through the environmental integration service
      const adjustments = await EnvironmentalDataIntegrationService.integrateSensorDataForScheduling(readings);

      if (adjustments.length > 0) {
        log.info(`[SensorDataHandler] Applied ${adjustments.length} sensor-based adjustments`);
        
        if (onSensorAdjustments) {
          onSensorAdjustments(adjustments);
        }

  // Haptic feedback before notification
  await haptics.triggerMediumHaptic();
        // Show notification about automatic adjustments
        Alert.alert(
          t('sensors.automaticAdjustments'),
          t('sensors.automaticAdjustmentsMessage', { count: adjustments.length }),
          [{ text: t('common.ok') }]
        );
      }

      // Add readings to recent readings list
      setRecentReadings(prev => [...readings, ...prev].slice(0, 10)); // Keep last 10 readings
    } catch (error) {
      log.error('[SensorDataHandler] Error processing sensor readings:', error);
    }
  };

  const toggleSensor = useCallback((sensorId: string) => {
    setSensors(prev => prev.map(sensor => 
      sensor.sensorId === sensorId 
        ? { ...sensor, isActive: !sensor.isActive }
        : sensor
    ));
  }, []);

  const simulateSensorData = useCallback(() => {
    if (!isConnected || sensors.length === 0) return;

    // Simulate new sensor readings every 30 seconds
    const activeSensors = sensors.filter(s => s.isActive && s.isConnected);
    if (activeSensors.length === 0) return;

    const newReadings: SensorReading[] = [];

    // Generate readings for random active sensors (simulate real-time data)
    const sensorsToUpdate = activeSensors.filter(() => Math.random() > 0.7); // 30% chance per sensor

    for (const sensor of sensorsToUpdate) {
      const reading = generateMockReading(sensor.sensorId, sensor.plantId);
      newReadings.push(reading);

      // Update sensor's last reading
      setSensors(prev => prev.map(s => 
        s.sensorId === sensor.sensorId 
          ? { ...s, lastReading: reading }
          : s
      ));
    }

    if (newReadings.length > 0) {
      processSensorReadings(newReadings);
      setLastSync(new Date());
    }
  }, [isConnected, sensors, generateMockReading, processSensorReadings]);

  // Initialize sensors
  useEffect(() => {
    const mockSensors = generateMockSensors();
    setSensors(mockSensors);
    setIsConnected(mockSensors.length > 0);
    setLastSync(new Date());
  }, [generateMockSensors]);

  // Simulate real-time sensor data
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(simulateSensorData, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [simulateSensorData, isConnected]);

  const activeSensors = useMemo(() => sensors.filter(s => s.isActive), [sensors]);
  const connectedSensors = useMemo(() => sensors.filter(s => s.isConnected), [sensors]);

  if (plantIds.length === 0) {
    return (
      <ThemedView className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-4 border border-gray-200 dark:border-gray-700">
        <View className="items-center">
          <Text className="text-4xl mb-2">📡</Text>
          <ThemedText className="text-lg font-semibold text-center mb-2">
            {t('sensors.noPlants')}
          </ThemedText>
          <ThemedText className="text-gray-600 dark:text-gray-400 text-center">
            {t('sensors.noPlantsDescription')}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <View>
      {/* Sensor Status Header */}
      <ThemedView className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Text className="text-2xl mr-3">📡</Text>
            <View>
              <ThemedText className="text-lg font-semibold">
                {t('sensors.sensorNetwork')}
              </ThemedText>
              <ThemedText className="text-sm text-gray-600 dark:text-gray-400">
                {connectedSensors.length}/{sensors.length} {t('sensors.connected')} • {activeSensors.length} {t('sensors.active')}
              </ThemedText>
            </View>
          </View>
          <View className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        </View>

        {lastSync && (
          <ThemedText className="text-xs text-gray-500 dark:text-gray-400">
            {t('sensors.lastSync')}: {lastSync.toLocaleTimeString()}
          </ThemedText>
        )}
      </ThemedView>

      {/* Recent Readings */}
      {recentReadings.length > 0 && (
        <View className="mb-4">
          <ThemedText className="text-lg font-semibold mb-3">
            {t('sensors.recentReadings')}
          </ThemedText>
          {recentReadings.slice(0, 3).map((reading, index) => (
            <SensorReadingCard key={`${reading.sensorId}-${reading.timestamp.getTime()}`} reading={reading} />
          ))}
        </View>
      )}

      {/* Sensor List */}
      <View>
        <ThemedText className="text-lg font-semibold mb-3">
          {t('sensors.connectedSensors')}
        </ThemedText>
        <FlashListWrapper
          data={sensors}
          renderItem={({ item }: { item: SensorStatus }) => (
            <SensorCard sensor={item} onToggle={toggleSensor} />
          )}
          estimatedItemSize={200}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
};

export default SensorDataHandler;