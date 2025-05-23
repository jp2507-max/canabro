# Node.js Polyfills for React Native

This directory contains polyfills and shims needed to run Node.js modules in a React Native environment.

## Why We Need This

React Native doesn't include Node.js standard libraries, but several dependencies (including Supabase and other packages) try to use them. This issue became more pronounced with Expo SDK 53 and React Native 0.79+.

## Our Approach

We've implemented a centralized polyfill solution that:

1. Uses `react-native-polyfill-globals` for consistent polyfill management
2. Centralizes all custom polyfills in a single `index.js` file
3. Uses proper module aliasing in Metro config
4. Simplifies maintenance across React Native and Expo updates

## When to Update/Remove This

You should revisit this solution when:

- Upgrading React Native or Expo to a major version
- `ws` package releases version 9.x+ with better React Native support
- Supabase or other dependencies update their WebSocket implementation

## Adding New Polyfills

If you need to add more polyfills:

1. Add them to `index.js` in this directory
2. Update the Metro config if necessary for module resolution
3. Use `patch-package` for complex fixes to node_modules

## References

- [Expo docs on using libraries](https://docs.expo.dev/workflow/using-libraries/)
- [Supabase Issue #1400](https://github.com/supabase/supabase-js/issues/1400)
- [React Native Compatibility](https://reactnative.dev/docs/libraries)
