/**
 * Global type definitions for React Native environment
 * Resolves conflicts between DOM and React Native globals
 */

// Exclude DOM lib to prevent conflicts with React Native globals
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />

// React Native environment globals
declare global {
  var __DEV__: boolean;
  var __METRO_GLOBAL_PREFIX__: string;
  var ErrorUtils: {
    reportFatalError: (error: Error) => void;
    setGlobalHandler: (callback: (error: Error, isFatal?: boolean) => void) => void;
    getGlobalHandler: () => ((error: Error, isFatal?: boolean) => void) | null;
  };

  // Prevent DOM types from conflicting with React Native
  interface Window {}
  interface Document {}
  interface Element {}
  interface HTMLElement {}
}

// React Native specific module declarations
declare module 'react-native' {
  // Re-export common types to prevent conflicts
  export interface ViewStyle {}
  export interface TextStyle {}
  export interface ImageStyle {}
}

// Expo environment declarations
declare module 'expo-constants' {
  export interface Constants {
    expoConfig?: {
      extra?: Record<string, any>;
    };
  }
}

export {};
