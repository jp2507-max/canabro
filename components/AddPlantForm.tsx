'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isValid } from 'date-fns';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState, useCallback, useMemo, useRef } from 'react';
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

import { StrainAutocomplete, StrainAutocompleteRef } from './StrainAutocomplete';
import { OptimizedIcon } from './ui/OptimizedIcon';
import { EnhancedTextInput } from './ui/EnhancedTextInput';
import { KeyboardToolbar } from 'react-native-keyboard-controller';
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
} from '../lib/services/strain-sync.service';
import supabase from '../lib/supabase';
import { GrowthStage, LightCondition, GrowMedium, CannabisType } from '../lib/types/plant';
import { RawStrainApiResponse } from '../lib/types/weed-db';

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

const plantFormSchema = z.object({
  name: z.string().min(1, 'Plant name is required.'),
  strain: z.string().min(1, 'Strain is required.'),
  strain_id: z.string().optional(),
  planted_date: z.date({ required_error: 'Planted date is required.' }),
  growth_stage: z.nativeEnum(GrowthStage, { required_error: 'Growth stage is required.' }),
  cannabis_type: z.nativeEnum(CannabisType).optional(),
  grow_medium: z.nativeEnum(GrowMedium).optional(),
  light_condition: z.nativeEnum(LightCondition).optional(),
  location_description: z.string().min(1, 'Location description is required.'),
  image_url: z.string().url('Invalid image URL format.').optional().nullable(),
  notes: z.string().optional(),
});

type PlantFormData = z.infer<typeof plantFormSchema>;

interface FormStep {
  id: string;
  title: string;
  description?: string;
  fields: (keyof PlantFormData)[];
}

const FORM_STEPS: FormStep[] = [
  {
    id: 'photo',
    title: 'Add Photo',
    description: 'Add a photo of your plant',
    fields: ['image_url'],
  },
  {
    id: 'basicInfo',
    title: 'Basic Info',
    description: 'Name, strain, type, and stage',
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
    description: 'Medium and additional notes',
    fields: ['grow_medium', 'notes'],
  },
  {
    id: 'dates',
    title: 'Important Dates',
    description: 'Key dates for your plant',
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

function classifyStrainSyncError(error: Error): ErrorClassification {
  const errorMessage = String(error.message || '').toLowerCase();
  const errorCode = (error as any).code;
  const errorName = String((error as any).name || '');

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
      userMessage: 'Strain data is incomplete. Please try selecting a different strain.',
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
      userMessage:
        'Network error while syncing strain. Please check your connection and try again.',
      logLevel: 'warn',
    };
  }
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return {
      shouldShowToUser: true,
      userMessage: 'Request timed out. Please try again.',
      logLevel: 'warn',
    };
  }
  if (errorCode && errorCode.startsWith('23')) {
    return {
      shouldShowToUser: true,
      userMessage: 'Database constraint error. Please try selecting a different strain.',
      logLevel: 'error',
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
      userMessage: 'Authentication error. Please log in again and try.',
      logLevel: 'error',
    };
  }
  return {
    shouldShowToUser: true,
    userMessage: `Failed to sync strain: ${error.message}`,
    logLevel: 'error',
  };
}

const safeFormatDate = (date: any, formatString: string = 'PPP'): string => {
  try {
    if (!date) return format(new Date(), formatString);
    if (date instanceof Date)
      return isValid(date) ? format(date, formatString) : format(new Date(), formatString);
    const parsedDate = new Date(date);
    return isValid(parsedDate)
      ? format(parsedDate, formatString)
      : format(new Date(), formatString);
  } catch (error) {
    console.warn('[AddPlantForm] Error formatting date:', error);
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
  control: any;
  setValue: any;
  errors: any;
  getValues: any;
}

const PhotoStep: React.FC<
  StepProps & {
    takePhoto: () => Promise<void>;
    pickImage: () => Promise<void>;
  }
> = ({ control, setValue, takePhoto, pickImage }) => (
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
                No photo selected
              </ThemedText>
            </ThemedView>
          )}

          <ThemedView className="flex-row space-x-4">
            <AnimatedButton onPress={takePhoto} variant="primary">
              <OptimizedIcon name="camera" size={20} className="mr-2 text-white" />
              <ThemedText className="font-medium text-white">Camera</ThemedText>
            </AnimatedButton>

            <AnimatedButton onPress={pickImage} variant="secondary">
              <OptimizedIcon
                name="image-outline"
                size={20}
                className="mr-2 text-neutral-900 dark:text-neutral-100"
              />
              <ThemedText className="font-medium text-neutral-900 dark:text-neutral-100">
                Gallery
              </ThemedText>
            </AnimatedButton>
          </ThemedView>
        </ThemedView>
      )}
    />
  </ThemedView>
);

const BasicInfoStep: React.FC<
  StepProps & {
    handleStrainSelectionAndSync: (strain: any) => Promise<void>;
    isSyncingStrain: boolean;
    syncError: string | null;
    inputRefs?: any[];
    currentInputIndex?: number;
    onInputFocus?: (index: number) => void;
    goToNextStep?: () => void;
  }
> = ({
  control,
  handleStrainSelectionAndSync,
  isSyncingStrain,
  syncError,
  inputRefs = [],
  currentInputIndex = 0,
  onInputFocus,
  goToNextStep,
}) => {
  // Create refs for this step's inputs
  const nameInputRef = useRef<TextInput>(null);
  const strainInputRef = useRef<StrainAutocompleteRef>(null);

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
            label="Plant Name"
            value={value || ''}
            onChangeText={onChange}
            onBlur={onBlur}
            onFocus={() => onInputFocus?.(0)}
            placeholder="My awesome plant"
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
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <ThemedView>
            <ThemedText variant="heading" className="mb-2 text-base">
              Strain
            </ThemedText>
            <StrainAutocomplete
              ref={strainInputRef}
              onStrainSelect={handleStrainSelectionAndSync}
              initialStrainName={value || ''}
              placeholder="Search for a strain (e.g., OG Kush)"
              onFocus={() => onInputFocus?.(1)}
              returnKeyType="next"
              onSubmitEditing={() => {
                // Move to next step since this is the last focusable input
                goToNextStep?.();
              }}
            />
            {isSyncingStrain && (
              <ThemedView className="mt-2 flex-row items-center">
                <ActivityIndicator size="small" className="mr-2" />
                <ThemedText variant="muted">Syncing strain data...</ThemedText>
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
              Cannabis Type
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
              Growth Stage
            </ThemedText>
            <ThemedView className="flex-row flex-wrap gap-2">
              {Object.values(GrowthStage).map((stage) => (
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
    inputClasses: string;
    placeholderTextColor: string;
    inputRefs?: any[];
    currentInputIndex?: number;
    onInputFocus?: (index: number) => void;
  }
> = ({
  control,
  setValue,
  inputClasses,
  placeholderTextColor,
  inputRefs = [],
  currentInputIndex = 0,
  onInputFocus,
}) => {
  const [customLocation, setCustomLocation] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

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
    'Indoor Grow Tent',
    'Outdoor Garden',
    'Greenhouse',
    'Balcony',
    'Windowsill',
    'Basement',
    'Garage',
    'Closet',
  ];

  return (
    <ThemedView className="space-y-6">
      <Controller
        control={control}
        name="location_description"
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <ThemedView>
            <ThemedText variant="heading" className="mb-2 text-base">
              Location
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
                Custom Location
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
                  placeholder="Enter custom location"
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

            {error && (
              <ThemedText className="text-status-danger mt-1 text-xs">{error.message}</ThemedText>
            )}
          </ThemedView>
        )}
      />
    </ThemedView>
  );
};

const LightingStep: React.FC<StepProps> = ({ control }) => (
  <ThemedView className="space-y-6">
    <Controller
      control={control}
      name="light_condition"
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <ThemedView>
          <ThemedText variant="heading" className="mb-2 text-base">
            Light Conditions
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

const DetailsStep: React.FC<
  StepProps & {
    inputRefs?: any[];
    currentInputIndex?: number;
    onInputFocus?: (index: number) => void;
  }
> = ({ control, inputRefs = [], currentInputIndex = 0, onInputFocus }) => {
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
              Growing Medium
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
            label="Notes (Optional)"
            value={value || ''}
            onChangeText={onChange}
            onBlur={onBlur}
            onFocus={() => onInputFocus?.(0)}
            placeholder="Add any additional notes about your plant..."
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
  const [showDatePicker, setShowDatePicker] = useState(false);

  return (
    <ThemedView className="space-y-6">
      <Controller
        control={control}
        name="planted_date"
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <ThemedView>
            <ThemedText variant="heading" className="mb-2 text-base">
              Planted Date
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
                {value ? safeFormatDate(value) : 'Select planted date'}
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
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const progress = useSharedValue(0);
  const stepTransition = useSharedValue(0);

  // Enhanced keyboard handling
  const inputRefs = useRef<any[]>([]);
  const [fieldNames, setFieldNames] = useState<string[]>([]);

  const {
    isKeyboardVisible,
    keyboardHeight,
    currentIndex,
    goToNextInput,
    goToPreviousInput,
    dismissKeyboard,
    canGoNext,
    canGoPrevious,
    setActiveInputIndex,
  } = useEnhancedKeyboard(inputRefs.current, fieldNames.length);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
    trigger,
  } = useForm<PlantFormData>({
    resolver: zodResolver(plantFormSchema),
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

  const handleStrainSelectionAndSync = async (selectedRawStrain: RawStrainApiResponse | null) => {
    if (!selectedRawStrain) {
      setValue('strain', '', { shouldValidate: true });
      setSyncError(null);
      return;
    }

    setValue('strain', selectedRawStrain.name, { shouldValidate: true });
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

      console.log('Strain sync successful for:', selectedRawStrain.name);
    } catch (error) {
      const e = error as Error;
      console.error('[AddPlantForm] Strain Sync Error:', e);
      const classification = classifyStrainSyncError(e);
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
          'Incomplete Step',
          errors[firstErrorField]?.message || 'Please fill out all required fields.'
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

  const processImage = async (uri: string): Promise<string | null> => {
    try {
      const manipulatedImage = await manipulateAsync(
        uri,
        [{ resize: { width: 800, height: 800 } }],
        { compress: 0.8, format: SaveFormat.JPEG, base64: false }
      );
      return manipulatedImage.uri;
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('Image Error', 'Could not process the selected image.');
      return null;
    }
  };

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return;

    const firstAsset = result.assets[0];
    if (!firstAsset) return;

    const processedUri = await processImage(firstAsset.uri);
    if (processedUri) setValue('image_url', processedUri, { shouldValidate: true });
  }, [setValue]);

  const takePhoto = useCallback(async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return;

    const firstAsset = result.assets[0];
    if (!firstAsset) return;

    const processedUri = await processImage(firstAsset.uri);
    if (processedUri) setValue('image_url', processedUri, { shouldValidate: true });
  }, [setValue]);

  const uploadImage = async (userId: string): Promise<string | null> => {
    const imageUri = getValues('image_url');
    if (!imageUri) return null;

    try {
      // Image was already processed during selection (pickImage/takePhoto) - use as-is
      // Check file size before upload to prevent OOM issues
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (fileInfo.exists && fileInfo.size && fileInfo.size > 10 * 1024 * 1024) {
        // 10MB limit
        Alert.alert('File Too Large', 'Please select an image smaller than 10MB.');
        return null;
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

      const fileName = `${userId}/plant-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/plant-images/${fileName}`;

      const uploadResult = await FileSystem.uploadAsync(uploadUrl, imageUri, {
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

      const {
        data: { publicUrl },
      } = supabase.storage.from('plant-images').getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Error', 'Could not upload image. Please try again.');
      return null;
    }
  };

  const onSubmit: SubmitHandler<PlantFormData> = async (data) => {
    if (!user?.id || !database) {
      Alert.alert('Error', 'User not authenticated or database not available.');
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (data.image_url) {
        imageUrl = await uploadImage(user.id);
      }

      const plantData: PlantFormProps = {
        userId: user.id,
        name: data.name,
        strainId: data.strain_id ?? '',
        strain: data.strain,
        plantedDate: data.planted_date.toISOString(),
        growthStage: data.growth_stage,
        cannabisType: data.cannabis_type,
        growMedium: data.grow_medium,
        lightCondition: data.light_condition,
        locationDescription: data.location_description,
        imageUrl: imageUrl ?? undefined,
        notes: data.notes,
      };

      await database.write(async () => {
        const plantsCollection = database.get<PlantModel>('plants');
        await plantsCollection.create((plant: PlantModel) => {
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
      });

      Alert.alert('Success', 'Plant added successfully!', [
        {
          text: 'OK',
          onPress: () => {
            router.back();
            onSuccess?.();
          },
        },
      ]);
    } catch (error) {
      console.error('Error adding plant:', error);
      Alert.alert('Error', 'Could not add plant. Please try again.');
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
    const stepInputRefs = useMemo(() => {
      const currentStepId = FORM_STEPS[currentStepIndex]?.id;

      switch (currentStepId) {
        case 'basicInfo':
          return [React.createRef(), React.createRef()]; // Plant Name + Strain
        case 'location':
        case 'details':
          return [React.createRef()];
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
          stepFieldNames = ['Plant Name', 'Strain'];
          break;
        case 'location':
          stepFieldNames = ['Custom Location'];
          break;
        case 'details':
          stepFieldNames = ['Notes'];
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
        return <PhotoStep {...commonProps} takePhoto={takePhoto} pickImage={pickImage} />;
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
            inputClasses={inputClasses}
            placeholderTextColor={placeholderTextColor}
          />
        );
      case 'lighting':
        return <LightingStep {...commonProps} />;
      case 'details':
        return <DetailsStep {...enhancedProps} />;
      case 'dates':
        return <DatesStep {...commonProps} />;
      default:
        return null;
    }
  };

  const currentStep = FORM_STEPS[currentStepIndex];

  return (
    <ThemedView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      {/* Header */}
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
            Add Plant
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
            Step {currentStepIndex + 1} of {FORM_STEPS.length}
          </ThemedText>
          <ThemedText variant="muted" className="text-xs">
            {Math.round(((currentStepIndex + 1) / FORM_STEPS.length) * 100)}%
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
                {currentStep?.title}
              </ThemedText>
              {currentStep?.description && (
                <ThemedText variant="muted">{currentStep.description}</ThemedText>
              )}
            </ThemedView>

            {renderCurrentStep()}
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
                Back
              </ThemedText>
            </AnimatedButton>
          )}

          {currentStepIndex < FORM_STEPS.length - 1 ? (
            <AnimatedButton onPress={goToNextStep} variant="primary" className="flex-1">
              <ThemedText className="mr-2 font-medium text-white">Next</ThemedText>
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
                  <ThemedText className="font-medium text-white">Add Plant</ThemedText>
                </>
              )}
            </AnimatedButton>
          )}
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}
