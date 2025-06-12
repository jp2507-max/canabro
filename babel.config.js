module.exports = function (api) {
  api.cache(true);

  const plugins = [
    // This plugin should be placed before 'react-native-reanimated/plugin'
  ];

  if (process.env.NODE_ENV === 'production') {
    plugins.push('transform-remove-console');
  }

  // Add reanimated plugin last
  plugins.push('react-native-reanimated/plugin');

  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins,
  };
};
