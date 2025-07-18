module.exports = {
  default: {},
  Value: function (val) { return { value: val }; },
  useSharedValue: (val) => ({ value: val }),
  useAnimatedStyle: () => ({}),
  withTiming: (val) => val,
  withSpring: (val) => val,
  withDelay: (delay, cb) => cb,
  cancelAnimation: () => {},
};
