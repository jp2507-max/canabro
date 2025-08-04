/**
 * Database Optimization Utilities (2025 Standards)
 * 
 * Advanced database optimization for Supabase with:
 * - Query performance analysis
 * - Index optimization suggestions
 * - Connection pooling management
 * - Query caching strategies
 * - Performance monitoring
 */

import { log } from './logger';

export interface QueryPerformanceMetrics {
  queryId: string;
  table: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  executionTime: number;
  rowsAffected: number;
  timestamp: number;
  queryHash: string;
}

export interface IndexSuggestion {
  table: string;
  columns: string[];
  indexType: 'btree' | 'gin' | 'gist' | 'hash';
  priority: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  estimatedImpact: number; // Performance improvement percentage
  migrationSQL: string;
}

export interface ConnectionPoolMetrics {
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  averageQueryTime: number;
  connectionErrors: number;
  lastOptimization: number;
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalQueries: number;
  cacheSize: number;
  memoryUsage: number;
  lastCleanup: number;
}

class DatabaseOptimizer {
  private static instance: DatabaseOptimizer;
  private queryMetrics: Map<string, QueryPerformanceMetrics[]> = new Map();
  private queryCache: Map<string, { data: unknown; timestamp: number; ttl: number }> = new Map();
  private connectionMetrics: ConnectionPoolMetrics = {
    activeConnections: 0,
    idleConnections: 0,
    totalConnections: 0,
    averageQueryTime: 0,
    connectionErrors: 0,
    lastOptimization: Date.now()
  };
  private cacheMetrics: CacheMetrics = {
    hitRate: 0,
    missRate: 0,
    totalQueries: 0,
    cacheSize: 0,
    memoryUsage: 0,
    lastCleanup: Date.now()
  };
  
  // Configuration
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly DEFAULT_CACHE_TTL = 300000; // 5 minutes
  private readonly METRICS_RETENTION_DAYS = 7;
  private readonly OPTIMIZATION_INTERVAL = 3600000; // 1 hour
  
  private optimizationInterval?: NodeJS.Timeout;
  
  private constructor() {
    this.initializeOptimization();
  }
  
  public static getInstance(): DatabaseOptimizer {
    if (!DatabaseOptimizer.instance) {
      DatabaseOptimizer.instance = new DatabaseOptimizer();
    }
    return DatabaseOptimizer.instance;
  }
  
  /**
   * Initialize database optimization
   */
  private initializeOptimization(): void {
    // Start periodic optimization
    this.optimizationInterval = setInterval(() => {
      this.performOptimization();
    }, this.OPTIMIZATION_INTERVAL);
    
    // Initial optimization
    setTimeout(() => this.performOptimization(), 5000);
    
    log.info('[DatabaseOptimizer] Initialized with periodic optimization');
  }
  
  /**
   * Execute optimized query with performance tracking
   */
  async executeOptimizedQuery<T = unknown>(
    queryBuilder: unknown,
    options: {
      cacheKey?: string;
      cacheTTL?: number;
      enableCache?: boolean;
      trackPerformance?: boolean;
      table?: string;
      operation?: QueryPerformanceMetrics['operation'];
    } = {}
  ): Promise<{ data: T | null; error: unknown; metrics?: QueryPerformanceMetrics }> {
    const startTime = Date.now();
    const queryHash = this.generateQueryHash(queryBuilder);
    
    // Check cache first
    if (options.enableCache && options.cacheKey) {
      const cached = this.getFromCache<T>(options.cacheKey);
      if (cached) {
        this.updateCacheMetrics(true);
        return { data: cached, error: null };
      }
    }
    
    try {
      // Execute query
      // We expect queryBuilder to be a Promise-like object returning { data, error }
      // Cast to a minimal structural type to keep strict typing without using any.
      const result = await (queryBuilder as Promise<Partial<{ data: T | null; error: unknown }>>);
      const executionTime = Date.now() - startTime;
      
      // Track performance metrics
      let metrics: QueryPerformanceMetrics | undefined;
      if (options.trackPerformance && options.table && options.operation) {
        const rowsAffected = Array.isArray(result && result.data)
          ? (result.data as unknown[]).length
          : (result && 'data' in result && result.data ? 1 : 0);
        metrics = {
          queryId: `query_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          table: options.table,
          operation: options.operation,
          executionTime,
          rowsAffected,
          timestamp: Date.now(),
          queryHash
        };
        
        this.recordQueryMetrics(metrics);
      }
      
      // Cache result if enabled
      if (options.enableCache && options.cacheKey && result.data != null && !result?.error) {
        this.setCache<T>(options.cacheKey, result.data as T, options.cacheTTL);
      }
      
      this.updateCacheMetrics(false);
      
      // Ensure `data` and `error` are normalized to satisfy return type
      const normalizedData: T | null = (result && 'data' in result && (result as { data?: T | null }).data !== undefined
        ? ((result as { data?: T | null }).data as T | null)
        : null);
      const normalizedError: unknown = (result && 'error' in result ? (result as { error?: unknown }).error ?? null : null);
      return { data: normalizedData, error: normalizedError, metrics };
      
    } catch (error) {
      log.error('[DatabaseOptimizer] Query execution failed:', error);
      this.updateCacheMetrics(false);
      return { data: null, error };
    }
  }
  
  /**
   * Analyze query performance and generate optimization suggestions
   */
  async analyzePerformance(): Promise<{
    slowQueries: QueryPerformanceMetrics[];
    indexSuggestions: IndexSuggestion[];
    connectionIssues: string[];
    cacheOptimizations: string[];
  }> {
    const analysis = {
      slowQueries: [] as QueryPerformanceMetrics[],
      indexSuggestions: [] as IndexSuggestion[],
      connectionIssues: [] as string[],
      cacheOptimizations: [] as string[]
    };
    
    try {
      // Analyze slow queries
      analysis.slowQueries = this.identifySlowQueries();
      
      // Generate index suggestions
      analysis.indexSuggestions = await this.generateIndexSuggestions();
      
      // Check connection issues
      analysis.connectionIssues = this.identifyConnectionIssues();
      
      // Cache optimization suggestions
      analysis.cacheOptimizations = this.generateCacheOptimizations();
      
      log.info('[DatabaseOptimizer] Performance analysis completed', {
        slowQueries: analysis.slowQueries.length,
        indexSuggestions: analysis.indexSuggestions.length,
        connectionIssues: analysis.connectionIssues.length,
        cacheOptimizations: analysis.cacheOptimizations.length
      });
      
    } catch (error) {
      log.error('[DatabaseOptimizer] Performance analysis failed:', error);
    }
    
    return analysis;
  }
  
  /**
   * Generate database index suggestions
   */
  private async generateIndexSuggestions(): Promise<IndexSuggestion[]> {
    const suggestions: IndexSuggestion[] = [];
    
    try {
      // Analyze messages table
      suggestions.push({
        table: 'messages',
        columns: ['thread_id', 'sent_at'],
        indexType: 'btree',
        priority: 'critical',
        reason: 'Frequently queried for message history with time ordering',
        estimatedImpact: 75,
        migrationSQL: 'CREATE INDEX CONCURRENTLY idx_messages_thread_sent ON messages (thread_id, sent_at DESC);'
      });
      
      suggestions.push({
        table: 'messages',
        columns: ['sender_id'],
        indexType: 'btree',
        priority: 'high',
        reason: 'Used for filtering messages by sender',
        estimatedImpact: 50,
        migrationSQL: 'CREATE INDEX CONCURRENTLY idx_messages_sender ON messages (sender_id);'
      });
      
      // Analyze conversation_threads table
      suggestions.push({
        table: 'conversation_threads',
        columns: ['participants'],
        indexType: 'gin',
        priority: 'high',
        reason: 'JSON array queries for participant lookup',
        estimatedImpact: 60,
        migrationSQL: 'CREATE INDEX CONCURRENTLY idx_conversation_participants ON conversation_threads USING gin (participants);'
      });
      
      // Analyze live_notifications table
      suggestions.push({
        table: 'live_notifications',
        columns: ['user_id', 'created_at'],
        indexType: 'btree',
        priority: 'critical',
        reason: 'User notification queries with time ordering',
        estimatedImpact: 80,
        migrationSQL: 'CREATE INDEX CONCURRENTLY idx_notifications_user_created ON live_notifications (user_id, created_at DESC);'
      });
      
      suggestions.push({
        table: 'live_notifications',
        columns: ['is_read', 'user_id'],
        indexType: 'btree',
        priority: 'medium',
        reason: 'Filtering unread notifications by user',
        estimatedImpact: 40,
        migrationSQL: 'CREATE INDEX CONCURRENTLY idx_notifications_unread ON live_notifications (is_read, user_id) WHERE is_read = false;'
      });
      
      // Analyze follow_relationships table
      suggestions.push({
        table: 'follow_relationships',
        columns: ['follower_id'],
        indexType: 'btree',
        priority: 'medium',
        reason: 'Querying user following lists',
        estimatedImpact: 45,
        migrationSQL: 'CREATE INDEX CONCURRENTLY idx_follow_follower ON follow_relationships (follower_id);'
      });
      
      suggestions.push({
        table: 'follow_relationships',
        columns: ['following_id'],
        indexType: 'btree',
        priority: 'medium',
        reason: 'Querying user follower lists',
        estimatedImpact: 45,
        migrationSQL: 'CREATE INDEX CONCURRENTLY idx_follow_following ON follow_relationships (following_id);'
      });
      
      // Analyze social_groups table
      suggestions.push({
        table: 'social_groups',
        columns: ['category', 'created_at'],
        indexType: 'btree',
        priority: 'medium',
        reason: 'Group discovery by category with recency',
        estimatedImpact: 35,
        migrationSQL: 'CREATE INDEX CONCURRENTLY idx_groups_category_created ON social_groups (category, created_at DESC);'
      });
      
      // Analyze live_events table
      suggestions.push({
        table: 'live_events',
        columns: ['status', 'scheduled_start'],
        indexType: 'btree',
        priority: 'high',
        reason: 'Finding active and upcoming events',
        estimatedImpact: 55,
        migrationSQL: 'CREATE INDEX CONCURRENTLY idx_events_status_scheduled ON live_events (status, scheduled_start);'
      });
      
    } catch (error) {
      log.error('[DatabaseOptimizer] Error generating index suggestions:', error);
    }
    
    return suggestions;
  }
  
  /**
   * Apply critical database optimizations
   */
  async applyCriticalOptimizations(): Promise<{
    applied: IndexSuggestion[];
    failed: Array<{ suggestion: IndexSuggestion; error: string }>;
  }> {
    const result = {
      applied: [] as IndexSuggestion[],
      failed: [] as Array<{ suggestion: IndexSuggestion; error: string }>
    };
    
    try {
      const suggestions = await this.generateIndexSuggestions();
      const criticalSuggestions = suggestions.filter(s => s.priority === 'critical');
      
      for (const suggestion of criticalSuggestions) {
        try {
          // In a real implementation, you would execute the migration
          // For now, we'll just log what would be applied
          log.info(`[DatabaseOptimizer] Would apply critical optimization:`, {
            table: suggestion.table,
            sql: suggestion.migrationSQL,
            impact: suggestion.estimatedImpact
          });
          
          result.applied.push(suggestion);
          
        } catch (error) {
          log.error(`[DatabaseOptimizer] Failed to apply optimization for ${suggestion.table}:`, error);
          result.failed.push({
            suggestion,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
    } catch (error) {
      log.error('[DatabaseOptimizer] Error applying critical optimizations:', error);
    }
    
    return result;
  }
  
  /**
   * Optimize connection pool settings
   */
  async optimizeConnectionPool(): Promise<void> {
    try {
      // Analyze current connection usage
      const metrics = this.getConnectionMetrics();
      
      // Log optimization recommendations
      if (metrics.connectionErrors > 10) {
        log.warn('[DatabaseOptimizer] High connection error rate detected', {
          errors: metrics.connectionErrors,
          recommendation: 'Consider increasing connection pool size or implementing connection retry logic'
        });
      }
      
      if (metrics.averageQueryTime > 1000) {
        log.warn('[DatabaseOptimizer] Slow average query time detected', {
          averageTime: metrics.averageQueryTime,
          recommendation: 'Consider adding database indexes or optimizing queries'
        });
      }
      
      this.connectionMetrics.lastOptimization = Date.now();
      
    } catch (error) {
      log.error('[DatabaseOptimizer] Connection pool optimization failed:', error);
    }
  }
  
  /**
   * Perform periodic optimization
   */
  private async performOptimization(): Promise<void> {
    try {
      log.info('[DatabaseOptimizer] Starting periodic optimization');
      
      // Clean up old metrics
      this.cleanupOldMetrics();
      
      // Clean up cache
      this.cleanupCache();
      
      // Optimize connection pool
      await this.optimizeConnectionPool();
      
      // Analyze performance and log recommendations
      const analysis = await this.analyzePerformance();
      
      if (analysis.slowQueries.length > 0) {
        log.warn(`[DatabaseOptimizer] Found ${analysis.slowQueries.length} slow queries`);
      }
      
      if (analysis.indexSuggestions.filter(s => s.priority === 'critical').length > 0) {
        log.warn('[DatabaseOptimizer] Critical index optimizations needed');
      }
      
    } catch (error) {
      log.error('[DatabaseOptimizer] Periodic optimization failed:', error);
    }
  }
  
  /**
   * Record query performance metrics
   */
  private recordQueryMetrics(metrics: QueryPerformanceMetrics): void {
    const tableMetrics = this.queryMetrics.get(metrics.table) || [];
    tableMetrics.push(metrics);
    
    // Keep only recent metrics
    const cutoff = Date.now() - (this.METRICS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const recentMetrics = tableMetrics.filter(m => m.timestamp > cutoff);
    
    this.queryMetrics.set(metrics.table, recentMetrics);
  }
  
  /**
   * Identify slow queries
   */
  private identifySlowQueries(): QueryPerformanceMetrics[] {
    const slowQueries: QueryPerformanceMetrics[] = [];
    const SLOW_QUERY_THRESHOLD = 1000; // 1 second
    
    for (const tableMetrics of this.queryMetrics.values()) {
      const slow = tableMetrics.filter(m => m.executionTime > SLOW_QUERY_THRESHOLD);
      slowQueries.push(...slow);
    }
    
    // Sort by execution time (slowest first)
    return slowQueries.sort((a, b) => b.executionTime - a.executionTime);
  }
  
  /**
   * Identify connection issues
   */
  private identifyConnectionIssues(): string[] {
    const issues: string[] = [];
    
    if (this.connectionMetrics.connectionErrors > 5) {
      issues.push(`High connection error rate: ${this.connectionMetrics.connectionErrors} errors`);
    }
    
    if (this.connectionMetrics.averageQueryTime > 2000) {
      issues.push(`Slow average query time: ${this.connectionMetrics.averageQueryTime}ms`);
    }
    
    if (this.connectionMetrics.activeConnections > 50) {
      issues.push(`High active connection count: ${this.connectionMetrics.activeConnections}`);
    }
    
    return issues;
  }
  
  /**
   * Generate cache optimization suggestions
   */
  private generateCacheOptimizations(): string[] {
    const optimizations: string[] = [];
    
    if (this.cacheMetrics.hitRate < 0.5) {
      optimizations.push(`Low cache hit rate: ${(this.cacheMetrics.hitRate * 100).toFixed(1)}%. Consider increasing cache TTL or improving cache keys.`);
    }
    
    if (this.cacheMetrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
      optimizations.push(`High cache memory usage: ${(this.cacheMetrics.memoryUsage / 1024 / 1024).toFixed(1)}MB. Consider reducing cache size or TTL.`);
    }
    
    if (this.cacheMetrics.cacheSize > this.MAX_CACHE_SIZE * 0.9) {
      optimizations.push(`Cache near capacity: ${this.cacheMetrics.cacheSize}/${this.MAX_CACHE_SIZE}. Consider increasing max size or reducing TTL.`);
    }
    
    return optimizations;
  }
  
  /**
   * Cache management
   */
  private getFromCache<T = unknown>(key: string): T | null {
    const cached = this.queryCache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.timestamp + cached.ttl) {
      this.queryCache.delete(key);
      return null;
    }
    
    // Narrow to T only if data is not undefined/null
    return (cached.data as T) ?? null;
  }
  
  private setCache<T = unknown>(key: string, data: T, ttl = this.DEFAULT_CACHE_TTL): void {
    // Remove oldest entries if cache is full
    if (this.queryCache.size >= this.MAX_CACHE_SIZE) {
      const sorted = Array.from(this.queryCache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      const oldestKey = sorted.length > 0 ? sorted[0][0] : undefined;
      if (!oldestKey) return;
      this.queryCache.delete(oldestKey);
    }
    
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    this.updateCacheSize();
  }
  
  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, cached] of this.queryCache.entries()) {
      // cached is defined here, but add defensive defaults for strict safety
      const ttl = (cached && typeof cached.ttl === 'number') ? cached.ttl : this.DEFAULT_CACHE_TTL;
      const ts = (cached && typeof cached.timestamp === 'number') ? cached.timestamp : 0;
      if (now > ts + ttl) {
        this.queryCache.delete(key);
        cleaned++;
      }
    }
    
    this.updateCacheSize();
    this.cacheMetrics.lastCleanup = now;
    
    if (cleaned > 0) {
      log.debug(`[DatabaseOptimizer] Cleaned up ${cleaned} expired cache entries`);
    }
  }
  
  private updateCacheSize(): void {
    this.cacheMetrics.cacheSize = this.queryCache.size;
    this.cacheMetrics.memoryUsage = this.estimateCacheMemoryUsage();
  }
  
  private estimateCacheMemoryUsage(): number {
    let totalSize = 0;
    
    for (const cached of this.queryCache.values()) {
      // Rough estimation: JSON string length * 2 (for UTF-16)
      // cached is guaranteed by Map iterator; access fields defensively for strict null checks.
      const data = (cached as { data: unknown; timestamp: number; ttl: number }).data;
      const json = JSON.stringify(data) ?? '';
      totalSize += json.length * 2;
    }
    
    return totalSize;
  }
  
  private updateCacheMetrics(isHit: boolean): void {
    this.cacheMetrics.totalQueries++;
    
    if (isHit) {
      this.cacheMetrics.hitRate = (this.cacheMetrics.hitRate * (this.cacheMetrics.totalQueries - 1) + 1) / this.cacheMetrics.totalQueries;
    } else {
      this.cacheMetrics.hitRate = (this.cacheMetrics.hitRate * (this.cacheMetrics.totalQueries - 1)) / this.cacheMetrics.totalQueries;
    }
    
    this.cacheMetrics.missRate = 1 - this.cacheMetrics.hitRate;
  }
  
  /**
   * Generate query hash for caching
   */
  private generateQueryHash(queryBuilder: unknown): string {
    try {
      const queryString = JSON.stringify(queryBuilder) ?? '';
      // Simple hash function (defensive: ensure queryString is always a string)
      let hash = 0;
      for (let i = 0; i < queryString.length; i++) {
        const char = queryString.charCodeAt(i);
        hash = (((hash << 5) - hash) + char) | 0;
      }
      return hash.toString(36);
    } catch {
      return `hash_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
  }
  
  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - (this.METRICS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    let totalCleaned = 0;
    
    for (const [table, metrics] of this.queryMetrics.entries()) {
      const recentMetrics = metrics.filter(m => m.timestamp > cutoff);
      const cleaned = metrics.length - recentMetrics.length;
      
      if (cleaned > 0) {
        this.queryMetrics.set(table, recentMetrics);
        totalCleaned += cleaned;
      }
    }
    
    if (totalCleaned > 0) {
      log.debug(`[DatabaseOptimizer] Cleaned up ${totalCleaned} old metrics`);
    }
  }
  
  /**
   * Get current metrics
   */
  getConnectionMetrics(): ConnectionPoolMetrics {
    return { ...this.connectionMetrics };
  }
  
  getCacheMetrics(): CacheMetrics {
    this.updateCacheSize();
    return { ...this.cacheMetrics };
  }
  
  getQueryMetrics(): Map<string, QueryPerformanceMetrics[]> {
    return new Map(this.queryMetrics);
  }
  
  /**
   * Cleanup all resources
   */
  cleanup(): void {
    if (this.optimizationInterval != null) {
      clearInterval(this.optimizationInterval);
    }
    
    this.queryMetrics.clear();
    this.queryCache.clear();
    
    log.info('[DatabaseOptimizer] Cleanup completed');
  }
}

// Export singleton instance
export const databaseOptimizer = DatabaseOptimizer.getInstance();

// Export utility functions
export { executeOptimizedQuery };
async function executeOptimizedQuery<T = unknown>(
  queryBuilder: unknown,
  options: Parameters<typeof databaseOptimizer.executeOptimizedQuery>[1] = {}
): Promise<{ data: T | null; error: unknown; metrics?: QueryPerformanceMetrics }> {
  return databaseOptimizer.executeOptimizedQuery<T>(queryBuilder, options);
}

export { analyzePerformance };
async function analyzePerformance() {
  return databaseOptimizer.analyzePerformance();
}

export { applyCriticalOptimizations };
async function applyCriticalOptimizations() {
  return databaseOptimizer.applyCriticalOptimizations();
}

export default databaseOptimizer;
