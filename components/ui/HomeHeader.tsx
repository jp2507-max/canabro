import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, FadeInLeft } from 'react-native-reanimated';

import { OptimizedIcon } from './OptimizedIcon';
import SyncStatus from './SyncStatus';
import ThemedText from './ThemedText';
import ThemedView from './ThemedView';
import { useTheme } from '../../lib/contexts/ThemeContext';

interface HomeHeaderProps {
  plantCount: number;
}

export const HomeHeader = memo(({ plantCount }: HomeHeaderProps) => {
  const { isDarkMode } = useTheme();

  // Memoize greeting and plant count message for performance
  const greetingConfig = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return {
        icon: 'sunny-outline' as const,
        greeting: 'Good Morning',
        color: '#f59e0b', // amber-500
      };
    } else if (hour < 18) {
      return {
        icon: 'sunny-outline' as const,
        greeting: 'Good Afternoon', 
        color: '#f97316', // orange-500
      };
    } else {
      return {
        icon: 'moon-outline' as const,
        greeting: 'Good Evening',
        color: '#8b5cf6', // violet-500
      };
    }
  }, []);

  const plantCountMessage = useMemo(() => {
    if (plantCount === 0) {
      return "Ready to start your grow journey?";
    } else if (plantCount === 1) {
      return "Caring for 1 beautiful plant 🌱";
    } else {
      return `Growing ${plantCount} amazing plants 🌿`;
    }
  }, [plantCount]);

  return (
    <ThemedView 
      className="mx-4 mt-6 mb-4 rounded-2xl p-6 shadow-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
    >
      <Animated.View 
        entering={FadeInDown.delay(100).duration(600)}
        className="flex-row items-center justify-between"
      >
        {/* Left side - Greeting and plant count */}
        <Animated.View 
          entering={FadeInLeft.delay(200).duration(500)}
          className="flex-1"
        >
          {/* Greeting with time-based icon */}
          <View className="flex-row items-center mb-2">
            <OptimizedIcon
              name={greetingConfig.icon}
              size={24}
              color={greetingConfig.color}
            />
            <ThemedText 
              className="ml-2 text-lg font-semibold text-neutral-700 dark:text-neutral-200"
            >
              {greetingConfig.greeting}
            </ThemedText>
          </View>

          {/* Main title */}
          <ThemedText 
            className="text-3xl font-bold mb-1 text-neutral-900 dark:text-white"
          >
            My Garden
          </ThemedText>

          {/* Plant count with personalized message */}
          <View className="flex-row items-center">
            <OptimizedIcon
              name="leaf-outline"
              size={18}
              color={isDarkMode ? '#10b981' : '#059669'} // emerald-500/600
            />
            <ThemedText 
              className="ml-1.5 text-base font-medium text-emerald-600 dark:text-emerald-400"
            >
              {plantCountMessage}
            </ThemedText>
          </View>
        </Animated.View>

        {/* Right side - Sync status with enhanced styling */}
        <Animated.View 
          entering={FadeInDown.delay(400).duration(500)}
          className="ml-4"
        >
          <SyncStatus compact />
        </Animated.View>
      </Animated.View>

      {/* Optional: Quick stats row if plants exist */}
      {plantCount > 0 && (
        <Animated.View 
          entering={FadeInDown.delay(600).duration(500)}
          className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700"
        >
          <View className="flex-row justify-around">
            <View className="items-center">
              <OptimizedIcon
                name="flower-outline"
                size={20}
                color={isDarkMode ? '#a78bfa' : '#8b5cf6'} // violet-400/500
              />
              <ThemedText 
                className="mt-1 text-xs font-medium text-neutral-600 dark:text-neutral-400"
              >
                Active
              </ThemedText>
              <ThemedText 
                className="text-sm font-bold text-neutral-900 dark:text-white"
              >
                {plantCount}
              </ThemedText>
            </View>
            
            <View className="items-center">
              <OptimizedIcon
                name="water-outline"
                size={20}
                color={isDarkMode ? '#60a5fa' : '#3b82f6'} // blue-400/500
              />
              <ThemedText 
                className="mt-1 text-xs font-medium text-neutral-600 dark:text-neutral-400"
              >
                This Week
              </ThemedText>
              <ThemedText 
                className="text-sm font-bold text-neutral-900 dark:text-white"
              >
                {Math.ceil(plantCount * 2.5)}
              </ThemedText>
            </View>

            <View className="items-center">
              <OptimizedIcon
                name="nutrition-outline"
                size={20}
                color={isDarkMode ? '#34d399' : '#10b981'} // emerald-400/500
              />
              <ThemedText 
                className="mt-1 text-xs font-medium text-neutral-600 dark:text-neutral-400"
              >
                Fed
              </ThemedText>
              <ThemedText 
                className="text-sm font-bold text-neutral-900 dark:text-white"
              >
                {Math.ceil(plantCount * 0.8)}
              </ThemedText>
            </View>
          </View>
        </Animated.View>
      )}
    </ThemedView>
  );
});

export default HomeHeader;
