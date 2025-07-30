'use client';

// ✅ React Native & Expo imports - following 2025 best practices
import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from '@/lib/utils/date';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { JSX } from 'react';
import { takePhoto, selectFromGallery } from '@/lib/utils/image-picker';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import type { TFunction } from 'i18next';
import {
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import Animated from 'react-native-reanimated';

// ✅ Type imports
import { RawStrainApiResponse } from '@/lib/types/weed-db';
import { Strain } from '@/lib/data/strains';

// ✅ Reanimated v3 minimal import - using custom animation hooks for better performance

import { StrainAutocomplete } from '../StrainAutocomplete';
import {
  AnimatedDateButton,
  AnimatedImageButton,
  AnimatedRemoveButton,
  AnimatedSubmitButton,
} from './EditPlantFormUI';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';
import { EnhancedTextInput } from '../ui/EnhancedTextInput';
import EnhancedKeyboardWrapper from '@/components/keyboard/EnhancedKeyboardWrapper';

import { useButtonAnimation } from '@/lib/animations';
import { searchStrainsByName } from '@/lib/data/strains';
import { useDatabase } from '@/lib/hooks/useDatabase';
import { useEnhancedKeyboard } from '@/lib/hooks/keyboard/useEnhancedKeyboard';
import { useI18n } from '@/lib/hooks/useI18n';
import { Plant } from '@/lib/models/Plant';
import { findOrCreateLocalStrain } from '@/lib/services/sync/strain-sync.service';
import { WeedDbService } from '@/lib/services/weed-db.service';
import supabase from '@/lib/supabase';
import { uploadPlantImage } from '@/lib/utils/upload-image';
import {
  GrowthStage,
  GROWTH_STAGES,
  GROWTH_STAGES_ARRAY,
  PlantGrowLocation,
  LightCondition,
  GrowMedium,
  CannabisType,
} from '@/lib/types/plant';
import { StrainSpecies } from '@/lib/types/strain';
import { createGrowthStageValidator } from '@/lib/validation';

// ✅ Animation Strategy (Following 2025 React Native Reanimated Guide):
// - Using custom animation hooks for reusable patterns (form inputs, buttons)
// - Direct Reanimated imports avoided in favor of abstracted patterns
// - Performance optimized with React Compiler compatibility
// - Consistent animations across form elements using useButtonAnimation

// ✅ Performance optimization: Helper functions outside component
// React Compiler friendly - prevents recreation on every render
const capitalizeFirstLetter = (string: string) => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
};

const mapLocalTypeToApiType = (type: string): 'sativa' | 'indica' | 'hybrid' => {
  if (!type) return 'hybrid';
  const lowerType = type.toLowerCase();
  if (lowerType === 'sativa' || lowerType === 'indica' || lowerType === 'hybrid') {
    return lowerType as 'sativa' | 'indica' | 'hybrid';
  }
  return 'hybrid';
};

/**
 * Transforms a local Strain object to RawStrainApiResponse format
 * This replaces unsafe type assertions with proper type-safe conversion
 */
const transformLocalStrainToApiResponse = (localStrain: Strain): RawStrainApiResponse => {
  return {
    id: localStrain.id, // Use the local strain's UUID as the id
    api_id: localStrain.id, // Use local string UUID as api_id
    name: localStrain.name,
    type: mapLocalTypeToApiType(localStrain.type as string),
    thc: localStrain.thcContent || null,
    cbd: localStrain.cbdContent || null,
    description: localStrain.description,
    effects: localStrain.effects || [],
    flavors: localStrain.flavors || [],
    imageUrl: localStrain.imageUrl,
    image: localStrain.imageUrl,
    image_url: localStrain.imageUrl,
    growDifficulty: localStrain.growDifficulty,
    // Set default values for fields that don't exist in local Strain
    genetics: undefined,
    floweringTime: undefined,
    fromSeedToHarvest: undefined,
    floweringType: undefined,
    yieldIndoor: undefined,
    yieldOutdoor: undefined,
    heightIndoor: undefined,
    heightOutdoor: undefined,
    harvestTimeOutdoor: undefined,
    terpenes: undefined,
    link: undefined,
    parents: undefined,
    breeder: undefined,
    origin: undefined,
    // Add other optional fields with default values
    lineage: undefined,
    images: undefined,
    seed_company: undefined,
    flowering_time_min: undefined,
    flowering_time_max: undefined,
    yield_min: undefined,
    yield_max: undefined,
    difficulty: localStrain.growDifficulty,
    rating: 0,
    reviews_count: 0,
  };
};

// Define an interface for the update payload to ensure type safety
interface PlantUpdatePayload {
  name: string;
  strainNameDisplay: string;
  strainIdToSet: string | null;
  plantedDate: string;
  growthStage: GrowthStage;
  notes: string;
  imageUrl: string | undefined;
  cannabisType: CannabisType;
  growMedium: GrowMedium;
  lightCondition: LightCondition;
  locationDescription: string;
}

// ✅ Small components to handle hook usage properly
// Fixes Rules of Hooks violations by moving hook calls to component level

// Move components outside to fix React Hooks rule violations
interface EnumOptionProps {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const EnumOption = ({ label, onPress, accessibilityLabel, accessibilityHint }: EnumOptionProps) => {
  const { animatedStyle, handlers } = useButtonAnimation({
    onPress,
    enableHaptics: true,
    hapticStyle: 'light',
  });

  return (
    <Pressable 
      {...handlers}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
    >
      <Animated.View
        style={animatedStyle}
        className="mb-1 flex-row items-center justify-between rounded-lg border border-neutral-300 px-4 py-3 dark:border-neutral-600">
        <ThemedText className="text-neutral-800 dark:text-neutral-100">{label}</ThemedText>
        <OptimizedIcon
          name="chevron-down"
          size={24}
          className="text-neutral-400 dark:text-neutral-500"
        />
      </Animated.View>
    </Pressable>
  );
};

interface LocationOptionProps {
  location: string;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const LocationOption = ({ location, onPress, accessibilityLabel, accessibilityHint }: LocationOptionProps) => {
  const { animatedStyle, handlers } = useButtonAnimation({
    onPress,
    enableHaptics: true,
    hapticStyle: 'light',
  });

  return (
    <Pressable 
      {...handlers}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
    >
      <Animated.View
        style={animatedStyle}
        className="border-b border-neutral-200 py-4 dark:border-neutral-700">
        <ThemedText className="text-neutral-800 dark:text-neutral-100">{location}</ThemedText>
      </Animated.View>
    </Pressable>
  );
};

// Import all enums from centralized type definitions
// Using the already imported enums from @/lib/types/plant
// GrowthStage is imported directly

// Zod Validation Schema builder with i18n support
const buildPlantFormSchema = (t: TFunction<'editPlantForm' | 'common'>) =>
  z.object({
    name: z
      .string()
      .min(3, t('editPlantForm:validation.nameTooShort'))
      .nonempty(t('editPlantForm:validation.nameRequired')),
    strain: z.string().nonempty(t('editPlantForm:validation.strainRequired')),
    planted_date: z.date({ required_error: t('editPlantForm:validation.plantedDateRequired') }),
    growth_stage: createGrowthStageValidator(t('editPlantForm:validation.growthStageRequired')),
    notes: z.string().optional(),
    image_url: z.string().optional(),
    cannabis_type: z.nativeEnum(CannabisType),
    grow_medium: z.nativeEnum(GrowMedium),
    light_condition: z.nativeEnum(LightCondition),
    location: z.string().nonempty(t('editPlantForm:validation.locationRequired')),
  });

type PlantFormSchema = ReturnType<typeof buildPlantFormSchema>;
type PlantFormData = z.infer<PlantFormSchema>;

interface EditPlantFormProps {
  plant: Plant;
  onUpdateSuccess?: () => void;
}

/**
 * ✅ EditPlantForm - Refactored following 2025 React Native Best Practices
 *
 * Animation Strategy:
 * - Uses custom animation hooks (useButtonAnimation) for consistent UX
 * - Avoids direct Reanimated imports in favor of abstracted patterns
 * - React Compiler compatible animation patterns
 *
 * Performance Optimizations:
 * - Helper functions moved outside component scope
 * - Efficient image processing with immediate resizing
 * - Minimal Reanimated imports for better tree-shaking
 *
 * Theming:
 * - Full NativeWind v4 integration with automatic dark mode
 * - Semantic color classes with dark: prefixes
 * - Performance-optimized with minimal inline styles
 *
 * Form Pattern:
 * - React Hook Form with Zod validation
 * - Controlled components with proper error handling
 * - Optimistic UI updates with proper loading states
 */
export default function EditPlantForm({ plant, onUpdateSuccess }: EditPlantFormProps) {
  const { t } = useI18n();
  // Build validation schema with translations
  const plantFormSchema = useMemo(() => buildPlantFormSchema(t), [t]);
  const { database } = useDatabase();

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    setValue,
    reset,
  } = useForm<PlantFormData>({
    resolver: zodResolver(plantFormSchema),
    mode: 'onChange',
    defaultValues: {
      name: plant.name || '',
      strain: plant.strain || '', // This is the strain NAME
      planted_date: plant.plantedDate ? parseISO(plant.plantedDate) : new Date(),
      growth_stage: (plant.growthStage as GrowthStage) || GROWTH_STAGES.SEEDLING,
      cannabis_type: (plant.cannabisType as CannabisType) || CannabisType.Unknown,
      grow_medium: (plant.growMedium as GrowMedium) || GrowMedium.Soil,
      light_condition: (plant.lightCondition as LightCondition) || LightCondition.Artificial,
      location: plant.locationDescription || PlantGrowLocation.Indoor,
      image_url: plant.imageUrl ?? undefined,
      notes: plant.notes || '',
    },
  });

  const [selectedStrain, setSelectedStrain] = useState<RawStrainApiResponse | null>(null); // Will hold the full strain object
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreviewUri, setImagePreviewUri] = useState<string | null>(plant.imageUrl ?? null); // Use ??

  const [showLocationModal, setShowLocationModal] = useState(false);
  // Initialize with plant's current location or a default from the enum if custom is not set
  const [tempCustomLocation, setTempCustomLocation] = useState(
    Object.values(PlantGrowLocation).includes(plant.locationDescription as PlantGrowLocation)
      ? ''
      : plant.locationDescription || ''
  );

  // Button animation for location picker - must be at component level
  const locationPickerAnimation = useButtonAnimation({
    onPress: () => setShowLocationModal(true),
    enableHaptics: true,
    hapticStyle: 'light',
  });

  // Enhanced keyboard handling setup - single source of truth for field configuration
  const keyboardFields = useMemo(() => [
    { name: 'name', ref: useRef<TextInput>(null) },
    { name: 'location', ref: useRef<TextInput>(null) },
    { name: 'notes', ref: useRef<TextInput>(null) },
  ], []);

  const inputRefs = useMemo(() => keyboardFields.map(field => field.ref), [keyboardFields]);
  const fieldNames = useMemo(() => keyboardFields.map(field => field.name), [keyboardFields]);


  // Populate form with plant data on mount and when plant prop changes
  useEffect(() => {
    reset({
      name: plant.name || '',
      strain: plant.strain || '', // strain name
      planted_date: plant.plantedDate ? parseISO(plant.plantedDate) : new Date(),
      growth_stage: (plant.growthStage as GrowthStage) || GROWTH_STAGES.SEEDLING,
      cannabis_type: (plant.cannabisType as CannabisType) || CannabisType.Unknown,
      grow_medium: (plant.growMedium as GrowMedium) || GrowMedium.Soil,
      light_condition: (plant.lightCondition as LightCondition) || LightCondition.Artificial,
      location: plant.locationDescription || PlantGrowLocation.Indoor,
      image_url: plant.imageUrl ?? undefined,
      notes: plant.notes || '',
    });
    setImagePreviewUri(plant.imageUrl ?? null);
    if (
      plant.locationDescription &&
      !Object.values(PlantGrowLocation).includes(plant.locationDescription as PlantGrowLocation)
    ) {
      setTempCustomLocation(plant.locationDescription);
    } else {
      setTempCustomLocation('');
    }

    // Initialize selectedStrain if plant has a strainId or strain name
    const loadInitialStrain = async () => {
      try {
        // First try to use the strainId if it exists
        if (plant.strainId) {
          console.log(`[EditPlantForm] Initial plant strain ID: ${plant.strainId}`);
          // Attempt to fetch strain by ID from API
          const strainFromApi = await WeedDbService.getById(plant.strainId);
          if (strainFromApi) {
            console.log(
              '[EditPlantForm] Found strain by ID from API:',
              JSON.stringify(strainFromApi, null, 2)
            );
            // Convert Strain to RawStrainApiResponse - only include fields defined in the interface
            const strainForState: RawStrainApiResponse = {
              api_id: strainFromApi.api_id ?? String(strainFromApi.id),
              name: strainFromApi.name,
              id: String(strainFromApi.id),
              type: strainFromApi.type,
              genetics: strainFromApi.genetics,
              description: strainFromApi.description,
              thc: strainFromApi.thc,
              cbd: strainFromApi.cbd,
              floweringTime: strainFromApi.floweringTime,
              fromSeedToHarvest: undefined,
              floweringType: strainFromApi.floweringType,
              growDifficulty: strainFromApi.growDifficulty,
              yieldIndoor: strainFromApi.yieldIndoor ?? strainFromApi.yield_indoor,
              yieldOutdoor: strainFromApi.yieldOutdoor ?? strainFromApi.yield_outdoor,
              heightIndoor: strainFromApi.heightIndoor ?? strainFromApi.height_indoor,
              heightOutdoor: strainFromApi.heightOutdoor ?? strainFromApi.height_outdoor,
              harvestTimeOutdoor:
                strainFromApi.harvestTimeOutdoor ?? strainFromApi.harvest_time_outdoor,
              effects: Array.isArray(strainFromApi.effects)
                ? strainFromApi.effects
                : strainFromApi.effects
                  ? [strainFromApi.effects]
                  : [],
              flavors: Array.isArray(strainFromApi.flavors)
                ? strainFromApi.flavors
                : strainFromApi.flavors
                  ? [strainFromApi.flavors]
                  : [],
              terpenes: (strainFromApi as RawStrainApiResponse).terpenes,
              image_url: strainFromApi.imageUrl ?? strainFromApi.image,
              imageUrl: strainFromApi.imageUrl,
              image: strainFromApi.image,
              link: strainFromApi.url ?? strainFromApi.link,
              parents: strainFromApi.parents,
              breeder: strainFromApi.breeder,
              origin: (strainFromApi as RawStrainApiResponse).origin,
            };

            setSelectedStrain(strainForState);
            // Update the cannabis type based on the strain data
            if (strainForState.type) {
              setValue(
                'cannabis_type',
                capitalizeFirstLetter(strainForState.type) as CannabisType,
                { shouldDirty: true }
              );
            }
            return;
          }
        }

        // Fallback to strain name search if no valid ID or API lookup failed
        if (plant.strain) {
          console.log(`[EditPlantForm] Falling back to search by strain name: ${plant.strain}`);
          // First try local search
          const localMatches = searchStrainsByName(plant.strain);
          if (localMatches.length > 0 && localMatches[0]) {
            const localStrain = localMatches[0];
            // Use type-safe transformation instead of unsafe type assertion
            const strainForState: RawStrainApiResponse = transformLocalStrainToApiResponse(localStrain);
            setSelectedStrain(strainForState);
            console.log(
              '[EditPlantForm] Found strain from local data (adapted to RawStrainApiResponse):',
              JSON.stringify(strainForState, null, 2)
            );
            if (strainForState.type) {
              setValue(
                'cannabis_type',
                capitalizeFirstLetter(strainForState.type) as CannabisType,
                { shouldDirty: true }
              );
            }
            return;
          }

          // If local search fails, try API search
          console.log('[EditPlantForm] Local search failed, trying API search');
          const apiResults = await WeedDbService.search(plant.strain);
          const bestMatchFromApiSearch =
            apiResults.data.find(
              (strain) => strain.name.toLowerCase() === plant.strain?.toLowerCase()
            ) || apiResults.data[0];

          if (bestMatchFromApiSearch) {
            // Convert Strain (from weed-db) to RawStrainApiResponse
            if (typeof bestMatchFromApiSearch.api_id === 'string') {
              const strainForState: RawStrainApiResponse = {
                id: String(bestMatchFromApiSearch.id), // Ensure id is string for RawStrainApiResponse if it uses string
                api_id: bestMatchFromApiSearch.api_id, // Now we know it's a string
                name: bestMatchFromApiSearch.name,
                type: bestMatchFromApiSearch.type,
                thc: bestMatchFromApiSearch.thc,
                cbd: bestMatchFromApiSearch.cbd,
                description: bestMatchFromApiSearch.description ?? undefined,
                effects: Array.isArray(bestMatchFromApiSearch.effects)
                  ? bestMatchFromApiSearch.effects
                  : bestMatchFromApiSearch.effects
                    ? [bestMatchFromApiSearch.effects]
                    : [],
                flavors: Array.isArray(bestMatchFromApiSearch.flavors)
                  ? bestMatchFromApiSearch.flavors
                  : bestMatchFromApiSearch.flavors
                    ? [bestMatchFromApiSearch.flavors]
                    : [],
                lineage:
                  bestMatchFromApiSearch.parents && bestMatchFromApiSearch.parents.length > 0
                    ? bestMatchFromApiSearch.parents
                    : undefined,
                terpenes: (bestMatchFromApiSearch as RawStrainApiResponse).terpenes ?? undefined,
                images: bestMatchFromApiSearch.image
                  ? [bestMatchFromApiSearch.image]
                  : bestMatchFromApiSearch.imageUrl
                    ? [bestMatchFromApiSearch.imageUrl]
                    : undefined,
                image_url:
                  bestMatchFromApiSearch.imageUrl ?? bestMatchFromApiSearch.image ?? undefined,
                seed_company: bestMatchFromApiSearch.breeder ?? undefined,
                genetics: bestMatchFromApiSearch.genetics ?? undefined,
                floweringTime: bestMatchFromApiSearch.floweringTime ?? undefined, // Direct assignment
                // Remove flowering_time_min and flowering_time_max as Strain doesn't directly provide them for parsing here
                yield_min:
                  (bestMatchFromApiSearch.yieldIndoor ||
                    (bestMatchFromApiSearch as RawStrainApiResponse).yield_min) ??
                  undefined,
                yield_max:
                  (bestMatchFromApiSearch.yieldOutdoor ||
                    (bestMatchFromApiSearch as RawStrainApiResponse).yield_max) ??
                  undefined,
                difficulty: bestMatchFromApiSearch.growDifficulty ?? undefined,
                rating: bestMatchFromApiSearch.rating ?? 0,
                reviews_count: (bestMatchFromApiSearch as RawStrainApiResponse).reviews_count ?? 0,
                link: bestMatchFromApiSearch.url ?? bestMatchFromApiSearch.link ?? undefined,
                parents: bestMatchFromApiSearch.parents ?? undefined,
                breeder: bestMatchFromApiSearch.breeder ?? undefined,
                origin: (bestMatchFromApiSearch as RawStrainApiResponse).origin ?? undefined,
                floweringType: bestMatchFromApiSearch.floweringType ?? undefined,
                fromSeedToHarvest: (bestMatchFromApiSearch as RawStrainApiResponse).fromSeedToHarvest ?? undefined,
                growDifficulty: bestMatchFromApiSearch.growDifficulty ?? undefined,
                yieldIndoor:
                  bestMatchFromApiSearch.yieldIndoor ??
                  bestMatchFromApiSearch.yield_indoor ??
                  undefined,
                yieldOutdoor:
                  bestMatchFromApiSearch.yieldOutdoor ??
                  bestMatchFromApiSearch.yield_outdoor ??
                  undefined,
                heightIndoor:
                  bestMatchFromApiSearch.heightIndoor ??
                  bestMatchFromApiSearch.height_indoor ??
                  undefined,
                heightOutdoor:
                  bestMatchFromApiSearch.heightOutdoor ??
                  bestMatchFromApiSearch.height_outdoor ??
                  undefined,
                harvestTimeOutdoor:
                  bestMatchFromApiSearch.harvestTimeOutdoor ??
                  bestMatchFromApiSearch.harvest_time_outdoor ??
                  undefined,
              };
              console.log(
                '[EditPlantForm] Found strain from API search (adapted to RawStrainApiResponse):',
                JSON.stringify(strainForState, null, 2)
              );
              setSelectedStrain(strainForState);
              if (strainForState.type) {
                setValue(
                  'cannabis_type',
                  capitalizeFirstLetter(strainForState.type) as CannabisType,
                  { shouldDirty: true }
                );
              }
            } else {
              console.warn(
                '[EditPlantForm] Strain from API search is missing a string api_id:',
                bestMatchFromApiSearch
              );
              setSelectedStrain(null); // Or handle as appropriate
            }
            return;
          }
        }

        // If all lookups fail, reset the selectedStrain
        setSelectedStrain(null);
        console.log('[EditPlantForm] No matching strain found for this plant');
      } catch (error) {
        console.error('[EditPlantForm] Error loading initial strain:', error);
        setSelectedStrain(null);
      }
    };

    loadInitialStrain();
  }, [plant, reset, setValue]);

  // ✅ Performance optimized image processing to avoid memory issues
  // Following React Native best practices for large image handling
  const pickImage = async () => {
    try {
      console.log('[EditPlantForm] Launching image library...');
      const result = await selectFromGallery();
      console.log('[EditPlantForm] Image picker result:', result);

      if (result) {
        console.log('[EditPlantForm] Image selected');
        setImagePreviewUri(result.uri);
        setValue('image_url', undefined, { shouldDirty: true });
      }
    } catch (error) {
      console.error('[EditPlantForm] Error picking image:', error);
      Alert.alert(
        t('editPlantForm:alerts.galleryErrorTitle'),
        t('editPlantForm:alerts.galleryErrorMessage')
      );
    }
  };

  const takePhotoHandler = async () => {
    const result = await takePhoto();
    if (result) {
      setImagePreviewUri(result.uri);
      setValue('image_url', undefined, { shouldDirty: true });
    }
  };

  const handleImageUpload = async (userId: string): Promise<string | null> => {
    if (!imagePreviewUri || imagePreviewUri === (plant.imageUrl ?? null))
      return plant.imageUrl ?? null; // No new image or same image
    
    setUploadingImage(true);
    try {
      // Delete old image if it exists and a new one is being uploaded
      if (plant.imageUrl) {
        try {
          const oldImageFileName = plant.imageUrl.split('/').pop();
          if (oldImageFileName && userId) {
            const oldImagePath = `${userId}/${oldImageFileName}`;
            console.log('Attempting to delete old image:', oldImagePath);
            const { error: deleteError } = await supabase.storage
              .from('plants')
              .remove([oldImagePath]);
            if (deleteError) {
              console.warn(
                'Failed to delete old image, it might not exist or there was an error:',
                deleteError.message
              );
            }
          } else {
            console.warn('Could not determine old image path for deletion.');
          }
        } catch (e) {
          console.warn('Error during old image deletion process:', e);
        }
      }

      const result = await uploadPlantImage(userId, imagePreviewUri);
      if (result.success && result.publicUrl) {
        setValue('image_url', result.publicUrl, { shouldValidate: true, shouldDirty: true });
        return result.publicUrl;
      }
      return plant.imageUrl ?? null; // Return old image URL on failure
    } finally {
      setUploadingImage(false);
    }
  };
  const onSubmit = async (data: PlantFormData) => {
    // Enhanced check for meaningful changes including strain data
    if (
      !isDirty &&
      imagePreviewUri === (plant.imageUrl ?? null) &&
      data.location === plant.locationDescription &&
      data.strain === plant.strain &&
      data.name === plant.name
    ) {
      // Check for strain-related changes even if form fields appear unchanged
      let noMeaningfulChange = true;

      // Case 1: Selected a strain but it's different from the plant's current strainId
      if (selectedStrain && plant.strainId !== selectedStrain.id) {
        console.log('[EditPlantForm] Detected strain ID change:', {
          currentStrainId: plant.strainId,
          newStrainId: selectedStrain.id,
        });
        noMeaningfulChange = false;
      }

      // Case 2: No strain selected now but plant had a strainId before, and name changed
      if (!selectedStrain && plant.strainId && data.strain !== plant.strain) {
        console.log('[EditPlantForm] Detected strain ID removal and name change');
        noMeaningfulChange = false;
      }

      // Case 3: Selected strain name doesn't match form data (misalignment)
      if (selectedStrain && data.strain !== selectedStrain.name) {
        console.log(
          '[EditPlantForm] Detected strain name mismatch between form and selected strain'
        );
        noMeaningfulChange = false;
      }

      if (noMeaningfulChange) {
        Alert.alert('No Changes', "You haven't made any meaningful changes to the plant.");
        if (onUpdateSuccess) onUpdateSuccess();
        return;
      }
    }

    setIsSubmitting(true);
    console.log(
      '[EditPlantForm onSubmit] Form submitted. Initial data:',
      JSON.stringify(data, null, 2)
    );
    console.log(
      '[EditPlantForm onSubmit] Current selectedStrain state:',
      JSON.stringify(selectedStrain, null, 2)
    );

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Authentication Error', 'You must be logged in.');
        setIsSubmitting(false);
        return;
      }

      let finalImageUrl: string | null | undefined = data.image_url as string | null; // Initialize with current form value

      if (imagePreviewUri && imagePreviewUri !== (plant.imageUrl ?? null)) {
        finalImageUrl = await handleImageUpload(user.id);
        if (!finalImageUrl && imagePreviewUri) {
          Alert.alert(
            t('editPlantForm:alerts.imageUploadFailedTitle'),
            t('editPlantForm:alerts.imageUploadFailedMessage')
          );
          setIsSubmitting(false);
          return;
        }
      } else if (imagePreviewUri === null && plant.imageUrl) {
        // Image was removed by the user
        try {
          const oldImageFileName = plant.imageUrl.split('/').pop();
          if (oldImageFileName && user.id) {
            const oldImagePath = `${user.id}/${oldImageFileName}`;
            console.log('Deleting removed image:', oldImagePath);
            const { error: deleteError } = await supabase.storage
              .from('plants')
              .remove([oldImagePath]);
            if (deleteError) {
              console.warn('Failed to delete removed image:', deleteError.message);
            }
          }
        } catch (e) {
          console.warn('Error deleting removed image:', e);
        }
        finalImageUrl = null;
      } else {
        finalImageUrl = plant.imageUrl;
      }

      console.log('[EditPlantForm] Data from form (data object):', JSON.stringify(data, null, 2));
      console.log(
        '[EditPlantForm] selectedStrain object (state):',
        JSON.stringify(selectedStrain, null, 2)
      );

      // --- Strain Synchronization Logic ---
      let finalStrainId: string | null = null;
      if (selectedStrain && selectedStrain.api_id) {
        // Ensure api_id is present
        // Use findOrCreateLocalStrain to ensure local mapping
        const strainDataForSync = {
          api_id: selectedStrain.api_id, // Use api_id from selectedStrain (it's RawStrainApiResponse)
          name: selectedStrain.name,
          species: selectedStrain.type as StrainSpecies,
          description: selectedStrain.description ?? undefined, // Ensure undefined instead of null
          thc: selectedStrain.thc?.toString(),
          cbd: selectedStrain.cbd?.toString(),
          effects: Array.isArray(selectedStrain.effects) ? selectedStrain.effects : [], // Ensure effects is string[]
          flavors: Array.isArray(selectedStrain.flavors) ? selectedStrain.flavors : [], // Ensure flavors is string[]
        };
        const localStrain = await findOrCreateLocalStrain(selectedStrain.api_id, strainDataForSync);
        if (localStrain && localStrain.id) {
          finalStrainId = localStrain.id;
        }
      } else if (data.strain && typeof data.strain === 'string' && data.strain.trim().length > 0) {
        // Try to find or create a local strain by searching API/local DB
        try {
          const apiResults = await WeedDbService.search(data.strain);
          const bestMatch = apiResults.data.find(
            (strain) => strain.name.toLowerCase() === (data.strain as string).toLowerCase()
          );
          if (bestMatch && typeof bestMatch.api_id === 'string') {
            // Ensure api_id is a string
            const strainDataForSync = {
              api_id: bestMatch.api_id, // Use api_id from bestMatch
              name: bestMatch.name,
              species: bestMatch.type as StrainSpecies,
              description: bestMatch.description ?? undefined, // Ensure undefined instead of null
              thc: bestMatch.thc?.toString(),
              cbd: bestMatch.cbd?.toString(),
              effects: Array.isArray(bestMatch.effects)
                ? bestMatch.effects
                : bestMatch.effects
                  ? [bestMatch.effects]
                  : [], // Ensure effects is string[] or undefined
              flavors: Array.isArray(bestMatch.flavors)
                ? bestMatch.flavors
                : bestMatch.flavors
                  ? [bestMatch.flavors]
                  : [], // Ensure flavors is string[] or undefined
            };
            const localStrain = await findOrCreateLocalStrain(bestMatch.api_id, strainDataForSync);
            if (localStrain && localStrain.id) {
              finalStrainId = localStrain.id;
            }
          } else {
            // Fallback to local DB
            const localMatches = searchStrainsByName(data.strain as string);
            if (localMatches.length > 0 && localMatches[0]) {
              const matchedLocalStrain = localMatches[0];
              const apiCompatibleStrain = {
                api_id: matchedLocalStrain.id, // Use local ID as api_id
                name: matchedLocalStrain.name,
                species: mapLocalTypeToApiType(matchedLocalStrain.type as string) as StrainSpecies,
                description: matchedLocalStrain.description ?? undefined, // Ensure undefined instead of null
                thc: matchedLocalStrain.thcContent?.toString(),
                cbd: matchedLocalStrain.cbdContent?.toString(),
                effects: matchedLocalStrain.effects || [],
                flavors: matchedLocalStrain.flavors || [],
              };
              // Assuming localMatches[0].id is a string (UUID)
              const localStrain = await findOrCreateLocalStrain(
                matchedLocalStrain.id,
                apiCompatibleStrain
              );
              if (localStrain && localStrain.id) {
                finalStrainId = localStrain.id;
              }
            }
          }
        } catch (apiError) {
          console.error('[EditPlantForm] API search failed:', apiError);
          // Fallback to local DB
          const localMatches = searchStrainsByName(data.strain as string);
          if (localMatches.length > 0 && localMatches[0]) {
            const matchedLocalStrain = localMatches[0];
            const apiCompatibleStrain = {
              api_id: matchedLocalStrain.id, // Use local ID as api_id
              name: matchedLocalStrain.name,
              species: mapLocalTypeToApiType(matchedLocalStrain.type as string) as StrainSpecies,
              description: matchedLocalStrain.description ?? undefined, // Ensure undefined instead of null
              thc: matchedLocalStrain.thcContent?.toString(),
              cbd: matchedLocalStrain.cbdContent?.toString(),
              effects: matchedLocalStrain.effects || [],
              flavors: matchedLocalStrain.flavors || [],
            };
            // Assuming localMatches[0].id is a string (UUID)
            const localStrain = await findOrCreateLocalStrain(
              matchedLocalStrain.id,
              apiCompatibleStrain
            );
            if (localStrain && localStrain.id) {
              finalStrainId = localStrain.id;
            }
          }
        }
      }
      // --- End Strain Synchronization Logic ---

      const plantedDateStr =
        data.planted_date instanceof Date
          ? data.planted_date.toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
      const updatePayload: PlantUpdatePayload = {
        name: data.name as string,
        strainNameDisplay: data.strain as string,
        strainIdToSet: finalStrainId,
        plantedDate: plantedDateStr || format(new Date(), 'yyyy-MM-dd'), // Ensure we have a default date if undefined
        growthStage: data.growth_stage as GrowthStage,
        notes: (data.notes as string) || '',
        imageUrl: finalImageUrl ?? undefined,
        cannabisType: (data.cannabis_type as CannabisType) || CannabisType.Unknown,
        growMedium: (data.grow_medium as GrowMedium) || GrowMedium.Soil,
        lightCondition: (data.light_condition as LightCondition) || LightCondition.Artificial,
        locationDescription: (data.location as string) || '',
      };

      console.log('[EditPlantForm] Final update payload:', JSON.stringify(updatePayload, null, 2)); // Execute the plant update in the database
      const plantRecord = await database?.get('plants').find(plant.id);
      let result = false;
      if (plantRecord) {
        await database?.action(async () => {
          await plantRecord.update((p) => {
            // Cast p to Plant to access fields
            const plantRecord = p as unknown as Plant;
            plantRecord.name = updatePayload.name;
            plantRecord.strain = updatePayload.strainNameDisplay;
            plantRecord.strainId = updatePayload.strainIdToSet;
            plantRecord.plantedDate = updatePayload.plantedDate;
            plantRecord.growthStage = updatePayload.growthStage;
            plantRecord.notes = updatePayload.notes || '';
            plantRecord.imageUrl = updatePayload.imageUrl;
            plantRecord.cannabisType = updatePayload.cannabisType;
            plantRecord.growMedium = updatePayload.growMedium;
            plantRecord.lightCondition = updatePayload.lightCondition;
            plantRecord.locationDescription = updatePayload.locationDescription;
          });
        });
        result = true;
      }

      if (result) {
        console.log('[EditPlantForm] Plant updated successfully');
        Alert.alert(t('editPlantForm:alerts.successTitle'), t('editPlantForm:alerts.successMessage'));
        if (onUpdateSuccess) onUpdateSuccess();
      } else {
        Alert.alert(t('editPlantForm:alerts.errorTitle'), t('editPlantForm:alerts.errorMessage'));
      }
    } catch (error) {
      console.error('[EditPlantForm] Error updating plant:', error);
      Alert.alert(t('editPlantForm:alerts.errorTitle'), t('editPlantForm:alerts.imageError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTextInput = (
    fieldName: keyof PlantFormData,
    placeholder: string,
    keyboardType?: 'default' | 'numeric' | 'email-address',
    multiline: boolean = false,
    maxLength?: number
  ) => {
    // Get the input index for keyboard navigation
    const inputIndex = fieldNames.indexOf(fieldName as string);
    const inputRef = inputIndex >= 0 ? inputRefs[inputIndex] : useRef<TextInput>(null);
    
    return (
      <Controller
        control={control}
        name={fieldName}
        render={({ field: { onChange, onBlur, value } }) => (
          <EnhancedTextInput
            ref={inputRef}
            placeholder={placeholder}
            value={value?.toString() || ''}
            onChangeText={onChange}
            onBlur={onBlur}
            onFocus={() => {}}
            onSubmitEditing={() => {}}
            keyboardType={keyboardType}
            multiline={multiline}
            maxLength={maxLength}
            showCharacterCount={!!maxLength}
            error={errors[fieldName]?.message}
            returnKeyType={multiline ? 'default' : 'next'}
            blurOnSubmit={multiline}
            accessibilityLabel={t(`editPlantForm:accessibility.${fieldName}Label`)}
            accessibilityHint={t(`editPlantForm:accessibility.${fieldName}Hint`)}
          />
        )}
      />
    );
  };

  const renderEnumPicker = (fieldName: keyof PlantFormData, enumObject: Record<string, string>, title: string) => {
    const formatLabel = (str: string) =>
      str.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());

    // Type-safe helper for enum value setting (scoped at component level)
    const setEnumValue = (
      fieldName: keyof PlantFormData,
      value: string
    ) => {
      setValue(fieldName, value as any, { shouldValidate: true, shouldDirty: true });
    };

    const handleEnumSelection = () => {
      // Use Alert.alert for enum picker
      Alert.alert(title, t('enumPicker.selectOption'), [
        ...Object.values(enumObject).map((option: unknown) => ({
          text: formatLabel(String(option)),
          onPress: () => setEnumValue(fieldName, String(option)),
        })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ]);
    };

    return (
      <Controller
        control={control}
        name={fieldName}
        render={({ field: { value } }) => (
          <EnumOption
            label={
              value
                ? formatLabel(String(value))
                : t('enumPicker.selectField', { field: title })
            }
            onPress={handleEnumSelection}
            accessibilityLabel={t(`editPlantForm:accessibility.${fieldName}Label`)}
            accessibilityHint={t(`editPlantForm:accessibility.${fieldName}Hint`)}
          />
        )}
      />
    );
  };

  const renderLocationPicker = (): JSX.Element => {
    const currentValue = watch('location');

    return (
      <>
        <Pressable {...locationPickerAnimation.handlers}>
          <Animated.View
            style={locationPickerAnimation.animatedStyle}
            className="mb-1 flex-row items-center justify-between rounded-lg border border-neutral-300 px-4 py-3 dark:border-neutral-600">
            <ThemedText className="text-neutral-800 dark:text-neutral-100">
              {currentValue || t('locationPicker.selectLocation')}
            </ThemedText>
            <OptimizedIcon
              name="chevron-down"
              size={24}
              className="text-neutral-400 dark:text-neutral-500"
            />
          </Animated.View>
        </Pressable>

        {errors.location && (
          <ThemedText className="text-status-danger mt-1 text-xs">
            {errors.location.message}
          </ThemedText>
        )}

        <Modal
          transparent
          visible={showLocationModal}
          onRequestClose={() => setShowLocationModal(false)}>
          <Pressable
            className="flex-1 items-center justify-center bg-black/50"
            onPress={() => setShowLocationModal(false)}>
            <ThemedView className="max-h-3/5 w-4/5 rounded-lg bg-neutral-50 p-5 dark:bg-neutral-800">
              <ScrollView>
                {Object.values(PlantGrowLocation).map((loc) => (
                  <LocationOption
                    key={loc}
                    location={loc}
                    onPress={() => {
                      setValue('location', loc, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                      setTempCustomLocation('');
                      setShowLocationModal(false);
                    }}
                    accessibilityLabel={t(`editPlantForm:accessibility.locationOptionLabel`, { location: loc })}
                    accessibilityHint={t(`editPlantForm:accessibility.locationOptionHint`, { location: loc })}
                  />
                ))}

                {/* Custom Location Input */}
                <ThemedView className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-700">
                  <TextInput
                    className="mb-3 rounded-lg border border-neutral-300 px-4 py-3 text-base placeholder:text-neutral-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                    placeholder={t('locationPicker.customLocationPlaceholder')}
                    value={tempCustomLocation}
                    onChangeText={setTempCustomLocation}
                    accessibilityLabel={t('editPlantForm:accessibility.customLocationLabel')}
                    accessibilityHint={t('editPlantForm:accessibility.customLocationHint')}
                  />

                  <AnimatedSubmitButton
                    onPress={() => {
                      if (tempCustomLocation.trim()) {
                        setValue('location', tempCustomLocation.trim(), {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                    }
                    setShowLocationModal(false);
                  }}
                  isSubmitting={false}
                  label={t('common.done')}
                  accessibilityHint={t('editPlantForm:accessibility.customLocationDoneHint')}
                  accessibilityInProgressLabel={t('editPlantForm:accessibility.customLocationDoneInProgress')}
                />
              </ThemedView>
            </ScrollView>
          </ThemedView>
        </Pressable>
      </Modal>
      </>
    );
  };

  return (
    <ThemedView className="flex-1">
      <EnhancedKeyboardWrapper className="flex-1 p-5">
        <ThemedText variant="heading" className="mb-5 text-center">
          {t('common.editPlantDetails')}
        </ThemedText>

        {/* Image Picker */}
        <ThemedText className="mb-2 mt-4 text-base font-medium text-neutral-700 dark:text-neutral-200">
          {t('common.plantImage')}
        </ThemedText>
        <ThemedView className="mb-4 items-center">
          {imagePreviewUri ? (
            <Image
              source={{ uri: imagePreviewUri }}
              className="mb-3 rounded-lg border border-neutral-300 dark:border-neutral-600"
              style={{ width: 200, height: 150 }}
            />
          ) : (
            <ThemedView
              className="mb-3 items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-600"
              style={{ width: 200, height: 150 }}>
              <OptimizedIcon
                name="image-outline"
                size={50}
                className="text-neutral-400 dark:text-neutral-500"
              />
            </ThemedView>
          )}

          <ThemedView className="max-w-75 w-full flex-row justify-around">
            <AnimatedImageButton
              onPress={pickImage}
              icon="images-outline"
              label={t('editPlantForm:buttons.gallery')}
              disabled={uploadingImage}
              accessibilityHint={t('editPlantForm:accessibility.galleryHint')}
            />
            <AnimatedImageButton
              onPress={takePhotoHandler}
              icon="camera-outline"
              label={t('editPlantForm:buttons.camera')}
              disabled={uploadingImage}
              accessibilityHint={t('editPlantForm:accessibility.cameraHint')}
            />
          </ThemedView>
        </ThemedView>

        {/* Plant Name */}
        <ThemedText className="mb-2 mt-4 text-base font-medium text-neutral-700 dark:text-neutral-200">
          {t('common.plantName')}
        </ThemedText>
        
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <ThemedView>
              <EnhancedTextInput
                ref={keyboardFields[0]?.ref}
                value={value}
                onChangeText={onChange}
                placeholder={t('editPlantForm:placeholders.plantName')}
                className="mb-2 rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-3 text-base text-neutral-800 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                accessibilityLabel={t('editPlantForm:accessibility.plantName')}
                accessibilityHint={t('editPlantForm:accessibility.plantNameHint')}
                returnKeyType="next"
                onSubmitEditing={() => {
                  const nextField = keyboardFields[1]?.ref?.current;
                  if (nextField) {
                    nextField.focus();
                  }
                }}
              />
              {error && (
                <ThemedText className="text-status-danger mt-1 text-xs">{error.message}</ThemedText>
              )}
            </ThemedView>
          )}
        />

        {/* Strain Autocomplete */}
        <ThemedText className="mb-2 mt-4 text-base font-medium text-neutral-700 dark:text-neutral-200">
          {t('common.strain')}
        </ThemedText>
        <Controller
          control={control}
          name="strain"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <ThemedView>
              <StrainAutocomplete
                initialStrainName={value || ''}
                onStrainSelect={(strainObj: RawStrainApiResponse | null) => {
                  if (strainObj) {
                    // Set the strain name in the form
                    onChange(strainObj.name);
                    setSelectedStrain(strainObj);
                    
                    // Auto-fill cannabis_type if provided
                    if (strainObj.type) {
                      const autoFilledType = capitalizeFirstLetter(strainObj.type);
                      setValue('cannabis_type', autoFilledType as CannabisType);
                    }
                    
                    console.log(
                      '[EditPlantForm StrainAutocomplete onSelect] Selected strainObj:',
                      JSON.stringify(strainObj, null, 2)
                    );
                    console.log(
                      `[EditPlantForm] Auto-filled cannabis_type to ${strainObj.type} from strain data`
                    );
                  } else {
                    // Handle null selection (clear)
                    onChange('');
                    setSelectedStrain(null);
                    console.log(
                      '[EditPlantForm StrainAutocomplete onSelect] Strain selection cleared'
                    );
                  }
                }}
                placeholder={t('editPlantForm:placeholders.strain')}
              />
              {error && (
                <ThemedText className="text-status-danger mt-1 text-xs">{error.message}</ThemedText>
              )}

              {/* Display selected strain details if available */}
              {selectedStrain && (
                <ThemedView className="mt-2 rounded-lg bg-primary-50 p-2 dark:bg-primary-900/20">
                  <ThemedView className="mb-1 flex-row items-center">
                    <OptimizedIcon
                      name={
                        selectedStrain.type?.toLowerCase().includes('indica')
                          ? 'moon-outline'
                          : selectedStrain.type?.toLowerCase().includes('sativa')
                            ? 'sun'
                            : 'leaf'
                      }
                      size={16}
                      className="mr-1.5 text-primary-500"
                    />
                    <ThemedText className="text-sm font-medium text-primary-500">
                      {selectedStrain.type || t('editPlantForm:labels.unknownType')}
                      {selectedStrain.floweringTime
                        ? ` • ~${selectedStrain.floweringTime} week flowering`
                        : ''}
                    </ThemedText>
                  </ThemedView>

                  {selectedStrain.thc || selectedStrain.cbd ? (
                    <ThemedText className="text-xs text-neutral-600 dark:text-neutral-400">
                      {selectedStrain.thc ? `THC: ${selectedStrain.thc}%` : ''}
                      {selectedStrain.thc && selectedStrain.cbd ? ' • ' : ''}
                      {selectedStrain.cbd ? `CBD: ${selectedStrain.cbd}%` : ''}
                    </ThemedText>
                  ) : null}
                </ThemedView>
              )}
            </ThemedView>
          )}
        />

        {/* Cannabis Type */}
        <ThemedText className="mb-2 mt-4 text-base font-medium text-neutral-700 dark:text-neutral-200">
          {t('common.cannabisType')}
        </ThemedText>
        {renderEnumPicker('cannabis_type', CannabisType, t('editPlantForm:labels.cannabisType'))}

        {/* Growth Stage */}
        <ThemedText className="mb-2 mt-4 text-base font-medium text-neutral-700 dark:text-neutral-200">
          {t('common.growthStage')}
        </ThemedText>
        {renderEnumPicker('growth_stage', GROWTH_STAGES, t('editPlantForm:labels.growthStage'))}

        {/* Planted Date */}
        <ThemedText className="mb-2 mt-4 text-base font-medium text-neutral-700 dark:text-neutral-200">
          {t('common.plantedDate')}
        </ThemedText>
        <Controller
          control={control}
          name="planted_date"
          render={({ field: { value, onChange: onDateChange } }) => {
            return (
              <>
                <AnimatedDateButton 
                  onPress={() => setShowDatePicker(true)} 
                  value={value} 
                  accessibilityLabel={t('editPlantForm:accessibility.dateLabel', { date: format(value, 'PPP') })}
                  accessibilityHint={t('editPlantForm:accessibility.dateHint')}
                />                
                {showDatePicker && (
                  <DateTimePicker
                    value={value || new Date()}
                    mode="date"
                    display="default"
                    onChange={(_event: unknown, selectedDate?: Date) => {
                      setShowDatePicker(false);
                      if (selectedDate) {
                        onDateChange(selectedDate);
                        setValue('planted_date', selectedDate, {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                      }
                    }}
                    maximumDate={new Date()}
                    accessibilityLabel={t('editPlantForm:accessibility.datePickerLabel')}
                    accessibilityHint={t('editPlantForm:accessibility.datePickerHint')}
                  />
                )}
              </>
            );
          }}
        />
        {errors.planted_date && (
          <ThemedText className="text-status-danger mt-1 text-xs">
            {errors.planted_date.message}
          </ThemedText>
        )}

        {/* Location Description */}
        <ThemedText className="mb-2 mt-4 text-base font-medium text-neutral-700 dark:text-neutral-200">
          {t('common.location')}
        </ThemedText>
        {renderLocationPicker()}

        {/* Grow Medium */}
        <ThemedText className="mb-2 mt-4 text-base font-medium text-neutral-700 dark:text-neutral-200">
          {t('common.growMedium')}
        </ThemedText>
        {renderEnumPicker('grow_medium', GrowMedium, t('editPlantForm:labels.growMedium'))}

        {/* Light Condition */}
        <ThemedText className="mb-2 mt-4 text-base font-medium text-neutral-700 dark:text-neutral-200">
          {t('common.lightCondition')}
        </ThemedText>
        {renderEnumPicker('light_condition', LightCondition, t('editPlantForm:labels.lightCondition'))}

        {/* Notes */}
        <ThemedText className="mb-2 mt-4 text-base font-medium text-neutral-700 dark:text-neutral-200">
          {t('common.notes')}
        </ThemedText>
        {renderTextInput('notes', t('editPlantForm:placeholders.notes'), 'default', true, 500)}

        <AnimatedSubmitButton
          onPress={handleSubmit(onSubmit)}
          isSubmitting={isSubmitting}
          label={isSubmitting ? t('editPlantForm:buttons.saving') : t('editPlantForm:buttons.updatePlant')}
          accessibilityHint={t('editPlantForm:accessibility.submitHint', { label: t('editPlantForm:buttons.updatePlant') })}
          accessibilityInProgressLabel={t('editPlantForm:accessibility.submitInProgress', { label: t('editPlantForm:buttons.updatePlant') })}
        />
      </EnhancedKeyboardWrapper>
    </ThemedView>
  );
}
