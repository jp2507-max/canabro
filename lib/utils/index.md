# CanaBro Custom Utils & Components Index

A comprehensive reference of all custom utilities, hooks, and components in the CanaBro app. This index helps you find the right tool for your needs and avoid duplicate implementations.

## 🛠️ Core Utilities (`lib/utils/`)

### Image & Media
- **`upload-image.ts`** - Supabase image upload with compression, validation, and bucket management. Includes network-aware timeouts and retry logic. Use for all image uploads (plants, diary, community posts).
- **`image-picker.ts`** - Simplified camera/gallery picker with consistent permission handling. Returns standardized `ImageResult` format. Use for all image selection needs.
- **`image.ts`** - Image manipulation, resizing, and optimization utilities. Complements the upload and picker functions.

### User Experience
- **`haptics.ts`** - Comprehensive haptic feedback system with global enable/disable, worklet-safe sync functions, and semantic naming (light/medium/heavy/success/error/warning). Use for all tactile feedback.
- **`logger.ts`** - Production-safe logging with different levels and console stripping in production builds. Use instead of `console.log`.
- **`errorHandler.ts`** - Centralized error handling and reporting utilities. Use for consistent error management across the app.

### Data & Storage
- **`database.ts`** - WatermelonDB utilities and database operations. Use for local database management.
- **`data-parsing.ts`** - Data transformation and parsing utilities. Use for API response processing and data normalization.
- **`uuid.ts`** - UUID generation utilities. Use for creating unique identifiers.

### Performance & Optimization
- **`crashPrevention.ts`** - Crash prevention utilities and error boundaries. Use to prevent app crashes.
- **`performance-profiler.ts`** - Performance monitoring and profiling tools. Use for performance analysis.
- **`perfLogger.ts`** - Performance logging utilities. Use for tracking performance metrics.

### Platform & Environment
- **`platform-utils.ts`** - Platform-specific utilities and feature detection. Use for iOS/Android/Web differences.
- **`production-utils.ts`** - Production environment utilities and build-specific functions. Use for production-only features.

### String & Date Processing
- **`string-utils.ts`** - String manipulation, formatting, and validation utilities. Use for text processing.
- **`date.ts`** - Date formatting, parsing, and manipulation utilities with timezone support. Use for all date operations.
- **`notification-scheduling.ts`** - Timezone-aware notification scheduling validation and error handling. Use for scheduling notifications with proper timezone handling.

### Type Safety & Validation
- **`task-type-validation.ts`** - Safe task type validation to prevent runtime errors from invalid task types. Provides validation functions and type guards for TaskType enum. Use for all task type handling to avoid unsafe casting.

### Navigation & Routing
- **`taskNavigation.ts`** - Task-specific navigation utilities. Use for task flow navigation.

### Domain-Specific
- **`community-transforms.ts`** - Community data transformations and formatting. Use for community feature data processing.
- **`strainIdMapping.ts`** - Strain ID mapping and conversion utilities. Use for strain data management.

### Network & Connectivity
- **`network-utils.ts`** - Network state detection and connectivity utilities. Use for offline/online handling.

## 🎣 Custom Hooks (`lib/hooks/`)

### Keyboard Management
- **`keyboard/useKeyboardPadding.ts`** - Reactive keyboard padding with safe area support. Returns shared value for smooth animations. Use in all screens with inputs.
- **`keyboard/useEnhancedKeyboard.ts`** - Enhanced keyboard utilities with toolbar support. Use for advanced keyboard interactions.

### Network & Connectivity
- **`useIsOnline.ts`** - Network connectivity state hook. Use for offline/online UI states.
- **`useOnlineManager.ts`** - Network state management for TanStack Query. Use for network-aware query handling.
- **`useNetworkAwareTimeout.ts`** - Dynamic timeouts based on network conditions. Use for network-dependent operations.

### Data Management
- **`useDatabase.ts`** - WatermelonDB integration hook. Use for database operations.
- **`useWatermelon.ts`** - WatermelonDB utilities and helpers. Use for advanced database operations.
- **`useSyncHealth.ts`** - Database sync health monitoring. Use for sync status indicators.

### UI & Interaction
- **`useDebounce.ts`** - Value debouncing hook. Use for search inputs and expensive operations.
- **`useDebouncedCallback.ts`** - Callback debouncing hook. Use for preventing rapid function calls.
- **`usePullToRefresh.ts`** - Pull-to-refresh implementation. Use for list screens with refresh capability.

### App State & Navigation
- **`useAppState.ts`** - App state management (foreground/background). Use for app lifecycle events.
- **`useSafeRouter.ts`** - Safe router with error handling. Use for navigation with error protection.

### Internationalization
- **`useI18n.ts`** - Internationalization utilities. Use for multi-language support.
- **`useTranslation.ts`** - Translation hook. Use for localized text.

### Resource Management
- **`useResourceCleanup.ts`** - Automatic resource cleanup. Use for preventing memory leaks.

## 🎨 Animation Hooks (`lib/animations/`)

### Core Animation Utilities
- **`useButtonAnimation.ts`** - Standard button press animations with haptic feedback. Use for all buttons, FABs, and interactive elements.
- **`useCardAnimation.ts`** - Card-specific animations (scale, elevation, etc.). Use for card components and list items.
- **`useScrollAnimation.ts`** - Scroll-triggered animations and parallax effects. Use for scroll-based animations.

### Gesture & Interaction
- **`useGestureAnimation.ts`** - Gesture-based animations (swipe, pinch, etc.). Use for gesture interactions.
- **`useAdvancedGesture.ts`** - Advanced gesture handling with multiple recognizers. Use for complex gesture interactions.

### Animation Management
- **`useAnimationCleanup.ts`** - Automatic animation cleanup on unmount. Use to prevent memory leaks and crashes.
- **`useAnimationSequence.ts`** - Sequence multiple animations. Use for complex animation chains.
- **`useDerivedAnimation.ts`** - Derived animation values. Use for calculated animations.

### Configuration
- **`presets.ts`** - Pre-configured animation presets and spring configurations. Use for consistent animations.
- **`animationUtils.ts`** - Animation utility functions and helpers. Use for common animation operations.

## 🧩 UI Components (`components/ui/`)

### Core Components
- **`ThemedView.tsx`** - Themed container with dark mode support. Variants: default, card, surface, elevated. Use for all containers.
- **`ThemedText.tsx`** - Themed text with typography variants. Use for all text elements.

### Enhanced Inputs
- **`EnhancedTextInput.tsx`** - Advanced input with validation, character counting, and animations. Use for complex forms (plant creation, diary entries).
- **`SegmentedControl.tsx`** - Segmented control component. Use for tab-like selections.

### Performance Components
- **`FlashListWrapper.tsx`** - Optimized FlatList wrapper with sensible defaults. Use for all large lists and feeds.
- **`NetworkResilientImage.tsx`** - Advanced image component with network-aware loading, retry logic, and progressive loading. Use for all images, especially in feeds.

### Icons & Graphics
- **`OptimizedIcon.tsx`** - Optimized icon component with caching. Use for all icons.
- **`OptimizedSVGIcon.tsx`** - SVG icon component with optimization. Use for custom SVG icons.

### Navigation & Layout
- **`FloatingActionButton.tsx`** - Floating action button with animations. Use for primary actions.
- **`HomeHeader.tsx`** - App header component. Use for screen headers.

### Specialized Components
- **`PotencySlider.tsx`** - Cannabis potency slider component. Use for potency selection.
- **`StrainSkeletonItem.tsx`** - Skeleton loader for strain items. Use for loading states.
- **`SyncStatus.tsx`** - Database sync status indicator. Use for sync feedback.

### Development Tools
- **`DebugPanel.tsx`** - Debug panel for development. Use for debugging UI.
- **`DatabaseResetButton.tsx`** - Database reset utility. Use for development testing.
- **`StrainUUIDTester.tsx`** - Strain UUID testing component. Use for strain ID validation.

### Error Handling
- **`ErrorBoundary.tsx`** - React error boundary component. Use to catch and handle React errors.

### Modals & Overlays
- **`AddPlantModal.tsx`** - Plant creation modal. Use for adding new plants.

### Utility Components
- **`AppIcon.tsx`** - App icon component. Use for app branding.
- **`LanguageToggle.tsx`** - Language selection toggle. Use for i18n.
- **`ProviderWrapper.tsx`** - Provider wrapper component. Use for context providers.

## ⌨️ Keyboard Components (`components/keyboard/`)

### Keyboard Management
- **`EnhancedKeyboardWrapper.tsx`** - High-level keyboard wrapper with toolbar support and tap-to-dismiss. Use for all screens with inputs.
- **`SimpleFormWrapper.tsx`** - Simple form wrapper with basic keyboard handling. Use for simple forms.

---

*This index covers the most important custom utilities and components. Always check this list before creating new utilities to avoid duplication.*
