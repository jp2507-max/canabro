/**
 * GroupModeration - Component for group moderation and admin features
 * 
 * Features:
 * - Uses SegmentedControl for admin interface navigation
 * - Group management tools for admins and moderators
 * - Member management and role assignment
 * - Content moderation and group settings
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Pressable, Alert, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { FlashListWrapper } from '@/components/ui/FlashListWrapper';
import SegmentedControl, { SegmentedControlOption } from '@/components/ui/SegmentedControl';
import { EnhancedTextInput } from '@/components/ui/EnhancedTextInput';
import TagPill from '@/components/ui/TagPill';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import AnimatedButton from '@/components/buttons/AnimatedButton';
import UserAvatar from '@/components/community/UserAvatar';
import { triggerLightHaptic, triggerSuccessHaptic } from '@/lib/utils/haptics';

import { SocialGroup, GroupSettings } from '@/lib/models/SocialGroup';
import { GroupMember } from '@/lib/models/GroupMember';

interface GroupModerationProps {
  currentUserId?: string;
  onGroupSelect?: (groupId: string) => void;
}

type ModerationTab = 'my_groups' | 'settings' | 'members' | 'reports';

const MODERATION_TABS: SegmentedControlOption[] = [
  {
    key: 'my_groups',
    label: 'My Groups',
    icon: 'settings',
    color: 'text-blue-600 dark:text-blue-400',
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: 'cog',
    color: 'text-green-600 dark:text-green-400',
  },
  {
    key: 'members',
    label: 'Members',
    icon: 'people',
    color: 'text-purple-600 dark:text-purple-400',
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: 'flag',
    color: 'text-red-600 dark:text-red-400',
  },
];

interface ModeratedGroupCardProps {
  group: SocialGroup;
  userRole: string;
  onSelect: (groupId: string) => void;
  onManage: (groupId: string) => void;
}

const ModeratedGroupCard: React.FC<ModeratedGroupCardProps> = ({
  group,
  userRole,
  onSelect,
  onManage,
}) => {
  const { t } = useTranslation('socialGroups');

  const getRoleColor = useCallback((role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300';
      case 'moderator':
        return 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  }, []);

  return (
    <ThemedView className="mb-4 mx-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700">
      <ThemedView className="p-4">
        <ThemedView className="flex-row items-start justify-between mb-3">
          <ThemedView className="flex-1">
            <ThemedText className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1">
              {group.name}
            </ThemedText>
            <ThemedView className="flex-row items-center">
              <ThemedView className={`px-2 py-1 rounded-full mr-2 ${getRoleColor(userRole)}`}>
                <ThemedText className="text-xs font-medium">
                  {t(`roles.${userRole}`)}
                </ThemedText>
              </ThemedView>
              <ThemedText className="text-sm text-neutral-500 dark:text-neutral-400">
                {group.memberCount} {t('moderation.members')}
              </ThemedText>
            </ThemedView>
          </ThemedView>
          
          <OptimizedIcon
            name={group.isPublic ? 'globe' : 'lock-closed'}
            size={20}
            className="text-neutral-500 dark:text-neutral-400"
          />
        </ThemedView>

        <ThemedText 
          className="text-sm text-neutral-700 dark:text-neutral-300 mb-3"
          numberOfLines={2}
        >
          {group.description}
        </ThemedText>

        <ThemedView className="flex-row justify-between">
          <Pressable
            onPress={() => onSelect(group.id)}
            className="flex-1 bg-blue-500 py-2 px-4 rounded-lg mr-2"
          >
            <ThemedText className="text-white text-center font-medium">
              {t('moderation.viewGroup')}
            </ThemedText>
          </Pressable>
          
          {(userRole === 'admin' || userRole === 'moderator') && (
            <Pressable
              onPress={() => onManage(group.id)}
              className="flex-1 bg-green-500 py-2 px-4 rounded-lg ml-2"
            >
              <ThemedText className="text-white text-center font-medium">
                {t('moderation.manage')}
              </ThemedText>
            </Pressable>
          )}
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
};

interface GroupSettingsFormProps {
  group: SocialGroup;
  onUpdate: (settings: Partial<GroupSettings>) => void;
}

const GroupSettingsForm: React.FC<GroupSettingsFormProps> = ({ group, onUpdate }) => {
  const { t } = useTranslation('socialGroups');
  const [settings, setSettings] = useState<GroupSettings>(group.settings);

  const handleSettingChange = useCallback((key: keyof GroupSettings, value: unknown) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onUpdate(newSettings);
  }, [settings, onUpdate]);

  const moderationLevels = [
    { key: 'low', label: t('moderation.levels.low') },
    { key: 'medium', label: t('moderation.levels.medium') },
    { key: 'high', label: t('moderation.levels.high') },
  ];

  return (
    <ScrollView className="flex-1 p-4">
      <ThemedView className="bg-white dark:bg-neutral-800 rounded-2xl p-4 mb-4">
        <ThemedText className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          {t('moderation.groupSettings')}
        </ThemedText>

        {/* Privacy Setting */}
        <ThemedView className="mb-4">
          <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            {t('moderation.privacy')}
          </ThemedText>
          <ThemedView className="flex-row">
            <TagPill
              text={t('moderation.public')}
              selected={settings.isPublic}
              onPress={() => handleSettingChange('isPublic', true)}
              variant="green"
              className="mr-2"
            />
            <TagPill
              text={t('moderation.private')}
              selected={!settings.isPublic}
              onPress={() => handleSettingChange('isPublic', false)}
              variant="neutral"
            />
          </ThemedView>
        </ThemedView>

        {/* Moderation Level */}
        <ThemedView className="mb-4">
          <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            {t('moderation.moderationLevel')}
          </ThemedText>
          <ThemedView className="flex-row flex-wrap">
            {moderationLevels.map((level) => (
              <TagPill
                key={level.key}
                text={level.label}
                selected={settings.moderationLevel === level.key}
                onPress={() => handleSettingChange('moderationLevel', level.key)}
                variant="category"
                className="mr-2 mb-2"
              />
            ))}
          </ThemedView>
        </ThemedView>

        {/* Max Members */}
        <ThemedView className="mb-4">
          <EnhancedTextInput
            label={t('moderation.maxMembers')}
            value={settings.maxMembers.toString()}
            onChangeText={(text) => {
              const num = parseInt(text) || 1000;
              handleSettingChange('maxMembers', num);
            }}
            keyboardType="numeric"
          />
        </ThemedView>

        {/* Other Settings */}
        <ThemedView className="space-y-3">
          <ThemedView className="flex-row items-center justify-between py-2">
            <ThemedText className="text-sm text-neutral-700 dark:text-neutral-300">
              {t('moderation.allowInvites')}
            </ThemedText>
            <Pressable
              onPress={() => handleSettingChange('allowInvites', !settings.allowInvites)}
              className={`w-12 h-6 rounded-full ${
                settings.allowInvites ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-600'
              }`}
            >
              <ThemedView
                className={`w-5 h-5 rounded-full bg-white mt-0.5 ${
                  settings.allowInvites ? 'ml-6' : 'ml-0.5'
                }`}
              />
            </Pressable>
          </ThemedView>

          <ThemedView className="flex-row items-center justify-between py-2">
            <ThemedText className="text-sm text-neutral-700 dark:text-neutral-300">
              {t('moderation.requireApproval')}
            </ThemedText>
            <Pressable
              onPress={() => handleSettingChange('requireApproval', !settings.requireApproval)}
              className={`w-12 h-6 rounded-full ${
                settings.requireApproval ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-600'
              }`}
            >
              <ThemedView
                className={`w-5 h-5 rounded-full bg-white mt-0.5 ${
                  settings.requireApproval ? 'ml-6' : 'ml-0.5'
                }`}
              />
            </Pressable>
          </ThemedView>

          <ThemedView className="flex-row items-center justify-between py-2">
            <ThemedText className="text-sm text-neutral-700 dark:text-neutral-300">
              {t('moderation.allowFileSharing')}
            </ThemedText>
            <Pressable
              onPress={() => handleSettingChange('allowFileSharing', !settings.allowFileSharing)}
              className={`w-12 h-6 rounded-full ${
                settings.allowFileSharing ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-600'
              }`}
            >
              <ThemedView
                className={`w-5 h-5 rounded-full bg-white mt-0.5 ${
                  settings.allowFileSharing ? 'ml-6' : 'ml-0.5'
                }`}
              />
            </Pressable>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
};

export const GroupModeration: React.FC<GroupModerationProps> = ({
  currentUserId,
  onGroupSelect,
}) => {
  const { t } = useTranslation('socialGroups');
  const database = useDatabase();
  
  const [activeTab, setActiveTab] = useState<ModerationTab>('my_groups');
  const [moderatedGroups, setModeratedGroups] = useState<Array<{ group: SocialGroup; role: string }>>([]);
  const [selectedGroup, setSelectedGroup] = useState<SocialGroup | null>(null);
  const [loading, setLoading] = useState(true);

  // Load groups where user is admin or moderator
  const loadModeratedGroups = useCallback(async () => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      const membersCollection = database.get<GroupMember>('group_members');
      const userMemberships = await membersCollection.query(
        Q.where('user_id', currentUserId),
        Q.where('is_active', true),
        Q.or(
          Q.where('role', 'admin'),
          Q.where('role', 'moderator')
        )
      ).fetch();

      const groupsWithRoles = await Promise.all(
        userMemberships.map(async (membership) => {
          const group = await membership.group.fetch();
          return { group, role: membership.role };
        })
      );

      setModeratedGroups(groupsWithRoles);
    } catch (error) {
      console.error('Error loading moderated groups:', error);
    } finally {
      setLoading(false);
    }
  }, [database, currentUserId]);

  useEffect(() => {
    loadModeratedGroups();
  }, [loadModeratedGroups]);

  const handleGroupSelect = useCallback((groupId: string) => {
    onGroupSelect?.(groupId);
  }, [onGroupSelect]);

  const handleGroupManage = useCallback((groupId: string) => {
    const groupData = moderatedGroups.find(g => g.group.id === groupId);
    if (groupData) {
      setSelectedGroup(groupData.group);
      setActiveTab('settings');
    }
  }, [moderatedGroups]);

  const handleSettingsUpdate = useCallback(async (newSettings: Partial<GroupSettings>) => {
    if (!selectedGroup) return;

    try {
      await database.write(async () => {
        await selectedGroup.updateSettings(newSettings);
      });
      
      triggerSuccessHaptic();
      loadModeratedGroups(); // Reload to update group data
    } catch (error) {
      console.error('Error updating group settings:', error);
      Alert.alert(t('moderation.errors.updateFailed'));
    }
  }, [selectedGroup, database, loadModeratedGroups, t]);

  const renderModeratedGroup = useCallback(({ item }: { item: { group: SocialGroup; role: string } }) => (
    <ModeratedGroupCard
      group={item.group}
      userRole={item.role}
      onSelect={handleGroupSelect}
      onManage={handleGroupManage}
    />
  ), [handleGroupSelect, handleGroupManage]);

  if (!currentUserId) {
    return (
      <ThemedView className="flex-1 items-center justify-center p-8">
        <OptimizedIcon
          name="log-in-outline"
          size={64}
          className="text-neutral-300 dark:text-neutral-600 mb-4"
        />
        <ThemedText className="text-lg font-medium text-neutral-500 dark:text-neutral-400 text-center">
          {t('moderation.loginRequired')}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      {/* Tab Navigation */}
      <ThemedView className="px-4 py-3 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        <SegmentedControl
          options={MODERATION_TABS}
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as ModerationTab)}
        />
      </ThemedView>

      {/* Tab Content */}
      <ThemedView className="flex-1">
        {activeTab === 'my_groups' && (
          <Animated.View 
            key="my_groups"
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            className="flex-1"
          >
            {loading ? (
              <ThemedView className="flex-1 items-center justify-center">
                <ThemedText className="text-neutral-500 dark:text-neutral-400">
                  {t('moderation.loading')}
                </ThemedText>
              </ThemedView>
            ) : moderatedGroups.length > 0 ? (
              <FlashListWrapper
                data={moderatedGroups}
                renderItem={renderModeratedGroup}
                estimatedItemSize={160}
                keyExtractor={(item) => item.group.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 8 }}
              />
            ) : (
              <ThemedView className="flex-1 items-center justify-center p-8">
                <OptimizedIcon
                  name="shield-outline"
                  size={64}
                  className="text-neutral-300 dark:text-neutral-600 mb-4"
                />
                <ThemedText className="text-lg font-medium text-neutral-500 dark:text-neutral-400 text-center">
                  {t('moderation.noModeratedGroups')}
                </ThemedText>
                <ThemedText className="text-sm text-neutral-400 dark:text-neutral-500 text-center mt-2">
                  {t('moderation.createOrJoinGroups')}
                </ThemedText>
              </ThemedView>
            )}
          </Animated.View>
        )}

        {activeTab === 'settings' && (
          <Animated.View 
            key="settings"
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            className="flex-1"
          >
            {selectedGroup ? (
              <GroupSettingsForm
                group={selectedGroup}
                onUpdate={handleSettingsUpdate}
              />
            ) : (
              <ThemedView className="flex-1 items-center justify-center p-8">
                <OptimizedIcon
                  name="settings-outline"
                  size={64}
                  className="text-neutral-300 dark:text-neutral-600 mb-4"
                />
                <ThemedText className="text-lg font-medium text-neutral-500 dark:text-neutral-400 text-center">
                  {t('moderation.selectGroupToManage')}
                </ThemedText>
              </ThemedView>
            )}
          </Animated.View>
        )}

        {activeTab === 'members' && (
          <Animated.View 
            key="members"
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            className="flex-1 items-center justify-center p-8"
          >
            <OptimizedIcon
              name="people-outline"
              size={64}
              className="text-neutral-300 dark:text-neutral-600 mb-4"
            />
            <ThemedText className="text-lg font-medium text-neutral-500 dark:text-neutral-400 text-center">
              {t('moderation.memberManagementComingSoon')}
            </ThemedText>
          </Animated.View>
        )}

        {activeTab === 'reports' && (
          <Animated.View 
            key="reports"
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            className="flex-1 items-center justify-center p-8"
          >
            <OptimizedIcon
              name="flag-outline"
              size={64}
              className="text-neutral-300 dark:text-neutral-600 mb-4"
            />
            <ThemedText className="text-lg font-medium text-neutral-500 dark:text-neutral-400 text-center">
              {t('moderation.reportsComingSoon')}
            </ThemedText>
          </Animated.View>
        )}
      </ThemedView>
    </ThemedView>
  );
};

export default GroupModeration;