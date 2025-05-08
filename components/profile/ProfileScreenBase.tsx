import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';

import ProfileDetail from './ProfileDetail';
import StatItem from './StatItem';
import { useSyncContext } from '../../lib/contexts/SyncContext';
import { useTheme } from '../../lib/contexts/ThemeContext';
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
 * Receives profile data and stats as props.
 */
const ProfileScreenBase: React.FC<ProfileScreenBaseProps> = function ProfileScreenBase({
  profile,
  plantsCount,
  postsCount,
  isRefreshing = false,
  onRefresh,
}) {
  const { isDarkMode } = useTheme();
  const { triggerSync } = useSyncContext();

  // Handle manual sync trigger from the sync status component
  const handleSyncPress = () => {
    if (triggerSync) triggerSync(true);
  };

  // Example: You can further modularize sections if needed
  return (
    <ThemedView className="flex-1" lightClassName="bg-background" darkClassName="bg-neutral-900">
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} /> : undefined
        }
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View className="mb-4 flex-row items-center justify-between">
          <ThemedText
            className="text-2xl font-bold"
            lightClassName="text-primary-800"
            darkClassName="text-primary-100">
            Profile
          </ThemedText>
          <ThemeToggle />
        </View>

        {/* Stats */}
        <View className="mb-6 flex-row">
          <StatItem value={plantsCount} label="Plants" icon="leaf" />
          <StatItem value={postsCount} label="Posts" icon="chatbubble-ellipses" />
        </View>

        {/* Profile Details */}
        <ProfileDetail label="Username" value={profile?.username} icon="person" />
        <ProfileDetail label="User ID" value={profile?.userId} icon="mail" />
        <ProfileDetail label="Experience" value={profile?.experienceLevel} icon="medal" />
        <ProfileDetail label="Grow Method" value={profile?.preferredGrowMethod} icon="flower" />

        {/* Sync Status Section */}
        <View className="mb-4 mt-8">
          <ThemedText
            className="mb-2 text-lg font-semibold"
            lightClassName="text-gray-800"
            darkClassName="text-gray-200">
            Data Synchronization
          </ThemedText>
          <SyncStatus onPress={handleSyncPress} />
        </View>
      </ScrollView>
    </ThemedView>
  );
};

export default React.memo(ProfileScreenBase);
