import * as Haptics from 'expo-haptics';
import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import ProfileDetail from './ProfileDetail';
import StatItem from './StatItem';
import { useSyncContext } from '../../lib/contexts/SyncContext';
import { Profile } from '../../lib/models/Profile';
import SyncStatus from '../ui/SyncStatus';
import ThemeToggle from '../ui/ThemeToggle';
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
 * Enhanced with sophisticated animations and modern UX patterns.
 */
const ProfileScreenBase: React.FC<ProfileScreenBaseProps> = function ProfileScreenBase({
  profile,
  plantsCount,
  postsCount,
  isRefreshing = false,
  onRefresh,
}) {
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
      syncButtonScale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    })
    .onFinalize(() => {
      syncButtonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
    })
    .onEnd(() => {
      handleSyncPress();
    });

  const syncAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: syncButtonScale.value }],
    };
  });

  return (
    <ThemedView variant="default" className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#22c55e']} // primary-500
              tintColor="#22c55e"
            />
          ) : undefined
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Animated Header */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(600)}
          className="mb-6 flex-row items-center justify-between">
          <ThemedText
            variant="heading"
            className="text-3xl font-extrabold text-neutral-900 dark:text-neutral-100">
            Profile
          </ThemedText>
          <Animated.View entering={FadeIn.delay(200).duration(500)}>
            <ThemeToggle />
          </Animated.View>
        </Animated.View>

        {/* Animated Stats Section */}
        <Animated.View entering={SlideInDown.delay(300).duration(700)} className="mb-8 flex-row">
          <StatItem
            value={plantsCount}
            label="Plants"
            icon="leaf"
            index={0}
            // onPress={() => {
            //   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            //   // TODO: Navigate to plants list
            // }}
          />
          <StatItem
            value={postsCount}
            label="Posts"
            icon="chatbubble-ellipses"
            index={1}
            // onPress={() => {
            //   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            //   // TODO: Navigate to posts list
            // }}
          />
        </Animated.View>

        {/* Animated Profile Details */}
        <View className="mb-8">
          <ProfileDetail label="Username" value={profile?.username} icon="person" index={0} />
          <ProfileDetail label="User ID" value={profile?.userId} icon="mail" index={1} />
          <ProfileDetail
            label="Experience"
            value={profile?.experienceLevel}
            icon="medal"
            index={2}
          />
          <ProfileDetail
            label="Grow Method"
            value={profile?.preferredGrowMethod}
            icon="flower"
            index={3}
          />
        </View>

        {/* Animated Sync Status Section */}
        <Animated.View entering={FadeInDown.delay(800).duration(600)} className="mb-4">
          <ThemedText
            variant="heading"
            className="mb-4 text-xl font-bold text-neutral-800 dark:text-neutral-200">
            Data Synchronization
          </ThemedText>
          <GestureDetector gesture={syncGesture}>
            <Animated.View style={syncAnimatedStyle}>
              <SyncStatus />
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      </ScrollView>
    </ThemedView>
  );
};

export default React.memo(ProfileScreenBase);
