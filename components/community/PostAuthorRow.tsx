/**
 * PostAuthorRow - User avatar display with privacy selector for post creation
 *
 * Features:
 * - 48px diameter user avatar (enhanced from 40px)
 * - Privacy selector pill (32px height, 12px padding, #F2F2F7 background)
 * - "Everyone" dropdown with globe icon
 * - Proper spacing and accessibility
 * - Native SF Symbols on iOS
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
import { useTranslation } from 'react-i18next';
import UserAvatar from '@/components/community/UserAvatar';
import { NativeIconSymbol } from '@/components/ui/NativeIconSymbol';

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
  { value: 'everyone' as const, key: 'everyone', icon: 'globe' },
  { value: 'followers' as const, key: 'followers', icon: 'person.2' },
  { value: 'private' as const, key: 'private', icon: 'lock' },
];

/**
 * User avatar row with privacy selector for post creation
 */
export function PostAuthorRow({
  userAvatarUrl = '',
  userName: initialUserName,
  privacy = 'everyone',
  onPrivacyChange,
  disabled = false,
}: PostAuthorRowProps) {
  const { t } = useTranslation('community');
  const userName = initialUserName || t('postAuthorRow.you');
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false);
  const privacyScale = useSharedValue(1);
    const privacyOptionsWithLabels = React.useMemo(() => 
    PRIVACY_OPTIONS.map(option => ({...option, label: t(`postAuthorRow.privacyOptions.${option.key}`)})),
    [t]
  );

  const currentPrivacyOption = privacyOptionsWithLabels.find((option) => option.value === privacy);

  // Type guard to ensure currentPrivacyOption is never undefined
  const safePrivacyOption = currentPrivacyOption || privacyOptionsWithLabels[0]!;

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
          size={48}
          accessibilityLabel={t('postAuthorRow.accessibility.userAvatar', { userName })}
        />
        <ThemedText className="ml-4 text-lg font-medium text-neutral-900 dark:text-neutral-100">
          {userName}
        </ThemedText>
      </ThemedView>

      {/* Privacy Selector */}
      <ThemedView className="relative">
        <Animated.View style={privacyAnimatedStyle}>
          <Pressable
            onPress={handlePrivacyPress}
            disabled={disabled}
            className={`h-9 flex-row items-center rounded-full px-4 ${
              disabled ? 'opacity-50' : ''
            }`}
            style={{
              backgroundColor: '#F2F2F7',
            }}
            accessibilityLabel={t('postAuthorRow.accessibility.privacySetting', { privacy: safePrivacyOption.label })}
            accessibilityHint={t('postAuthorRow.accessibility.privacyHint')}
            accessibilityRole="button">
            <NativeIconSymbol
              name={safePrivacyOption.icon}
              size={16}
              tintColor="#6B7280"
              weight="regular"
            />
            <ThemedText className="ml-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
              {safePrivacyOption.label}
            </ThemedText>
            <NativeIconSymbol
              name="chevron-down"
              size={14}
              tintColor="#6B7280"
              weight="regular"
            />
          </Pressable>
        </Animated.View>

        {/* Privacy Dropdown */}
        {showPrivacyDropdown && (
          <Animated.View
            entering={FadeInDown.duration(200)}
            className="absolute right-0 top-12 z-50 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
            style={{ minWidth: 120 }}>
            {privacyOptionsWithLabels.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => handlePrivacySelect(option.value)}
                className="flex-row items-center px-3 py-2.5 active:bg-neutral-100 dark:active:bg-neutral-700"
                accessibilityLabel={t('postAuthorRow.accessibility.setPrivacy', { privacy: option.label })}
                accessibilityRole="button">
                <NativeIconSymbol
                  name={option.icon}
                  size={16}
                  tintColor="#6B7280"
                  weight="regular"
                />
                <ThemedText className="ml-2.5 text-sm text-neutral-900 dark:text-neutral-100">
                  {option.label}
                </ThemedText>
                {privacy === option.value && (
                  <ThemedView style={{ marginLeft: 'auto' }}>
                    <NativeIconSymbol 
                      name="checkmark" 
                      size={16} 
                      tintColor="#BAE06F"
                      weight="medium"
                    />
                  </ThemedView>
                )}
              </Pressable>
            ))}
          </Animated.View>
        )}
      </ThemedView>
    </ThemedView>
  );
}

export default PostAuthorRow;
