import { SplashScreen } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/lib/contexts/AuthProvider';

export function SplashScreenController() {
  const { loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      // Hide splash screen when authentication is resolved
      SplashScreen.hideAsync().catch(console.warn);
    }
  }, [loading]);

  return null;
}
