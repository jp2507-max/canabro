import { zodResolver } from '@hookform/resolvers/zod';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useRef, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  View,
  TextInput,
  ActivityIndicator,
  Alert,
  Text,
  Image,
  ScrollView,
  Pressable,
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
  useAnimatedKeyboard,
  withTiming,
} from 'react-native-reanimated';
import * as z from 'zod';

import { DiaryEntryType } from './EntryTypeSelector';
import { useCreateDiaryEntry } from '../../lib/hooks/diary/useCreateDiaryEntry';
import supabase from '../../lib/supabase';
import { 
  triggerLightHapticSync, 
  triggerSuccessHaptic, 
  triggerErrorHaptic,
  triggerLightHaptic 
} from '../../lib/utils/haptics';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import ThemedText from '../ui/ThemedText';
import { useEnhancedKeyboard } from '../../lib/hooks/useEnhancedKeyboard';
import { EnhancedTextInput } from '../ui/EnhancedTextInput';
import { KeyboardToolbar } from '../ui/KeyboardToolbar';

// Base schema for diary entries
const baseSchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  content: z.string().optional(),
});

// Metrics schemas for specific entry types
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
});

// Dynamic validation schema based on entry type
const getValidationSchema = (entryType: DiaryEntryType) => {
  switch (entryType) {
    case 'watering':
      return baseSchema.extend({ metrics: wateringMetricsSchema.optional() });
    case 'feeding':
      return baseSchema.extend({ metrics: feedingMetricsSchema.optional() });
    case 'environment':
      return baseSchema.extend({ metrics: environmentMetricsSchema.optional() });
    default:
      return baseSchema.extend({ metrics: z.record(z.unknown()).optional() });
  }
};

// Form data type
type DiaryEntryFormData = z.infer<typeof baseSchema> & {
  metrics?:
    | z.infer<typeof wateringMetricsSchema>
    | z.infer<typeof feedingMetricsSchema>
    | z.infer<typeof environmentMetricsSchema>
    | Record<string, unknown>;
};

interface DiaryEntryFormProps {
  plantId: string;
  entryType: DiaryEntryType;
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
}

// Animated Pressable Component for Buttons
const AnimatedPressable = ({ 
  children, 
  onPress, 
  disabled, 
  variant = 'primary', 
  className = '',
  ...props 
}: any) => {
  const scale = useSharedValue(1);
  const backgroundColor = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const bgColor = interpolateColor(
      backgroundColor.value,
      [0, 1],
      variant === 'secondary'
        ? ['rgb(39 39 42)', 'rgb(63 63 70)']
        : ['rgb(34 197 94)', 'rgb(21 128 61)']
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
      runOnJS(triggerLightHapticSync)();
    })
    .onFinalize((event) => {
      'worklet';
      scale.value = withSpring(1, { damping: 15 });
      backgroundColor.value = withSpring(0, { damping: 15 });
      if (event.state === 4 && onPress) {
        runOnJS(onPress)();
      }
    });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[animatedStyle]} className={className} {...props}>
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
      ['rgb(115 115 115)', 'rgb(34 197 94)']
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
      runOnJS(triggerLightHapticSync)();
    })
    .onFinalize((event) => {
      'worklet';
      scale.value = withSpring(1, { damping: 15 });
      borderColor.value = withSpring(0, { damping: 15 });
      if (event.state === 4 && onPress) {
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
              color="rgb(115 115 115)"
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
  const { createDiaryEntry, loading: isSubmitting, reset: resetMutation } = useCreateDiaryEntry();

  // Enhanced keyboard state management
  const scrollViewRef = useRef<any>(null);
  
  // Calculate total number of inputs dynamically based on entry type
  const getTotalInputs = () => {
    let count = 2; // Date + Notes
    if (entryType === 'watering') count += 2; // Amount + Unit
    if (entryType === 'feeding') count += 3; // Amount + Unit + Product
    if (entryType === 'environment') count += 2; // Temperature + Humidity
    return count;
  };

  const totalInputs = getTotalInputs();
  const inputRefs = useMemo(
    () => Array.from({ length: totalInputs }, () => React.createRef<TextInput>()),
    [totalInputs],
  );

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
  } = useEnhancedKeyboard(inputRefs, totalInputs);

  // Get field name for keyboard toolbar
  const getFieldName = (index: number): string => {
    if (index === 0) return 'Date';
    if (index === 1) return 'Notes';
    if (entryType === 'watering') {
      if (index === 2) return 'Amount';
      if (index === 3) return 'Unit';
    }
    if (entryType === 'feeding') {
      if (index === 2) return 'Amount';
      if (index === 3) return 'Unit';
      if (index === 4) return 'Product';
    }
    if (entryType === 'environment') {
      if (index === 2) return 'Temperature';
      if (index === 3) return 'Humidity';
    }
    return `Field ${index + 1}`;
  };
  
  // Keyboard animations
  const keyboard = useAnimatedKeyboard();

  // Get the dynamic schema based on the entryType prop
  const validationSchema = getValidationSchema(entryType);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DiaryEntryFormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      entry_date: new Date().toISOString().split('T')[0],
      content: '',
      metrics: {},
    },
  });

  // Animated keyboard-aware container style
  const containerStyle = useAnimatedStyle(() => {
    return {
      paddingBottom: keyboard.height.value,
      transform: [
        {
          translateY: withSpring(
            isKeyboardVisible ? -keyboardHeight * 0.05 : 0,
            { damping: 20, stiffness: 300 }
          ),
        },
      ],
    };
  });

  // Enhanced input focus management
  const handleInputFocus = (index: number) => {
    setCurrentIndex(index);
    triggerLightHaptic();
    
    // Auto-scroll to focused input
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: index * 80,
        animated: true,
      });
    }, 100);
  };

  // Enhanced input submit handling
  const handleSubmitEditing = (index: number) => {
    if (index < inputRefs.length - 1) {
      goToNextInput();
    } else {
      dismissKeyboard();
    }
  };

  // Image Upload Function (Memory Optimized)
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
        Alert.alert('File Too Large', 'Please select an image smaller than 10MB.');
        return null;
      }

      const extension = 'jpg';

      // Get Supabase session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session for upload');
      }

      // Get Supabase URL from the client configuration
      const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }

      // Construct file path for diary entries
      const filename = `diary_${plantId}_${Date.now()}.${extension}`;
      const filePath = `${userId}/${filename}`;
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

  // Function to handle image picking
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setSelectedImageUri(result.assets[0].uri);
      console.log('Selected Image URI:', result.assets[0].uri);
      triggerSuccessHaptic();
    }
  };

  const onSubmit = async (data: DiaryEntryFormData) => {
    const submissionData: any = {
      plant_id: plantId,
      entry_type: entryType,
      entry_date: data.entry_date,
      content: data.content || '',
      metrics: data.metrics && Object.keys(data.metrics).length > 0 ? data.metrics : undefined,
      image_url: undefined as string | undefined,
    };
    
    console.log('Initial Submission Data:', submissionData);
    console.log('Selected Image URI:', selectedImageUri);

    // Upload Image if selected
    let uploadedImageUrl: string | null = null;
    if (selectedImageUri) {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user) {
        console.error('Error getting user:', userError);
        Alert.alert('Error', 'User not authenticated. Cannot upload image.');
        return;
      }
      const userId = userData.user.id;

      uploadedImageUrl = await uploadImage(userId, selectedImageUri);
      if (!uploadedImageUrl) {
        return; // Upload failed, alert shown in uploadImage
      }
      submissionData.image_url = uploadedImageUrl;
    }

    console.log('Final Submission Data (with image URL if applicable):', submissionData);

    // Call the createDiaryEntry hook
    try {
      resetMutation();
      const result = await createDiaryEntry(submissionData);

      if (result.error) {
        console.error('Error creating diary entry via hook:', result.error);
        Alert.alert('Error', result.error.message || 'Failed to add diary entry.');
        triggerErrorHaptic();
      } else {
        console.log('Diary entry created successfully:', result.data);
        Alert.alert('Success', 'Diary entry added!');
        triggerSuccessHaptic();
        reset();
        setSelectedImageUri(null);
        onSubmitSuccess?.();
      }
    } catch (error: any) {
      console.error('Unexpected error during createDiaryEntry call:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred.');
      triggerErrorHaptic();
    }
  };

  return (
    <>
      <Animated.View style={containerStyle} className="flex-1">
        <Animated.ScrollView
          ref={scrollViewRef}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <Animated.View entering={FadeIn.duration(300)} className="flex-1 p-4">
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <ThemedText variant="heading" className="mb-6 text-xl font-semibold capitalize">
                {entryType} Entry
              </ThemedText>
            </Animated.View>

            {/* Entry Date Input */}
            <Animated.View entering={FadeInDown.delay(200).duration(400)} className="mb-4">
              <Controller
                control={control}
                name="entry_date"
                render={({ field: { onChange, value } }) => (
                  <EnhancedTextInput
                    ref={inputRefs[0]}
                    label="Date"
                    placeholder="YYYY-MM-DD"
                    value={value}
                    onChangeText={onChange}
                    onFocus={() => handleInputFocus(0)}
                    onSubmitEditing={() => handleSubmitEditing(0)}
                    keyboardType="numeric"
                    maxLength={10}
                    error={errors.entry_date?.message}
                    returnKeyType={0 < inputRefs.length - 1 ? 'next' : 'done'}
                  />
                )}
              />
            </Animated.View>

            {/* Notes Input */}
            <Animated.View entering={FadeInDown.delay(300).duration(400)} className="mb-4">
              <Controller
                control={control}
                name="content"
                render={({ field: { onChange, value } }) => (
                  <EnhancedTextInput
                    ref={inputRefs[1]}
                    label={`Notes ${entryType === 'note' ? '' : '(Optional)'}`}
                    placeholder={
                      entryType === 'note' ? 'Enter your note...' : 'Add any relevant notes...'
                    }
                    value={value}
                    onChangeText={onChange}
                    onFocus={() => handleInputFocus(1)}
                    onSubmitEditing={() => handleSubmitEditing(1)}
                    multiline={true}
                    error={errors.content?.message}
                    returnKeyType={1 < inputRefs.length - 1 ? 'next' : 'done'}
                  />
                )}
              />
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
                      triggerLightHaptic();
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
                  <View className="flex-1">
                    <Controller
                      control={control}
                      name="metrics.amount"
                      render={({ field: { onChange, value } }) => (
                        <EnhancedTextInput
                          ref={inputRefs[2]}
                          placeholder="Amount"
                          value={value?.toString() ?? ''}
                          onChangeText={(text: string) => onChange(text ? parseFloat(text) : undefined)}
                          onFocus={() => handleInputFocus(2)}
                          onSubmitEditing={() => handleSubmitEditing(2)}
                          keyboardType="numeric"
                          returnKeyType={2 < inputRefs.length - 1 ? 'next' : 'done'}
                        />
                      )}
                    />
                  </View>
                  <View className="flex-1">
                    <Controller
                      control={control}
                      name="metrics.unit"
                      render={({ field: { onChange, value } }) => (
                        <EnhancedTextInput
                          ref={inputRefs[3]}
                          placeholder="Unit (ml/L)"
                          value={value as string}
                          onChangeText={onChange}
                          onFocus={() => handleInputFocus(3)}
                          onSubmitEditing={() => handleSubmitEditing(3)}
                          returnKeyType={3 < inputRefs.length - 1 ? 'next' : 'done'}
                        />
                      )}
                    />
                  </View>
                </View>
              </Animated.View>
            )}

            {entryType === 'feeding' && (
              <Animated.View entering={FadeInDown.delay(500).duration(400)} className="mb-4">
                <ThemedText className="mb-2 text-sm font-medium">Feeding Details</ThemedText>
                <Controller
                  control={control}
                  name="metrics.product_name"
                  render={({ field: { onChange, value } }) => (
                    <EnhancedTextInput
                      ref={inputRefs[2]}
                      placeholder="Product Name (Optional)"
                      value={value as string | undefined}
                      onChangeText={onChange}
                      onFocus={() => handleInputFocus(2)}
                      onSubmitEditing={() => handleSubmitEditing(2)}
                      returnKeyType={2 < inputRefs.length - 1 ? 'next' : 'done'}
                    />
                  )}
                />
                <View className="flex-row space-x-2">
                  <View className="flex-1">
                    <Controller
                      control={control}
                      name="metrics.amount"
                      render={({ field: { onChange, value } }) => (
                        <EnhancedTextInput
                          ref={inputRefs[3]}
                          placeholder="Amount"
                          value={value?.toString() ?? ''}
                          onChangeText={(text: string) => onChange(text ? parseFloat(text) : undefined)}
                          onFocus={() => handleInputFocus(3)}
                          onSubmitEditing={() => handleSubmitEditing(3)}
                          keyboardType="numeric"
                          returnKeyType={3 < inputRefs.length - 1 ? 'next' : 'done'}
                        />
                      )}
                    />
                  </View>
                  <View className="flex-1">
                    <Controller
                      control={control}
                      name="metrics.unit"
                      render={({ field: { onChange, value } }) => (
                        <EnhancedTextInput
                          ref={inputRefs[4]}
                          placeholder="Unit (ml/L)"
                          value={value as string | undefined}
                          onChangeText={onChange}
                          onFocus={() => handleInputFocus(4)}
                          onSubmitEditing={() => handleSubmitEditing(4)}
                          returnKeyType={4 < inputRefs.length - 1 ? 'next' : 'done'}
                        />
                      )}
                    />
                  </View>
                </View>
              </Animated.View>
            )}

            {entryType === 'environment' && (
              <Animated.View entering={FadeInDown.delay(500).duration(400)} className="mb-4">
                <ThemedText className="mb-2 text-sm font-medium">Environment Readings</ThemedText>
                <View className="flex-row space-x-2">
                  <View className="flex-1">
                    <Controller
                      control={control}
                      name="metrics.temperature"
                      render={({ field: { onChange, value } }) => (
                        <EnhancedTextInput
                          ref={inputRefs[2]}
                          placeholder="Temp (°C/°F)"
                          value={value?.toString() ?? ''}
                          onChangeText={(text: string) => onChange(text ? parseFloat(text) : undefined)}
                          onFocus={() => handleInputFocus(2)}
                          onSubmitEditing={() => handleSubmitEditing(2)}
                          keyboardType="numeric"
                          returnKeyType={2 < inputRefs.length - 1 ? 'next' : 'done'}
                        />
                      )}
                    />
                  </View>
                  <View className="flex-1">
                    <Controller
                      control={control}
                      name="metrics.humidity"
                      render={({ field: { onChange, value } }) => (
                        <EnhancedTextInput
                          ref={inputRefs[3]}
                          placeholder="Humidity (%)"
                          value={value?.toString() ?? ''}
                          onChangeText={(text: string) => {
                            const num = parseFloat(text);
                            onChange(isNaN(num) ? undefined : num);
                          }}
                          onFocus={() => handleInputFocus(3)}
                          onSubmitEditing={() => handleSubmitEditing(3)}
                          keyboardType="numeric"
                          returnKeyType={3 < inputRefs.length - 1 ? 'next' : 'done'}
                        />
                      )}
                    />
                  </View>
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
                  <OptimizedIcon name="checkmark" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                )}
                <Text className="font-medium text-white">
                  {isSubmitting ? 'Saving...' : 'Save Entry'}
                </Text>
              </AnimatedPressable>
            </Animated.View>
          </Animated.View>
        </Animated.ScrollView>
      </Animated.View>

      {/* Enhanced Keyboard Toolbar */}
      <KeyboardToolbar
        isVisible={isKeyboardVisible}
        keyboardHeight={keyboardHeight}
        onPrevious={goToPreviousInput}
        onNext={goToNextInput}
        onDone={dismissKeyboard}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        currentField={getFieldName(currentIndex)}
        totalFields={totalInputs}
        currentIndex={currentIndex}
      />
    </>
  );
}
