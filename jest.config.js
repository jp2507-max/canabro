

module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^expo-haptics$': '<rootDir>/__mocks__/expo-haptics.js',
    '^react-native-reanimated$': '<rootDir>/__mocks__/react-native-reanimated.js',
    '^@/lib/utils/haptics$': '<rootDir>/__mocks__/haptics.js',
    '^@/lib/database$': '<rootDir>/lib/database/database.ts',
    '^expo-blur$': '<rootDir>/__mocks__/expo-blur.js',
    '^expo-image$': '<rootDir>/__mocks__/expo-image.js',
    '^@expo/vector-icons$': '<rootDir>/__mocks__/@expo-vector-icons.js',
    '^react-native-gesture-handler$': '<rootDir>/__mocks__/react-native-gesture-handler.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/async-storage.js',
    '^expo-router$': '<rootDir>/__mocks__/expo-router.js'
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'babel-jest',
    '^.+\\.(js|jsx|mjs)$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|@react-navigation|nativewind|@shopify/flash-list|expo|expo-.+|@expo|@nozbe|@tanstack|@testing-library|react-native-reanimated|react-native-css-interop)/)'
  ],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect']
};
