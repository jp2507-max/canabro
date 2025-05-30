import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../../lib/contexts/ThemeContext';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';
import { OptimizedIcon, IconName } from '../ui/OptimizedIcon';

/**
 * Displays a labeled profile detail with optional icon and value(s).
 * Supports both string and string[] values, and adapts to the current theme.
 */
export interface ProfileDetailProps {
  label: string;
  value?: string | string[] | null;
  icon?: IconName;
}

const ProfileDetail: React.FC<ProfileDetailProps> = React.memo(function ProfileDetail({
  label,
  value,
  icon,
}) {
  const { isDarkMode, theme } = useTheme();
  const displayValue = value || 'Not specified';
  const hasValue = value && (Array.isArray(value) ? value.length > 0 : true);

  return (
    <ThemedView
      className="mb-3 rounded-lg p-3"
      lightClassName="bg-neutral-100"
      darkClassName="bg-neutral-800">
      <View className="mb-1.5 flex-row items-center">
        {icon && (
          <OptimizedIcon
            name={icon}
            size={18}
            color={isDarkMode ? theme.colors.primary[400] : theme.colors.primary[600]}
            style={{ marginRight: 6 }}
          />
        )}
        <ThemedText
          className="text-xs font-medium uppercase tracking-wide"
          lightClassName="text-neutral-500"
          darkClassName="text-neutral-400">
          {label}
        </ThemedText>
      </View>
      {Array.isArray(displayValue) ? (
        <View className="-mb-1 -mr-1 flex-row flex-wrap">
          {hasValue ? (
            displayValue.map((item, index) => (
              <ThemedView
                key={index}
                className="mb-1 mr-1 rounded-full px-2.5 py-0.5"
                lightClassName="bg-primary-100"
                darkClassName="bg-primary-800">
                <ThemedText
                  className="text-xs"
                  lightClassName="text-primary-700"
                  darkClassName="text-primary-200">
                  {item || ''}
                </ThemedText>
              </ThemedView>
            ))
          ) : (
            <ThemedText
              className="text-sm italic"
              lightClassName="text-neutral-500"
              darkClassName="text-neutral-500">
              None specified
            </ThemedText>
          )}
        </View>
      ) : (
        <ThemedText
          className={`text-sm ${!hasValue ? 'italic' : ''}`}
          lightClassName={hasValue ? 'text-neutral-700' : 'text-neutral-500'}
          darkClassName={hasValue ? 'text-neutral-200' : 'text-neutral-500'}>
          {displayValue}
        </ThemedText>
      )}
    </ThemedView>
  );
});

export default ProfileDetail;
