/**
 * SocialGroups - Main component for interest-based communities
 * 
 * Features:
 * - Group creation using existing form patterns
 * - Group discovery with search and filtering
 * - Group-specific content display
 * - Group moderation for admins
 * - Integration with existing community components
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import EnhancedKeyboardWrapper from '@/components/keyboard/EnhancedKeyboardWrapper';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import SegmentedControl, { SegmentedControlOption } from '@/components/ui/SegmentedControl';

import GroupCreationForm from './GroupCreationForm';
import GroupDiscovery from './GroupDiscovery';
import GroupContent from './GroupContent';
import GroupModeration from './GroupModeration';

export type SocialGroupsTab = 'discover' | 'my_groups' | 'create' | 'moderate';

interface SocialGroupsProps {
  currentUserId?: string;
  initialTab?: SocialGroupsTab;
  onGroupSelect?: (groupId: string) => void;
}

export const SocialGroups: React.FC<SocialGroupsProps> = ({
  currentUserId,
  initialTab = 'discover',
  onGroupSelect,
}) => {
  const { t } = useTranslation('socialGroups');
  const [activeTab, setActiveTab] = useState<SocialGroupsTab>(initialTab as SocialGroupsTab);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Define tab options for segmented control
  const tabOptions = useMemo<SegmentedControlOption[]>(() => [
    {
      key: 'discover',
      label: t('tabs.discover'),
      icon: 'search',
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      key: 'my_groups',
      label: t('tabs.myGroups'),
      icon: 'people',
      color: 'text-green-600 dark:text-green-400',
    },
    {
      key: 'create',
      label: t('tabs.create'),
      icon: 'add',
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      key: 'moderate',
      label: t('tabs.moderate'),
      icon: 'people',
      color: 'text-orange-600 dark:text-orange-400',
    },
  ], [t]);

  const handleTabChange = useCallback((tabKey: string) => {
    setActiveTab(tabKey as SocialGroupsTab);
    setSelectedGroupId(null); // Clear selection when switching tabs
  }, []);

  const handleGroupSelect = useCallback((groupId: string) => {
    setSelectedGroupId(groupId);
    onGroupSelect?.(groupId);
  }, [onGroupSelect]);

  const handleGroupCreated = useCallback((groupId: string) => {
    // Switch to my groups tab and select the newly created group
    setActiveTab('my_groups');
    setSelectedGroupId(groupId);
    onGroupSelect?.(groupId);
  }, [onGroupSelect]);

  const handleBackToList = useCallback(() => {
    setSelectedGroupId(null);
  }, []);

  // If a group is selected, show group content
  if (selectedGroupId) {
    return (
      <EnhancedKeyboardWrapper>
        <ThemedView className="flex-1">
          <GroupContent
            groupId={selectedGroupId}
            currentUserId={currentUserId}
            onBack={handleBackToList}
          />
        </ThemedView>
      </EnhancedKeyboardWrapper>
    );
  }

  return (
    <EnhancedKeyboardWrapper>
      <ThemedView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
        {/* Header */}
        <ThemedView className="px-4 pt-safe pb-4 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
          <ThemedText className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            {t('title')}
          </ThemedText>
          <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
            {t('subtitle')}
          </ThemedText>
        </ThemedView>

        {/* Tab Navigation */}
        <ThemedView className="px-4 py-3 bg-white dark:bg-neutral-800">
          <SegmentedControl
            options={tabOptions}
            selectedKey={activeTab}
            onSelectionChange={handleTabChange}
          />
        </ThemedView>

        {/* Tab Content */}
        <ThemedView className="flex-1">
          {activeTab === 'discover' && (
            <Animated.View 
              key="discover"
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              className="flex-1"
            >
              <GroupDiscovery
                currentUserId={currentUserId}
                onGroupSelect={handleGroupSelect}
              />
            </Animated.View>
          )}

          {activeTab === 'my_groups' && (
            <Animated.View 
              key="my_groups"
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              className="flex-1"
            >
              <GroupDiscovery
                currentUserId={currentUserId}
                onGroupSelect={handleGroupSelect}
                showOnlyUserGroups={true}
              />
            </Animated.View>
          )}

          {activeTab === 'create' && (
            <Animated.View 
              key="create"
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              className="flex-1"
            >
              <GroupCreationForm
                currentUserId={currentUserId}
                onGroupCreated={handleGroupCreated}
              />
            </Animated.View>
          )}

          {activeTab === 'moderate' && (
            <Animated.View 
              key="moderate"
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              className="flex-1"
            >
              <GroupModeration
                currentUserId={currentUserId}
                onGroupSelect={handleGroupSelect}
              />
            </Animated.View>
          )}
        </ThemedView>
      </ThemedView>
    </EnhancedKeyboardWrapper>
  );
};

export default SocialGroups;
