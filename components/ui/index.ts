/**
 * UI Components Index
 * 
 * Centralized exports for all UI components with FlashList v2 compatibility.
 * This file ensures all v2 types and components are properly exported.
 */

// FlashList v2 Components and Types
export {
  FlashListWrapper,
  AnimatedFlashList,
  FlashList,
  type FlashListRef,
  type FlashListProps
} from './FlashListWrapper';

// Other UI Components (only export existing components)
// Note: Add other component exports as needed when they exist

// Re-export FlashList v2 performance utilities and hooks
export {
  useFlashListV2Performance,
  useFlashListV2State,
  useFlashListLayout,
  useFlashListCombinedState,
  useFlashListItemState,
  validateFlashListProps,
  detectDeprecatedFlashListProps,
  logDeprecationWarnings,
  clearDeprecationWarningCache,
  type FlashListV2PerformanceConfig,
  type FlashListV2StateConfig,
  type FlashListLayoutConfig,
  type V2PerformanceMetrics,
  type MessageListItem,
  type DeprecatedPropWarning,
  type FlashListV2StateReturn,
  type FlashListLayoutReturn,
  type FlashListCombinedStateReturn,
  type FlashListItemStateReturn,
  type FlashListV2Item,
  type FlashListV2ItemConfig,
  // Legacy exports for backward compatibility
  type FlashListPerformanceConfig,
  type PerformanceMetrics
} from '../../lib/utils/flashlist-performance';

// Re-export FlashList v2 hooks directly
export {
  useRecyclingState,
  useLayoutState,
  useMappingHelper
} from '@shopify/flash-list';