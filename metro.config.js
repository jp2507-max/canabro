const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// eslint-disable-next-line no-undef
const config = getDefaultConfig(__dirname, {
  // Additional configuration options if needed
});

module.exports = withNativeWind(config, {
  input: './global.css',
  // Ensure we're using the right configuration for NativeWind 4.x
  configPath: './tailwind.config.js',
});
