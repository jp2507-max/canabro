import { withObservables } from '@nozbe/watermelondb/react';
import React, { ComponentType } from 'react';
import { ActivityIndicator } from 'react-native';
import { of as of$ } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

import ProfileScreenBase from '../components/profile/ProfileScreenBase';
import ThemedText from '../components/ui/ThemedText';
import ThemedView from '../components/ui/ThemedView';
import { useAuth } from '../lib/contexts/AuthProvider';
import { useTheme } from '../lib/contexts/ThemeContext';
import { Profile } from '../lib/models/Profile';

// --- Data Fetching HOC ---
interface ProfileContainerProps {
  userId: string;
}

const enhance = withObservables(['userId'], ({ userId }: ProfileContainerProps) => {
  const getDb = () => require('../lib/database/database').default;
  let db: any = null;
  try {
    db = getDb();
  } catch (e) {
    console.error('[Profile enhance] Failed to get Database instance:', e);
    return {
      profile: of$(null),
      plantsCount: of$(0),
      postsCount: of$(0),
    };
  }
  if (!db) {
    console.error('[Profile enhance] Database instance is null after require.');
    return {
      profile: of$(null),
      plantsCount: of$(0),
      postsCount: of$(0),
    };
  }
  try {
    const profileObservable = db
      .get('profiles')
      .findAndObserve(userId)
      .pipe(
        catchError((error) => {
          console.error(`[Profile enhance] Error observing profile for userId ${userId}:`, error);
          return of$(null);
        })
      );
    const plantsCountObservable = profileObservable.pipe(
      switchMap((p: Profile | null) => (p ? p.plants.observeCount(false) : of$(0)))
    );
    const postsCountObservable = profileObservable.pipe(
      switchMap((p: Profile | null) => (p ? p.posts.observeCount(false) : of$(0)))
    );
    return {
      profile: profileObservable,
      plantsCount: plantsCountObservable,
      postsCount: postsCountObservable,
    };
  } catch (error) {
    console.error(`[Profile enhance] Error setting up observables for userId ${userId}:`, error);
    return {
      profile: of$(null),
      plantsCount: of$(0),
      postsCount: of$(0),
    };
  }
});

const ProfileScreenContainer: React.FC = () => {
  const { user } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const userId = user?.id;
  if (!userId) {
    return (
      <ThemedView
        className="flex-1 items-center justify-center p-4"
        lightClassName="bg-background"
        darkClassName="bg-neutral-900">
        <ActivityIndicator size="large" color={theme.colors.primary[isDarkMode ? 400 : 500]} />
        <ThemedText
          className="mt-3 text-base"
          lightClassName="text-neutral-600"
          darkClassName="text-neutral-400">
          Authenticating...
        </ThemedText>
      </ThemedView>
    );
  }
  const EnhancedProfileScreen = enhance(ProfileScreenBase as ComponentType<any>);
  return <EnhancedProfileScreen userId={userId} />;
};

export default ProfileScreenContainer;
