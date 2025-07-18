import { useEffect } from 'react';
import { notificationListenerService } from '@/lib/services/notificationListenerService';

/**
 * Hook to initialize notification listeners
 * Should be called once in the root component
 */
export const useNotificationListener = () => {
  useEffect(() => {
    // Initialize notification listeners
    notificationListenerService.initialize();

    // Cleanup on unmount
    return () => {
      notificationListenerService.cleanup();
    };
  }, []);
};