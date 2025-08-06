/**
 * Configuration Index
 * 
 * Central configuration exports for the Canabro application
 */

export * from './featureFlags';
export * from './i18n';
export * from './notifications';
export * from './production';
export * from './taskNotificationConfig';

// Community-specific configuration
export const COMMUNITY_MESSAGES_CHANNEL = 'community_messages';
export const COMMUNITY_NOTIFICATIONS_CHANNEL = 'community_notifications';
export const COMMUNITY_PRESENCE_CHANNEL = 'community_presence';

// Real-time configuration
export const REALTIME_CONFIG = {
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 1000,
  HEARTBEAT_INTERVAL: 30000,
  MESSAGE_BATCH_SIZE: 50,
  RATE_LIMIT_PER_SECOND: 100,
} as const;

// Cache configuration
export const CACHE_CONFIG = {
  MAX_MESSAGES_PER_CONVERSATION: 1000,
  MAX_NOTIFICATIONS_PER_USER: 500,
  CACHE_EXPIRY_HOURS: 24,
  COMPRESSION_THRESHOLD: 100,
} as const;

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  MESSAGE_DELIVERY_TARGET_MS: 500,
  NOTIFICATION_DELIVERY_TARGET_MS: 1000,
  CACHE_OPERATION_TARGET_MS: 100,
  SYNC_OPERATION_TARGET_MS: 3000,
} as const;