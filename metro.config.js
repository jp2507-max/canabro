/**
 * Metro configuration for React Native and Expo
 * This file has been simplified to reduce maintenance overhead
 * 
 * ⛔️ DO NOT DELETE - Enables ws compatibility in React Native
 */
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');
const path = require('path');

// Get the default configuration
// eslint-disable-next-line no-undef
const config = getDefaultConfig(__dirname, {
  // Enable CSS support.
  isCSSEnabled: true,
});

// Ensure resolver and assetExts are initialized
config.resolver = config.resolver || {};
config.resolver.assetExts = config.resolver.assetExts || [];

// Define the necessary image extensions
const imageAssetExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];

// Create a Set from the default asset extensions for efficient duplicate checking
const assetExtsSet = new Set(config.resolver.assetExts);

// Add the image extensions to the Set
imageAssetExts.forEach((ext) => assetExtsSet.add(ext));

// Assign the updated array back to the config
config.resolver.assetExts = Array.from(assetExtsSet);

// Configure Node.js polyfills - now centralized in lib/polyfills/index.js
config.resolver.extraNodeModules = {
  // Core Node.js modules - using official polyfills where available
  events: path.resolve(__dirname, 'node_modules/events'),
  stream: path.resolve(__dirname, 'node_modules/stream-browserify'),
  path: path.resolve(__dirname, 'node_modules/path-browserify'),
  querystring: path.resolve(__dirname, 'node_modules/querystring-es3'),
  fs: path.resolve(__dirname, 'node_modules/react-native-fs'),
  crypto: path.resolve(__dirname, 'node_modules/react-native-crypto'),
  http: path.resolve(__dirname, 'node_modules/@tradle/react-native-http'),
  https: path.resolve(__dirname, 'node_modules/https-browserify'),
  os: path.resolve(__dirname, 'node_modules/os-browserify/browser'),
  tls: path.resolve(__dirname, 'node_modules/react-native-tcp'),
  zlib: path.resolve(__dirname, 'node_modules/browserify-zlib'),
  buffer: path.resolve(__dirname, 'node_modules/buffer'),
  url: path.resolve(__dirname, 'node_modules/url'),
  process: path.resolve(__dirname, 'node_modules/process/browser'),
  util: path.resolve(__dirname, 'node_modules/util'),
  
  // Dedicated polyfills for specific modules
  net: path.resolve(__dirname, 'lib/polyfills/net-polyfill.js'),
  'ws': path.resolve(__dirname, 'lib/polyfills/index.js'), // Provides proper default export for WebSocket
};

// Add specific module resolution priority
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Note: We're no longer using the custom transformer as our polyfill approach 
// is more maintainable and doesn't require runtime transformations

// Add specific aliases for ws package internals
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'cjs', 'mjs'];

// Apply the NativeWind wrapper to the modified configuration
module.exports = wrapWithReanimatedMetroConfig(withNativeWind(config, {
  input: './global.css',
  // Ensure we're using the right configuration for NativeWind 4.x
  configPath: './tailwind.config.js',
}));
