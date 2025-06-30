/**
 * Main entry point for the app
 *
 * Load polyfills first, then initialize React Native
 */

// Import polyfills first - MUST be before any other imports
import './lib/polyfills/index.js';

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
