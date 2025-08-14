import React from 'react';

// Create simple deterministic functions that are jest.fn when available
const createMockFunction =
  typeof jest !== 'undefined' && typeof jest.fn === 'function'
    ? () => jest.fn()
    : () => {
        const noop = () => undefined;
        return noop;
      };

// New aggregated router object to mirror expo-router's named export.
// Important: create shared mock functions so tests can reliably spy on them.
export const router = {
  push: createMockFunction(),
  replace: createMockFunction(),
  back: createMockFunction(),
  prefetch: createMockFunction(),
  // Added common APIs to align with router usage in code/tests
  setParams: createMockFunction(),
  canGoBack: createMockFunction(),
};

// Return the shared router instance (not fresh functions each call)
export const useRouter = () => router;

export const useLocalSearchParams = () => ({});
export const useSearchParams = () => ({});
export const useGlobalSearchParams = () => ({});

export const Link = React.forwardRef(function Link(props, ref) {
  const { children, ...rest } = props || {};
  if (React.isValidElement(children)) {
    return React.cloneElement(children, { ref, ...rest });
  }
  return React.createElement(React.Fragment, null, children);
});

export const Stack = ({ children }) => React.createElement(React.Fragment, null, children);
Stack.Screen = () => null;

export const Tabs = ({ children }) => React.createElement(React.Fragment, null, children);
Tabs.Screen = () => null;

export const Slot = ({ children }) => React.createElement(React.Fragment, null, children);

export const Redirect = () => null;
export const Href = () => null;

const defaultExport = {
  useRouter,
  router,
  Link,
  useLocalSearchParams,
  useSearchParams,
  useGlobalSearchParams,
  Stack,
  Tabs,
  Slot,
  Redirect,
  Href,
};

export default defaultExport;

