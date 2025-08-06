/**
 * GroupCreationForm - Form for creating new social groups
 * 
 * Features:
 * - Uses EnhancedKeyboardWrapper and EnhancedTextInput
 * - Group categorization with TopicTag and TagPill
 * - Form validation and error handling
 * - Integration with SocialGroup model
 */
import React, { useState, useCallback, useRef } from 'react';
import { TextInput, ScrollView, Alert } from 'react-native';
import EnhancedKeyboardWrapper from '@/components/keyboard/EnhancedKeyboardWrapper';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useDatabase } from '@nozbe/watermelondb/hooks';

import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { EnhancedTextInput } from '@/components/ui/EnhancedTextInput';
import SegmentedControl, { SegmentedControlOption } from '@/components/ui/SegmentedControl';
import TagPill from '@/components/ui/TagPill';
import AnimatedButton from '@/components/buttons/AnimatedButton';
import { triggerLightHaptic, triggerSuccessHaptic } from '@/lib/utils/haptics';
import { Logger } from '@/lib/utils/production-utils';

import { SocialGroup, GroupCategory, GroupSettings } from '@/lib/models/SocialGroup';
import { GroupMember } from '@/lib/models/GroupMember';

interface GroupCreationFormProps {
  currentUserId?: string;
  onGroupCreated?: (groupId: string) => void;
}

const GROUP_CATEGORIES: { key: GroupCategory; label: string; description: string }[] = [
  { key: 'strain_specific', label: 'Strain Specific', description: 'Focus on specific cannabis strains' },
  { key: 'growing_method', label: 'Growing Method', description: 'Hydroponic, soil, organic methods' },
  { key: 'experience_level', label: 'Experience Level', description: 'Beginner, intermediate, expert' },
  { key: 'location_based', label: 'Location Based', description: 'Regional growing communities' },
  { key: 'problem_solving', label: 'Problem Solving', description: 'Troubleshooting and help' },
  { key: 'equipment', label: 'Equipment', description: 'Lights, nutrients, tools' },
  { key: 'nutrients', label: 'Nutrients', description: 'Feeding schedules and nutrients' },
  { key: 'harvest_techniques', label: 'Harvest', description: 'Harvesting and curing techniques' },
];

const PRIVACY_OPTIONS: SegmentedControlOption[] = [
  {
    key: 'public',
    label: 'Public',
    icon: 'globe-outline',
    color: 'text-green-600 dark:text-green-400',
  },
  {
    key: 'private',
    label: 'Private',
    icon: 'lock-closed',
    color: 'text-orange-600 dark:text-orange-400',
  },
];

export const GroupCreationForm: React.FC<GroupCreationFormProps> = ({
  currentUserId,
  onGroupCreated,
}) => {
  const { t } = useTranslation('socialGroups');
  const database = useDatabase();
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GroupCategory>('strain_specific');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [maxMembers, setMaxMembers] = useState('1000');
  const [isCreating, setIsCreating] = useState(false);

  // Form validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Refs for form navigation
  const descriptionRef = useRef<TextInput>(null);
  const tagRef = useRef<TextInput>(null);
  const maxMembersRef = useRef<TextInput>(null);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = t('form.errors.nameRequired');
    } else if (name.trim().length < 3) {
      newErrors.name = t('form.errors.nameTooShort');
    }

    if (!description.trim()) {
      newErrors.description = t('form.errors.descriptionRequired');
    } else if (description.trim().length < 10) {
      newErrors.description = t('form.errors.descriptionTooShort');
    }

    const maxMembersNum = parseInt(maxMembers);
    if (isNaN(maxMembersNum) || maxMembersNum < 2) {
      newErrors.maxMembers = t('form.errors.invalidMaxMembers');
    } else if (maxMembersNum > 10000) {
      newErrors.maxMembers = t('form.errors.maxMembersTooHigh');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, description, maxMembers, t]);

  const handleAddTag = useCallback(() => {
    const trimmedTag = newTag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 10) {
      setTags(prev => [...prev, trimmedTag]);
      setNewTag('');
      triggerLightHaptic();
    }
  }, [newTag, tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
    triggerLightHaptic();
  }, []);

  const handleCategorySelect = useCallback((selectedCategory: GroupCategory) => {
    setCategory(selectedCategory);
    triggerLightHaptic();
  }, []);

  const handlePrivacyChange = useCallback((privacyKey: string) => {
    setPrivacy(privacyKey as 'public' | 'private');
  }, []);

  const handleCreateGroup = useCallback(async () => {
    if (!currentUserId) {
      Alert.alert(t('form.errors.notLoggedIn'));
      return;
    }

    if (!validateForm()) {
      triggerLightHaptic();
      return;
    }

    setIsCreating(true);

    try {
      await database.write(async () => {
        // Create the group
        const groupSettings: GroupSettings = {
          isPublic: privacy === 'public',
          allowInvites: true,
          requireApproval: privacy === 'private',
          maxMembers: parseInt(maxMembers),
          allowFileSharing: true,
          moderationLevel: 'medium',
        };

        const group = await database.get<SocialGroup>('social_groups').create((group) => {
          group.name = name.trim();
          group.description = description.trim();
          group.category = category;
          group.tags = tags;
          group.settings = groupSettings;
          group.stats = SocialGroup.DEFAULT_STATS;
          group.createdBy = currentUserId;
          group.isActive = true;
        });

        // Add creator as admin member
        await database.get<GroupMember>('group_members').create((member) => {
          member.groupId = group.id;
          member.userId = currentUserId;
          member.role = 'admin';
          member.permissions = {
            canPost: true,
            canComment: true,
            canInvite: true,
            canModerate: true,
            canManageMembers: true,
            canEditGroup: true,
          };
          member.isActive = true;
        });

        // Update group member count
        await group.incrementMemberCount();

        triggerSuccessHaptic();
        onGroupCreated?.(group.id);
      });
    } catch (error) {
      Logger.error('Error creating group:', { error });
      Alert.alert(t('form.errors.createFailed'));
    } finally {
      setIsCreating(false);
    }
  }, [
    currentUserId,
    validateForm,
    database,
    name,
    description,
    category,
    tags,
    privacy,
    maxMembers,
    onGroupCreated,
    t,
  ]);

  return (
    <EnhancedKeyboardWrapper>
      <ScrollView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      <ThemedView className="p-4">
        <ThemedText className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">
          {t('create.title')}
        </ThemedText>

        {/* Group Name */}
        <EnhancedTextInput
          label={t('form.name')}
          placeholder={t('form.namePlaceholder')}
          value={name}
          onChangeText={setName}
          error={errors.name}
          maxLength={50}
          showCharacterCount
          returnKeyType="next"
          onSubmitEditing={() => descriptionRef.current?.focus()}
        />

        {/* Group Description */}
        <EnhancedTextInput
          ref={descriptionRef}
          label={t('form.description')}
          placeholder={t('form.descriptionPlaceholder')}
          value={description}
          onChangeText={setDescription}
          error={errors.description}
          multiline
          maxLength={500}
          showCharacterCount
          returnKeyType="next"
          onSubmitEditing={() => tagRef.current?.focus()}
        />

        {/* Category Selection */}
        <ThemedView className="mb-4">
          <ThemedText className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('form.category')}
          </ThemedText>
          <ThemedView className="flex-row flex-wrap">
            {GROUP_CATEGORIES.map((cat) => (
              <TagPill
                key={cat.key}
                text={cat.label}
                selected={category === cat.key}
                onPress={() => handleCategorySelect(cat.key)}
                variant="category"
                className="mb-2"
              />
            ))}
          </ThemedView>
          <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {GROUP_CATEGORIES.find(cat => cat.key === category)?.description}
          </ThemedText>
        </ThemedView>

        {/* Tags */}
        <ThemedView className="mb-4">
          <ThemedText className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('form.tags')} ({tags.length}/10)
          </ThemedText>
          
          {/* Add Tag Input */}
          <ThemedView className="flex-row items-center mb-3">
            <ThemedView className="flex-1 mr-2">
              <EnhancedTextInput
                ref={tagRef}
                placeholder={t('form.addTag')}
                value={newTag}
                onChangeText={setNewTag}
                returnKeyType="done"
                onSubmitEditing={handleAddTag}
                maxLength={20}
              />
            </ThemedView>
            <AnimatedButton
              title={t('form.add')}
              onPress={handleAddTag}
              disabled={!newTag.trim() || tags.length >= 10}
              variant="primary"
            />
          </ThemedView>

          {/* Current Tags */}
          {tags.length > 0 && (
            <ThemedView className="flex-row flex-wrap">
              {tags.map((tag) => (
                <TagPill
                  key={tag}
                  text={tag}
                  selected
                  onPress={() => handleRemoveTag(tag)}
                  variant="neutral"
                  className="mb-2"
                />
              ))}
            </ThemedView>
          )}
        </ThemedView>

        {/* Privacy Settings */}
        <ThemedView className="mb-4">
          <ThemedText className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('form.privacy')}
          </ThemedText>
          <SegmentedControl
            options={PRIVACY_OPTIONS}
            selectedKey={privacy}
            onSelectionChange={handlePrivacyChange}
          />
          <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
            {privacy === 'public' 
              ? t('form.publicDescription')
              : t('form.privateDescription')
            }
          </ThemedText>
        </ThemedView>

        {/* Max Members */}
        <EnhancedTextInput
          ref={maxMembersRef}
          label={t('form.maxMembers')}
          placeholder="1000"
          value={maxMembers}
          onChangeText={setMaxMembers}
          error={errors.maxMembers}
          keyboardType="numeric"
          returnKeyType="done"
        />

        {/* Create Button */}
        <AnimatedButton
          title={isCreating ? t('form.creating') : t('form.createGroup')}
          onPress={handleCreateGroup}
          disabled={isCreating}
          loading={isCreating}
          variant="primary"
        />
      </ThemedView>
      </ScrollView>
    </EnhancedKeyboardWrapper>
  );
};

export default GroupCreationForm;
