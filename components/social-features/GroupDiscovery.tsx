/**
 * GroupDiscovery - Component for discovering and searching social groups
 * 
 * Features:
 * - Uses FlashListWrapper for performance with large lists
 * - Search functionality similar to PlantSearchBar
 * - Category filtering with TagPill components
 * - Group cards with member counts and activity indicators
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { FlashListWrapper } from '@/components/ui/FlashListWrapper';
import { EnhancedTextInput } from '@/components/ui/EnhancedTextInput';
import TagPill from '@/components/ui/TagPill';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import { NetworkResilientImage } from '@/components/ui/NetworkResilientImage';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { triggerLightHaptic } from '@/lib/utils/haptics';

import { SocialGroup, GroupCategory } from '@/lib/models/SocialGroup';
import { GroupMember } from '@/lib/models/GroupMember';

interface GroupDiscoveryProps {
  currentUserId?: string;
  onGroupSelect?: (groupId: string) => void;
  showOnlyUserGroups?: boolean;
}

const GROUP_CATEGORIES: { key: GroupCategory; label: string }[] = [
  { key: 'strain_specific', label: 'Strains' },
  { key: 'growing_method', label: 'Methods' },
  { key: 'experience_level', label: 'Experience' },
  { key: 'location_based', label: 'Location' },
  { key: 'problem_solving', label: 'Help' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'nutrients', label: 'Nutrients' },
  { key: 'harvest_techniques', label: 'Harvest' },
];

interface GroupCardProps {
  group: SocialGroup;
  currentUserId?: string;
  onPress: (groupId: string) => void;
  isUserMember?: boolean;
}

const GroupCard: React.FC<GroupCardProps> = ({ 
  group, 
  currentUserId, 
  onPress, 
  isUserMember = false 
}) => {
  const { t } = useTranslation('socialGroups');

  const handlePress = useCallback(() => {
    triggerLightHaptic();
    onPress(group.id);
  }, [group.id, onPress]);

  const categoryLabel = useMemo(() => {
    return GROUP_CATEGORIES.find(cat => cat.key === group.category)?.label || group.category;
  }, [group.category]);

  return (
    <Pressable
      onPress={handlePress}
      className="mb-4 mx-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 active:opacity-90"
    >
      <ThemedView className="p-4">
        {/* Header with avatar and basic info */}
        <ThemedView className="flex-row items-start mb-3">
          <ThemedView className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-700 items-center justify-center mr-3">
            {group.avatar ? (
              <NetworkResilientImage
                url={group.avatar}
                width={48}
                height={48}
                className="rounded-xl"
                fallbackIconName="people"
                fallbackIconSize={24}
              />
            ) : (
              <OptimizedIcon
                name="people"
                size={24}
                className="text-neutral-500 dark:text-neutral-400"
              />
            )}
          </ThemedView>
          
          <ThemedView className="flex-1">
            <ThemedView className="flex-row items-center justify-between mb-1">
              <ThemedText className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex-1">
                {group.name}
              </ThemedText>
              {isUserMember && (
                <ThemedView className="bg-green-100 dark:bg-green-900 px-2 py-1 rounded-full">
                  <ThemedText className="text-xs font-medium text-green-700 dark:text-green-300">
                    {t('discovery.member')}
                  </ThemedText>
                </ThemedView>
              )}
            </ThemedView>
            
            <ThemedView className="flex-row items-center">
              <OptimizedIcon
                name={group.isPublic ? 'globe' : 'lock-closed'}
                size={14}
                className="text-neutral-500 dark:text-neutral-400 mr-1"
              />
              <ThemedText className="text-sm text-neutral-500 dark:text-neutral-400">
                {group.memberCount} {t('discovery.members')} • {categoryLabel}
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>

        {/* Description */}
        <ThemedText 
          className="text-sm text-neutral-700 dark:text-neutral-300 mb-3 leading-5"
          numberOfLines={2}
        >
          {group.description}
        </ThemedText>

        {/* Tags */}
        {group.tags && group.tags.length > 0 && (
          <ThemedView className="flex-row flex-wrap">
            {group.tags.slice(0, 3).map((tag) => (
              <TagPill
                key={tag}
                text={tag}
                variant="neutral"
                size="small"
                className="mr-2 mb-1"
              />
            ))}
            {group.tags.length > 3 && (
              <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400 self-center">
                +{group.tags.length - 3} {t('discovery.moreTags')}
              </ThemedText>
            )}
          </ThemedView>
        )}

        {/* Activity indicator */}
        <ThemedView className="flex-row items-center justify-between mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
          <ThemedView className="flex-row items-center">
            <OptimizedIcon
              name="pulse"
              size={14}
              className="text-green-500 mr-1"
            />
            <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('discovery.activeMembers', { count: group.stats?.activeMembers || 0 })}
            </ThemedText>
          </ThemedView>
          
          <OptimizedIcon
            name="chevron-forward"
            size={16}
            className="text-neutral-400 dark:text-neutral-500"
          />
        </ThemedView>
      </ThemedView>
    </Pressable>
  );
};

export const GroupDiscovery: React.FC<GroupDiscoveryProps> = ({
  currentUserId,
  onGroupSelect,
  showOnlyUserGroups = false,
}) => {
  const { t } = useTranslation('socialGroups');
  const database = useDatabase();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GroupCategory | null>(null);
  const [groups, setGroups] = useState<SocialGroup[]>([]);
  const [userMemberships, setUserMemberships] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Load groups based on filters
  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const groupsCollection = database.get<SocialGroup>('social_groups');
      let query = groupsCollection.query(
        Q.where('is_active', true),
        Q.where('is_deleted', Q.notEq(true))
      );

      // Filter by search query
      if (debouncedSearchQuery) {
        query = groupsCollection.query(
          Q.where('is_active', true),
          Q.where('is_deleted', Q.notEq(true)),
          Q.or(
            Q.where('name', Q.like(`%${debouncedSearchQuery}%`)),
            Q.where('description', Q.like(`%${debouncedSearchQuery}%`))
          )
        );
      }

      // Filter by category
      if (selectedCategory) {
        query = groupsCollection.query(
          Q.where('is_active', true),
          Q.where('is_deleted', Q.notEq(true)),
          Q.where('category', selectedCategory),
          ...(debouncedSearchQuery ? [
            Q.or(
              Q.where('name', Q.like(`%${debouncedSearchQuery}%`)),
              Q.where('description', Q.like(`%${debouncedSearchQuery}%`))
            )
          ] : [])
        );
      }

      const fetchedGroups = await query.fetch();

      // If showing only user groups, filter by membership
      if (showOnlyUserGroups && currentUserId) {
        const membershipsCollection = database.get<GroupMember>('group_members');
        const userMemberships = await membershipsCollection.query(
          Q.where('user_id', currentUserId),
          Q.where('is_active', true)
        ).fetch();
        
        const userGroupIds = new Set(userMemberships.map(m => m.groupId));
        const userGroups = fetchedGroups.filter(group => userGroupIds.has(group.id));
        setGroups(userGroups);
      } else {
        setGroups(fetchedGroups);
      }

      // Load user memberships for display
      if (currentUserId) {
        const membershipsCollection = database.get<GroupMember>('group_members');
        const memberships = await membershipsCollection.query(
          Q.where('user_id', currentUserId),
          Q.where('is_active', true)
        ).fetch();
        setUserMemberships(new Set(memberships.map(m => m.groupId)));
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  }, [database, debouncedSearchQuery, selectedCategory, showOnlyUserGroups, currentUserId]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleCategorySelect = useCallback((category: GroupCategory) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
    }
    triggerLightHaptic();
  }, [selectedCategory]);

  const handleGroupSelect = useCallback((groupId: string) => {
    onGroupSelect?.(groupId);
  }, [onGroupSelect]);

  const renderGroupCard = useCallback(({ item }: { item: SocialGroup }) => (
    <GroupCard
      group={item}
      currentUserId={currentUserId}
      onPress={handleGroupSelect}
      isUserMember={userMemberships.has(item.id)}
    />
  ), [currentUserId, handleGroupSelect, userMemberships]);

  const renderEmptyState = useCallback(() => (
    <ThemedView className="flex-1 items-center justify-center p-8">
      <OptimizedIcon
        name="people-outline"
        size={64}
        className="text-neutral-300 dark:text-neutral-600 mb-4"
      />
      <ThemedText className="text-lg font-medium text-neutral-500 dark:text-neutral-400 text-center mb-2">
        {showOnlyUserGroups 
          ? t('discovery.noUserGroups')
          : searchQuery 
            ? t('discovery.noSearchResults')
            : t('discovery.noGroups')
        }
      </ThemedText>
      <ThemedText className="text-sm text-neutral-400 dark:text-neutral-500 text-center">
        {showOnlyUserGroups 
          ? t('discovery.joinGroupsHint')
          : searchQuery 
            ? t('discovery.tryDifferentSearch')
            : t('discovery.createFirstGroup')
        }
      </ThemedText>
    </ThemedView>
  ), [showOnlyUserGroups, searchQuery, t]);

  return (
    <ThemedView className="flex-1">
      {/* Search Bar */}
      <ThemedView className="px-4 py-3 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        <EnhancedTextInput
          placeholder={showOnlyUserGroups ? t('discovery.searchMyGroups') : t('discovery.searchGroups')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
          rightIcon={searchQuery ? "close-circle" : undefined}
          onRightIconPress={searchQuery ? () => setSearchQuery('') : undefined}
        />
      </ThemedView>

      {/* Category Filters */}
      <ThemedView className="px-4 py-3 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          {t('discovery.categories')}
        </ThemedText>
        <ThemedView className="flex-row flex-wrap">
          {GROUP_CATEGORIES.map((category) => (
            <TagPill
              key={category.key}
              text={category.label}
              selected={selectedCategory === category.key}
              onPress={() => handleCategorySelect(category.key)}
              variant="category"
              size="small"
              className="mr-2 mb-2"
            />
          ))}
        </ThemedView>
      </ThemedView>

      {/* Results Count */}
      <ThemedView className="px-4 py-2 bg-neutral-50 dark:bg-neutral-900">
        <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
          {loading 
            ? t('discovery.loading')
            : t('discovery.groupsFound', { count: groups.length })
          }
        </ThemedText>
      </ThemedView>

      {/* Groups List */}
      <ThemedView className="flex-1">
        {loading ? (
          <ThemedView className="flex-1 items-center justify-center">
            <ThemedText className="text-neutral-500 dark:text-neutral-400">
              {t('discovery.loading')}
            </ThemedText>
          </ThemedView>
        ) : (
          <FlashListWrapper
            data={groups}
            renderItem={renderGroupCard}
            estimatedItemSize={160}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8 }}
          />
        )}
      </ThemedView>
    </ThemedView>
  );
};

export default GroupDiscovery;