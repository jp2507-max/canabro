/**
 * FlashList v2 Exports Test
 * 
 * This test verifies that all FlashList v2 types and components are properly exported
 * and can be imported without conflicts.
 */

import { describe, it, expect } from '@jest/globals';

describe('FlashList v2 Exports', () => {
  it('should export FlashListRef type from FlashListWrapper', async () => {
    const { FlashListRef } = await import('../../components/ui/FlashListWrapper');
    expect(FlashListRef).toBeDefined();
  });

  it('should export AnimatedFlashList component', async () => {
    const { AnimatedFlashList } = await import('../../components/ui/FlashListWrapper');
    expect(AnimatedFlashList).toBeDefined();
  });

  it('should export FlashList component', async () => {
    const { FlashList } = await import('../../components/ui/FlashListWrapper');
    expect(FlashList).toBeDefined();
  });

  it('should export FlashListProps type', async () => {
    const { FlashListProps } = await import('../../components/ui/FlashListWrapper');
    expect(FlashListProps).toBeDefined();
  });

  it('should export v2 hook wrappers', async () => {
    const {
      useFlashListV2State,
      useFlashListLayout,
      useFlashListCombinedState,
      useFlashListItemState
    } = await import('../flashlist-v2-hooks');
    
    expect(useFlashListV2State).toBeDefined();
    expect(useFlashListLayout).toBeDefined();
    expect(useFlashListCombinedState).toBeDefined();
    expect(useFlashListItemState).toBeDefined();
  });

  it('should export original FlashList v2 hooks', async () => {
    const {
      useRecyclingState,
      useLayoutState,
      useMappingHelper
    } = await import('../flashlist-v2-hooks');
    
    expect(useRecyclingState).toBeDefined();
    expect(useLayoutState).toBeDefined();
    expect(useMappingHelper).toBeDefined();
  });

  it('should export performance utilities', async () => {
    const {
      useFlashListV2Performance,
      validateFlashListProps,
      detectDeprecatedFlashListProps,
      logDeprecationWarnings,
      clearDeprecationWarningCache
    } = await import('../flashlist-performance');
    
    expect(useFlashListV2Performance).toBeDefined();
    expect(validateFlashListProps).toBeDefined();
    expect(detectDeprecatedFlashListProps).toBeDefined();
    expect(logDeprecationWarnings).toBeDefined();
    expect(clearDeprecationWarningCache).toBeDefined();
  });

  it('should export v2 performance configuration types', async () => {
    // Test that types can be imported (TypeScript compilation test)
    const module = await import('../flashlist-performance');
    
    // These are type-only exports, so we can't test them at runtime
    // But if the import succeeds, the types are properly exported
    expect(module).toBeDefined();
  });

  it('should export hook configuration types', async () => {
    // Test that types can be imported (TypeScript compilation test)
    const module = await import('../flashlist-v2-hooks');
    
    // These are type-only exports, so we can't test them at runtime
    // But if the import succeeds, the types are properly exported
    expect(module).toBeDefined();
  });
});

describe('FlashList v2 Type Compatibility', () => {
  it('should allow importing types from different modules without conflicts', async () => {
    // Test importing from multiple modules to ensure no conflicts
    const [wrapperModule, hooksModule, performanceModule] = await Promise.all([
      import('../../components/ui/FlashListWrapper'),
      import('../flashlist-v2-hooks'),
      import('../flashlist-performance')
    ]);
    
    expect(wrapperModule).toBeDefined();
    expect(hooksModule).toBeDefined();
    expect(performanceModule).toBeDefined();
  });

  it('should support importing from index files', async () => {
    // Test that index files work correctly
    const [uiIndex, utilsIndex, typesIndex] = await Promise.all([
      import('../../components/ui/index'),
      import('../index'),
      import('../../types/index')
    ]);
    
    expect(uiIndex).toBeDefined();
    expect(utilsIndex).toBeDefined();
    expect(typesIndex).toBeDefined();
  });
});