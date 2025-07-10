import { useRouter } from 'expo-router';
import type { Router } from 'expo-router';

/**
 * A safe wrapper around Expo Router's `useRouter` that prevents the
 * "Couldn't find a navigation context" crash when the hook is executed
 * outside of a valid NavigationContainer (e.g. during transient renders
 * triggered by Reanimated or startTransition).
 */
export function useSafeRouter(): Router {
  try {
    // Attempt to get the real router. If the navigation context is present
    // this will succeed and we simply return it.
    return useRouter();
  } catch (error: unknown) {
    // Navigation context is temporarily unavailable – return a stub so the
    // component tree can continue to render without crashing. We still log
    // the incident for debugging purposes.
    if (__DEV__) {
      console.warn('[useSafeRouter] Navigation context not found – using stub router');
    }

    // Return a minimal stub implementation that does nothing but logs.
    // We cast it as Router to satisfy TypeScript while providing safe fallbacks
    const stub = {
      push: (href: any, options?: any) => {
        if (__DEV__) {
          console.warn(`[useSafeRouter] Attempted to navigate to "${String(href)}" while navigation context was missing.`);
        }
      },
      replace: (href: any, options?: any) => {
        if (__DEV__) {
          console.warn(`[useSafeRouter] Attempted to replace with "${String(href)}" while navigation context was missing.`);
        }
      },
      back: () => {
        if (__DEV__) {
          console.warn('[useSafeRouter] Attempted to go back while navigation context was missing.');
        }
      },
      canGoBack: () => false,
      setParams: (params: any) => {
        if (__DEV__) {
          console.warn('[useSafeRouter] Attempted to set params while navigation context was missing.');
        }
      },
      dismiss: (count?: number) => {
        if (__DEV__) {
          console.warn('[useSafeRouter] Attempted to dismiss while navigation context was missing.');
        }
      },
      canDismiss: () => false,
      dismissAll: () => {
        if (__DEV__) {
          console.warn('[useSafeRouter] Attempted to dismiss all while navigation context was missing.');
        }
      },
      navigate: (href: any) => {
        if (__DEV__) {
          console.warn(`[useSafeRouter] Attempted to navigate to "${String(href)}" while navigation context was missing.`);
        }
      },
    } as Router;

    return stub;
  }
} 