/**
 * Centralized polyfills for React Native
 * This file organizes and manages all polyfills needed for Node.js compatibility
 */

// Import built-in or third-party polyfills
import 'react-native-url-polyfill/auto';

// Import individual polyfills that are compatible with current versions
import 'react-native-get-random-values';
import { decode as atob, encode as btoa } from 'base-64';

// Use explicit path because Metro (RN 0.79) doesn’t yet resolve the "default" condition in the package‘s exports map
// See: https://github.com/facebook/metro/issues/725 – Metro only supports "browser", "react-native", "import", and "require" fields.
// The "web-streams-polyfill" package exposes its polyfill via the "default" condition, which Metro fails to recognise.
// Pointing directly at the dist file sidesteps this limitation.
import 'web-streams-polyfill/dist/polyfill.js';

// Polyfill base64 functions
global.atob = global.atob || atob;
global.btoa = global.btoa || btoa;

// Text encoding polyfills
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('text-encoding');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Debug log to confirm polyfills are loaded
if (__DEV__) {
  console.log('[Polyfills] Loaded: URL, crypto, base64, text-encoding, web-streams');
  console.log('[Polyfills] Note: net and ws polyfills are loaded via Metro config aliases');
}
