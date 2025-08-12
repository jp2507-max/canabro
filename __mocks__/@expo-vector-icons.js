// Generalized Jest mock for @expo/vector-icons
// Returns a no-op React component for any icon family via Proxy.
// Works with both default and named imports in tests.
const NoopIcon = () => null;
const icons = new Proxy({}, {
  get: () => NoopIcon,
});

// CommonJS export for Jest/Node resolution
module.exports = icons;
// Keep default export for ESM/Babel interop and existing imports
module.exports.default = icons;
