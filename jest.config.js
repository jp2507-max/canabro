

module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^expo-haptics$': '<rootDir>/__mocks__/expo-haptics.js',
    '^react-native-reanimated$': '<rootDir>/__mocks__/react-native-reanimated.js',
    '^@/lib/utils/haptics$': '<rootDir>/__mocks__/haptics.js',
  },
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.js$': 'babel-jest',
    '^.+\\.jsx$': 'babel-jest',
    '^.+\\.mjs$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|@react-navigation|nativewind|@shopify/flash-list|expo|@expo|@nozbe|@tanstack|@testing-library|react-native-reanimated)/)'
  ],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  // ...existing code...
};
