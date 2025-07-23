# Canabro Technical Stack

## Core Technologies
- **Framework**: React Native 0.79 with Expo SDK 53
- **Language**: TypeScript (strict mode)
- **Navigation**: Expo Router v5 (file-based routing with deep linking support)
- **State Management**: 
  - Server state: TanStack Query v5 (`@tanstack/react-query`)
  - Global client state: React Context + useReducer
  - Local database: WatermelonDB
- **Backend**: Supabase (auth, database, real-time, storage)
- **Styling**: NativeWind v4 (Tailwind CSS for React Native)
- **Forms**: React Hook Form with Zod validation
- **Animations**: React Native Reanimated v3.19.0+ with automatic workletization

## Key Libraries
- **Authentication**: Supabase Auth
- **Storage**: Expo SecureStore, AsyncStorage, MMKV
- **UI Components**: Custom themed components with NativeWind
- **Animations**: React Native Reanimated v3.19.0+ (automatic workletization, no manual 'worklet' directives)
- **Gestures**: React Native Gesture Handler
- **Internationalization**: i18next, react-i18next
- **Image Handling**: Expo Image, Camera, ImagePicker
- **Date Handling**: dayjs with locale support via `lib/utils/date.ts`
- **Performance**: @shopify/flash-list for virtualized lists
- **Error Monitoring**: Sentry

## Development Tools
- **Linting**: ESLint
- **Formatting**: Prettier
- **Testing**: 
  - Jest + React Native Testing Library for unit/integration tests
  - Detox/Appium/Playwright for UI/E2E tests
- **Build System**: Expo EAS Build with OTA updates
- **CI/CD**: GitHub Actions with automated builds/tests

## Common Commands

### Development
```bash
# Start development server
npx expo start

# Linting and formatting
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

### Supabase
We use the Supabase MCP tools for all Supabase operations including migrations, queries, and database management.
```

## Performance Considerations
- Use React.memo for component memoization
- Implement virtualized lists with FlashList
- Optimize image loading and processing
- Use Reanimated v3.19.0+ animations with automatic workletization and proper cleanup on unmount
- Implement proper keyboard handling with EnhancedKeyboardWrapper
- Use safe area utilities (`pt-safe`, `h-screen-safe`) for all layouts
- Optimize for Mobile Web Vitals

## Project-Specific Patterns

### Styling
- Only use NativeWind v4 for styling
- Use semantic color tokens from `global.css`, never hardcoded colors
- Use `dark:` prefixes for dark mode theming
- Use `ThemedView` and `ThemedText` components for all custom UI

### Animations
- React Native Reanimated v3.19.0+ uses automatic workletization - no manual `'worklet'` directives needed
- Never access `.value` outside worklets
- Cancel animations on component unmount
- Use custom hooks from `lib/animations/` for reusable patterns

### Key Utilities
- Haptics: `@/lib/utils/haptics`
- Image handling: `@/lib/utils/image-picker.ts` and `@/lib/utils/upload-image.ts`
- Keyboard: `@/components/keyboard/EnhancedKeyboardWrapper`
- Text inputs: `@/components/ui/EnhancedTextInput`

## Development Rules
1. Never duplicate logic—always check for existing utilities/components first
2. Never hardcode colors or styles—use semantic tokens and NativeWind only
3. **Reanimated v3.19.0+**: No need for manual `'worklet'` directives (automatic workletization), never access `.value` outside worklets
4. All code must be fully optimized, DRY, and follow strict TypeScript
5. Use interfaces for type definitions, never enums
6. Structure files with main export, subcomponents, helpers, and types
7. Ensure all components have accessibility props and support screen readers

## Documentation & Research Rules
8. **Always use Brave Search or Context7** to fetch the latest documentation when working with any library or technology
9. **Never assume API knowledge** - always verify current syntax, best practices, and version-specific features
10. **Check for breaking changes** and new features in library updates before implementation
11. **Prioritize official documentation** and recent community examples over outdated information