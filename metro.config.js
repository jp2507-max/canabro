/**
 * Metro configuration for React Native and Expo
 * Optimized for iOS production builds with bundle size reduction
 *
 * ⛔️ DO NOT DELETE - Enables ws compatibility in React Native
 * @environment node
 */

/* eslint-env node */
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');

// After header comments, set experimental tree-shaking env vars only for production
if (process.env.NODE_ENV === 'production') {
  process.env.EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH = process.env.EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH || '1';
  process.env.EXPO_UNSTABLE_TREE_SHAKING = process.env.EXPO_UNSTABLE_TREE_SHAKING || '1';
}

// Get the default configuration
 
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

// Disable experimental package.exports resolution to avoid third-party polyfills (e.g. react-native-fetch-api)
// from slipping into the bundle and conflicting with Expo's networking stack.
config.resolver.unstable_enablePackageExports = false;

// Configure Node.js polyfills - now centralized in lib/polyfills/index.js
config.resolver.extraNodeModules = {
  // Core Node.js modules - using official polyfills where available
  events: path.resolve(__dirname, 'node_modules/events'),
  stream: path.resolve(__dirname, 'node_modules/stream-browserify'),
  path: path.resolve(__dirname, 'node_modules/path-browserify'),
  querystring: path.resolve(__dirname, 'node_modules/querystring-es3'),
  // Use Expo's built-in file system instead of react-native-fs
  fs: false, // Disable fs polyfill - use expo-file-system instead
  // Use expo-crypto instead of react-native-crypto
  crypto: false, // Disable crypto polyfill - use expo-crypto instead
  // Removed custom "http" polyfill because it overrides Expo's built-in networking APIs and breaks
  // expo-notifications with errors like "Invalid responseType: blob" and "blobId undefined".
  // If you still need Node's http in rare cases, install a pure JS replacement like "stream-http"
  // and alias it here instead, but avoid any implementation that monkey-patches XMLHttpRequest.
  // http: path.resolve(__dirname, 'node_modules/@tradle/react-native-http'),
  https: path.resolve(__dirname, 'node_modules/https-browserify'),
  os: path.resolve(__dirname, 'node_modules/os-browserify/browser'),
  // Disable TLS/TCP polyfills - not needed for mobile apps
  tls: false, // Disable tls polyfill - not supported in React Native
  net: path.resolve(__dirname, 'lib/polyfills/net-polyfill.js'),
  zlib: path.resolve(__dirname, 'node_modules/browserify-zlib'),
  buffer: path.resolve(__dirname, 'node_modules/buffer'),
  url: path.resolve(__dirname, 'node_modules/url'),
  process: path.resolve(__dirname, 'node_modules/process/browser'),
  util: path.resolve(__dirname, 'node_modules/util'),

  // Dedicated polyfills for specific modules
  ws: path.resolve(__dirname, 'lib/polyfills/ws-polyfill.js'), // Provides proper WebSocket polyfill
};

// Add specific module resolution priority
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// iOS Bundle size optimization settings
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'cjs', 'mjs'];

// Configure transformer optimizations for better performance
config.transformer = {
  ...config.transformer,
  // Enable experimental import support and inline requires for better bundle optimization
  experimentalImportSupport: true,
  inlineRequires: true,
  // Enable eager loading to reduce bundle splits
  unstable_allowRequireContext: true,
};

// Additional minifier settings only for production builds
if (process.env.NODE_ENV === 'production') {
  config.transformer = {
    ...config.transformer,
    minifierConfig: {
      mangle: {
        keep_fnames: false,
      },
      output: {
        comments: false,
      },
      compress: {
        drop_console: true,
        reduce_vars: true,
        dead_code: true,
      },
    },
  };
}

// Bundle splitting configuration for better caching
config.serializer = {
  ...config.serializer,
  customSerializer: config.serializer?.customSerializer,
};

// Apply the NativeWind wrapper to the modified configuration
module.exports = wrapWithReanimatedMetroConfig(
  withNativeWind(config, {
    input: './global.css',
  })
);
