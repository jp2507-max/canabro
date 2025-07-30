/**
 * Realtime Configuration Service (2025)
 * 
 * Manages Supabase Realtime configuration with 2025 best practices:
 * - Enhanced connection management
 * - Rate limiting configuration
 * - Error handling patterns
 * - Performance optimization settings
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { log } from '../utils/logger';

export interface RealtimeConfig {
    // Connection settings
    maxConnections: number;
    connectionTimeout: number;
    heartbeatInterval: number;

    // Rate limiting
    maxMessagesPerSecond: number;
    maxChannelsPerUser: number;
    maxConcurrentUsers: number;

    // Batching settings
    batchSize: number;
    batchTimeout: number;

    // Retry settings
    maxRetries: number;
    baseRetryDelay: number;
    maxRetryDelay: number;

    // Performance settings
    enableCompression: boolean;
    enableDeduplication: boolean;
    cacheSize: number;
}

export interface RealtimeQuotas {
    // Current Supabase quotas (2025)
    maxConnections: number;
    maxMessagesPerSecond: number;
    maxChannels: number;
    maxBytesPerSecond: number;
}

class RealtimeConfigService {
    private config: RealtimeConfig;
    private quotas: RealtimeQuotas;

    constructor() {
        // Default configuration optimized for 2025
        this.config = {
            // Connection settings
            maxConnections: 16384, // Supabase default soft limit
            connectionTimeout: 30000, // 30 seconds
            heartbeatInterval: 30, // 30 seconds

            // Rate limiting (aligned with Supabase quotas)
            maxMessagesPerSecond: 100, // Per user
            maxChannelsPerUser: 100, // Per user
            maxConcurrentUsers: 200, // Per channel

            // Batching settings
            batchSize: 10,
            batchTimeout: 100, // 100ms

            // Retry settings
            maxRetries: 5,
            baseRetryDelay: 1000, // 1 second
            maxRetryDelay: 30000, // 30 seconds

            // Performance settings
            enableCompression: true,
            enableDeduplication: true,
            cacheSize: 1000 // Number of cached messages
        };

        // Current Supabase quotas (2025)
        this.quotas = {
            maxConnections: 16384,
            maxMessagesPerSecond: 100,
            maxChannels: 100,
            maxBytesPerSecond: 100000
        };
    }

    /**
     * Get current configuration
     */
    getConfig(): RealtimeConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    updateConfig(updates: Partial<RealtimeConfig>): void {
        this.config = { ...this.config, ...updates };
        log.info('[RealtimeConfig] Configuration updated:', updates);
    }

    /**
     * Get current quotas
     */
    getQuotas(): RealtimeQuotas {
        return { ...this.quotas };
    }

    /**
     * Update quotas (when plan changes)
     */
    updateQuotas(updates: Partial<RealtimeQuotas>): void {
        this.quotas = { ...this.quotas, ...updates };
        log.info('[RealtimeConfig] Quotas updated:', updates);
    }

    /**
     * Get optimized client configuration for Supabase
     */
    getSupabaseClientConfig(): any {
        return {
            realtime: {
                params: {
                    eventsPerSecond: this.config.maxMessagesPerSecond,
                },
                heartbeatIntervalMs: this.config.heartbeatInterval * 1000,
                reconnectAfterMs: (tries: number) => {
                    const delay = Math.min(
                        this.config.baseRetryDelay * Math.pow(2, tries - 1),
                        this.config.maxRetryDelay
                    );
                    return delay;
                },
                encode: this.config.enableCompression ? this.compressMessage : undefined,
                decode: this.config.enableCompression ? this.decompressMessage : undefined,
            }
        };
    }

    /**
     * Validate configuration against quotas
     */
    validateConfig(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (this.config.maxMessagesPerSecond > this.quotas.maxMessagesPerSecond) {
            errors.push(`maxMessagesPerSecond (${this.config.maxMessagesPerSecond}) exceeds quota (${this.quotas.maxMessagesPerSecond})`);
        }

        if (this.config.maxChannelsPerUser > this.quotas.maxChannels) {
            errors.push(`maxChannelsPerUser (${this.config.maxChannelsPerUser}) exceeds quota (${this.quotas.maxChannels})`);
        }

        if (this.config.maxConnections > this.quotas.maxConnections) {
            errors.push(`maxConnections (${this.config.maxConnections}) exceeds quota (${this.quotas.maxConnections})`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get recommended configuration for different use cases
     */
    getRecommendedConfig(useCase: 'messaging' | 'notifications' | 'live_events' | 'presence'): Partial<RealtimeConfig> {
        switch (useCase) {
            case 'messaging':
                return {
                    maxMessagesPerSecond: 50, // Lower for messaging to ensure delivery
                    batchSize: 5,
                    batchTimeout: 200,
                    enableDeduplication: true,
                    cacheSize: 500
                };

            case 'notifications':
                return {
                    maxMessagesPerSecond: 20, // Conservative for notifications
                    batchSize: 1, // Don't batch notifications
                    batchTimeout: 0,
                    enableDeduplication: false,
                    cacheSize: 100
                };

            case 'live_events':
                return {
                    maxMessagesPerSecond: 100, // High throughput for events
                    maxConcurrentUsers: 500,
                    batchSize: 20,
                    batchTimeout: 50,
                    enableCompression: true,
                    cacheSize: 2000
                };

            case 'presence':
                return {
                    maxMessagesPerSecond: 10, // Low frequency for presence
                    heartbeatInterval: 15, // More frequent heartbeat
                    batchSize: 1,
                    batchTimeout: 0,
                    enableDeduplication: true,
                    cacheSize: 50
                };

            default:
                return {};
        }
    }

    /**
     * Message compression (if enabled)
     */
    private compressMessage(payload: any): string {
        try {
            // Simple JSON compression - in production, use a proper compression library
            const jsonString = JSON.stringify(payload);
            // This is a placeholder - implement actual compression
            return jsonString;
        } catch (error) {
            log.error('[RealtimeConfig] Message compression failed:', error);
            return JSON.stringify(payload);
        }
    }

    /**
     * Message decompression (if enabled)
     */
    private decompressMessage(payload: string): any {
        try {
            // Simple JSON decompression - in production, use a proper compression library
            return JSON.parse(payload);
        } catch (error) {
            log.error('[RealtimeConfig] Message decompression failed:', error);
            return payload;
        }
    }

    /**
     * Get error handling configuration
     */
    getErrorHandlingConfig(): {
        retryableErrors: string[];
        nonRetryableErrors: string[];
        errorActions: Record<string, string>;
    } {
        return {
            retryableErrors: [
                'ConnectionRateLimitReached',
                'RealtimeNodeDisconnected',
                'DatabaseConnectionIssue',
                'TimeoutOnRpcCall',
                'ErrorOnRpcCall'
            ],
            nonRetryableErrors: [
                'Unauthorized',
                'InvalidJWTExpiration',
                'JwtSignatureError',
                'MalformedJWT',
                'UnprocessableEntity'
            ],
            errorActions: {
                'ConnectionRateLimitReached': 'backoff_and_retry',
                'RealtimeNodeDisconnected': 'reconnect',
                'DatabaseConnectionIssue': 'retry_with_delay',
                'Unauthorized': 'refresh_token',
                'InvalidJWTExpiration': 'refresh_token',
                'RlsPolicyError': 'check_permissions'
            }
        };
    }

    /**
     * Get monitoring configuration
     */
    getMonitoringConfig(): {
        metricsEnabled: boolean;
        logLevel: string;
        performanceTracking: boolean;
        errorReporting: boolean;
    } {
        return {
            metricsEnabled: true,
            logLevel: (typeof __DEV__ !== 'undefined' && __DEV__) ? 'debug' : 'info',
            performanceTracking: true,
            errorReporting: true
        };
    }

    /**
     * Reset to default configuration
     */
    resetToDefaults(): void {
        this.config = {
            maxConnections: 16384,
            connectionTimeout: 30000,
            heartbeatInterval: 30,
            maxMessagesPerSecond: 100,
            maxChannelsPerUser: 100,
            maxConcurrentUsers: 200,
            batchSize: 10,
            batchTimeout: 100,
            maxRetries: 5,
            baseRetryDelay: 1000,
            maxRetryDelay: 30000,
            enableCompression: true,
            enableDeduplication: true,
            cacheSize: 1000
        };
        log.info('[RealtimeConfig] Configuration reset to defaults');
    }
}

// Export singleton instance
export const realtimeConfig = new RealtimeConfigService();
export default realtimeConfig;