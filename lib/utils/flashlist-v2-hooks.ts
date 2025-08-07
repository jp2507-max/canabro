/**
 * FlashList v2 Hook Wrappers
 * 
 * This module provides wrapper hooks around FlashList v2's useRecyclingState and useLayoutState
 * to provide a consistent API and additional functionality for state management in recycled components.
 * 
 * @example
 * ```tsx
 * import { 
 *   useFlashListV2State, 
 *   useFlashListLayout, 
 *   useFlashListCombinedState,
 *   useFlashListItemState,
 *   type FlashListV2StateConfig,
 *   type FlashListLayoutConfig
 * } from '@/lib/utils/flashlist-v2-hooks';
 * ```
 */

import { useRecyclingState, useLayoutState, useMappingHelper } from '@shopify/flash-list';
import { useCallback, useRef } from 'react';

// Re-export FlashList v2 hooks for convenience
export { useRecyclingState, useLayoutState, useMappingHelper } from '@shopify/flash-list';

/**
 * Configuration options for FlashList v2 state hooks
 */
export interface FlashListV2StateConfig<T> {
  /** Initial state value */
  initialState: T;
  /** Dependencies array for state reset */
  dependencies?: any[];
  /** Callback executed when state is reset */
  resetCallback?: () => void;
  /** Enable debug logging for state changes */
  debug?: boolean;
}

/**
 * Hook wrapper around useRecyclingState with enhanced functionality
 * 
 * This hook extends FlashList's useRecyclingState by providing:
 * - Consistent API with configuration object
 * - Optional debug logging
 * - Enhanced TypeScript types
 * - Dependency tracking with reset callbacks
 * 
 * @param config Configuration object for the hook
 * @returns Tuple of [state, setState] similar to useState
 * 
 * @example
 * ```tsx
 * const [isExpanded, setIsExpanded] = useFlashListV2State({
 *   initialState: false,
 *   dependencies: [item.id],
 *   resetCallback: () => console.log('State reset for new item'),
 *   debug: __DEV__
 * });
 * ```
 */
export function useFlashListV2State<T>(
  config: FlashListV2StateConfig<T>
): [T, (value: T | ((prevState: T) => T)) => void] {
  const { initialState, dependencies = [], resetCallback, debug = false } = config;
  
  const debugRef = useRef(debug);
  debugRef.current = debug;
  
  // Enhanced reset callback with optional debugging
  const enhancedResetCallback = useCallback(() => {
    if (debugRef.current) {
      console.log('[FlashListV2State] State reset triggered', {
        dependencies,
        timestamp: new Date().toISOString()
      });
    }
    resetCallback?.();
  }, [resetCallback, dependencies]);
  
  // Use FlashList's useRecyclingState with enhanced callback
  const [state, setState] = useRecyclingState(
    initialState,
    dependencies,
    enhancedResetCallback
  );
  
  // Enhanced setState with optional debugging
  const enhancedSetState = useCallback((value: T | ((prevState: T) => T)) => {
    if (debugRef.current) {
      const newValue = typeof value === 'function' ? 'function' : value;
      console.log('[FlashListV2State] State update', {
        newValue,
        dependencies,
        timestamp: new Date().toISOString()
      });
    }
    setState(value);
  }, [setState, dependencies]);
  
  return [state, enhancedSetState];
}

/**
 * Configuration options for FlashList layout state hook
 */
export interface FlashListLayoutConfig<T> {
  /** Initial state value */
  initialState: T;
  /** Enable debug logging for layout changes */
  debug?: boolean;
}

/**
 * Hook wrapper around useLayoutState with enhanced functionality
 * 
 * This hook extends FlashList's useLayoutState by providing:
 * - Consistent API with configuration object
 * - Optional debug logging
 * - Enhanced TypeScript types
 * - Direct communication with FlashList for layout updates
 * 
 * @param config Configuration object for the hook
 * @returns Tuple of [state, setState] that communicates with FlashList
 * 
 * @example
 * ```tsx
 * const [isExpanded, setIsExpanded] = useFlashListLayout({
 *   initialState: false,
 *   debug: __DEV__
 * });
 * 
 * // When state changes, FlashList is automatically notified for layout updates
 * const handlePress = () => setIsExpanded(!isExpanded);
 * ```
 */
export function useFlashListLayout<T>(
  config: FlashListLayoutConfig<T>
): [T, (value: T | ((prevState: T) => T)) => void] {
  const { initialState, debug = false } = config;
  
  const debugRef = useRef(debug);
  debugRef.current = debug;
  
  // Use FlashList's useLayoutState
  const [state, setState] = useLayoutState(initialState);
  
  // Enhanced setState with optional debugging
  const enhancedSetState = useCallback((value: T | ((prevState: T) => T)) => {
    if (debugRef.current) {
      const newValue = typeof value === 'function' ? 'function' : value;
      console.log('[FlashListLayout] Layout state update', {
        newValue,
        timestamp: new Date().toISOString()
      });
    }
    setState(value);
  }, [setState]);
  
  return [state, enhancedSetState];
}

/**
 * Combined hook that provides both recycling and layout state management
 * 
 * This hook combines the functionality of both useFlashListV2State and useFlashListLayout
 * for components that need both recycling-aware state and layout communication.
 * 
 * @param recyclingConfig Configuration for recycling state
 * @param layoutConfig Configuration for layout state
 * @returns Object with both recycling and layout state management
 * 
 * @example
 * ```tsx
 * const { recycling, layout } = useFlashListCombinedState(
 *   {
 *     initialState: { expanded: false, selected: false },
 *     dependencies: [item.id],
 *     resetCallback: () => console.log('Item recycled')
 *   },
 *   {
 *     initialState: 100, // height
 *     debug: __DEV__
 *   }
 * );
 * 
 * const [itemState, setItemState] = recycling;
 * const [height, setHeight] = layout;
 * ```
 */
export function useFlashListCombinedState<TRecycling, TLayout>(
  recyclingConfig: FlashListV2StateConfig<TRecycling>,
  layoutConfig: FlashListLayoutConfig<TLayout>
) {
  const recycling = useFlashListV2State(recyclingConfig);
  const layout = useFlashListLayout(layoutConfig);
  
  return {
    recycling,
    layout
  };
}

/**
 * Utility hook for managing complex item state with automatic dependency tracking
 * 
 * This hook automatically tracks common item properties (id, version, updatedAt)
 * and provides a convenient way to manage complex state objects.
 * 
 * @param item The item object from FlashList
 * @param initialState Initial state factory function
 * @param options Additional configuration options
 * @returns State management tuple with enhanced functionality
 * 
 * @example
 * ```tsx
 * const [itemState, setItemState, resetState] = useFlashListItemState(
 *   item,
 *   (item) => ({
 *     expanded: item.defaultExpanded || false,
 *     selected: false,
 *     loading: false
 *   }),
 *   {
 *     debug: __DEV__,
 *     resetCallback: () => console.log('Item state reset')
 *   }
 * );
 * ```
 */
export function useFlashListItemState<TItem extends Record<string, any>, TState>(
  item: TItem,
  initialStateFactory: (item: TItem) => TState,
  options: {
    debug?: boolean;
    resetCallback?: () => void;
    customDependencies?: any[];
  } = {}
): [TState, (value: TState | ((prevState: TState) => TState)) => void, () => void] {
  const { debug = false, resetCallback, customDependencies = [] } = options;
  
  // Automatically track common item properties
  const dependencies = [
    item.id,
    item.version,
    item.updatedAt,
    item.lastModified,
    ...customDependencies
  ].filter(dep => dep !== undefined);
  
  const [state, setState] = useFlashListV2State({
    initialState: initialStateFactory(item),
    dependencies,
    resetCallback,
    debug
  });
  
  // Provide a manual reset function
  const resetState = useCallback(() => {
    setState(initialStateFactory(item));
  }, [setState, initialStateFactory, item]);
  
  return [state, setState, resetState];
}

/**
 * Type definitions for hook return values and configurations
 */
export type FlashListV2StateReturn<T> = [T, (value: T | ((prevState: T) => T)) => void];
export type FlashListLayoutReturn<T> = [T, (value: T | ((prevState: T) => T)) => void];
export type FlashListCombinedStateReturn<TRecycling, TLayout> = {
  recycling: FlashListV2StateReturn<TRecycling>;
  layout: FlashListLayoutReturn<TLayout>;
};
export type FlashListItemStateReturn<TState> = [
  TState,
  (value: TState | ((prevState: TState) => TState)) => void,
  () => void
];

// Configuration interfaces are already exported above, no need to re-export

/**
 * Utility type for FlashList v2 item with enhanced metadata
 */
export interface FlashListV2Item {
  id: string;
  [key: string]: unknown;
}

/**
 * Enhanced item state configuration for complex use cases
 */
export interface FlashListV2ItemConfig<TItem extends FlashListV2Item, TState> {
  item: TItem;
  initialStateFactory: (item: TItem) => TState;
  options?: {
    debug?: boolean;
    resetCallback?: () => void;
    customDependencies?: any[];
  };
}