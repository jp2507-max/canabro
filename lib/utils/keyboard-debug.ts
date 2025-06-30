/* eslint-disable no-console */
// Debug utility to trace unexpected Keyboard.dismiss calls in development environments.
// Automatically imported in App.tsx when __DEV__ is true.
// Only runs in development; production builds remain unaffected.
import { Keyboard, TextInput as RNTextInput, EmitterSubscription } from 'react-native';

// Banner so we can confirm the module executes
console.log('[KeyboardDebug] logger attached');

const TextInput = RNTextInput as unknown as { prototype?: { blur?: (...args: unknown[]) => void } };

if (__DEV__) {
  const originalDismiss = Keyboard.dismiss;

  // Override Keyboard.dismiss to log a stack trace before executing.
  // Helps pinpoint where the unexpected dismissal originates.
  // We wrap in try/catch to avoid disrupting normal execution if stack trace retrieval fails.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Keyboard as any).dismiss = (...args: unknown[]) => {
    try {
      // Use console.warn so it stands out in the log output.
      // Extract a trimmed stack (omit the first two frames corresponding to this wrapper).
      const stack = new Error().stack?.split('\n').slice(2).join('\n');
      console.warn('[KeyboardDebug] Keyboard.dismiss invoked. Stack trace:\n', stack);
    } catch {
      // Ignore errors from stack extraction.
    }

    // Call the original method.
    return originalDismiss(...(args as []));
  };

  // Patch TextInput.prototype.blur only if available (prevents runtime error during early init)
  if (TextInput?.prototype?.blur) {
    const originalBlur = TextInput.prototype.blur;
    TextInput.prototype.blur = function (...args: unknown[]) {
      try {
        const stack = new Error().stack?.split('\n').slice(2).join('\n');
        console.warn('[KeyboardDebug] TextInput.blur invoked. Stack trace:\n', stack);
      } catch {
        /* ignore */
      }
      // @ts-ignore - calling original react-native TextInput blur
      return originalBlur.apply(this, args);
    };
  } else {
    console.warn('[KeyboardDebug] TextInput prototype not ready; blur patch skipped.');
  }

  // Detailed keyboard lifecycle logger (will/did show/hide with height and timestamp)
  const eventTypes: Array<
    | 'keyboardWillShow'
    | 'keyboardDidShow'
    | 'keyboardWillHide'
    | 'keyboardDidHide'
  > = ['keyboardWillShow', 'keyboardDidShow', 'keyboardWillHide', 'keyboardDidHide'];

  const subs: EmitterSubscription[] = eventTypes.map((evt) =>
    Keyboard.addListener(evt, (e) => {
      const h = (e as unknown as { endCoordinates?: { height?: number } })?.endCoordinates?.height;
      console.log(`[KeyboardDebug] ${evt} height=${h ?? 'n/a'} @${Date.now()}`);
    })
  );

  // Ensure we clean up subs on HMR disposal / module teardown
  const mod = module as unknown as { hot?: { dispose(cb: () => void): void } };
  if (mod.hot) {
    mod.hot.dispose(() => {
      subs.forEach((s) => s.remove());
    });
  }
} 