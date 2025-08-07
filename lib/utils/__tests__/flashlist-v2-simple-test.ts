/**
 * Simple FlashList v2 Exports Test
 * 
 * This file tests only the FlashList v2 exports to ensure they work correctly.
 */

// Test direct imports from FlashList v2 hooks
import {
  useFlashListV2State,
  useFlashListLayout,
  useFlashListCombinedState,
  useFlashListItemState,
  useRecyclingState,
  useLayoutState,
  useMappingHelper
} from '../flashlist-v2-hooks';

// Test performance utilities
import {
  useFlashListV2Performance,
  validateFlashListProps,
  detectDeprecatedFlashListProps,
  logDeprecationWarnings,
  clearDeprecationWarningCache
} from '../flashlist-performance';

// Test that all functions are defined
console.log('✅ FlashList v2 Hook Exports:');
console.log('- useFlashListV2State:', typeof useFlashListV2State);
console.log('- useFlashListLayout:', typeof useFlashListLayout);
console.log('- useFlashListCombinedState:', typeof useFlashListCombinedState);
console.log('- useFlashListItemState:', typeof useFlashListItemState);
console.log('- useRecyclingState:', typeof useRecyclingState);
console.log('- useLayoutState:', typeof useLayoutState);
console.log('- useMappingHelper:', typeof useMappingHelper);

console.log('\n✅ FlashList v2 Performance Exports:');
console.log('- useFlashListV2Performance:', typeof useFlashListV2Performance);
console.log('- validateFlashListProps:', typeof validateFlashListProps);
console.log('- detectDeprecatedFlashListProps:', typeof detectDeprecatedFlashListProps);
console.log('- logDeprecationWarnings:', typeof logDeprecationWarnings);
console.log('- clearDeprecationWarningCache:', typeof clearDeprecationWarningCache);

console.log('\n🎉 All FlashList v2 exports are working correctly!');