import { useSharedValue } from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Base bottom offset added to keyboard height calculations.
 * Matches default toolbar + padding requirements across the app.
 */
const BASE_OFFSET = 42; // ← Beto's magic number

/**
 * Lightweight hook that exposes a shared value representing the bottom padding
 * required to keep content above the keyboard as well as a visibility flag.
 *
 * @param extraOffset Optional additive value applied on top of `BASE_OFFSET` and
 * safe-area insets. Useful for edge-cases such as custom tab bars or FABs.
 *
 * @example
 * const { padding } = useKeyboardPadding();
 * const animatedStyle = useAnimatedStyle(() => ({ paddingBottom: padding.value }));
 */
export const useKeyboardPadding = (extraOffset = 0) => {
  // Safe-area bottom inset (e.g., iPhone home indicator) so we never overlap.
  const insets = useSafeAreaInsets();

  // Baseline padding when the keyboard is hidden.
  const base = BASE_OFFSET + insets.bottom + extraOffset;

  /** Shared value (Reanimated) that tracks the dynamic bottom padding. */
  const padding = useSharedValue<number>(base);

  /** Shared value flag indicating whether the keyboard is currently visible. */
  const isVisible = useSharedValue<boolean>(false);

  // Subscribe to keyboard movement events provided by RN Keyboard Controller.
  useKeyboardHandler(
    {
      onMove: (e) => {
        'worklet';
        // `e.height` is 0 when keyboard is hidden.
        // Ensure the padding never goes below the base value.
        const height = e.height > 0 ? Math.max(e.height + BASE_OFFSET, base) : base;
        padding.value = height;
        isVisible.value = e.height > 0;
      },
    },
    [] // No dependencies – runs once on mount.
  );

  return { padding, isVisible } as const;
}; 