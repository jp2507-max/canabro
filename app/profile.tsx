import { withObservables } from '@nozbe/watermelondb/react';
import React, { ComponentType } from 'react';
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

import ProfileScreenBase from '../components/profile/ProfileScreenBase';
import ThemedText from '../components/ui/ThemedText';
import ThemedView from '../components/ui/ThemedView';
import { useAuth } from '../lib/contexts/AuthProvider';
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

  const EnhancedProfileScreen = enhance(ProfileScreenBase as ComponentType<any>);
  return <EnhancedProfileScreen userId={userId} />;
};

export default ProfileScreenContainer;
