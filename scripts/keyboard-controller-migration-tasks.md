# 📋 Keyboard Controller Migration Tasks

Track progress as you integrate the guide into CanaBro. Mark each box when done.

---

## 1. Audit & Planning
- [ ] Inventory **all** `TextInput`, `KeyboardAvoidingView`, and other keyboard-related utilities in the codebase
- [ ] Map every usage to the corresponding pattern in the new guide (basic handling, advanced animations, toolbar, view-avoiding)
- [ ] Produce a **gap report** highlighting deviations or missing features

## 2. Dependency & Environment Setup
- [ ] Add `react-native-keyboard-controller` to `package.json` (Expo-compatible version)
- [ ] Ensure `react-native-reanimated` v3 and `react-native-gesture-handler` versions match the guide
- [ ] (Bare iOS only) run `pod install`
- [ ] Wrap app tree with `<KeyboardProvider>` in `app/_layout.tsx`

## 3. Core Infrastructure
- [ ] Create `lib/hooks/useEnhancedKeyboard.ts` (copy from guide)
- [ ] Create `lib/hooks/useKeyboardState.ts`
- [ ] Unit-test hooks for visibility, height, and dismiss logic

## 4. Keyboard-Aware Base Components
- [ ] Refactor `components/ui/EnhancedTextInput.tsx` to use `useEnhancedKeyboard`
- [ ] Add `components/ui/KeyboardAwareTextInput.tsx`
- [ ] Add `components/ui/ChatInput.tsx`
- [ ] Add Storybook / isolated tests for new components

## 5. Root Layout & Global Utilities
- [ ] Add keyboard utilities in `global.css` ( `.keyboard-aware`, `.keyboard-toolbar` )
- [ ] Create or import `KeyboardToolbar` wrapper in `components/ui`
- [ ] Re-export keyboard hooks in `lib/hooks/index.ts`

## 6. Component-Level Migration (iterate per feature)
- [ ] Messaging / community screens → replace legacy inputs with `ChatInput`
- [ ] Form-heavy screens (login, register, diary, plant edit) → use `KeyboardAwareScrollView` + toolbar
- [ ] Diary & journal components → implement view-avoiding spacer pattern
- [ ] Refactor any remaining ad-hoc keyboard handlers to `useEnhancedKeyboard`

## 7. Advanced Animations & View-Avoiding
- [ ] Implement `useGradualAnimation` for chat-style screens
- [ ] Add animated spacer to plant detail & diagnosis views
- [ ] Profile performance on low-end devices (target: 60 fps)

## 8. Testing & QA
- [ ] Build a comprehensive test checklist (animation smoothness, layout stability, toolbar navigation, accessibility, performance)
- [ ] Execute tests on iOS & Android, light/dark themes, portrait/landscape
- [ ] Fix all regressions discovered during QA

## 9. Accessibility & Polish
- [ ] Ensure every `TextInput` has proper `accessibilityLabel`/`Hint`
- [ ] Verify screen-reader focus order with toolbar navigation
- [ ] Add haptic feedback via `lib/utils/haptics` where appropriate

## 10. Documentation & Cleanup
- [ ] Document new hooks & patterns in `scripts/keyboard-enhancement-guide.md`
- [ ] Remove obsolete keyboard utilities or polyfills
- [ ] Add migration FAQ / notes in repo wiki or docs folder

## 11. Final Verification & Release
- [ ] Run `lib/utils/performance-profiler.ts` to confirm no new jank
- [ ] Merge PR and update release notes

---

_Use this file as a living checklist. Feel free to add, reorder, or nest tasks as work progresses._ 