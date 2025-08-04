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
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSharedValue } from 'react-native-reanimated';

// Performance utilities
import { useFlashListPerformance, FLASHLIST_PRESETS } from '../utils/flashlist-performance';
import { useRealtimeResourceCleanup } from '../hooks/useRealtimeResourceCleanup';
import { realtimePerformanceOptimizer } from '../services/realtimePerformanceOptimizer';
import { executeOptimizedQuery } from '../utils/database-optimization';
import { performanceTester, DEFAULT_TEST_CONFIG } from '../utils/performance-testing';

// Existing components
import { FlashListWrapper } from '../../components/ui/FlashListWrapper';
import ThemedView from '../../components/ui/ThemedView';
import ThemedText from '../../components/ui/ThemedText';

// Services
import { realtimeService } from '../services/realtimeService';
import supabase from '../supabase';
import { log } from '../utils/logger';

interface Message {
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
 * Example component demonstrating all performance optimizations
 */
export function OptimizedMessagingExample({
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
    clearCache
  } = useFlashListPerformance(messages, FLASHLIST_PRESETS.LARGE_MESSAGE_HISTORY);
  
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
        onNewMessage: (message) => {
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
        
        onMessageUpdate: (message) => {
          setMessages(prev => prev.map(m => 
            m.id === (message as Message).id ? message as Message : m
          ));
        },
        
        onMessageDelete: (message) => {
          setMessages(prev => prev.filter(m => m.id !== (message as Message).id));
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
      const transformedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        threadId: msg.thread_id,
        senderId: msg.sender_id,
        content: msg.content,
        timestamp: new Date(msg.sent_at).getTime(),
        type: msg.message_type || 'message',
        size: msg.content?.length ? Math.max(60, msg.content.length * 0.5) : 80
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
      const tempMessage: Message = {
        id: `temp_${Date.now()}`,
        threadId: conversationId,
        senderId: userId,
        content,
        timestamp: Date.now(),
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
            timestamp: Date.now()
          }
        },
        'high' // High priority for user messages
      );
      
      // Scroll to bottom
      scrollToBottom(true);
      
    } catch (error) {
      log.error('[OptimizedMessaging] Failed to send message:', error);
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== `temp_${Date.now()}`));
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
  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
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
    realtimeCleanup.registerAnimationCleanup([scrollY, isScrolling], 'messaging_animations');
  }, [realtimeCleanup, scrollY, isScrolling]);
  
  return (
    <ThemedView className="flex-1">
      {/* Performance Info (Development only) */}
      {__DEV__ && (
        <ThemedView variant="surface" className="p-2 m-2 rounded">
          <ThemedText className="text-xs font-mono">
            Messages: {performanceInfo.messages} | 
            Memory: {performanceInfo.memoryUsage} | 
            Status: {performanceInfo.connectionStatus} | 
            Connections: {performanceInfo.healthyConnections}/{performanceInfo.activeConnections} | 
            Health: {performanceInfo.averageHealth} | 
            Rate: {performanceInfo.messagesSentPerSecond}/s | 
            Errors: {performanceInfo.errorRate}
          </ThemedText>
        </ThemedView>
      )}
      
      {/* Message List */}
      <View className="flex-1">
        {isLoading ? (
          <ThemedView className="flex-1 justify-center items-center">
            <ThemedText>Loading messages...</ThemedText>
          </ThemedView>
        ) : (
          <FlashListWrapper
            {...flashListProps}
            data={messages}
            renderItem={renderMessage}
            className="flex-1"
            contentContainerStyle={{ paddingVertical: 8 }}
            showsVerticalScrollIndicator={false}
            // Enhanced performance props
            removeClippedSubviews={true}
            maxToRenderPerBatch={5}
            windowSize={5}
            initialNumToRender={10}
            getItemType={(item) => {
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
          {connectionStatus === 'connected' && '🟢 Connected'}
          {connectionStatus === 'connecting' && '🟡 Connecting...'}
          {connectionStatus === 'disconnected' && '🔴 Disconnected'}
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
  const [results, setResults] = React.useState<any>(null);
  
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
        Performance Test Runner
      </ThemedText>
      
      <ThemedView variant="card" className="p-4 mb-4">
        <ThemedText className="mb-2">
          Run comprehensive performance tests for realtime features
        </ThemedText>
        
        <View className="flex-row justify-between items-center">
          <ThemedText className="text-sm opacity-60">
            {isRunning ? 'Running tests...' : 'Ready to test'}
          </ThemedText>
          
          <View className="bg-blue-500 px-4 py-2 rounded">
            <ThemedText 
              className="text-white font-medium"
              onPress={runTests}
            >
              {isRunning ? 'Testing...' : 'Run Tests'}
            </ThemedText>
          </View>
        </View>
      </ThemedView>
      
      {results && (
        <ThemedView variant="card" className="p-4">
          <ThemedText className="font-bold mb-2">
            Test Results (Score: {results.overallScore.toFixed(0)}/100)
          </ThemedText>
          
          <ThemedText className="text-sm mb-2">
            Passed: {results.summary.passedTests}/{results.summary.totalTests}
          </ThemedText>
          
          {results.summary.criticalIssues.length > 0 && (
            <ThemedView className="mt-2">
              <ThemedText className="font-medium text-red-500 mb-1">
                Critical Issues:
              </ThemedText>
              {results.summary.criticalIssues.map((issue: string, index: number) => (
                <ThemedText key={index} className="text-sm text-red-400">
                  • {issue}
                </ThemedText>
              ))}
            </ThemedView>
          )}
          
          {results.summary.recommendations.length > 0 && (
            <ThemedView className="mt-2">
              <ThemedText className="font-medium text-yellow-500 mb-1">
                Recommendations:
              </ThemedText>
              {results.summary.recommendations.slice(0, 3).map((rec: string, index: number) => (
                <ThemedText key={index} className="text-sm text-yellow-400">
                  • {rec}
                </ThemedText>
              ))}
            </ThemedView>
          )}
        </ThemedView>
      )}
    </ThemedView>
  );
}

export default OptimizedMessagingExample;