import { MaterialCommunityIcons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { decode } from 'base64-arraybuffer'; // Import decode
import * as FileSystem from 'expo-file-system'; // Import FileSystem
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'; // Import manipulator
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Text,
  Image,
} from 'react-native'; // Added Text, Image imports
import * as z from 'zod';

import { DiaryEntryType } from './EntryTypeSelector';
import { useTheme } from '../../lib/contexts/ThemeContext';
import { useCreateDiaryEntry } from '../../lib/hooks/diary/useCreateDiaryEntry'; // Uncomment hook import
import supabase from '../../lib/supabase'; // Import supabase client
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

// Define base schema
const baseSchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  content: z.string().optional(),
  // image_url will be handled separately during upload
});

// Define metrics schemas for specific types
const wateringMetricsSchema = z.object({
  amount: z.number().positive().optional(),
  unit: z.enum(['ml', 'L', 'oz', 'gal']).optional(),
});

const feedingMetricsSchema = z.object({
  amount: z.number().positive().optional(),
  unit: z.enum(['ml', 'L', 'tsp', 'tbsp']).optional(),
  product_name: z.string().optional(),
});

const environmentMetricsSchema = z.object({
  temperature: z.number().optional(),
  humidity: z.number().min(0).max(100).optional(),
  // Add other relevant env metrics like pH, EC/PPM if needed later
});

// Combine base schema with optional metrics based on type
// We'll apply the correct schema dynamically in the component
const getValidationSchema = (entryType: DiaryEntryType) => {
  switch (entryType) {
    case 'watering':
      return baseSchema.extend({ metrics: wateringMetricsSchema.optional() });
    case 'feeding':
      return baseSchema.extend({ metrics: feedingMetricsSchema.optional() });
    case 'environment':
      return baseSchema.extend({ metrics: environmentMetricsSchema.optional() });
    // Add cases for other types needing specific metrics validation
    default:
      return baseSchema.extend({ metrics: z.record(z.unknown()).optional() }); // Allow any object for others for now
  }
};

// Define the form data type based on a union or a generic approach if possible
// For simplicity now, let's use a broad type and refine if needed
type DiaryEntryFormData = z.infer<typeof baseSchema> & {
  metrics?:
    | z.infer<typeof wateringMetricsSchema>
    | z.infer<typeof feedingMetricsSchema>
    | z.infer<typeof environmentMetricsSchema>
    | Record<string, unknown>; // Allow flexible metrics
};

interface DiaryEntryFormProps {
  plantId: string;
  entryType: DiaryEntryType;
  onSubmitSuccess?: () => void; // Callback on successful submission
  onCancel?: () => void; // Callback for cancellation
}

export default function DiaryEntryForm({
  plantId,
  entryType,
  onSubmitSuccess,
  onCancel,
}: DiaryEntryFormProps) {
  const { theme, isDarkMode } = useTheme();
  // const [isSubmitting, setIsSubmitting] = useState(false); // Remove local submitting state
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const {
    createDiaryEntry,
    loading: isSubmitting,

    reset: resetMutation,
  } = useCreateDiaryEntry(); // Use hook state

  // Get the dynamic schema based on the entryType prop
  const validationSchema = getValidationSchema(entryType);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    // Use watch to potentially react to metric field changes if needed
  } = useForm<DiaryEntryFormData>({
    resolver: zodResolver(validationSchema), // Use dynamic schema
    defaultValues: {
      entry_date: new Date().toISOString().split('T')[0],
      content: '',
      metrics: {},
      // Don't include image URI in form data, handle separately
    },
  });

  // Watch metrics fields if needed for dynamic UI updates (optional)
  // const watchedMetrics = watch("metrics");

  // --- Image Upload Function (Adapted from CreatePostScreen) ---
  const uploadImage = async (userId: string, imageUri: string): Promise<string | null> => {
    console.log('Starting diary image processing and upload for URI:', imageUri);
    try {
      // Manipulate Image
      console.log('Manipulating image...');
      const manipResult = await manipulateAsync(imageUri, [{ resize: { width: 1024 } }], {
        compress: 0.7,
        format: SaveFormat.JPEG,
      });
      console.log(
        'Image manipulated:',
        manipResult.uri,
        `(${manipResult.width}x${manipResult.height})`
      );

      const mimeType = 'image/jpeg';
      const extension = 'jpg';

      // Read manipulated file as Base64
      console.log('Reading manipulated file as Base64...');
      const base64Data = await FileSystem.readAsStringAsync(manipResult.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert Base64 to ArrayBuffer
      console.log('Converting Base64 to ArrayBuffer...');
      const arrayBuffer = decode(base64Data);

      // Construct file path for diary entries
      const filename = `diary_${plantId}_${Date.now()}.${extension}`;
      const filePath = `${userId}/${filename}`; // Store under user ID
      console.log('Uploading diary image to Supabase storage at path:', filePath);

      // Upload ArrayBuffer
      console.log('Uploading ArrayBuffer to Supabase...');
      const { error: uploadError } = await supabase.storage
        .from('diary_entries') // Use 'diary_entries' bucket
        .upload(filePath, arrayBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw uploadError;
      }
      console.log('Diary image uploaded successfully.');

      // Get public URL
      const { data: urlData } = supabase.storage.from('diary_entries').getPublicUrl(filePath);
      if (!urlData || !urlData.publicUrl) {
        console.error('Could not get public URL for diary image path:', filePath);
        throw new Error('Could not get public URL after upload.');
      }

      console.log('Diary image public URL:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading diary image:', error);
      Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
      return null;
    }
  };
  // --- ---

  // Function to handle image picking
  const pickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    // Launch image library
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, // Optional: allow editing
      aspect: [4, 3], // Optional: aspect ratio
      quality: 0.8, // Optional: image quality (0 to 1)
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImageUri(result.assets[0].uri);
      console.log('Selected Image URI:', result.assets[0].uri);
    }
  };

  const onSubmit = async (data: DiaryEntryFormData) => {
    // Prepare data for submission - metrics is now passed as an object
    const submissionData: any = {
      // Use 'any' temporarily or define a more precise type matching CreateDiaryEntryData
      plant_id: plantId,
      entry_type: entryType,
      entry_date: data.entry_date,
      content: data.content || '',
      metrics: data.metrics && Object.keys(data.metrics).length > 0 ? data.metrics : undefined, // Pass object directly
      image_url: undefined as string | undefined,
    };
    console.log('Initial Submission Data:', submissionData);
    console.log('Selected Image URI:', selectedImageUri);

    // --- Upload Image if selected ---
    let uploadedImageUrl: string | null = null;
    if (selectedImageUri) {
      // Get the authenticated user asynchronously
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user) {
        console.error('Error getting user:', userError);
        Alert.alert('Error', 'User not authenticated. Cannot upload image.');
        // No need to set submitting state here, hook handles it
        return;
      }
      const userId = userData.user.id;

      // Proceed with upload using the obtained userId
      uploadedImageUrl = await uploadImage(userId, selectedImageUri);
      if (!uploadedImageUrl) {
        // Upload failed, alert shown in uploadImage
        // No need to setIsSubmitting(false) here, hook handles loading state
        return; // Stop submission
      }
      submissionData.image_url = uploadedImageUrl; // Add URL to data
    }
    // --- ---

    console.log('Final Submission Data (with image URL if applicable):', submissionData);

    // --- Call the createDiaryEntry hook ---
    try {
      resetMutation(); // Reset any previous errors from the hook
      const result = await createDiaryEntry(submissionData);

      if (result.error) {
        console.error('Error creating diary entry via hook:', result.error);
        Alert.alert('Error', result.error.message || 'Failed to add diary entry.');
      } else {
        console.log('Diary entry created successfully:', result.data);
        Alert.alert('Success', 'Diary entry added!');
        reset(); // Reset form fields
        setSelectedImageUri(null); // Clear selected image
        onSubmitSuccess?.(); // Call success callback
      }
    } catch (error: any) {
      // Catch unexpected errors during the hook call itself
      console.error('Unexpected error during createDiaryEntry call:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred.');
    }
    // Loading state is handled by the hook's `isSubmitting` variable
    // --- ---
  };

  const inputStyle = {
    backgroundColor: isDarkMode ? theme.colors.neutral[700] : theme.colors.neutral[100],
    color: isDarkMode ? theme.colors.neutral[100] : theme.colors.neutral[900],
    borderColor: isDarkMode ? theme.colors.neutral[600] : theme.colors.neutral[300],
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    fontSize: theme.typography.fontSize.base,
  };

  const textAreaStyle = {
    ...inputStyle,
    height: 100, // Adjust height for notes
    textAlignVertical: 'top' as 'top', // Ensure text starts at the top for multiline
  };

  return (
    <ThemedView className="flex-1 p-4">
      <ThemedText className="mb-4 text-xl font-semibold capitalize">{entryType} Entry</ThemedText>

      {/* Entry Date Input */}
      <View className="mb-4">
        <ThemedText className="mb-1 text-sm font-medium">Date</ThemedText>
        <Controller
          control={control}
          name="entry_date"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={inputStyle}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={
                isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]
              }
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              keyboardType="numeric" // Basic numeric keyboard
              maxLength={10}
            />
          )}
        />
        {errors.entry_date && (
          <ThemedText className="mt-1 text-sm text-status-danger">
            {errors.entry_date.message}
          </ThemedText>
        )}
      </View>

      {/* Notes Input */}
      <View className="mb-4">
        <ThemedText className="mb-1 text-sm font-medium">
          Notes {entryType === 'note' ? '' : '(Optional)'}
        </ThemedText>
        <Controller
          control={control}
          name="content"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={textAreaStyle}
              placeholder={
                entryType === 'note' ? 'Enter your note...' : 'Add any relevant notes...'
              }
              placeholderTextColor={
                isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]
              }
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              multiline
            />
          )}
        />
        {errors.content && (
          <ThemedText className="mt-1 text-sm text-status-danger">
            {errors.content.message}
          </ThemedText>
        )}
      </View>

      {/* Image Picker Section */}
      <View className="mb-4">
        <ThemedText className="mb-1 text-sm font-medium">Image (Optional)</ThemedText>
        <TouchableOpacity onPress={pickImage} disabled={isSubmitting}>
          <ThemedView
            className="h-32 items-center justify-center rounded-lg border border-dashed"
            lightClassName="border-neutral-300 bg-neutral-100"
            darkClassName="border-neutral-600 bg-neutral-700">
            {selectedImageUri ? (
              <Image
                source={{ uri: selectedImageUri }}
                className="h-full w-full rounded-lg"
                resizeMode="cover"
              />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="image-plus"
                  size={32}
                  color={isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[500]}
                />
                <ThemedText
                  className="mt-1 text-xs"
                  lightClassName="text-neutral-500"
                  darkClassName="text-neutral-400">
                  Tap to add image
                </ThemedText>
              </>
            )}
          </ThemedView>
        </TouchableOpacity>
        {selectedImageUri && (
          <TouchableOpacity
            onPress={() => setSelectedImageUri(null)}
            className="mt-2 self-start rounded bg-status-danger/80 px-2 py-1">
            <Text className="text-xs text-white">Remove Image</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Conditional Metrics Fields */}
      {entryType === 'watering' && (
        <View className="mb-4">
          <ThemedText className="mb-2 text-sm font-medium">Watering Details</ThemedText>
          <View className="flex-row">
            <Controller
              control={control}
              name="metrics.amount"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[inputStyle, { flex: 1, marginRight: theme.spacing[2] }]}
                  placeholder="Amount"
                  placeholderTextColor={
                    isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]
                  }
                  onBlur={onBlur}
                  onChangeText={(text) => onChange(text ? parseFloat(text) : undefined)}
                  value={value?.toString() ?? ''}
                  keyboardType="numeric"
                />
              )}
            />
            <Controller
              control={control}
              name="metrics.unit"
              render={({ field: { onChange, value } }) => (
                // TODO: Replace with a Picker/Select component
                <TextInput
                  style={[inputStyle, { flex: 1 }]}
                  placeholder="Unit (ml/L)"
                  placeholderTextColor={
                    isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]
                  }
                  onChangeText={onChange}
                  value={value as string | undefined} // Explicit cast
                />
              )}
            />
          </View>
          {/* Add specific errors for metrics if needed */}
        </View>
      )}

      {entryType === 'feeding' && (
        <View className="mb-4">
          <ThemedText className="mb-2 text-sm font-medium">Feeding Details</ThemedText>
          <Controller
            control={control}
            name="metrics.product_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[inputStyle, { marginBottom: theme.spacing[2] }]}
                placeholder="Product Name (Optional)"
                placeholderTextColor={
                  isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]
                }
                onBlur={onBlur}
                onChangeText={onChange}
                value={value as string | undefined} // Explicit cast
              />
            )}
          />
          <View className="flex-row">
            <Controller
              control={control}
              name="metrics.amount"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[inputStyle, { flex: 1, marginRight: theme.spacing[2] }]}
                  placeholder="Amount"
                  placeholderTextColor={
                    isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]
                  }
                  onBlur={onBlur}
                  onChangeText={(text) => onChange(text ? parseFloat(text) : undefined)}
                  value={value?.toString() ?? ''}
                  keyboardType="numeric"
                />
              )}
            />
            <Controller
              control={control}
              name="metrics.unit"
              render={({ field: { onChange, value } }) => (
                // TODO: Replace with a Picker/Select component
                <TextInput
                  style={[inputStyle, { flex: 1 }]}
                  placeholder="Unit (ml/L)"
                  placeholderTextColor={
                    isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]
                  }
                  onChangeText={onChange}
                  value={value as string | undefined} // Explicit cast
                />
              )}
            />
          </View>
        </View>
      )}

      {entryType === 'environment' && (
        <View className="mb-4">
          <ThemedText className="mb-2 text-sm font-medium">Environment Readings</ThemedText>
          <View className="flex-row">
            <Controller
              control={control}
              name="metrics.temperature"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[inputStyle, { flex: 1, marginRight: theme.spacing[2] }]}
                  placeholder="Temp (°C/°F)"
                  placeholderTextColor={
                    isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]
                  }
                  onBlur={onBlur}
                  onChangeText={(text) => onChange(text ? parseFloat(text) : undefined)}
                  value={value?.toString() ?? ''}
                  keyboardType="numeric"
                />
              )}
            />
            <Controller
              control={control}
              name="metrics.humidity"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[inputStyle, { flex: 1 }]}
                  placeholder="Humidity (%)"
                  placeholderTextColor={
                    isDarkMode ? theme.colors.neutral[500] : theme.colors.neutral[400]
                  }
                  onBlur={onBlur}
                  // Ensure onChange handles potential NaN from parseFloat
                  onChangeText={(text) => {
                    const num = parseFloat(text);
                    onChange(isNaN(num) ? undefined : num);
                  }}
                  value={value?.toString() ?? ''} // Value is already string | undefined
                  keyboardType="numeric"
                />
              )}
            />
          </View>
          {/* Add specific errors for metrics if needed */}
        </View>
      )}

      {/* Action Buttons */}
      <View className="mt-6 flex-row justify-end">
        {onCancel && (
          <TouchableOpacity
            onPress={onCancel}
            className="mr-3 rounded-full px-6 py-3"
            style={{
              backgroundColor: isDarkMode ? theme.colors.neutral[700] : theme.colors.neutral[200],
            }}
            disabled={isSubmitting}>
            <ThemedText className="font-medium">Cancel</ThemedText>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          className="flex-row items-center rounded-full px-6 py-3"
          style={{ backgroundColor: theme.colors.primary[500] }}
          disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#ffffff" className="mr-2" />
          ) : (
            <MaterialCommunityIcons name="check" size={18} color="#ffffff" className="mr-1" />
          )}
          <Text style={{ color: '#ffffff', fontWeight: '500' }}>
            {isSubmitting ? 'Saving...' : 'Save Entry'}
          </Text>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}
