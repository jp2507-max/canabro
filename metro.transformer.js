/**
 * DEPRECATED - This file is no longer actively used with the new polyfill approach
 * But is kept as a reference for future troubleshooting or if there are specific 
 * files that might require transformations.
 * 
 * The new polyfill approach uses a centralized polyfill file and package-level
 * patching instead of runtime transformations.
 */
const metroTransformer = require('metro-react-native-babel-transformer');

// Default transformer for all files
module.exports.transform = function ({ src, filename, options }) {
  // Just use the standard transformer
  return metroTransformer.transform({ src, filename, options });
};
