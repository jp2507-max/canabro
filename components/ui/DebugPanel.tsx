/**
 * Debug Panel for investigating app crashes
 * Provides real-time debugging information
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { useCrashPrevention } from '@/lib/utils/crashPrevention';
import { useResourceCleanup } from '@/lib/hooks/useResourceCleanup';
import { OptimizedIcon } from './OptimizedIcon';
import { useDatabase } from '@/lib/hooks/useDatabase';
import { DataIntegrityService } from '@/lib/services/data-integrity';
import { useAuth } from '@/lib/contexts/AuthProvider';

interface DebugPanelProps {
  visible?: boolean;
  onClose?: () => void;
}

/**
 * Displays a real-time debug panel overlay with crash reports, memory usage, and resource statistics, and provides manual controls for garbage collection and data cleanup.
 *
 * The panel shows memory warnings, crash report summaries, active resource counts, and highlights potential issues. It allows users to force garbage collection, clear crash reports, perform emergency cleanup of orphaned posts, and force synchronization of community data. The panel is only rendered when `visible` is true and can be closed via the provided callback.
 *
 * @param visible - Whether the debug panel is visible
 * @param onClose - Callback to close the panel
 * @returns The debug panel UI overlay, or `null` if not visible
 */
export function DebugPanel({ visible = false, onClose }: DebugPanelProps) {
  const [resourceStats, setResourceStats] = useState({
    intervals: 0,
    timeouts: 0,
    subscriptions: 0,
    listeners: 0,
    animations: 0,
  });
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const { getCrashReports, getMemoryWarningCount, clearCrashReports } = useCrashPrevention();
  const { getResourceCount, getResourcesByType } = useResourceCleanup();
  const database = useDatabase();
  const { session } = useAuth();

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

  const handleEmergencyCleanup = async () => {
    if (!session?.user?.id) {
      Alert.alert('Error', 'No user session found');
      return;
    }

    setIsCleaningUp(true);
    try {
             const integrityService = new DataIntegrityService(database.database);
      const result = await integrityService.emergencyCleanup(session.user.id);
      
      Alert.alert(
        result.success ? 'Success' : 'Warning',
        result.message,
        [
          {
            text: 'Details',
            onPress: () => {
              if (result.details) {
                Alert.alert('Cleanup Details', JSON.stringify(result.details, null, 2));
              }
            }
          },
          { text: 'OK' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', `Cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleForceCommunityCleanup = async () => {
    setIsCleaningUp(true);
    try {
      const integrityService = new DataIntegrityService(database.database);
      const result = await integrityService.forceCleanupLocalCommunityData();
      
      Alert.alert(
        'Community Data Sync',
        `Cleaned up ${result.cleaned} orphaned local records.${result.errors.length > 0 ? ` Errors: ${result.errors.length}` : ''}`,
        [
          ...(result.errors.length > 0 ? [
            {
              text: 'Show Errors',
              onPress: () => {
                Alert.alert('Cleanup Errors', result.errors.join('\n'));
              }
            }
          ] : []),
          { text: 'OK' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', `Community cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsCleaningUp(false);
    }
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

              <Pressable
                onPress={handleEmergencyCleanup}
                disabled={isCleaningUp}
                className="mt-4 p-3 bg-orange-500 rounded-lg disabled:opacity-50"
              >
                <Text className="text-white font-medium text-center">
                  {isCleaningUp ? 'Cleaning up orphaned records...' : 'Emergency Cleanup (Orphaned Posts)'}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleForceCommunityCleanup}
                disabled={isCleaningUp}
                className="mt-2 p-3 bg-red-500 rounded-lg disabled:opacity-50"
              >
                <Text className="text-white font-medium text-center">
                  {isCleaningUp ? 'Force syncing community data...' : 'Force Sync Community Data'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}
