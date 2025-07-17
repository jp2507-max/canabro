import * as Haptics from '@/lib/utils/haptics';
import React from 'react';
import { ScrollView, RefreshControl, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import ProfileDetail from './ProfileDetail';
import StatItem from './StatItem';
import { useSyncContext } from '../../lib/contexts/SyncContext';
import { Profile } from '../../lib/models/Profile';
import SyncStatus from '../ui/SyncStatus';
import ThemeToggle from '../ui/ThemeToggle';
import LanguageToggle from '../ui/LanguageToggle';

import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

/**
 * Props for the main profile screen content.
 */
export interface ProfileScreenBaseProps {
  profile: Profile | null;
  plantsCount: number;
  postsCount: number;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

/**
 * Main profile screen layout, displaying user details and stats.
 * Enhanced with modern responsive design, safe area handling, and sophisticated animations.
 */
const ProfileScreenBase: React.FC<ProfileScreenBaseProps> = function ProfileScreenBase({
  profile,
  plantsCount,
  postsCount,
  isRefreshing = false,
  onRefresh,
}) {
  const { t } = useTranslation();
  const { triggerSync } = useSyncContext();

  const syncButtonScale = useSharedValue(1);

  // Handle manual sync trigger with haptic feedback
  const handleSyncPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (triggerSync) triggerSync(true);
  };

  // Animated sync button gesture
  const syncGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      syncButtonScale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    })
    .onFinalize(() => {
      'worklet';
      syncButtonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
    })
    .onEnd(() => {
      'worklet';
      runOnJS(handleSyncPress)();
    });

  const syncAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: syncButtonScale.value }],
    };
  });

  // Semantic color mapping for RefreshControl (should match your Tailwind config)
  const colorScheme = useColorScheme();
  const semanticColors = {
    primary500: '#22c55e', // Tailwind primary-500 (green-500)
    neutral800: '#262626', // Tailwind neutral-800
    white: '#ffffff',
  };

  return (
    <SafeAreaView 
      className="flex-1 bg-neutral-50 dark:bg-neutral-900"
      edges={['top', 'left', 'right']}>
      <ThemedView className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ 
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 32,
            flexGrow: 1 
          }}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                colors={[semanticColors.primary500]}
                tintColor={semanticColors.primary500}
                progressBackgroundColor={colorScheme === 'dark' ? semanticColors.neutral800 : semanticColors.white}
              />
            ) : undefined
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces>

          {/* Modern Header Section */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(600)}
            className="mb-8 flex-row items-center justify-between">
            <ThemedText
              variant="heading"
              className="text-3xl font-extrabold text-neutral-900 dark:text-neutral-100"
              accessibilityRole="header">
              {t('profile.title')}
            </ThemedText>
            <Animated.View 
              entering={FadeIn.delay(200).duration(500)} 
              className="flex-row items-center space-x-3">
              <LanguageToggle compact />
              <ThemeToggle />
            </Animated.View>
          </Animated.View>



          {/* Enhanced Stats Section with Grid Layout */}
          <Animated.View 
            entering={SlideInDown.delay(300).duration(700)} 
            className="mb-8">
            <ThemedText
              variant="heading"
              className="mb-4 text-xl font-bold text-neutral-800 dark:text-neutral-200"
              accessibilityRole="header">
              {t('profile.sections.statistics')}
            </ThemedText>
            <ThemedView className="flex-row space-x-4">
              <StatItem
                value={plantsCount}
                label={t('profile.statistics.plants')}
                icon="leaf"
                index={0}
                // onPress={() => {
                //   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                //   // TODO: Navigate to plants list
                // }}
              />
              <StatItem
                value={postsCount}
                label={t('profile.statistics.posts')}
                icon="chatbubble-ellipses"
                index={1}
                // onPress={() => {
                //   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                //   // TODO: Navigate to posts list
                // }}
              />
            </ThemedView>
          </Animated.View>

          {/* Profile Information Section */}
          <Animated.View
            entering={FadeInDown.delay(500).duration(600)}
            className="mb-8">
            <ThemedText
              variant="heading"
              className="mb-4 text-xl font-bold text-neutral-800 dark:text-neutral-200"
              accessibilityRole="header">
              {t('profile.sections.information')}
            </ThemedText>
            <ProfileDetail 
              label={t('profile.information.username')} 
              value={profile?.username} 
              icon="person" 
              index={0} 
            />
            <ProfileDetail 
              label={t('profile.information.userId')} 
              value={profile?.userId} 
              icon="mail" 
              index={1} 
            />
            <ProfileDetail
              label={t('profile.information.experience')}
              value={profile?.experienceLevel}
              icon="medal"
              index={2}
            />
            <ProfileDetail
              label={t('profile.information.growMethod')}
              value={profile?.preferredGrowMethod}
              icon="flower"
              index={3}
            />
          </Animated.View>

          {/* Data Synchronization Section */}
          <Animated.View 
            entering={FadeInDown.delay(700).duration(600)}
            className="mb-4">
            <ThemedText
              variant="heading"
              className="mb-4 text-xl font-bold text-neutral-800 dark:text-neutral-200"
              accessibilityRole="header">
              {t('profile.sections.synchronization')}
            </ThemedText>
            <GestureDetector gesture={syncGesture}>
              <Animated.View style={syncAnimatedStyle}>
                <SyncStatus />
              </Animated.View>
            </GestureDetector>
          </Animated.View>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
};

export default React.memo(ProfileScreenBase);
