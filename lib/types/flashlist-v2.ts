/**
 * FlashList v2 shared type definitions
 *
 * Centralizes interfaces and type aliases used by FlashList v2 hooks and utils
 * to avoid duplication and drift across the codebase.
 */

// Core FlashList v2 config types
export interface FlashListV2StateConfig<T> {
  initialState: T;
  dependencies?: unknown[];
  resetCallback?: () => void;
  debug?: boolean;
}

export interface FlashListLayoutConfig<T> {
  initialState: T;
  debug?: boolean;
}

// Hook return type aliases
export type FlashListV2StateReturn<T> = [
  T,
  (value: T | ((prevState: T) => T)) => void
];

export type FlashListLayoutReturn<T> = [
  T,
  (value: T | ((prevState: T) => T)) => void
];

export type FlashListCombinedStateReturn<TRecycling, TLayout> = {
  recycling: FlashListV2StateReturn<TRecycling>;
  layout: FlashListLayoutReturn<TLayout>;
};

export type FlashListItemStateReturn<TState> = [
  TState,
  (value: TState | ((prevState: TState) => TState)) => void,
  () => void
];

// Item shapes
export interface FlashListV2Item {
  id: string;
  [key: string]: unknown;
}

export interface FlashListV2ItemConfig<TItem extends FlashListV2Item, TState> {
  item: TItem;
  initialStateFactory: (item: TItem) => TState;
  options?: {
    debug?: boolean;
    resetCallback?: () => void;
    customDependencies?: readonly unknown[];
  };
}


