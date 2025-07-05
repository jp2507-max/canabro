import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState, useRef, useMemo } from 'react';
import { selectFromGallery } from '@/lib/utils/image-picker';
import { Controller, useForm } from 'react-hook-form';
import { View, TextInput, ActivityIndicator, Alert, Text, Image, ScrollView, Keyboard } from 'react-native';
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
import EnhancedKeyboardWrapper from '@/components/keyboard/EnhancedKeyboardWrapper';

import { DiaryEntryType } from './EntryTypeSelector';
import { useCreateDiaryEntry } from '../../lib/hooks/diary/useCreateDiaryEntry';
import supabase from '../../lib/supabase';
import { uploadDiaryImage } from '../../lib/utils/upload-image';
import {
  triggerLightHapticSync,
  triggerSuccessHaptic,
  triggerErrorHaptic,
  triggerLightHaptic,
} from '../../lib/utils/haptics';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import ThemedText from '../ui/ThemedText';
import { EnhancedTextInput } from '../ui/EnhancedTextInput';

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
            <OptimizedIcon name="image-plus" size={32} color="rgb(115 115 115)" />
            <ThemedText variant="muted" className="mt-1 text-xs">
              Tap to add image
            </ThemedText>
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

// Create an animated version of the FormKeyboardWrapper so we can keep entering animations
const AnimatedEnhancedKeyboardWrapper = Animated.createAnimatedComponent(EnhancedKeyboardWrapper);

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
    [totalInputs]
  );

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

  // Enhanced input focus management
  const handleInputFocus = () => {
    triggerLightHaptic();
  };

  // Enhanced input submit handling
  const handleSubmitEditing = () => {
    Keyboard.dismiss();
  };

  // Image Upload Function using centralized helper
  const handleImageUpload = async (userId: string, imageUri: string): Promise<string | null> => {
    console.log('Starting diary image upload for URI:', imageUri);
    const result = await uploadDiaryImage(userId, imageUri, plantId);
    return result.success ? result.publicUrl || null : null;
  };

  // Function to handle image picking
  const pickImage = async () => {
    const result = await selectFromGallery();
    if (result) {
      setSelectedImageUri(result.uri);
      console.log('Selected Image URI:', result.uri);
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

      uploadedImageUrl = await handleImageUpload(userId, selectedImageUri);
      if (!uploadedImageUrl) {
        return; // Upload failed, alert shown in upload helper
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
      <Animated.View className="flex-1">
        <AnimatedEnhancedKeyboardWrapper className="flex-1" showToolbar={false}>
          <Animated.ScrollView
            ref={scrollViewRef as any}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            <View className="pb-[100px]">
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
                        onFocus={handleInputFocus}
                        onSubmitEditing={handleSubmitEditing}
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
                        onFocus={handleInputFocus}
                        onSubmitEditing={handleSubmitEditing}
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
                              onChangeText={(text: string) =>
                                onChange(text ? parseFloat(text) : undefined)
                              }
                              onFocus={handleInputFocus}
                              onSubmitEditing={handleSubmitEditing}
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
                              onFocus={handleInputFocus}
                              onSubmitEditing={handleSubmitEditing}
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
                          onFocus={handleInputFocus}
                          onSubmitEditing={handleSubmitEditing}
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
                              onChangeText={(text: string) =>
                                onChange(text ? parseFloat(text) : undefined)
                              }
                              onFocus={handleInputFocus}
                              onSubmitEditing={handleSubmitEditing}
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
                              onFocus={handleInputFocus}
                              onSubmitEditing={handleSubmitEditing}
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
                              onChangeText={(text: string) =>
                                onChange(text ? parseFloat(text) : undefined)
                              }
                              onFocus={handleInputFocus}
                              onSubmitEditing={handleSubmitEditing}
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
                              onFocus={handleInputFocus}
                              onSubmitEditing={handleSubmitEditing}
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
                      <OptimizedIcon
                        name="checkmark"
                        size={18}
                        color="#ffffff"
                        style={{ marginRight: 8 }}
                      />
                    )}
                    <Text className="font-medium text-white">
                      {isSubmitting ? 'Saving...' : 'Save Entry'}
                    </Text>
                  </AnimatedPressable>
                </Animated.View>
              </Animated.View>
            </View>
          </Animated.ScrollView>
        </AnimatedEnhancedKeyboardWrapper>
      </Animated.View>
    </>
  );
}
