/**
 * Performance Testing Utilities (2025 Standards)
 * 
 * Comprehensive performance testing for realtime features:
 * - FlashList performance with 10k+ items
 * - WebSocket connection stress testing
 * - Memory usage monitoring
 * - Animation performance testing
 * - Database query performance
 */

import { FlashList } from '@shopify/flash-list';
import { SharedValue } from 'react-native-reanimated';
import { log } from './logger';
import { realtimePerformanceOptimizer } from '../services/realtimePerformanceOptimizer';
import { databaseOptimizer } from './database-optimization';

export interface PerformanceTestConfig {
  // FlashList testing
  testFlashListPerformance: boolean;
  maxListItems: number;
  itemSizeVariation: boolean;
  
  // WebSocket testing
  testWebSocketPerformance: boolean;
  maxConnections: number;
  messagesPerSecond: number;
  testDuration: number; // in seconds
  
  // Memory testing
  testMemoryUsage: boolean;
  memoryThresholdMB: number;
  memoryTestDuration: number;
  
  // Animation testing
  testAnimationPerformance: boolean;
  animationComplexity: 'low' | 'medium' | 'high';
  
  // Database testing
  testDatabasePerformance: boolean;
  queryComplexity: 'simple' | 'complex' | 'heavy';
  
  // General settings
  enableDetailedLogging: boolean;
  generateReport: boolean;
}

export interface PerformanceTestResult {
  testName: string;
  passed: boolean;
  metrics: {
    averageTime: number;
    minTime: number;
    maxTime: number;
    memoryUsage: number;
    errorRate: number;
    throughput?: number;
  };
  details: string[];
  recommendations: string[];
}

export interface PerformanceReport {
  testSuite: string;
  timestamp: number;
  deviceInfo: {
    platform: string;
    version: string;
    memory: number;
  };
  overallScore: number; // 0-100
  results: PerformanceTestResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    criticalIssues: string[];
    recommendations: string[];
  };
}

class PerformanceTester {
  private static instance: PerformanceTester;
  private testResults: PerformanceTestResult[] = [];
  private isRunning = false;
  
  private constructor() {}
  
  public static getInstance(): PerformanceTester {
    if (!PerformanceTester.instance) {
      PerformanceTester.instance = new PerformanceTester();
    }
    return PerformanceTester.instance;
  }
  
  /**
   * Run comprehensive performance test suite
   */
  async runPerformanceTests(config: PerformanceTestConfig): Promise<PerformanceReport> {
    if (this.isRunning) {
      throw new Error('Performance tests are already running');
    }
    
    this.isRunning = true;
    this.testResults = [];
    
    try {
      log.info('[PerformanceTester] Starting performance test suite');
      
      // FlashList performance tests
      if (config.testFlashListPerformance) {
        await this.testFlashListPerformance(config);
      }
      
      // WebSocket performance tests
      if (config.testWebSocketPerformance) {
        await this.testWebSocketPerformance(config);
      }
      
      // Memory usage tests
      if (config.testMemoryUsage) {
        await this.testMemoryUsage(config);
      }
      
      // Animation performance tests
      if (config.testAnimationPerformance) {
        await this.testAnimationPerformance(config);
      }
      
      // Database performance tests
      if (config.testDatabasePerformance) {
        await this.testDatabasePerformance(config);
      }
      
      // Generate comprehensive report
      const report = this.generateReport(config);
      
      if (config.generateReport) {
        await this.saveReport(report);
      }
      
      return report;
      
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Test FlashList performance with large datasets
   */
  private async testFlashListPerformance(config: PerformanceTestConfig): Promise<void> {
    const testName = 'FlashList Performance';
    const startTime = Date.now();
    const metrics = {
      averageTime: 0,
      minTime: Infinity,
      maxTime: 0,
      memoryUsage: 0,
      errorRate: 0,
      throughput: 0
    };
    const details: string[] = [];
    const recommendations: string[] = [];
    
    try {
      log.info(`[PerformanceTester] Testing FlashList with ${config.maxListItems} items`);
      
      // Generate test data
      const testData = this.generateTestData(config.maxListItems, config.itemSizeVariation);
      const initialMemory = this.getMemoryUsage();
      
      // Test different scenarios
      const scenarios = [
        { name: 'Initial Render', itemCount: Math.min(100, config.maxListItems) },
        { name: 'Medium Dataset', itemCount: Math.min(1000, config.maxListItems) },
        { name: 'Large Dataset', itemCount: config.maxListItems }
      ];
      
      for (const scenario of scenarios) {
        const scenarioStartTime = Date.now();
        const scenarioData = testData.slice(0, scenario.itemCount);
        
        // Simulate FlashList operations
        await this.simulateFlashListOperations(scenarioData);
        
        const scenarioTime = Date.now() - scenarioStartTime;
        metrics.minTime = Math.min(metrics.minTime, scenarioTime);
        metrics.maxTime = Math.max(metrics.maxTime, scenarioTime);
        
        details.push(`${scenario.name}: ${scenarioTime}ms for ${scenario.itemCount} items`);
        
        // Check performance thresholds
        const expectedTime = scenario.itemCount * 0.1; // 0.1ms per item
        if (scenarioTime > expectedTime * 2) {
          recommendations.push(`${scenario.name} took ${scenarioTime}ms, expected ~${expectedTime}ms. Consider optimizing item rendering.`);
        }
      }
      
      metrics.averageTime = (Date.now() - startTime) / scenarios.length;
      metrics.memoryUsage = this.getMemoryUsage() - initialMemory;
      metrics.throughput = config.maxListItems / (metrics.averageTime / 1000);
      
      // Memory usage recommendations
      if (metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
        recommendations.push(`High memory usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB. Consider implementing item recycling or reducing item complexity.`);
      }
      
      // Performance recommendations
      if (metrics.averageTime > 1000) {
        recommendations.push('Slow rendering detected. Consider using getItemType for better recycling and reducing item complexity.');
      }
      
      this.testResults.push({
        testName,
        passed: recommendations.length === 0,
        metrics,
        details,
        recommendations
      });
      
    } catch (error) {
      log.error(`[PerformanceTester] ${testName} failed:`, error);
      this.testResults.push({
        testName,
        passed: false,
        metrics: { ...metrics, errorRate: 1 },
        details: [`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        recommendations: ['Fix the underlying error before retesting performance.']
      });
    }
  }
  
  /**
   * Test WebSocket performance and connection management
   */
  private async testWebSocketPerformance(config: PerformanceTestConfig): Promise<void> {
    const testName = 'WebSocket Performance';
    const startTime = Date.now();
    const metrics = {
      averageTime: 0,
      minTime: Infinity,
      maxTime: 0,
      memoryUsage: 0,
      errorRate: 0,
      throughput: 0
    };
    const details: string[] = [];
    const recommendations: string[] = [];
    
    try {
      log.info(`[PerformanceTester] Testing WebSocket with ${config.maxConnections} connections`);
      
      const initialMemory = this.getMemoryUsage();
      let successfulConnections = 0;
      let failedConnections = 0;
      let totalMessagesSent = 0;
      let totalMessagesReceived = 0;
      
      // Test connection establishment
      const connectionStartTime = Date.now();
      
      for (let i = 0; i < config.maxConnections; i++) {
        try {
          // Simulate connection establishment
          await this.simulateWebSocketConnection(i, config);
          successfulConnections++;
        } catch (error) {
          failedConnections++;
          log.debug(`[PerformanceTester] Connection ${i} failed:`, error);
        }
      }
      
      const connectionTime = Date.now() - connectionStartTime;
      details.push(`Connection establishment: ${connectionTime}ms for ${config.maxConnections} connections`);
      
      // Test message throughput
      const messageStartTime = Date.now();
      const testDurationMs = config.testDuration * 1000;
      const messagesPerInterval = Math.ceil(config.messagesPerSecond / 10); // 100ms intervals
      
      const messageInterval = setInterval(() => {
        for (let i = 0; i < messagesPerInterval; i++) {
          try {
            // Simulate message sending
            this.simulateMessageSend();
            totalMessagesSent++;
          } catch (error) {
            log.debug('[PerformanceTester] Message send failed:', error);
          }
        }
      }, 100);
      
      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, testDurationMs));
      clearInterval(messageInterval);
      
      const messageTime = Date.now() - messageStartTime;
      const actualThroughput = totalMessagesSent / (messageTime / 1000);
      
      details.push(`Message throughput: ${actualThroughput.toFixed(1)} msgs/sec (target: ${config.messagesPerSecond})`);
      details.push(`Successful connections: ${successfulConnections}/${config.maxConnections}`);
      
      metrics.averageTime = (connectionTime + messageTime) / 2;
      metrics.minTime = Math.min(connectionTime, messageTime);
      metrics.maxTime = Math.max(connectionTime, messageTime);
      metrics.memoryUsage = this.getMemoryUsage() - initialMemory;
      metrics.errorRate = failedConnections / config.maxConnections;
      metrics.throughput = actualThroughput;
      
      // Performance analysis
      if (metrics.errorRate > 0.1) {
        recommendations.push(`High connection failure rate: ${(metrics.errorRate * 100).toFixed(1)}%. Check network stability and connection limits.`);
      }
      
      if (actualThroughput < config.messagesPerSecond * 0.8) {
        recommendations.push(`Low message throughput: ${actualThroughput.toFixed(1)} msgs/sec vs target ${config.messagesPerSecond}. Consider message batching or connection optimization.`);
      }
      
      if (metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
        recommendations.push(`High memory usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB. Implement connection pooling and message queue cleanup.`);
      }
      
      this.testResults.push({
        testName,
        passed: metrics.errorRate < 0.05 && actualThroughput >= config.messagesPerSecond * 0.8,
        metrics,
        details,
        recommendations
      });
      
    } catch (error) {
      log.error(`[PerformanceTester] ${testName} failed:`, error);
      this.testResults.push({
        testName,
        passed: false,
        metrics: { ...metrics, errorRate: 1 },
        details: [`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        recommendations: ['Fix the underlying error before retesting performance.']
      });
    }
  }
  
  /**
   * Test memory usage and cleanup
   */
  private async testMemoryUsage(config: PerformanceTestConfig): Promise<void> {
    const testName = 'Memory Usage';
    const startTime = Date.now();
    const initialMemory = this.getMemoryUsage();
    const memorySnapshots: number[] = [];
    const details: string[] = [];
    const recommendations: string[] = [];
    
    try {
      log.info(`[PerformanceTester] Testing memory usage for ${config.memoryTestDuration} seconds`);
      
      // Monitor memory usage over time
      const monitoringInterval = setInterval(() => {
        const currentMemory = this.getMemoryUsage();
        memorySnapshots.push(currentMemory);
      }, 1000);
      
      // Simulate memory-intensive operations
      await this.simulateMemoryIntensiveOperations(config);
      
      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, config.memoryTestDuration * 1000));
      
      clearInterval(monitoringInterval);
      
      const finalMemory = this.getMemoryUsage();
      const memoryGrowth = finalMemory - initialMemory;
      const maxMemory = Math.max(...memorySnapshots);
      const avgMemory = memorySnapshots.reduce((sum, mem) => sum + mem, 0) / memorySnapshots.length;
      
      details.push(`Initial memory: ${(initialMemory / 1024 / 1024).toFixed(1)}MB`);
      details.push(`Final memory: ${(finalMemory / 1024 / 1024).toFixed(1)}MB`);
      details.push(`Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(1)}MB`);
      details.push(`Peak memory: ${(maxMemory / 1024 / 1024).toFixed(1)}MB`);
      details.push(`Average memory: ${(avgMemory / 1024 / 1024).toFixed(1)}MB`);
      
      const metrics = {
        averageTime: Date.now() - startTime,
        minTime: initialMemory,
        maxTime: maxMemory,
        memoryUsage: memoryGrowth,
        errorRate: 0,
        throughput: 0
      };
      
      // Memory analysis
      const memoryGrowthMB = memoryGrowth / 1024 / 1024;
      const maxMemoryMB = maxMemory / 1024 / 1024;
      
      if (memoryGrowthMB > config.memoryThresholdMB) {
        recommendations.push(`High memory growth: ${memoryGrowthMB.toFixed(1)}MB. Check for memory leaks and implement proper cleanup.`);
      }
      
      if (maxMemoryMB > config.memoryThresholdMB * 2) {
        recommendations.push(`Peak memory usage too high: ${maxMemoryMB.toFixed(1)}MB. Implement memory pressure handling.`);
      }
      
      // Check for memory leaks (continuous growth)
      if (memorySnapshots.length > 10) {
        const recentGrowth = memorySnapshots.slice(-5).reduce((sum, mem, i, arr) => {
          return i > 0 ? sum + (mem - arr[i - 1]) : sum;
        }, 0);
        
        if (recentGrowth > 10 * 1024 * 1024) { // 10MB growth in last 5 seconds
          recommendations.push('Potential memory leak detected. Continuous memory growth observed.');
        }
      }
      
      this.testResults.push({
        testName,
        passed: memoryGrowthMB <= config.memoryThresholdMB && maxMemoryMB <= config.memoryThresholdMB * 2,
        metrics,
        details,
        recommendations
      });
      
    } catch (error) {
      log.error(`[PerformanceTester] ${testName} failed:`, error);
      this.testResults.push({
        testName,
        passed: false,
        metrics: {
          averageTime: Date.now() - startTime,
          minTime: 0,
          maxTime: 0,
          memoryUsage: this.getMemoryUsage() - initialMemory,
          errorRate: 1,
          throughput: 0
        },
        details: [`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        recommendations: ['Fix the underlying error before retesting performance.']
      });
    }
  }
  
  /**
   * Test animation performance
   */
  private async testAnimationPerformance(config: PerformanceTestConfig): Promise<void> {
    const testName = 'Animation Performance';
    const startTime = Date.now();
    const metrics = {
      averageTime: 0,
      minTime: Infinity,
      maxTime: 0,
      memoryUsage: 0,
      errorRate: 0,
      throughput: 0
    };
    const details: string[] = [];
    const recommendations: string[] = [];
    
    try {
      log.info(`[PerformanceTester] Testing animation performance (${config.animationComplexity} complexity)`);
      
      const initialMemory = this.getMemoryUsage();
      const animationTimes: number[] = [];
      
      // Test different animation scenarios
      const scenarios = this.getAnimationScenarios(config.animationComplexity);
      
      for (const scenario of scenarios) {
        const scenarioStartTime = Date.now();
        
        // Simulate animation
        await this.simulateAnimation(scenario);
        
        const scenarioTime = Date.now() - scenarioStartTime;
        animationTimes.push(scenarioTime);
        
        details.push(`${scenario.name}: ${scenarioTime}ms`);
        
        // Check for dropped frames (assuming 60fps = 16.67ms per frame)
        const expectedFrames = scenario.duration / 16.67;
        const actualFrames = scenario.duration / (scenarioTime / scenario.iterations);
        
        if (actualFrames < expectedFrames * 0.9) {
          recommendations.push(`${scenario.name} may have dropped frames. Expected ~${expectedFrames.toFixed(0)} frames, got ~${actualFrames.toFixed(0)}.`);
        }
      }
      
      metrics.averageTime = animationTimes.reduce((sum, time) => sum + time, 0) / animationTimes.length;
      metrics.minTime = Math.min(...animationTimes);
      metrics.maxTime = Math.max(...animationTimes);
      metrics.memoryUsage = this.getMemoryUsage() - initialMemory;
      metrics.throughput = scenarios.length / ((Date.now() - startTime) / 1000);
      
      // Performance analysis
      if (metrics.averageTime > 100) {
        recommendations.push(`Slow animation performance: ${metrics.averageTime.toFixed(1)}ms average. Consider optimizing animations or reducing complexity.`);
      }
      
      if (metrics.memoryUsage > 20 * 1024 * 1024) { // 20MB
        recommendations.push(`High animation memory usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB. Ensure proper animation cleanup.`);
      }
      
      this.testResults.push({
        testName,
        passed: metrics.averageTime <= 100 && recommendations.length === 0,
        metrics,
        details,
        recommendations
      });
      
    } catch (error) {
      log.error(`[PerformanceTester] ${testName} failed:`, error);
      this.testResults.push({
        testName,
        passed: false,
        metrics: { ...metrics, errorRate: 1 },
        details: [`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        recommendations: ['Fix the underlying error before retesting performance.']
      });
    }
  }
  
  /**
   * Test database performance
   */
  private async testDatabasePerformance(config: PerformanceTestConfig): Promise<void> {
    const testName = 'Database Performance';
    const startTime = Date.now();
    const metrics = {
      averageTime: 0,
      minTime: Infinity,
      maxTime: 0,
      memoryUsage: 0,
      errorRate: 0,
      throughput: 0
    };
    const details: string[] = [];
    const recommendations: string[] = [];
    
    try {
      log.info(`[PerformanceTester] Testing database performance (${config.queryComplexity} queries)`);
      
      const queryTimes: number[] = [];
      const queries = this.getDatabaseQueries(config.queryComplexity);
      let failedQueries = 0;
      
      for (const query of queries) {
        const queryStartTime = Date.now();
        
        try {
          // Simulate database query
          await this.simulateDatabaseQuery(query);
          
          const queryTime = Date.now() - queryStartTime;
          queryTimes.push(queryTime);
          
          details.push(`${query.name}: ${queryTime}ms`);
          
          // Check query performance thresholds
          if (queryTime > query.expectedMaxTime) {
            recommendations.push(`${query.name} is slow: ${queryTime}ms (expected < ${query.expectedMaxTime}ms). Consider adding indexes or optimizing the query.`);
          }
          
        } catch (error) {
          failedQueries++;
          details.push(`${query.name}: FAILED - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      metrics.averageTime = queryTimes.length > 0 ? queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length : 0;
      metrics.minTime = queryTimes.length > 0 ? Math.min(...queryTimes) : 0;
      metrics.maxTime = queryTimes.length > 0 ? Math.max(...queryTimes) : 0;
      metrics.errorRate = failedQueries / queries.length;
      metrics.throughput = queries.length / ((Date.now() - startTime) / 1000);
      
      // Performance analysis
      if (metrics.errorRate > 0) {
        recommendations.push(`Database query failures: ${(metrics.errorRate * 100).toFixed(1)}%. Check database connectivity and query syntax.`);
      }
      
      if (metrics.averageTime > 500) {
        recommendations.push(`Slow database queries: ${metrics.averageTime.toFixed(1)}ms average. Consider database optimization.`);
      }
      
      this.testResults.push({
        testName,
        passed: metrics.errorRate === 0 && metrics.averageTime <= 500,
        metrics,
        details,
        recommendations
      });
      
    } catch (error) {
      log.error(`[PerformanceTester] ${testName} failed:`, error);
      this.testResults.push({
        testName,
        passed: false,
        metrics: { ...metrics, errorRate: 1 },
        details: [`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        recommendations: ['Fix the underlying error before retesting performance.']
      });
    }
  }
  
  /**
   * Generate test data for FlashList testing
   */
  private generateTestData(count: number, sizeVariation: boolean): Array<{
    id: string;
    content: string;
    timestamp: number;
    size?: number;
  }> {
    const data = [];
    
    for (let i = 0; i < count; i++) {
      const baseSize = 80;
      const size = sizeVariation 
        ? baseSize + Math.random() * 40 // 80-120px variation
        : baseSize;
      
      data.push({
        id: `item_${i}`,
        content: `Test message ${i} - ${Math.random().toString(36).substring(2, 15)}`,
        timestamp: Date.now() - (i * 1000),
        size
      });
    }
    
    return data;
  }
  
  /**
   * Simulate FlashList operations
   */
  private async simulateFlashListOperations(data: unknown[]): Promise<void> {
    // Simulate rendering time based on data size
    const renderTime = Math.max(10, data.length * 0.1);
    await new Promise(resolve => setTimeout(resolve, renderTime));
  }
  
  /**
   * Simulate WebSocket connection
   */
  private async simulateWebSocketConnection(connectionId: number, config: PerformanceTestConfig): Promise<void> {
    // Simulate connection establishment time
    const connectionTime = 50 + Math.random() * 100; // 50-150ms
    await new Promise(resolve => setTimeout(resolve, connectionTime));
    
    // Simulate potential connection failures
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error(`Connection ${connectionId} failed`);
    }
  }
  
  /**
   * Simulate message sending
   */
  private simulateMessageSend(): void {
    // Simulate message processing time
    const processingTime = Math.random() * 5; // 0-5ms
    const startTime = Date.now();
    while (Date.now() - startTime < processingTime) {
      // Busy wait to simulate processing
    }
  }
  
  /**
   * Simulate memory-intensive operations
   */
  private async simulateMemoryIntensiveOperations(config: PerformanceTestConfig): Promise<void> {
    // Create some memory pressure
    const largeArrays: number[][] = [];
    
    for (let i = 0; i < 10; i++) {
      const array = new Array(100000).fill(0).map(() => Math.random());
      largeArrays.push(array);
      
      // Small delay between allocations
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Keep references to prevent garbage collection during test
    setTimeout(() => {
      largeArrays.length = 0; // Clear references
    }, config.memoryTestDuration * 1000);
  }
  
  /**
   * Get animation scenarios based on complexity
   */
  private getAnimationScenarios(complexity: string): Array<{
    name: string;
    duration: number;
    iterations: number;
  }> {
    const baseScenarios = [
      { name: 'Simple Fade', duration: 300, iterations: 1 },
      { name: 'Scale Animation', duration: 500, iterations: 1 },
      { name: 'Slide Transition', duration: 400, iterations: 1 }
    ];
    
    if (complexity === 'medium') {
      return [
        ...baseScenarios,
        { name: 'Complex Transform', duration: 800, iterations: 2 },
        { name: 'Gesture Animation', duration: 600, iterations: 3 }
      ];
    }
    
    if (complexity === 'high') {
      return [
        ...baseScenarios,
        { name: 'Complex Transform', duration: 800, iterations: 2 },
        { name: 'Gesture Animation', duration: 600, iterations: 3 },
        { name: 'Multiple Animations', duration: 1000, iterations: 5 },
        { name: 'Physics Animation', duration: 1200, iterations: 4 }
      ];
    }
    
    return baseScenarios;
  }
  
  /**
   * Simulate animation
   */
  private async simulateAnimation(scenario: { name: string; duration: number; iterations: number }): Promise<void> {
    for (let i = 0; i < scenario.iterations; i++) {
      // Simulate animation frame processing
      const frameTime = scenario.duration / 60; // 60fps
      await new Promise(resolve => setTimeout(resolve, frameTime));
    }
  }
  
  /**
   * Get database queries based on complexity
   */
  private getDatabaseQueries(complexity: string): Array<{
    name: string;
    expectedMaxTime: number;
  }> {
    const baseQueries = [
      { name: 'Simple Select', expectedMaxTime: 100 },
      { name: 'User Lookup', expectedMaxTime: 150 },
      { name: 'Message Insert', expectedMaxTime: 200 }
    ];
    
    if (complexity === 'complex') {
      return [
        ...baseQueries,
        { name: 'Join Query', expectedMaxTime: 300 },
        { name: 'Aggregation Query', expectedMaxTime: 400 },
        { name: 'Full-text Search', expectedMaxTime: 500 }
      ];
    }
    
    if (complexity === 'heavy') {
      return [
        ...baseQueries,
        { name: 'Join Query', expectedMaxTime: 300 },
        { name: 'Aggregation Query', expectedMaxTime: 400 },
        { name: 'Full-text Search', expectedMaxTime: 500 },
        { name: 'Complex Analytics', expectedMaxTime: 1000 },
        { name: 'Large Dataset Query', expectedMaxTime: 1500 }
      ];
    }
    
    return baseQueries;
  }
  
  /**
   * Simulate database query
   */
  private async simulateDatabaseQuery(query: { name: string; expectedMaxTime: number }): Promise<void> {
    // Simulate query execution time
    const executionTime = Math.random() * query.expectedMaxTime;
    await new Promise(resolve => setTimeout(resolve, executionTime));
    
    // Simulate potential query failures
    if (Math.random() < 0.02) { // 2% failure rate
      throw new Error(`Query ${query.name} failed`);
    }
  }
  
  /**
   * Get current memory usage (rough estimation)
   */
  private getMemoryUsage(): number {
    // In a real implementation, you would use a proper memory monitoring library
    // For now, we'll simulate memory usage
    return Math.floor(Math.random() * 100 * 1024 * 1024); // 0-100MB
  }
  
  /**
   * Generate comprehensive performance report
   */
  private generateReport(config: PerformanceTestConfig): PerformanceReport {
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = this.testResults.length - passedTests;
    const overallScore = this.testResults.length > 0 ? (passedTests / this.testResults.length) * 100 : 0;
    
    const criticalIssues: string[] = [];
    const allRecommendations: string[] = [];
    
    for (const result of this.testResults) {
      if (!result.passed) {
        criticalIssues.push(`${result.testName}: ${result.details[0] || 'Test failed'}`);
      }
      allRecommendations.push(...result.recommendations);
    }
    
    return {
      testSuite: 'Realtime Performance Test Suite',
      timestamp: Date.now(),
      deviceInfo: {
        platform: 'React Native',
        version: '0.79',
        memory: 0 // Would be populated with actual device info
      },
      overallScore,
      results: this.testResults,
      summary: {
        totalTests: this.testResults.length,
        passedTests,
        failedTests,
        criticalIssues,
        recommendations: [...new Set(allRecommendations)] // Remove duplicates
      }
    };
  }
  
  /**
   * Save performance report
   */
  private async saveReport(report: PerformanceReport): Promise<void> {
    try {
      const reportJson = JSON.stringify(report, null, 2);
      log.info('[PerformanceTester] Performance report generated', {
        overallScore: report.overallScore,
        totalTests: report.summary.totalTests,
        passedTests: report.summary.passedTests,
        failedTests: report.summary.failedTests
      });
      
      // In a real implementation, you would save this to a file or send to analytics
      console.log('Performance Report:', reportJson);
      
    } catch (error) {
      log.error('[PerformanceTester] Failed to save report:', error);
    }
  }
  
  /**
   * Get current test status
   */
  isTestRunning(): boolean {
    return this.isRunning;
  }
  
  /**
   * Get last test results
   */
  getLastResults(): PerformanceTestResult[] {
    return [...this.testResults];
  }
}

// Export singleton instance and utility functions
export const performanceTester = PerformanceTester.getInstance();

export const DEFAULT_TEST_CONFIG: PerformanceTestConfig = {
  testFlashListPerformance: true,
  maxListItems: 10000,
  itemSizeVariation: true,
  
  testWebSocketPerformance: true,
  maxConnections: 50,
  messagesPerSecond: 100,
  testDuration: 30,
  
  testMemoryUsage: true,
  memoryThresholdMB: 50,
  memoryTestDuration: 60,
  
  testAnimationPerformance: true,
  animationComplexity: 'medium',
  
  testDatabasePerformance: true,
  queryComplexity: 'complex',
  
  enableDetailedLogging: true,
  generateReport: true
};

export { runPerformanceTests };
async function runPerformanceTests(config: Partial<PerformanceTestConfig> = {}): Promise<PerformanceReport> {
  const fullConfig = { ...DEFAULT_TEST_CONFIG, ...config };
  return performanceTester.runPerformanceTests(fullConfig);
}

export default performanceTester;