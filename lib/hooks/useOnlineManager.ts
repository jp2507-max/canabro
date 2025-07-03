import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { deltaSyncStrains } from '@/lib/services/sync';
import { useEffect } from 'react';

/**
 * Hook that syncs the online state of your app with React Query's
 * onlineManager. This ensures that React Query knows when it can
 * make API calls in your React Native app.
 */
export function useOnlineManager() {
  useEffect(() => {
    let previousConnected: boolean | null = null;

    onlineManager.setEventListener((setOnline) => {
      // Subscribe to NetInfo's connectivity changes
      return NetInfo.addEventListener(async (state) => {
        // Detect reconnection
        const nowConnected = !!state.isConnected;
        if (previousConnected === false && nowConnected) {
          try {
            console.log('[DeltaSync] Network reconnected – running strain delta sync');
            await deltaSyncStrains();
          } catch (err) {
            console.warn('[DeltaSync] Strain delta sync on reconnection failed', err);
          }
        }

        previousConnected = nowConnected;
        setOnline(nowConnected);
      });
    });

    // Clean up subscription on unmount
    return () => {
      // Use an empty function instead of undefined
      onlineManager.setEventListener(() => undefined);
    };
  }, []);
}
