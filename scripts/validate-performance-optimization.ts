/**
 * Performance Optimization Validation Script
 * 
 * Validates that all ACF-T08.1 performance optimizations are properly implemented:
 * - Enhanced WebSocket connection management
 * - Intelligent message batching with rate limiting
 * - Database query optimization
 * - FlashList performance utilities
 * - Memory management and resource cleanup
 */

import { log } from '../lib/utils/logger';

// Import the performance utilities to validate they exist and are properly structured
import { realtimePerformanceOptimizer } from '../lib/services/realtimePerformanceOptimizer';
import { FLASHLIST_PRESETS, optimizeDataset } from '../lib/utils/flashlist-performance';
import { databaseOptimizer } from '../lib/utils/database-optimization';
import { performanceTester, DEFAULT_TEST_CONFIG } from '../lib/utils/performance-testing';

interface ValidationResult {
  component: string;
  passed: boolean;
  details: string[];
  errors: string[];
}

class PerformanceOptimizationValidator {
  private results: ValidationResult[] = [];
  
  /**
   * Run all validation tests
   */
  async validateAll(): Promise<{
    overallPassed: boolean;
    results: ValidationResult[];
    summary: {
      totalTests: number;
      passedTests: number;
      failedTests: number;
    };
  }> {
    log.info('[Validator] Starting performance optimization validation');
    
    // Validate each component
    await this.validateRealtimePerformanceOptimizer();
    await this.validateFlashListPerformance();
    await this.validateDatabaseOptimization();
    await this.validatePerformanceTesting();
    await this.validateResourceCleanup();
    
    // Calculate summary
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = this.results.length - passedTests;
    const overallPassed = failedTests === 0;
    
    const summary = {
      totalTests: this.results.length,
      passedTests,
      failedTests
    };
    
    log.info('[Validator] Validation completed', summary);
    
    return {
      overallPassed,
      results: this.results,
      summary
    };
  }
  
  /**
   * Validate Realtime Performance Optimizer
   */
  private async validateRealtimePerformanceOptimizer(): Promise<void> {
    const result: ValidationResult = {
      component: 'Realtime Performance Optimizer',
      passed: false,
      details: [],
      errors: []
    };
    
    try {
      // Check if optimizer exists and has required methods
      const requiredMethods = [
        'optimizeConnection',
        'batchMessage',
        'getPerformanceMetrics',
        'getConnectionPoolStatus',
        'processQueuedMessages',
        'cleanup'
      ];
      
      for (const method of requiredMethods) {
        if (typeof realtimePerformanceOptimizer[method as keyof typeof realtimePerformanceOptimizer] === 'function') {
          result.details.push(`✓ ${method} method exists`);
        } else {
          result.errors.push(`✗ ${method} method missing`);
        }
      }
      
      // Test performance metrics structure
      const metrics = realtimePerformanceOptimizer.getPerformanceMetrics();
      const requiredMetrics = [
        'connectionCount',
        'messagesSentPerSecond',
        'messagesReceivedPerSecond',
        'averageLatency',
        'errorRate',
        'memoryUsage',
        'reconnectionCount',
        'lastUpdated'
      ];
      
      for (const metric of requiredMetrics) {
        if (metric in metrics) {
          result.details.push(`✓ Metric ${metric} available`);
        } else {
          result.errors.push(`✗ Metric ${metric} missing`);
        }
      }
      
      // Test connection pool status
      const poolStatus = realtimePerformanceOptimizer.getConnectionPoolStatus();
      const requiredPoolMetrics = [
        'totalConnections',
        'healthyConnections',
        'unhealthyConnections',
        'averageHealth',
        'memoryUsage'
      ];
      
      for (const metric of requiredPoolMetrics) {
        if (metric in poolStatus) {
          result.details.push(`✓ Pool metric ${metric} available`);
        } else {
          result.errors.push(`✗ Pool metric ${metric} missing`);
        }
      }
      
      result.passed = result.errors.length === 0;
      
    } catch (error) {
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    this.results.push(result);
  }
  
  /**
   * Validate FlashList Performance utilities
   */
  private async validateFlashListPerformance(): Promise<void> {
    const result: ValidationResult = {
      component: 'FlashList Performance',
      passed: false,
      details: [],
      errors: []
    };
    
    try {
      // Check presets exist
      const requiredPresets = [
        'LARGE_MESSAGE_HISTORY',
        'ACTIVITY_FEED',
        'USER_LIST',
        'NOTIFICATION_LIST'
      ];
      
      for (const preset of requiredPresets) {
        if (preset in FLASHLIST_PRESETS) {
          const presetConfig = FLASHLIST_PRESETS[preset as keyof typeof FLASHLIST_PRESETS];
          result.details.push(`✓ Preset ${preset} exists with estimatedItemSize: ${presetConfig.estimatedItemSize}`);
          
          // Validate preset structure
          const requiredProps = [
            'estimatedItemSize',
            'maxToRenderPerBatch',
            'windowSize',
            'enableMemoryOptimization',
            'maxMemoryUsage'
          ];
          
          for (const prop of requiredProps) {
            if (prop in presetConfig) {
              result.details.push(`✓ Preset ${preset} has ${prop}`);
            } else {
              result.errors.push(`✗ Preset ${preset} missing ${prop}`);
            }
          }
        } else {
          result.errors.push(`✗ Preset ${preset} missing`);
        }
      }
      
      // Test dataset optimization
      const testData = Array.from({ length: 1000 }, (_, i) => ({
        id: `item_${i}`,
        content: `Test message ${i}`,
        timestamp: Date.now() - i * 1000,
        type: 'message' as const
      }));
      
      const optimized = optimizeDataset(testData, {
        maxItems: 500,
        sortBy: 'timestamp',
        sortOrder: 'desc',
        filterDuplicates: true,
        estimateItemSizes: true
      });
      
      if (optimized.length === 500) {
        result.details.push('✓ Dataset optimization works correctly');
      } else {
        result.errors.push(`✗ Dataset optimization failed: expected 500 items, got ${optimized.length}`);
      }
      
      if (optimized[0] && optimized[1] && optimized[0].timestamp >= optimized[1].timestamp) {
        result.details.push('✓ Dataset sorting works correctly');
      } else {
        result.errors.push('✗ Dataset sorting failed');
      }
      
      if (optimized[0] && 'size' in optimized[0]) {
        result.details.push('✓ Item size estimation works');
      } else {
        result.errors.push('✗ Item size estimation failed');
      }
      
      result.passed = result.errors.length === 0;
      
    } catch (error) {
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    this.results.push(result);
  }
  
  /**
   * Validate Database Optimization
   */
  private async validateDatabaseOptimization(): Promise<void> {
    const result: ValidationResult = {
      component: 'Database Optimization',
      passed: false,
      details: [],
      errors: []
    };
    
    try {
      // Check if optimizer exists and has required methods
      const requiredMethods = [
        'executeOptimizedQuery',
        'analyzePerformance',
        'applyCriticalOptimizations',
        'getConnectionMetrics',
        'getCacheMetrics',
        'cleanup'
      ];
      
      for (const method of requiredMethods) {
        if (typeof databaseOptimizer[method as keyof typeof databaseOptimizer] === 'function') {
          result.details.push(`✓ ${method} method exists`);
        } else {
          result.errors.push(`✗ ${method} method missing`);
        }
      }
      
      // Test connection metrics structure
      const connectionMetrics = databaseOptimizer.getConnectionMetrics();
      const requiredConnectionMetrics = [
        'activeConnections',
        'idleConnections',
        'totalConnections',
        'averageQueryTime',
        'connectionErrors',
        'lastOptimization'
      ];
      
      for (const metric of requiredConnectionMetrics) {
        if (metric in connectionMetrics) {
          result.details.push(`✓ Connection metric ${metric} available`);
        } else {
          result.errors.push(`✗ Connection metric ${metric} missing`);
        }
      }
      
      // Test cache metrics structure
      const cacheMetrics = databaseOptimizer.getCacheMetrics();
      const requiredCacheMetrics = [
        'hitRate',
        'missRate',
        'totalQueries',
        'cacheSize',
        'memoryUsage',
        'lastCleanup'
      ];
      
      for (const metric of requiredCacheMetrics) {
        if (metric in cacheMetrics) {
          result.details.push(`✓ Cache metric ${metric} available`);
        } else {
          result.errors.push(`✗ Cache metric ${metric} missing`);
        }
      }
      
      // Test performance analysis
      const analysis = await databaseOptimizer.analyzePerformance();
      const requiredAnalysisProps = [
        'slowQueries',
        'indexSuggestions',
        'connectionIssues',
        'cacheOptimizations'
      ];
      
      for (const prop of requiredAnalysisProps) {
        if (prop in analysis && Array.isArray(analysis[prop as keyof typeof analysis])) {
          result.details.push(`✓ Analysis includes ${prop}`);
        } else {
          result.errors.push(`✗ Analysis missing ${prop}`);
        }
      }
      
      // Check for critical index suggestions
      if (analysis.indexSuggestions.some(s => s.priority === 'critical')) {
        result.details.push('✓ Critical index suggestions available');
      } else {
        result.errors.push('✗ No critical index suggestions found');
      }
      
      result.passed = result.errors.length === 0;
      
    } catch (error) {
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    this.results.push(result);
  }
  
  /**
   * Validate Performance Testing
   */
  private async validatePerformanceTesting(): Promise<void> {
    const result: ValidationResult = {
      component: 'Performance Testing',
      passed: false,
      details: [],
      errors: []
    };
    
    try {
      // Check if tester exists and has required methods
      const requiredMethods = [
        'runPerformanceTests',
        'isTestRunning',
        'getLastResults'
      ];
      
      for (const method of requiredMethods) {
        if (typeof performanceTester[method as keyof typeof performanceTester] === 'function') {
          result.details.push(`✓ ${method} method exists`);
        } else {
          result.errors.push(`✗ ${method} method missing`);
        }
      }
      
      // Validate default test configuration
      const requiredConfigProps = [
        'testFlashListPerformance',
        'maxListItems',
        'testWebSocketPerformance',
        'maxConnections',
        'messagesPerSecond',
        'testMemoryUsage',
        'memoryThresholdMB',
        'testAnimationPerformance',
        'testDatabasePerformance',
        'enableDetailedLogging',
        'generateReport'
      ];
      
      for (const prop of requiredConfigProps) {
        if (prop in DEFAULT_TEST_CONFIG) {
          result.details.push(`✓ Config has ${prop}: ${DEFAULT_TEST_CONFIG[prop as keyof typeof DEFAULT_TEST_CONFIG]}`);
        } else {
          result.errors.push(`✗ Config missing ${prop}`);
        }
      }
      
      // Validate configuration values
      if (DEFAULT_TEST_CONFIG.maxListItems >= 10000) {
        result.details.push('✓ Max list items meets 10k+ requirement');
      } else {
        result.errors.push(`✗ Max list items too low: ${DEFAULT_TEST_CONFIG.maxListItems}`);
      }
      
      if (DEFAULT_TEST_CONFIG.messagesPerSecond >= 100) {
        result.details.push('✓ Messages per second meets 100/sec requirement');
      } else {
        result.errors.push(`✗ Messages per second too low: ${DEFAULT_TEST_CONFIG.messagesPerSecond}`);
      }
      
      result.passed = result.errors.length === 0;
      
    } catch (error) {
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    this.results.push(result);
  }
  
  /**
   * Validate Resource Cleanup
   */
  private async validateResourceCleanup(): Promise<void> {
    const result: ValidationResult = {
      component: 'Resource Cleanup',
      passed: false,
      details: [],
      errors: []
    };
    
    try {
      // Check if the hook file exists and exports the expected function
      try {
        const { useRealtimeResourceCleanup } = await import('../lib/hooks/useRealtimeResourceCleanup');
        
        if (typeof useRealtimeResourceCleanup === 'function') {
          result.details.push('✓ useRealtimeResourceCleanup hook exists');
        } else {
          result.errors.push('✗ useRealtimeResourceCleanup is not a function');
        }
      } catch (importError) {
        result.errors.push(`✗ Failed to import useRealtimeResourceCleanup: ${importError instanceof Error ? importError.message : 'Unknown error'}`);
      }
      
      // Check if base cleanup hook exists
      try {
        const { useResourceCleanup } = await import('../lib/hooks/useResourceCleanup');
        
        if (typeof useResourceCleanup === 'function') {
          result.details.push('✓ Base useResourceCleanup hook exists');
        } else {
          result.errors.push('✗ Base useResourceCleanup is not a function');
        }
      } catch (importError) {
        result.errors.push(`✗ Failed to import useResourceCleanup: ${importError instanceof Error ? importError.message : 'Unknown error'}`);
      }
      
      // Check if animation cleanup exists
      try {
        const { useAnimationCleanup } = await import('../lib/animations/useAnimationCleanup');
        
        if (typeof useAnimationCleanup === 'function') {
          result.details.push('✓ useAnimationCleanup hook exists');
        } else {
          result.errors.push('✗ useAnimationCleanup is not a function');
        }
      } catch (importError) {
        result.errors.push(`✗ Failed to import useAnimationCleanup: ${importError instanceof Error ? importError.message : 'Unknown error'}`);
      }
      
      result.passed = result.errors.length === 0;
      
    } catch (error) {
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    this.results.push(result);
  }
  
  /**
   * Print validation results
   */
  printResults(): void {
    console.log('\n=== Performance Optimization Validation Results ===\n');
    
    for (const result of this.results) {
      console.log(`${result.passed ? '✅' : '❌'} ${result.component}`);
      
      if (result.details.length > 0) {
        console.log('  Details:');
        for (const detail of result.details) {
          console.log(`    ${detail}`);
        }
      }
      
      if (result.errors.length > 0) {
        console.log('  Errors:');
        for (const error of result.errors) {
          console.log(`    ${error}`);
        }
      }
      
      console.log('');
    }
    
    const passedTests = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;
    
    console.log(`Summary: ${passedTests}/${totalTests} components passed validation`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All performance optimizations are properly implemented!');
    } else {
      console.log('⚠️  Some performance optimizations need attention.');
    }
  }
}

/**
 * Main validation function
 */
async function validatePerformanceOptimizations(): Promise<void> {
  const validator = new PerformanceOptimizationValidator();
  
  try {
    const results = await validator.validateAll();
    validator.printResults();
    
    // Exit with appropriate code
    process.exit(results.overallPassed ? 0 : 1);
    
  } catch (error) {
    console.error('Validation failed:', error);
    process.exit(1);
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  validatePerformanceOptimizations();
}

export { PerformanceOptimizationValidator, validatePerformanceOptimizations };