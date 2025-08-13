'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isValid, addDays } from '@/lib/utils/date';
import { router } from 'expo-router';
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { takePhoto, selectFromGallery } from '@/lib/utils/image-picker';
import { useForm, Controller, SubmitHandler, useWatch } from 'react-hook-form';
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
import * as Sentry from '@sentry/react-native';
import { log as logger } from '@/lib/utils/logger';

import { StrainAutocomplete, StrainAutocompleteRef } from './StrainAutocomplete';

// Union type for input refs used in AddPlantForm
type PlantFormInputRef = React.RefObject<TextInput | StrainAutocompleteRef | null>;
import { OptimizedIcon } from './ui/OptimizedIcon';
import { EnhancedTextInput } from './ui/EnhancedTextInput';

import EnhancedKeyboardWrapper from '@/components/keyboard/EnhancedKeyboardWrapper';
import ThemedText from './ui/ThemedText';
import ThemedView from './ui/ThemedView';
import { useAuth } from '../lib/contexts/AuthProvider';
import { useDatabase } from '../lib/contexts/DatabaseProvider';
import { useEnhancedKeyboard } from '../lib/hooks/keyboard/useEnhancedKeyboard';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerHeavyHaptic,
  triggerLightHapticSync,
  triggerErrorHaptic,
} from '../lib/utils/haptics';
import { Plant as PlantModel } from '../lib/models/Plant';
import {
  ensureStrainInLocalDB,
  ensureStrainInSupabase,
  prepareDataForSupabase,
} from '../lib/services/sync/strain-sync.service';
import supabase from '../lib/supabase';
import { uploadPlantGalleryImage } from '../lib/utils/upload-image';
import { GrowthStage, GROWTH_STAGES_ARRAY, LightCondition, GrowMedium, CannabisType } from '../lib/types/plant';
import { RawStrainApiResponse } from '../lib/types/weed-db';
import StrainIntegrationService, {
  preparePlantPredictions,
  type PlantType,
  type Environment as EnvOverride,
  type Hemisphere as HemiOverride,
} from '../lib/services/StrainIntegrationService';
import { createGrowthStageValidator } from '../lib/validation';

interface PlantFormProps {
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
  imageUrl?: string;
  notes?: string;
}


type TFunction = (key: string, options?: Record<string, unknown>) => string;
function getPlantFormSchema(t: TFunction) {
  return z.object({
    name: z.string().min(1, t('addPlantForm.validation.nameRequired')),
    strain: z.string().min(1, t('addPlantForm.validation.strainRequired')),
    strain_id: z.string().optional(),
    planted_date: z.date({ required_error: t('addPlantForm.validation.plantedDateRequired') }),
    growth_stage: createGrowthStageValidator(t('addPlantForm.validation.growthStageRequired')),
    cannabis_type: z.nativeEnum(CannabisType).optional(),
    grow_medium: z.nativeEnum(GrowMedium).optional(),
    light_condition: z.nativeEnum(LightCondition).optional(),
    location_description: z.string().min(1, t('addPlantForm.validation.locationDescriptionRequired')),
    image_url: z.string().url(t('addPlantForm.validation.invalidImageUrl')).optional().nullable(),
    notes: z.string().optional(),
  });
}

import { Control, FieldErrors, UseFormSetValue, UseFormGetValues } from 'react-hook-form';
type PlantFormData = z.infer<ReturnType<typeof getPlantFormSchema>>;

interface FormStep {
  id: string;
  title: string;
  description?: string;
  fields: (keyof PlantFormData)[];
}

const FORM_STEPS: FormStep[] = [
  {
    id: 'photo',
    title: 'addPlantForm.photoStep.title',
    description: 'addPlantForm.photoStep.description',
    fields: ['image_url'],
  },
  {
    id: 'basicInfo',
    title: 'addPlantForm.basicInfoStep.title',
    description: 'addPlantForm.basicInfoStep.description',
    fields: ['name', 'strain', 'cannabis_type', 'growth_stage'],
  },
  {
    id: 'location',
    title: 'addPlantForm.locationStep.title',
    description: 'addPlantForm.locationStep.description',
    fields: ['location_description'],
  },
  {
    id: 'lighting',
    title: 'addPlantForm.lightingStep.title',
    description: 'addPlantForm.lightingStep.description',
    fields: ['light_condition'],
  },
  {
    id: 'details',
    title: 'addPlantForm.detailsStep.title',
    description: 'addPlantForm.detailsStep.description',
    fields: ['grow_medium', 'notes'],
  },
  {
    id: 'dates',
    title: 'addPlantForm.datesStep.title',
    description: 'addPlantForm.datesStep.description',
    fields: ['planted_date'],
  },
];

// Animation configurations following React Compiler patterns
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 400,
};

const BUTTON_SCALE_CONFIG = {
  pressed: 0.97,
  released: 1,
  timing: { duration: 100 },
};

interface ErrorClassification {
  shouldShowToUser: boolean;
  userMessage?: string;
  logLevel: 'info' | 'warn' | 'error';
}

function classifyStrainSyncError(error: Error & { code?: string; name?: string }, t: TFunction): ErrorClassification {
  const errorMessage = String(error.message || '').toLowerCase();
  const errorCode = error.code;
  const errorName = String(error.name || '');

  if (
    errorName === 'AbortError' ||
    errorMessage.includes('cancelled') ||
    errorMessage.includes('aborted')
  ) {
    return { shouldShowToUser: false, logLevel: 'info' };
  }
  if (
    errorCode === '23505' ||
    errorMessage.includes('23505') ||
    errorMessage.includes('duplicate')
  ) {
    return { shouldShowToUser: false, logLevel: 'info' };
  }
  if (
    errorCode === 'MISSING_REQUIRED_FIELD' ||
    errorMessage.includes('api_id is required') ||
    errorMessage.includes('name is required')
  ) {
    return {
      shouldShowToUser: true,
      userMessage: t('addPlantForm.errors.strainDataIncomplete'),
      logLevel: 'warn',
    };
  }
  if (
    errorName === 'NetworkError' ||
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection')
  ) {
    return {
      shouldShowToUser: true,
      userMessage: t('addPlantForm.errors.networkError'),
      logLevel: 'warn',
    };
  }
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return {
      shouldShowToUser: true,
      userMessage: t('addPlantForm.errors.requestTimeout'),
      logLevel: 'warn',
    };
  }
  if (
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('forbidden') ||
    errorCode === '401' ||
    errorCode === '403'
  ) {
    return {
      shouldShowToUser: true,
      userMessage: t('addPlantForm.errors.authenticationError'),
      logLevel: 'error',
    };
  }
  return {
    shouldShowToUser: true,
    userMessage: t('addPlantForm.errors.strainSyncFailed', { message: error.message }),
    logLevel: 'error',
  };
}

const safeFormatDate = (date: Date | string | undefined, formatString: string = 'PPP'): string => {
  try {
    if (!date) return format(new Date(), formatString);
    if (date instanceof Date)
      return isValid(date) ? format(date, formatString) : format(new Date(), formatString);
    const parsedDate = new Date(date);
    return isValid(parsedDate)
      ? format(parsedDate, formatString)
      : format(new Date(), formatString);
  } catch (error) {
    logger.warn('[AddPlantForm] Error formatting date', { error });
    return format(new Date(), formatString);
  }
};
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

  // Memoize variant classes for performance
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

  // Haptic feedback handler
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

interface AnimatedSelectionButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  selected: boolean;
  disabled?: boolean;
}

const AnimatedSelectionButton: React.FC<AnimatedSelectionButtonProps> = ({
  onPress,
  children,
  selected,
  disabled = false,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    // Using CSS-compatible colors for cross-platform consistency
    const backgroundColor = interpolateColor(
      selected ? 1 : 0,
      [0, 1],
      ['rgba(0,0,0,0)', '#22c55e'] // transparent to green-500
    );
    const borderColor = interpolateColor(
      selected ? 1 : 0,
      [0, 1],
      ['#d4d4d8', '#22c55e'] // neutral-300 to green-500
    );
    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
      borderColor,
      borderWidth: 2,
    };
  });

  const gesture = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      'worklet';
      scale.value = withTiming(BUTTON_SCALE_CONFIG.pressed, BUTTON_SCALE_CONFIG.timing);
      runOnJS(triggerLightHapticSync)();
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(BUTTON_SCALE_CONFIG.released, SPRING_CONFIG);
      runOnJS(onPress)();
    });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle} className="flex-grow items-center rounded-2xl px-3 py-2">
        {children}
      </Animated.View>
    </GestureDetector>
  );
};

// Step Components
interface StepProps {
  control: Control<PlantFormData>;
  setValue: UseFormSetValue<PlantFormData>;
  errors: FieldErrors<PlantFormData>;
  getValues: UseFormGetValues<PlantFormData>;
}

const PhotoStep: React.FC<
  StepProps & {
    takePhoto: () => Promise<void>;
    pickImage: () => Promise<void>;
  }
> = ({ control, setValue, takePhoto, pickImage }) => {
  const { t } = useTranslation();
  
  return (
    <ThemedView className="space-y-6">
      <Controller
        control={control}
        name="image_url"
        render={({ field: { value } }) => (
          <ThemedView className="items-center space-y-4">
            {value ? (
              <ThemedView className="relative">
                <Image source={{ uri: value }} className="h-48 w-48 rounded-2xl" />
                <AnimatedButton
                  onPress={() => setValue('image_url', null)}
                  variant="destructive"
                  className="absolute -right-2 -top-2 h-8 w-8 rounded-full">
                  <OptimizedIcon name="close" size={16} className="text-white" />
                </AnimatedButton>
              </ThemedView>
            ) : (
              <ThemedView className="h-48 w-48 items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-700">
                <OptimizedIcon
                  name="image-outline"
                  size={48}
                  className="text-neutral-400 dark:text-neutral-500"
                />
                <ThemedText variant="muted" className="mt-2">
                  {t('addPlantForm.labels.noPhotoSelected')}
                </ThemedText>
              </ThemedView>
            )}

            <ThemedView className="flex-row space-x-4">
              <AnimatedButton onPress={takePhoto} variant="primary">
                <OptimizedIcon name="camera" size={20} className="mr-2 text-white" />
                <ThemedText className="font-medium text-white">{t('addPlantForm.buttons.camera')}</ThemedText>
              </AnimatedButton>

              <AnimatedButton onPress={pickImage} variant="secondary">
                <OptimizedIcon
                  name="image-outline"
                  size={20}
                  className="mr-2 text-neutral-900 dark:text-neutral-100"
                />
                <ThemedText className="font-medium text-neutral-900 dark:text-neutral-100">
                  {t('addPlantForm.buttons.gallery')}
                </ThemedText>
              </AnimatedButton>
            </ThemedView>
          </ThemedView>
        )}
      />
    </ThemedView>
  );
};

const BasicInfoStep: React.FC<
  StepProps & {
    handleStrainSelectionAndSync: (strain: RawStrainApiResponse | null) => Promise<void>;
    isSyncingStrain: boolean;
    syncError: string | null;
    inputRefs?: React.RefObject<TextInput | StrainAutocompleteRef | null>[];
    _currentInputIndex?: number;
    onInputFocus?: (index: number) => void;
    goToNextStep?: () => void;
  }
> = ({
  control,
  handleStrainSelectionAndSync,
  isSyncingStrain,
  syncError,
  inputRefs = [],
  _currentInputIndex = 0,
  onInputFocus,
  goToNextStep,
}) => {
  const { t } = useTranslation();
  // Create refs for this step's inputs
  const nameInputRef = useRef<TextInput>(null);
  const strainInputRef = useRef<StrainAutocompleteRef>(null);

  // Read planted date from form and derive ISO string if valid
  const plantedDateFromForm = useWatch({ control, name: 'planted_date' });
  const plantedDateISO =
    plantedDateFromForm instanceof Date && isValid(plantedDateFromForm)
      ? plantedDateFromForm.toISOString()
      : undefined;

  // Register refs with parent component
  React.useEffect(() => {
    if (inputRefs[0] && nameInputRef.current) {
      inputRefs[0].current = nameInputRef.current;
    }
    if (inputRefs[1] && strainInputRef.current) {
      inputRefs[1].current = strainInputRef.current;
    }
  }, [inputRefs]);

  return (
    <ThemedView className="space-y-6">
      {/* Plant Name */}
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <EnhancedTextInput
            ref={nameInputRef}
            label={t('addPlantForm.fields.plantName')}
            value={value || ''}
            onChangeText={onChange}
            onBlur={onBlur}
            onFocus={() => onInputFocus?.(0)}
            placeholder={t('addPlantForm.placeholders.plantName')}
            error={error?.message}
            leftIcon="flower-tulip-outline"
            returnKeyType="next"
            onSubmitEditing={() => {
              // Focus next available input
              if (inputRefs[1]?.current?.focus) {
                inputRefs[1].current.focus();
              }
            }}
          />
        )}
      />

      {/* Strain Selection */}
      <Controller
        control={control}
        name="strain"
        render={({ field: { onChange: _onChange, value }, fieldState: { error } }) => (
          <ThemedView>
            <ThemedText variant="heading" className="mb-2 text-base">
              {t('addPlantForm.fields.strain')}
            </ThemedText>
            <StrainAutocomplete
              ref={strainInputRef}
              onStrainSelect={handleStrainSelectionAndSync}
              initialStrainName={value || ''}
              placeholder={t('addPlantForm.placeholders.strain')}
              onFocus={() => onInputFocus?.(1)}
              showCultivationPreview
              confirmOnSelect
              plantedDateISO={plantedDateISO}
              returnKeyType="next"
              onSubmitEditing={() => {
                // Move to next step since this is the last focusable input
                goToNextStep?.();
              }}
            />
            {isSyncingStrain && (
              <ThemedView className="mt-2 flex-row items-center">
                <ActivityIndicator size="small" className="mr-2" />
                <ThemedText variant="muted">{t('addPlantForm.labels.syncingStrain')}</ThemedText>
              </ThemedView>
            )}
            {syncError && (
              <ThemedText className="text-status-danger mt-1 text-xs">{syncError}</ThemedText>
            )}
            {error && (
              <ThemedText className="text-status-danger mt-1 text-xs">{error.message}</ThemedText>
            )}
          </ThemedView>
        )}
      />

      {/* Cannabis Type */}
      <Controller
        control={control}
        name="cannabis_type"
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <ThemedView>
            <ThemedText variant="heading" className="mb-2 text-base">
              {t('addPlantForm.fields.cannabisType')}
            </ThemedText>
            <ThemedView className="flex-row space-x-2">
              {Object.values(CannabisType).map((type) => (
                <AnimatedSelectionButton
                  key={type}
                  onPress={() => onChange(type)}
                  selected={value === type}>
                  <ThemedText
                    className={
                      value === type
                        ? 'font-medium text-white'
                        : 'text-neutral-900 dark:text-neutral-100'
                    }>
                    {type}
                  </ThemedText>
                </AnimatedSelectionButton>
              ))}
            </ThemedView>
            {error && (
              <ThemedText className="text-status-danger mt-1 text-xs">{error.message}</ThemedText>
            )}
          </ThemedView>
        )}
      />

      {/* Growth Stage */}
      <Controller
        control={control}
        name="growth_stage"
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <ThemedView>
            <ThemedText variant="heading" className="mb-2 text-base">
              {t('addPlantForm.fields.growthStage')}
            </ThemedText>
            <ThemedView className="flex-row flex-wrap gap-2">
              {GROWTH_STAGES_ARRAY.map((stage) => (
                <AnimatedSelectionButton
                  key={stage}
                  onPress={() => onChange(stage)}
                  selected={value === stage}>
                  <ThemedText
                    className={
                      value === stage
                        ? 'font-medium text-white'
                        : 'text-neutral-900 dark:text-neutral-100'
                    }>
                    {stage}
                  </ThemedText>
                </AnimatedSelectionButton>
              ))}
            </ThemedView>
            {error && (
              <ThemedText className="text-status-danger mt-1 text-xs">{error.message}</ThemedText>
            )}
          </ThemedView>
        )}
      />
    </ThemedView>
  );
};

const LocationStep: React.FC<
  StepProps & {
    _inputClasses: string;
    _placeholderTextColor: string;
    inputRefs?: React.RefObject<TextInput | null>[];
    _currentInputIndex?: number;
    onInputFocus?: (index: number) => void;
    onHemisphereChange?: (hemi: HemiOverride) => void;
    onEnvironmentChange?: (env: EnvOverride) => void;
    initialHemisphere?: HemiOverride;
    initialEnvironment?: EnvOverride;
  }
> = ({
  control,
  setValue,
  _inputClasses,
  _placeholderTextColor,
  inputRefs = [],
  _currentInputIndex = 0,
  onInputFocus,
  onHemisphereChange,
  onEnvironmentChange,
  initialHemisphere = 'N',
  initialEnvironment,
}) => {
  const { t } = useTranslation();
  const [customLocation, setCustomLocation] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [selectedHemisphere, setSelectedHemisphere] = useState<HemiOverride>(initialHemisphere);
  const [selectedEnvironment, setSelectedEnvironment] = useState<EnvOverride | undefined>(
    initialEnvironment
  );

  const customLocationRef = useRef<TextInput>(null);

  // Register refs with parent component
  React.useEffect(() => {
    if (inputRefs[0] && customLocationRef.current) {
      inputRefs[0].current = customLocationRef.current;
    }
  }, [inputRefs, showCustomInput]);

  const handleCustomLocationSubmit = () => {
    if (customLocation.trim()) {
      setValue('location_description', customLocation, { shouldValidate: true });
      setShowCustomInput(false);
      triggerLightHaptic();
    }
  };

  const predefinedLocations = [
    t('addPlantForm.predefinedLocations.indoorGrowTent'),
    t('addPlantForm.predefinedLocations.outdoorGarden'),
    t('addPlantForm.predefinedLocations.greenhouse'),
    t('addPlantForm.predefinedLocations.balcony'),
    t('addPlantForm.predefinedLocations.windowsill'),
    t('addPlantForm.predefinedLocations.basement'),
    t('addPlantForm.predefinedLocations.garage'),
    t('addPlantForm.predefinedLocations.closet'),
  ];

  return (
    <ThemedView className="space-y-6">
      <Controller
        control={control}
        name="location_description"
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <ThemedView>
            <ThemedText variant="heading" className="mb-2 text-base">
              {t('addPlantForm.fields.location')}
            </ThemedText>

            {/* Predefined Options */}
            <ThemedView className="mb-4 grid grid-cols-2 gap-2">
              {predefinedLocations.map((location) => (
                <AnimatedSelectionButton
                  key={location}
                  onPress={() => {
                    onChange(location);
                    triggerLightHaptic();
                  }}
                  selected={value === location}>
                  <ThemedText
                    className={
                      value === location
                        ? 'text-center font-medium text-white'
                        : 'text-center text-neutral-900 dark:text-neutral-100'
                    }>
                    {location}
                  </ThemedText>
                </AnimatedSelectionButton>
              ))}
            </ThemedView>

            {/* Custom Location Toggle */}
            <AnimatedButton
              onPress={() => {
                setShowCustomInput(!showCustomInput);
                triggerLightHaptic();
              }}
              variant="tertiary"
              className="mb-4">
              <OptimizedIcon
                name="add"
                size={16}
                className="mr-2 text-neutral-900 dark:text-neutral-100"
              />
              <ThemedText className="text-neutral-900 dark:text-neutral-100">
                {t('addPlantForm.buttons.customLocation')}
              </ThemedText>
            </AnimatedButton>

            {/* Enhanced Custom Location Input */}
            {showCustomInput && (
              <ThemedView className="flex-row space-x-2">
                <EnhancedTextInput
                  ref={customLocationRef}
                  value={customLocation}
                  onChangeText={setCustomLocation}
                  onFocus={() => onInputFocus?.(0)}
                  placeholder={t('addPlantForm.placeholders.customLocation')}
                  leftIcon="location-outline"
                  returnKeyType="done"
                  onSubmitEditing={handleCustomLocationSubmit}
                  className="flex-1"
                />
                <AnimatedButton
                  onPress={handleCustomLocationSubmit}
                  variant="primary"
                  className="h-12 w-12 rounded-lg">
                  <OptimizedIcon name="checkmark" size={16} className="text-white" />
                </AnimatedButton>
              </ThemedView>
            )}

            {/* Hemisphere Override */}
            <ThemedView className="mt-2">
              <ThemedText variant="heading" className="mb-2 text-base">
                {t('addPlantForm.fields.hemisphere', 'Hemisphere')}
              </ThemedText>
              <ThemedView className="flex-row space-x-2">
                {(['N', 'S'] as HemiOverride[]).map((hemi) => (
                  <AnimatedSelectionButton
                    key={hemi}
                    onPress={() => {
                      setSelectedHemisphere(hemi);
                      onHemisphereChange?.(hemi);
                    }}
                    selected={selectedHemisphere === hemi}>
                    <ThemedText
                      className={
                        selectedHemisphere === hemi
                          ? 'font-medium text-white'
                          : 'text-neutral-900 dark:text-neutral-100'
                      }>
                      {hemi}
                    </ThemedText>
                  </AnimatedSelectionButton>
                ))}
              </ThemedView>
            </ThemedView>

            {/* Environment Override (optional) */}
            <ThemedView className="mt-3">
              <ThemedText variant="heading" className="mb-2 text-base">
                {t('addPlantForm.fields.environment', 'Environment (optional)')}
              </ThemedText>
              <ThemedView className="flex-row flex-wrap gap-2">
                {(['indoor', 'outdoor', 'greenhouse'] as EnvOverride[]).map((env) => (
                  <AnimatedSelectionButton
                    key={env}
                    onPress={() => {
                      setSelectedEnvironment(env);
                      onEnvironmentChange?.(env);
                    }}
                    selected={selectedEnvironment === env}>
                    <ThemedText
                      className={
                        selectedEnvironment === env
                          ? 'font-medium text-white'
                          : 'text-neutral-900 dark:text-neutral-100'
                      }>
                      {env}
                    </ThemedText>
                  </AnimatedSelectionButton>
                ))}
              </ThemedView>
            </ThemedView>

            {error && (
              <ThemedText className="text-status-danger mt-1 text-xs">{error.message}</ThemedText>
            )}
          </ThemedView>
        )}
      />
    </ThemedView>
  );
};

const LightingStep: React.FC<StepProps> = ({ control }) => {
  const { t } = useTranslation();
  
  return (
    <ThemedView className="space-y-6">
      <Controller
        control={control}
        name="light_condition"
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <ThemedView>
            <ThemedText variant="heading" className="mb-2 text-base">
              {t('addPlantForm.fields.lightConditions')}
            </ThemedText>
          <ThemedView className="space-y-2">
            {Object.values(LightCondition).map((condition) => (
              <AnimatedSelectionButton
                key={condition}
                onPress={() => onChange(condition)}
                selected={value === condition}>
                <ThemedText
                  className={
                    value === condition
                      ? 'font-medium text-white'
                      : 'text-neutral-900 dark:text-neutral-100'
                  }>
                  {condition}
                </ThemedText>
              </AnimatedSelectionButton>
            ))}
          </ThemedView>
          {error && (
            <ThemedText className="text-status-danger mt-1 text-xs">{error.message}</ThemedText>
          )}
        </ThemedView>
      )}
    />
  </ThemedView>
  );
};

const DetailsStep: React.FC<
  StepProps & {
    inputRefs?: React.RefObject<TextInput | null>[];
    _currentInputIndex?: number;
    onInputFocus?: (index: number) => void;
  }
> = ({ control, inputRefs = [], _currentInputIndex = 0, onInputFocus }) => {
  const { t } = useTranslation();
  const notesInputRef = useRef<TextInput>(null);

  // Register refs with parent component
  React.useEffect(() => {
    if (inputRefs[0] && notesInputRef.current) {
      inputRefs[0].current = notesInputRef.current;
    }
  }, [inputRefs]);

  return (
    <ThemedView className="space-y-6">
      {/* Growing Medium */}
      <Controller
        control={control}
        name="grow_medium"
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <ThemedView>
            <ThemedText variant="heading" className="mb-2 text-base">
              {t('addPlantForm.fields.growingMedium')}
            </ThemedText>
            <ThemedView className="space-y-2">
              {Object.values(GrowMedium).map((medium) => (
                <AnimatedSelectionButton
                  key={medium}
                  onPress={() => {
                    onChange(medium);
                    triggerLightHaptic();
                  }}
                  selected={value === medium}>
                  <ThemedText
                    className={
                      value === medium
                        ? 'font-medium text-white'
                        : 'text-neutral-900 dark:text-neutral-100'
                    }>
                    {medium}
                  </ThemedText>
                </AnimatedSelectionButton>
              ))}
            </ThemedView>
            {error && (
              <ThemedText className="text-status-danger mt-1 text-xs">{error.message}</ThemedText>
            )}
          </ThemedView>
        )}
      />

      {/* Enhanced Notes */}
      <Controller
        control={control}
        name="notes"
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <EnhancedTextInput
            ref={notesInputRef}
            label={t('addPlantForm.fields.notes')}
            value={value || ''}
            onChangeText={onChange}
            onBlur={onBlur}
            onFocus={() => onInputFocus?.(0)}
            placeholder={t('addPlantForm.placeholders.notes')}
            multiline
            error={error?.message}
            leftIcon="document-text-outline"
            showCharacterCount
            maxLength={500}
            returnKeyType="done"
          />
        )}
      />
    </ThemedView>
  );
};

const DatesStep: React.FC<StepProps> = ({ control }) => {
  const { t } = useTranslation();
  const [showDatePicker, setShowDatePicker] = useState(false);

  return (
    <ThemedView className="space-y-6">
      <Controller
        control={control}
        name="planted_date"
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <ThemedView>
            <ThemedText variant="heading" className="mb-2 text-base">
              {t('addPlantForm.fields.plantedDate')}
            </ThemedText>

            <AnimatedButton
              onPress={() => setShowDatePicker(true)}
              variant="secondary"
              className="justify-start">
              <OptimizedIcon
                name="calendar"
                size={20}
                className="mr-3 text-neutral-900 dark:text-neutral-100"
              />
              <ThemedText className="text-neutral-900 dark:text-neutral-100">
                {value ? safeFormatDate(value) : t('addPlantForm.labels.selectPlantedDate')}
              </ThemedText>
            </AnimatedButton>

            {showDatePicker && (
              <DateTimePicker
                value={value || new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) onChange(selectedDate);
                }}
              />
            )}

            {error && (
              <ThemedText className="text-status-danger mt-1 text-xs">{error.message}</ThemedText>
            )}
          </ThemedView>
        )}
      />
    </ThemedView>
  );
};

export function AddPlantForm({ onSuccess }: { onSuccess?: () => void }) {
  const { t } = useTranslation();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const progress = useSharedValue(0);
  const stepTransition = useSharedValue(0);

  // Enhanced keyboard handling
  const inputRefs = useRef<Array<React.RefObject<TextInput | StrainAutocompleteRef | null>>>([]);
  const [fieldNames, setFieldNames] = useState<string[]>([]);

  const {
    isKeyboardVisible: _isKeyboardVisible,
    keyboardHeight: _keyboardHeight,
    currentIndex,
    goToNextInput: _goToNextInput,
    goToPreviousInput: _goToPreviousInput,
    dismissKeyboard: _dismissKeyboard,
    canGoNext: _canGoNext,
    canGoPrevious: _canGoPrevious,
    setActiveInputIndex,
  } = useEnhancedKeyboard(inputRefs.current, fieldNames.length);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
    watch,
    trigger,
  } = useForm<PlantFormData>({
    resolver: zodResolver(getPlantFormSchema(t)),
    mode: 'onChange',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingStrain, setIsSyncingStrain] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const { user } = useAuth();
  const { database } = useDatabase();
  const colorScheme = useColorScheme();

  const progressBarStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      width: `${progress.value}%`,
    };
  });

  const stepAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateX: stepTransition.value }],
      opacity: Math.max(0, 1 - Math.abs(stepTransition.value) / 300),
    };
  });

  const updateProgress = useCallback(() => {
    const newProgress = ((currentStepIndex + 1) / FORM_STEPS.length) * 100;
    runOnUI(() => {
      progress.value = withSpring(newProgress, SPRING_CONFIG);
    })();
  }, [currentStepIndex, progress]);

  // Keep last selected raw strain for prediction enrichment without polluting RHF types
  const lastSelectedRawStrainRef = useRef<RawStrainApiResponse | null>(null);
  const plantTypeOverrideRef = useRef<PlantType | undefined>(undefined);
  const hemisphereOverrideRef = useRef<HemiOverride | undefined>(undefined);
  const environmentOverrideRef = useRef<EnvOverride | undefined>(undefined);
  const [selectedStrainTick, setSelectedStrainTick] = useState(0);
  type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('intermediate');
  // Task 11.2: Partial data mode (manual scheduling as last resort)
  const [manualScheduleEnabled, setManualScheduleEnabled] = useState(false);
  const [manualMinDays, setManualMinDays] = useState<string>('');
  const [manualMaxDays, setManualMaxDays] = useState<string>('');
  const manualDays = React.useMemo(() => {
    const min = parseInt(manualMinDays, 10);
    const max = parseInt(manualMaxDays, 10);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    if (min < 0 || max < 0) return null;
    if (min > max) return null;
    return { min, max };
  }, [manualMinDays, manualMaxDays]);

  const handleStrainSelectionAndSync = async (selectedRawStrain: RawStrainApiResponse | null) => {
    if (!selectedRawStrain) {
      setValue('strain', '', { shouldValidate: true });
      setSyncError(null);
      return;
    }

    setValue('strain', selectedRawStrain.name, { shouldValidate: true });
    // Task 7.1: Auto-fill cannabis type from strain when possible
    try {
      const typeStr = (selectedRawStrain.type || '').toString().toLowerCase();
      const mapped = typeStr.includes('indica')
        ? CannabisType.Indica
        : typeStr.includes('sativa')
        ? CannabisType.Sativa
        : typeStr.includes('hybrid')
        ? CannabisType.Hybrid
        : typeStr.includes('ruderalis')
        ? CannabisType.Ruderalis
        : undefined;
      if (mapped) setValue('cannabis_type', mapped, { shouldValidate: true });
    } catch (e) {
      // Non-fatal: unable to infer cannabis type from strain string
    }
    setIsSyncingStrain(true);
    setSyncError(null);

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 15000);
    const checkAbort = () => {
      if (abortController.signal.aborted) throw new Error('Operation timed out or was cancelled.');
    };

    try {
      if (!user?.id) throw new Error('User not authenticated.');
      if (!database) throw new Error('Database not available.');

      checkAbort();

      const preparedSupabaseData = prepareDataForSupabase(selectedRawStrain);
      const supabaseStrainId = await ensureStrainInSupabase(preparedSupabaseData);

      checkAbort();

      if (!supabaseStrainId) {
        throw new Error('Failed to get a valid strain from Supabase.');
      }

      const { data: supabaseStrain } = await supabase
        .from('strains')
        .select('*')
        .eq('id', supabaseStrainId)
        .single();

      if (!supabaseStrain) {
        throw new Error('Failed to retrieve strain from Supabase after creation.');
      }

      checkAbort();

      const watermelonStrainId = await ensureStrainInLocalDB(supabaseStrain);

      if (!watermelonStrainId) {
        throw new Error('Failed to get a valid strain from WatermelonDB.');
      }

      // Store the strain ID in the form for later use when creating the plant
      setValue('strain_id', watermelonStrainId, { shouldValidate: false });
      // Store raw strain in ref for predictions after create
      lastSelectedRawStrainRef.current = selectedRawStrain;
      setSelectedStrainTick((v) => v + 1);

      // Ask for plant type if unknown; otherwise set override to inferred
      const inferredType = StrainIntegrationService.inferPlantType(selectedRawStrain);
      if (inferredType === 'unknown') {
        // Await the user's choice to improve UX and ensure schedule preview uses the selected type
        const chosenType: PlantType = await new Promise((resolve) => {
          const message = `${t(
            'addPlantForm.confirm.plantTypeMessage',
            'We could not detect the plant type for this strain. Please select one:'
          )}\n\n${t(
            'addPlantForm.confirm.plantTypeHelp',
            'Photoperiod plants flower after you change light schedule (12/12). Autoflowers switch to flowering on their own regardless of light.'
          )}`;
          Alert.alert(
            t('addPlantForm.confirm.plantTypeTitle', 'Select plant type'),
            message,
            [
              {
                text: t('addPlantForm.confirm.photoperiod', 'Photoperiod'),
                style: 'default',
                onPress: () => resolve('photoperiod'),
              },
              {
                text: t('addPlantForm.confirm.autoflower', 'Autoflower'),
                style: 'default',
                onPress: () => resolve('autoflower'),
              },
            ],
            {
              cancelable: true,
              onDismiss: () => resolve('photoperiod'), // sensible default
            }
          );
        });
        plantTypeOverrideRef.current = chosenType;
        // Refresh preview with the selected type
        setSelectedStrainTick((v) => v + 1);
      } else {
        plantTypeOverrideRef.current = inferredType as PlantType;
        if (plantTypeOverrideRef.current === 'photoperiod') {
          // Inform baseline assumption for photoperiod (flip date defaults to planted date)
          Alert.alert(
            t('addPlantForm.confirm.baselineTitle', 'Baseline date'),
            t(
              'addPlantForm.confirm.baselineMessage',
              'For photoperiod strains, the schedule is based on the flip date. We will use the planted date until you adjust it later.'
            )
          );
        }
      }

      logger.info('[AddPlantForm] Strain sync successful', { strainName: selectedRawStrain.name });
    } catch (error) {
      const e = error as Error;
      logger.error('[AddPlantForm] Strain Sync Error', e);
      Sentry.captureException(e);
      const classification = classifyStrainSyncError(e, t);
      if (classification.shouldShowToUser) {
        setSyncError(classification.userMessage || 'An unexpected error occurred.');
      }
    } finally {
      clearTimeout(timeoutId);
      setIsSyncingStrain(false);
    }
  };

  const goToNextStep = async () => {
    const currentStep = FORM_STEPS[currentStepIndex];
    if (!currentStep) return;

    const currentFields = currentStep.fields;
    const result = await trigger(currentFields);

    if (result && currentStepIndex < FORM_STEPS.length - 1) {
      // Animate step transition to next
      stepTransition.value = withTiming(-300, { duration: 200 }, (finished) => {
        'worklet';
        if (finished) {
          stepTransition.value = 300;
        }
      });

      // Add haptic feedback for successful step completion
      triggerLightHaptic();

      // Update step after a brief delay for animation
      setTimeout(() => {
        setCurrentStepIndex((prev) => prev + 1);
        updateProgress();
        stepTransition.value = withSpring(0, SPRING_CONFIG);
      }, 100);
    } else if (!result) {
      // Add haptic feedback for validation error
      triggerErrorHaptic();

      const firstErrorField = currentFields.find((field) => errors[field]);
      if (firstErrorField) {
        Alert.alert(
          t('addPlantForm.alerts.incompleteStep'),
          errors[firstErrorField]?.message || t('addPlantForm.alerts.fillRequiredFields')
        );
      }
    }
  };

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      // Animate step transition to previous
      stepTransition.value = withTiming(300, { duration: 200 }, (finished) => {
        'worklet';
        if (finished) {
          stepTransition.value = -300;
        }
      });

      // Add haptic feedback
      triggerLightHaptic();

      // Update step after a brief delay for animation
      setTimeout(() => {
        setCurrentStepIndex((prev) => prev - 1);
        updateProgress();
        stepTransition.value = withSpring(0, SPRING_CONFIG);
      }, 100);
    }
  };

  React.useEffect(() => {
    updateProgress();
  }, [updateProgress]);

  const pickImage = useCallback(async () => {
    const result = await selectFromGallery();
    if (!result) return;

    setValue('image_url', result.uri, { shouldValidate: true });
  }, [setValue]);

  const takePhotoHandler = useCallback(async () => {
    const result = await takePhoto();
    if (!result) return;

    setValue('image_url', result.uri, { shouldValidate: true });
  }, [setValue]);

  const handleImageUpload = async (userId: string): Promise<string | null> => {
    const imageUri = getValues('image_url');
    if (!imageUri) return null;

    const result = await uploadPlantGalleryImage(userId, imageUri);
    return result.success ? result.publicUrl || null : null;
  };

  const onSubmit: SubmitHandler<PlantFormData> = async (data) => {
    if (!user?.id || !database) {
      Alert.alert(t('common.error'), t('alerts.userNotAuthenticated'));
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (data.image_url) {
        imageUrl = await handleImageUpload(user.id);
      }

      const plantData: PlantFormProps = {
        userId: user.id,
        name: data.name,
        strainId: data.strain_id ?? '',
        strain: data.strain,
        plantedDate: data.planted_date.toISOString(),
        growthStage: data.growth_stage,
        cannabisType: data.cannabis_type ?? undefined,
        growMedium: data.grow_medium ?? undefined,
        lightCondition: data.light_condition ?? undefined,
        locationDescription: data.location_description,
        imageUrl: imageUrl ?? undefined,
        notes: data.notes ?? undefined,
      };

      // Capture created plant instance so we can update directly later
      const createdPlant = await database.write(async () => {
        const plantsCollection = database.get<PlantModel>('plants');
        const created = await plantsCollection.create((plant: PlantModel) => {
          plant.userId = plantData.userId;
          plant.name = plantData.name;
          plant.strainId = plantData.strainId;
          plant.strain = plantData.strain;
          // Fix: Convert Date to ISO string for WatermelonDB
          plant.plantedDate = plantData.plantedDate;
          plant.growthStage = plantData.growthStage;
          // Fix: Use undefined instead of null for optional fields
          plant.cannabisType = plantData.cannabisType || undefined;
          plant.growMedium = plantData.growMedium || undefined;
          plant.lightCondition = plantData.lightCondition || undefined;
          plant.locationDescription = plantData.locationDescription || '';
          plant.imageUrl = plantData.imageUrl ?? undefined;
          plant.notes = plantData.notes || undefined;
          
        });
        return created;
      });

      // After create, enrich with predictions if we still have form state strain raw object
      try {
        const plantedISO = plantData.plantedDate;
        const locationDesc = plantData.locationDescription;
        // Retrieve last selected raw strain from ref if available
        const lastRawStrain = lastSelectedRawStrainRef.current;
        const inferredType = lastRawStrain
          ? StrainIntegrationService.inferPlantType(lastRawStrain)
          : 'unknown';
        let plantTypeOverride: PlantType | undefined = plantTypeOverrideRef.current;
        if (lastRawStrain && inferredType === 'unknown' && !plantTypeOverride) {
          plantTypeOverride = 'photoperiod';
        }
        if (lastRawStrain && database) {
          const predictions = preparePlantPredictions(lastRawStrain, {
            plantedDateISO: plantedISO,
            locationDescription: locationDesc || undefined,
            plantTypeOverride,
            hemisphereOverride: hemisphereOverrideRef.current,
            preferredEnvironment: environmentOverrideRef.current,
          });

          // Update the created plant directly; ensure Date objects for @date fields
          await database.write(async () => {
            await createdPlant.update((p) => {
              p.plantType = predictions.plantType;
              p.environment = predictions.environment;
              p.hemisphere = predictions.hemisphere;
              p.baselineKind = predictions.baseline.kind;
              p.baselineDate = new Date(predictions.baseline.date);
              p.predictedFlowerMinDays = predictions.predictedFlowerMinDays ?? undefined;
              p.predictedFlowerMaxDays = predictions.predictedFlowerMaxDays ?? undefined;
              p.predictedHarvestStart = predictions.predictedHarvestStart
                ? new Date(predictions.predictedHarvestStart)
                : undefined;
              p.predictedHarvestEnd = predictions.predictedHarvestEnd
                ? new Date(predictions.predictedHarvestEnd)
                : undefined;
              p.scheduleConfidence = predictions.scheduleConfidence ?? undefined;
              p.yieldUnit = predictions.yieldUnit ?? undefined;
              p.yieldMin = predictions.yieldMin ?? undefined;
              p.yieldMax = predictions.yieldMax ?? undefined;
              p.yieldCategory = predictions.yieldCategory ?? undefined;
            });
          });
        }
      } catch (e) {
        logger.warn('[AddPlantForm] Prediction enrichment skipped', e);
        Sentry.captureException(e);
      }

      Alert.alert(t('common.success'), t('alerts.plantAddedSuccess'), [
        {
          text: t('common.ok'),
          onPress: () => {
            router.back();
            onSuccess?.();
          },
        },
      ]);
    } catch (error) {
      logger.error('[AddPlantForm] Error adding plant', error);
      Sentry.captureException(error);
  Alert.alert(t('common.error'), t('alerts.plantAddError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Memoize common input classes for performance
  const inputClasses = useMemo(
    () =>
      'border border-neutral-300 dark:border-neutral-600 p-3 rounded-lg text-base bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100',
    []
  );

  const placeholderTextColor = useMemo(
    () => (colorScheme === 'dark' ? '#9ca3af' : '#6b7280'),
    [colorScheme]
  );

  const renderCurrentStep = () => {
    const commonProps = { control, setValue, errors, getValues };

    // Create stable input refs with useMemo to maintain focus history
  const stepInputRefs: PlantFormInputRef[] = useMemo(() => {
    const currentStepId = FORM_STEPS[currentStepIndex]?.id;
    switch (currentStepId) {
      case 'basicInfo':
        return [
          React.createRef<TextInput | StrainAutocompleteRef>(),
          React.createRef<TextInput | StrainAutocompleteRef>()
        ]; // Plant Name + Strain
      case 'location':
      case 'details':
        return [React.createRef<TextInput | StrainAutocompleteRef>()];
      default:
        return [];
    }
  }, [currentStepIndex]);

    // Setup field names and refs based on current step
    React.useEffect(() => {
      const currentStepId = FORM_STEPS[currentStepIndex]?.id;
      let stepFieldNames: string[] = [];

      switch (currentStepId) {
        case 'basicInfo':
          stepFieldNames = [t('addPlantForm.fields.plantName'), t('addPlantForm.fields.strain')];
          break;
        case 'location':
          stepFieldNames = [t('addPlantForm.buttons.customLocation')];
          break;
        case 'details':
          stepFieldNames = [t('addPlantForm.fields.notes')];
          break;
        default:
          stepFieldNames = [];
      }

      setFieldNames(stepFieldNames);
      inputRefs.current = stepInputRefs;
    }, [currentStepIndex, stepInputRefs]);

    // Enhanced props for keyboard navigation
    const enhancedProps = {
      ...commonProps,
      inputRefs: inputRefs.current,
      currentInputIndex: currentIndex,
      onInputFocus: (index: number) => {
        setActiveInputIndex(index);
      },
    };

    switch (FORM_STEPS[currentStepIndex]?.id) {
      case 'photo':
        return <PhotoStep {...commonProps} takePhoto={takePhotoHandler} pickImage={pickImage} />;
      case 'basicInfo':
        return (
          <BasicInfoStep
            {...enhancedProps}
            handleStrainSelectionAndSync={handleStrainSelectionAndSync}
            isSyncingStrain={isSyncingStrain}
            syncError={syncError}
            goToNextStep={goToNextStep}
          />
        );
      case 'location':
        return (
          <LocationStep
            {...enhancedProps}
            inputRefs={inputRefs.current as React.RefObject<TextInput>[]}
            _inputClasses={inputClasses}
            _placeholderTextColor={placeholderTextColor}
            onHemisphereChange={(h) => {
              hemisphereOverrideRef.current = h;
            }}
            onEnvironmentChange={(e) => {
              environmentOverrideRef.current = e;
            }}
            initialHemisphere={hemisphereOverrideRef.current}
            initialEnvironment={environmentOverrideRef.current}
          />
        );
      case 'lighting':
        return <LightingStep {...commonProps} />;
      case 'details':
        return (
          <>
            <DetailsStep
              {...enhancedProps}
              inputRefs={inputRefs.current as React.RefObject<TextInput>[]}
            />
            {/* Task 7.2: Experience level selector (UI-only customization for guidance density) */}
            <ThemedView className="mt-6 space-y-2">
              <ThemedText variant="heading" className="mb-2 text-base">
                {t('addPlantForm.fields.experienceLevel', 'Experience level')}
              </ThemedText>
              <ThemedView className="flex-row space-x-2">
                {(['beginner','intermediate','advanced'] as const).map((lvl) => (
                  <AnimatedSelectionButton
                    key={lvl}
                    onPress={() => setExperienceLevel(lvl)}
                    selected={experienceLevel === lvl}
                  >
                    <ThemedText className={experienceLevel === lvl ? 'font-medium text-white' : 'text-neutral-900 dark:text-neutral-100'}>
                      {t(`addPlantForm.experience.${lvl}`, lvl.charAt(0).toUpperCase() + lvl.slice(1))}
                    </ThemedText>
                  </AnimatedSelectionButton>
                ))}
              </ThemedView>
            </ThemedView>
          </>
        );
      case 'dates':
        return <DatesStep {...commonProps} />;
      default:
        return null;
    }
  };

  const currentStep = FORM_STEPS[currentStepIndex];

  // Task 7.1: Live schedule preview based on selected strain and overrides
  const plantedDateWatch = watch('planted_date');
  const locationDescWatch = watch('location_description');
  const schedulePreview = React.useMemo(() => {
    try {
      const raw = lastSelectedRawStrainRef.current;
      if (!raw) return null;
      const preds = preparePlantPredictions(raw, {
        plantedDateISO: plantedDateWatch
          ? (plantedDateWatch as Date).toISOString()
          : new Date().toISOString(),
        locationDescription: locationDescWatch || undefined,
        plantTypeOverride: plantTypeOverrideRef.current,
        hemisphereOverride: hemisphereOverrideRef.current,
        preferredEnvironment: environmentOverrideRef.current,
      });
      return preds;
    } catch (error) {
      logger.warn('[AddPlantForm] Failed to generate schedule preview', error);
      return null;
    }
  }, [selectedStrainTick, plantedDateWatch, locationDescWatch]);

  return (
    <>
      <ThemedView className="border-b border-neutral-200 bg-white px-4 py-6 dark:border-neutral-700 dark:bg-neutral-800">
        <ThemedView className="mb-4 flex-row items-center justify-between">
          <AnimatedButton onPress={() => router.back()} variant="tertiary" className="h-10 w-10">
            <OptimizedIcon
              name="close"
              size={20}
              className="text-neutral-900 dark:text-neutral-100"
            />
          </AnimatedButton>

          <ThemedText variant="heading" className="text-lg">
            {t('addPlantForm.header')}
          </ThemedText>

          <ThemedView className="w-10" />
        </ThemedView>

        {/* Progress Bar */}
        <ThemedView className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
          <Animated.View
            style={progressBarStyle}
            className="h-full rounded-full bg-primary-500 dark:bg-primary-400"
          />
        </ThemedView>

        <ThemedView className="mt-2 flex-row justify-between">
          <ThemedText variant="muted" className="text-xs">
            {t('addPlantForm.progress.step', { current: currentStepIndex + 1, total: FORM_STEPS.length })}
          </ThemedText>
          <ThemedText variant="muted" className="text-xs">
            {t('addPlantForm.progress.percent', { percent: Math.round(((currentStepIndex + 1) / FORM_STEPS.length) * 100) })}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      {/* Step Content */}
      <EnhancedKeyboardWrapper className="flex-1">
        <ScrollView
          className="px-4 py-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Animated.View style={stepAnimatedStyle}>
            <ThemedView className="mb-6">
              <ThemedText variant="heading" className="mb-2 text-xl">
                {t(currentStep?.title || '')}
              </ThemedText>
              {currentStep?.description && (
                <ThemedText variant="muted">{t(currentStep.description)}</ThemedText>
              )}
            </ThemedView>

            {renderCurrentStep()}

            {(FORM_STEPS[currentStepIndex]?.id === 'basicInfo' || FORM_STEPS[currentStepIndex]?.id === 'location') && schedulePreview && (
              <ThemedView className="mt-6 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
                <ThemedText className="mb-2 text-base font-medium">
                  {t('addPlantForm.preview.title', 'Schedule preview')}
                </ThemedText>
                {typeof schedulePreview.scheduleConfidence === 'number' && schedulePreview.scheduleConfidence < 0.5 && (
                  <ThemedView className="mb-3 rounded-lg bg-amber-100 p-3 dark:bg-amber-900/30">
                    <ThemedText className="text-xs text-amber-900 dark:text-amber-200">
                      {t('addPlantForm.preview.lowConfidence', 'Using a generic schedule due to limited strain data. You can enter dates manually later.')}
                    </ThemedText>
                  </ThemedView>
                )}
                <ThemedView className="mb-2 flex-row flex-wrap">
                  {schedulePreview.predictedFlowerMinDays !== null && schedulePreview.predictedFlowerMaxDays !== null && (
                    <ThemedView className="mr-2 mb-2 rounded-full bg-neutral-200 px-3 py-1 dark:bg-neutral-700">
                      <ThemedText className="text-xs text-neutral-900 dark:text-neutral-100">
                        {t('addPlantForm.preview.flowering', { defaultValue: 'Flowering: {{min}}-{{max}}d', min: schedulePreview.predictedFlowerMinDays, max: schedulePreview.predictedFlowerMaxDays })}
                      </ThemedText>
                    </ThemedView>
                  )}
                  {schedulePreview.predictedHarvestStart && schedulePreview.predictedHarvestEnd && (
                    <ThemedView className="mr-2 mb-2 rounded-full bg-neutral-200 px-3 py-1 dark:bg-neutral-700">
                      <ThemedText className="text-xs text-neutral-900 dark:text-neutral-100">
                        {t('addPlantForm.preview.harvest', { defaultValue: 'Harvest: ~{{start}} → {{end}}', start: new Date(schedulePreview.predictedHarvestStart).toLocaleDateString(), end: new Date(schedulePreview.predictedHarvestEnd).toLocaleDateString() })}
                      </ThemedText>
                    </ThemedView>
                  )}
                  {schedulePreview.yieldMin !== null && schedulePreview.yieldMax !== null && schedulePreview.yieldUnit && (
                    <ThemedView className="mr-2 mb-2 rounded-full bg-neutral-200 px-3 py-1 dark:bg-neutral-700">
                      <ThemedText className="text-xs text-neutral-900 dark:text-neutral-100">
                        {schedulePreview.yieldUnit === 'g_per_m2'
                          ? t('addPlantForm.preview.yieldM2', { defaultValue: 'Yield: {{min}}-{{max}} g/m²', min: schedulePreview.yieldMin, max: schedulePreview.yieldMax })
                          : t('addPlantForm.preview.yieldPlant', { defaultValue: 'Yield: {{min}}-{{max}} g/plant', min: schedulePreview.yieldMin, max: schedulePreview.yieldMax })}
                      </ThemedText>
                    </ThemedView>
                  )}
                </ThemedView>
                {typeof schedulePreview.scheduleConfidence === 'number' && (
                  <ThemedText variant="muted" className="text-xs">
                    {t('addPlantForm.preview.confidence', { defaultValue: 'Confidence: {{c}}', c: Math.round(schedulePreview.scheduleConfidence * 100) + '%' })}
                  </ThemedText>
                )}

                {/* Manual schedule fallback controls (Task 11.2) */}
                <ThemedView className="mt-4">
                  <AnimatedButton
                    onPress={() => setManualScheduleEnabled((v) => !v)}
                    variant="tertiary"
                    className="mb-3">
                    <OptimizedIcon name="settings" size={16} className="mr-2 text-neutral-900 dark:text-neutral-100" />
                    <ThemedText className="text-neutral-900 dark:text-neutral-100">
                      {manualScheduleEnabled
                        ? t('addPlantForm.manualSchedule.hide', 'Hide manual schedule')
                        : t('addPlantForm.manualSchedule.show', 'Enter schedule manually (fallback)')}
                    </ThemedText>
                  </AnimatedButton>

                  {manualScheduleEnabled && (
                    <ThemedView>
                      <ThemedText variant="muted" className="mb-2 text-xs">
                        {t('addPlantForm.manualSchedule.help', 'If parsing fails, set flowering duration manually. We will compute an approximate harvest window from your planted date.')}
                      </ThemedText>
                      <ThemedView className="flex-row gap-3">
                        <EnhancedTextInput
                          value={manualMinDays}
                          onChangeText={setManualMinDays}
                          placeholder={t('addPlantForm.manualSchedule.minDays', 'Min days')}
                          keyboardType="numeric"
                          className="flex-1"
                          leftIcon="timer-outline"
                        />
                        <EnhancedTextInput
                          value={manualMaxDays}
                          onChangeText={setManualMaxDays}
                          placeholder={t('addPlantForm.manualSchedule.maxDays', 'Max days')}
                          keyboardType="numeric"
                          className="flex-1"
                          leftIcon="timer-outline"
                        />
                      </ThemedView>
                      {!manualDays && (manualMinDays.length > 0 || manualMaxDays.length > 0) && (
                        <ThemedText className="mt-1 text-xs text-status-danger">
                          {t('addPlantForm.manualSchedule.validation', 'Enter valid non-negative numbers where min ≤ max.')}
                        </ThemedText>
                      )}
                    </ThemedView>
                  )}
                </ThemedView>
              </ThemedView>
            )}
          </Animated.View>
        </ScrollView>
      </EnhancedKeyboardWrapper>

      {/* Footer Navigation */}
      <ThemedView className="border-t border-neutral-200 bg-white px-4 py-4 dark:border-neutral-700 dark:bg-neutral-800">
        <ThemedView className="flex-row space-x-3">
          {currentStepIndex > 0 && (
            <AnimatedButton onPress={goToPreviousStep} variant="secondary" className="flex-1">
              <OptimizedIcon
                name="chevron-back"
                size={16}
                className="mr-2 text-neutral-900 dark:text-neutral-100"
              />
              <ThemedText className="font-medium text-neutral-900 dark:text-neutral-100">
                {t('addPlantForm.footer.back')}
              </ThemedText>
            </AnimatedButton>
          )}

          {currentStepIndex < FORM_STEPS.length - 1 ? (
            <AnimatedButton onPress={goToNextStep} variant="primary" className="flex-1">
              <ThemedText className="mr-2 font-medium text-white">{t('addPlantForm.footer.next')}</ThemedText>
              <OptimizedIcon name="chevron-forward" size={16} className="text-white" />
            </AnimatedButton>
          ) : (
            <AnimatedButton
              onPress={handleSubmit(onSubmit)}
              variant="primary"
              className="flex-1"
              disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <OptimizedIcon name="checkmark" size={16} className="mr-2 text-white" />
                  <ThemedText className="font-medium text-white">{t('addPlantForm.footer.addPlant')}</ThemedText>
                </>
              )}
            </AnimatedButton>
          )}
        </ThemedView>
      </ThemedView>
    </>
  );
}

export default AddPlantForm;
