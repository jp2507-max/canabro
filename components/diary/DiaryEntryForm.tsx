import { zodResolver } from '@hookform/resolvers/zod';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system'; // Import FileSystem
import * as Haptics from 'expo-haptics';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'; // Import manipulator
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  View,
  TextInput,
  ActivityIndicator,
  Alert,
  Text,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import * as z from 'zod';

import { DiaryEntryType } from './EntryTypeSelector';
import { useCreateDiaryEntry } from '../../lib/hooks/diary/useCreateDiaryEntry'; // Uncomment hook import
import supabase from '../../lib/supabase'; // Import supabase client
import { OptimizedIcon } from '../ui/OptimizedIcon';
import ThemedText from '../ui/ThemedText';

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

// Animated Pressable Component for Buttons
const AnimatedPressable = ({ children, onPress, disabled, variant = 'primary', ...props }: any) => {
  const scale = useSharedValue(1);
  const backgroundColor = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const bgColor = interpolateColor(
      backgroundColor.value,
      [0, 1],
      variant === 'secondary'
        ? ['rgb(39 39 42)', 'rgb(63 63 70)'] // neutral-800 to neutral-700
        : ['rgb(34 197 94)', 'rgb(21 128 61)'] // green-500 to green-700
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor: bgColor,
    };
  });

  const gesture = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.95, { damping: 15 });
      backgroundColor.value = withSpring(1, { damping: 15 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onFinalize((event) => {
      'worklet';
      scale.value = withSpring(1, { damping: 15 });
      backgroundColor.value = withSpring(0, { damping: 15 });
      if (event.state === 4 && onPress) {
        // State.END
        runOnJS(onPress)();
      }
    });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[animatedStyle]} {...props}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};

// Animated Image Picker Component
const AnimatedImagePicker = ({ onPress, selectedImageUri, disabled }: any) => {
  const scale = useSharedValue(1);
  const borderColor = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const border = interpolateColor(
      borderColor.value,
      [0, 1],
      ['rgb(115 115 115)', 'rgb(34 197 94)'] // neutral-500 to green-500
    );

    return {
      transform: [{ scale: scale.value }],
      borderColor: border,
    };
  });

  const gesture = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.98, { damping: 15 });
      borderColor.value = withSpring(1, { damping: 15 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onFinalize((event) => {
      'worklet';
      scale.value = withSpring(1, { damping: 15 });
      borderColor.value = withSpring(0, { damping: 15 });
      if (event.state === 4 && onPress) {
        // State.END
        runOnJS(onPress)();
      }
    });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[animatedStyle]}
        className="h-32 items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-700">
        {selectedImageUri ? (
          <Image
            source={{ uri: selectedImageUri }}
            className="h-full w-full rounded-lg"
            resizeMode="cover"
          />
        ) : (
          <>
            <OptimizedIcon
              name="image-plus"
              size={32}
              color="rgb(115 115 115)" // neutral-500
            />
            <ThemedText variant="muted" className="mt-1 text-xs">
              Tap to add image
            </ThemedText>
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

export default function DiaryEntryForm({
  plantId,
  entryType,
  onSubmitSuccess,
  onCancel,
}: DiaryEntryFormProps) {
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const { createDiaryEntry, loading: isSubmitting, reset: resetMutation } = useCreateDiaryEntry(); // Use hook state

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

  // --- Image Upload Function (Memory Optimized) ---
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

      // Check file size before upload to prevent OOM issues
      const fileInfo = await FileSystem.getInfoAsync(manipResult.uri);
      if (fileInfo.exists && fileInfo.size && fileInfo.size > 10 * 1024 * 1024) {
        // 10MB limit
        Alert.alert('File Too Large', 'Please select an image smaller than 10MB.');
        return null;
      }

      const extension = 'jpg';

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

      // Construct file path for diary entries
      const filename = `diary_${plantId}_${Date.now()}.${extension}`;
      const filePath = `${userId}/${filename}`; // Store under user ID
      console.log('Uploading diary image to Supabase storage at path:', filePath);

      const uploadUrl = `${supabaseUrl}/storage/v1/object/diary_entries/${filePath}`;

      const uploadResult = await FileSystem.uploadAsync(uploadUrl, manipResult.uri, {
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

    if (!result.canceled && result.assets?.[0]?.uri) {
      setSelectedImageUri(result.assets[0].uri);
      console.log('Selected Image URI:', result.assets[0].uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        console.log('Diary entry created successfully:', result.data);
        Alert.alert('Success', 'Diary entry added!');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        reset(); // Reset form fields
        setSelectedImageUri(null); // Clear selected image
        onSubmitSuccess?.(); // Call success callback
      }
    } catch (error: any) {
      // Catch unexpected errors during the hook call itself
      console.error('Unexpected error during createDiaryEntry call:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    // Loading state is handled by the hook's `isSubmitting` variable
    // --- ---
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(300)} className="flex-1 p-4">
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <ThemedText variant="heading" className="mb-6 text-xl font-semibold capitalize">
              {entryType} Entry
            </ThemedText>
          </Animated.View>

          {/* Entry Date Input */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)} className="mb-4">
            <ThemedText className="mb-2 text-sm font-medium">Date</ThemedText>
            <Controller
              control={control}
              name="entry_date"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-3 text-base text-neutral-900 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="rgb(115 115 115)" // neutral-500
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  keyboardType="numeric" // Basic numeric keyboard
                  maxLength={10}
                />
              )}
            />
            {errors.entry_date && (
              <Animated.View entering={FadeIn.duration(200)}>
                <ThemedText className="text-status-danger mt-1 text-sm">
                  {errors.entry_date.message}
                </ThemedText>
              </Animated.View>
            )}
          </Animated.View>

          {/* Notes Input */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)} className="mb-4">
            <ThemedText className="mb-2 text-sm font-medium">
              Notes {entryType === 'note' ? '' : '(Optional)'}
            </ThemedText>
            <Controller
              control={control}
              name="content"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="h-24 rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-3 text-base text-neutral-900 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
                  style={{ textAlignVertical: 'top' }}
                  placeholder={
                    entryType === 'note' ? 'Enter your note...' : 'Add any relevant notes...'
                  }
                  placeholderTextColor="rgb(115 115 115)" // neutral-500
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  multiline
                />
              )}
            />
            {errors.content && (
              <Animated.View entering={FadeIn.duration(200)}>
                <ThemedText className="text-status-danger mt-1 text-sm">
                  {errors.content.message}
                </ThemedText>
              </Animated.View>
            )}
          </Animated.View>

          {/* Image Picker Section */}
          <Animated.View entering={FadeInDown.delay(400).duration(400)} className="mb-4">
            <ThemedText className="mb-2 text-sm font-medium">Image (Optional)</ThemedText>
            <AnimatedImagePicker
              onPress={pickImage}
              selectedImageUri={selectedImageUri}
              disabled={isSubmitting}
            />
            {selectedImageUri && (
              <Animated.View entering={FadeIn.duration(200)} className="mt-2">
                <AnimatedPressable
                  onPress={() => {
                    setSelectedImageUri(null);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  variant="secondary"
                  className="self-start rounded-lg px-3 py-2">
                  <Text className="text-xs text-white">Remove Image</Text>
                </AnimatedPressable>
              </Animated.View>
            )}
          </Animated.View>

          {/* Conditional Metrics Fields */}
          {entryType === 'watering' && (
            <Animated.View entering={FadeInDown.delay(500).duration(400)} className="mb-4">
              <ThemedText className="mb-2 text-sm font-medium">Watering Details</ThemedText>
              <View className="flex-row space-x-2">
                <Controller
                  control={control}
                  name="metrics.amount"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className="flex-1 rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-3 text-base text-neutral-900 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
                      placeholder="Amount"
                      placeholderTextColor="rgb(115 115 115)"
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
                    <TextInput
                      className="flex-1 rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-3 text-base text-neutral-900 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
                      placeholder="Unit (ml/L)"
                      placeholderTextColor="rgb(115 115 115)"
                      onChangeText={onChange}
                      value={value as string | undefined}
                    />
                  )}
                />
              </View>
            </Animated.View>
          )}

          {entryType === 'feeding' && (
            <Animated.View entering={FadeInDown.delay(500).duration(400)} className="mb-4">
              <ThemedText className="mb-2 text-sm font-medium">Feeding Details</ThemedText>
              <Controller
                control={control}
                name="metrics.product_name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="mb-2 rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-3 text-base text-neutral-900 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
                    placeholder="Product Name (Optional)"
                    placeholderTextColor="rgb(115 115 115)"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value as string | undefined}
                  />
                )}
              />
              <View className="flex-row space-x-2">
                <Controller
                  control={control}
                  name="metrics.amount"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className="flex-1 rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-3 text-base text-neutral-900 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
                      placeholder="Amount"
                      placeholderTextColor="rgb(115 115 115)"
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
                    <TextInput
                      className="flex-1 rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-3 text-base text-neutral-900 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
                      placeholder="Unit (ml/L)"
                      placeholderTextColor="rgb(115 115 115)"
                      onChangeText={onChange}
                      value={value as string | undefined}
                    />
                  )}
                />
              </View>
            </Animated.View>
          )}

          {entryType === 'environment' && (
            <Animated.View entering={FadeInDown.delay(500).duration(400)} className="mb-4">
              <ThemedText className="mb-2 text-sm font-medium">Environment Readings</ThemedText>
              <View className="flex-row space-x-2">
                <Controller
                  control={control}
                  name="metrics.temperature"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className="flex-1 rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-3 text-base text-neutral-900 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
                      placeholder="Temp (°C/°F)"
                      placeholderTextColor="rgb(115 115 115)"
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
                      className="flex-1 rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-3 text-base text-neutral-900 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
                      placeholder="Humidity (%)"
                      placeholderTextColor="rgb(115 115 115)"
                      onBlur={onBlur}
                      // Ensure onChange handles potential NaN from parseFloat
                      onChangeText={(text) => {
                        const num = parseFloat(text);
                        onChange(isNaN(num) ? undefined : num);
                      }}
                      value={value?.toString() ?? ''}
                      keyboardType="numeric"
                    />
                  )}
                />
              </View>
            </Animated.View>
          )}

          {/* Action Buttons */}
          <Animated.View
            entering={FadeInDown.delay(600).duration(400)}
            className="mt-6 flex-row justify-end space-x-3">
            {onCancel && (
              <AnimatedPressable
                onPress={onCancel}
                disabled={isSubmitting}
                variant="secondary"
                className="rounded-full px-6 py-3">
                <ThemedText className="font-medium text-white">Cancel</ThemedText>
              </AnimatedPressable>
            )}
            <AnimatedPressable
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="flex-row items-center rounded-full px-6 py-3">
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
              ) : (
                <OptimizedIcon name="check" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              )}
              <Text className="font-medium text-white">
                {isSubmitting ? 'Saving...' : 'Save Entry'}
              </Text>
            </AnimatedPressable>
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
