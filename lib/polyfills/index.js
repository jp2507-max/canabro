/**
 * Centralized polyfills for React Native
 * This file organizes and manages all polyfills needed for Node.js compatibility
 */

// Import the polyfill manager - Updated for Expo 53
// Import only the **specific** polyfills we actually need instead of the
// blanket import from `react-native-polyfill-globals` (which drags in the
// `fetch` shim and its heavy `react-native-fetch-api` peer dependency that
// breaks `expo-notifications`).
import { polyfill as polyfillBase64 } from 'react-native-polyfill-globals/src/base64';
import { polyfill as polyfillEncoding } from 'react-native-polyfill-globals/src/encoding';
import { polyfill as polyfillReadableStream } from 'react-native-polyfill-globals/src/readable-stream';
import { polyfill as polyfillCrypto } from 'react-native-polyfill-globals/src/crypto';

// Import built-in or third-party polyfills
import 'react-native-url-polyfill/auto';
import netPolyfill from './net-polyfill.js';
import wsPolyfill from './ws-polyfill.js';

// Apply core polyfills first - excluding fetch polyfill to avoid expo-notifications blob errors
// Apply only safe polyfills.  **Do NOT** polyfill `fetch`, `Headers`, etc., as
// they clash with Expo's native networking stack and cause errors like
// "Invalid responseType: blob".
polyfillBase64();
polyfillEncoding();
polyfillReadableStream();
polyfillCrypto();
const { WebSocket: WebSocketShim, WebSocketServer: WebSocketServerShim } = wsPolyfill;

// Store WebSocket implementation for module aliasing
global.WebSocketShim = WebSocketShim;
global.WebSocketServerShim = WebSocketServerShim;

// Removed duplicate net implementation since we're using the dedicated net-polyfill.js module
// This ensures we have a single source of truth for net polyfills
// The net-polyfill.js module is imported at the top of the file

// Export specific shim classes that might be needed elsewhere
const exportedWebSocketShim = global.WebSocketShim || null;
const exportedWebSocketServerShim = global.WebSocketServerShim || null;

// Named exports for ES modules
export {
  exportedWebSocketShim as WebSocketShim,
  exportedWebSocketServerShim as WebSocketServerShim,
  netPolyfill,
};

// ESM default export to support: import WebSocket from 'ws'
export default exportedWebSocketShim;

// CommonJS interop for `require('ws')`
if (typeof module !== 'undefined') {
  module.exports = Object.assign(exportedWebSocketShim, {
    Server: exportedWebSocketServerShim,
    WebSocket: exportedWebSocketShim, // mimic upstream `ws` shape
  });
}

// Log that polyfills have been initialized
console.log('React Native polyfills initialized');
