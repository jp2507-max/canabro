import React from 'react';

// Create simple deterministic functions that are jest.fn when available
const createMockFunction =
  typeof jest !== 'undefined' && typeof jest.fn === 'function'
    ? () => jest.fn()
    : () => {
        const noop = () => undefined;
        return noop;
      };

export const useRouter = () => ({
  push: createMockFunction(),
  replace: createMockFunction(),
  back: createMockFunction(),
  prefetch: createMockFunction(),
});

export const useLocalSearchParams = () => ({});
export const useSearchParams = () => ({});

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

export const Redirect = () => null;
export const Href = () => null;

const defaultExport = {
  useRouter,
  Link,
  useLocalSearchParams,
  useSearchParams,
  Stack,
  Tabs,
  Redirect,
  Href,
};

export default defaultExport;

