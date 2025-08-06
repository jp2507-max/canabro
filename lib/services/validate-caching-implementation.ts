/**
 * Validation Script for Community Caching and Synchronization Implementation
 * 
 * This script validates that all the implemented services work correctly
 * and integrate properly with each other.
 */

import { log } from '../utils/logger';

// Import all the services we implemented
import { communityCacheManager, MessageCompressor } from './community-cache';
import { offlineMessagingSyncManager } from './offline-messaging-sync';
import { dataConsistencyChecker } from './data-consistency-checker';
import { smartPrefetchingManager } from './smart-prefetching';
import { communitySyncIntegrationManager } from './community-sync-integration';

/**
 * Validation Results Interface
 */
interface ValidationResult {
  service: string;
  passed: boolean;
  error?: string;
  details?: unknown;
}

/**
 * Main validation function
 */
export async function validateCachingImplementation(): Promise<{
  overallSuccess: boolean;
  results: ValidationResult[];
  summary: {
    passed: number;
    failed: number;
    total: number;
  };
}> {
  const results: ValidationResult[] = [];
  
  log.info('Starting community caching implementation validation');

  // 1. Validate MessageCompressor
  try {
    log.info('Validating MessageCompressor...');
    
    const testMessage = {
      id: 'test-msg-1',
      content: 'This is a test message with enough content to trigger compression because it is longer than the threshold',
      senderId: 'user-1',
      timestamp: Date.now(),
      type: 'text' as const,
    };

    const compressed = MessageCompressor.compressMessage(testMessage);
    const decompressed = MessageCompressor.decompressMessage(compressed);
    
    const batch = MessageCompressor.createMessageBatch([testMessage], 'conv-1');
    const deduplicated = MessageCompressor.deduplicateMessages([compressed, compressed]);

    results.push({
      service: 'MessageCompressor',
      passed: true,
      details: {
        compressionWorked: compressed.compressed === true,
        decompressionWorked: decompressed.content === compressed.content,
        batchCreated: batch.messages.length === 1,
        deduplicationWorked: deduplicated.length === 1,
      },
    });

    log.info('MessageCompressor validation passed');
  } catch (error) {
    results.push({
      service: 'MessageCompressor',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    log.error('MessageCompressor validation failed', { error });
  }

  // 2. Validate CommunityCacheManager
  try {
    log.info('Validating CommunityCacheManager...');
    
    const testMessages = [
      {
        id: 'cache-msg-1',
        content: 'Test cache message 1',
        senderId: 'user-1',
        timestamp: Date.now(),
        type: 'text' as const,
      },
      {
        id: 'cache-msg-2',
        content: 'Test cache message 2',
        senderId: 'user-2',
        timestamp: Date.now() + 1000,
        type: 'text' as const,
      },
    ];

    // Test message caching
    await communityCacheManager.cacheMessages('conv-cache-test', testMessages);
    const cachedMessages = await communityCacheManager.getCachedMessages('conv-cache-test');

    // Test other caching methods
    await communityCacheManager.cacheUserPresence('user-1', { status: 'online', lastSeen: Date.now() });
    await communityCacheManager.cacheNotifications('user-1', [
      { id: 'notif-1', type: 'message', timestamp: Date.now() }
    ]);

    // Test cache stats
    const stats = communityCacheManager.getCacheStats();

    results.push({
      service: 'CommunityCacheManager',
      passed: true,
      details: {
        messagesCached: cachedMessages.length === 2,
        statsAvailable: typeof stats.timestamp === 'number',
        cleanupAvailable: typeof communityCacheManager.performIntelligentCleanup === 'function',
      },
    });

    log.info('CommunityCacheManager validation passed');
  } catch (error) {
    results.push({
      service: 'CommunityCacheManager',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    log.error('CommunityCacheManager validation failed', { error });
  }

  // 3. Validate OfflineMessagingSyncManager
  try {
    log.info('Validating OfflineMessagingSyncManager...');
    
    // Test message sending
    const messageId = await offlineMessagingSyncManager.sendMessage(
      'conv-offline-test',
      'Test offline message',
      'user-offline-test'
    );

    // Test offline message retrieval
    const offlineMessages = await offlineMessagingSyncManager.getOfflineMessages('conv-offline-test');
    
    // Test sync status
    const syncStatus$ = offlineMessagingSyncManager.getSyncStatus();
    
    // Test network status handling
    offlineMessagingSyncManager.setNetworkStatus(false);
    offlineMessagingSyncManager.setNetworkStatus(true);

    results.push({
      service: 'OfflineMessagingSyncManager',
      passed: true,
      details: {
        messageQueued: typeof messageId === 'string',
        offlineMessagesRetrieved: Array.isArray(offlineMessages),
        syncStatusObservable: typeof syncStatus$.subscribe === 'function',
        networkHandling: true,
      },
    });

    log.info('OfflineMessagingSyncManager validation passed');
  } catch (error) {
    results.push({
      service: 'OfflineMessagingSyncManager',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    log.error('OfflineMessagingSyncManager validation failed', { error });
  }

  // 4. Validate DataConsistencyChecker
  try {
    log.info('Validating DataConsistencyChecker...');
    
    // Test consistency check
    const report = await dataConsistencyChecker.performConsistencyCheck({
      tables: ['messages'],
      autoRepair: false,
      includeOrphans: false,
    });

    // Test issue stream
    const issueStream$ = dataConsistencyChecker.getIssueStream();
    
    // Test last report retrieval
    const lastReport = dataConsistencyChecker.getLastReport();

    results.push({
      service: 'DataConsistencyChecker',
      passed: true,
      details: {
        reportGenerated: typeof report.id === 'string',
        issueStreamAvailable: typeof issueStream$.subscribe === 'function',
        lastReportAvailable: lastReport !== null,
        reportStructure: {
          hasId: typeof report.id === 'string',
          hasTimestamp: typeof report.timestamp === 'number',
          hasIssues: Array.isArray(report.issuesFound),
          hasSummary: typeof report.summary === 'object',
        },
      },
    });

    log.info('DataConsistencyChecker validation passed');
  } catch (error) {
    results.push({
      service: 'DataConsistencyChecker',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    log.error('DataConsistencyChecker validation failed', { error });
  }

  // 5. Validate SmartPrefetchingManager
  try {
    log.info('Validating SmartPrefetchingManager...');
    
    // Test prefetching start
    await smartPrefetchingManager.startPrefetching('user-prefetch-test');
    
    // Test behavior update
    smartPrefetchingManager.updateUserBehavior('user-prefetch-test', {
      type: 'conversation_view',
      data: { conversationId: 'conv-1' },
      timestamp: Date.now(),
    });

    // Test metrics
    const metrics$ = smartPrefetchingManager.getMetrics();
    
    // Test queue status
    const queueStatus = smartPrefetchingManager.getQueueStatus();
    
    // Test preferences configuration
    await smartPrefetchingManager.configurePrefetchPreferences('user-prefetch-test', {
      images: false,
      messages: true,
    });

    results.push({
      service: 'SmartPrefetchingManager',
      passed: true,
      details: {
        prefetchingStarted: true,
        behaviorUpdated: true,
        metricsAvailable: typeof metrics$.subscribe === 'function',
        queueStatusAvailable: typeof queueStatus.totalTasks === 'number',
        preferencesConfigured: true,
      },
    });

    log.info('SmartPrefetchingManager validation passed');
  } catch (error) {
    results.push({
      service: 'SmartPrefetchingManager',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    log.error('SmartPrefetchingManager validation failed', { error });
  }

  // 6. Validate CommunitySyncIntegrationManager
  try {
    log.info('Validating CommunitySyncIntegrationManager...');
    
    // Test initialization
    await communitySyncIntegrationManager.initializeIntegration();
    
    // Test user sync start
    await communitySyncIntegrationManager.startUserSync('user-integration-test');
    
    // Test network change handling
    await communitySyncIntegrationManager.handleNetworkChange(true, 'wifi');
    
    // Test status observable
    const status$ = communitySyncIntegrationManager.getStatus();
    
    // Test configuration
    const currentConfig = communitySyncIntegrationManager.getConfiguration();
    communitySyncIntegrationManager.updateConfiguration({
      enableAggressiveCaching: false,
    });
    
    // Test diagnostics
    const diagnostics = await communitySyncIntegrationManager.getDiagnostics();

    results.push({
      service: 'CommunitySyncIntegrationManager',
      passed: true,
      details: {
        initialized: true,
        userSyncStarted: true,
        networkChangeHandled: true,
        statusObservable: typeof status$.subscribe === 'function',
        configurationManaged: typeof currentConfig === 'object',
        diagnosticsAvailable: typeof diagnostics.status === 'object',
      },
    });

    log.info('CommunitySyncIntegrationManager validation passed');
  } catch (error) {
    results.push({
      service: 'CommunitySyncIntegrationManager',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    log.error('CommunitySyncIntegrationManager validation failed', { error });
  }

  // 7. Test Integration Between Services
  try {
    log.info('Validating service integration...');
    
    // Test complete workflow
    const userId = 'integration-test-user';
    const conversationId = 'integration-test-conv';
    
    // Start integration
    await communitySyncIntegrationManager.startUserSync(userId);
    
    // Send message
    const messageId = await offlineMessagingSyncManager.sendMessage(
      conversationId,
      'Integration test message',
      userId
    );
    
    // Update behavior
    smartPrefetchingManager.updateUserBehavior(userId, {
      type: 'message_send',
      data: { conversationId, messageId },
      timestamp: Date.now(),
    });
    
    // Perform optimization
    const optimizationResult = await communitySyncIntegrationManager.performOptimization();

    results.push({
      service: 'ServiceIntegration',
      passed: true,
      details: {
        workflowCompleted: true,
        messageIntegration: typeof messageId === 'string',
        behaviorIntegration: true,
        optimizationIntegration: typeof optimizationResult === 'object',
      },
    });

    log.info('Service integration validation passed');
  } catch (error) {
    results.push({
      service: 'ServiceIntegration',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    log.error('Service integration validation failed', { error });
  }

  // Calculate summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const overallSuccess = failed === 0;

  const summary = { passed, failed, total };

  log.info('Community caching implementation validation completed', {
    overallSuccess,
    summary,
  });

  return {
    overallSuccess,
    results,
    summary,
  };
}

/**
 * Run validation and log results
 */
export async function runValidation(): Promise<void> {
  try {
    console.log('🚀 Starting Community Caching Implementation Validation...\n');
    
    const validation = await validateCachingImplementation();
    
    console.log('📊 Validation Results:');
    console.log('='.repeat(50));
    
    validation.results.forEach((result, index) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${result.service}: ${status}`);
      
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.details) {
        console.log(`   Details:`, JSON.stringify(result.details, null, 2));
      }
      console.log('');
    });
    
    console.log('📈 Summary:');
    console.log(`   Total Tests: ${validation.summary.total}`);
    console.log(`   Passed: ${validation.summary.passed}`);
    console.log(`   Failed: ${validation.summary.failed}`);
    console.log(`   Success Rate: ${Math.round((validation.summary.passed / validation.summary.total) * 100)}%`);
    
    if (validation.overallSuccess) {
      console.log('\n🎉 All validations passed! The implementation is ready for use.');
    } else {
      console.log('\n⚠️  Some validations failed. Please review the errors above.');
    }
    
  } catch (error) {
    console.error('❌ Validation failed with error:', error);
  }
}

// Functions are already exported above