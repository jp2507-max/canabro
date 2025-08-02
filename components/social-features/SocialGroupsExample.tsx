/**
 * SocialGroupsExample - Example usage of the SocialGroups component
 * 
 * This demonstrates how to integrate the SocialGroups component
 * into an app screen or navigation structure.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { SocialGroups } from './SocialGroups';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';

interface SocialGroupsExampleProps {
  currentUserId?: string;
}

export const SocialGroupsExample: React.FC<SocialGroupsExampleProps> = ({
  currentUserId = 'example-user-id',
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const handleGroupSelect = (groupId: string) => {
    setSelectedGroupId(groupId);
    console.log('Selected group:', groupId);
  };

  return (
    <ThemedView className="flex-1">
      {/* Header */}
      <ThemedView className="px-4 py-3 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        <ThemedText className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Social Groups Example
        </ThemedText>
        {selectedGroupId && (
          <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
            Selected Group: {selectedGroupId}
          </ThemedText>
        )}
      </ThemedView>

      {/* SocialGroups Component */}
      <SocialGroups
        currentUserId={currentUserId}
        initialTab="discover"
        onGroupSelect={handleGroupSelect}
      />
    </ThemedView>
  );
};

export default SocialGroupsExample;

/**
 * Usage in a screen component:
 * 
 * ```tsx
 * import { SocialGroupsExample } from '@/components/social-features/SocialGroupsExample';
 * 
 * export function SocialGroupsScreen() {
 *   const { user } = useAuth(); // Your auth hook
 *   
 *   return (
 *     <SocialGroupsExample currentUserId={user?.id} />
 *   );
 * }
 * ```
 * 
 * Usage in navigation:
 * 
 * ```tsx
 * // In your navigation stack
 * <Stack.Screen 
 *   name="SocialGroups" 
 *   component={SocialGroupsScreen}
 *   options={{ title: 'Groups' }}
 * />
 * ```
 */