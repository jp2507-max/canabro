/**
 * Main entry point for the app
 *
 * Load polyfills first, then initialize React Native
 */

// Import polyfills first - MUST be before any other imports
import './lib/polyfills/index.js';

import { LogBox } from 'react-native';

// The Tab navigator can momentarily mount outside a NavigationContainer
// during hot-reload. Ignore that dev-only warning; real errors
// (anything else) still surface normally.
LogBox.ignoreLogs([
  "Couldn't find a navigation context. Have you wrapped your app with 'NavigationContainer'?",
]);

// ⬇️ ADD GLOBAL ERROR HANDLER
// Use built-in React Native global error handler instead of external dependency
if (typeof global.ErrorUtils !== 'undefined' && global.ErrorUtils?.setGlobalHandler) {
  const defaultHandler = global.ErrorUtils.getGlobalHandler?.();

  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (error?.message?.includes('navigation context') || error?.message?.includes('NavigationContainer')) {
      // Suppress noisy development-only navigation context errors that are retried by NavigationErrorBoundary
      if (__DEV__) {
        console.warn('[GlobalHandler] Suppressed transient navigation context error');
      }
      return; // Prevent red box
    }

    console.error('[GLOBAL-JS-ERROR]', error?.message, '\n', error?.stack, { isFatal });

    // Fall back to the default RN handler after custom logging
    defaultHandler?.(error, isFatal);
  });
}
// ⬆️ END GLOBAL ERROR HANDLER

// Import gesture handler before other React Native components
import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';

import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';

// Configure Reanimated logger BEFORE the router is imported
if (process.env.NODE_ENV !== 'production') {
  // Emit detailed Reanimated logs + accurate JS stack traces during development.
  if (__DEV__) {
    // v3 – simple global flag recognised by Reanimated
    global.REANIMATED_LOGS = true;
  }
  configureReanimatedLogger({ level: ReanimatedLogLevel.error, strict: true })
  if (__DEV__) {
    // Surface every strict-mode event in Metro so we can see the exact file/line
    import('react-native-reanimated')
      .then(() => {
        // Hack: tell Reanimated to pipe all warnings to console.error → Metro
        global.__reanimatedModuleProxy = { push: console.error };
      })
      .catch((err) => {
        console.error('[index] Failed to init Reanimated strict-mode logger:', err);
      });
  }
}

// Enable screens after gesture handler but before other components
enableScreens();

import 'expo-router/entry';
