import React from 'react';
import { View, Text, Pressable } from 'react-native';

import { useAuth } from '@/lib/contexts/AuthProvider';
import { useCommonTranslations } from '@/lib/hooks/useI18n';
import { useAuthNavigation } from '@/lib/utils/auth-navigation';

export default function NotFoundScreen() {
  const { user } = useAuth();
  const { t } = useCommonTranslations();
  const { navigateToHome } = useAuthNavigation();

  return (
    <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-900 px-6">
      <View className="items-center">
        <Text className="text-6xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
          404
        </Text>
        <Text className="text-xl font-semibold text-neutral-700 dark:text-neutral-300 mb-2 text-center">
          {t('errors.pageNotFound', 'Page Not Found')}
        </Text>
        <Text className="text-base text-neutral-600 dark:text-neutral-400 mb-8 text-center">
          {t('errors.pageNotFoundDescription', "The page you're looking for doesn't exist or you don't have permission to access it.")}
        </Text>

        <Pressable
          onPress={navigateToHome}
          className="bg-primary-600 px-6 py-3 rounded-lg active:bg-primary-700"
        >
          <Text className="text-white font-semibold text-base">
            {user ? t('navigation.goToHome', 'Go to Home') : t('navigation.goToLogin', 'Go to Login')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
