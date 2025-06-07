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

import 'expo-router/entry';
// Enable screens after gesture handler but before other components
enableScreens();
