/**
 * Community Caching and Synchronization Usage Examples (2025 Standards)
 * 
 * Demonstrates how to use the comprehensive caching and sync system
 * in real-world scenarios with best practices and performance optimization.
 */

import { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';

import { useDebounce } from '../hooks/useDebounce';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { communityCacheManager } from './community-cache';
import { offlineMessagingSyncManager } from './offline-messaging-sync';
import { dataConsistencyChecker } from './data-consistency-checker';
import { smartPrefetchingManager } from './smart-prefetching';
import { communitySyncIntegrationManager } from './community-sync-integration';
import { log } from '../utils/logger';

/**
 * Example 1: Basic Message Caching and Offline Sync
 */
export function useMessagingWithOfflineSync(conversationId: string, userId: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('idle');

  // Initialize sync system
  useEffect(() => {
    const initializeSync = async () => {
      try {
        // Start comprehensive sync for user
        await communitySyncIntegrationManager.startUserSync(userId);
        
        // Load cached messages first for immediate display
        const cachedMessages = await communityCacheManager.getCachedMessages(conversationId);
        if (cachedMessages.length > 0) {
          setMessages(cachedMessages);
          setIsLoading(false);
        }

        log.info('Messaging sync initialized', { conversationId, userId });
      } catch (error) {
        log.error('Failed to initialize messaging sync', { error });
      }
    };

    initializeSync();
  }, [conversationId, userId]);

  // Listen to sync status changes
  useEffect(() => {
    const subscription = offlineMessagingSyncManager.getSyncStatus().subscribe(status => {
      setSyncStatus(status);
      setIsSyncing(status === 'syncing');
    });

    return () => subscription.unsubscribe();
  }, []);

  // Debounced message sending to prevent spam
  const sendMessage = useDebouncedCallback(
    async (content: string) => {
      try {
        // Send message (works offline)
        const messageId = await offlineMessagingSyncManager.sendMessage(
          conversationId,
          content,
          userId
        );

        // Update user behavior for smart prefetching
        smartPrefetchingManager.updateUserBehavior(userId, {
          type: 'message_send',
          data: { conversationId, messageId },
          timestamp: Date.now(),
        });

        // Optimistically update UI
        const optimisticMessage = {
          id: messageId,
          content,
          senderId: userId,
          timestamp: Date.now(),
          status: 'pending',
        };

        setMessages(prev => [...prev, optimisticMessage]);

        log.debug('Message sent', { messageId, conversationId });
      } catch (error) {
        log.error('Failed to send message', { error });
        Alert.alert('Error', 'Failed to send message. It will be retried when online.');
      }
    },
    300 // 300ms debounce
  );

  // Force sync when user pulls to refresh
  const handleRefresh = useCallback(async () => {
    try {
      setIsSyncing(true);
      await communitySyncIntegrationManager.forceSyncAll();
      
      // Reload messages from cache
      const updatedMessages = await communityCacheManager.getCachedMessages(conversationId);
      setMessages(updatedMessages);
    } catch (error) {
      log.error('Refresh failed', { error });
    } finally {
      setIsSyncing(false);
    }
  }, [conversationId]);

  return {
    messages,
    isLoading,
    isSyncing,
    syncStatus,
    sendMessage,
    handleRefresh,
  };
}

/**
 * Example 2: Smart Prefetching with User Behavior Tracking
 */
export function useSmartContentPrefetching(userId: string) {
  const [prefetchMetrics, setPrefetchMetrics] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Initialize prefetching
  useEffect(() => {
    const initializePrefetching = async () => {
      try {
        await smartPrefetchingManager.startPrefetching(userId);
        log.info('Smart prefetching initialized', { userId });
      } catch (error) {
        log.error('Failed to initialize prefetching', { error });
      }
    };

    initializePrefetching();
  }, [userId]);

  // Monitor prefetch metrics
  useEffect(() => {
    const subscription = smartPrefetchingManager.getMetrics().subscribe(metrics => {
      setPrefetchMetrics(metrics);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Track user interactions for better prefetching
  const trackUserActivity = useCallback((activity: {
    type: 'conversation_view' | 'topic_view' | 'search';
    data: any;
  }) => {
    smartPrefetchingManager.updateUserBehavior(userId, {
      ...activity,
      timestamp: Date.now(),
    });
  }, [userId]);

  // Configure prefetch preferences
  const updatePrefetchPreferences = useCallback(async (preferences: {
    images?: boolean;
    messages?: boolean;
    notifications?: boolean;
    socialFeed?: boolean;
  }) => {
    try {
      await smartPrefetchingManager.configurePrefetchPreferences(userId, preferences);
      log.info('Prefetch preferences updated', { userId, preferences });
    } catch (error) {
      log.error('Failed to update prefetch preferences', { error });
    }
  }, [userId]);

  // Perform optimization
  const optimizePerformance = useCallback(async () => {
    try {
      setIsOptimizing(true);
      const result = await communitySyncIntegrationManager.performOptimization();
      
      if (result.recommendations.length > 0) {
        Alert.alert(
          'Optimization Complete',
          `Performance optimized. ${result.recommendations.length} recommendations available.`
        );
      }

      log.info('Performance optimization completed', { result });
    } catch (error) {
      log.error('Performance optimization failed', { error });
      Alert.alert('Error', 'Performance optimization failed. Please try again.');
    } finally {
      setIsOptimizing(false);
    }
  }, []);

  return {
    prefetchMetrics,
    isOptimizing,
    trackUserActivity,
    updatePrefetchPreferences,
    optimizePerformance,
  };
}

/**
 * Example 3: Data Consistency Monitoring and Repair
 */
export function useDataConsistencyMonitoring() {
  const [consistencyReport, setConsistencyReport] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [criticalIssues, setCriticalIssues] = useState<any[]>([]);

  // Monitor consistency issues
  useEffect(() => {
    const subscription = dataConsistencyChecker.getIssueStream().subscribe(issue => {
      if (issue.severity === 'critical' || issue.severity === 'high') {
        setCriticalIssues(prev => [...prev, issue]);
        
        // Alert user about critical issues
        if (issue.severity === 'critical') {
          Alert.alert(
            'Data Integrity Issue',
            `Critical issue detected: ${issue.description}`,
            [
              { text: 'Ignore', style: 'cancel' },
              { text: 'Repair', onPress: () => repairIssue(issue) },
            ]
          );
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Perform consistency check
  const performConsistencyCheck = useCallback(async (autoRepair = false) => {
    try {
      setIsChecking(true);
      
      const report = await dataConsistencyChecker.performConsistencyCheck({
        autoRepair,
        includeOrphans: true,
      });

      setConsistencyReport(report);
      
      if (report.summary.critical > 0 || report.summary.high > 0) {
        Alert.alert(
          'Data Issues Found',
          `Found ${report.summary.critical} critical and ${report.summary.high} high priority issues.`,
          [
            { text: 'View Report', onPress: () => showDetailedReport(report) },
            { text: 'Auto Repair', onPress: () => performConsistencyCheck(true) },
          ]
        );
      }

      log.info('Consistency check completed', { 
        issuesFound: report.issuesFound.length,
        issuesRepaired: report.issuesRepaired.length,
      });
    } catch (error) {
      log.error('Consistency check failed', { error });
      Alert.alert('Error', 'Data consistency check failed. Please try again.');
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Repair specific issue
  const repairIssue = useCallback(async (issue: any) => {
    try {
      const repaired = await dataConsistencyChecker.repairIssue(issue);
      
      if (repaired) {
        setCriticalIssues(prev => prev.filter(i => i.id !== issue.id));
        Alert.alert('Success', 'Issue repaired successfully.');
      } else {
        Alert.alert('Error', 'Failed to repair issue. Manual intervention may be required.');
      }
    } catch (error) {
      log.error('Issue repair failed', { issueId: issue.id, error });
      Alert.alert('Error', 'Failed to repair issue.');
    }
  }, []);

  // Show detailed report
  const showDetailedReport = useCallback((report: any) => {
    // This would navigate to a detailed report screen
    log.info('Showing detailed consistency report', { reportId: report.id });
  }, []);

  return {
    consistencyReport,
    isChecking,
    criticalIssues,
    performConsistencyCheck,
    repairIssue,
  };
}

/**
 * Example 4: Network-Aware Sync Management
 */
export function useNetworkAwareSync() {
  const [networkStatus, setNetworkStatus] = useState<{
    isOnline: boolean;
    type: 'wifi' | 'cellular' | 'none';
  }>({ isOnline: true, type: 'wifi' });
  
  const [syncIntegrationStatus, setSyncIntegrationStatus] = useState<any>(null);

  // Monitor network changes
  useEffect(() => {
    // This would integrate with a network monitoring library
    const handleNetworkChange = async (isOnline: boolean, type: 'wifi' | 'cellular' | 'none') => {
      setNetworkStatus({ isOnline, type });
      
      // Update sync system
      await communitySyncIntegrationManager.handleNetworkChange(isOnline, type);
      
      log.info('Network status changed', { isOnline, type });
    };

    // Simulate network changes for demo
    const interval = setInterval(() => {
      // This would be replaced with actual network monitoring
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Monitor sync integration status
  useEffect(() => {
    const subscription = communitySyncIntegrationManager.getStatus().subscribe(status => {
      setSyncIntegrationStatus(status);
      
      // Handle critical status changes
      if (status.overall === 'error') {
        Alert.alert(
          'Sync System Error',
          'The synchronization system encountered errors. Some features may not work properly.',
          [
            { text: 'Ignore', style: 'cancel' },
            { text: 'Diagnose', onPress: showDiagnostics },
          ]
        );
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show system diagnostics
  const showDiagnostics = useCallback(async () => {
    try {
      const diagnostics = await communitySyncIntegrationManager.getDiagnostics();
      
      // This would show a detailed diagnostics screen
      log.info('System diagnostics', { diagnostics });
      
      Alert.alert(
        'System Diagnostics',
        `Cache Hit Rate: ${diagnostics.status.metrics.cacheHitRate}%\n` +
        `Sync Queue: ${diagnostics.status.metrics.syncQueueSize} items\n` +
        `Data Integrity: ${diagnostics.status.metrics.dataIntegrityScore}%`
      );
    } catch (error) {
      log.error('Failed to get diagnostics', { error });
    }
  }, []);

  // Configure sync optimization
  const configureSyncOptimization = useCallback((config: {
    enableAggressiveCaching?: boolean;
    enablePredictivePrefetch?: boolean;
    autoRepairConsistency?: boolean;
    syncFrequency?: 'realtime' | 'frequent' | 'normal' | 'conservative';
  }) => {
    communitySyncIntegrationManager.updateConfiguration(config);
    log.info('Sync configuration updated', { config });
  }, []);

  return {
    networkStatus,
    syncIntegrationStatus,
    showDiagnostics,
    configureSyncOptimization,
  };
}

// Export all hooks for use in components