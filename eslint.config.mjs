import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactNative from "eslint-plugin-react-native";

export default [
  // Base JavaScript configuration
  js.configs.recommended,
  
  // TypeScript configuration
  ...tseslint.configs.recommended,
  
  // React configuration
  pluginReact.configs.flat.recommended,
  
  // Files and language options
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: {
      // React Native + Expo globals
      globals: {
        ...globals.node,
        ...globals.es2021,
        // React Native specific globals
        __DEV__: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        process: "readonly",
        Buffer: "readonly",
        global: "readonly",
        console: "readonly",
        // Metro bundler globals
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        // Expo globals
        expo: "readonly",
      },
      ecmaVersion: 2021,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "react-native": pluginReactNative,
    },
    rules: {
      // React Native specific rules - optimized for NativeWind v4 + Reanimated v3
      "react-native/no-unused-styles": "error",
      "react-native/split-platform-components": "error",
      "react-native/no-inline-styles": "off", // NativeWind + Platform-specific styles need this
      "react-native/no-color-literals": "off", // Platform-specific theming needs color literals
      "react-native/no-raw-text": "off", // Temporarily disabled to reduce lint noise; re-enable after components wrap text correctly
      "react-native/sort-styles": "off", // Not relevant with NativeWind classes
      
      // React 19 optimized rules
      "react/react-in-jsx-scope": "off", // Not needed with React 17+
      "react/prop-types": "off", // Using TypeScript for validation
      "react/display-name": "off", // Not needed for functional components
      "react/no-deprecated": "error",
      "react/jsx-no-target-blank": ["error", { allowReferrer: false }],
      "react/no-unescaped-entities": "off", // Disabled for React Native project
      "react/jsx-no-literals": "off", // Allow string literals in JSX (needed for React Native Text)
      "react/no-children-prop": "error", // Prevent children prop misuse that can cause text issues
      
      // TypeScript rules optimized for React Native + Expo
      "@typescript-eslint/no-unused-vars": ["warn", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-var-requires": "off", // Needed for Metro/Expo configs
      "@typescript-eslint/no-require-imports": "off", // Needed for polyfills and Metro
      "@typescript-eslint/ban-ts-comment": ["error", {
        "ts-expect-error": "allow-with-description",
        "ts-ignore": "allow-with-description",
        "ts-nocheck": "allow-with-description"
      }],
      "@typescript-eslint/no-empty-object-type": "warn", // Warn instead of error
      
      // Performance and development rules
      "prefer-const": "error",
      "no-console": "off", // Allow all console methods during development
      "no-useless-catch": "warn", // Warn instead of error
      // Prevent re-introducing deprecated KeyboardSpacer component
      "no-restricted-imports": ["error", {
        "paths": [
          { "name": "components/ui/KeyboardSpacer", "message": "KeyboardSpacer is deprecated; use FormKeyboardWrapper instead." },
          { "name": "../ui/KeyboardSpacer", "message": "KeyboardSpacer is deprecated; use FormKeyboardWrapper instead." },
          { "name": "@/components/ui/KeyboardSpacer", "message": "KeyboardSpacer is deprecated; use FormKeyboardWrapper instead." }
        ],
        "patterns": ["*KeyboardSpacer*"]
      }],
    },
    settings: {
      react: {
        version: "detect",
      },
      "react-native/style-sheet-object-names": [
        "StyleSheet",
        "styles",
        "style",
      ],
    },
  },
  
  
  // Custom Text component rules - conditional handling for ThemedText
  {
    files: [
      "**/components/ui/ThemedText.tsx", // The component itself
      "**/components/**/*Segmented*.{ts,tsx}", // Known components using ThemedText extensively
      "**/components/**/*Modal*.{ts,tsx}",
      "**/components/**/*PostControl*.{ts,tsx}",
      "**/screens/**/*.{ts,tsx}" // Screens commonly use ThemedText
    ],
    rules: {
      "react-native/no-raw-text": "off", // Allow raw text in components that extensively use ThemedText
    },
  },

  // Reanimated worklet specific rules
  {
    files: ["**/*worklet*.{ts,tsx}", "**/*animation*.{ts,tsx}", "**/lib/animations/**/*.{ts,tsx}"],
    rules: {
      "prefer-const": "off", // Worklets often need let for animated values
      "no-unused-expressions": "off", // Required for Reanimated worklets
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-explicit-any": "off", // Worklet contexts can be complex
      "func-style": "off", // Allow function declarations in worklets
    },
  },

  // Configuration and polyfill files
  {
    files: [
      "*.config.{js,mjs,ts}", 
      "scripts/**/*.{js,mjs,ts}",
      "**/polyfills/**/*.{js,ts}",
      "metro.transformer.js",
      "babel.config.js"
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off", // Config files need require()
      "@typescript-eslint/no-var-requires": "off",
      "no-console": "off", // Allow console in config files
    },
  },

  // Development and debug files - more lenient rules
  {
    files: [
      "**/*debug*.{ts,tsx}",
      "**/*test*.{ts,tsx}",
      "**/*dev*.{ts,tsx}",
      "**/components/**/*Debug*.{ts,tsx}",
      "**/components/**/*Test*.{ts,tsx}"
    ],
    rules: {
      "no-console": "off", // Allow all console methods in debug files
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // Production-ready stricter rules for core lib files
  {
    files: ["**/lib/services/**/*.{ts,tsx}", "**/lib/utils/**/*.{ts,tsx}"],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }], // Only warn/error in production services
      "@typescript-eslint/no-explicit-any": "error", // Stricter in core services
    },
  },
  
  
  // Ignore patterns
  {
    ignores: [
      "node_modules/**",
      ".expo/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "**/*.d.ts",
      "ios/**",
      "android/**",
      "web-build/**",
    ],
  },
];
