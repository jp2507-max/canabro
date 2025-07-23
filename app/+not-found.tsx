import React from 'react';
import { Pressable } from 'react-native';

import ThemedText from '@/components/ui/ThemedText';
import ThemedView from '@/components/ui/ThemedView';
import { useAuth } from '@/lib/contexts/AuthProvider';
import { useCommonTranslations } from '@/lib/hooks/useI18n';
import useAuthNavigation from '@/lib/utils/auth-navigation';

export default function NotFoundScreen() {
  const { user } = useAuth();
  const { t } = useCommonTranslations();
  const { navigateToHome } = useAuthNavigation();

  return (
    <ThemedView 
      className="flex-1 items-center justify-center px-6"
      accessibilityRole="header"
      accessibilityLabel={t('errors.pageNotFound', 'Page Not Found')}
    >
      <ThemedView className="items-center">
        <ThemedText 
          className="text-6xl font-bold mb-4"
          accessibilityRole="text"
        >
          404
        </ThemedText>
        <ThemedText 
          className="text-xl font-semibold mb-2 text-center"
          accessibilityRole="text"
        >
          {t('errors.pageNotFound', 'Page Not Found')}
        </ThemedText>
        <ThemedText 
          className="text-base mb-8 text-center"
          accessibilityRole="text"
        >
          {t('errors.pageNotFoundDescription', "The page you're looking for doesn't exist or you don't have permission to access it.")}
        </ThemedText>

        <Pressable
          onPress={navigateToHome}
          className="bg-primary-600 px-6 py-3 rounded-lg active:bg-primary-700"
          accessibilityRole="button"
          accessibilityLabel={user ? t('navigation.goToHome', 'Go to Home') : t('navigation.goToLogin', 'Go to Login')}
        >
          <ThemedText 
            className="text-white font-semibold text-base"
          >
            {user ? t('navigation.goToHome', 'Go to Home') : t('navigation.goToLogin', 'Go to Login')}
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}
