# Canabro Technical Stack & Development Guidelines

## Core Technologies
- **Framework**: React Native 0.79 with Expo SDK 53
- **Language**: TypeScript (strict mode)
- **Navigation**: Expo Router v5 (file-based routing with deep linking support)
- **State Management**: 
  - Server state: TanStack Query v5 (`@tanstack/react-query`)
  - Global client state: React Context + useReducer
  - Local database: WatermelonDB
- **Database**: 
  - Supabase (backend, accessed via MCP server)
  - WatermelonDB (local database)
- **Styling**: NativeWind v4 with semantic color tokens
- **Form Handling**: React Hook Form with Zod validation

## Key Libraries
- **UI Components**: Custom components with NativeWind styling
- **Authentication**: Supabase Auth
- **Storage**: Expo SecureStore, AsyncStorage, MMKV
- **Localization**: i18next, react-i18next, expo-localization
- **Notifications**: expo-notifications
- **Image Handling**: expo-image, expo-image-picker, expo-image-manipulator
- **Machine Learning**: TensorFlow.js (for plant diagnosis)
- **Animations**: react-native-reanimated v3

## Project Structure
- Expo managed workflow with development client
- Hermes JavaScript engine
- New Architecture enabled

## Development Best Practices

### TypeScript Guidelines
- Use strict TypeScript mode
- Prefer interfaces over enums
- Structure files with: main export, subcomponents, helpers, types
- Run `npx tsc --noEmit` for type checks

### Styling Guidelines
- Use NativeWind v4 exclusively for styling
- Use semantic color tokens from `global.css`, never hardcoded colors
- Use safe area utilities (`pt-safe`, `h-screen-safe`) for all layouts
- Use `ThemedView`/`ThemedText` for custom UI components
- Support both light and dark mode with `dark:` prefixes

### Animation Guidelines
- Always add `'worklet'` in `useAnimatedStyle` and gesture handlers
- Never access `.value` outside worklets
- Cancel animations on unmount
- Use custom hooks from `lib/animations/` for reusable patterns

### Data Management
- Use proper query keys and cache strategies with TanStack Query
- Use WatermelonDB for local relationships
- Implement optimistic updates and error boundaries

### Navigation
- Use dynamic routes and params
- Handle navigation state and deep links properly
- Follow the structure in the `app/` directory

## Custom Utilities
- **Haptics**: Use `@/lib/utils/haptics` only
- **Image Handling**: Use `@/lib/utils/image-picker.ts` and `@/lib/utils/upload-image.ts`
- **Keyboard**: Use `EnhancedKeyboardWrapper` for screens with input
- **Text Input**: Use `@/components/ui/EnhancedTextInput` for text inputs
- **Offline Sync**: Custom synchronization between local and remote databases
- **Plant Diagnosis**: Custom ML-based plant health analysis tools
- **Theme System**: Custom theming with dynamic color palette switching
- **Form Validation**: Custom form validation patterns with Zod
- **Error Handling**: Custom error boundary and error reporting system

## Accessibility
- All components must have a11y props
- Support semantic roles
- Ensure screen reader compatibility
- Reference `scripts/ui-refinement-plan.md` for patterns

## Build & Deployment
- Use EAS Build (`eas.json`) for production
- OTA updates via EAS Update
- Manage build secrets via EAS CLI

## Testing & Debugging
- Use custom logger instead of `console.log` for production
- Babel strips console statements in production
- Hermes is enabled for iOS
- Use Sentry for error logging

## Common Commands

### Development
```bash
# Start development server
npx expo start

# Run on specific platforms
npx expo run:ios
npx expo run:android
npx expo start --web

# Start with profiling
npx expo start --ios --profile
```

### Build & Export
```bash
# Prebuild native code
npm run prebuild

# Export for iOS
npm run ios:export

# Analyze bundle size
npm run ios:analyze
npm run ios:bundle-size
```

### Code Quality
```bash
# Linting
npm run lint
npm run lint:check
npm run lint:fix

# Formatting
npm run format
npm run format:check

# Validate translations
npm run validate:translations
```

### MCP Server
```bash
# Supabase operations are handled through the MCP server
# No direct Supabase CLI commands are needed
```

### Authentication Utilities
```bash
# Clear authentication data
npm run clear-auth

# Debug authentication
npm run debug-auth
```

## Key Rules
1. Never duplicate logic—check for existing utilities/components first
2. Never hardcode colors or styles—use semantic tokens and NativeWind only
3. Always add `'worklet'` in Reanimated worklets
4. Write optimized, DRY code following strict TypeScript
5. Always provide file names and break code into reusable modules/components