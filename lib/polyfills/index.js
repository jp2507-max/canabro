/**
 * Centralized polyfills for React Native
 * This file organizes and manages all polyfills needed for Node.js compatibility
 */

// Import the polyfill manager - Updated for Expo 53
import polyfillGlobals from 'react-native-polyfill-globals';

// Import built-in or third-party polyfills
import 'react-native-url-polyfill/auto';
import netPolyfill from './net-polyfill.js';
import wsPolyfill from './ws-polyfill.js';

// Apply core polyfills first
polyfillGlobals();
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
