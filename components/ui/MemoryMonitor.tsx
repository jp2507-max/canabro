/**
 * Memory Monitor Component
 * Shows real-time memory usage and crash prevention status
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import { useCrashPrevention } from '@/lib/utils/crashPrevention';
import { OptimizedIcon } from './OptimizedIcon';
import { DebugPanel } from './DebugPanel';

interface MemoryMonitorProps {
  showInProduction?: boolean;
}

export function MemoryMonitor({ showInProduction = false }: MemoryMonitorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [memoryUsage, setMemoryUsage] = useState<number>(0);
  const [crashReports, setCrashReports] = useState<number>(0);
  
  const { getCrashReports, getMemoryWarningCount, clearCrashReports } = useCrashPrevention();
  
  // Animation values
  const expandedHeight = useSharedValue(0);
  const rotateChevron = useSharedValue(0);
  const memoryBarWidth = useSharedValue(0);

  // Don't show in production unless explicitly enabled
  if (!__DEV__ && !showInProduction) {
    return null;
  }

  useEffect(() => {
    const updateStats = () => {
      try {
        // Check memory usage if available
        const rnGlobal = global as unknown as {
          performance?: {
            memory?: {
              usedJSHeapSize: number;
              jsHeapSizeLimit: number;
            };
          };
        };

        if (rnGlobal.performance?.memory) {
          const usage = rnGlobal.performance.memory.usedJSHeapSize;
          const limit = rnGlobal.performance.memory.jsHeapSizeLimit;
          const percentage = (usage / limit) * 100;
          setMemoryUsage(percentage);
          memoryBarWidth.value = withSpring(percentage / 100);
        }

        // Update crash reports count
        const reports = getCrashReports();
        const warnings = getMemoryWarningCount();
        setCrashReports(reports.length + warnings);
      } catch (error) {
        console.warn('Error updating memory stats:', error);
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [getCrashReports, getMemoryWarningCount, memoryBarWidth]);

  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded);
    expandedHeight.value = withSpring(isExpanded ? 0 : 1);
    rotateChevron.value = withSpring(isExpanded ? 0 : 180);
  };

  const handleClearReports = () => {
    clearCrashReports();
    setCrashReports(0);
  };

  const handleOpenDebugPanel = () => {
    setShowDebugPanel(true);
  };

  const handleCloseDebugPanel = () => {
    setShowDebugPanel(false);
  };

  // Animated styles
  const expandedStyle = useAnimatedStyle(() => {
    return {
      maxHeight: expandedHeight.value * 140, // Increased height for debug button
      opacity: expandedHeight.value,
    };
  });

  const chevronStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotateChevron.value}deg` }],
    };
  });

  const memoryBarStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      memoryBarWidth.value,
      [0, 0.5, 0.8, 1],
      ['#10b981', '#f59e0b', '#f97316', '#ef4444'] // green -> yellow -> orange -> red
    );

    return {
      width: `${memoryBarWidth.value * 100}%`,
      backgroundColor,
    };
  });

  const getMemoryStatus = () => {
    if (memoryUsage < 50) return { color: 'text-green-600', label: 'Good' };
    if (memoryUsage < 70) return { color: 'text-yellow-600', label: 'Fair' };
    if (memoryUsage < 85) return { color: 'text-orange-600', label: 'High' };
    return { color: 'text-red-600', label: 'Critical' };
  };

  const memoryStatus = getMemoryStatus();

  return (
    <>
      <View className="absolute top-12 right-4 z-50">
        {/* Main Monitor Button */}
        <Pressable
          onPress={handleToggleExpanded}
          className="flex-row items-center rounded-full bg-black/80 px-3 py-2"
          accessibilityRole="button"
          accessibilityLabel="Memory monitor">
          
          <View className="mr-2 flex-row items-center space-x-1">
            <OptimizedIcon
              name="stats-chart-outline"
              size={16}
              className="text-white"
            />
            <Text className="text-xs font-medium text-white">
              {memoryUsage.toFixed(0)}%
            </Text>
          </View>

          {crashReports > 0 && (
            <View className="mr-2 flex-row items-center space-x-1">
              <View className="h-2 w-2 rounded-full bg-red-500" />
              <Text className="text-xs font-medium text-red-400">
                {crashReports}
              </Text>
            </View>
          )}

          <Animated.View style={chevronStyle}>
            <OptimizedIcon
              name="chevron-down"
              size={14}
              className="text-white"
            />
          </Animated.View>
        </Pressable>

        {/* Expanded Details */}
        <Animated.View
          style={expandedStyle}
          className="mt-2 overflow-hidden rounded-lg bg-black/90 p-3">
          
          <View className="space-y-3">
            {/* Memory Usage */}
            <View>
              <View className="mb-1 flex-row items-center justify-between">
                <Text className="text-xs font-medium text-white">Memory Usage</Text>
                <Text className={`text-xs font-semibold ${memoryStatus.color}`}>
                  {memoryStatus.label}
                </Text>
              </View>
              
              <View className="h-2 overflow-hidden rounded-full bg-neutral-700">
                <Animated.View
                  style={memoryBarStyle}
                  className="h-full rounded-full"
                />
              </View>
              
              <Text className="mt-1 text-xs text-neutral-400">
                {memoryUsage.toFixed(1)}% of available memory
              </Text>
            </View>

            {/* Crash Reports */}
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs font-medium text-white">Issues Detected</Text>
                <Text className="text-xs text-neutral-400">
                  {crashReports} errors/warnings
                </Text>
              </View>
              
              {crashReports > 0 && (
                <Pressable
                  onPress={handleClearReports}
                  className="rounded bg-red-600 px-2 py-1"
                  accessibilityRole="button"
                  accessibilityLabel="Clear error reports">
                  <Text className="text-xs font-medium text-white">Clear</Text>
                </Pressable>
              )}
            </View>

            {/* Debug Panel Button */}
            <Pressable
              onPress={handleOpenDebugPanel}
              className="flex-row items-center justify-center space-x-2 rounded bg-blue-600 px-3 py-2"
              accessibilityRole="button"
              accessibilityLabel="Open debug panel">
              <OptimizedIcon
                name="warning-outline"
                size={14}
                className="text-white"
              />
              <Text className="text-xs font-medium text-white">Debug Panel</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>

      {/* Debug Panel Modal */}
      <DebugPanel visible={showDebugPanel} onClose={handleCloseDebugPanel} />
    </>
  );
}
