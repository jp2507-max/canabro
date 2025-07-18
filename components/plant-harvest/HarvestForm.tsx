'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { takePhoto, selectFromGallery } from '@/lib/utils/image-picker';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import {
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
  runOnUI,
  runOnJS,
} from 'react-native-reanimated';
import { z } from 'zod';

import { OptimizedIcon } from '../ui/OptimizedIcon';
import { EnhancedTextInput } from '../ui/EnhancedTextInput';
import EnhancedKeyboardWrapper from '@/components/keyboard/EnhancedKeyboardWrapper';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';
import { useAuth } from '../../lib/contexts/AuthProvider';
import { useDatabase } from '../../lib/contexts/DatabaseProvider';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerHeavyHaptic,
  triggerLightHapticSync,
  triggerErrorHaptic,
} from '../../lib/utils/haptics';
import { Plant as PlantModel } from '../../lib/models/Plant';
import { uploadPlantGalleryImage } from '../../lib/utils/upload-image';

export interface HarvestFormProps {
  plant: PlantModel;
  onSubmit: (data: HarvestFormData) => Promise<void>;
  onCancel: () => void;
}

export type { HarvestFormData };

// Harvest form schema with validation
type TFunction = (key: string, options?: Record<string, unknown>) => string;
function getHarvestFormSchema(t: TFunction) {
  return z.object({
    harvest_date: z.date({ required_error: t('harvestForm.validation.harvestDateRequired') }),
    wet_weight: z.number()
      .min(0.1, t('harvestForm.validation.wetWeightMin'))
      .max(10000, t('harvestForm.validation.wetWeightMax')),
    dry_weight: z.number()
      .min(0.1, t('harvestForm.validation.dryWeightMin'))
      .max(10000, t('harvestForm.validation.dryWeightMax'))
      .optional(),
    trim_weight: z.number()
      .min(0, t('harvestForm.validation.trimWeightMin'))
      .max(5000, t('harvestForm.validation.trimWeightMax'))
      .optional(),
    weight_unit: z.enum(['grams', 'ounces'], { required_error: t('harvestForm.validation.weightUnitRequired') }),
    drying_method: z.string().optional(),
    curing_notes: z.string().max(500, t('harvestForm.validation.curingNotesMax')).optional(),
    harvest_photos: z.array(z.string().url()).optional(),
  });
}

type HarvestFormData = z.infer<ReturnType<typeof getHarvestFormSchema>>;

// Animation configurations
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 400,
};

const BUTTON_SCALE_CONFIG = {
  pressed: 0.97,
  released: 1,
  timing: { duration: 100 },
};

// Weight unit conversion utilities
const convertWeight = (weight: number, fromUnit: 'grams' | 'ounces', toUnit: 'grams' | 'ounces'): number => {
  if (fromUnit === toUnit) return weight;
  
  if (fromUnit === 'grams' && toUnit === 'ounces') {
    return weight / 28.3495;
  } else if (fromUnit === 'ounces' && toUnit === 'grams') {
    return weight * 28.3495;
  }
  
  return weight;
};

const formatWeight = (weight: number, unit: 'grams' | 'ounces'): string => {
  return `${weight.toFixed(1)} ${unit === 'grams' ? 'g' : 'oz'}`;
};

// Calculate yield efficiency metrics
const calculateYieldMetrics = (plant: PlantModel, harvestData: HarvestFormData) => {
  const plantedDate = new Date(plant.plantedDate);
  const harvestDate = harvestData.harvest_date;
  const totalGrowDays = Math.floor((harvestDate.getTime() - plantedDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Convert weights to grams for consistent calculation
  const wetWeightGrams = harvestData.weight_unit === 'grams' 
    ? harvestData.wet_weight 
    : convertWeight(harvestData.wet_weight, 'ounces', 'grams');
    
  const dryWeightGrams = harvestData.dry_weight 
    ? (harvestData.weight_unit === 'grams' 
        ? harvestData.dry_weight 
        : convertWeight(harvestData.dry_weight, 'ounces', 'grams'))
    : 0;
  
  const yieldPerDay = dryWeightGrams > 0 ? dryWeightGrams / totalGrowDays : 0;
  const dryingEfficiency = wetWeightGrams > 0 && dryWeightGrams > 0 
    ? (dryWeightGrams / wetWeightGrams) * 100 
    : 0;
  
  return {
    totalGrowDays,
    yieldPerDay: Math.round(yieldPerDay * 100) / 100, // Round to 2 decimal places
    dryingEfficiency: Math.round(dryingEfficiency * 10) / 10, // Round to 1 decimal place
  };
};

// Animated Button Component (reused from AddPlantForm pattern)
interface AnimatedButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive';
  className?: string;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  onPress,
  children,
  disabled = false,
  variant = 'primary',
  className = '',
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const variantClasses = useMemo(() => {
    const baseClasses = 'flex-row items-center justify-center rounded-2xl px-4 py-3 shadow-md';
    switch (variant) {
      case 'primary':
        return `${baseClasses} bg-primary-500 dark:bg-primary-600`;
      case 'secondary':
        return `${baseClasses} bg-neutral-200 dark:bg-neutral-700`;
      case 'tertiary':
        return `${baseClasses} bg-transparent border border-neutral-300 dark:border-neutral-600`;
      case 'destructive':
        return `${baseClasses} bg-status-danger`;
      default:
        return baseClasses;
    }
  }, [variant]);

  const triggerHaptic = useCallback(() => {
    const hapticFunction =
      variant === 'destructive'
        ? triggerHeavyHaptic
        : variant === 'primary'
          ? triggerMediumHaptic
          : triggerLightHaptic;
    hapticFunction();
  }, [variant]);

  const gesture = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      'worklet';
      scale.value = withTiming(BUTTON_SCALE_CONFIG.pressed, BUTTON_SCALE_CONFIG.timing);
      runOnJS(triggerHaptic)();
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(BUTTON_SCALE_CONFIG.released, SPRING_CONFIG);
      runOnJS(onPress)();
    });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={animatedStyle}
        className={`${variantClasses} ${disabled ? 'opacity-50' : ''} ${className}`}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};

// Weight Unit Toggle Component
interface WeightUnitToggleProps {
  value: 'grams' | 'ounces';
  onChange: (unit: 'grams' | 'ounces') => void;
}

const WeightUnitToggle: React.FC<WeightUnitToggleProps> = ({ value, onChange }) => {
  const { t } = useTranslation();
  
  return (
    <ThemedView className="flex-row rounded-lg border border-neutral-300 dark:border-neutral-600 p-1">
      {(['grams', 'ounces'] as const).map((unit) => (
        <AnimatedButton
          key={unit}
          onPress={() => onChange(unit)}
          variant={value === unit ? 'primary' : 'tertiary'}
          className="flex-1 py-2">
          <ThemedText
            className={
              value === unit
                ? 'font-medium text-white'
                : 'text-neutral-900 dark:text-neutral-100'
            }>
            {unit === 'grams' ? t('harvestForm.units.grams') : t('harvestForm.units.ounces')}
          </ThemedText>
        </AnimatedButton>
      ))}
    </ThemedView>
  );
};

export const HarvestForm: React.FC<HarvestFormProps> = ({ plant, onSubmit, onCancel }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [harvestPhotos, setHarvestPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Form setup
  const schema = useMemo(() => getHarvestFormSchema(t), [t]);
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<HarvestFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      harvest_date: new Date(),
      weight_unit: 'grams',
      harvest_photos: [],
    },
  });

  // Watch form values for calculations
  const watchedValues = watch();
  const yieldMetrics = useMemo(() => {
    if (watchedValues.wet_weight && watchedValues.harvest_date) {
      return calculateYieldMetrics(plant, watchedValues);
    }
    return null;
  }, [plant, watchedValues]);

  // Photo handling
  const handleTakePhoto = useCallback(async () => {
    if (!user) return;
    
    setIsUploadingPhoto(true);
    try {
      const photo = await takePhoto();
      if (photo) {
        const uploadResult = await uploadPlantGalleryImage(user.id, photo.uri);
        if (uploadResult.success && uploadResult.publicUrl) {
          const newPhotos = [...harvestPhotos, uploadResult.publicUrl];
          setHarvestPhotos(newPhotos);
          setValue('harvest_photos', newPhotos);
          triggerLightHaptic();
        } else {
          Alert.alert(t('harvestForm.errors.photoUploadFailed'), uploadResult.error?.message);
        }
      }
    } catch (error) {
      console.error('Photo capture error:', error);
      Alert.alert(t('harvestForm.errors.photoCaptureError'));
    } finally {
      setIsUploadingPhoto(false);
    }
  }, [user, harvestPhotos, setValue, t]);

  const handleSelectPhoto = useCallback(async () => {
    if (!user) return;
    
    setIsUploadingPhoto(true);
    try {
      const photo = await selectFromGallery();
      if (photo) {
        const uploadResult = await uploadPlantGalleryImage(user.id, photo.uri);
        if (uploadResult.success && uploadResult.publicUrl) {
          const newPhotos = [...harvestPhotos, uploadResult.publicUrl];
          setHarvestPhotos(newPhotos);
          setValue('harvest_photos', newPhotos);
          triggerLightHaptic();
        } else {
          Alert.alert(t('harvestForm.errors.photoUploadFailed'), uploadResult.error?.message);
        }
      }
    } catch (error) {
      console.error('Photo selection error:', error);
      Alert.alert(t('harvestForm.errors.photoSelectionError'));
    } finally {
      setIsUploadingPhoto(false);
    }
  }, [user, harvestPhotos, setValue, t]);

  const handleRemovePhoto = useCallback((index: number) => {
    const newPhotos = harvestPhotos.filter((_, i) => i !== index);
    setHarvestPhotos(newPhotos);
    setValue('harvest_photos', newPhotos);
    triggerLightHaptic();
  }, [harvestPhotos, setValue]);

  // Form submission
  const onFormSubmit: SubmitHandler<HarvestFormData> = useCallback(async (data) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      triggerMediumHaptic();
    } catch (error) {
      console.error('Harvest form submission error:', error);
      triggerErrorHaptic();
      Alert.alert(t('harvestForm.errors.submissionFailed'));
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit, t]);

  return (
    <EnhancedKeyboardWrapper>
      <ScrollView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
        <ThemedView className="p-4 space-y-6">
          {/* Header */}
          <ThemedView className="items-center space-y-2">
            <ThemedText variant="heading" className="text-2xl font-bold">
              {t('harvestForm.title')}
            </ThemedText>
            <ThemedText variant="muted" className="text-center">
              {t('harvestForm.subtitle', { plantName: plant.name })}
            </ThemedText>
          </ThemedView>

          {/* Harvest Date */}
          <Controller
            control={control}
            name="harvest_date"
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <ThemedView>
                <ThemedText variant="heading" className="mb-2 text-base">
                  {t('harvestForm.fields.harvestDate')}
                </ThemedText>
                <AnimatedButton
                  onPress={() => {
                    // TODO: Implement date picker modal
                    console.log('Date picker not implemented yet');
                  }}
                  variant="secondary"
                  className="justify-start">
                  <OptimizedIcon
                    name="calendar"
                    size={20}
                    className="mr-3 text-neutral-900 dark:text-neutral-100"
                  />
                  <ThemedText className="text-neutral-900 dark:text-neutral-100">
                    {value.toLocaleDateString()}
                  </ThemedText>
                </AnimatedButton>
                {error && (
                  <ThemedText className="text-status-danger mt-1 text-xs">{error.message}</ThemedText>
                )}
              </ThemedView>
            )}
          />

          {/* Weight Unit Toggle */}
          <Controller
            control={control}
            name="weight_unit"
            render={({ field: { onChange, value } }) => (
              <ThemedView>
                <ThemedText variant="heading" className="mb-2 text-base">
                  {t('harvestForm.fields.weightUnit')}
                </ThemedText>
                <WeightUnitToggle value={value} onChange={onChange} />
              </ThemedView>
            )}
          />

          {/* Wet Weight */}
          <Controller
            control={control}
            name="wet_weight"
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
              <EnhancedTextInput
                label={t('harvestForm.fields.wetWeight')}
                value={value?.toString() || ''}
                onChangeText={(text) => {
                  const numValue = parseFloat(text);
                  onChange(isNaN(numValue) ? 0 : numValue);
                }}
                onBlur={onBlur}
                placeholder={t('harvestForm.placeholders.wetWeight')}
                error={error?.message}
                leftIcon="scale-outline"
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            )}
          />

          {/* Dry Weight */}
          <Controller
            control={control}
            name="dry_weight"
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
              <EnhancedTextInput
                label={t('harvestForm.fields.dryWeight')}
                value={value?.toString() || ''}
                onChangeText={(text) => {
                  const numValue = parseFloat(text);
                  onChange(isNaN(numValue) ? undefined : numValue);
                }}
                onBlur={onBlur}
                placeholder={t('harvestForm.placeholders.dryWeight')}
                error={error?.message}
                leftIcon="scale-outline"
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            )}
          />

          {/* Trim Weight */}
          <Controller
            control={control}
            name="trim_weight"
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
              <EnhancedTextInput
                label={t('harvestForm.fields.trimWeight')}
                value={value?.toString() || ''}
                onChangeText={(text) => {
                  const numValue = parseFloat(text);
                  onChange(isNaN(numValue) ? undefined : numValue);
                }}
                onBlur={onBlur}
                placeholder={t('harvestForm.placeholders.trimWeight')}
                error={error?.message}
                leftIcon="cut-outline"
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            )}
          />

          {/* Yield Metrics Display */}
          {yieldMetrics && (
            <ThemedView className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4">
              <ThemedText variant="heading" className="mb-2 text-base">
                {t('harvestForm.yieldMetrics.title')}
              </ThemedText>
              <ThemedView className="space-y-1">
                <ThemedText className="text-sm">
                  {t('harvestForm.yieldMetrics.totalGrowDays', { days: yieldMetrics.totalGrowDays })}
                </ThemedText>
                <ThemedText className="text-sm">
                  {t('harvestForm.yieldMetrics.yieldPerDay', { yield: yieldMetrics.yieldPerDay })}
                </ThemedText>
                {yieldMetrics.dryingEfficiency > 0 && (
                  <ThemedText className="text-sm">
                    {t('harvestForm.yieldMetrics.dryingEfficiency', { efficiency: yieldMetrics.dryingEfficiency })}
                  </ThemedText>
                )}
              </ThemedView>
            </ThemedView>
          )}

          {/* Drying Method */}
          <Controller
            control={control}
            name="drying_method"
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
              <EnhancedTextInput
                label={t('harvestForm.fields.dryingMethod')}
                value={value || ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={t('harvestForm.placeholders.dryingMethod')}
                error={error?.message}
                leftIcon="thermometer-outline"
                returnKeyType="next"
              />
            )}
          />

          {/* Curing Notes */}
          <Controller
            control={control}
            name="curing_notes"
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
              <EnhancedTextInput
                label={t('harvestForm.fields.curingNotes')}
                value={value || ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={t('harvestForm.placeholders.curingNotes')}
                multiline
                error={error?.message}
                leftIcon="document-text-outline"
                showCharacterCount
                maxLength={500}
                returnKeyType="done"
              />
            )}
          />

          {/* Harvest Photos */}
          <ThemedView>
            <ThemedText variant="heading" className="mb-2 text-base">
              {t('harvestForm.fields.harvestPhotos')}
            </ThemedText>
            
            {/* Photo Grid */}
            {harvestPhotos.length > 0 && (
              <ThemedView className="mb-4 flex-row flex-wrap gap-2">
                {harvestPhotos.map((photoUrl, index) => (
                  <ThemedView key={index} className="relative">
                    <Image source={{ uri: photoUrl }} className="h-20 w-20 rounded-lg" />
                    <AnimatedButton
                      onPress={() => handleRemovePhoto(index)}
                      variant="destructive"
                      className="absolute -right-1 -top-1 h-6 w-6 rounded-full">
                      <OptimizedIcon name="close" size={12} className="text-white" />
                    </AnimatedButton>
                  </ThemedView>
                ))}
              </ThemedView>
            )}

            {/* Photo Action Buttons */}
            <ThemedView className="flex-row space-x-4">
              <AnimatedButton
                onPress={handleTakePhoto}
                variant="secondary"
                disabled={isUploadingPhoto}
                className="flex-1">
                {isUploadingPhoto ? (
                  <ActivityIndicator size="small" className="mr-2" />
                ) : (
                  <OptimizedIcon name="camera" size={20} className="mr-2 text-neutral-900 dark:text-neutral-100" />
                )}
                <ThemedText className="font-medium text-neutral-900 dark:text-neutral-100">
                  {t('harvestForm.buttons.takePhoto')}
                </ThemedText>
              </AnimatedButton>

              <AnimatedButton
                onPress={handleSelectPhoto}
                variant="secondary"
                disabled={isUploadingPhoto}
                className="flex-1">
                {isUploadingPhoto ? (
                  <ActivityIndicator size="small" className="mr-2" />
                ) : (
                  <OptimizedIcon name="image-outline" size={20} className="mr-2 text-neutral-900 dark:text-neutral-100" />
                )}
                <ThemedText className="font-medium text-neutral-900 dark:text-neutral-100">
                  {t('harvestForm.buttons.selectPhoto')}
                </ThemedText>
              </AnimatedButton>
            </ThemedView>
          </ThemedView>

          {/* Action Buttons */}
          <ThemedView className="flex-row space-x-4 pt-4">
            <AnimatedButton
              onPress={onCancel}
              variant="tertiary"
              className="flex-1">
              <ThemedText className="font-medium text-neutral-900 dark:text-neutral-100">
                {t('common.cancel')}
              </ThemedText>
            </AnimatedButton>

            <AnimatedButton
              onPress={handleSubmit(onFormSubmit)}
              variant="primary"
              disabled={!isValid || isSubmitting}
              className="flex-1">
              {isSubmitting ? (
                <ActivityIndicator size="small" className="mr-2 text-white" />
              ) : (
                <OptimizedIcon name="checkmark" size={20} className="mr-2 text-white" />
              )}
              <ThemedText className="font-medium text-white">
                {t('harvestForm.buttons.recordHarvest')}
              </ThemedText>
            </AnimatedButton>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </EnhancedKeyboardWrapper>
  );
};

export default HarvestForm;