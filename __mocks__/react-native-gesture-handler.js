// Jest mock for react-native-gesture-handler providing modern Gesture API stubs
// and legacy component/enums to avoid runtime errors in tests.

const createNoop = () => {};

function createChainableGesture() {
  const chainable = {};

  const methodNames = [
    // Common lifecycle callbacks
    'onStart',
    'onUpdate',
    'onEnd',
    'onBegin',
    'onFinalize',
    // Common configuration methods
    'enabled',
    'minDistance',
    'minPointers',
    'maxPointers',
    'withRef',
    'activeOffset',
    'failOffset',
    'hitSlop',
    'requireExternalGestureRecognizer',
    'requireExternalGestureRecognizerToFail',
    'simultaneousWithExternalGesture',
    'shouldCancelWhenOutside',
  ];

  methodNames.forEach((name) => {
    chainable[name] = () => chainable;
  });

  chainable.run = createNoop;
  chainable.build = () => chainable;

  // Be very permissive: any unknown method should be chainable as well
  const proxy = new Proxy(chainable, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'toString') return () => '[GestureStub]';
      // Return a chainable no-op function for any other property access
      return () => proxy;
    },
  });

  return proxy;
}

const gestureFactory = () => createChainableGesture();

export const Gesture = {
  // Modern API creators
  Pan: gestureFactory,
  Tap: gestureFactory,
  LongPress: gestureFactory,
  Fling: gestureFactory,
  Pinch: gestureFactory,
  Rotation: gestureFactory,
  // Combinators
  Race: () => createChainableGesture(),
  Simultaneous: () => createChainableGesture(),
  Exclusive: () => createChainableGesture(),
};

export const GestureDetector = ({ children, ..._props }) => children || null;

// Legacy/compat components and helpers (no-op wrappers)
const NoopWrapper = ({ children }) => children || null;

export const PanGestureHandler = NoopWrapper;
export const TapGestureHandler = NoopWrapper;
export const LongPressGestureHandler = NoopWrapper;
export const FlingGestureHandler = NoopWrapper;
export const NativeViewGestureHandler = NoopWrapper;
export const GestureHandlerRootView = NoopWrapper;

export const State = {
  UNDETERMINED: 0,
  BEGAN: 1,
  ACTIVE: 2,
  END: 3,
  FAILED: 4,
  CANCELLED: 5,
};

export const Directions = {
  RIGHT: 'RIGHT',
  LEFT: 'LEFT',
  UP: 'UP',
  DOWN: 'DOWN',
};

export const gestureHandlerRootHOC = (Component) => Component;
export const createNativeWrapper = (Component) => Component;

const defaultExport = {
  Gesture,
  GestureDetector,
  PanGestureHandler,
  TapGestureHandler,
  LongPressGestureHandler,
  FlingGestureHandler,
  NativeViewGestureHandler,
  GestureHandlerRootView,
  State,
  Directions,
  gestureHandlerRootHOC,
  createNativeWrapper,
};

export default defaultExport;

