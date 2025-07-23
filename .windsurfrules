# CanaBro AI Coding Agent Instructions (2025)

## 🏗️ Project Architecture & Data Flow
- **Expo SDK 53 + React Native 0.79**: Modern, modular, and mobile-first. All navigation is file-based via Expo Router v5 (`app/` structure). Deep linking and dynamic routes are supported.
- **TypeScript strict mode**: All code is typed. Use interfaces, never enums. Structure files: main export, subcomponents, helpers, types.
- **State Management**: Server state via TanStack Query v5 (`@tanstack/react-query`), global client state via React Context + useReducer, local DB via WatermelonDB. Supabase is the backend (auth, DB, real-time, storage).
- **Styling**: NativeWind v4 is the only styling system. Use semantic color tokens (see `global.css`), never hardcoded colors. All layouts use safe area utilities (`pt-safe`, `h-screen-safe`).
- **Animations**: React Native Reanimated v3.19.0+ with automatic workletization. No manual `'worklet'` directives needed. Never access `.value` outside worklets. Use custom hooks from `lib/animations/` for reusable patterns.
- **Custom Components**: Always check for existing utilities/components before creating new ones. Key utilities: `@/lib/utils/haptics`, `@/lib/utils/image-picker.ts`, `@/lib/utils/upload-image.ts`, `@/components/ui/EnhancedTextInput`, `@/components/keyboard/EnhancedKeyboardWrapper`.

## 🛠️ Developer Workflows
- **Builds**: Use EAS Build (`eas.json`) for production. Run `npx tsc --noEmit` for type checks. OTA updates via EAS Update. All build secrets managed via EAS CLI.
- **Testing**: Automated UI/E2E tests (Detox/Appium/Playwright) for critical flows. Use Jest + React Native Testing Library for unit/integration tests. Test on real devices and emulators. See `tasks/` for test strategies and device matrix.
- **Debugging**: Use custom logger (not `console.log`) for production. Babel strips console statements in prod. Hermes enabled for iOS. Use Sentry for error logging.
- **CI/CD**: Automated builds/tests via GitHub Actions or similar. All test failures block merges. See `tasks/` for pipeline details.

## 📦 Project-Specific Patterns & Conventions
- **Styling**: Only use NativeWind v4. All theming/dark mode via semantic tokens and `dark:` prefixes. Use `ThemedView`/`ThemedText` for all custom UI. Reference `.github/instructions/Nativewind Theming Best Practices.instructions.md` for safe area and advanced patterns.
- **Animations**: React Native Reanimated v3.19.0+ uses automatic workletization - no manual `'worklet'` directives needed. Never access `.value` outside worklets. Cancel animations on unmount. Reference `.github/instructions/React Native Reanimated Best Practices.instructions.md` for all animation code.
- **Data**: Use TanStack Query for all server state. Use proper query keys and cache strategies. Use WatermelonDB for local relationships. Use Supabase for all backend (auth, DB, storage, real-time). Implement optimistic updates and error boundaries.
- **Navigation**: File-based routing only. Use dynamic routes and params. Handle navigation state and deep links. See `app/` for structure.
- **Accessibility**: All components must have a11y props, semantic roles, and support screen readers. See `scripts/ui-refinement-plan.md` for patterns.
- **Mobile-First**: Always use safe area utilities. Test in both light/dark mode and on iOS/Android. Optimize for Mobile Web Vitals.

## 🔗 Integration Points & Cross-Component Communication
- **Haptics**: Use `@/lib/utils/haptics` only.
- **Image Handling**: Use `@/lib/utils/image-picker.ts` and `@/lib/utils/upload-image.ts` for all image selection/upload.
- **Keyboard**: Use `EnhancedKeyboardWrapper` for all screens with input.
- **Analytics/Monitoring**: Integrate Sentry/Bugsnag for error/crash reporting. Use analytics for compliance and performance (see `tasks/task_008.txt`).
- **Build/Release**: All build, OTA, and release steps are documented in `tasks/` and `scripts/`.

## 🚨 Key Rules for AI Agents
1. **Never duplicate logic**—always check for existing utilities/components first.
2. **Never hardcode colors or styles**—use semantic tokens and NativeWind only.
3. **React Native Reanimated v3.19.0+**: Automatic workletization enabled - no manual `'worklet'` directives needed. Never access `.value` outside worklets.
4. **All code must be fully optimized, DRY, and follow strict TypeScript.**
5. **Always provide file names and break code into reusable modules/components.**
6. **Document only what is discoverable in the codebase, not aspirational practices.**

## Documentation & Research Rules
1. **Always use Brave Search or Context7** to fetch the latest documentation when working with any library or technology
2. **Never assume API knowledge** - always verify current syntax, best practices, and version-specific features
3. **Check for breaking changes** and new features in library updates before implementation
4. **Prioritize official documentation** and recent community examples over outdated information

## 📚 Reference Files
- **Styling**: `.github/instructions/Nativewind Theming Best Practices.instructions.md`
- **Animation**: `.github/instructions/React Native Reanimated Best Practices.instructions.md`
- **Build/Release/Testing**: `tasks/`, `scripts/`
- **Product Requirements Document (PRD)**: `.taskmaster/docs/prd.txt`

---
If any section is unclear or incomplete, please provide feedback for further iteration.