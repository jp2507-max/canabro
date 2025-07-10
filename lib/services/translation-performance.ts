/**
 * Translation Performance Service
 * 
 * Implements advanced caching, performance monitoring, and optimization features
 * for the translation system. Includes configurable TTL values, cache statistics,
 * and performance telemetry to ensure translation doesn't impact user experience.
 */

import { InteractionManager } from 'react-native';
import { logger } from '../config/production';

// Enhanced cache interface with metadata
interface CacheEntry {
  value: string;
  timestamp: number;
  ttl: number;
  hitCount: number;
  lastAccessed: number;
  priority: CachePriority;
}

// Cache priority levels for intelligent eviction
export enum CachePriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4,
}

// Configuration for different content types
interface TTLConfig {
  strainTypes: number;        // Strain types (sativa, indica, hybrid) - rarely change
  effects: number;           // Effects translations - rarely change  
  flavors: number;           // Flavor translations - rarely change
  difficulties: number;      // Grow difficulties - rarely change
  descriptions: number;      // Dynamic descriptions - may change more often
  default: number;          // Default TTL for unspecified content
}

// Performance metrics interface
export interface TranslationMetrics {
  cacheHitRate: number;
  averageTranslationTime: number;
  totalTranslations: number;
  cacheSize: number;
  memoryUsage: number;
  backgroundQueueSize: number;
  preloadProgress: number;
}

// Configuration interface
interface PerformanceConfig {
  enableAdvancedCaching: boolean;
  enablePerformanceMonitoring: boolean;
  enableBackgroundProcessing: boolean;
  maxCacheSize: number;
  batchSize: number;
  ttlConfig: TTLConfig;
}

class TranslationPerformanceService {
  private cache = new Map<string, CacheEntry>();
  private metrics: TranslationMetrics = {
    cacheHitRate: 0,
    averageTranslationTime: 0,
    totalTranslations: 0,
    cacheSize: 0,
    memoryUsage: 0,
    backgroundQueueSize: 0,
    preloadProgress: 0,
  };
  
  // Performance tracking
  private totalRequests = 0;
  private cacheHits = 0;
  private translationTimes: number[] = [];
  
  // Default configuration
  private config: PerformanceConfig = {
    enableAdvancedCaching: true,
    enablePerformanceMonitoring: true,
    enableBackgroundProcessing: true,
    maxCacheSize: 1000, // Maximum number of cached entries
    batchSize: 10,      // Batch size for background processing
    ttlConfig: {
      strainTypes: 1000 * 60 * 60 * 24 * 7,    // 7 days (rarely change)
      effects: 1000 * 60 * 60 * 24 * 3,        // 3 days (stable)
      flavors: 1000 * 60 * 60 * 24 * 3,        // 3 days (stable)
      difficulties: 1000 * 60 * 60 * 24 * 7,   // 7 days (rarely change)
      descriptions: 1000 * 60 * 30,             // 30 minutes (may change)
      default: 1000 * 60 * 60,                  // 1 hour (default)
    },
  };

  /**
   * Update service configuration
   */
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.debug('Translation performance config updated:', this.config);
  }

  /**
   * Get TTL for specific content type
   */
  private getTTL(contentType: keyof TTLConfig): number {
    return this.config.ttlConfig[contentType] || this.config.ttlConfig.default;
  }

  /**
   * Get cache priority for content type
   */
  private getCachePriority(contentType: string): CachePriority {
    switch (contentType) {
      case 'strain_type':
      case 'grow_difficulty':
        return CachePriority.CRITICAL;
      case 'strain_effect':
      case 'strain_flavor':
        return CachePriority.HIGH;
      case 'description':
        return CachePriority.NORMAL;
      default:
        return CachePriority.LOW;
    }
  }

  /**
   * Enhanced cache storage with metadata
   */
  setCacheEntry(
    key: string, 
    value: string, 
    contentType: keyof TTLConfig = 'default'
  ): void {
    if (!this.config.enableAdvancedCaching) return;

    const now = Date.now();
    const ttl = this.getTTL(contentType);
    const priority = this.getCachePriority(key.split(':')[0] || 'default');

    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictLeastImportant();
    }

    const entry: CacheEntry = {
      value,
      timestamp: now,
      ttl,
      hitCount: 0,
      lastAccessed: now,
      priority,
    };

    this.cache.set(key, entry);
    this.updateMetrics();
  }

  /**
   * Enhanced cache retrieval with hit tracking
   */
  getCacheEntry(key: string): string | null {
    if (!this.config.enableAdvancedCaching) return null;

    this.totalRequests++;
    const entry = this.cache.get(key);

    if (!entry) {
      this.updateCacheHitRate();
      return null;
    }

    const now = Date.now();
    
    // Check if entry is expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.updateCacheHitRate();
      return null;
    }

    // Update hit statistics
    entry.hitCount++;
    entry.lastAccessed = now;
    this.cacheHits++;
    this.updateCacheHitRate();

    return entry.value;
  }

  /**
   * Intelligent cache eviction based on priority and usage
   */
  private evictLeastImportant(): void {
    if (this.cache.size === 0) return;

    let victimKey: string | null = null;
    let lowestScore = Infinity;

    for (const [key, entry] of this.cache) {
      // Calculate eviction score (lower = more likely to be evicted)
      const age = Date.now() - entry.timestamp;
      const timeSinceLastAccess = Date.now() - entry.lastAccessed;
      const score = 
        entry.priority * 1000 +           // Priority weight
        entry.hitCount * 100 +            // Usage weight
        Math.max(0, entry.ttl - age) / 1000 -  // Remaining TTL weight
        timeSinceLastAccess / 1000;       // Recency penalty

      if (score < lowestScore) {
        lowestScore = score;
        victimKey = key;
      }
    }

    if (victimKey) {
      this.cache.delete(victimKey);
      logger.debug('Evicted cache entry:', victimKey, 'Score:', lowestScore);
    }
  }

  /**
   * Update cache hit rate calculation
   */
  private updateCacheHitRate(): void {
    this.metrics.cacheHitRate = this.totalRequests > 0 
      ? (this.cacheHits / this.totalRequests) * 100 
      : 0;
  }

  /**
   * Track translation performance
   */
  trackTranslationTime(duration: number): void {
    if (!this.config.enablePerformanceMonitoring) return;

    this.translationTimes.push(duration);
    this.metrics.totalTranslations++;

    // Keep only last 100 measurements for rolling average
    if (this.translationTimes.length > 100) {
      this.translationTimes = this.translationTimes.slice(-100);
    }

    // Calculate average
    this.metrics.averageTranslationTime = 
      this.translationTimes.reduce((sum, time) => sum + time, 0) / 
      this.translationTimes.length;
  }

  /**
   * Update metrics (called periodically)
   */
  private updateMetrics(): void {
    this.metrics.cacheSize = this.cache.size;
    
    // Calculate estimated memory usage
    let memoryUsage = 0;
    for (const [key, entry] of this.cache) {
      memoryUsage += key.length + entry.value.length + 100; // ~100 bytes overhead per entry
    }
    this.metrics.memoryUsage = memoryUsage;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): TranslationMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get detailed cache statistics
   */
  getCacheStatistics(): {
    totalEntries: number;
    hitRate: number;
    averageHitCount: number;
    entriesByPriority: Record<CachePriority, number>;
    oldestEntry: number;
    newestEntry: number;
  } {
    const entriesByPriority = {
      [CachePriority.CRITICAL]: 0,
      [CachePriority.HIGH]: 0,
      [CachePriority.NORMAL]: 0,
      [CachePriority.LOW]: 0,
    };

    let totalHitCount = 0;
    let oldestTimestamp = Date.now();
    let newestTimestamp = 0;

    for (const entry of this.cache.values()) {
      entriesByPriority[entry.priority]++;
      totalHitCount += entry.hitCount;
      oldestTimestamp = Math.min(oldestTimestamp, entry.timestamp);
      newestTimestamp = Math.max(newestTimestamp, entry.timestamp);
    }

    return {
      totalEntries: this.cache.size,
      hitRate: this.metrics.cacheHitRate,
      averageHitCount: this.cache.size > 0 ? totalHitCount / this.cache.size : 0,
      entriesByPriority,
      oldestEntry: oldestTimestamp,
      newestEntry: newestTimestamp,
    };
  }

  /**
   * Clear cache (useful for language switching)
   */
  clearCache(): void {
    this.cache.clear();
    this.updateMetrics();
    logger.debug('Translation cache cleared');
  }

  /**
   * Preload cache with common translations
   */
  async preloadCommonTranslations(
    translations: Record<string, { value: string; type: keyof TTLConfig }>
  ): Promise<void> {
    if (!this.config.enableAdvancedCaching) return;

    return new Promise((resolve) => {
      InteractionManager.runAfterInteractions(() => {
        const startTime = Date.now();
        let processed = 0;
        const total = Object.keys(translations).length;

        for (const [key, { value, type }] of Object.entries(translations)) {
          this.setCacheEntry(key, value, type);
          processed++;
          
          // Update preload progress
          this.metrics.preloadProgress = (processed / total) * 100;
        }

        const duration = Date.now() - startTime;
        logger.debug('Preloaded translations:', {
          count: total,
          duration,
          cacheSize: this.cache.size,
        });

        resolve();
      });
    });
  }

  /**
   * Cleanup expired entries (run periodically)
   */
  cleanupExpiredEntries(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.updateMetrics();
      logger.debug('Cleaned up expired cache entries:', cleaned);
    }

    return cleaned;
  }

  /**
   * Get cache warmup recommendations
   */
  getWarmupRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.metrics.cacheHitRate < 50) {
      recommendations.push('Low cache hit rate - consider preloading more common terms');
    }
    
    if (this.metrics.averageTranslationTime > 10) {
      recommendations.push('High translation times - enable background processing');
    }
    
    if (this.cache.size < this.config.maxCacheSize * 0.5) {
      recommendations.push('Cache underutilized - consider increasing preload scope');
    }

    return recommendations;
  }
}

// Export singleton instance
export const translationPerformance = new TranslationPerformanceService();

// Export types
export type { TranslationMetrics, PerformanceConfig, TTLConfig }; 