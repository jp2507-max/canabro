# CanaBro Project Memories

This file documents all AI agent memories and key implementation notes for the CanaBro project. These are based on past development, debugging, and architectural decisions. Use this as a reference for best practices, resolved issues, and project conventions.

---

## Theme & UI System
- Cleaned up all debug components and simplified theme system. Removed `DarkModeTest`, `ThemeDebugger`, `PrivacyIconTest` components and eliminated `useThemeManager` hook and `ThemeProvider` context. All components now use NativeWind's `useColorScheme` directly. The `ThemeToggle` component retains the robust multi-method theme setting approach that fixed the stuck theme issue. The app now has a clean, simple theme system that relies entirely on NativeWind v4's built-in capabilities. *(ID: 2971624)*

## Database & Migrations
- All new migrations must be placed in the `migrations` folder before applying them. Use the Supabase MCP tool to apply database migrations in the `supabase` directory. *(IDs: 2690939, 2632418)*

## Task Management
- The user prefers using the built-in to-do list mechanism and to create an implementation plan before taking action on tasks. *(IDs: 2690939, 2164970)*

## Utilities & Code Reuse
- The project has centralized reusable utility components and helpers that should be used throughout the codebase instead of duplicating logic. Key utilities include: image picker (`lib/utils/image-picker.ts`), haptics utilities (`lib/utils/haptics.ts`), `EnhancedTextInput` component, `EnhancedKeyboardWrapper`, and `upload-image` helper (`lib/utils/upload-image.ts`). Always check for existing utilities before creating new ones. *(ID: 2289636)*

## Navigation
- Fixed navigation context errors by implementing proper Expo Router protected routes pattern. Moved all authentication routing logic from layout files to main `app/index.tsx`. Simplified app layouts to remove conflicting `Redirect` components. Enhanced tabs layout with better error handling. The `NavigationErrorBoundary` and navigation guard hooks are no longer needed. *(ID: 2237196)*

## Keyboard Handling
- The project widely utilizes the `EnhancedKeyboardWrapper` component for managing keyboard padding and accessory toolbar, and the `EnhancedTextInput` component for advanced input handling in forms. *(ID: 614700)*
- Fixed issue where keyboard would unexpectedly dismiss when editing text in forms. Solution: Guard `dismissKeyboard()` to exit early if keyboard isn't visible, remove unnecessary calls, and use `isFirstRender` flag pattern. *(ID: 190696)*

## Image Uploads
- Created centralized `lib/utils/upload-image.ts` helper for image resizing, compression, and streaming upload to Supabase Storage. All image uploads should use this helper. *(ID: 190672)*
- Memory optimization for image uploads: replaced `fetch(uri).blob()` with `FileSystem.uploadAsync()` for streaming uploads, preventing OOM crashes. Implementation includes file size check, session-based auth, Supabase URL from config, and multipart headers. Applied to all relevant forms and modals. *(ID: 190599)*

## Haptics
- Use custom haptics utility functions (`triggerLightHapticSync`, `triggerMediumHapticSync`) from `lib/utils/haptics` instead of directly importing `expo-haptics`. *(ID: 190649)*

## Animation & Reanimated
- Fixed SegmentedControl sliding indicator animation by switching from percentage-based transforms to pixel-based positioning. Track container width, calculate pixel positions, and use pixel values for `translateX`. *(ID: 2326418)*
- When implementing or debugging Reanimated animations (e.g., error shake in AnimatedInput), use `cancelAnimation` to stop ongoing animation before starting a new one. *(ID: 190626)*
- In `useCardAnimation.ts`, pressed shadow state uses higher opacity for dark mode and lower for light mode. Use `useColorScheme` to select appropriate shadow values. *(IDs: 190593, 190584)*
- As of June 2025, React Compiler is still in RC phase. Continue using `.value` syntax with Reanimated. *(ID: 190577)*
- StrainAutocomplete.tsx migrated to consistent v2 `.value` syntax. Remaining files with v3 syntax: `UserAvatar.tsx`, `StrainsView.tsx`. Maintain v2 syntax for compatibility. *(ID: 190568)*
- **UPDATED**: React Native Reanimated v3.19.0+ uses automatic workletization - no manual `'worklet'` directives needed. Never access `.value` outside worklets. *(Project rule updated 2025)*

## Styling & Theming
- Only use NativeWind v4 for styling. All theming/dark mode via semantic tokens and `dark:` prefixes. Use `ThemedView`/`ThemedText` for all custom UI. *(Project rule)*
- Components using `getIconColor` functions that return hardcoded color values should be refactored to return NativeWind className strings instead. *(ID: 190560)*
- The `OptimizedIcon` component already properly supports NativeWind v4 theming with `className` prop. *(ID: 190557)*

## Debugging & Logging
- Use custom logger (not `console.log`) for production. Babel strips console statements in prod. Hermes enabled for iOS. Use Sentry for error logging. *(Project rule)*
- When debugging React Native component issues by commenting out sections, ensure the debugging approach still allows reproduction of the original error. *(ID: 190704)*

## Miscellaneous
- User prefers that the `--quality hd` flag be appended to every snapai icon prompt. *(ID: 190686)*
- The project’s bottom tab navigation uses `@bottom-tabs/react-navigation` with sfSymbol icons and custom styling; do not replace it with `@react-navigation/bottom-tabs` unless the user explicitly requests a change. *(ID: 190659)*
- Fixed "Invalid selectedDate provided, using current date: {}" error in DateSelector by adding comprehensive date validation throughout the calendar data flow. *(ID: 190606)*
- The user prefers that the assistant use Brave Search when looking up information to fix issues. *(ID: 190616)*

---

*This file is auto-generated from AI agent memories. For updates, re-run the agent with a request to export current memories.*
- User prefers that the `--quality hd` flag be appended to every snapai icon prompt. *(ID: 190686)*
- The project's bottom tab navigation uses `@bottom-tabs/react-navigation` with sfSymbol icons and custom styling; do not replace it with `@react-navigation/bottom-tabs` unless the user explicitly requests a change. *(ID: 190659)*
- Fixed "Invalid selectedDate provided, using current date: {}" error in DateSelector by adding comprehensive date validation throughout the calendar data flow. *(ID: 190606)*
- The user prefers that the assistant use Brave Search when looking up information to fix issues. *(ID: 190616)*

## Documentation & Research Standards (2025)
- **React Native Reanimated v3.19.0+**: Project uses latest version with automatic workletization - no manual 'worklet' directives needed. Always verify current API syntax via Brave Search or Context7 before implementation.
- **Always fetch fresh documentation**: When working with any library or technology, use Brave Search or Context7 to get the most current documentation, API changes, and best practices. Never assume knowledge of library APIs without verification.
- **Quality improvement mandate**: Using up-to-date documentation sources significantly improves code quality and prevents deprecated API usage. This is a critical requirement for all development work.

---

*This file is auto-generated from AI agent memories. For updates, re-run the agent with a request to export current memories.*