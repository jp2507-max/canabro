module.exports = function (api) {
  api.cache(true);
  const plugins = [
    ['@babel/plugin-proposal-decorators', { legacy: true }]
  ];

  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins,
  };
};
