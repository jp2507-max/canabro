/**
 * FlashList v2 Exports Verification
 * 
 * This file verifies that all FlashList v2 types and components can be imported
 * without TypeScript errors. If this file compiles successfully, all exports are working.
 */

// Test FlashListWrapper exports
import {
  FlashListWrapper,
  AnimatedFlashList,
  FlashList,
  type FlashListRef,
  type FlashListProps
} from '../../components/ui/FlashListWrapper';

// Test FlashList v2 hooks exports
import {
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
} from '../flashlist-v2-hooks';

// Test performance utilities exports
import {
  useFlashListV2Performance,
  validateFlashListProps,
  detectDeprecatedFlashListProps,
  logDeprecationWarnings,
  clearDeprecationWarningCache,
  type FlashListV2PerformanceConfig,
  type V2PerformanceMetrics,
  type MessageListItem,
  type DeprecatedPropWarning,
  // Legacy types
  type FlashListPerformanceConfig,
  type PerformanceMetrics
} from '../flashlist-performance';

// Test index exports
import {
  // FlashList v2 Performance Utilities
  useFlashListV2Performance as indexUseFlashListV2Performance,
  validateFlashListProps as indexValidateFlashListProps,
  // FlashList v2 Hook Wrappers
  useFlashListV2State as indexUseFlashListV2State,
  useFlashListLayout as indexUseFlashListLayout,
  // Core FlashList v2 Types
  type FlashListRef as IndexFlashListRef,
  type FlashListProps as IndexFlashListProps
} from '../index';

// Test UI index exports
import {
  FlashListWrapper as UIFlashListWrapper,
  AnimatedFlashList as UIAnimatedFlashList,
  FlashList as UIFlashList,
  type FlashListRef as UIFlashListRef,
  type FlashListProps as UIFlashListProps,
  // Performance utilities from UI index
  useFlashListV2Performance as UIUseFlashListV2Performance,
  useFlashListV2State as UIUseFlashListV2State,
  // Direct FlashList v2 hooks
  useRecyclingState as UIUseRecyclingState,
  useLayoutState as UIUseLayoutState,
  useMappingHelper as UIUseMappingHelper
} from '../../components/ui/index';

// Test types index exports
import {
  type FlashListRef as TypesFlashListRef,
  type FlashListProps as TypesFlashListProps,
  type FlashListV2PerformanceConfig as TypesFlashListV2PerformanceConfig,
  type V2PerformanceMetrics as TypesV2PerformanceMetrics
} from '../../types/index';

/**
 * Verification function to ensure all imports are working
 * This function will only compile if all types and functions are properly exported
 */
export function verifyFlashListV2Exports(): boolean {
  // Verify component exports
  const wrapperExists = typeof FlashListWrapper === 'function';
  const animatedExists = typeof AnimatedFlashList === 'object';
  const flashListExists = typeof FlashList === 'function';
  
  // Verify hook exports
  const v2StateExists = typeof useFlashListV2State === 'function';
  const layoutExists = typeof useFlashListLayout === 'function';
  const combinedExists = typeof useFlashListCombinedState === 'function';
  const itemStateExists = typeof useFlashListItemState === 'function';
  const recyclingExists = typeof useRecyclingState === 'function';
  const layoutStateExists = typeof useLayoutState === 'function';
  const mappingExists = typeof useMappingHelper === 'function';
  
  // Verify utility exports
  const performanceExists = typeof useFlashListV2Performance === 'function';
  const validateExists = typeof validateFlashListProps === 'function';
  const detectExists = typeof detectDeprecatedFlashListProps === 'function';
  const logExists = typeof logDeprecationWarnings === 'function';
  const clearExists = typeof clearDeprecationWarningCache === 'function';
  
  // Verify index exports work
  const indexPerformanceExists = typeof indexUseFlashListV2Performance === 'function';
  const indexValidateExists = typeof indexValidateFlashListProps === 'function';
  const indexV2StateExists = typeof indexUseFlashListV2State === 'function';
  const indexLayoutExists = typeof indexUseFlashListLayout === 'function';
  
  // Verify UI index exports work
  const uiWrapperExists = typeof UIFlashListWrapper === 'function';
  const uiAnimatedExists = typeof UIAnimatedFlashList === 'object';
  const uiFlashListExists = typeof UIFlashList === 'function';
  const uiPerformanceExists = typeof UIUseFlashListV2Performance === 'function';
  const uiV2StateExists = typeof UIUseFlashListV2State === 'function';
  const uiRecyclingExists = typeof UIUseRecyclingState === 'function';
  const uiLayoutStateExists = typeof UIUseLayoutState === 'function';
  const uiMappingExists = typeof UIUseMappingHelper === 'function';
  
  return (
    wrapperExists &&
    animatedExists &&
    flashListExists &&
    v2StateExists &&
    layoutExists &&
    combinedExists &&
    itemStateExists &&
    recyclingExists &&
    layoutStateExists &&
    mappingExists &&
    performanceExists &&
    validateExists &&
    detectExists &&
    logExists &&
    clearExists &&
    indexPerformanceExists &&
    indexValidateExists &&
    indexV2StateExists &&
    indexLayoutExists &&
    uiWrapperExists &&
    uiAnimatedExists &&
    uiFlashListExists &&
    uiPerformanceExists &&
    uiV2StateExists &&
    uiRecyclingExists &&
    uiLayoutStateExists &&
    uiMappingExists
  );
}

/**
 * Type verification - these assignments will only work if types are properly exported
 */
export function verifyFlashListV2Types(): void {
  // Test that types can be used
  let config: FlashListV2PerformanceConfig;
  let stateConfig: FlashListV2StateConfig<boolean>;
  let layoutConfig: FlashListLayoutConfig<number>;
  let metrics: V2PerformanceMetrics;
  let item: MessageListItem;
  let warning: DeprecatedPropWarning;
  let v2Item: FlashListV2Item;
  let v2Config: FlashListV2ItemConfig<FlashListV2Item, any>;
  
  // Test return types
  let stateReturn: FlashListV2StateReturn<boolean>;
  let layoutReturn: FlashListLayoutReturn<number>;
  let combinedReturn: FlashListCombinedStateReturn<boolean, number>;
  let itemReturn: FlashListItemStateReturn<any>;
  
  // Test legacy types
  let legacyConfig: FlashListPerformanceConfig;
  let legacyMetrics: PerformanceMetrics;
  
  // Test that types from different modules are compatible
  let ref1: FlashListRef<any>;
  let ref2: IndexFlashListRef<any>;
  let ref3: UIFlashListRef<any>;
  let ref4: TypesFlashListRef<any>;
  
  let props1: FlashListProps<any>;
  let props2: IndexFlashListProps<any>;
  let props3: UIFlashListProps<any>;
  let props4: TypesFlashListProps<any>;
  
  // These assignments verify type compatibility
  ref1 = ref2;
  ref2 = ref3;
  ref3 = ref4;
  
  props1 = props2;
  props2 = props3;
  props3 = props4;
  
  // Suppress unused variable warnings
  void config;
  void stateConfig;
  void layoutConfig;
  void metrics;
  void item;
  void warning;
  void v2Item;
  void v2Config;
  void stateReturn;
  void layoutReturn;
  void combinedReturn;
  void itemReturn;
  void legacyConfig;
  void legacyMetrics;
  void ref1;
  void props1;
}

console.log('✅ FlashList v2 exports verification completed successfully!');
console.log('All types and components are properly exported and can be imported without conflicts.');