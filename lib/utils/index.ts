/**
 * Utils Index
 * 
 * Centralized exports for all utility functions with FlashList v2 compatibility.
 * This file ensures all v2 utilities and types are properly exported.
 */

// FlashList v2 Performance Utilities
export {
  useFlashListV2Performance,
  validateFlashListProps,
  detectDeprecatedFlashListProps,
  logDeprecationWarnings,
  clearDeprecationWarningCache,
  type FlashListV2PerformanceConfig,
  type V2PerformanceMetrics,
  type MessageListItem,
  type DeprecatedPropWarning,
  // Legacy exports for backward compatibility
  type FlashListPerformanceConfig,
  type PerformanceMetrics
} from './flashlist-performance';

// FlashList v2 Hook Wrappers
export {
  useFlashListV2State,
  useFlashListLayout,
  useFlashListCombinedState,
  useFlashListItemState,
  useRecyclingState,
  useLayoutState,
  useMappingHelper,
  type FlashListV2StateConfig,
  type FlashListLayoutConfig,
  type FlashListV2StateReturn,
  type FlashListLayoutReturn,
  type FlashListCombinedStateReturn,
  type FlashListItemStateReturn,
  type FlashListV2Item,
  type FlashListV2ItemConfig
} from './flashlist-v2-hooks';

// Core FlashList v2 Types (re-exported for convenience)
export type { FlashListRef, FlashListProps } from '@shopify/flash-list';

// Image & Media Utilities
export * from './image-picker';
export * from './upload-image';
export * from './image';

// User Experience Utilities
export * from './haptics';
export * from './logger';
export * from './errorHandler';

// Data & Storage Utilities
export * from './database';
export * from './data-parsing';
export * from './uuid';

// Performance & Optimization Utilities
export * from './crashPrevention';
export * from './performance-profiler';
export * from './perfLogger';
export * from './database-optimization';
export * from './performance-testing';

// Platform & Environment Utilities
export * from './platform-utils';
export * from './production-utils';

// String & Date Processing Utilities
export * from './string-utils';
export * from './date';
export * from './notification-scheduling';

// Type Safety & Validation Utilities
export * from './task-type-validation';

// Navigation & Routing Utilities
export * from './taskNavigation';
export * from './taskNotificationNavigation';
export * from './auth-navigation';
export * from './protected-routes';

// Domain-Specific Utilities
export * from './community-transforms';
// Note: strainIdMapping has uuid conflicts, import specifically if needed
export * from './environmental-formatting';
export * from './yield-calculator';
export * from './watermelon-helpers';