import { useCallback, useRef, useEffect } from 'react';
import { startTransition } from 'react';

/**
 * Custom hook that provides a debounced callback with mounted component checks
 * and error handling. Replaces setTimeout workarounds for state management.
 * 
 * @param callback - The callback function to debounce
 * @param delay - Debounce delay in milliseconds (default: 200ms)
 * @param useTransition - Whether to use startTransition for non-urgent updates (default: true)
 * @returns Debounced callback function
 */
export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number = 200,
  useTransition: boolean = true
): (...args: Parameters<T>) => void {
  const isMountedRef = useRef(true);
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Set mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Create debounced function
  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        // Check if component is still mounted
        if (!isMountedRef.current) {
          console.warn('[useDebouncedCallback] Attempted to call callback on unmounted component');
          return;
        }

        try {
          const executeCallback = () => {
            callbackRef.current(...args);
          };

          // Use startTransition for non-urgent updates if requested
          if (useTransition) {
            startTransition(executeCallback);
          } else {
            executeCallback();
          }
        } catch (error) {
          console.error('[useDebouncedCallback] Error in debounced callback:', error);
        }
      }, delay);
    },
    [delay, useTransition]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
} 