import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Hook to monitor React Native app state changes.
 * Used by the QueryProvider to sync React Query's focus state.
 */
export function useAppState(onChange: (status: AppStateStatus) => void) {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', onChange);

    return () => {
      subscription.remove();
    };
  }, [onChange]);
}