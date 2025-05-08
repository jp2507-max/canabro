import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

/**
 * Hook that syncs the online state of your app with React Query's
 * onlineManager. This ensures that React Query knows when it can
 * make API calls in your React Native app.
 */
export function useOnlineManager() {
  useEffect(() => {
    // React Query already supports setting an online detector,
    // we just need to tell it what to use
    onlineManager.setEventListener((setOnline) => {
      // Subscribe to NetInfo's connectivity changes
      return NetInfo.addEventListener((state) => {
        // Update the online status based on NetInfo's data
        setOnline(!!state.isConnected);
      });
    });

    // Clean up subscription on unmount
    return () => {
      onlineManager.setEventListener(undefined);
    };
  }, []);
}