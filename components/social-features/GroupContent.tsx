/**
 * GroupContent - Component for displaying group-specific content
 * 
 * Features:
 * - Uses existing PostItem and community components
 * - Group header with member info and join/leave functionality
 * - Group-specific posts and discussions
 * - Member management for admins
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Pressable, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { log as logger } from '@/lib/utils/logger';

import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { FlashListWrapper } from '@/components/ui/FlashListWrapper';
import SegmentedControl, { SegmentedControlOption } from '@/components/ui/SegmentedControl';
import TagPill from '@/components/ui/TagPill';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import NetworkResilientImage from '@/components/ui/NetworkResilientImage';
import AnimatedButton from '@/components/buttons/AnimatedButton';
import PostItem from '@/components/community/PostItem';
import UserAvatar from '@/components/community/UserAvatar';
import { triggerLightHaptic, triggerSuccessHaptic } from '@/lib/utils/haptics';

import { SocialGroup } from '@/lib/models/SocialGroup';
import { GroupMember } from '@/lib/models/GroupMember';
import { PostData } from '@/lib/types/community';

interface GroupContentProps {
  groupId: string;
  currentUserId?: string;
  onBack?: () => void;
}

type GroupContentTab = 'posts' | 'members' | 'about';

const CONTENT_TABS: SegmentedControlOption[] = [
  {
    key: 'posts',
    label: 'Posts',
    icon: 'chatbubble-ellipses',
    color: 'text-blue-600 dark:text-blue-400',
  },
  {
    key: 'members',
    label: 'Members',
    icon: 'people',
    color: 'text-green-600 dark:text-green-400',
  },
  {
    key: 'about',
    label: 'About',
    icon: 'help-circle',
    color: 'text-purple-600 dark:text-purple-400',
  },
];

interface MemberItemProps {
  member: GroupMember;
  currentUserId?: string;
  canManageMembers?: boolean;
  onMemberAction?: (memberId: string, action: 'promote' | 'demote' | 'remove') => void;
}

const MemberItem: React.FC<MemberItemProps> = ({
  member,
  currentUserId,
  canManageMembers = false,
  onMemberAction,
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

  const handleMemberAction = useCallback((action: 'promote' | 'demote' | 'remove') => {
    onMemberAction?.(member.id, action);
  }, [member.id, onMemberAction]);

  return (
    <ThemedView className="flex-row items-center p-4 border-b border-neutral-100 dark:border-neutral-800">
      <UserAvatar uri={`https://via.placeholder.com/40`} size={40} />
      
      <ThemedView className="flex-1 ml-3">
        <ThemedText className="font-medium text-neutral-900 dark:text-neutral-100">
          {member.userId.slice(0, 8)}
        </ThemedText>
        <ThemedView className="flex-row items-center mt-1">
          <ThemedView className={`px-2 py-1 rounded-full ${getRoleColor(member.role)}`}>
            <ThemedText className="text-xs font-medium">
              {t(`roles.${member.role}`)}
            </ThemedText>
          </ThemedView>
          <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400 ml-2">
            {t('content.memberSince', { days: member.daysSinceJoined })}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      {canManageMembers && member.userId !== currentUserId && (
        <ThemedView className="flex-row">
          {member.role === 'member' && (
            <Pressable
              onPress={() => handleMemberAction('promote')}
              className="p-2 mr-1"
            >
                <OptimizedIcon
                  name="chevron-up"
                  size={20}
                  className="text-green-600 dark:text-green-400"
                />
            </Pressable>
          )}
          {member.role === 'moderator' && (
            <Pressable
              onPress={() => handleMemberAction('demote')}
              className="p-2 mr-1"
            >
                <OptimizedIcon
                  name="chevron-down"
                  size={20}
                  className="text-orange-600 dark:text-orange-400"
                />
            </Pressable>
          )}
          <Pressable
            onPress={() => handleMemberAction('remove')}
            className="p-2"
          >
            <OptimizedIcon
              name="close-circle"
              size={20}
              className="text-red-600 dark:text-red-400"
            />
          </Pressable>
        </ThemedView>
      )}
    </ThemedView>
  );
};

export const GroupContent: React.FC<GroupContentProps> = ({
  groupId,
  currentUserId,
  onBack,
}) => {
  const { t } = useTranslation('socialGroups');
  const database = useDatabase();
  
  const [group, setGroup] = useState<SocialGroup | null>(null);
  const [userMembership, setUserMembership] = useState<GroupMember | null>(null);
  const [activeTab, setActiveTab] = useState<GroupContentTab>('posts');
  const [posts, setPosts] = useState<PostData[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  // Load group data
  const loadGroupData = useCallback(async () => {
    try {
      const groupsCollection = database.get<SocialGroup>('social_groups');
      const fetchedGroup = await groupsCollection.find(groupId);
      setGroup(fetchedGroup);

      // Load user membership if logged in
      if (currentUserId) {
        const membersCollection = database.get<GroupMember>('group_members');
        try {
          const membership = await membersCollection.query(
            Q.where('group_id', groupId),
            Q.where('user_id', currentUserId),
            Q.where('is_active', true)
          ).fetch();
          setUserMembership(membership[0] || null);
        } catch (_error) {
          setUserMembership(null);
        }
      }

      // Load members
      const membersCollection = database.get<GroupMember>('group_members');
      const fetchedMembers = await membersCollection.query(
        Q.where('group_id', groupId),
        Q.where('is_active', true),
        Q.sortBy('role', Q.desc), // Admins first
        Q.sortBy('joined_at', Q.asc)
      ).fetch();
      setMembers(fetchedMembers);

      // TODO: Load group-specific posts
      // This would require extending the posts system to support group filtering
      setPosts([]);

    } catch (_error) {
      logger.error('Error loading group data:', _error);
    } finally {
      setLoading(false);
    }
  }, [database, groupId, currentUserId]);

  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

  const canManageMembers = useMemo(() => {
    return userMembership?.canManageMembers || false;
  }, [userMembership]);


  const handleJoinGroup = useCallback(async () => {
    if (!currentUserId || !group) return;

    setJoining(true);
    try {
      await database.write(async () => {
        const membersCollection = database.get<GroupMember>('group_members');
        await membersCollection.create((member) => {
          member.groupId = groupId;
          member.userId = currentUserId;
          member.role = 'member';
          member.permissions = {
            canPost: true,
            canComment: true,
            canInvite: false,
            canModerate: false,
            canManageMembers: false,
            canEditGroup: false,
          };
          member.isActive = true;
        });

        // Update group member count
        await group.incrementMemberCount();
      });

      triggerSuccessHaptic();
      loadGroupData(); // Reload to update membership status
    } catch (_error) {
      logger.error('Error joining group:', _error);
      Alert.alert(t('content.errors.joinFailed'));
    } finally {
      setJoining(false);
    }
  }, [currentUserId, group, groupId, database, loadGroupData, t]);

  const handleLeaveGroup = useCallback(async () => {
    if (!userMembership || !group) return;

    Alert.alert(
      t('content.leaveGroup'),
      t('content.leaveGroupConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.leave'),
          style: 'destructive',
          onPress: async () => {
            try {
              await database.write(async () => {
                await userMembership.markAsDeleted();
                await group.decrementMemberCount();
              });
              
              triggerLightHaptic();
              onBack?.(); // Go back to discovery
            } catch (_error) {
              logger.error('Error leaving group:', _error);
              Alert.alert(t('content.errors.leaveFailed'));
            }
          },
        },
      ]
    );
  }, [userMembership, group, database, onBack, t]);

  const handleMemberAction = useCallback(async (
    memberId: string, 
    action: 'promote' | 'demote' | 'remove'
  ) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const actionText = t(`content.memberActions.${action}`);
    Alert.alert(
      t('content.confirmAction'),
      t('content.confirmActionMessage', { action: actionText }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: actionText,
          style: action === 'remove' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await database.write(async () => {
                switch (action) {
                  case 'promote':
                    await member.promoteToModerator();
                    break;
                  case 'demote':
                    await member.demoteToMember();
                    break;
                  case 'remove':
                    await member.markAsDeleted();
                    if (group) {
                      await group.decrementMemberCount();
                    }
                    break;
                }
              });
              
              triggerLightHaptic();
              loadGroupData(); // Reload to update member list
            } catch (_error) {
              logger.error(`Error ${action} member:`, _error);
              Alert.alert(t('content.errors.memberActionFailed'));
            }
          },
        },
      ]
    );
  }, [members, database, group, loadGroupData, t]);

  const renderPostItem = useCallback(({ item }: { item: PostData }) => (
    <PostItem
      post={item}
      currentUserId={currentUserId}
      onLike={() => {}} // TODO: Implement group post interactions
      onComment={() => {}}
      onUserPress={() => {}}
    />
  ), [currentUserId]);

  const renderMemberItem = useCallback(({ item }: { item: GroupMember }) => (
    <MemberItem
      member={item}
      currentUserId={currentUserId}
      canManageMembers={canManageMembers}
      onMemberAction={handleMemberAction}
    />
  ), [currentUserId, canManageMembers, handleMemberAction]);

  if (loading || !group) {
    return (
      <ThemedView className="flex-1 items-center justify-center">
        <ThemedText className="text-neutral-500 dark:text-neutral-400">
          {t('content.loading')}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      {/* Header */}
      <ThemedView className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        {/* Navigation */}
        <ThemedView className="flex-row items-center px-4 pt-safe pb-2">
          <Pressable onPress={onBack} className="mr-3 p-2">
            <OptimizedIcon
              name="chevron-back"
              size={24}
              className="text-neutral-700 dark:text-neutral-300"
            />
          </Pressable>
          <ThemedText className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {group.name}
          </ThemedText>
        </ThemedView>

        {/* Group Info */}
        <ThemedView className="px-4 pb-4">
          <ThemedView className="flex-row items-start mb-3">
            <ThemedView className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-700 items-center justify-center mr-4">
              {group.avatar ? (
                <NetworkResilientImage
                  url={group.avatar}
                  width={64}
                  height={64}
                  borderRadius={16}
                  fallbackIconName="people"
                  fallbackIconSize={32}
                />
              ) : (
                <OptimizedIcon
                  name="people"
                  size={32}
                  className="text-neutral-500 dark:text-neutral-400"
                />
              )}
            </ThemedView>
            
            <ThemedView className="flex-1">
              <ThemedView className="flex-row items-center mb-2">
                <OptimizedIcon
                  name={group.isPublic ? 'globe-outline' : 'lock-closed'}
                  size={16}
                  className="text-neutral-500 dark:text-neutral-400 mr-2"
                />
                <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
                  {group.memberCount} {t('content.members')} • {group.category}
                </ThemedText>
              </ThemedView>
              
              <ThemedText className="text-sm text-neutral-700 dark:text-neutral-300 leading-5">
                {group.description}
              </ThemedText>
            </ThemedView>
          </ThemedView>

          {/* Tags */}
          {group.tags && group.tags.length > 0 && (
            <ThemedView className="flex-row flex-wrap mb-3">
              {group.tags.map((tag) => (
                <TagPill
                  key={tag}
                  text={tag}
                  variant="neutral"
                  size="small"
                  className="mr-2 mb-1"
                />
              ))}
            </ThemedView>
          )}

          {/* Join/Leave Button */}
          {currentUserId && (
            <AnimatedButton
              title={joining 
                ? t('content.joining')
                : userMembership 
                  ? t('content.leaveGroup')
                  : t('content.joinGroup')
              }
              onPress={userMembership ? handleLeaveGroup : handleJoinGroup}
              disabled={joining}
              loading={joining}
              variant={userMembership ? 'secondary' : 'primary'}
            />
          )}
        </ThemedView>

        {/* Tab Navigation */}
        <ThemedView className="px-4 pb-3">
          <SegmentedControl
            options={CONTENT_TABS}
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as GroupContentTab)}
          />
        </ThemedView>
      </ThemedView>

      {/* Tab Content */}
      <ThemedView className="flex-1">
        {activeTab === 'posts' && (
          <Animated.View 
            key="posts"
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            className="flex-1"
          >
            {posts.length > 0 ? (
              <FlashListWrapper
                data={posts}
                renderItem={renderPostItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 8 }}
              />
            ) : (
              <ThemedView className="flex-1 items-center justify-center p-8">
                <OptimizedIcon
                  name="chatbubble-outline"
                  size={64}
                  className="text-neutral-300 dark:text-neutral-600 mb-4"
                />
                <ThemedText className="text-lg font-medium text-neutral-500 dark:text-neutral-400 text-center">
                  {t('content.noPosts')}
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
            className="flex-1"
          >
            <FlashListWrapper
              data={members}
              renderItem={renderMemberItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
          </Animated.View>
        )}

        {activeTab === 'about' && (
          <Animated.View 
            key="about"
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            className="flex-1 p-4"
          >
            <ThemedView className="bg-white dark:bg-neutral-800 rounded-2xl p-4">
              <ThemedText className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                {t('content.aboutGroup')}
              </ThemedText>
              <ThemedText className="text-sm text-neutral-700 dark:text-neutral-300 leading-6">
                {group.description}
              </ThemedText>
              
              <ThemedView className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <ThemedText className="text-sm text-neutral-500 dark:text-neutral-400">
                  {t('content.createdDaysAgo', { days: group.daysSinceCreated })}
                </ThemedText>
              </ThemedView>
            </ThemedView>
          </Animated.View>
        )}
      </ThemedView>
    </ThemedView>
  );
};

export default GroupContent;
