const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

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

// Apply the NativeWind wrapper to the modified configuration
module.exports = withNativeWind(config, {
  input: './global.css',
  // Ensure we're using the right configuration for NativeWind 4.x
  configPath: './tailwind.config.js',
});
