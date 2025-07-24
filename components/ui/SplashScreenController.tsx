import { SplashScreen } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/lib/contexts/AuthProvider';
import { log } from '@/lib/utils/logger';

export function SplashScreenController() {
  const { loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      // Hide splash screen when authentication is resolved
      SplashScreen.hideAsync().catch((error) => {
        log.warn('Failed to hide splash screen', error);
      });
    }
  }, [loading]);

  return null;
}
