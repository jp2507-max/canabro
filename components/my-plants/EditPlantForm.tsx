/* eslint-disable prettier/prettier */
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { decode } from 'base64-arraybuffer';
import { format, parseISO } from 'date-fns';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import {
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { z } from 'zod';

import { StrainAutocomplete } from '../StrainAutocomplete'; // Component is in the parent directory
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { searchStrainsByName } from '@/lib/data/strains';
import { useDatabase } from '@/lib/hooks/useDatabase';
import { Plant } from '@/lib/models/Plant'; // Ensure this path is correct
import supabase from '@/lib/supabase';
import { findOrCreateLocalStrain } from '@/lib/services/strain-sync-service';
import { StrainSpecies } from '@/lib/types/strain';
import {
  GrowthStage as PlantGrowthStage,
  GrowLocation,
  LightCondition,
  GrowMedium,
  CannabisType
} from '@/lib/types/plant'; // Import all enums from plant types
import { WeedDbService } from '@/lib/services/weed-db.service'; // Import WeedDbService for API calls
import { Strain } from '@/lib/types/weed-db'; // Import the proper Strain type from weed-db
import { useQuery } from '@tanstack/react-query';
import { RawStrainApiResponse } from '@/lib/types/weed-db'; // Add missing import for strain type

// Define an interface for the update payload to ensure type safety
interface PlantUpdatePayload {
  name: string;
  strainNameDisplay: string; // The display name of the strain from the form
  strainIdToSet: string | null; // The UUID of the strain
  plantedDate: string; // Format YYYY-MM-DD
  growthStage: PlantGrowthStage; // Use the imported GrowthStage alias
  notes: string;
  imageUrl: string;
  cannabisType: CannabisType;
  growMedium: GrowMedium;
  lightCondition: LightCondition;
  locationDescription: string;
}

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

export default function EditPlantForm({ plant, onUpdateSuccess }: EditPlantFormProps) {
  const { theme, isDarkMode } = useTheme();
  const { database } = useDatabase();

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    setValue,
    reset,
    trigger,
  } = useForm<PlantFormData>({
    resolver: zodResolver(plantFormSchema),
    mode: 'onChange',    defaultValues: {
      name: plant.name || '',
      strain: plant.strain || '', // This is the strain NAME
      planted_date: plant.plantedDate ? parseISO(plant.plantedDate) : new Date(),
      growth_stage: (plant.growthStage as PlantGrowthStage) || PlantGrowthStage.SEEDLING,
      cannabis_type: (plant.cannabisType as CannabisType) || CannabisType.Unknown,
      grow_medium: (plant.growMedium as GrowMedium) || GrowMedium.Soil,
      light_condition: (plant.lightCondition as LightCondition) || LightCondition.Artificial,
      location_description: plant.locationDescription || GrowLocation.Indoor,
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
    Object.values(GrowLocation).includes(plant.locationDescription as GrowLocation)
      ? ''
      : plant.locationDescription || ''
  );
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
      location_description: plant.locationDescription || GrowLocation.Indoor,
      image_url: plant.imageUrl ?? null,
      notes: plant.notes || '',
    });
    setImagePreviewUri(plant.imageUrl ?? null);
    if (
      plant.locationDescription &&
      !Object.values(GrowLocation).includes(plant.locationDescription as GrowLocation)
    ) {
      setTempCustomLocation(plant.locationDescription);
    } else {
      setTempCustomLocation('');
    }

    // Initialize selectedStrain if plant has a strainId or strain name
    const loadInitialStrain = async () => {
      try {
        // First try to use the strainId if it exists
        if (plant.strainId) {          console.log(`[EditPlantForm] Initial plant strain ID: ${plant.strainId}`);
          // Attempt to fetch strain by ID from API
          const strainFromApi = await WeedDbService.getById(plant.strainId);
          if (strainFromApi) {
            console.log('[EditPlantForm] Found strain by ID from API:', JSON.stringify(strainFromApi, null, 2));
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
              harvestTimeOutdoor: strainFromApi.harvestTimeOutdoor ?? strainFromApi.harvest_time_outdoor,
              effects: Array.isArray(strainFromApi.effects) ? strainFromApi.effects : (strainFromApi.effects ? [strainFromApi.effects] : []),
              flavors: Array.isArray(strainFromApi.flavors) ? strainFromApi.flavors : (strainFromApi.flavors ? [strainFromApi.flavors] : []),
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
              setValue('cannabis_type', capitalizeFirstLetter(strainForState.type) as CannabisType, { shouldDirty: true });
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
            console.log('[EditPlantForm] Found strain from local data (adapted to RawStrainApiResponse):', JSON.stringify(strainForState, null, 2));
            if (strainForState.type) {
              setValue('cannabis_type', capitalizeFirstLetter(strainForState.type) as CannabisType, { shouldDirty: true });
            }
            return;
          }

          // If local search fails, try API search
          console.log('[EditPlantForm] Local search failed, trying API search');
          const apiResults = await WeedDbService.search(plant.strain);
          const bestMatchFromApiSearch = apiResults.data.find(strain => 
            strain.name.toLowerCase() === plant.strain?.toLowerCase()
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
                effects: Array.isArray(bestMatchFromApiSearch.effects) ? bestMatchFromApiSearch.effects : (bestMatchFromApiSearch.effects ? [bestMatchFromApiSearch.effects] : []),
                flavors: Array.isArray(bestMatchFromApiSearch.flavors) ? bestMatchFromApiSearch.flavors : (bestMatchFromApiSearch.flavors ? [bestMatchFromApiSearch.flavors] : []),
                lineage: (bestMatchFromApiSearch.parents && bestMatchFromApiSearch.parents.length > 0) ? bestMatchFromApiSearch.parents : undefined,
                terpenes: (bestMatchFromApiSearch as any).terpenes ?? undefined, // Strain doesn't explicitly have terpenes
                images: bestMatchFromApiSearch.image ? [bestMatchFromApiSearch.image] : (bestMatchFromApiSearch.imageUrl ? [bestMatchFromApiSearch.imageUrl] : undefined),
                image_url: bestMatchFromApiSearch.imageUrl ?? bestMatchFromApiSearch.image ?? undefined,
                seed_company: bestMatchFromApiSearch.breeder ?? undefined,
                genetics: bestMatchFromApiSearch.genetics ?? undefined,
                floweringTime: bestMatchFromApiSearch.floweringTime ?? undefined, // Direct assignment
                // Remove flowering_time_min and flowering_time_max as Strain doesn't directly provide them for parsing here
                yield_min: (bestMatchFromApiSearch.yieldIndoor || (bestMatchFromApiSearch as any).yield_min) ?? undefined,
                yield_max: (bestMatchFromApiSearch.yieldOutdoor || (bestMatchFromApiSearch as any).yield_max) ?? undefined,
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
                yieldIndoor: bestMatchFromApiSearch.yieldIndoor ?? bestMatchFromApiSearch.yield_indoor ?? undefined,
                yieldOutdoor: bestMatchFromApiSearch.yieldOutdoor ?? bestMatchFromApiSearch.yield_outdoor ?? undefined,
                heightIndoor: bestMatchFromApiSearch.heightIndoor ?? bestMatchFromApiSearch.height_indoor ?? undefined,
                heightOutdoor: bestMatchFromApiSearch.heightOutdoor ?? bestMatchFromApiSearch.height_outdoor ?? undefined,
                harvestTimeOutdoor: bestMatchFromApiSearch.harvestTimeOutdoor ?? bestMatchFromApiSearch.harvest_time_outdoor ?? undefined,
              };
              console.log('[EditPlantForm] Found strain from API search (adapted to RawStrainApiResponse):', JSON.stringify(strainForState, null, 2));
              setSelectedStrain(strainForState);
              if (strainForState.type) {
                setValue('cannabis_type', capitalizeFirstLetter(strainForState.type) as CannabisType, { shouldDirty: true });
              }
            } else {
              console.warn('[EditPlantForm] Strain from API search is missing a string api_id:', bestMatchFromApiSearch);
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

  // Process image immediately after selection to avoid memory issues with large gallery images
  const processImage = async (uri: string): Promise<string | null> => {
    try {
      setProcessingImage(true);
      const manipResult = await manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }], // Resize immediately to manage memory
        { compress: 0.7, format: SaveFormat.JPEG }
      );
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

      console.log('[EditPlantForm] Launching image library...');      const result = await ImagePicker.launchImageLibraryAsync({
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
    if (!imagePreviewUri || imagePreviewUri === (plant.imageUrl ?? null)) return plant.imageUrl ?? null; // No new image or same image
    setUploadingImage(true);
    try {
      // Image is already processed, so we can upload it directly
      const mimeType = 'image/jpeg';
      const extension = 'jpg';
      const fileBase64 = await FileSystem.readAsStringAsync(imagePreviewUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const arrayBuffer = decode(fileBase64);
      const filename = `plant_${Date.now()}.${extension}`;
      const filePath = `${userId}/${filename}`;

      // Delete old image if it exists and a new one is being uploaded
      if (plant.imageUrl) {
        try {
          const oldImageFileName = plant.imageUrl.split('/').pop();
          if (oldImageFileName && userId) {
            const oldImagePath = `${userId}/${oldImageFileName}`;
            console.log('Attempting to delete old image:', oldImagePath);
            const { error: deleteError } = await supabase.storage.from('plants').remove([oldImagePath]);
            if (deleteError) {
              console.warn('Failed to delete old image, it might not exist or there was an error:', deleteError.message);
            }
          } else {
            console.warn('Could not determine old image path for deletion.');
          }
        } catch (e) {
          console.warn('Error during old image deletion process:', e);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('plants')
        .upload(filePath, arrayBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('plants').getPublicUrl(filePath);
      setValue('image_url', urlData.publicUrl, { shouldValidate: true, shouldDirty: true });
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Error', 'Failed to upload image.');
      return plant.imageUrl ?? null; // Return old image URL (or null) on failure
    } finally {
      setUploadingImage(false);
    }
  };
  const onSubmit: SubmitHandler<PlantFormData> = async (data) => {
    // Enhanced check for meaningful changes including strain data
    if (!isDirty && imagePreviewUri === (plant.imageUrl ?? null) && 
        data.location_description === plant.locationDescription && 
        data.strain === plant.strain && 
        data.name === plant.name) {
        
        // Check for strain-related changes even if form fields appear unchanged
        let noMeaningfulChange = true;
        
        // Case 1: Selected a strain but it's different from the plant's current strainId
        if (selectedStrain && plant.strainId !== selectedStrain.id) {
          console.log('[EditPlantForm] Detected strain ID change:', {
            currentStrainId: plant.strainId,
            newStrainId: selectedStrain.id
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
          console.log('[EditPlantForm] Detected strain name mismatch between form and selected strain');
          noMeaningfulChange = false;
        }

        if (noMeaningfulChange) {
            Alert.alert('No Changes', 'You haven\'t made any meaningful changes to the plant.');
            if (onUpdateSuccess) onUpdateSuccess();
            return;
        }
    }

    setIsSubmitting(true);
    console.log('[EditPlantForm onSubmit] Form submitted. Initial data:', JSON.stringify(data, null, 2));
    console.log('[EditPlantForm onSubmit] Current selectedStrain state:', JSON.stringify(selectedStrain, null, 2));

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
            const { error: deleteError } = await supabase.storage.from('plants').remove([oldImagePath]);
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
      console.log('[EditPlantForm] selectedStrain object (state):', JSON.stringify(selectedStrain, null, 2));

      // --- Strain Synchronization Logic ---
      let finalStrainId: string | null = null;
      if (selectedStrain && selectedStrain.api_id) { // Ensure api_id is present
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
          if (bestMatch && typeof bestMatch.api_id === 'string') { // Ensure api_id is a string
            const strainDataForSync = {
              api_id: bestMatch.api_id, // Use api_id from bestMatch
              name: bestMatch.name,
              species: bestMatch.type as StrainSpecies,
              description: bestMatch.description ?? undefined, // Ensure undefined instead of null
              thc: bestMatch.thc?.toString(),
              cbd: bestMatch.cbd?.toString(),
              effects: Array.isArray(bestMatch.effects) ? bestMatch.effects : (bestMatch.effects ? [bestMatch.effects] : []), // Ensure effects is string[] or undefined
              flavors: Array.isArray(bestMatch.flavors) ? bestMatch.flavors : (bestMatch.flavors ? [bestMatch.flavors] : []), // Ensure flavors is string[] or undefined
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
              const localStrain = await findOrCreateLocalStrain(matchedLocalStrain.id, apiCompatibleStrain);
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
            const localStrain = await findOrCreateLocalStrain(matchedLocalStrain.id, apiCompatibleStrain);
            if (localStrain && localStrain.id) {
              finalStrainId = localStrain.id;
            }
          }
        }
      }
      // --- End Strain Synchronization Logic ---

      const plantedDateStr = data.planted_date instanceof Date 
        ? data.planted_date.toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0];      const updatePayload: PlantUpdatePayload = {
        name: data.name as string,
        strainNameDisplay: data.strain as string,
        strainIdToSet: finalStrainId,
        plantedDate: plantedDateStr || format(new Date(), 'yyyy-MM-dd'), // Ensure we have a default date if undefined
        growthStage: data.growth_stage as PlantGrowthStage,
        notes: (data.notes as string) || '',
        imageUrl: finalImageUrl || '',
        cannabisType: (data.cannabis_type as CannabisType) || CannabisType.Unknown,
        growMedium: (data.grow_medium as GrowMedium) || GrowMedium.Soil,
        lightCondition: (data.light_condition as LightCondition) || LightCondition.Artificial,
        locationDescription: (data.location_description as string) || '',
      };

      console.log('[EditPlantForm] Final update payload:', JSON.stringify(updatePayload, null, 2));      // Execute the plant update in the database
      const plantRecord = await database?.get('plants').find(plant.id);
      let result = false;      if (plantRecord) {
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
    }  };
  
  const renderTextInput = (
    fieldName: keyof PlantFormData,
    placeholder: string,
    keyboardType?: 'default' | 'numeric' | 'email-address'
  ) => (
    <Controller
      control={control}
      name={fieldName}
      render={({ field, fieldState }) => {
        // Safely handle values that might be null/undefined or non-string types
        const safeValue = field.value !== null && field.value !== undefined 
          ? (typeof field.value === 'string' ? field.value : String(field.value)) 
          : '';
          
        return (
          <>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: isDarkMode ? theme.colors.neutral[600] : theme.colors.neutral[300],
                  color: isDarkMode ? theme.colors.neutral[100] : theme.colors.neutral[800],
                },
              ]}
              placeholder={placeholder}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              value={safeValue}
              keyboardType={keyboardType}
              placeholderTextColor={isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]}
            />
            {fieldState.error && (
              <ThemedText style={styles.errorText}>{fieldState.error.message}</ThemedText>
            )}
          </>
        );
      }}
    />
  );

  const renderEnumPicker = (fieldName: keyof PlantFormData, enumObject: any, title: string) => {
    const [modalVisible, setModalVisible] = useState(false);
    const enumValues = Object.values(enumObject) as string[];
    const currentValue = watch(fieldName);

    return (
      <>        <TouchableOpacity onPress={() => setModalVisible(true)} style={[styles.pickerButton, { borderColor: isDarkMode ? theme.colors.neutral[600] : theme.colors.neutral[300] }]}>
          <ThemedText style={{color: isDarkMode ? theme.colors.neutral[100] : theme.colors.neutral[800]}}>{currentValue ? String(currentValue) : `Select ${title}`}</ThemedText>
          <OptimizedIcon name="chevron-down" size={20} color={isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[500]} />
        </TouchableOpacity>
        {errors[fieldName] && <ThemedText style={styles.errorText}>{errors[fieldName]?.message}</ThemedText>}
        <Modal
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
            <ThemedView style={[styles.modalContent, { backgroundColor: isDarkMode ? theme.colors.neutral[800] : theme.colors.neutral[50]}]}>
              <ScrollView>
                {enumValues.map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.modalItem, { borderBottomColor: isDarkMode ? theme.colors.neutral[700] : theme.colors.neutral[200] }]}
                    onPress={() => {
                      setValue(fieldName, value as any, { shouldValidate: true, shouldDirty: true });
                      setModalVisible(false);
                    }}
                  >
                    <ThemedText style={{color: isDarkMode ? theme.colors.neutral[100] : theme.colors.neutral[800]}}>{value}</ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ThemedView>
          </TouchableOpacity>
        </Modal>
      </>
    );
  };

  const renderLocationPicker = () => {
    const currentValue = watch('location_description');
    return (
      <>
        <TouchableOpacity onPress={() => setShowLocationModal(true)} style={[styles.pickerButton, { borderColor: isDarkMode ? theme.colors.neutral[600] : theme.colors.neutral[300] }]}>          <ThemedText style={{color: isDarkMode ? theme.colors.neutral[100] : theme.colors.neutral[800]}}>{currentValue || 'Select Location'}</ThemedText>
          <OptimizedIcon name="chevron-down" size={20} color={isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[500]} />
        </TouchableOpacity>
        {errors.location_description && <ThemedText style={styles.errorText}>{errors.location_description.message}</ThemedText>}
        <Modal
          transparent={true}
          visible={showLocationModal}
          onRequestClose={() => setShowLocationModal(false)}
        >
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowLocationModal(false)} activeOpacity={1}>
            <ThemedView style={[styles.modalContent, { backgroundColor: isDarkMode ? theme.colors.neutral[800] : theme.colors.neutral[50]}]}>
              <ScrollView>
                {Object.values(GrowLocation).map((loc) => (
                  <TouchableOpacity
                    key={loc}
                    style={[styles.modalItem, { borderBottomColor: isDarkMode ? theme.colors.neutral[700] : theme.colors.neutral[200] }]}
                    onPress={() => {
                      setValue('location_description', loc, { shouldValidate: true, shouldDirty: true });
                      setTempCustomLocation(''); // Clear custom location if a predefined one is selected
                      setShowLocationModal(false);
                    }}
                  >
                    <ThemedText style={{color: isDarkMode ? theme.colors.neutral[100] : theme.colors.neutral[800]}}>{loc}</ThemedText>
                  </TouchableOpacity>
                ))}
                {/* Custom Location Input */}
                <ThemedView style={[styles.customLocationContainer, { borderTopColor: isDarkMode ? theme.colors.neutral[700] : theme.colors.neutral[200]}]}>
                  <TextInput
                    style={[styles.input, styles.customLocationInput, { borderColor: isDarkMode ? theme.colors.neutral[600] : theme.colors.neutral[300], color: isDarkMode ? theme.colors.neutral[100] : theme.colors.neutral[800] }]}
                    placeholder="Or type a custom location..."
                    value={tempCustomLocation}
                    onChangeText={(text) => {
                      setTempCustomLocation(text);
                      // If user types, we assume they want this custom location.
                      // We can set it directly or wait for a confirm button.
                      // For now, let's set it on blur or when "Done" is pressed.
                    }}
                    placeholderTextColor={isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]}
                  />
                  <TouchableOpacity
                    style={[styles.button, styles.doneButton, { backgroundColor: theme.colors.primary[500] }]}
                    onPress={() => {
                      if (tempCustomLocation.trim()) {
                        setValue('location_description', tempCustomLocation.trim(), { shouldValidate: true, shouldDirty: true });
                      }
                      setShowLocationModal(false);
                    }}
                  >
                    <ThemedText style={{ color: '#FFFFFF' }}>Done</ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              </ScrollView>
            </ThemedView>
          </TouchableOpacity>
        </Modal>
      </>
    );
  };

  // Helper function to capitalize first letter
  const capitalizeFirstLetter = (string: string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  };

  // Helper function to map local strain types to API strain types
  const mapLocalTypeToApiType = (type: string): 'sativa' | 'indica' | 'hybrid' => {
    if (!type) return 'hybrid';
    const lowerType = type.toLowerCase();
    if (lowerType === 'sativa' || lowerType === 'indica' || lowerType === 'hybrid') {
      return lowerType as 'sativa' | 'indica' | 'hybrid';
    }
    // Default to hybrid if the type doesn't match expected values
    return 'hybrid';
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: isDarkMode ? theme.colors.neutral[900] : theme.colors.background }}
    >
      <ThemedView style={[styles.container, { backgroundColor: isDarkMode ? theme.colors.neutral[900] : theme.colors.background }]}>

          <ThemedText style={[styles.title, {color: isDarkMode ? theme.colors.neutral[100] : theme.colors.neutral[800]}]}>Edit Plant Details</ThemedText>

          {/* Image Picker */}
          <ThemedText style={[styles.label, {color: isDarkMode ? theme.colors.neutral[200] : theme.colors.neutral[700]}]}>Plant Image</ThemedText>
          <ThemedView style={styles.imagePickerContainer}>
            {imagePreviewUri ? (
              <Image source={{ uri: imagePreviewUri }} style={[styles.imagePreview, { borderColor: isDarkMode ? theme.colors.neutral[600] : theme.colors.neutral[300]}]} />
            ) : (              <ThemedView style={[styles.imagePlaceholder, { borderColor: isDarkMode ? theme.colors.neutral[600] : theme.colors.neutral[300] }]}>

                <OptimizedIcon name="image-outline" size={50} color={isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[500]} />
              </ThemedView>
            )}
            <ThemedView style={styles.imageButtonsContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.imageButton, { backgroundColor: theme.colors.primary[500] }]} 
                onPress={pickImage}                disabled={processingImage}
              >
                <OptimizedIcon name="images-outline" size={20} color={theme.colors.neutral[50]} />
                <ThemedText style={[styles.buttonText, { color: theme.colors.neutral[50] }]}>Gallery</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.imageButton, { backgroundColor: theme.colors.primary[500] }]} 
                onPress={takePhoto}                disabled={processingImage}
              >
                <OptimizedIcon name="camera-outline" size={20} color={theme.colors.neutral[50]} />
                <ThemedText style={[styles.buttonText, { color: theme.colors.neutral[50] }]}>Camera</ThemedText>
              </TouchableOpacity>
            </ThemedView>
            {imagePreviewUri && (
                <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => {
                        setImagePreviewUri(null);
                        setValue('image_url', null, { shouldDirty: true });                    }}
                >
                    <OptimizedIcon name="close-circle" size={24} color={theme.colors.status.danger} />
                </TouchableOpacity>
            )}
            {(uploadingImage || processingImage) && (
              <ThemedView style={{ alignItems: 'center', marginTop: 10 }}>
                <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                <ThemedText style={{ marginTop: 4, fontSize: 12, color: theme.colors.neutral[600] }}>
                  {processingImage ? 'Processing image...' : 'Uploading...'}
                </ThemedText>
              </ThemedView>
            )}
          </ThemedView>
          {errors.image_url && <ThemedText style={styles.errorText}>{errors.image_url.message}</ThemedText>}

          {/* Plant Name */}
          <ThemedText style={[styles.label, {color: isDarkMode ? theme.colors.neutral[200] : theme.colors.neutral[700]}]}>Plant Name*</ThemedText>
          {renderTextInput('name', 'e.g., Bruce Banner')}          {/* Strain Autocomplete */}
          <ThemedText style={[styles.label, {color: isDarkMode ? theme.colors.neutral[200] : theme.colors.neutral[700]}]}>Strain*</ThemedText>
          <Controller
            control={control}
            name="strain" // This RHF field will hold the strain NAME for display/input
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <ThemedView>                <StrainAutocomplete
                  initialStrainName={value || ''} // Use initialStrainName instead of value prop
                  onStrainSelect={(strainObj: RawStrainApiResponse | null) => { 
                    if (strainObj) {
                      console.log('[EditPlantForm StrainAutocomplete onSelect] Selected strainObj:', JSON.stringify(strainObj, null, 2));
                      onChange(strainObj.name); 
                      setSelectedStrain(strainObj); 
                      
                      // Auto-fill cannabis type from strain data if available
                      if (strainObj.type) {
                        setValue('cannabis_type', capitalizeFirstLetter(strainObj.type) as CannabisType, { shouldValidate: true, shouldDirty: true });
                        console.log(`[EditPlantForm] Auto-filled cannabis_type to ${strainObj.type} from strain data`);
                      }
                      
                      console.log('[EditPlantForm StrainAutocomplete onSelect] RHF strain field set to:', strainObj.name);
                    } else {
                      // Handle null selection (clear)
                      onChange('');
                      setSelectedStrain(null);
                      console.log('[EditPlantForm StrainAutocomplete onSelect] Strain selection cleared');
                    }
                  }}
                  placeholder="Search for a strain (e.g., OG Kush)"
                  // Removed error prop: error={error?.message} 
                />
                {error && <ThemedText style={styles.errorText}>{error.message}</ThemedText>}
                
                {/* Display selected strain details if available */}
                {selectedStrain && (
                  <ThemedView 
                    style={{
                      marginTop: 8,
                      padding: 8,
                      borderRadius: 8,
                      backgroundColor: isDarkMode ? 'rgba(79, 70, 229, 0.1)' : 'rgba(79, 70,229, 0.05)',
                    }}
                  >                    <ThemedView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <OptimizedIcon 
                        name={selectedStrain.type?.toLowerCase().includes('indica') ? 'moon-outline' : 
                              selectedStrain.type?.toLowerCase().includes('sativa') ? 'sunny-outline' : 'leaf-outline'} 
                        size={16} 
                        color={theme.colors.primary[500]} 
                        style={{ marginRight: 6 }}
                      />
                      <ThemedText style={{ fontSize: 14, fontWeight: '500', color: theme.colors.primary[500] }}>
                        {selectedStrain.type || 'Unknown Type'} 
                        {selectedStrain.floweringTime ? ` • ~${selectedStrain.floweringTime} week flowering` : ''}
                      </ThemedText>
                    </ThemedView>
                    
                    {selectedStrain.thc || selectedStrain.cbd ? (
                      <ThemedText style={{ fontSize: 12, color: isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[600] }}>
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
          {errors.strain && <ThemedText style={styles.errorText}>{errors.strain.message}</ThemedText>}

          {/* Cannabis Type (often derived from strain, but can be overridden) */}
          <ThemedText style={[styles.label, {color: isDarkMode ? theme.colors.neutral[200] : theme.colors.neutral[700]}]}>Cannabis Type</ThemedText>
          {renderEnumPicker('cannabis_type', CannabisType, 'Cannabis Type')}

          {/* Growth Stage */}
          <ThemedText style={[styles.label, {color: isDarkMode ? theme.colors.neutral[200] : theme.colors.neutral[700]}]}>Growth Stage*</ThemedText>
          {renderEnumPicker('growth_stage', PlantGrowthStage, 'Growth Stage')}

          {/* Planted Date */}
          <ThemedText style={[styles.label, {color: isDarkMode ? theme.colors.neutral[200] : theme.colors.neutral[700]}]}>Planted Date*</ThemedText>
          <Controller
            control={control}
            name="planted_date"
            render={({ field: { value, onChange: onDateChange } }) => ( // Renamed onChange to onDateChange to avoid conflict
              <>                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.datePickerButton, { borderColor: isDarkMode ? theme.colors.neutral[600] : theme.colors.neutral[300] }]}>
                  <ThemedText style={{color: isDarkMode ? theme.colors.neutral[100] : theme.colors.neutral[800]}}>{format(value || new Date(), 'PPP')}</ThemedText>
                  <OptimizedIcon name="calendar-outline" size={24} color={isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[500]} />
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={value || new Date()}
                    mode="date"
                    display="default"
                    onChange={(_event: any, selectedDate?: Date) => {
                      setShowDatePicker(false);
                      if (selectedDate) {
                        onDateChange(selectedDate); // Use renamed onDateChange
                        setValue('planted_date', selectedDate, { shouldValidate: true, shouldDirty: true });
                      }
                    }}
                    maximumDate={new Date()} // Prevent future dates
                  />
                )}
              </>
            )}
          />
          {errors.planted_date && <ThemedText style={styles.errorText}>{errors.planted_date.message}</ThemedText>}

          {/* Location Description */}
          <ThemedText style={[styles.label, {color: isDarkMode ? theme.colors.neutral[200] : theme.colors.neutral[700]}]}>Location*</ThemedText>
          {renderLocationPicker()}

          {/* Grow Medium */}
          <ThemedText style={[styles.label, {color: isDarkMode ? theme.colors.neutral[200] : theme.colors.neutral[700]}]}>Grow Medium</ThemedText>
          {renderEnumPicker('grow_medium', GrowMedium, 'Grow Medium')}

          {/* Light Condition */}
          <ThemedText style={[styles.label, {color: isDarkMode ? theme.colors.neutral[200] : theme.colors.neutral[700]}]}>Light Condition</ThemedText>
          {renderEnumPicker('light_condition', LightCondition, 'Light Condition')}

          {/* Notes */}
          <ThemedText style={[styles.label, {color: isDarkMode ? theme.colors.neutral[200] : theme.colors.neutral[700]}]}>Notes</ThemedText>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, styles.textArea, { borderColor: isDarkMode ? theme.colors.neutral[600] : theme.colors.neutral[300], color: isDarkMode ? theme.colors.neutral[100] : theme.colors.neutral[800] }]}
                placeholder="Additional notes about your plant..."
                onBlur={onBlur}
                onChangeText={onChange}
                value={value || ''}
                multiline
                numberOfLines={4}
                placeholderTextColor={isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]}
              />
            )}
          />
          {errors.notes && <ThemedText style={styles.errorText}>{errors.notes.message}</ThemedText>}

          <TouchableOpacity
            style={[styles.button, styles.submitButton, { backgroundColor: theme.colors.primary[500] }, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.colors.neutral[50]} />
            ) : (
              <ThemedText style={[styles.buttonText, { color: theme.colors.neutral[50] }]}>Update Plant</ThemedText>            )}
          </TouchableOpacity>
        </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    marginTop: 15,
    marginBottom: 5,
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 5,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  submitButton: {
    marginTop: 25,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  imagePickerContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  imagePreview: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
  },
  imagePlaceholder: {
    width: 200,
    height: 150,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 300, // Limit width of button container
  },
  imageButton: {
    flex: 1, // Make buttons take equal space
    marginHorizontal: 5, // Add some space between buttons
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 2,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 5,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    maxHeight: '60%',
    borderRadius: 10,
    padding: 20,
  },
  modalItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  modalInput: {
    marginTop: 10,
    marginBottom: 10,
  },
  customLocationContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    // borderTopColor will be set dynamically (added in JSX)
  },
  customLocationInput: {
    // uses styles.input but can have overrides
    marginBottom: 10,
  },
  doneButton: {
    // uses styles.button but can have overrides
    paddingVertical: 10, // Smaller padding for this specific button
    marginTop: 5, // Add some margin top
  }
});

// After the existing enum definitions but before the plantFormSchema
// GrowthStage enum has been moved to the top of the file
