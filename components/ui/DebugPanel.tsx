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
import { useTranslation } from 'react-i18next';

interface DebugPanelProps {
  visible?: boolean;
  onClose?: () => void;
}

export function DebugPanel({ visible = false, onClose }: DebugPanelProps) {
  const { t } = useTranslation();
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
      Alert.alert(t('debug.alerts.error'), t('debug.alerts.noUserSession'));
      return;
    }

    setIsCleaningUp(true);
    try {
             const integrityService = new DataIntegrityService(database.database);
      const result = await integrityService.emergencyCleanup(session.user.id);
      
      Alert.alert(
        result.success ? t('debug.alerts.success') : t('debug.alerts.warning'),
        result.message,
        [
          {
            text: t('debug.alerts.details'),
            onPress: () => {
              if (result.details) {
                Alert.alert(t('debug.alerts.cleanupDetails'), JSON.stringify(result.details, null, 2));
              }
            }
          },
          { text: t('debug.alerts.ok') }
        ]
      );
    } catch (error) {
      Alert.alert(t('debug.alerts.error'), `${t('debug.alerts.cleanupFailed')}: ${error instanceof Error ? error.message : String(error)}`);
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
        t('debug.alerts.communityDataSync'),
        `${t('debug.alerts.cleanedRecords', { count: result.cleaned })}${result.errors.length > 0 ? ` ${t('debug.alerts.errors')}: ${result.errors.length}` : ''}`,
        [
          ...(result.errors.length > 0 ? [
            {
              text: t('debug.alerts.showErrors'),
              onPress: () => {
                Alert.alert(t('debug.alerts.cleanupErrors'), result.errors.join('\n'));
              }
            }
          ] : []),
          { text: t('debug.alerts.ok') }
        ]
      );
    } catch (error) {
      Alert.alert(t('debug.alerts.error'), `${t('debug.alerts.communityCleanupFailed')}: ${error instanceof Error ? error.message : String(error)}`);
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
              🔧 {t('debug.title')}
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
                  {t('debug.sections.memoryUsage')}
                </Text>
                
                <View className="space-y-2">
                  <View className="flex-row justify-between">
                    <Text className="text-neutral-600 dark:text-neutral-400">{t('debug.memory.warnings')}:</Text>
                    <Text className={`font-mono ${memoryWarnings > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {memoryWarnings}
                    </Text>
                  </View>
                  
                  <View className="flex-row justify-between">
                    <Text className="text-neutral-600 dark:text-neutral-400">{t('debug.sections.crashReports')}:</Text>
                    <Text className={`font-mono ${crashReports.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {crashReports.length}
                    </Text>
                  </View>
                  
                  <Pressable
                    onPress={handleForceGC}
                    className="mt-2 rounded-lg bg-blue-600 px-4 py-2"
                    accessibilityRole="button">
                    <Text className="text-center font-medium text-white">{t('debug.memory.forceGC')}</Text>
                  </Pressable>
                </View>
              </View>

              {/* Resource Tracking */}
              <View>
                <Text className="mb-3 text-lg font-semibold text-neutral-900 dark:text-white">
                  {t('debug.sections.resourceMonitoring')} ({totalResources})
                </Text>
                
                <View className="space-y-2">
                  <View className="flex-row justify-between">
                    <Text className="text-neutral-600 dark:text-neutral-400">{t('debug.resources.intervals')}:</Text>
                    <Text className={`font-mono ${resourceStats.intervals > 5 ? 'text-orange-600' : 'text-neutral-900 dark:text-white'}`}>
                      {resourceStats.intervals}
                    </Text>
                  </View>
                  
                  <View className="flex-row justify-between">
                    <Text className="text-neutral-600 dark:text-neutral-400">{t('debug.resources.timeouts')}:</Text>
                    <Text className={`font-mono ${resourceStats.timeouts > 10 ? 'text-orange-600' : 'text-neutral-900 dark:text-white'}`}>
                      {resourceStats.timeouts}
                    </Text>
                  </View>
                  
                  <View className="flex-row justify-between">
                    <Text className="text-neutral-600 dark:text-neutral-400">{t('debug.resources.subscriptions')}:</Text>
                    <Text className={`font-mono ${resourceStats.subscriptions > 10 ? 'text-orange-600' : 'text-neutral-900 dark:text-white'}`}>
                      {resourceStats.subscriptions}
                    </Text>
                  </View>
                  
                  <View className="flex-row justify-between">
                    <Text className="text-neutral-600 dark:text-neutral-400">{t('debug.resources.listeners')}:</Text>
                    <Text className={`font-mono ${resourceStats.listeners > 15 ? 'text-orange-600' : 'text-neutral-900 dark:text-white'}`}>
                      {resourceStats.listeners}
                    </Text>
                  </View>
                  
                  <View className="flex-row justify-between">
                    <Text className="text-neutral-600 dark:text-neutral-400">{t('debug.resources.animations')}:</Text>
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
                      {t('debug.crashes.recentCrashes')}
                    </Text>
                    
                    <Pressable
                      onPress={handleClearReports}
                      className="rounded bg-red-600 px-3 py-1"
                      accessibilityRole="button">
                      <Text className="text-xs font-medium text-white">{t('debug.crashes.clearReports')}</Text>
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
                  {t('debug.sections.potentialIssues')}
                </Text>
                
                <View className="space-y-2">
                  {resourceStats.intervals > 5 && (
                    <Text className="text-sm text-orange-600">
                      {t('debug.warnings.highIntervals')}
                    </Text>
                  )}
                  
                  {resourceStats.subscriptions > 10 && (
                    <Text className="text-sm text-orange-600">
                      {t('debug.warnings.manySubscriptions')}
                    </Text>
                  )}
                  
                  {memoryWarnings > 0 && (
                    <Text className="text-sm text-red-600">
                      {t('debug.warnings.memoryWarnings')}
                    </Text>
                  )}
                  
                  {crashReports.length > 3 && (
                    <Text className="text-sm text-red-600">
                      {t('debug.warnings.multipleCrashes')}
                    </Text>
                  )}
                  
                  {totalResources > 30 && (
                    <Text className="text-sm text-orange-600">
                      {t('debug.warnings.highResources')}
                    </Text>
                  )}
                  
                  {/* Show good status if no issues */}
                  {resourceStats.intervals <= 5 && 
                   resourceStats.subscriptions <= 10 && 
                   memoryWarnings === 0 && 
                   crashReports.length <= 3 && 
                   totalResources <= 30 && (
                    <Text className="text-sm text-green-600">
                      {t('debug.warnings.noIssues')}
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
                  {isCleaningUp ? t('debug.actions.cleaningUp') : t('debug.actions.emergencyCleanup')}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleForceCommunityCleanup}
                disabled={isCleaningUp}
                className="mt-2 p-3 bg-red-500 rounded-lg disabled:opacity-50"
              >
                <Text className="text-white font-medium text-center">
                  {isCleaningUp ? t('debug.actions.syncingCommunity') : t('debug.actions.forceSyncCommunity')}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}
