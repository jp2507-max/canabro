import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, FadeInLeft } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../lib/contexts/AuthProvider';
import { OptimizedIcon } from './OptimizedIcon';
import SyncStatus from './SyncStatus';
import ThemedText from './ThemedText';
import ThemedView from './ThemedView';
import UserAvatar from '../community/UserAvatar';
import * as Haptics from '@/lib/utils/haptics';

interface HomeHeaderProps {
  plantCount: number;
}

export const HomeHeader = memo(({ plantCount }: HomeHeaderProps) => {
  const { user, getProfile } = useAuth();
  const { t } = useTranslation('homeHeader');
  const [userProfile, setUserProfile] = React.useState<{
    avatar_url?: string;
    username?: string;
    full_name?: string;
  } | null>(null);

  // Fetch user profile for avatar
  React.useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        try {
          const profile = await getProfile(user.id);
          setUserProfile(profile);
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    };

    fetchProfile();
  }, [user?.id, getProfile]);

  const handleProfilePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(app)/profile');
  };

  // Memoize greeting and plant count message for performance
  const greetingConfig = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return {
        icon: 'sunny-outline' as const,
        greeting: t('home.greetings.morning'),
        colorClass: 'text-amber-500',
      };
    } else if (hour < 18) {
      return {
        icon: 'sunny-outline' as const,
        greeting: t('home.greetings.afternoon'),
        colorClass: 'text-orange-500',
      };
    } else {
      return {
        icon: 'moon-outline' as const,
        greeting: t('home.greetings.evening'),
        colorClass: 'text-violet-500',
      };
    }
  }, [t]);

  const plantCountMessage = useMemo(() => {
    if (plantCount === 0) {
      return t('home.plantCountMessages.zero');
    } else if (plantCount === 1) {
      return t('home.plantCountMessages.one');
    } else {
      return t('home.plantCountMessages.many', { count: plantCount });
    }
  }, [plantCount, t]);

  return (
    <ThemedView className="mx-4 mb-4 mt-6 rounded-2xl border border-component-300 bg-component-50 p-6 shadow-lg dark:border-component-400 dark:bg-component-100">
      <Animated.View
        entering={FadeInDown.delay(100).duration(600)}
        className="flex-row items-center justify-between">
        {/* Left side - Greeting and plant count */}
        <Animated.View entering={FadeInLeft.delay(200).duration(500)} className="flex-1">
          {/* Greeting with time-based icon */}
          <View className="mb-2 flex-row items-center">
            <OptimizedIcon
              name={greetingConfig.icon}
              size={24}
              className={greetingConfig.colorClass}
            />
            <ThemedText className="ml-2 text-lg font-semibold text-neutral-700 dark:text-neutral-200">
              {greetingConfig.greeting}
            </ThemedText>
          </View>

          {/* Main title */}
          <ThemedText className="mb-1 text-3xl font-bold text-neutral-900 dark:text-white">
            {t('myGarden')}
          </ThemedText>

          {/* Plant count with personalized message */}
          <View className="flex-row items-center">
            <OptimizedIcon
              name="leaf-outline"
              size={18}
              className="text-emerald-600 dark:text-emerald-500"
            />
            <ThemedText className="ml-1.5 text-base font-medium text-emerald-600 dark:text-emerald-400">
              {plantCountMessage}
            </ThemedText>
          </View>
        </Animated.View>

        {/* Right side - Profile avatar and sync status */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} className="ml-4 items-end space-y-3">
          {/* Profile Avatar Button */}
          <UserAvatar
            uri={userProfile?.avatar_url || ''}
            size={44}
            onPress={handleProfilePress}
            accessibilityLabel="Open profile screen"
          />
          
          <SyncStatus compact />
        </Animated.View>
      </Animated.View>

      {/* Optional: Quick stats row if plants exist */}
      {plantCount > 0 ? (
        <Animated.View
          entering={FadeInDown.delay(600).duration(500)}
          className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-700">
          <View className="flex-row justify-around">
            <View className="items-center">
              <OptimizedIcon
                name="flower-outline"
                size={20}
                className="text-violet-500 dark:text-violet-400"
              />
              <ThemedText className="mt-1 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                {t('active')}
              </ThemedText>
              <ThemedText className="text-sm font-bold text-neutral-900 dark:text-white">
                {plantCount}
              </ThemedText>
            </View>

            <View className="items-center">
              <OptimizedIcon
                name="water-outline"
                size={20}
                className="text-blue-500 dark:text-blue-400"
              />
              <ThemedText className="mt-1 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                {t('thisWeek')}
              </ThemedText>
              <ThemedText className="text-sm font-bold text-neutral-900 dark:text-white">
                {Math.ceil(plantCount * 2.5)}
              </ThemedText>
            </View>

            <View className="items-center">
              <OptimizedIcon
                name="nutrition-outline"
                size={20}
                className="text-emerald-500 dark:text-emerald-400"
              />
              <ThemedText className="mt-1 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                {t('fed')}
              </ThemedText>
              <ThemedText className="text-sm font-bold text-neutral-900 dark:text-white">
                {Math.ceil(plantCount * 0.8)}
              </ThemedText>
            </View>
          </View>
        </Animated.View>
      ) : null}
    </ThemedView>
  );
});

export default HomeHeader;
