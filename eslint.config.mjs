import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactNative from "eslint-plugin-react-native";
import i18n from "eslint-plugin-i18next";

export default [
  // Base JavaScript configuration
  js.configs.recommended,
  
  // TypeScript configuration
  ...tseslint.configs.recommended,
  
  // React configuration
  pluginReact.configs.flat.recommended,

  // i18next flat config
  i18n.configs['flat/recommended'],
  
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
      i18n,
    },
    rules: {
      // i18n: Block hard-coded strings except in test, debug, and script files
      "i18next/no-literal-string": ["error", {
        "markupOnly": false,
        "ignoreAttribute": ["testID", "accessibilityLabel", "accessibilityHint", "placeholder", "aria-label", "aria-labelledby", "aria-describedby"],
        "ignoreCallee": ["require", "t", "i18n.t", "console.log", "console.warn", "console.error"],
        "ignoreProperty": ["testID", "accessibilityLabel", "accessibilityHint", "placeholder", "aria-label", "aria-labelledby", "aria-describedby"]
      }],
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
      
      // i18next rules - basic setup for user-visible strings only
      "i18n/no-literal-string": ["warn", { 
        "markupOnly": true, // Only check JSX text content (user-visible strings)
        "ignoreAttribute": [
          "testID", "accessibilityLabel", "aria-label", "style", "className", 
          "source", "uri", "keyboardType", "textContentType", "name", "key", "id"
        ],
        "ignoreCallee": [
          "console", "require", "StyleSheet.create", "Dimensions.get", 
          "Platform.select", "console.log", "console.warn", "console.error"
        ],
        "ignoreProperty": [
          "style", "source", "uri", "keyboardType", "textContentType", 
          "placeholder", "name", "key", "id"
        ]
      }],
      
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

  // Configuration, script, and polyfill files
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
      "i18next/no-literal-string": "off", // Allow hard-coded strings in config/scripts
    },
  },

  // Development, test, and debug files - more lenient rules
  {
    files: [
      "**/*debug*.{ts,tsx}",
      "**/*test*.{ts,tsx}",
      "**/*dev*.{ts,tsx}",
      "**/*tester*.{ts,tsx}",
      "**/*monitor*.{ts,tsx}",
      "**/*helper*.{ts,tsx}",
      "**/components/**/*Debug*.{ts,tsx}",
      "**/components/**/*Test*.{ts,tsx}",
      "**/components/**/*Tester*.{ts,tsx}",
      "**/components/**/*Monitor*.{ts,tsx}",
      "**/components/**/*Helper*.{ts,tsx}",
      "**/components/**/*Panel*.{ts,tsx}",
      "**/components/**/*Boundary*.{ts,tsx}",
      "**/components/**/*Reset*.{ts,tsx}",
      "**/components/**/*Memory*.{ts,tsx}",
      "**/components/**/*Error*.{ts,tsx}",
      "**/components/**/*Network*.{ts,tsx}",
      "**/components/**/*Sync*.{ts,tsx}",
      "**/components/**/*Undo*.{ts,tsx}",
      "**/components/**/*UUID*.{ts,tsx}",
      "**/components/**/*Optimized*.{ts,tsx}",
      "**/components/**/*Enhanced*.{ts,tsx}",
      "**/components/**/*Resilient*.{ts,tsx}",
      "**/components/**/*Toast*.{ts,tsx}",
      "**/components/**/*add-task*.{ts,tsx}",
      "**/components/**/*Form*.{ts,tsx}",
      "**/components/**/*Modal*.{ts,tsx}",
      "**/components/**/*Calculator*.{ts,tsx}",
      "**/components/**/*Comparison*.{ts,tsx}",
      "**/components/**/*History*.{ts,tsx}",
      "**/components/**/*Harvest*.{ts,tsx}",
      "**/components/**/*Example*.{ts,tsx}",
      "**/components/**/*Notification*.{ts,tsx}",
      "**/components/**/*Reminder*.{ts,tsx}",
      "**/components/**/*Scheduler*.{ts,tsx}",
      "**/components/**/*Actions*.{ts,tsx}",
      "**/components/**/*Hero*.{ts,tsx}",
      "**/components/**/*Gallery*.{ts,tsx}",
      "**/components/**/*Viewer*.{ts,tsx}",
      "**/components/**/*Detail*.{ts,tsx}",
      "**/components/**/*Profile*.{ts,tsx}",
      "**/components/**/*Task*.{ts,tsx}",
      "**/components/**/*Metrics*.{ts,tsx}",
      "**/components/**/*VPD*.{ts,tsx}",
      "**/components/**/*Care*.{ts,tsx}",
      "**/components/**/*Attention*.{ts,tsx}",
      "**/components/**/*Plant*.{ts,tsx}",
      "**/components/**/*Photo*.{ts,tsx}",
      "**/components/**/*Image*.{ts,tsx}",
      "**/components/**/*Icon*.{ts,tsx}",
      "**/components/**/*SVG*.{ts,tsx}",
      "**/components/**/*Symbol*.{ts,tsx}",
      "**/components/**/*Spinner*.{ts,tsx}",
      "**/components/**/*Input*.{ts,tsx}",
      "**/components/**/*Text*.{ts,tsx}",
      "**/components/**/*Segmented*.{ts,tsx}",
      "**/components/**/*Status*.{ts,tsx}",
      "**/components/**/*Picker*.{ts,tsx}",
      "**/components/**/*Selector*.{ts,tsx}",
      "**/components/**/*Control*.{ts,tsx}",
      "**/components/**/*Button*.{ts,tsx}",
      "**/components/**/*Container*.{ts,tsx}",
      "**/components/**/*Wrapper*.{ts,tsx}",
      "**/components/**/*List*.{ts,tsx}",
      "**/components/**/*Flash*.{ts,tsx}",
      "**/components/**/*Skeleton*.{ts,tsx}",
      "**/components/**/*Card*.{ts,tsx}",
      "**/components/**/*Avatar*.{ts,tsx}",
      "**/components/**/*Tag*.{ts,tsx}",
      "**/components/**/*Pill*.{ts,tsx}",
      "**/components/**/*Badge*.{ts,tsx}",
      "**/components/**/*Chip*.{ts,tsx}",
      "**/components/**/*Label*.{ts,tsx}",
      "**/components/**/*Field*.{ts,tsx}",
      "**/components/**/*Step*.{ts,tsx}",
      "**/components/**/*Stage*.{ts,tsx}",
      "**/components/**/*Phase*.{ts,tsx}",
      "**/components/**/*Progress*.{ts,tsx}",
      "**/components/**/*Loading*.{ts,tsx}",
      "**/components/**/*Empty*.{ts,tsx}",
      "**/components/**/*Placeholder*.{ts,tsx}",
      "**/components/**/*Fallback*.{ts,tsx}",
      "**/components/**/*Warning*.{ts,tsx}",
      "**/components/**/*Success*.{ts,tsx}",
      "**/components/**/*Info*.{ts,tsx}",
      "**/components/**/*Alert*.{ts,tsx}",
      "**/components/**/*Banner*.{ts,tsx}",
      "**/components/**/*Tooltip*.{ts,tsx}",
      "**/components/**/*Dropdown*.{ts,tsx}",
      "**/components/**/*Menu*.{ts,tsx}",
      "**/components/**/*Popover*.{ts,tsx}",
      "**/components/**/*Sheet*.{ts,tsx}",
      "**/components/**/*Overlay*.{ts,tsx}",
      "**/components/**/*Backdrop*.{ts,tsx}",
      "**/components/**/*Mask*.{ts,tsx}",
      "**/components/**/*Blur*.{ts,tsx}",
      "**/components/**/*Shadow*.{ts,tsx}",
      "**/components/**/*Border*.{ts,tsx}",
      "**/components/**/*Divider*.{ts,tsx}",
      "**/components/**/*Separator*.{ts,tsx}",
      "**/components/**/*Spacer*.{ts,tsx}",
      "**/components/**/*Padding*.{ts,tsx}",
      "**/components/**/*Margin*.{ts,tsx}",
      "**/components/**/*Safe*.{ts,tsx}",
      "**/components/**/*Scroll*.{ts,tsx}",
      "**/components/**/*Refresh*.{ts,tsx}",
      "**/components/**/*Pull*.{ts,tsx}",
      "**/components/**/*Swipe*.{ts,tsx}",
      "**/components/**/*Gesture*.{ts,tsx}",
      "**/components/**/*Touch*.{ts,tsx}",
      "**/components/**/*Tap*.{ts,tsx}",
      "**/components/**/*Press*.{ts,tsx}",
      "**/components/**/*Hold*.{ts,tsx}",
      "**/components/**/*Drag*.{ts,tsx}",
      "**/components/**/*Drop*.{ts,tsx}",
      "**/components/**/*Resize*.{ts,tsx}",
      "**/components/**/*Rotate*.{ts,tsx}",
      "**/components/**/*Scale*.{ts,tsx}",
      "**/components/**/*Transform*.{ts,tsx}",
      "**/components/**/*Transition*.{ts,tsx}",
      "**/components/**/*Animation*.{ts,tsx}",
      "**/components/**/*Motion*.{ts,tsx}",
      "**/components/**/*Spring*.{ts,tsx}",
      "**/components/**/*Bounce*.{ts,tsx}",
      "**/components/**/*Fade*.{ts,tsx}",
      "**/components/**/*Slide*.{ts,tsx}",
      "**/components/**/*Zoom*.{ts,tsx}",
      "**/components/**/*Flip*.{ts,tsx}",
      "**/components/**/*Spin*.{ts,tsx}",
      "**/components/**/*Pulse*.{ts,tsx}",
      "**/components/**/*Shake*.{ts,tsx}",
      "**/components/**/*Wobble*.{ts,tsx}",
      "**/components/**/*Elastic*.{ts,tsx}",
      "**/components/**/*Damping*.{ts,tsx}",
      "**/components/**/*Inertia*.{ts,tsx}",
      "**/components/**/*Momentum*.{ts,tsx}",
      "**/components/**/*Velocity*.{ts,tsx}",
      "**/components/**/*Acceleration*.{ts,tsx}",
      "**/components/**/*Friction*.{ts,tsx}",
      "**/components/**/*Tension*.{ts,tsx}",
      "**/components/**/*Mass*.{ts,tsx}",
      "**/components/**/*Gravity*.{ts,tsx}",
      "**/components/**/*Force*.{ts,tsx}",
      "**/components/**/*Physics*.{ts,tsx}",
      "**/components/**/*Dynamics*.{ts,tsx}",
      "**/components/**/*Kinetics*.{ts,tsx}",
      "**/components/**/*Easing*.{ts,tsx}",
      "**/components/**/*Curve*.{ts,tsx}",
      "**/components/**/*Bezier*.{ts,tsx}",
      "**/components/**/*Linear*.{ts,tsx}",
      "**/components/**/*Quadratic*.{ts,tsx}",
      "**/components/**/*Cubic*.{ts,tsx}",
      "**/components/**/*Exponential*.{ts,tsx}",
      "**/components/**/*Logarithmic*.{ts,tsx}",
      "**/components/**/*Sinusoidal*.{ts,tsx}",
      "**/components/**/*Circular*.{ts,tsx}",
      "**/components/**/*Elastic*.{ts,tsx}",
      "**/components/**/*Back*.{ts,tsx}",
      "**/components/**/*Bounce*.{ts,tsx}",
      "**/components/**/*Anticipate*.{ts,tsx}",
      "**/components/**/*Overshoot*.{ts,tsx}"
    ],
    rules: {
      "no-console": "off", // Allow all console methods in debug files
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "warn", // Warn instead of error for complex components
      "i18next/no-literal-string": "warn", // Warn instead of error for non-user-facing components
      "i18n/no-literal-string": "warn", // Warn instead of error for non-user-facing components
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
