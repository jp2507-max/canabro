import { Database } from '@nozbe/watermelondb';
import { withDatabase, withObservables } from '@nozbe/watermelondb/react';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback } from 'react';
import { ScrollView, Alert, ActivityIndicator, View, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInDown,
  runOnJS,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// Modern animation imports

// Sub-components
import { PlantActions } from '../../components/plant-detail/PlantActions';
import { PlantDetailRow } from '../../components/plant-detail/PlantDetailRow';
import { PlantHeader } from '../../components/plant-detail/PlantHeader';
import { PlantHeroImage } from '../../components/plant-detail/PlantHeroImage';
import { PlantInfoCard } from '../../components/plant-detail/PlantInfoCard';
import { OptimizedIcon, IconName } from '../../components/ui/OptimizedIcon';
import ThemedText from '../../components/ui/ThemedText';
import ThemedView from '../../components/ui/ThemedView';
import { useDatabase } from '../../lib/contexts/DatabaseProvider';
import useWatermelon from '../../lib/hooks/useWatermelon';
import { Plant } from '../../lib/models/Plant';
import { formatDate, formatBoolean, formatNumber } from '../../screens/plantHelpers';

const { width: screenWidth } = Dimensions.get('window');

// Modern animated navigation button component
function AnimatedNavButton({
  iconName,
  onPress,
  accessibilityLabel,
  position = 'left',
}: {
  iconName: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  position?: 'left' | 'right';
}) {
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.3);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.value }],
      shadowOpacity: shadowOpacity.value,
    };
  });

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
      shadowOpacity.value = withTiming(0.1, { duration: 150 });

      // Haptic feedback
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      shadowOpacity.value = withTiming(0.3, { duration: 200 });

      runOnJS(onPress)();
    });

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        entering={FadeIn.delay(position === 'left' ? 300 : 400).duration(600)}
        style={[animatedStyle]}
        className="rounded-full bg-black/40 p-3 shadow-lg"
        accessible
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button">
        <OptimizedIcon name={iconName} size={24} color="white" />
      </Animated.View>
    </GestureDetector>
  );
}

// Base component receiving the plant observable
function PlantDetailsScreenBase({ plant }: { plant: Plant | null }) {
  const { sync, database } = useWatermelon();

  const handleDelete = async () => {
    if (!plant) return;
    Alert.alert(
      'Delete Plant',
      'Are you sure you want to delete this plant? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.write(async () => {
                await plant.markAsDeleted();
              });
              sync();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch (error) {
              console.error('Error deleting plant:', error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', 'Failed to delete plant');
            }
          },
        },
      ]
    );
  };

  const handleBackPress = useCallback(() => {
    router.back();
  }, []);

  const handleEditPress = useCallback(() => {
    if (plant) {
      router.push(`/plant/${plant.id}/edit`);
    }
  }, [plant]);

  // Enhanced loading state with modern animations
  if (!plant) {
    return (
      <ThemedView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
        <SafeAreaView className="flex-1 items-center justify-center p-6">
          <Animated.View entering={FadeIn.duration(800)} className="items-center">
            <View className="mb-6 rounded-full bg-primary-100 p-6 dark:bg-primary-900/30">
              <ActivityIndicator size="large" color="#10b981" />
            </View>
            <Animated.View entering={FadeInUp.delay(200).duration(600)}>
              <ThemedText variant="heading" className="mb-2 text-center text-xl font-bold">
                Loading Plant Details
              </ThemedText>
              <ThemedText variant="muted" className="max-w-xs text-center">
                Fetching your plant information...
              </ThemedText>
            </Animated.View>
            <Animated.View entering={FadeInUp.delay(400).duration(600)} className="mt-8">
              <AnimatedNavButton
                iconName="arrow-back"
                onPress={handleBackPress}
                accessibilityLabel="Go back"
              />
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // Render actual content with staggered animations
  return (
    <ThemedView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      {/* Floating Navigation Buttons */}
      <View className="pt-safe-or-3 absolute left-4 right-4 top-0 z-20 flex-row items-center justify-between py-3">
        <AnimatedNavButton
          iconName="arrow-back"
          onPress={handleBackPress}
          accessibilityLabel="Go back"
          position="left"
        />
        <AnimatedNavButton
          iconName="pencil"
          onPress={handleEditPress}
          accessibilityLabel="Edit plant details"
          position="right"
        />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}>
        {/* Hero Image with entrance animation */}
        <Animated.View entering={FadeIn.duration(800)}>
          <PlantHeroImage
            imageUrl={plant.imageUrl}
            plantId={plant.id}
            imageHeight={screenWidth * 0.75}
          />
        </Animated.View>

        {/* Plant Header with slide animation */}
        <Animated.View entering={SlideInDown.delay(200).duration(600)}>
          <PlantHeader name={plant.name} strain={plant.strain} />
        </Animated.View>

        <View className="px-4">
          {/* Details Card with staggered entrance */}
          <Animated.View entering={FadeInDown.delay(400).duration(600)}>
            <PlantInfoCard title="Details">
              <PlantDetailRow label="Planted Date" value={formatDate(plant.plantedDate)} />
              <PlantDetailRow label="Growth Stage" value={plant.growthStage} />
              <PlantDetailRow label="Height" value={formatNumber(plant.height, ' cm')} />
              <PlantDetailRow
                label="Expected Harvest"
                value={formatDate(plant.expectedHarvestDate)}
              />
            </PlantInfoCard>
          </Animated.View>

          {/* Genetics Card with staggered entrance */}
          <Animated.View entering={FadeInDown.delay(600).duration(600)}>
            <PlantInfoCard title="Genetics">
              <PlantDetailRow label="Auto Flower" value={formatBoolean(plant.isAutoFlower)} />
              <PlantDetailRow label="Feminized" value={formatBoolean(plant.isFeminized)} />
              <PlantDetailRow label="THC Content" value={formatNumber(plant.thcContent, '%')} />
              <PlantDetailRow label="CBD Content" value={formatNumber(plant.cbdContent, '%')} />
            </PlantInfoCard>
          </Animated.View>

          {/* Notes Card with conditional rendering and animation */}
          {plant.notes && plant.notes.trim() !== '' && (
            <Animated.View entering={FadeInDown.delay(800).duration(600)}>
              <PlantInfoCard title="Notes">
                <ThemedText className="text-base leading-relaxed text-neutral-700 dark:text-neutral-200">
                  {plant.notes}
                </ThemedText>
              </PlantInfoCard>
            </Animated.View>
          )}

          {/* Actions Card with final staggered entrance */}
          <Animated.View entering={FadeInDown.delay(1000).duration(600)}>
            <PlantActions plantId={plant.id} onDelete={handleDelete} />
          </Animated.View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} />
    </ThemedView>
  );
}

// HOCs and Wrapper remain the same but with enhanced error states
const PlantDetailsWithDB = withDatabase(PlantDetailsScreenBase);

const PlantDetailsEnhanced = withObservables(
  ['route', 'database'],
  ({ database, route }: { database: Database; route: any }) => {
    const id = route?.params?.id as string | undefined;

    if (!database || !id) {
      console.error('[withObservables] Database or Plant ID missing.', {
        hasDb: !!database,
        hasId: !!id,
      });
      return { plant: null };
    }

    try {
      const plantObservable = database.collections.get<Plant>('plants').findAndObserve(id);
      return { plant: plantObservable };
    } catch (error) {
      console.error(`[withObservables] Error observing plant with ID ${id}:`, error);
      return { plant: null };
    }
  }
)(PlantDetailsWithDB);

// Enhanced wrapper with modern error states
export default function PlantDetailsWrapper() {
  const params = useLocalSearchParams();
  const id = params.id as string;
  const { database } = useDatabase();

  const handleBackPress = useCallback(() => {
    router.back();
  }, []);

  // Enhanced ID Missing State
  if (!id) {
    return (
      <ThemedView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
        <SafeAreaView className="flex-1 items-center justify-center p-6">
          <Animated.View entering={FadeIn.duration(800)} className="items-center">
            <View className="mb-6 rounded-full bg-amber-100 p-6 dark:bg-amber-900/30">
              <OptimizedIcon name="help-circle-outline" size={48} color="#f59e0b" />
            </View>
            <Animated.View entering={FadeInUp.delay(200).duration(600)}>
              <ThemedText variant="heading" className="mb-2 text-center text-xl font-bold">
                Missing Information
              </ThemedText>
              <ThemedText variant="muted" className="max-w-xs text-center">
                No Plant ID was provided to view details.
              </ThemedText>
            </Animated.View>
            <Animated.View entering={FadeInUp.delay(400).duration(600)} className="mt-8">
              <AnimatedNavButton
                iconName="arrow-back"
                onPress={handleBackPress}
                accessibilityLabel="Go back"
              />
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // Enhanced Database Loading State
  if (!database) {
    return (
      <ThemedView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
        <SafeAreaView className="flex-1 items-center justify-center p-6">
          <Animated.View entering={FadeIn.duration(800)} className="items-center">
            <View className="mb-6 rounded-full bg-blue-100 p-6 dark:bg-blue-900/30">
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
            <Animated.View entering={FadeInUp.delay(200).duration(600)}>
              <ThemedText variant="heading" className="mb-2 text-center text-xl font-bold">
                Connecting to Database
              </ThemedText>
              <ThemedText variant="muted" className="max-w-xs text-center">
                Establishing database connection...
              </ThemedText>
            </Animated.View>
            <Animated.View entering={FadeInUp.delay(400).duration(600)} className="mt-8">
              <AnimatedNavButton
                iconName="arrow-back"
                onPress={handleBackPress}
                accessibilityLabel="Go back"
              />
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return <PlantDetailsEnhanced key={id} route={{ params: { id } }} database={database} />;
}
