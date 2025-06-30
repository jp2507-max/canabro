/* eslint-disable prettier/prettier */
'use client';

// ✅ React Native & Expo imports - following 2025 best practices
import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import {
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { z } from 'zod';

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
import { KeyboardToolbar } from '../ui/KeyboardToolbar';

import { useButtonAnimation } from '@/lib/animations';
import { searchStrainsByName } from '@/lib/data/strains';
import { useDatabase } from '@/lib/hooks/useDatabase';
import { useEnhancedKeyboard } from '@/lib/hooks/useEnhancedKeyboard';
import { Plant } from '@/lib/models/Plant';
import { findOrCreateLocalStrain } from '@/lib/services/strain-sync-service';
import { WeedDbService } from '@/lib/services/weed-db.service';
import supabase from '@/lib/supabase';
import {
  GrowthStage as PlantGrowthStage,
  PlantGrowLocation,
  LightCondition,
  GrowMedium,
  CannabisType,
} from '@/lib/types/plant';
import { StrainSpecies } from '@/lib/types/strain';
import { RawStrainApiResponse } from '@/lib/types/weed-db';

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

// Define an interface for the update payload to ensure type safety
interface PlantUpdatePayload {
  name: string;
  strainNameDisplay: string;
  strainIdToSet: string | null;
  plantedDate: string;
  growthStage: PlantGrowthStage;
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
}

const EnumOption = ({ label, onPress }: EnumOptionProps) => {
  const { animatedStyle, handlers } = useButtonAnimation({
    onPress,
    enableHaptics: true,
    hapticStyle: 'light',
  });

  return (
    <Pressable {...handlers}>
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
}

const LocationOption = ({ location, onPress }: LocationOptionProps) => {
  const { animatedStyle, handlers } = useButtonAnimation({
    onPress,
    enableHaptics: true,
    hapticStyle: 'light',
  });

  return (
    <Pressable {...handlers}>
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
// GrowthStage is already imported as PlantGrowthStage

// Zod Validation Schema (similar to AddPlantForm, adjust if needed)
const plantFormSchema = z.object({
  name: z.string().min(1, 'Plant name is required.'),
  strain: z.string().min(1, 'Strain is required.'), // This will be the string name
  planted_date: z.date({ required_error: 'Planted date is required.' }),
  growth_stage: z.nativeEnum(PlantGrowthStage, { required_error: 'Growth stage is required.' }),
  cannabis_type: z.nativeEnum(CannabisType).optional(),
  grow_medium: z.nativeEnum(GrowMedium).optional(),
  light_condition: z.nativeEnum(LightCondition).optional(),
  location_description: z.string().min(1, 'Location description is required.'),
  image_url: z.string().url('Invalid image URL format.').optional().nullable(),
  notes: z.string().optional(),
});

type PlantFormData = z.infer<typeof plantFormSchema>;

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
      growth_stage: (plant.growthStage as PlantGrowthStage) || PlantGrowthStage.SEEDLING,
      cannabis_type: (plant.cannabisType as CannabisType) || CannabisType.Unknown,
      grow_medium: (plant.growMedium as GrowMedium) || GrowMedium.Soil,
      light_condition: (plant.lightCondition as LightCondition) || LightCondition.Artificial,
      location_description: plant.locationDescription || PlantGrowLocation.Indoor,
      image_url: plant.imageUrl ?? null,
      notes: plant.notes || '',
    },
  });

  const [selectedStrain, setSelectedStrain] = useState<RawStrainApiResponse | null>(null); // Will hold the full strain object
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreviewUri, setImagePreviewUri] = useState<string | null>(plant.imageUrl ?? null); // Use ??
  const [uploadingImage, setUploadingImage] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
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
    { name: 'location_description', ref: useRef<TextInput>(null) },
    { name: 'notes', ref: useRef<TextInput>(null) },
  ], []);

  const inputRefs = useMemo(() => keyboardFields.map(field => field.ref), [keyboardFields]);
  const fieldNames = useMemo(() => keyboardFields.map(field => field.name), [keyboardFields]);

  const {
    isKeyboardVisible,
    keyboardHeight,
    currentIndex,
    goToNextInput,
    goToPreviousInput,
    dismissKeyboard,
    canGoNext,
    canGoPrevious,
    setCurrentIndex,
  } = useEnhancedKeyboard(inputRefs, inputRefs.length);
  
  const getCurrentFieldName = () => {
    return fieldNames[currentIndex] || 'Unknown Field';
  };
  // Populate form with plant data on mount and when plant prop changes
  useEffect(() => {
    reset({
      name: plant.name || '',
      strain: plant.strain || '', // strain name
      planted_date: plant.plantedDate ? parseISO(plant.plantedDate) : new Date(),
      growth_stage: (plant.growthStage as PlantGrowthStage) || PlantGrowthStage.SEEDLING,
      cannabis_type: (plant.cannabisType as CannabisType) || CannabisType.Unknown,
      grow_medium: (plant.growMedium as GrowMedium) || GrowMedium.Soil,
      light_condition: (plant.lightCondition as LightCondition) || LightCondition.Artificial,
      location_description: plant.locationDescription || PlantGrowLocation.Indoor,
      image_url: plant.imageUrl ?? null,
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
              terpenes: (strainFromApi as any).terpenes,
              image_url: strainFromApi.imageUrl ?? strainFromApi.image,
              imageUrl: strainFromApi.imageUrl,
              image: strainFromApi.image,
              link: strainFromApi.url ?? strainFromApi.link,
              parents: strainFromApi.parents,
              breeder: strainFromApi.breeder,
              origin: (strainFromApi as any).origin,
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
            // Construct an object that matches RawStrainApiResponse
            const strainForState: RawStrainApiResponse = {
              id: (localStrain as any).external_db_id ?? 0, // Use a numeric ID if available, else placeholder
              api_id: localStrain.id, // Use local string UUID as api_id
              name: localStrain.name,
              type: mapLocalTypeToApiType(localStrain.type as string),
              thc: localStrain.thcContent || null,
              cbd: localStrain.cbdContent || null,
              description: localStrain.description ?? undefined,
              effects: localStrain.effects || [],
              flavors: localStrain.flavors || [],
              // Add other fields from RawStrainApiResponse with default values if not in localStrain
              lineage: (localStrain as any).lineage ?? undefined,
              terpenes: (localStrain as any).terpenes ?? undefined,
              images: (localStrain as any).images ?? undefined,
              seed_company: (localStrain as any).seed_company ?? undefined,
              genetics: (localStrain as any).genetics ?? undefined,
              flowering_time_min: (localStrain as any).flowering_time_min ?? undefined,
              flowering_time_max: (localStrain as any).flowering_time_max ?? undefined,
              yield_min: (localStrain as any).yield_min ?? undefined,
              yield_max: (localStrain as any).yield_max ?? undefined,
              difficulty: (localStrain as any).difficulty ?? undefined,
              rating: (localStrain as any).rating ?? 0,
              reviews_count: (localStrain as any).reviews_count ?? 0,
            };
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
                terpenes: (bestMatchFromApiSearch as any).terpenes ?? undefined, // Strain doesn't explicitly have terpenes
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
                    (bestMatchFromApiSearch as any).yield_min) ??
                  undefined,
                yield_max:
                  (bestMatchFromApiSearch.yieldOutdoor ||
                    (bestMatchFromApiSearch as any).yield_max) ??
                  undefined,
                difficulty: bestMatchFromApiSearch.growDifficulty ?? undefined,
                rating: bestMatchFromApiSearch.rating ?? 0,
                reviews_count: (bestMatchFromApiSearch as any).reviews_count ?? 0, // Strain doesn't explicitly have reviews_count
                link: bestMatchFromApiSearch.url ?? bestMatchFromApiSearch.link ?? undefined,
                parents: bestMatchFromApiSearch.parents ?? undefined,
                breeder: bestMatchFromApiSearch.breeder ?? undefined,
                origin: (bestMatchFromApiSearch as any).origin ?? undefined,
                floweringType: bestMatchFromApiSearch.floweringType ?? undefined,
                fromSeedToHarvest: (bestMatchFromApiSearch as any).fromSeedToHarvest ?? undefined, // Strain doesn't explicitly have this
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
  const processImage = async (uri: string): Promise<string | null> => {
    try {
      setProcessingImage(true);
      // Resize immediately to 1024px width to manage memory efficiently
      const manipResult = await manipulateAsync(uri, [{ resize: { width: 1024 } }], {
        compress: 0.7,
        format: SaveFormat.JPEG,
      });
      return manipResult.uri;
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('Error', 'Failed to process image. Please try a different image.');
      return null;
    } finally {
      setProcessingImage(false);
    }
  };

  const pickImage = async () => {
    try {
      console.log('[EditPlantForm] Requesting media library permissions...');
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('[EditPlantForm] Permission result:', permissionResult);

      if (!permissionResult.granted) {
        const message = permissionResult.canAskAgain
          ? 'Photo library access is needed to upload images. Please grant permission in your device settings.'
          : 'Photo library access was denied. Please enable it in your device settings to select images.';
        Alert.alert('Permission Required', message);
        return;
      }

      console.log('[EditPlantForm] Launching image library...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      console.log('[EditPlantForm] Image picker result:', result);

      if (!result.canceled && result.assets && result.assets[0]) {
        console.log('[EditPlantForm] Image selected, processing...');
        // Process image immediately to prevent memory issues with large gallery images
        const processedUri = await processImage(result.assets[0].uri);
        if (processedUri) {
          setImagePreviewUri(processedUri);
          setValue('image_url', null, { shouldDirty: true });
        }
      }
    } catch (error) {
      console.error('[EditPlantForm] Error picking image:', error);
      Alert.alert(
        'Gallery Error',
        'Failed to access photo gallery. Please try again or restart the app if the problem persists.'
      );
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Camera access is needed to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      // Process image immediately for consistency
      const processedUri = await processImage(result.assets[0].uri);
      if (processedUri) {
        setImagePreviewUri(processedUri);
        setValue('image_url', null, { shouldDirty: true });
      }
    }
  };

  const uploadImage = async (userId: string): Promise<string | null> => {
    if (!imagePreviewUri || imagePreviewUri === (plant.imageUrl ?? null))
      return plant.imageUrl ?? null; // No new image or same image
    setUploadingImage(true);
    try {
      // Check file size before upload to prevent OOM issues
      const fileInfo = await FileSystem.getInfoAsync(imagePreviewUri);
      if (fileInfo.exists && fileInfo.size && fileInfo.size > 10 * 1024 * 1024) {
        // 10MB limit
        Alert.alert('File Too Large', 'Please select an image smaller than 10MB.');
        return plant.imageUrl ?? null;
      }

      const extension = 'jpg';
      const filename = `plant_${Date.now()}.${extension}`;
      const filePath = `${userId}/${filename}`;

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

      // Memory-efficient upload using FileSystem instead of fetch().blob()
      // This streams the file without loading it entirely into memory
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session for upload');
      }

      // Get Supabase URL from the client configuration (consistent with lib/supabase.ts)
      const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }

      const uploadUrl = `${supabaseUrl}/storage/v1/object/plants/${filePath}`;

      const uploadResult = await FileSystem.uploadAsync(uploadUrl, imagePreviewUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (uploadResult.status !== 200) {
        const errorText = uploadResult.body || 'Unknown upload error';
        console.error('Upload failed:', errorText);
        throw new Error(`Upload failed with status ${uploadResult.status}: ${errorText}`);
      }

      const { data: urlData } = supabase.storage.from('plants').getPublicUrl(filePath);
      setValue('image_url', urlData.publicUrl, { shouldValidate: true, shouldDirty: true });
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
      return plant.imageUrl ?? null; // Return old image URL (or null) on failure
    } finally {
      setUploadingImage(false);
    }
  };
  const onSubmit: SubmitHandler<PlantFormData> = async (data) => {
    // Enhanced check for meaningful changes including strain data
    if (
      !isDirty &&
      imagePreviewUri === (plant.imageUrl ?? null) &&
      data.location_description === plant.locationDescription &&
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
        finalImageUrl = await uploadImage(user.id);
        if (!finalImageUrl && imagePreviewUri) {
          Alert.alert(
            'Image Upload Failed',
            'Could not upload the new image. Please try again or remove the photo selection.'
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
      } else if (data.strain && data.strain.trim().length > 0) {
        // Try to find or create a local strain by searching API/local DB
        try {
          const apiResults = await WeedDbService.search(data.strain);
          const bestMatch = apiResults.data.find(
            (strain) => strain.name.toLowerCase() === data.strain.toLowerCase()
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
            const localMatches = searchStrainsByName(data.strain);
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
          const localMatches = searchStrainsByName(data.strain);
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
        growthStage: data.growth_stage as PlantGrowthStage,
        notes: (data.notes as string) || '',
        imageUrl: finalImageUrl ?? undefined,
        cannabisType: (data.cannabis_type as CannabisType) || CannabisType.Unknown,
        growMedium: (data.grow_medium as GrowMedium) || GrowMedium.Soil,
        lightCondition: (data.light_condition as LightCondition) || LightCondition.Artificial,
        locationDescription: (data.location_description as string) || '',
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
        Alert.alert('Success', 'Plant updated successfully.');
        if (onUpdateSuccess) onUpdateSuccess();
      } else {
        Alert.alert('Error', 'Failed to update plant. Please try again.');
      }
    } catch (error) {
      console.error('[EditPlantForm] Error updating plant:', error);
      Alert.alert('Error', 'An error occurred while updating the plant.');
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
            onFocus={() => inputIndex >= 0 && setCurrentIndex(inputIndex)}
            onSubmitEditing={() => {
              if (!multiline) {
                goToNextInput();
              }
            }}
            keyboardType={keyboardType}
            multiline={multiline}
            maxLength={maxLength}
            showCharacterCount={!!maxLength}
            error={errors[fieldName]?.message}
            returnKeyType={multiline ? 'default' : 'next'}
            blurOnSubmit={multiline}
          />
        )}
      />
    );
  };

  const renderEnumPicker = (fieldName: keyof PlantFormData, enumObject: any, title: string) => {
    const formatLabel = (str: string) =>
      str.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());

    const handleEnumSelection = () => {
      // Use Alert.alert for enum picker
      Alert.alert(title, 'Select an option', [
        ...Object.values(enumObject).map((option: unknown) => ({
          text: formatLabel(String(option)),
          onPress: () =>
            setValue(fieldName, option as any, { shouldValidate: true, shouldDirty: true }),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    };

    return (
      <Controller
        control={control}
        name={fieldName}
        render={({ field: { value } }) => (
          <EnumOption
            label={value ? formatLabel(String(value)) : `Select ${title}`}
            onPress={handleEnumSelection}
          />
        )}
      />
    );
  };

  const renderLocationPicker = () => {
    const currentValue = watch('location_description');

    return (
      <>
        <Pressable {...locationPickerAnimation.handlers}>
          <Animated.View
            style={locationPickerAnimation.animatedStyle}
            className="mb-1 flex-row items-center justify-between rounded-lg border border-neutral-300 px-4 py-3 dark:border-neutral-600">
            <ThemedText className="text-neutral-800 dark:text-neutral-100">
              {currentValue || 'Select Location'}
            </ThemedText>
            <OptimizedIcon
              name="chevron-down"
              size={24}
              className="text-neutral-400 dark:text-neutral-500"
            />
          </Animated.View>
        </Pressable>

        {errors.location_description && (
          <ThemedText className="text-status-danger mt-1 text-xs">
            {errors.location_description.message}
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
                      setValue('location_description', loc, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                      setTempCustomLocation('');
                      setShowLocationModal(false);
                    }}
                  />
                ))}

                {/* Custom Location Input */}
                <ThemedView className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-700">
                  <TextInput
                    className="mb-3 rounded-lg border border-neutral-300 px-4 py-3 text-base text-neutral-800 placeholder:text-neutral-500 dark:border-neutral-600 dark:text-neutral-100 dark:placeholder:text-neutral-400"
                    placeholder="Or type a custom location..."
                    value={tempCustomLocation}
                    onChangeText={setTempCustomLocation}
                  />

                  <AnimatedSubmitButton
                    onPress={() => {
                      if (tempCustomLocation.trim()) {
                        setValue('location_description', tempCustomLocation.trim(), {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                      }
                      setShowLocationModal(false);
                    }}
                    isSubmitting={false}
                    label="Done"
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1">
      <ThemedView className="flex-1 p-5">
        <ThemedText variant="heading" className="mb-5 text-center">
          Edit Plant Details
        </ThemedText>

        {/* Image Picker */}
        <ThemedText className="mb-2 mt-4 text-base font-medium text-neutral-700 dark:text-neutral-200">
          Plant Image
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
              label="Gallery"
              disabled={processingImage}
            />
            <AnimatedImageButton
              onPress={takePhoto}
              icon="camera-outline"
              label="Camera"
              disabled={processingImage}
            />
          </ThemedView>

          {imagePreviewUri && (
            <AnimatedRemoveButton
              onPress={() => {
                setImagePreviewUri(null);
                setValue('image_url', null, { shouldDirty: true });
              }}
            />
          )}

          {(uploadingImage || processingImage) && (
            <ThemedView className="mt-3 items-center">
              <ActivityIndicator size="small" className="text-primary-500" />
              <ThemedText className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                {processingImage ? 'Processing image...' : 'Uploading...'}
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>
        {errors.image_url && (
          <ThemedText className="text-status-danger mb-3 text-xs">
            {errors.image_url.message}
          </ThemedText>
        )}

        {/* Plant Name */}
        <ThemedText className="mb-2 mt-4 text-base font-medium text-neutral-700 dark:text-neutral-200">
          Plant Name*
        </ThemedText>
        {renderTextInput('name', 'e.g., Bruce Banner', 'default', false, 50)}

        {/* Strain Autocomplete */}
        <ThemedText className="mb-2 mt-4 text-base font-medium text-neutral-700 dark:text-neutral-200">
          Strain*
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
                    console.log(
                      '[EditPlantForm StrainAutocomplete onSelect] Selected strainObj:',
                      JSON.stringify(strainObj, null, 2)
                    );
                    onChange(strainObj.name);
                    setSelectedStrain(strainObj);

                    // Auto-fill cannabis type from strain data if available
                    if (strainObj.type) {
                      setValue(
                        'cannabis_type',
                        capitalizeFirstLetter(strainObj.type) as CannabisType,
                        { shouldValidate: true, shouldDirty: true }
                      );
                      console.log(
                        `[EditPlantForm] Auto-filled cannabis_type to ${strainObj.type} from strain data`
                      );
                    }

                    console.log(
                      '[EditPlantForm StrainAutocomplete onSelect] RHF strain field set to:',
                      strainObj.name
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
                placeholder="Search for a strain (e.g., OG Kush)"
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
                      {selectedStrain.type || 'Unknown Type'}
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
        {errors.strain && (
          <ThemedText className="text-status-danger mt-1 text-xs">
            {errors.strain.message}
          </ThemedText>
        )}

        {/* Cannabis Type */}
        <ThemedText className="mb-2 mt-4 text-base font-medium text-neutral-700 dark:text-neutral-200">
          Cannabis Type
        </ThemedText>
        {renderEnumPicker('cannabis_type', CannabisType, 'Cannabis Type')}

        {/* Growth Stage */}
        <ThemedText className="mb-2 mt-4 text-base font-medium text-neutral-700 dark:text-neutral-200">
          Growth Stage*
        </ThemedText>
        {renderEnumPicker('growth_stage', PlantGrowthStage, 'Growth Stage')}

        {/* Planted Date */}
        <ThemedText className="mb-2 mt-4 text-base font-medium text-neutral-700 dark:text-neutral-200">
          Planted Date*
        </ThemedText>
        <Controller
          control={control}
          name="planted_date"
          render={({ field: { value, onChange: onDateChange } }) => {
            return (
              <>
                <AnimatedDateButton
                  onPress={() => setShowDatePicker(true)}
                  value={value || new Date()}
                />
                {showDatePicker && (
                  <DateTimePicker
                    value={value || new Date()}
                    mode="date"
                    display="default"
                    onChange={(_event: any, selectedDate?: Date) => {
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
          Location*
        </ThemedText>
        {renderLocationPicker()}

        {/* Grow Medium */}
        <ThemedText className="mb-2 mt-4 text-base font-medium text-neutral-700 dark:text-neutral-200">
          Grow Medium
        </ThemedText>
        {renderEnumPicker('grow_medium', GrowMedium, 'Grow Medium')}

        {/* Light Condition */}
        <ThemedText className="mb-2 mt-4 text-base font-medium text-neutral-700 dark:text-neutral-200">
          Light Condition
        </ThemedText>
        {renderEnumPicker('light_condition', LightCondition, 'Light Condition')}

        {/* Notes */}
        <ThemedText className="mb-2 mt-4 text-base font-medium text-neutral-700 dark:text-neutral-200">
          Notes
        </ThemedText>
        {renderTextInput('notes', 'Additional notes about your plant...', 'default', true, 500)}

        <AnimatedSubmitButton
          onPress={handleSubmit(onSubmit)}
          isSubmitting={isSubmitting}
          label="Update Plant"
        />
      </ThemedView>

      {/* Enhanced Keyboard Toolbar */}
      <KeyboardToolbar
        isVisible={isKeyboardVisible}
        keyboardHeight={keyboardHeight}
        onNext={goToNextInput}
        onPrevious={goToPreviousInput}
        onDone={dismissKeyboard}
        canGoNext={canGoNext}
        canGoPrevious={canGoPrevious}
        currentField={getCurrentFieldName()}
      />
    </KeyboardAvoidingView>
  );
}
