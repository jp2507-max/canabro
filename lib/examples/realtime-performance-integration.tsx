/**
 * Realtime Performance Integration Example (2025 Standards)
 * 
 * Demonstrates how to integrate all performance optimizations for realtime features:
 * - Enhanced WebSocket connection management
 * - Intelligent message batching with rate limiting
 * - FlashList optimization for large message histories
 * - Memory management and resource cleanup
 * - Database query optimization
 * - Performance monitoring and testing
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

// Performance utilities
import { useFlashListPerformance, FLASHLIST_PRESETS } from '../utils/flashlist-performance';
import { useRealtimeResourceCleanup } from '../hooks/useRealtimeResourceCleanup';
import { realtimePerformanceOptimizer } from '../services/realtimePerformanceOptimizer';
import { executeOptimizedQuery } from '../utils/database-optimization';
import { performanceTester, DEFAULT_TEST_CONFIG } from '../utils/performance-testing';

import { ErrorBoundary } from 'react-error-boundary';

// Existing components
import { FlashListWrapper } from '../../components/ui/FlashListWrapper';
import ThemedView from '../../components/ui/ThemedView';
import ThemedText from '../../components/ui/ThemedText';

// Services
import { realtimeService } from '../services/realtimeService';
import supabase from '../supabase';
import { log } from '../utils/logger';
import * as haptics from '../utils/haptics';
/**
 * Local minimal i18n shim to satisfy eslint no-literal-strings and TS types
 * without introducing new dependencies. Replace with your real i18n if available.
 */
const t = (key: string, params?: Record<string, string>): string => {
  const templates: Record<string, string> = {
    'errors.generic': 'An error occurred',
    'errors.messagingLoad': 'Something went wrong while loading messaging data.',
    'actions.retry': 'Retry',
    'perf.status.line':
      'Messages: {messages} | Memory: {memory} | Status: {status} | Connections: {healthy}/{active} | Health: {health} | Rate: {rate}/s | Errors: {errors}',
    'loading.messages': 'Loading messages...',
    'status.connected': 'Connected',
    'status.connecting': 'Connecting...',
    'status.disconnected': 'Disconnected',
    'perf.panel.header': 'Performance Test Runner',
    'perf.panel.subtitle': 'Run comprehensive performance tests for realtime features',
    'perf.panel.running': 'Running...',
    'perf.panel.ready': 'Ready to test',
    'perf.panel.run': 'Run tests',
    'perf.results.header': 'Test Results (Score: {score}/100)',
    'perf.results.passed': 'Passed: {passed}/{total}',
    'perf.results.critical': 'Critical Issues:',
    'perf.results.recommendations': 'Recommendations:',
  };
  const template = templates[key] ?? key;
  if (!params) return template;
  return Object.entries(params).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
    template
  );
};
interface MessageListItem extends Record<string, unknown> {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  timestamp: number;
  type: 'message' | 'system' | 'notification';
  size?: number;
}

interface Message extends MessageListItem {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  timestamp: number;
  type: 'message' | 'system' | 'notification';
  size?: number;
}

interface OptimizedMessagingProps {
  conversationId: string;
  userId: string;
  enablePerformanceTesting?: boolean;
}

/**
 * Simple error fallback component to show errors and allow retry.
 */
function MessagingErrorFallback({
  error,
  resetErrorBoundary
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <ThemedView variant="card" className="m-4 p-4 rounded-lg">
      <ThemedText className="text-base font-semibold mb-2">
        {t('errors.generic')}
      </ThemedText>
      <ThemedText className="text-sm opacity-80 mb-4">
        {error?.message ?? t('errors.messagingLoad')}
      </ThemedText>
      <View className="bg-blue-500 px-4 py-2 rounded self-start">
        <ThemedText
          className="text-white font-medium"
          accessibilityRole="button"
          onPress={resetErrorBoundary}
        >
          {t('actions.retry')}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

/**
 * Example component demonstrating all performance optimizations
 * Inner component without error boundary wrapper.
 */
export function OptimizedMessagingExampleInner({
  conversationId,
  userId,
  enablePerformanceTesting = false
}: OptimizedMessagingProps) {
  // State
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [connectionStatus, setConnectionStatus] = React.useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  // Performance hooks
  const realtimeCleanup = useRealtimeResourceCleanup({
    enableMemoryPressureHandling: true,
    memoryThresholdMB: 50,
    aggressiveCleanupThresholdMB: 100,
    cleanupIntervalMs: 30000
  });
  
  // FlashList performance optimization
  const {
    flashListProps,
    metrics: flashListMetrics,
    scrollToBottom,
  } = useFlashListPerformance<MessageListItem>(messages, FLASHLIST_PRESETS.LARGE_MESSAGE_HISTORY);
  
  // Shared values for animations
  const scrollY = useSharedValue(0);
  const isScrolling = useSharedValue(false);
  
  /**
   * Initialize realtime connection with performance optimization
   */
  const initializeRealtimeConnection = useCallback(async () => {
    try {
      log.info('[OptimizedMessaging] Initializing realtime connection');
      
      // Subscribe to conversation with performance optimization
      const channel = await realtimeService.subscribeToConversation(conversationId, {
        onNewMessage: (message: unknown) => {
          log.debug('[OptimizedMessaging] New message received:', message);
          
          // Batch message updates for better performance
          realtimePerformanceOptimizer.batchMessage(
            `conversation:${conversationId}`,
            { type: 'new_message', message },
            'normal'
          );
          
          // Update messages state
          setMessages(prev => [...prev, message as Message]);
        },
        
        onMessageUpdate: (message: unknown) => {
          const msg = message as unknown as Message;
          setMessages(prev => prev.map(m => 
            m.id === msg.id ? msg : m
          ));
        },
        
        onMessageDelete: (message: unknown) => {
          const msg = message as unknown as Message;
          setMessages(prev => prev.filter(m => m.id !== msg.id));
        },
        
        onTyping: (payload) => {
          log.debug('[OptimizedMessaging] Typing indicator:', payload);
        },
        
        onPresenceChange: (state) => {
          log.debug('[OptimizedMessaging] Presence change:', state);
        }
      });
      
      // Register channel for cleanup
      realtimeCleanup.registerRealtimeChannel(channel, conversationId, 'high');
      
      // Optimize connection
      await realtimePerformanceOptimizer.optimizeConnection(conversationId, channel);
      
      setConnectionStatus('connected');
      
    } catch (error) {
      log.error('[OptimizedMessaging] Failed to initialize realtime connection:', error);
      setConnectionStatus('disconnected');
    }
  }, [conversationId, realtimeCleanup]);
  
  /**
   * Load message history with database optimization
   */
  const loadMessageHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Use optimized query with caching
      const { data, error, metrics } = await executeOptimizedQuery(
        supabase
          .from('messages')
          .select('*')
          .eq('thread_id', conversationId)
          .order('sent_at', { ascending: false })
          .limit(1000), // Load last 1000 messages
        {
          cacheKey: `messages_${conversationId}`,
          cacheTTL: 300000, // 5 minutes
          enableCache: true,
          trackPerformance: true,
          table: 'messages',
          operation: 'SELECT'
        }
      );
      
      if (error) {
        log.error('[OptimizedMessaging] Failed to load messages:', error);
        return;
      }
      
      if (metrics) {
        log.info('[OptimizedMessaging] Query performance:', {
          executionTime: metrics.executionTime,
          rowsAffected: metrics.rowsAffected
        });
      }
      
      // Transform and set messages
      type MessageRow = {
        id: string;
        thread_id: string;
        sender_id: string;
        content: string;
        sent_at: string | number | Date;
        message_type?: 'message' | 'system' | 'notification';
      };
      const rows = (data ?? []) as MessageRow[];
      const transformedMessages: Message[] = rows.map((msg) => ({
        id: String(msg.id),
        threadId: String(msg.thread_id),
        senderId: String(msg.sender_id),
        content: String(msg.content),
        timestamp: new Date(msg.sent_at as string | number | Date).getTime(),
        type: (msg.message_type as Message['type']) || 'message',
        size: typeof msg.content === 'string' && msg.content.length
          ? Math.max(60, msg.content.length * 0.5)
          : 80
      })).reverse(); // Reverse to show newest at bottom
      
      setMessages(transformedMessages);
      
      // Scroll to bottom after loading
      setTimeout(() => scrollToBottom(false), 100);
      
    } catch (error) {
      log.error('[OptimizedMessaging] Error loading message history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, scrollToBottom]);
  
  /**
   * Send message with performance optimization
   */
  const sendMessage = useCallback(async (content: string) => {
    try {
      // Capture a stable temp ID once to be reused in cleanup paths
      const tempId = `temp_${Date.now()}`;
      const now = Date.now();

      const tempMessage: Message = {
        id: tempId,
        threadId: conversationId,
        senderId: userId,
        content,
        timestamp: now,
        type: 'message',
        size: Math.max(60, content.length * 0.5)
      };
      
      // Optimistically add message
      setMessages(prev => [...prev, tempMessage]);
      
      // Send via optimized realtime service
      await realtimePerformanceOptimizer.batchMessage(
        `conversation:${conversationId}`,
        {
          type: 'send_message',
          payload: {
            threadId: conversationId,
            senderId: userId,
            content,
            timestamp: now
          }
        },
        'high' // High priority for user messages
      );
      
      // Haptic feedback on successful send (before scrolling)
      try {
        // Trigger standard impact haptic if available in runtime
        await (haptics as { impact?: () => Promise<void> }).impact?.();
      } catch (e) {
        // Non-fatal: haptics may be unavailable in some environments (e.g., web/tests)
        log.debug?.('[OptimizedMessaging] Haptics impact skipped:', e);
      }
      
      // Scroll to bottom
      scrollToBottom(true);
      
    } catch (error) {
      log.error('[OptimizedMessaging] Failed to send message:', error);
      
      // Remove optimistic message on error using the stable tempId
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp_')));
    }
  }, [conversationId, userId, scrollToBottom]);
  
  /**
   * Run performance tests if enabled
   */
  const runPerformanceTests = useCallback(async () => {
    if (!enablePerformanceTesting) return;
    
    try {
      log.info('[OptimizedMessaging] Running performance tests');
      
      const testConfig = {
        ...DEFAULT_TEST_CONFIG,
        maxListItems: messages.length,
        testDuration: 10, // 10 seconds for quick test
        memoryTestDuration: 30 // 30 seconds
      };
      
      const report = await performanceTester.runPerformanceTests(testConfig);
      
      log.info('[OptimizedMessaging] Performance test results:', {
        overallScore: report.overallScore,
        passedTests: report.summary.passedTests,
        failedTests: report.summary.failedTests,
        criticalIssues: report.summary.criticalIssues
      });
      
      // Log recommendations
      if (report.summary.recommendations.length > 0) {
        log.warn('[OptimizedMessaging] Performance recommendations:', report.summary.recommendations);
      }
      
    } catch (error) {
      log.error('[OptimizedMessaging] Performance testing failed:', error);
    }
  }, [messages.length, enablePerformanceTesting]);
  
  /**
   * Render message item with optimization
   */
  const renderMessage = useCallback(({ item }: { item: Message; index: number }) => {
    return (
      <ThemedView
        key={item.id}
        variant="card"
        className="mx-4 my-2 p-3 rounded-lg"
      >
        <ThemedText className="text-sm font-medium mb-1">
          {item.senderId === userId ? 'You' : `User ${item.senderId.slice(-4)}`}
        </ThemedText>
        <ThemedText className="text-base">
          {item.content}
        </ThemedText>
        <ThemedText className="text-xs opacity-60 mt-1">
          {new Date(item.timestamp).toLocaleTimeString()}
        </ThemedText>
      </ThemedView>
    );
  }, [userId]);
  
  /**
   * Performance monitoring display
   */
  const performanceInfo = useMemo(() => {
    const realtimeMetrics = realtimePerformanceOptimizer.getPerformanceMetrics();
    const connectionPoolStatus = realtimePerformanceOptimizer.getConnectionPoolStatus();
    
    return {
      messages: messages.length,
      memoryUsage: `${(flashListMetrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`,
      connectionStatus,
      activeConnections: connectionPoolStatus.totalConnections,
      healthyConnections: connectionPoolStatus.healthyConnections,
      averageHealth: `${connectionPoolStatus.averageHealth.toFixed(0)}%`,
      messagesSentPerSecond: realtimeMetrics.messagesSentPerSecond.toFixed(1),
      errorRate: `${(realtimeMetrics.errorRate).toFixed(1)}%`
    };
  }, [messages.length, flashListMetrics, connectionStatus]);
  
  // Initialize on mount
  useEffect(() => {
    loadMessageHistory();
    initializeRealtimeConnection();
    
    // Run performance tests after initialization
    if (enablePerformanceTesting) {
      setTimeout(runPerformanceTests, 5000);
    }
  }, [loadMessageHistory, initializeRealtimeConnection, runPerformanceTests, enablePerformanceTesting]);
  
  // Register animation cleanup
  useEffect(() => {
    // Cast to unknown[] to satisfy generic for cleanup registry
    realtimeCleanup.registerAnimationCleanup(
      [scrollY as unknown as never, isScrolling as unknown as never],
      'messaging_animations'
    );
  }, [realtimeCleanup, scrollY, isScrolling]);
  
  return (
    <ThemedView className="flex-1">
      {/* Performance Info (Development only) */}
      {__DEV__ && (
        <ThemedView variant="surface" className="p-2 m-2 rounded">
          <ThemedText className="text-xs font-mono">
            {t('perf.status.line', {
              messages: String(performanceInfo.messages),
              memory: performanceInfo.memoryUsage,
              status: performanceInfo.connectionStatus,
              healthy: String(performanceInfo.healthyConnections),
              active: String(performanceInfo.activeConnections),
              health: performanceInfo.averageHealth,
              rate: String(performanceInfo.messagesSentPerSecond),
              errors: performanceInfo.errorRate
            })}
          </ThemedText>
        </ThemedView>
      )}
      
      {/* Message List */}
      <View className="flex-1">
        {isLoading ? (
          <ThemedView className="flex-1 justify-center items-center">
            <ThemedText>{t('loading.messages')}</ThemedText>
          </ThemedView>
        ) : (
          <FlashListWrapper<Message>
            {...(flashListProps as any)}
            data={messages}
            renderItem={renderMessage}
            className="flex-1"
            contentContainerStyle={{ paddingVertical: 8 }}
            showsVerticalScrollIndicator={false}
            // Enhanced performance props
            removeClippedSubviews
            windowSize={5}
            initialNumToRender={10}
            getItemType={(item: Message) => {
              if (item.type === 'system') return 'system';
              if (item.type === 'notification') return 'notification';
              return item.size && item.size > 120 ? 'large_message' : 'message';
            }}
          />
        )}
      </View>
      
      {/* Connection Status */}
      <ThemedView variant="surface" className="p-2 border-t border-gray-200 dark:border-gray-700">
        <ThemedText className="text-center text-sm">
          <ThemedText
            className={
              connectionStatus === 'connected'
                ? 'text-success-600 dark:text-success-400'
                : connectionStatus === 'connecting'
                ? 'text-warning-600 dark:text-warning-400'
                : 'text-error-600 dark:text-error-400'
            }
          >
            {connectionStatus === 'connected' && t('status.connected')}
            {connectionStatus === 'connecting' && t('status.connecting')}
            {connectionStatus === 'disconnected' && t('status.disconnected')}
          </ThemedText>
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

/**
 * Performance testing utility component
 */
export function PerformanceTestRunner() {
  const [isRunning, setIsRunning] = React.useState(false);
  // Strongly type performance test results to fix unknown/ReactNode errors
  type PerformanceTestReport = {
    overallScore: number;
    summary: {
      passedTests: number;
      failedTests: number;
      totalTests: number;
      criticalIssues: string[];
      recommendations: string[];
    };
  };
  const [results, setResults] = React.useState<PerformanceTestReport | null>(null);
  
  const runTests = useCallback(async () => {
    setIsRunning(true);
    try {
      const report = await performanceTester.runPerformanceTests({
        ...DEFAULT_TEST_CONFIG,
        testDuration: 15,
        memoryTestDuration: 30,
        maxListItems: 5000
      });
      
      setResults(report);
    } catch (error) {
      log.error('[PerformanceTestRunner] Test failed:', error);
    } finally {
      setIsRunning(false);
    }
  }, []);
  
  return (
    <ThemedView className="p-4">
      <ThemedText className="text-lg font-bold mb-4">
        {t('perf.panel.header')}
      </ThemedText>
      
      <ThemedView variant="card" className="p-4 mb-4">
        <ThemedText className="mb-2">
          {t('perf.panel.subtitle')}
        </ThemedText>
        
        <View className="flex-row justify-between items-center">
          <ThemedText className="text-sm opacity-60">
            {isRunning ? t('perf.panel.running') : t('perf.panel.ready')}
          </ThemedText>
          
          <View className="bg-blue-500 px-4 py-2 rounded">
            <TouchableOpacity
              onPress={runTests}
              accessibilityRole="button"
              disabled={isRunning}
            >
              <ThemedText className="text-white font-medium">
                {isRunning ? t('perf.panel.running') : t('perf.panel.run')}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ThemedView>
      
      {results ? (
        <ThemedView variant="card" className="p-4">
          <ThemedText className="font-bold mb-2">
            {t('perf.results.header', { score: results!.overallScore.toFixed(0) })}
          </ThemedText>
          
          <ThemedText className="text-sm mb-2">
            {t('perf.results.passed', {
              passed: String(results!.summary.passedTests),
              total: String(results!.summary.totalTests)
            })}
          </ThemedText>
          
          {results!.summary.criticalIssues.length > 0 && (
            <ThemedView className="mt-2">
              <ThemedText className="font-medium text-error-600 dark:text-error-400 mb-1">
                {t('perf.results.critical')}
              </ThemedText>
              {results!.summary.criticalIssues.map((issue, index) => (
                <ThemedText key={index} className="text-sm text-error-500 dark:text-error-400">
                  • {issue}
                </ThemedText>
              ))}
            </ThemedView>
          )}
          
          {results!.summary.recommendations.length > 0 && (
            <ThemedView className="mt-2">
              <ThemedText className="font-medium text-warning-600 dark:text-warning-400 mb-1">
                {t('perf.results.recommendations')}
              </ThemedText>
              {results!.summary.recommendations.slice(0, 3).map((rec, index) => (
                <ThemedText key={index} className="text-sm text-warning-500 dark:text-warning-400">
                  • {rec}
                </ThemedText>
              ))}
            </ThemedView>
          )}
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

export function OptimizedMessagingExample(props: OptimizedMessagingProps) {
  return (
    <ErrorBoundary
      FallbackComponent={MessagingErrorFallback}
      onError={(error) => {
        // Keep logging consistent with project logger
        log.error('[OptimizedMessaging] Boundary captured error:', error);
      }}
    >
      <OptimizedMessagingExampleInner {...props} />
    </ErrorBoundary>
  );
}

export default OptimizedMessagingExample;
