'use client';

import { Ionicons } from '@expo/vector-icons'; // Removed unused icons
import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import * as FileSystem from 'expo-file-system';
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
  Platform,
  Modal,
} from 'react-native';
import { z } from 'zod';

import { StrainAutocomplete } from './StrainAutocomplete';
import ThemedText from './ui/ThemedText';
import ThemedView from './ui/ThemedView';
import { useTheme } from '../lib/contexts/ThemeContext';
import { Strain } from '../lib/data/strains'; // Removed unused searchStrainsByName
import { useDatabase } from '../lib/hooks/useDatabase';
import useWatermelon from '../lib/hooks/useWatermelon';
import { Plant } from '../lib/models/Plant';
import { scheduleInitialPlantNotifications } from '../lib/services/NotificationService';
import supabase from '../lib/supabase';
import { GrowthStage } from '../lib/types/plant'; // Removed unused CreatePlantData

// Enums for the form (Consider moving to types/plant.ts or a dedicated enums file)
enum GrowLocation {
  GrowTent = 'Grow Tent',
  GrowRoom = 'Grow Room',
  Indoor = 'Indoor',
  Outdoor = 'Outdoor',
  Greenhouse = 'Greenhouse',
  Garden = 'Garden',
  Balcony = 'Balcony',
}

enum LightCondition {
  FullSun = 'Full Sun',
  PartialSun = 'Partial Sun',
  Shade = 'Shade',
  Artificial = 'Artificial Light',
}

enum GrowMedium {
  Soil = 'Soil',
  Coco = 'Coco Coir',
  Hydro = 'Hydroponic',
  Aqua = 'Aquaponic',
  SemiHydro = 'Semi-Hydro',
}

enum CannabisType {
  Indica = 'Indica',
  Sativa = 'Sativa',
  Hybrid = 'Hybrid',
  Ruderalis = 'Ruderalis',
  Unknown = 'Unknown',
}

// Zod Validation Schema
const plantFormSchema = z.object({
  name: z.string().min(1, 'Plant name is required.'),
  strain: z.string().min(1, 'Strain is required.'),
  planted_date: z.date({ required_error: 'Planted date is required.' }),
  growth_stage: z.nativeEnum(GrowthStage, { required_error: 'Growth stage is required.' }),
  cannabis_type: z.nativeEnum(CannabisType).optional(),
  grow_medium: z.nativeEnum(GrowMedium).optional(),
  light_condition: z.nativeEnum(LightCondition).optional(),
  location_description: z.string().min(1, 'Location description is required.'), // Made required
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
  {
    id: 'photo',
    title: 'Add Photo',
    description: 'Add a photo of your plant',
    fields: ['image_url'],
  }, // image_url is optional
  {
    id: 'basicInfo',
    title: 'Basic Info',
    description: 'Name and strain information',
    fields: ['name', 'strain', 'cannabis_type', 'growth_stage'],
  },
  {
    id: 'location',
    title: 'Location',
    description: 'Where is your plant located?',
    fields: ['location_description'],
  },
  {
    id: 'lighting',
    title: 'Lighting',
    description: 'Light conditions for your plant',
    fields: ['light_condition'],
  },
  {
    id: 'details',
    title: 'Growing Details',
    description: 'Growing medium and additional details',
    fields: ['grow_medium', 'notes'],
  },
  {
    id: 'dates',
    title: 'Important Dates',
    description: 'Germination date and other key dates',
    fields: ['planted_date'],
  },
];

export function AddPlantForm({ onSuccess }: { onSuccess?: () => void }) {
  // Use function keyword
  const { database } = useDatabase();
  const { sync } = useWatermelon();
  const { theme, isDarkMode } = useTheme();

  // --- React Hook Form Setup ---
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
      location_description: GrowLocation.Indoor, // Default to Indoor enum value
      image_url: null,
      notes: '',
    },
  });

  // State for non-form data & UI control
  const [selectedStrain, setSelectedStrain] = useState<Strain | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreviewUri, setImagePreviewUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [tempCustomLocation, setTempCustomLocation] = useState('');

  // --- End React Hook Form Setup ---

  // Step navigation - Updated to use validation trigger
  const goToNextStep = async () => {
    const fieldsToValidate = FORM_STEPS[currentStep].fields;
    const isValidStep = await trigger(fieldsToValidate.length > 0 ? fieldsToValidate : undefined);

    if (isValidStep && currentStep < FORM_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else if (!isValidStep) {
      console.log('Validation errors on step:', FORM_STEPS[currentStep].id, errors);
      const firstErrorField = fieldsToValidate.find((field) => errors[field]);
      const errorMessage = firstErrorField
        ? errors[firstErrorField]?.message
        : 'Please correct the errors before proceeding.';
      Alert.alert('Validation Error', errorMessage || 'Please check the highlighted fields.');
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Corrected enum access
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        setImagePreviewUri(result.assets[0].uri);
        setValue('image_url', null); // Clear any previously uploaded URL if new image is selected
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
        setValue('image_url', null); // Clear any previously uploaded URL
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo.');
    }
  };

  // Updated uploadImage to use imagePreviewUri and set form value on success
  const uploadImage = async (userId: string): Promise<string | null> => {
    if (!imagePreviewUri) return null;
    setUploadingImage(true);
    try {
      const fileBase64 = await FileSystem.readAsStringAsync(imagePreviewUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const filename = `plant_${Date.now()}.jpg`;
      const filePath = `${userId}/${filename}`;
      console.log('Uploading image to Supabase storage...');
      const { error: uploadError } = await supabase.storage
        .from('plants')
        .upload(filePath, fileBase64, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      console.log('Image uploaded successfully');
      const { data: urlData } = supabase.storage.from('plants').getPublicUrl(filePath);
      console.log('Image public URL:', urlData.publicUrl);
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
    console.log('Validated form data:', data);
    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Authentication Error', 'You must be logged in.');
        setIsSubmitting(false);
        return;
      }

      let finalImageUrl = data.image_url;
      if (imagePreviewUri && !finalImageUrl) {
        // Upload only if preview exists and URL isn't already set
        finalImageUrl = await uploadImage(user.id);
        if (!finalImageUrl && imagePreviewUri) {
          // Check imagePreviewUri to ensure user intended to upload
          Alert.alert(
            'Image Upload Failed',
            'Could not upload image. Please try again or remove the photo.'
          );
          setIsSubmitting(false);
          return;
        }
      }

      console.log('Creating plant with strain:', data.strain);
      console.log(
        'Selected strain object:',
        selectedStrain ? JSON.stringify(selectedStrain) : 'None'
      );

      const plantDataToSave = {
        name: data.name,
        strain: data.strain,
        planted_date: data.planted_date.toISOString().split('T')[0],
        growth_stage: data.growth_stage,
        notes: data.notes || undefined,
        image_url: finalImageUrl || undefined,
        cannabisType: data.cannabis_type,
        growMedium: data.grow_medium,
        lightCondition: data.light_condition,
        locationDescription: data.location_description,
        strainId: selectedStrain?.id,
        userId: user.id,
      };

      console.log('Plant data being saved:', JSON.stringify(plantDataToSave));

      let newPlantId: string = '';
      await database.write(async () => {
        const plantsCollection = database.get<Plant>('plants');
        const newPlant = await plantsCollection.create((plant: Plant) => {
          plant.name = plantDataToSave.name;
          plant.strain = plantDataToSave.strain;
          plant.plantedDate = plantDataToSave.planted_date;
          plant.growthStage = plantDataToSave.growth_stage;
          plant.notes = plantDataToSave.notes;
          plant.userId = plantDataToSave.userId;
          plant.strainId = plantDataToSave.strainId;
          plant.cannabisType = plantDataToSave.cannabisType;
          plant.growMedium = plantDataToSave.growMedium;
          plant.lightCondition = plantDataToSave.lightCondition;
          plant.locationDescription = plantDataToSave.locationDescription;
          plant.imageUrl = plantDataToSave.image_url;
        });
        newPlantId = newPlant.id;
        console.log('Plant created successfully with ID:', newPlantId);
      });

      if (newPlantId) {
        try {
          await scheduleInitialPlantNotifications(
            newPlantId,
            data.name,
            data.growth_stage,
            data.planted_date
          );
          console.log('Plant notifications scheduled successfully');
        } catch (notifError) {
          console.error('Error scheduling plant notifications:', notifError);
        }
        try {
          console.log('Triggering sync after plant creation...');
          await sync();
          console.log('Sync triggered successfully.');
        } catch (syncError) {
          console.error('Failed to trigger sync:', syncError);
        }
      }

      reset();
      setImagePreviewUri(null);
      setSelectedStrain(null);
      setCurrentStep(0);
      if (onSuccess) onSuccess();
      Alert.alert('Success', 'Plant added successfully!');
      router.back();
    } catch (error) {
      console.error('Error adding plant:', error);
      Alert.alert('Error', 'Failed to add plant. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render current step content based on currentStep index
  const renderStepContent = () => {
    const currentStepId = FORM_STEPS[currentStep].id;
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
        return null;
    }
  };

  // --- Step Content Renderers (Using Controller) ---

  const renderPhotoStep = () => (
    <ThemedView className="mt-4 space-y-6">
      <Controller
        control={control}
        name="image_url" // Connect to image_url field for validation if needed later
        render={({ fieldState: { error } }) => (
          <>
            <ThemedView className="items-center">
              {/* Image Picker Area */}
              <TouchableOpacity
                className={`mb-4 h-64 w-64 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed ${error ? 'border-destructive dark:border-darkDestructive' : 'border-border dark:border-darkBorder'} bg-input dark:bg-darkInput`} // Adjusted styling
                onPress={pickImage}
                disabled={uploadingImage}
                accessibilityLabel={imagePreviewUri ? 'Change plant photo' : 'Select plant photo'} // Dynamic label
                accessibilityHint="Opens image selection options"
                accessibilityRole="button">
                {uploadingImage ? (
                  <ActivityIndicator size="large" color={theme.colors.primary[500]} />
                ) : imagePreviewUri ? (
                  <Image
                    source={{ uri: imagePreviewUri }}
                    className="h-full w-full"
                    resizeMode="cover"
                    accessibilityIgnoresInvertColors
                  />
                ) : (
                  <ThemedView className="items-center bg-transparent p-4">
                    {' '}
                    {/* Added padding */}
                    <Ionicons
                      name="image-outline"
                      size={64}
                      color={isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]}
                    />
                    <ThemedText
                      className="mt-2 text-center"
                      lightClassName="text-muted-foreground"
                      darkClassName="text-darkMutedForeground">
                      Add a photo
                    </ThemedText>
                  </ThemedView>
                )}
              </TouchableOpacity>
            </ThemedView>
            {/* Action Buttons */}
            <ThemedView className="mt-4 flex-row justify-center space-x-4">
              <TouchableOpacity
                className="bg-secondary dark:bg-darkSecondary rounded-full p-4 active:opacity-70" // Consistent button style
                onPress={takePhoto}
                disabled={uploadingImage}
                accessibilityLabel="Take photo"
                accessibilityRole="button">
                <Ionicons
                  name="camera"
                  size={32}
                  color={isDarkMode ? theme.colors.neutral[200] : theme.colors.neutral[700]}
                />
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-secondary dark:bg-darkSecondary rounded-full p-4 active:opacity-70" // Consistent button style
                onPress={pickImage}
                disabled={uploadingImage}
                accessibilityLabel="Choose from library"
                accessibilityRole="button">
                <Ionicons
                  name="images"
                  size={32}
                  color={isDarkMode ? theme.colors.neutral[200] : theme.colors.neutral[700]}
                />
              </TouchableOpacity>
            </ThemedView>
            {/* Error and Hint Text */}
            {error && (
              <ThemedText className="text-destructive dark:text-darkDestructive mt-2 text-center text-sm">
                {error.message}
              </ThemedText>
            )}
            <ThemedText
              className="mt-4 text-center text-sm"
              lightClassName="text-muted-foreground"
              darkClassName="text-darkMutedForeground">
              A photo helps you visually track your plant's progress.
            </ThemedText>
          </>
        )}
      />
    </ThemedView>
  );

  const renderBasicInfoStep = () => (
    <ThemedView className="mt-4 space-y-6">
      {/* Plant Name Input */}
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <ThemedView className="mb-4">
            <ThemedText
              className="mb-2 font-medium"
              lightClassName="text-foreground"
              darkClassName="text-darkForeground">
              Plant Name *
            </ThemedText>
            <TextInput
              className={`bg-input text-foreground placeholder:text-muted-foreground dark:bg-darkInput dark:text-darkForeground dark:placeholder:text-darkMutedForeground rounded-lg border px-4 py-3 ${error ? 'border-destructive dark:border-darkDestructive' : 'border-border dark:border-darkBorder'}`}
              placeholder="e.g., Bruce Banner #3"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholderTextColor={
                isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]
              }
            />
            {error && (
              <ThemedText className="text-destructive dark:text-darkDestructive mt-1 text-sm">
                {error.message}
              </ThemedText>
            )}
          </ThemedView>
        )}
      />

      {/* Strain Autocomplete */}
      <Controller
        control={control}
        name="strain"
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <ThemedView className="mb-4">
            <ThemedText
              className="mb-2 font-medium"
              lightClassName="text-foreground"
              darkClassName="text-darkForeground">
              Strain *
            </ThemedText>
            <StrainAutocomplete
              value={value}
              onInputChange={onChange}
              // onBlur={onBlur} // Optional: Add if StrainAutocomplete supports it
              onSelect={(selected) => {
                onChange(selected.name);
                setSelectedStrain(selected);
                const currentCannabisType = watch('cannabis_type');
                if (currentCannabisType === CannabisType.Unknown) {
                  switch (selected.type) {
                    case 'indica':
                      setValue('cannabis_type', CannabisType.Indica);
                      break;
                    case 'sativa':
                      setValue('cannabis_type', CannabisType.Sativa);
                      break;
                    case 'hybrid':
                      setValue('cannabis_type', CannabisType.Hybrid);
                      break;
                  }
                }
              }}
              placeholder="Search or type strain name..."
              className={`mb-2 ${error ? 'border-destructive dark:border-darkDestructive rounded-lg border' : ''}`}
            />
            {error && (
              <ThemedText className="text-destructive dark:text-darkDestructive mt-1 text-sm">
                {error.message}
              </ThemedText>
            )}
            {/* Display selected strain details (using local state selectedStrain) */}
            {selectedStrain && (
              <ThemedView
                className="mt-2 rounded-lg p-3"
                lightClassName="bg-secondary"
                darkClassName="bg-darkSecondary">
                {/* ... (keep the detailed display logic) ... */}
                <ThemedView className="mb-1 flex-row items-center justify-between">
                  <ThemedText
                    className="font-bold"
                    lightClassName="text-secondary-foreground"
                    darkClassName="text-darkSecondaryForeground">
                    {selectedStrain.name}
                  </ThemedText>
                  <ThemedView
                    className="rounded px-2 py-1"
                    lightClassName="bg-primary/10"
                    darkClassName="bg-darkPrimary/20">
                    <ThemedText
                      className="text-xs capitalize"
                      lightClassName="text-primary"
                      darkClassName="text-darkPrimary">
                      {selectedStrain.type}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
                {/* ... (rest of the details display) ... */}
              </ThemedView>
            )}
          </ThemedView>
        )}
      />

      {/* Cannabis Type Selection */}
      <Controller
        control={control}
        name="cannabis_type"
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <ThemedView className="mb-4">
            <ThemedText
              className="mb-3 font-medium"
              lightClassName="text-foreground"
              darkClassName="text-darkForeground">
              Cannabis Type
            </ThemedText>
            <ThemedView className="-m-1 flex-row flex-wrap">
              {Object.values(CannabisType).map((type) => (
                <TouchableOpacity
                  key={type}
                  className={`m-1 rounded-full border px-4 py-2.5 active:opacity-80 ${value === type ? 'bg-primary border-primary dark:bg-darkPrimary dark:border-darkPrimary' : 'bg-background border-border dark:bg-darkBackground dark:border-darkBorder'}`}
                  onPress={() => onChange(type)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: value === type }}
                  accessibilityLabel={type}>
                  <ThemedText
                    className={`font-medium ${value === type ? 'text-primary-foreground dark:text-darkPrimaryForeground' : 'text-foreground dark:text-darkForeground'}`}>
                    {type}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ThemedView>
            {error && (
              <ThemedText className="text-destructive dark:text-darkDestructive mt-1 text-sm">
                {error.message}
              </ThemedText>
            )}
          </ThemedView>
        )}
      />

      {/* Initial Growth Stage Selection */}
      <Controller
        control={control}
        name="growth_stage"
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <ThemedView>
            <ThemedText
              className="mb-3 font-medium"
              lightClassName="text-foreground"
              darkClassName="text-darkForeground">
              Initial Growth Stage *
            </ThemedText>
            <ThemedView className="-m-1 flex-row flex-wrap">
              {Object.values(GrowthStage).map((stage) => (
                <TouchableOpacity
                  key={stage}
                  className={`m-1 rounded-full border px-4 py-2.5 active:opacity-80 ${value === stage ? 'bg-primary border-primary dark:bg-darkPrimary dark:border-darkPrimary' : 'bg-background border-border dark:bg-darkBackground dark:border-darkBorder'}`}
                  onPress={() => onChange(stage)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: value === stage }}
                  accessibilityLabel={
                    stage.charAt(0).toUpperCase() + stage.slice(1).replace(/_/g, ' ')
                  }>
                  <ThemedText
                    className={`font-medium ${value === stage ? 'text-primary-foreground dark:text-darkPrimaryForeground' : 'text-foreground dark:text-darkForeground'}`}>
                    {stage.charAt(0).toUpperCase() + stage.slice(1).replace(/_/g, ' ')}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ThemedView>
            {error && (
              <ThemedText className="text-destructive dark:text-darkDestructive mt-1 text-sm">
                {error.message}
              </ThemedText>
            )}
          </ThemedView>
        )}
      />
    </ThemedView>
  );

  const renderLocationStep = () => {
    const watchedLocation = watch('location_description');
    const isCustomLocationActive = !Object.values(GrowLocation).includes(
      watchedLocation as GrowLocation
    );

    return (
      <ThemedView className="mt-4 space-y-6">
        <ThemedText
          className="text-lg font-semibold"
          lightClassName="text-foreground"
          darkClassName="text-darkForeground">
          Where is your plant located?
        </ThemedText>
        <Controller
          control={control}
          name="location_description"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <ThemedView className="space-y-4">
              {/* Indoor Locations */}
              <ThemedText
                className="mb-2 font-medium"
                lightClassName="text-foreground"
                darkClassName="text-darkForeground">
                Indoor Locations
              </ThemedText>
              <ThemedView className="-m-1 flex-row flex-wrap">
                {[GrowLocation.GrowTent, GrowLocation.GrowRoom, GrowLocation.Indoor].map((loc) => (
                  <TouchableOpacity
                    key={loc}
                    onPress={() => onChange(loc)}
                    className={`m-1 min-w-[100px] flex-1 items-center rounded-lg border p-3 active:opacity-80 ${value === loc ? 'bg-primary/10 border-primary dark:bg-darkPrimary/20 dark:border-darkPrimary' : 'bg-card border-border dark:bg-darkCard dark:border-darkBorder'}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: value === loc }}
                    accessibilityLabel={loc}>
                    <ThemedView
                      className={`mb-2 rounded-full p-3 ${value === loc ? 'bg-primary dark:bg-darkPrimary' : 'bg-secondary dark:bg-darkSecondary'}`}>
                      <Ionicons
                        name={
                          loc === GrowLocation.GrowTent
                            ? 'home-outline'
                            : loc === GrowLocation.GrowRoom
                              ? 'bed-outline'
                              : 'cube-outline'
                        }
                        size={28}
                        color={
                          value === loc
                            ? isDarkMode
                              ? theme.colors.neutral[900]
                              : theme.colors.neutral[50]
                            : isDarkMode
                              ? theme.colors.neutral[200]
                              : theme.colors.neutral[700]
                        }
                      />
                    </ThemedView>
                    <ThemedText
                      className="text-center text-sm"
                      lightClassName="text-foreground"
                      darkClassName="text-darkForeground">
                      {loc}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ThemedView>
              {/* Outdoor Locations */}
              <ThemedText
                className="mb-2 mt-4 font-medium"
                lightClassName="text-foreground"
                darkClassName="text-darkForeground">
                Outdoor Locations
              </ThemedText>
              <ThemedView className="-m-1 flex-row flex-wrap">
                {[
                  GrowLocation.Outdoor,
                  GrowLocation.Greenhouse,
                  GrowLocation.Garden,
                  GrowLocation.Balcony,
                ].map((loc) => (
                  <TouchableOpacity
                    key={loc}
                    onPress={() => onChange(loc)}
                    className={`m-1 min-w-[100px] flex-1 items-center rounded-lg border p-3 active:opacity-80 ${value === loc ? 'bg-primary/10 border-primary dark:bg-darkPrimary/20 dark:border-darkPrimary' : 'bg-card border-border dark:bg-darkCard dark:border-darkBorder'}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: value === loc }}
                    accessibilityLabel={loc}>
                    <ThemedView
                      className={`mb-2 rounded-full p-3 ${value === loc ? 'bg-primary dark:bg-darkPrimary' : 'bg-secondary dark:bg-darkSecondary'}`}>
                      <Ionicons
                        name={
                          loc === GrowLocation.Outdoor
                            ? 'leaf-outline'
                            : loc === GrowLocation.Greenhouse
                              ? 'home-outline'
                              : loc === GrowLocation.Garden
                                ? 'flower-outline'
                                : 'sunny-outline'
                        }
                        size={28}
                        color={
                          value === loc
                            ? isDarkMode
                              ? theme.colors.neutral[900]
                              : theme.colors.neutral[50]
                            : isDarkMode
                              ? theme.colors.neutral[200]
                              : theme.colors.neutral[700]
                        }
                      />
                    </ThemedView>
                    <ThemedText
                      className="text-center text-sm"
                      lightClassName="text-foreground"
                      darkClassName="text-darkForeground">
                      {loc}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ThemedView>
              {/* Custom Location Button */}
              <TouchableOpacity
                className={`mt-6 flex-row items-center justify-center rounded-lg border border-dashed p-4 active:opacity-70 ${isCustomLocationActive ? 'border-primary dark:border-darkPrimary bg-primary/10 dark:bg-darkPrimary/20' : 'border-border dark:border-darkBorder'} ${error ? 'border-destructive dark:border-darkDestructive' : ''}`} // Added mt-6
                onPress={() => {
                  setTempCustomLocation(isCustomLocationActive ? value || '' : '');
                  setShowLocationModal(true);
                }}
                accessibilityLabel={
                  isCustomLocationActive ? 'Edit custom location' : 'Add custom location'
                }
                accessibilityRole="button">
                <Ionicons
                  name={isCustomLocationActive ? 'pencil-outline' : 'add-circle-outline'}
                  size={24}
                  color={
                    isCustomLocationActive
                      ? theme.colors.primary[500]
                      : isDarkMode
                        ? theme.colors.neutral[400]
                        : theme.colors.neutral[500]
                  }
                />
                <ThemedText
                  className="ml-2"
                  lightClassName={isCustomLocationActive ? 'text-primary' : 'text-muted-foreground'}
                  darkClassName={
                    isCustomLocationActive ? 'text-darkPrimary' : 'text-darkMutedForeground'
                  }>
                  {isCustomLocationActive ? 'Edit Custom Location' : 'Add Custom Location'}
                </ThemedText>
              </TouchableOpacity>
              {/* Display Custom Location */}
              {isCustomLocationActive && value ? (
                <ThemedView className="bg-primary/10 dark:bg-darkPrimary/20 mt-2 rounded-lg p-3">
                  {' '}
                  {/* Simplified class */}
                  <ThemedText className="text-primary dark:text-darkPrimary">
                    Custom location: {value}
                  </ThemedText>
                </ThemedView>
              ) : null}
              {/* Error Message */}
              {error && (
                <ThemedText className="text-destructive dark:text-darkDestructive mt-2 text-sm">
                  {error.message}
                </ThemedText>
              )}{' '}
              {/* Added mt-2 */}
              {/* Custom Location Modal */}
              <Modal
                animationType="slide"
                transparent
                visible={showLocationModal}
                onRequestClose={() => setShowLocationModal(false)}>
                <ThemedView
                  className="flex-1 items-center justify-center"
                  style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)' }}>
                  <ThemedView
                    className="w-5/6 max-w-md rounded-xl p-6"
                    lightClassName="bg-background"
                    darkClassName="bg-darkBackground">
                    <ThemedText
                      className="mb-4 text-lg font-semibold"
                      lightClassName="text-foreground"
                      darkClassName="text-darkForeground">
                      Custom Location
                    </ThemedText>
                    <TextInput
                      className="bg-input border-border text-foreground placeholder:text-muted-foreground dark:bg-darkInput dark:border-darkBorder dark:text-darkForeground dark:placeholder:text-darkMutedForeground mb-4 rounded-lg border p-4"
                      value={tempCustomLocation}
                      onChangeText={setTempCustomLocation}
                      placeholder="Enter custom location name"
                      placeholderTextColor={
                        isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]
                      }
                    />
                    <ThemedView className="flex-row justify-end space-x-3">
                      <TouchableOpacity
                        className="bg-secondary dark:bg-darkSecondary rounded-lg px-4 py-2 active:opacity-70"
                        onPress={() => setShowLocationModal(false)}
                        accessibilityRole="button">
                        <ThemedText
                          lightClassName="text-secondary-foreground"
                          darkClassName="text-darkSecondaryForeground">
                          Cancel
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="bg-primary dark:bg-darkPrimary rounded-lg px-4 py-2 active:opacity-70"
                        onPress={() => {
                          const trimmedLocation = tempCustomLocation.trim();
                          onChange(trimmedLocation || GrowLocation.Indoor); // Update RHF state
                          setShowLocationModal(false);
                        }}
                        accessibilityRole="button">
                        <ThemedText
                          lightClassName="text-primary-foreground"
                          darkClassName="text-darkPrimaryForeground">
                          Save
                        </ThemedText>
                      </TouchableOpacity>
                    </ThemedView>
                  </ThemedView>
                </ThemedView>
              </Modal>
            </ThemedView>
          )}
        />
      </ThemedView>
    );
  };

  const renderLightingStep = () => (
    <Controller
      control={control}
      name="light_condition"
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <ThemedView className="mt-4 space-y-6">
          <ThemedText
            className="mb-2 text-lg font-semibold"
            lightClassName="text-foreground"
            darkClassName="text-darkForeground">
            How much light does this location get?
          </ThemedText>{' '}
          {/* Added mb-2 */}
          <ThemedView className="space-y-3">
            {Object.values(LightCondition).map((light) => (
              <TouchableOpacity
                key={light}
                onPress={() => onChange(light)}
                className={`flex-row items-center rounded-lg border p-4 active:opacity-80 ${value === light ? 'bg-primary/10 border-primary dark:bg-darkPrimary/20 dark:border-darkPrimary' : 'bg-card border-border dark:bg-darkCard dark:border-darkBorder'}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: value === light }}
                accessibilityLabel={light}>
                <ThemedView
                  className={`mr-3 rounded-full p-2 ${value === light ? 'bg-primary dark:bg-darkPrimary' : 'bg-secondary dark:bg-darkSecondary'}`}>
                  <Ionicons
                    name={
                      light === LightCondition.FullSun
                        ? 'sunny'
                        : light === LightCondition.PartialSun
                          ? 'partly-sunny'
                          : light === LightCondition.Shade
                            ? 'cloud'
                            : 'bulb'
                    }
                    size={24}
                    color={
                      value === light
                        ? isDarkMode
                          ? theme.colors.neutral[900]
                          : theme.colors.neutral[50]
                        : isDarkMode
                          ? theme.colors.neutral[200]
                          : theme.colors.neutral[700]
                    }
                  />
                </ThemedView>
                <ThemedView className="flex-1">
                  <ThemedText
                    className="font-medium"
                    lightClassName="text-foreground"
                    darkClassName="text-darkForeground">
                    {light}
                  </ThemedText>
                  <ThemedText
                    className="text-sm"
                    lightClassName="text-muted-foreground"
                    darkClassName="text-darkMutedForeground">
                    {light === LightCondition.FullSun
                      ? 'At least 8 hours of direct sunlight'
                      : light === LightCondition.PartialSun
                        ? 'Bright light with some direct sun'
                        : light === LightCondition.Shade
                          ? 'Little to no direct sunlight'
                          : 'Grow lights on a schedule'}
                  </ThemedText>
                </ThemedView>
              </TouchableOpacity>
            ))}
          </ThemedView>
          {error && (
            <ThemedText className="text-destructive dark:text-darkDestructive mt-2 text-sm">
              {error.message}
            </ThemedText>
          )}{' '}
          {/* Added mt-2 */}
        </ThemedView>
      )}
    />
  );

  const renderDetailsStep = () => (
    <ThemedView className="mt-4 space-y-6">
      {/* Grow Medium Selection */}
      <Controller
        control={control}
        name="grow_medium"
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <ThemedView className="mb-4">
            {' '}
            {/* Added margin bottom */}
            <ThemedText
              className="mb-3 font-medium"
              lightClassName="text-foreground"
              darkClassName="text-darkForeground">
              Growing Medium
            </ThemedText>
            <ThemedView className="-m-1 flex-row flex-wrap">
              {Object.values(GrowMedium).map((medium) => (
                <TouchableOpacity
                  key={medium}
                  onPress={() => onChange(medium)} /* ... other props ... */
                  className={`m-1 rounded-full border px-4 py-2.5 active:opacity-80 ${value === medium ? 'bg-primary border-primary dark:bg-darkPrimary dark:border-darkPrimary' : 'bg-background border-border dark:bg-darkBackground dark:border-darkBorder'}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: value === medium }}
                  accessibilityLabel={medium}>
                  <ThemedText
                    className={`font-medium ${value === medium ? 'text-primary-foreground dark:text-darkPrimaryForeground' : 'text-foreground dark:text-darkForeground'}`}>
                    {medium}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ThemedView>
            {error && (
              <ThemedText className="text-destructive dark:text-darkDestructive mt-1 text-sm">
                {error.message}
              </ThemedText>
            )}
          </ThemedView>
        )}
      />
      {/* Notes Input */}
      <Controller
        control={control}
        name="notes"
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <ThemedView>
            {' '}
            {/* No margin needed here as it's the last element */}
            <ThemedText
              className="mb-2 font-medium"
              lightClassName="text-foreground"
              darkClassName="text-darkForeground">
              Notes (Optional)
            </ThemedText>{' '}
            {/* Added mb-2 */}
            <TextInput
              className={`bg-input border-border text-foreground placeholder:text-muted-foreground dark:bg-darkInput dark:border-darkBorder dark:text-darkForeground dark:placeholder:text-darkMutedForeground min-h-[120px] rounded-lg border p-4 ${error ? 'border-destructive dark:border-darkDestructive' : 'border-border dark:border-darkBorder'}`} // Increased min-h
              value={value || ''}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Nutrients, watering schedule, etc."
              placeholderTextColor={
                isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]
              }
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {error && (
              <ThemedText className="text-destructive dark:text-darkDestructive mt-1 text-sm">
                {error.message}
              </ThemedText>
            )}
          </ThemedView>
        )}
      />
    </ThemedView>
  );

  const renderDatesStep = () => (
    <Controller
      control={control}
      name="planted_date"
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <ThemedView className="mt-4 space-y-6">
          <ThemedView className="mb-4">
            {' '}
            {/* Added margin bottom */}
            <ThemedText
              className="mb-2 font-medium"
              lightClassName="text-foreground"
              darkClassName="text-darkForeground">
              Germination Date *
            </ThemedText>{' '}
            {/* Added mb-2 */}
            <TouchableOpacity
              className={`bg-input dark:bg-darkInput flex-row items-center justify-between rounded-lg border p-4 ${error ? 'border-destructive dark:border-darkDestructive' : 'border-border dark:border-darkBorder'}`}
              onPress={() => setShowDatePicker(true)}
              accessibilityLabel="Select germination date"
              accessibilityRole="button">
              <ThemedText lightClassName="text-foreground" darkClassName="text-darkForeground">
                {format(value, 'MMMM d, yyyy')}
              </ThemedText>
              <Ionicons
                name="calendar-outline"
                size={24}
                color={isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[500]}
              />
            </TouchableOpacity>
            {error && (
              <ThemedText className="text-destructive dark:text-darkDestructive mt-1 text-sm">
                {error.message}
              </ThemedText>
            )}
            {showDatePicker && (
              <DateTimePicker
                value={value}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) onChange(selectedDate);
                }}
              />
            )}
          </ThemedView>
          {/* ... (Typical Grow Stages info remains the same) ... */}
          <ThemedView
            className="rounded-lg p-4"
            lightClassName="bg-secondary"
            darkClassName="bg-darkSecondary">
            <ThemedText
              className="mb-2 font-medium"
              lightClassName="text-secondary-foreground"
              darkClassName="text-darkSecondaryForeground">
              Typical Grow Stages
            </ThemedText>
            <ThemedText
              className="text-sm"
              lightClassName="text-muted-foreground"
              darkClassName="text-darkMutedForeground">
              • Seedling: 2-3 weeks{'\n'}• Vegetative: 3-16 weeks{'\n'}• Flowering: 8-11 weeks{'\n'}
              • Total grow time: 3-6 months
            </ThemedText>
          </ThemedView>
        </ThemedView>
      )}
    />
  );

  // Helper for progress indicator (remains the same)
  const renderProgressIndicator = () => (
    <ThemedView
      className="mb-8 mt-2 w-full flex-row justify-between px-1"
      accessibilityLabel={`Step ${currentStep + 1} of ${FORM_STEPS.length}`}>
      {FORM_STEPS.map((step, index) => (
        <ThemedView
          key={step.id}
          className={`mx-0.5 h-1 flex-1 rounded-full ${
            index < currentStep
              ? 'bg-primary dark:bg-darkPrimary'
              : index === currentStep
                ? 'bg-primary/50 dark:bg-darkPrimary/50'
                : 'bg-border dark:bg-darkBorder'
          }`}
        />
      ))}
    </ThemedView>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1">
      <ScrollView
        className="bg-background dark:bg-darkBackground flex-1"
        keyboardShouldPersistTaps="handled">
        <ThemedView className="min-h-screen px-4 pb-20 pt-4">
          {/* Header (remains the same) */}
          <ThemedView className="mb-2 flex-row items-center justify-between">
            <TouchableOpacity
              onPress={goToPreviousStep}
              className="-ml-2 p-2"
              accessibilityLabel={currentStep === 0 ? 'Cancel' : 'Previous Step'}
              accessibilityRole="button">
              <Ionicons
                name="arrow-back"
                size={26}
                color={isDarkMode ? theme.colors.neutral[200] : theme.colors.neutral[700]}
              />
            </TouchableOpacity>
            <ThemedText
              className="text-xl font-bold tracking-tight"
              lightClassName="text-foreground"
              darkClassName="text-darkForeground">
              {FORM_STEPS[currentStep].title}
            </ThemedText>
            <ThemedView className="w-10" />
          </ThemedView>
          {/* Description (remains the same) */}
          {FORM_STEPS[currentStep].description && (
            <ThemedText
              className="mb-4 text-center"
              lightClassName="text-muted-foreground"
              darkClassName="text-darkMutedForeground">
              {FORM_STEPS[currentStep].description}
            </ThemedText>
          )}
          {/* Progress indicator (remains the same) */}
          {renderProgressIndicator()}

          {/* Step content */}
          {renderStepContent()}

          {/* Navigation buttons - Updated */}
          <ThemedView className="mt-8 space-y-3">
            {currentStep === FORM_STEPS.length - 1 ? (
              <TouchableOpacity
                className={`flex-row items-center justify-center rounded-lg p-4 active:opacity-80 ${isSubmitting ? 'bg-neutral-300 opacity-50 dark:bg-neutral-700' : 'bg-primary dark:bg-darkPrimary'}`}
                onPress={handleSubmit(onSubmit)} // Use RHF handleSubmit
                disabled={isSubmitting}>
                {isSubmitting && (
                  <ActivityIndicator
                    size="small"
                    color={isDarkMode ? theme.colors.neutral[900] : theme.colors.neutral[50]}
                    className="mr-2"
                  />
                )}
                <ThemedText
                  className="text-center font-semibold"
                  lightClassName={`${isSubmitting ? 'text-neutral-500' : 'text-primary-foreground'}`}
                  darkClassName={`${isSubmitting ? 'text-neutral-400' : 'text-darkPrimaryForeground'}`}>
                  {isSubmitting ? 'Adding Plant...' : 'Finish & Add Plant'}
                </ThemedText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                className="bg-primary dark:bg-darkPrimary rounded-lg p-4 active:opacity-80"
                onPress={goToNextStep} // Calls async validation trigger
              >
                <ThemedText
                  className="text-center font-semibold"
                  lightClassName="text-primary-foreground"
                  darkClassName="text-darkPrimaryForeground">
                  Continue
                </ThemedText>
              </TouchableOpacity>
            )}
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
} // Changed to function declaration
