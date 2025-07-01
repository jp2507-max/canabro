/**
 * Debug Panel for investigating app crashes
 * Provides real-time debugging information
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useCrashPrevention } from '@/lib/utils/crashPrevention';
import { useResourceCleanup } from '@/lib/hooks/useResourceCleanup';
import { OptimizedIcon } from './OptimizedIcon';

interface DebugPanelProps {
  visible?: boolean;
  onClose?: () => void;
}

export function DebugPanel({ visible = false, onClose }: DebugPanelProps) {
  const [resourceStats, setResourceStats] = useState({
    intervals: 0,
    timeouts: 0,
    subscriptions: 0,
    listeners: 0,
    animations: 0,
  });

  const { getCrashReports, getMemoryWarningCount, clearCrashReports } = useCrashPrevention();
  const { getResourceCount, getResourcesByType } = useResourceCleanup();

  useEffect(() => {
    if (!visible) return;

    const updateStats = () => {
      setResourceStats({
        intervals: getResourcesByType('interval').length,
        timeouts: getResourcesByType('timeout').length,
        subscriptions: getResourcesByType('subscription').length,
        listeners: getResourcesByType('listener').length,
        animations: getResourcesByType('animation').length,
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);
    
    return () => clearInterval(interval);
  }, [visible, getResourcesByType]);

  if (!visible) return null;

  const crashReports = getCrashReports();
  const memoryWarnings = getMemoryWarningCount();
  const totalResources = getResourceCount();

  const handleForceGC = () => {
    try {
      const gc = (global as unknown as { gc?: () => void }).gc;
      if (gc) {
        gc();
        console.warn('🗑️ Forced garbage collection');
      } else {
        console.warn('⚠️ Garbage collection not available');
      }
    } catch (error) {
      console.error('Error forcing GC:', error);
    }
  };

  const handleClearReports = () => {
    clearCrashReports();
  };

  return (
    <View className="absolute inset-0 z-50 bg-black/80">
      <View className="flex-1 justify-center px-6">
        <View className="max-h-4/5 rounded-2xl bg-white p-6 dark:bg-neutral-800">
          
          {/* Header */}
          <View className="mb-6 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-neutral-900 dark:text-white">
              🔧 Debug Panel
            </Text>
            
            {onClose && (
              <Pressable
                onPress={onClose}
                className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-700"
                accessibilityRole="button"
                accessibilityLabel="Close debug panel">
                <OptimizedIcon name="close" size={20} className="text-neutral-600 dark:text-neutral-400" />
              </Pressable>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            <View className="space-y-6">
              
              {/* Memory Stats */}
              <View>
                <Text className="mb-3 text-lg font-semibold text-neutral-900 dark:text-white">
                  Memory & Performance
                </Text>
                
                <View className="space-y-2">
                  <View className="flex-row justify-between">
                    <Text className="text-neutral-600 dark:text-neutral-400">Memory Warnings:</Text>
                    <Text className={`font-mono ${memoryWarnings > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {memoryWarnings}
                    </Text>
                  </View>
                  
                  <View className="flex-row justify-between">
                    <Text className="text-neutral-600 dark:text-neutral-400">Crash Reports:</Text>
                    <Text className={`font-mono ${crashReports.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {crashReports.length}
                    </Text>
                  </View>
                  
                  <Pressable
                    onPress={handleForceGC}
                    className="mt-2 rounded-lg bg-blue-600 px-4 py-2"
                    accessibilityRole="button">
                    <Text className="text-center font-medium text-white">Force Garbage Collection</Text>
                  </Pressable>
                </View>
              </View>

              {/* Resource Tracking */}
              <View>
                <Text className="mb-3 text-lg font-semibold text-neutral-900 dark:text-white">
                  Active Resources ({totalResources})
                </Text>
                
                <View className="space-y-2">
                  <View className="flex-row justify-between">
                    <Text className="text-neutral-600 dark:text-neutral-400">Intervals:</Text>
                    <Text className={`font-mono ${resourceStats.intervals > 5 ? 'text-orange-600' : 'text-neutral-900 dark:text-white'}`}>
                      {resourceStats.intervals}
                    </Text>
                  </View>
                  
                  <View className="flex-row justify-between">
                    <Text className="text-neutral-600 dark:text-neutral-400">Timeouts:</Text>
                    <Text className={`font-mono ${resourceStats.timeouts > 10 ? 'text-orange-600' : 'text-neutral-900 dark:text-white'}`}>
                      {resourceStats.timeouts}
                    </Text>
                  </View>
                  
                  <View className="flex-row justify-between">
                    <Text className="text-neutral-600 dark:text-neutral-400">Subscriptions:</Text>
                    <Text className={`font-mono ${resourceStats.subscriptions > 10 ? 'text-orange-600' : 'text-neutral-900 dark:text-white'}`}>
                      {resourceStats.subscriptions}
                    </Text>
                  </View>
                  
                  <View className="flex-row justify-between">
                    <Text className="text-neutral-600 dark:text-neutral-400">Listeners:</Text>
                    <Text className={`font-mono ${resourceStats.listeners > 15 ? 'text-orange-600' : 'text-neutral-900 dark:text-white'}`}>
                      {resourceStats.listeners}
                    </Text>
                  </View>
                  
                  <View className="flex-row justify-between">
                    <Text className="text-neutral-600 dark:text-neutral-400">Animations:</Text>
                    <Text className={`font-mono ${resourceStats.animations > 5 ? 'text-orange-600' : 'text-neutral-900 dark:text-white'}`}>
                      {resourceStats.animations}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Recent Crashes */}
              {crashReports.length > 0 && (
                <View>
                  <View className="mb-3 flex-row items-center justify-between">
                    <Text className="text-lg font-semibold text-neutral-900 dark:text-white">
                      Recent Issues
                    </Text>
                    
                    <Pressable
                      onPress={handleClearReports}
                      className="rounded bg-red-600 px-3 py-1"
                      accessibilityRole="button">
                      <Text className="text-xs font-medium text-white">Clear</Text>
                    </Pressable>
                  </View>
                  
                  <View className="space-y-2">
                    {crashReports.slice(-3).map((report, index) => (
                      <View key={index} className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                        <Text className="text-sm font-medium text-red-800 dark:text-red-200">
                          {report.type.replace('_', ' ').toUpperCase()}
                        </Text>
                        <Text className="text-xs text-red-600 dark:text-red-300">
                          {report.error}
                        </Text>
                        <Text className="text-xs text-red-500 dark:text-red-400">
                          {new Date(report.timestamp).toLocaleTimeString()}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Warning Signs */}
              <View>
                <Text className="mb-3 text-lg font-semibold text-neutral-900 dark:text-white">
                  ⚠️ Potential Issues
                </Text>
                
                <View className="space-y-2">
                  {resourceStats.intervals > 5 && (
                    <Text className="text-sm text-orange-600">
                      • High interval count - possible memory leak
                    </Text>
                  )}
                  
                  {resourceStats.subscriptions > 10 && (
                    <Text className="text-sm text-orange-600">
                      • Many active subscriptions - check cleanup
                    </Text>
                  )}
                  
                  {memoryWarnings > 0 && (
                    <Text className="text-sm text-red-600">
                      • Memory warnings detected - optimize usage
                    </Text>
                  )}
                  
                  {crashReports.length > 3 && (
                    <Text className="text-sm text-red-600">
                      • Multiple crashes - investigate error patterns
                    </Text>
                  )}
                  
                  {totalResources > 30 && (
                    <Text className="text-sm text-orange-600">
                      • High resource count - review cleanup logic
                    </Text>
                  )}
                  
                  {/* Show good status if no issues */}
                  {resourceStats.intervals <= 5 && 
                   resourceStats.subscriptions <= 10 && 
                   memoryWarnings === 0 && 
                   crashReports.length <= 3 && 
                   totalResources <= 30 && (
                    <Text className="text-sm text-green-600">
                      ✅ No obvious issues detected
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}
