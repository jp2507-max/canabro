/**
 * PostAuthorRow - User avatar display with privacy selector for post creation
 * 
 * Features:
 * - 28px diameter user avatar
 * - Privacy selector pill (32px height, 12px padding, #F2F2F7 background)
 * - "Everyone" dropdown with globe icon
 * - Proper spacing and accessibility
 */
import React, { useState } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { triggerLightHaptic } from '@/lib/utils/haptics';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import UserAvatar from '@/components/community/UserAvatar';
import { OptimizedIcon, type IconName } from '@/components/ui/OptimizedIcon';

export type PrivacyLevel = 'everyone' | 'followers' | 'private';

interface PostAuthorRowProps {
  userAvatarUrl?: string;
  userName?: string;
  privacy?: PrivacyLevel;
  onPrivacyChange?: (privacy: PrivacyLevel) => void;
  disabled?: boolean;
}

const SPRING_CONFIG = {
  damping: 25,
  stiffness: 600,
} as const;

const PRIVACY_OPTIONS = [
  { value: 'everyone' as const, label: 'Everyone', icon: 'globe-outline' as IconName },
  { value: 'followers' as const, label: 'Followers', icon: 'people-outline' as IconName },
  { value: 'private' as const, label: 'Private', icon: 'lock-closed-outline' as IconName },
];

/**
 * User avatar row with privacy selector for post creation
 */
export function PostAuthorRow({
  userAvatarUrl = '',
  userName = 'You',
  privacy = 'everyone',
  onPrivacyChange,
  disabled = false,
}: PostAuthorRowProps) {
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false);
  const privacyScale = useSharedValue(1);
  const currentPrivacyOption = PRIVACY_OPTIONS.find(option => option.value === privacy);
  
  // Type guard to ensure currentPrivacyOption is never undefined
  const safePrivacyOption = currentPrivacyOption || PRIVACY_OPTIONS[0]!;

  const privacyAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: privacyScale.value }],
  }));

  const handlePrivacyPress = () => {
    if (disabled) return;
    
    privacyScale.value = withSpring(0.95, SPRING_CONFIG);
    setTimeout(() => {
      privacyScale.value = withSpring(1, SPRING_CONFIG);
    }, 100);
    
    triggerLightHaptic();
    setShowPrivacyDropdown(!showPrivacyDropdown);
  };

  const handlePrivacySelect = (newPrivacy: PrivacyLevel) => {
    onPrivacyChange?.(newPrivacy);
    setShowPrivacyDropdown(false);
    triggerLightHaptic();
  };

  return (
    <ThemedView className="flex-row items-center justify-between">
      {/* User Avatar and Name */}
      <ThemedView className="flex-row items-center">
        <UserAvatar
          uri={userAvatarUrl || ''}
          size={28}
          accessibilityLabel={`${userName}'s avatar`}
        />
        <ThemedText className="ml-3 text-base font-medium text-neutral-900 dark:text-neutral-100">
          {userName}
        </ThemedText>
      </ThemedView>

      {/* Privacy Selector */}
      <ThemedView className="relative">
        <Animated.View style={privacyAnimatedStyle}>
          <Pressable
            onPress={handlePrivacyPress}
            disabled={disabled}
            className={`flex-row items-center h-8 px-3 rounded-full ${
              disabled ? 'opacity-50' : ''
            }`}
            style={{
              backgroundColor: '#F2F2F7',
            }}
            accessibilityLabel={`Privacy setting: ${safePrivacyOption.label}`}
            accessibilityHint="Tap to change privacy settings"
            accessibilityRole="button"
          >
            <OptimizedIcon
              name={safePrivacyOption.icon}
              size={14}
              className="text-neutral-600 dark:text-neutral-400"
            />
            <ThemedText className="ml-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-400">
              {safePrivacyOption.label}
            </ThemedText>
            <OptimizedIcon
              name="chevron-down"
              size={12}
              className="ml-1 text-neutral-600 dark:text-neutral-400"
            />
          </Pressable>
        </Animated.View>

        {/* Privacy Dropdown */}
        {showPrivacyDropdown && (
          <Animated.View
            entering={FadeInDown.duration(200)}
            className="absolute top-10 right-0 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden z-50"
            style={{ minWidth: 120 }}
          >
            {PRIVACY_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => handlePrivacySelect(option.value)}
                className="flex-row items-center px-3 py-2.5 active:bg-neutral-100 dark:active:bg-neutral-700"
                accessibilityLabel={`Set privacy to ${option.label}`}
                accessibilityRole="button"
              >
                <OptimizedIcon
                  name={option.icon}
                  size={16}
                  className="text-neutral-600 dark:text-neutral-400"
                />
                <ThemedText className="ml-2.5 text-sm text-neutral-900 dark:text-neutral-100">
                  {option.label}
                </ThemedText>
                {privacy === option.value && (
                  <OptimizedIcon
                    name="checkmark"
                    size={16}
                    className="ml-auto text-primary-500"
                  />
                )}
              </Pressable>
            ))}
          </Animated.View>
        )}
      </ThemedView>
    </ThemedView>
  );
}
