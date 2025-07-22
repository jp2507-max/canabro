import { Database } from '@nozbe/watermelondb';
import { withDatabase, withObservables } from '@nozbe/watermelondb/react';
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
import { useTranslation } from 'react-i18next';

import { getCollection, PlantPhotoOperations, createRecord } from '../../../lib/utils/watermelon-helpers';

// Modern animation imports
import {
  triggerLightHapticSync,
  triggerSuccessHaptic,
  triggerErrorHaptic,
} from '../../../lib/utils/haptics';

// Sub-components
import { PlantActions } from '../../../components/plant-detail/PlantActions';
import { PlantDetailRow } from '../../../components/plant-detail/PlantDetailRow';
import { PlantHeader } from '../../../components/plant-detail/PlantHeader';
import { PlantHeroImage } from '../../../components/plant-detail/PlantHeroImage';
import { PlantInfoCard } from '../../../components/plant-detail/PlantInfoCard';
import { PhotoGallery } from '../../../components/plant-gallery/PhotoGallery';
import { PhotoViewer } from '../../../components/plant-gallery/PhotoViewer';
import { PhotoUploadModal } from '../../../components/plant-gallery/PhotoUploadModal';
import { OptimizedIcon, IconName } from '../../../components/ui/OptimizedIcon';
import ThemedText from '../../../components/ui/ThemedText';
import ThemedView from '../../../components/ui/ThemedView';
import useWatermelon from '../../../lib/hooks/useWatermelon';
import { Plant } from '../../../lib/models/Plant';
import { PlantPhoto } from '../../../lib/models/PlantPhoto';
import { formatDate, formatBoolean, formatNumber } from '../../../screens/plantHelpers';
import { useDatabase } from '../../../lib/contexts/DatabaseProvider';

// Types
interface PhotoUploadData {
  imageUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  growthStage: string;
  width?: number;
  height?: number;
  fileSize?: number;
}

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
      runOnJS(triggerLightHapticSync)();
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
  const { t } = useTranslation();
  const [photos, setPhotos] = React.useState<PlantPhoto[]>([]);
  const [showPhotoViewer, setShowPhotoViewer] = React.useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = React.useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = React.useState(0);

  // Load plant photos
  React.useEffect(() => {
    if (!plant || !database) return;

    const loadPhotos = async () => {
      try {
        const plantPhotosCollection = getCollection<PlantPhoto>(database, 'plant_photos');
        const plantPhotos = await PlantPhotoOperations.fetchByPlantId(
          plantPhotosCollection,
          plant.id
        );
        setPhotos(plantPhotos);
      } catch (error) {
        console.error('Error loading photos:', error);
      }
    };

    loadPhotos();

    // Set up subscription for real-time updates
    const plantPhotosCollection = getCollection<PlantPhoto>(database, 'plant_photos');
    const subscription = PlantPhotoOperations.observeByPlantId(
      plantPhotosCollection,
      plant.id
    ).subscribe((newPhotos: PlantPhoto[]) => setPhotos(newPhotos));

    return () => subscription.unsubscribe();
  }, [plant, database]);

  const handlePhotoPress = useCallback((photo: PlantPhoto, index: number) => {
    setSelectedPhotoIndex(index);
    setShowPhotoViewer(true);
  }, []);

  const handleAddPhoto = useCallback(() => {
    setShowPhotoUpload(true);
  }, []);

  const handlePhotoUpload = useCallback(async (photoData: PhotoUploadData) => {
    if (!plant || !database) return;

    try {
      const photosCollection = getCollection<PlantPhoto>(database, 'plant_photos');
      await createRecord(database, photosCollection, (photo: PlantPhoto) => {
        photo.plantId = plant.id;
        photo.imageUrl = photoData.imageUrl;
        photo.thumbnailUrl = photoData.thumbnailUrl;
        photo.caption = photoData.caption;
        photo.growthStage = photoData.growthStage || plant.growthStage;
        photo.fileSize = photoData.fileSize;
        photo.width = photoData.width;
        photo.height = photoData.height;
      });
      setShowPhotoUpload(false);
    } catch (error) {
      console.error('Error saving photo:', error);
      Alert.alert('Error', 'Failed to save photo');
    }
  }, [plant, database]);

  const handlePhotoDelete = useCallback(async (photoId: string) => {
    if (!database) return;

    try {
      await database.write(async () => {
        const photosCollection = getCollection<PlantPhoto>(database, 'plant_photos');
        const photo = await photosCollection.find(photoId);
        await photo.update((p: PlantPhoto) => {
          p.isDeleted = true;
        });
      });
    } catch (error) {
      console.error('Error deleting photo:', error);
      Alert.alert('Error', 'Failed to delete photo');
    }
  }, [database]);

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
              triggerSuccessHaptic();
              router.back();
            } catch (error) {
              console.error('Error deleting plant:', error);
              triggerErrorHaptic();
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
      router.push({
        pathname: '/(app)/plant/[id]/edit',
        params: { id: plant.id },
      });
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
                {t('plants.detail.loadingTitle')}
              </ThemedText>
              <ThemedText variant="muted" className="max-w-xs text-center">
                {t('plants.detail.loadingSubtitle')}
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

          {/* Photo Gallery Card */}
          <Animated.View entering={FadeInDown.delay(800).duration(600)}>
            <PlantInfoCard title="Photo Gallery">
              <PhotoGallery
                plantId={plant.id}
                photos={photos}
                onPhotoPress={handlePhotoPress}
                onAddPhoto={handleAddPhoto}
              />
            </PlantInfoCard>
          </Animated.View>

          {/* Notes Card with conditional rendering and animation */}
          {plant.notes && plant.notes.trim() !== '' && (
            <Animated.View entering={FadeInDown.delay(1000).duration(600)}>
              <PlantInfoCard title="Notes">
                <ThemedText className="text-base leading-relaxed text-neutral-700 dark:text-neutral-200">
                  {plant.notes}
                </ThemedText>
              </PlantInfoCard>
            </Animated.View>
          )}

          {/* Actions Card with final staggered entrance */}
          <Animated.View entering={FadeInDown.delay(1200).duration(600)}>
            <PlantActions plantId={plant.id} onDelete={handleDelete} />
          </Animated.View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} />

      {/* Photo Viewer Modal */}
      <PhotoViewer
        photos={photos}
        initialIndex={selectedPhotoIndex}
        visible={showPhotoViewer}
        onClose={() => setShowPhotoViewer(false)}
        onDelete={handlePhotoDelete}
      />

      {/* Photo Upload Modal */}
      <PhotoUploadModal
        visible={showPhotoUpload}
        plantId={plant.id}
        onClose={() => setShowPhotoUpload(false)}
        onPhotoUploaded={handlePhotoUpload}
      />
    </ThemedView>
  );
}

// HOCs and Wrapper remain the same but with enhanced error states
const PlantDetailsWithDB = withDatabase(PlantDetailsScreenBase);

const PlantDetailsEnhanced = withObservables(
  ['route', 'database'],
  ({ database, route }: { database: Database; route: { params: { id: string } } }) => {
    const id = route?.params?.id as string | undefined;

    if (!database || !id) {
      console.error('[withObservables] Database or Plant ID missing.', {
        hasDb: !!database,
        hasId: !!id,
      });
      return { plant: null };
    }

    try {
      const plantsCollection = getCollection<Plant>(database, 'plants');
      const plantObservable = plantsCollection.findAndObserve(id);
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
  const { t } = useTranslation();

  if (!database) {
    // Simple fallback while database is initializing
    return (
      <ThemedView className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <ActivityIndicator size="large" color="#3b82f6" />
      </ThemedView>
    );
  }

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
              <OptimizedIcon name="help-circle" size={48} color="#f59e0b" />
            </View>
            <Animated.View entering={FadeInUp.delay(200).duration(600)}>
              <ThemedText variant="heading" className="mb-2 text-center text-xl font-bold">
                {t('plants.detail.missingInfoTitle')}
              </ThemedText>
              <ThemedText variant="muted" className="max-w-xs text-center">
                {t('plants.detail.missingInfoSubtitle')}
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
