'use client';

import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { decode } from 'base64-arraybuffer';
import { format } from 'date-fns';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
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
  View,
  Text, // Added Text for basic text rendering if ThemedText has issues
  Platform, // Added Platform for OS-specific logic if needed
} from 'react-native';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { StrainAutocomplete } from './StrainAutocomplete'; // Ensure this path is correct
import ThemedText from './ui/ThemedText'; // Ensure this path is correct
import ThemedView from './ui/ThemedView'; // Ensure this path is correct
import { useTheme } from '../lib/contexts/ThemeContext';
import { RawStrainApiResponse } from '../lib/types/weed-db';
import { GrowthStage } from '../lib/types/plant';
import {
  ensureStrainInLocalDB,
  ensureStrainInSupabase,
  prepareDataForSupabase,
  prepareDataForWatermelonDB,
} from '../lib/services/strain-sync.service';
import { Strain as WDBStrainModel } from '../lib/models/Strain';
import { SupabaseStrain } from '../lib/types/supabase';
import supabase from '../lib/supabase';
import { useAuth } from '../lib/contexts/AuthProvider';
import { useDatabase } from '../lib/contexts/DatabaseProvider';
import useWatermelon from '../lib/hooks/useWatermelon';
import { Plant as PlantType, GrowLocation, LightCondition, GrowMedium, CannabisType } from '../lib/types/plant'; // Import Plant as PlantType
import { Plant as PlantModel } from '../lib/models/Plant'; // Import the actual Model class
import { Model } from '@nozbe/watermelondb';

// Define type aliases to match the property naming in the WatermelonDB model
// This allows us to have type-safety without modifying the actual WatermelonDB model class
type WatermelonProps = {
  userId: string;
  name: string;
  strainId: string;
  strain: string;
  plantedDate: string;
  growthStage: string;
  cannabisType?: string;
  growMedium?: string;
  lightCondition?: string;
  locationDescription?: string;
  imageUrl?: string | null;
  notes?: string;
}

// Zod Validation Schema
const plantFormSchema = z.object({
  name: z.string().min(1, 'Plant name is required.'),
  strain: z.string().min(1, 'Strain is required.'), // This will store the strain NAME from autocomplete
  planted_date: z.date({ required_error: 'Planted date is required.' }),
  growth_stage: z.nativeEnum(GrowthStage, { required_error: 'Growth stage is required.' }),
  cannabis_type: z.nativeEnum(CannabisType).optional(),
  grow_medium: z.nativeEnum(GrowMedium).optional(),
  light_condition: z.nativeEnum(LightCondition).optional(),
  location_description: z.string().min(1, 'Location description is required.'),
  image_url: z.string().url('Invalid image URL format.').optional().nullable(),
  notes: z.string().optional(),
});

// Infer the type from the schema
type PlantFormData = z.infer<typeof plantFormSchema>;

// Step interface
interface FormStep {
  id: string;
  title: string;
  description?: string;
  fields: (keyof PlantFormData)[]; // Fields relevant to this step for validation
}

// Steps for the wizard
const FORM_STEPS: FormStep[] = [
  { id: 'photo', title: 'Add Photo', description: 'Add a photo of your plant', fields: ['image_url'] },
  { id: 'basicInfo', title: 'Basic Info', description: 'Name, strain, type, and stage', fields: ['name', 'strain', 'cannabis_type', 'growth_stage'] },
  { id: 'location', title: 'Location', description: 'Where is your plant located?', fields: ['location_description'] },
  { id: 'lighting', title: 'Lighting', description: 'Light conditions for your plant', fields: ['light_condition'] },
  { id: 'details', title: 'Growing Details', description: 'Medium and additional notes', fields: ['grow_medium', 'notes'] },
  { id: 'dates', title: 'Important Dates', description: 'Key dates for your plant', fields: ['planted_date'] },
];

export function AddPlantForm({ onSuccess }: { onSuccess?: () => void }) {
  const { theme, isDarkMode } = useTheme();
  const { database } = useDatabase();
  const { sync } = useWatermelon();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [currentStepId, setCurrentStepId] = useState<string>(FORM_STEPS[0]?.id ?? 'photo');
  const currentStepObj = FORM_STEPS.find((step) => step.id === currentStepId) ?? FORM_STEPS[0];
  if (!currentStepObj) {
    throw new Error('Current step object could not be determined.');
  }

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
    trigger,
  } = useForm<PlantFormData>({
    resolver: zodResolver(plantFormSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      strain: '',
      planted_date: new Date(),
      growth_stage: GrowthStage.SEEDLING,
      cannabis_type: CannabisType.Unknown,
      grow_medium: GrowMedium.Soil,
      light_condition: LightCondition.Artificial,
      location_description: GrowLocation.Indoor,
      image_url: null,
      notes: '',
    },
  });

  const [selectedStrainApiData, setSelectedStrainApiData] = useState<RawStrainApiResponse | null>(null);
  const [syncedLocalStrainId, setSyncedLocalStrainId] = useState<string | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreviewUri, setImagePreviewUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [tempCustomLocation, setTempCustomLocation] = useState('');
  // Store the current AbortController to manage cancellation
  const [currentAbortController, setCurrentAbortController] = useState<AbortController | null>(null);

  const strainSyncMutation = useMutation<
    string | null,
    Error,
    RawStrainApiResponse
  >({
    // Add a mutation key to identify this mutation
    mutationKey: ['strainSync'],
    mutationFn: async (strainToSync: RawStrainApiResponse) => {
      if (!strainToSync.api_id) {
        throw new Error('Strain API ID is missing, cannot sync.');
      }
      console.log('[AddPlantForm] Starting strain synchronization for:', strainToSync.name);
      
      // Create a new AbortController for this mutation
      const abortController = new AbortController();
      setCurrentAbortController(abortController);
      const { signal } = abortController;
      
      // Setup a handler to throw if aborted
      const checkAbort = () => {
        if (signal.aborted) {
          throw new Error('Strain sync operation was cancelled');
        }
      };
      
      // Initial abort check
      checkAbort();

      const preparedSupabaseData = prepareDataForSupabase(strainToSync) as Partial<SupabaseStrain> & { api_id: string }; // Added type assertion
      // Pass the signal to your async operations (you may need to update these functions to accept a signal parameter)
      const supabaseId = await Promise.race([
        ensureStrainInSupabase(preparedSupabaseData),
        new Promise<never>((_, reject) => {
          signal.addEventListener('abort', () => reject(new Error('Supabase sync aborted')));
        })
      ]).catch(error => {
        if (signal.aborted) {
          throw new Error('Strain sync operation was cancelled during Supabase sync');
        }
        throw error;
      });

      console.log(`[AddPlantForm] Strain ${supabaseId ? 'synced' : 'failed to sync'} with Supabase. Supabase ID: ${supabaseId}`);
      if (!supabaseId) throw new Error('Failed to sync strain with Supabase.');
      
      // Check if aborted between operations
      checkAbort();

      const preparedWdbData = prepareDataForWatermelonDB(strainToSync) as Partial<WDBStrainModel> & { api_id: string }; // Added type assertion
      
      const localId = await Promise.race([
        ensureStrainInLocalDB(preparedWdbData),
        new Promise<never>((_, reject) => {
          signal.addEventListener('abort', () => reject(new Error('Local DB sync aborted')));
        })
      ]).catch(error => {
        if (signal.aborted) {
          throw new Error('Strain sync operation was cancelled during local DB sync');
        }
        throw error;
      });
      
      console.log(`[AddPlantForm] Strain ${localId ? 'synced' : 'failed to sync'} with local DB. Local ID: ${localId}`);
      if (!localId) throw new Error('Failed to sync strain with local WatermelonDB.');

      return localId;
    },
    onSuccess: (localId, variables) => {
      // Check if this success callback corresponds to the currently selected strain
      if (selectedStrainApiData?.api_id === variables.api_id) {
        console.log(`[AddPlantForm] Strain "${variables.name}" synced successfully. Local DB ID: ${localId}`);
        // setSelectedStrainApiData(variables); // Already set by handleStrainSelectionAndSync
        setSyncedLocalStrainId(localId);
        setValue('strain', variables.name, { shouldValidate: true });
        Alert.alert('Strain Synced', `${variables.name} has been successfully synced.`);
        queryClient.invalidateQueries({ queryKey: ['strains'] });
      } else {
        console.log(`[AddPlantForm] Strain "${variables.name}" sync success ignored, a newer strain is selected.`);
      }
    },
    onError: (error: Error, variables: RawStrainApiResponse) => {
      // Check if this error callback corresponds to the currently selected strain
      if (selectedStrainApiData?.api_id === variables.api_id) {
        console.error(`[AddPlantForm] Error syncing strain "${variables.name}":`, error);
        Alert.alert('Sync Error', `Failed to sync strain ${variables.name}: ${error.message}`);
        setSelectedStrainApiData(null); // Clear if the failed one was the latest
        setSyncedLocalStrainId(null);
        setValue('strain', '', { shouldValidate: true });
      } else {
        console.warn(`[AddPlantForm] Error for strain "${variables.name}" (API ID: ${variables.api_id}) ignored, as current selection is different (API ID: ${selectedStrainApiData?.api_id}). Error: ${error.message}`);
      }
    },
  });

  const handleStrainSelectionAndSync = (selectedRawStrain: RawStrainApiResponse | null) => {
    if (!selectedRawStrain) {
      // Handle the case where strain is null, e.g., clear selection or do nothing
      console.log('[AddPlantForm] Strain selection cleared or null.');
      // Optionally, reset related state if a null selection means clearing things
      // setValue('strain', null); // Or however you manage this in your form state
      return;
    }
    console.log('[AddPlantForm] Strain selected from autocomplete:', selectedRawStrain.name, 'API ID:', selectedRawStrain.api_id);
    
    // Reset local sync-status whenever the user picks a new strain
    setSelectedStrainApiData(selectedRawStrain);
    setSyncedLocalStrainId(null);
    
    // Pre-populate to satisfy synchronous form validation
    setValue('strain', selectedRawStrain.name, { shouldValidate: true });
    
    // Cancel any in-flight requests to prevent unnecessary API calls and database operations
    if (strainSyncMutation.isPending) {
      console.log('[AddPlantForm] Cancelling previous strain sync request');
      // Cancel the current operation using the AbortController
      if (currentAbortController) {
        currentAbortController.abort();
        console.log('[AddPlantForm] Aborted previous strain sync operation');
      }
      // Also reset the mutation state to clear UI states
      strainSyncMutation.reset();
    }
    
    // Start a new mutation - the callbacks will handle ensuring only the latest strain's 
    // results are applied to our state
    strainSyncMutation.mutate(selectedRawStrain);
  };

  // Step navigation - Updated to use validation trigger and currentStepId
  const goToNextStep = async () => {
    // Find the current step index based on currentStepId
    const stepIndex = FORM_STEPS.findIndex((step) => step.id === currentStepId);
    // Get the current step object (add check for safety)
    const stepObj = FORM_STEPS[stepIndex];
    if (!stepObj) {
      console.error('Could not find step object for index:', stepIndex);
      return; // Should not happen, but prevents crash
    }
    // Get fields for the current step using optional chaining
    const fieldsToValidate = stepObj.fields; // Removed optional chaining (?.) since we've already checked stepObj exists
    if (!fieldsToValidate) {
      console.error('Could not find fields for step object:', stepObj); // stepObj is guaranteed by the check above
      return; // Prevent proceeding if fields are missing
    }

    // Trigger validation only for the current step's fields
    const isValidStep = await trigger(fieldsToValidate.length > 0 ? fieldsToValidate : undefined);

    if (isValidStep && stepIndex < FORM_STEPS.length - 1) {
      // Ensure next step exists before setting
      const nextStepId = FORM_STEPS[stepIndex + 1]?.id;
      if (nextStepId) {
        setCurrentStepId(nextStepId);
      } else {
        console.error('Could not find next step ID for index:', stepIndex + 1);
      }
    } else if (!isValidStep) {
      console.log('Validation errors on step:', currentStepId, errors);
      const firstErrorField = fieldsToValidate.find((field: keyof PlantFormData) => errors[field]);
      // Refined check for errorMessage - ensure errorObject is checked
      const errorObject = firstErrorField ? errors[firstErrorField] : undefined;
      const errorMessage = errorObject?.message
        ? String(errorObject.message) // Ensure it's a string
        : 'Please correct the errors before proceeding.';
      // Simplified Alert.alert call
      Alert.alert('Validation Error', errorMessage);
    }
  };

  const goToPreviousStep = () => {
    // Find the current step index based on currentStepId
    const stepIndex = FORM_STEPS.findIndex((step) => step.id === currentStepId);

    if (stepIndex > 0) {
      // Add check for safety, though stepIndex > 0 implies FORM_STEPS[stepIndex - 1] exists
      const previousStepId = FORM_STEPS[stepIndex - 1]?.id;
      if (previousStepId) {
        setCurrentStepId(previousStepId);
      } else {
        console.error('Could not find previous step ID for index:', stepIndex - 1);
        router.back(); // Fallback
      }
    } else {
      router.back();
    }
  };

  // Camera and image handling
  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Photo library access is needed to upload images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Corrected enum usage
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        setImagePreviewUri(result.assets[0].uri);
        setValue('image_url', null);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const takePhoto = async () => {
    try {
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
        setImagePreviewUri(result.assets[0].uri);
        setValue('image_url', null);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo.');
    }
  };

  const uploadImage = async (userId: string): Promise<string | null> => {
    if (!imagePreviewUri) return null;
    setUploadingImage(true);
    try {
      const manipResult = await manipulateAsync(
        imagePreviewUri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );
      const fileBase64 = await FileSystem.readAsStringAsync(manipResult.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const arrayBuffer = decode(fileBase64);
      const filename = `plant_${Date.now()}.jpg`;
      const filePath = `${userId}/${filename}`;
      const { error: uploadError } = await supabase.storage
        .from('plants')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('plants').getPublicUrl(filePath);
      setValue('image_url', urlData.publicUrl, { shouldValidate: true });
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Error', 'Failed to upload image.');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };


  // Form submission - Updated for react-hook-form
  const onSubmit: SubmitHandler<PlantFormData> = async (data) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to add a plant.');
      setIsSubmitting(false);
      return;
    }
    if (!selectedStrainApiData || !selectedStrainApiData.api_id || !syncedLocalStrainId) {
      Alert.alert(
        'Error',
        'Please select a valid strain and ensure it is synced before submitting. The local synchronized ID is missing.'
      );
      setIsSubmitting(false);
      return;
    }

    console.log('[AddPlantForm] onSubmit triggered. Form data:', JSON.stringify(data, null, 2));
    console.log('[AddPlantForm] Current selectedStrainApiData (from API):', JSON.stringify(selectedStrainApiData, null, 2));
    console.log('[AddPlantForm] Synced Local Strain ID:', syncedLocalStrainId);
    setIsSubmitting(true);

    try {
      let imageUrlToSave: string | null = data.image_url ?? null;
      if (imagePreviewUri && imagePreviewUri !== data.image_url) {
        const uploadedUrl = await uploadImage(user.id);
        if (uploadedUrl) {
          imageUrlToSave = uploadedUrl;
        } else if (imagePreviewUri) {
          console.warn('[AddPlantForm] Image upload may have failed, but a preview URI was present.');
        }
      }

      const localStrainIdToLink = syncedLocalStrainId;
      console.log(`[AddPlantForm] Using local strain ID for new plant: ${localStrainIdToLink}`);

      const plantsCollection = database.collections.get<PlantModel>('plants');
      await database.write(async () => {
        await plantsCollection.create((plant) => {
          // WatermelonDB handles ID generation
          plant.userId = user.id;
          plant.name = data.name;
          plant.strainId = localStrainIdToLink; // Link to the local WatermelonDB strain ID
          plant.strain = selectedStrainApiData!.name; // Store the strain name directly as well for easier display
          plant.plantedDate = data.planted_date.toISOString();
          plant.growthStage = data.growth_stage;
          plant.cannabisType = data.cannabis_type;
          plant.growMedium = data.grow_medium;
          plant.lightCondition = data.light_condition;
          plant.locationDescription = data.location_description;
          plant.imageUrl = imageUrlToSave || undefined;
          plant.notes = data.notes;
          // createdAt and updatedAt are handled by WatermelonDB automatically
          // No need to set synced_at as it's handled by the sync process
        });
      });

      console.log('[AddPlantForm] Plant created successfully in WatermelonDB.');
      await sync();

      Alert.alert('Success', 'Plant added successfully!');
      reset();
      setImagePreviewUri(null);
      setSelectedStrainApiData(null);
      setSyncedLocalStrainId(null);
      setCurrentStepId(FORM_STEPS[0]?.id ?? 'photo');
      if (onSuccess) onSuccess();
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('[AddPlantForm] Error submitting form:', error);
      Alert.alert('Error', `Failed to add plant: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render functions for each step (renderPhotoStep, renderBasicInfoStep, etc.) ---
  // These functions will use Controller for form fields and Themed components for UI.
  // Example for one field in renderBasicInfoStep:
  const renderPhotoStep = () => (
    <ThemedView className="space-y-4">
      <ThemedText className="mb-2 text-lg font-semibold">Upload Plant Photo</ThemedText>
      {imagePreviewUri && (
        <Image source={{ uri: imagePreviewUri }} style={{ width: '100%', height: 200, borderRadius: 8, marginBottom: 12 }} />
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 }}>
        <TouchableOpacity onPress={pickImage} style={{ padding: 12, backgroundColor: theme.colors.primary[500], borderRadius: 8 }}>
          <ThemedText style={{ color: theme.colors.neutral[50] }}>Pick from Gallery</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity onPress={takePhoto} style={{ padding: 12, backgroundColor: theme.colors.primary[500], borderRadius: 8 }}>
          <ThemedText style={{ color: theme.colors.neutral[50] }}>Take Photo</ThemedText>
        </TouchableOpacity>
      </View>
      {uploadingImage && <ActivityIndicator size="large" color={theme.colors.primary[500]} />}
      {errors.image_url && <ThemedText style={{ color: 'red' }}>{errors.image_url.message}</ThemedText>}
    </ThemedView>
  );

  const renderBasicInfoStep = () => (
    <ThemedView className="space-y-4">
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <>
            <ThemedText className="mb-1 text-sm font-medium">Plant Name</ThemedText>
            <TextInput
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="My Awesome Plant"
              style={{
                borderWidth: 1,
                borderColor: isDarkMode ? '#555' : '#ccc',
                padding: 10,
                borderRadius: 5,
                color: isDarkMode ? '#fff' : '#000',
                backgroundColor: isDarkMode ? '#333' : '#fff',
              }}
            />
            {errors.name && <ThemedText style={{ color: 'red' }}>{errors.name.message}</ThemedText>}
          </>
        )}
      />
      <ThemedText className="mb-1 text-sm font-medium">Strain</ThemedText>
      <StrainAutocomplete
        onStrainSelect={handleStrainSelectionAndSync}
        placeholder="Search and select a strain..."
      />
      {errors.strain && <ThemedText style={{ color: 'red' }}>{errors.strain.message}</ThemedText>}
      {strainSyncMutation.isPending && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 10 }}>
          <ActivityIndicator size="small" color={isDarkMode ? '#fff' : '#000'} />
          <ThemedText style={{ marginLeft: 10 }}>Syncing strain...</ThemedText>
        </View>
      )}

      <Controller
        control={control}
        name="cannabis_type"
        render={({ field: { onChange, value } }) => (
          <>
            <ThemedText className="mb-1 text-sm font-medium">Cannabis Type (Optional)</ThemedText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' }}>
              {Object.values(CannabisType).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => onChange(type)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    backgroundColor: value === type ? theme.colors.primary[500] : theme.colors.neutral[700],
                    borderRadius: 20,
                    margin: 4,
                  }}
                >
                  <ThemedText style={{ color: value === type ? theme.colors.neutral[50] : theme.colors.neutral[50] }}>
                    {type}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
            {errors.cannabis_type && <ThemedText style={{ color: 'red' }}>{errors.cannabis_type.message}</ThemedText>}
          </>
        )}
      />

      <Controller
        control={control}
        name="growth_stage"
        render={({ field: { onChange, value } }) => (
          <>
            <ThemedText className="mb-1 text-sm font-medium">Growth Stage</ThemedText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' }}>
              {Object.values(GrowthStage).map((stage) => (
                <TouchableOpacity
                  key={stage}
                  onPress={() => onChange(stage)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    backgroundColor: value === stage ? theme.colors.primary[500] : theme.colors.neutral[700],
                    borderRadius: 20,
                    margin: 4,
                  }}
                >
                  <ThemedText style={{ color: value === stage ? theme.colors.neutral[50] : theme.colors.neutral[50] }}>
                    {stage}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
            {errors.growth_stage && <ThemedText style={{ color: 'red' }}>{errors.growth_stage.message}</ThemedText>}
          </>
        )}
      />
    </ThemedView>
  );

  const renderLocationStep = () => (
    <ThemedView className="space-y-4">
      <Controller
        control={control}
        name="location_description"
        render={({ field: { onChange, value } }) => (
          <>
            <ThemedText className="mb-1 text-sm font-medium">Location Description</ThemedText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', marginBottom: 10 }}>
              {Object.values(GrowLocation).map((loc) => (
                <TouchableOpacity
                  key={loc}
                  onPress={() => onChange(loc)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    backgroundColor: value === loc ? theme.colors.primary[500] : theme.colors.neutral[700],
                    borderRadius: 20,
                    margin: 4,
                  }}
                >
                  <ThemedText style={{ color: value === loc ? theme.colors.neutral[50] : theme.colors.neutral[50] }}>
                    {loc}
                  </ThemedText>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setShowLocationModal(true)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  backgroundColor: theme.colors.yellow[500], // Example: using yellow for tertiary action
                  borderRadius: 20,
                  margin: 4,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}
              >
                <Ionicons name="add-circle-outline" size={18} color={theme.colors.neutral[900]} />
                <ThemedText style={{ color: theme.colors.neutral[900], marginLeft: 5 }}>Other...</ThemedText>
              </TouchableOpacity>
            </View>
            {/* Display current custom location if set */}
            {![...Object.values(GrowLocation)].includes(value as GrowLocation) && value && (
                <ThemedText style={{ marginTop: 5, fontStyle: 'italic' }}>Selected: {value}</ThemedText>
            )}
            {errors.location_description && (
              <ThemedText style={{ color: 'red' }}>{errors.location_description.message}</ThemedText>
            )}
          </>
        )}
      />
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <ThemedView style={{ padding: 20, borderRadius: 10, width: '80%' }}>
            <ThemedText style={{ fontSize: 18, marginBottom: 15, fontWeight: 'bold' }}>Enter Custom Location</ThemedText>
            <TextInput
              placeholder="E.g., My Balcony Spot"
              value={tempCustomLocation}
              onChangeText={setTempCustomLocation}
              style={{
                borderWidth: 1,
                borderColor: isDarkMode ? '#555' : '#ccc',
                padding: 10,
                borderRadius: 5,
                color: isDarkMode ? '#fff' : '#000',
                backgroundColor: isDarkMode ? '#333' : '#fff',
                marginBottom: 20,
              }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <TouchableOpacity onPress={() => setShowLocationModal(false)} style={{ padding: 10, backgroundColor: theme.colors.neutral[700], borderRadius: 5}}>
                <ThemedText style={{color: theme.colors.neutral[50]}}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const trimmedLocation = tempCustomLocation.trim();
                  if (trimmedLocation) {
                    setValue('location_description', trimmedLocation, { shouldValidate: true });
                    setShowLocationModal(false);
                    setTempCustomLocation(''); // Reset for next time
                  } else {
                    Alert.alert('Error', 'Custom location cannot be empty.');
                  }
                }}
                style={{ padding: 10, backgroundColor: theme.colors.primary[500], borderRadius: 5}}
              >
                <ThemedText style={{color: theme.colors.neutral[50]}}>Save</ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );

  const renderLightingStep = () => (
    <ThemedView className="space-y-4">
      <Controller
        control={control}
        name="light_condition"
        render={({ field: { onChange, value } }) => (
          <>
            <ThemedText className="mb-1 text-sm font-medium">Light Condition (Optional)</ThemedText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' }}>
              {Object.values(LightCondition).map((light) => (
                <TouchableOpacity
                  key={light}
                  onPress={() => onChange(light)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    backgroundColor: value === light ? theme.colors.primary[500] : theme.colors.neutral[700],
                    borderRadius: 20,
                    margin: 4,
                  }}
                >
                  <ThemedText style={{ color: value === light ? theme.colors.neutral[50] : theme.colors.neutral[50] }}>
                    {light}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
            {errors.light_condition && (
              <ThemedText style={{ color: 'red' }}>{errors.light_condition.message}</ThemedText>
            )}
          </>
        )}
      />
    </ThemedView>
  );

  const renderDetailsStep = () => (
    <ThemedView className="space-y-4">
      <Controller
        control={control}
        name="grow_medium"
        render={({ field: { onChange, value } }) => (
          <>
            <ThemedText className="mb-1 text-sm font-medium">Grow Medium (Optional)</ThemedText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' }}>
              {Object.values(GrowMedium).map((medium) => (
                <TouchableOpacity
                  key={medium}
                  onPress={() => onChange(medium)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    backgroundColor: value === medium ? theme.colors.primary[500] : theme.colors.neutral[700],
                    borderRadius: 20,
                    margin: 4,
                  }}
                >
                  <ThemedText style={{ color: value === medium ? theme.colors.neutral[50] : theme.colors.neutral[50] }}>
                    {medium}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
            {errors.grow_medium && <ThemedText style={{ color: 'red' }}>{errors.grow_medium.message}</ThemedText>}
          </>
        )}
      />
      <Controller
        control={control}
        name="notes"
        render={({ field: { onChange, onBlur, value } }) => (
          <>
            <ThemedText className="mb-1 text-sm font-medium">Notes (Optional)</ThemedText>
            <TextInput
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="Nutrients, watering schedule, etc."
              multiline
              numberOfLines={4}
              style={{
                borderWidth: 1,
                borderColor: isDarkMode ? '#555' : '#ccc',
                padding: 10,
                borderRadius: 5,
                color: isDarkMode ? '#fff' : '#000',
                backgroundColor: isDarkMode ? '#333' : '#fff',
                height: 100, // Explicit height for multiline
                textAlignVertical: 'top',
              }}
            />
            {errors.notes && <ThemedText style={{ color: 'red' }}>{errors.notes.message}</ThemedText>}
          </>
        )}
      />
    </ThemedView>
  );

  const renderDatesStep = () => (
    <ThemedView className="space-y-4">
      <Controller
        control={control}
        name="planted_date"
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <>
            <ThemedText className="mb-1 text-sm font-medium">Planted Date</ThemedText>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{
              borderWidth: 1,
              borderColor: isDarkMode ? '#555' : '#ccc',
              padding: 10,
              borderRadius: 5,
              backgroundColor: isDarkMode ? '#333' : '#fff',
            }}>
              <ThemedText style={{color: isDarkMode ? '#fff' : '#000'}}>{format(value || new Date(), 'PPP')}</ThemedText>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={value || new Date()} // Ensure value is a Date object
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_event: any, selectedDate?: Date) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    onChange(selectedDate);
                  }
                }}
              />
            )}
            {error && <ThemedText style={{ color: 'red' }}>{error.message}</ThemedText>}
          </>
        )}
      />
    </ThemedView>
  );

  const renderCurrentStep = () => {
    switch (currentStepId) {
      case 'photo':
        return renderPhotoStep();
      case 'basicInfo':
        return renderBasicInfoStep();
      case 'location':
        return renderLocationStep();
      case 'lighting':
        return renderLightingStep();
      case 'details':
        return renderDetailsStep();
      case 'dates':
        return renderDatesStep();
      default:
        return <ThemedText>Unknown step</ThemedText>;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: isDarkMode ? theme.colors.neutral[900] : theme.colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ padding: 20, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedView className="mb-4">
          <ThemedText className="text-2xl font-bold text-center">{currentStepObj.title}</ThemedText>
          {currentStepObj.description && (
            <ThemedText className="mt-1 text-center text-muted-foreground dark:text-darkMutedForeground">
              {currentStepObj.description}
            </ThemedText>
          )}
        </ThemedView>

        {renderCurrentStep()}

        <ThemedView className="mt-6 flex-row justify-between">
          {currentStepId !== FORM_STEPS[0]?.id && (
            <TouchableOpacity
              onPress={goToPreviousStep}
              className="rounded-lg bg-secondary px-6 py-3 dark:bg-darkSecondary"
            >
              <ThemedText className="font-semibold text-secondary-foreground dark:text-darkSecondaryForeground">
                Back
              </ThemedText>
            </TouchableOpacity>
          )}
          {currentStepId === FORM_STEPS[FORM_STEPS.length - 1]?.id ? (
            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting || strainSyncMutation.isPending}
              className="rounded-lg bg-primary px-6 py-3 dark:bg-darkPrimary"
            >
              {isSubmitting || strainSyncMutation.isPending ? (
                <ActivityIndicator color={theme.colors.neutral[50]} />
              ) : (
                <ThemedText className="font-semibold text-primary-foreground dark:text-darkPrimaryForeground">
                  Submit Plant
                </ThemedText>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={goToNextStep}
              className="rounded-lg bg-primary px-6 py-3 dark:bg-darkPrimary"
            >
              <ThemedText className="font-semibold text-primary-foreground dark:text-darkPrimaryForeground">
                Next
              </ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
