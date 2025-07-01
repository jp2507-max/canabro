import { Model } from '@nozbe/watermelondb';
import React from 'react';
import { ActivityIndicator } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withRepeat,
} from 'react-native-reanimated';
import { of as of$ } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

import ProfileScreenBase from '../../components/profile/ProfileScreenBase';
import ThemedText from '../../components/ui/ThemedText';
import ThemedView from '../../components/ui/ThemedView';
import { useAuth } from '../../lib/contexts/AuthProvider';
import { useDatabase } from '../../lib/contexts/DatabaseProvider';
import { Profile } from '../../lib/models/Profile';

// --- Data Fetching Hook ---
interface ProfileData {
  profile: Profile | null;
  plantsCount: number;
  postsCount: number;
  isLoading: boolean;
}

// Type for the observable data
interface ObservableProfileData {
  profile: Profile | null;
  plantsCount: number;
  postsCount: number;
}

const useProfileData = (userId: string): ProfileData => {
  const { database } = useDatabase();
  const [profileData, setProfileData] = React.useState<ProfileData>({
    profile: null,
    plantsCount: 0,
    postsCount: 0,
    isLoading: true,
  });

  React.useEffect(() => {
    if (!database || !userId) return;

    const subscription = database
      .get('profiles')
      .findAndObserve(userId)
      .pipe(
        switchMap((profile: Model | null) => {
          const typedProfile = profile as Profile | null;
          if (!typedProfile) {
            return of$({
              profile: null,
              plantsCount: 0,
              postsCount: 0,
            });
          }

          // Combine profile with counts
          return typedProfile.plants.observeCount(false).pipe(
            switchMap((plantsCount) =>
              typedProfile.posts.observeCount(false).pipe(
                switchMap((postsCount) =>
                  of$({
                    profile: typedProfile,
                    plantsCount,
                    postsCount,
                  })
                )
              )
            )
          );
        }),
        catchError((error) => {
          console.error(`[useProfileData] Error observing profile for userId ${userId}:`, error);
          return of$({
            profile: null,
            plantsCount: 0,
            postsCount: 0,
          });
        })
      )
      .subscribe((data: ObservableProfileData) => {
        setProfileData({ ...data, isLoading: false });
      });

    return () => subscription.unsubscribe();
  }, [database, userId]);

  return profileData;
};

const LoadingScreen: React.FC = () => {
  const spinnerOpacity = useSharedValue(0.6);
  const spinnerScale = useSharedValue(1);

  React.useEffect(() => {
    // Breathing animation for loading spinner
    spinnerOpacity.value = withRepeat(
      withSequence(
        withSpring(1, { damping: 15, stiffness: 200 }),
        withSpring(0.6, { damping: 15, stiffness: 200 })
      ),
      -1,
      true
    );

    spinnerScale.value = withRepeat(
      withSequence(
        withSpring(1.1, { damping: 10, stiffness: 150 }),
        withSpring(1, { damping: 10, stiffness: 150 })
      ),
      -1,
      true
    );
  }, []);

  const animatedSpinnerStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: spinnerOpacity.value,
      transform: [{ scale: spinnerScale.value }],
    };
  });

  return (
    <ThemedView
      variant="default"
      className="flex-1 items-center justify-center bg-neutral-50 p-6 dark:bg-neutral-900">
      <Animated.View entering={FadeIn.duration(800)} style={animatedSpinnerStyle}>
        <ActivityIndicator
          size="large"
          color="rgb(34 197 94)" // primary-500
        />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(300).duration(600)}>
        <ThemedText
          variant="muted"
          className="mt-4 text-base font-medium text-neutral-600 dark:text-neutral-400"
          accessibilityRole="text"
          accessibilityLabel="Loading your profile">
          Loading your profile...
        </ThemedText>
      </Animated.View>
    </ThemedView>
  );
};

const ProfileScreenContainer: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;

  if (!userId) {
    return <LoadingScreen />;
  }

  const profileData = useProfileData(userId);

  if (profileData.isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ProfileScreenBase
      profile={profileData.profile}
      plantsCount={profileData.plantsCount}
      postsCount={profileData.postsCount}
    />
  );
};

export default ProfileScreenContainer;
