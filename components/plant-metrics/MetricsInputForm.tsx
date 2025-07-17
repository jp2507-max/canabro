/**
 * MetricsInputForm - Multi-step form for comprehensive plant metrics tracking
 * 
 * Features:
 * - Basic health metrics (health %, watering, nutrients)
 * - Growth measurements with unit toggles (height, nodes, diameter)
 * - Environmental metrics (pH, EC/PPM, temp, humidity)
 * - Auto VPD calculation
 * - Form validation with Zod schemas
 */

import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextInput, ScrollView, Alert, Pressable } from 'react-native';
import { z } from 'zod';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming as _withTiming,
} from 'react-native-reanimated';

import { EnhancedTextInput } from '@/components/ui/EnhancedTextInput';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import EnhancedKeyboardWrapper from '@/components/keyboard/EnhancedKeyboardWrapper';
import { PlantMetrics } from '@/lib/models/PlantMetrics';
import { TrichomeSelector, TrichomeStatus } from './TrichomeSelector';
import { 
  triggerLightHaptic, 
  triggerMediumHaptic, 
  triggerSelectionHaptic 
} from '@/lib/utils/haptics';

// Form validation schema
const getMetricsFormSchema = (t: (key: string) => string) => z.object({
  // Basic Health Metrics
  healthPercentage: z.number()
    .min(0, t('metricsForm.validation.healthPercentageMin'))
    .max(100, t('metricsForm.validation.healthPercentageMax'))
    .optional(),
  nextWateringDays: z.number()
    .int(t('metricsForm.validation.nextWateringDaysInt'))
    .min(0, t('metricsForm.validation.nextWateringDaysMin'))
    .optional(),
  nextNutrientDays: z.number()
    .int(t('metricsForm.validation.nextNutrientDaysInt'))
    .min(0, t('metricsForm.validation.nextNutrientDaysMin'))
    .optional(),
  
  // Growth Measurements
  height: z.number()
    .min(0, t('metricsForm.validation.heightMin'))
    .optional(),
  heightUnit: z.enum(['cm', 'inches']).optional(),
  nodeCount: z.number()
    .int(t('metricsForm.validation.nodeCountInt'))
    .min(0, t('metricsForm.validation.nodeCountMin'))
    .optional(),
  stemDiameter: z.number()
    .min(0, t('metricsForm.validation.stemDiameterMin'))
    .optional(),
  
  // Environmental Metrics
  phLevel: z.number()
    .min(0, t('metricsForm.validation.phLevelMin'))
    .max(14, t('metricsForm.validation.phLevelMax'))
    .optional(),
  ecPpm: z.number()
    .min(0, t('metricsForm.validation.ecPpmMin'))
    .optional(),
  temperature: z.number()
    .optional(),
  temperatureUnit: z.enum(['celsius', 'fahrenheit']).optional(),
  humidity: z.number()
    .min(0, t('metricsForm.validation.humidityMin'))
    .max(100, t('metricsForm.validation.humidityMax'))
    .optional(),
  
  // Flowering Metrics
  trichomeStatus: z.enum(['clear', 'cloudy', 'amber', 'mixed']).optional(),
  pistilBrownPercentage: z.number()
    .min(0, t('metricsForm.validation.pistilBrownPercentageMin'))
    .max(100, t('metricsForm.validation.pistilBrownPercentageMax'))
    .optional(),
  budDensity: z.number()
    .int(t('metricsForm.validation.budDensityInt'))
    .min(1, t('metricsForm.validation.budDensityMin'))
    .max(10, t('metricsForm.validation.budDensityMax'))
    .optional(),
  
  notes: z.string().optional(),
});

type MetricsFormData = z.infer<ReturnType<typeof getMetricsFormSchema>>;

interface FormStep {
  id: string;
  title: string;
  description?: string;
  fields: (keyof MetricsFormData)[];
}

const FORM_STEPS: FormStep[] = [
  {
    id: 'health',
    title: 'metricsForm.healthStep.title',
    description: 'metricsForm.healthStep.description',
    fields: ['healthPercentage', 'nextWateringDays', 'nextNutrientDays'],
  },
  {
    id: 'growth',
    title: 'metricsForm.growthStep.title',
    description: 'metricsForm.growthStep.description',
    fields: ['height', 'heightUnit', 'nodeCount', 'stemDiameter'],
  },
  {
    id: 'environment',
    title: 'metricsForm.environmentStep.title',
    description: 'metricsForm.environmentStep.description',
    fields: ['phLevel', 'ecPpm', 'temperature', 'temperatureUnit', 'humidity'],
  },
  {
    id: 'flowering',
    title: 'metricsForm.floweringStep.title',
    description: 'metricsForm.floweringStep.description',
    fields: ['trichomeStatus', 'pistilBrownPercentage', 'budDensity'],
  },
];

interface MetricsInputFormProps {
  plantId: string;
  initialData?: Partial<MetricsFormData>;
  onSubmit: (data: MetricsFormData) => Promise<void>;
  onCancel: () => void;
}

export const MetricsInputForm: React.FC<MetricsInputFormProps> = ({
  plantId: _plantId,
  initialData,
  onSubmit,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form setup
  const {
    control,
    handleSubmit,
    formState: { errors, isValid: _isValid },
    watch,
    setValue: _setValue,
    getValues: _getValues,
  } = useForm<MetricsFormData>({
    resolver: zodResolver(getMetricsFormSchema(t)),
    defaultValues: {
      heightUnit: 'cm',
      temperatureUnit: 'celsius',
      ...initialData,
    },
    mode: 'onChange',
  });

  // Watch values for VPD calculation
  const temperature = watch('temperature');
  const humidity = watch('humidity');
  const temperatureUnit = watch('temperatureUnit');

  // Calculate VPD when temperature and humidity change
  const calculatedVPD = React.useMemo(() => {
    if (temperature && humidity) {
      return PlantMetrics.calculateVPD(temperature, humidity, temperatureUnit);
    }
    return null;
  }, [temperature, humidity, temperatureUnit]);

  // Animation values
  const stepProgress = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  // Animated styles
  const progressBarStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      width: `${((currentStep + 1) / FORM_STEPS.length) * 100}%`,
    };
  });

  const buttonStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  // Input refs for keyboard navigation
  const inputRefs = useRef<Record<string, React.RefObject<TextInput | null>>>({});

  // Get or create input ref
  const getInputRef = useCallback((fieldName: string) => {
    if (!inputRefs.current[fieldName]) {
      inputRefs.current[fieldName] = React.createRef<TextInput | null>();
    }
    return inputRefs.current[fieldName];
  }, []);

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (currentStep < FORM_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      stepProgress.value = withSpring(currentStep + 1);
      triggerLightHaptic();
    }
  }, [currentStep, stepProgress]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      stepProgress.value = withSpring(currentStep - 1);
      triggerLightHaptic();
    }
  }, [currentStep, stepProgress]);

  // Form submission
  const onFormSubmit: SubmitHandler<MetricsFormData> = async (data) => {
    try {
      setIsSubmitting(true);
      triggerMediumHaptic();
      
      // Add calculated VPD to the data
      const finalData = {
        ...data,
        vpd: calculatedVPD,
      };
      
      await onSubmit(finalData);
      triggerSelectionHaptic();
    } catch (error) {
      console.error('Error submitting metrics:', error);
      Alert.alert(
        t('metricsForm.errors.submitTitle'),
        t('metricsForm.errors.submitMessage')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Button press animations
  const handleButtonPressIn = useCallback(() => {
    buttonScale.value = withSpring(0.97);
  }, [buttonScale]);

  const handleButtonPressOut = useCallback(() => {
    buttonScale.value = withSpring(1);
  }, [buttonScale]);

  // Render current step content
  const renderStepContent = () => {
    const step = FORM_STEPS[currentStep];
    
    if (!step) return null;
    
    switch (step.id) {
      case 'health':
        return renderHealthStep();
      case 'growth':
        return renderGrowthStep();
      case 'environment':
        return renderEnvironmentStep();
      case 'flowering':
        return renderFloweringStep();
      default:
        return null;
    }
  };

  const renderHealthStep = () => (
    <ThemedView className="space-y-4">
      <Controller
        control={control}
        name="healthPercentage"
        render={({ field: { onChange, value } }) => (
          <EnhancedTextInput
            ref={getInputRef('healthPercentage')}
            label={t('metricsForm.fields.healthPercentage')}
            placeholder="0-100"
            value={value?.toString() || ''}
            onChangeText={(text) => onChange(text ? parseFloat(text) : undefined)}
            keyboardType="numeric"
            error={errors.healthPercentage?.message}
            leftIcon="heart"
            maxLength={3}
          />
        )}
      />

      <Controller
        control={control}
        name="nextWateringDays"
        render={({ field: { onChange, value } }) => (
          <EnhancedTextInput
            ref={getInputRef('nextWateringDays')}
            label={t('metricsForm.fields.nextWateringDays')}
            placeholder="0"
            value={value?.toString() || ''}
            onChangeText={(text) => onChange(text ? parseInt(text) : undefined)}
            keyboardType="numeric"
            error={errors.nextWateringDays?.message}
            leftIcon="droplet"
            maxLength={2}
          />
        )}
      />

      <Controller
        control={control}
        name="nextNutrientDays"
        render={({ field: { onChange, value } }) => (
          <EnhancedTextInput
            ref={getInputRef('nextNutrientDays')}
            label={t('metricsForm.fields.nextNutrientDays')}
            placeholder="0"
            value={value?.toString() || ''}
            onChangeText={(text) => onChange(text ? parseInt(text) : undefined)}
            keyboardType="numeric"
            error={errors.nextNutrientDays?.message}
            leftIcon="flask"
            maxLength={2}
          />
        )}
      />
    </ThemedView>
  );

  const renderGrowthStep = () => (
    <ThemedView className="space-y-4">
      <ThemedView className="flex-row space-x-3">
        <ThemedView className="flex-1">
          <Controller
            control={control}
            name="height"
            render={({ field: { onChange, value } }) => (
              <EnhancedTextInput
                ref={getInputRef('height')}
                label={t('metricsForm.fields.height')}
                placeholder="0"
                value={value?.toString() || ''}
                onChangeText={(text) => onChange(text ? parseFloat(text) : undefined)}
                keyboardType="numeric"
                error={errors.height?.message}
                leftIcon="ruler"
              />
            )}
          />
        </ThemedView>
        
        <ThemedView className="w-24">
          <Controller
            control={control}
            name="heightUnit"
            render={({ field: { onChange, value } }) => (
              <ThemedView className="mt-6">
                <UnitToggle
                  value={value || 'cm'}
                  onChange={onChange}
                  options={[
                    { value: 'cm', label: 'cm' },
                    { value: 'inches', label: 'in' },
                  ]}
                />
              </ThemedView>
            )}
          />
        </ThemedView>
      </ThemedView>

      <Controller
        control={control}
        name="nodeCount"
        render={({ field: { onChange, value } }) => (
          <EnhancedTextInput
            ref={getInputRef('nodeCount')}
            label={t('metricsForm.fields.nodeCount')}
            placeholder="0"
            value={value?.toString() || ''}
            onChangeText={(text) => onChange(text ? parseInt(text) : undefined)}
            keyboardType="numeric"
            error={errors.nodeCount?.message}
            leftIcon="git-branch"
            maxLength={3}
          />
        )}
      />

      <Controller
        control={control}
        name="stemDiameter"
        render={({ field: { onChange, value } }) => (
          <EnhancedTextInput
            ref={getInputRef('stemDiameter')}
            label={t('metricsForm.fields.stemDiameter')}
            placeholder="0.0 mm"
            value={value?.toString() || ''}
            onChangeText={(text) => onChange(text ? parseFloat(text) : undefined)}
            keyboardType="numeric"
            error={errors.stemDiameter?.message}
            leftIcon="circle"
          />
        )}
      />
    </ThemedView>
  );

  const renderEnvironmentStep = () => (
    <ThemedView className="space-y-4">
      <Controller
        control={control}
        name="phLevel"
        render={({ field: { onChange, value } }) => (
          <EnhancedTextInput
            ref={getInputRef('phLevel')}
            label={t('metricsForm.fields.phLevel')}
            placeholder="0.0 - 14.0"
            value={value?.toString() || ''}
            onChangeText={(text) => onChange(text ? parseFloat(text) : undefined)}
            keyboardType="numeric"
            error={errors.phLevel?.message}
            leftIcon="beaker"
          />
        )}
      />

      <Controller
        control={control}
        name="ecPpm"
        render={({ field: { onChange, value } }) => (
          <EnhancedTextInput
            ref={getInputRef('ecPpm')}
            label={t('metricsForm.fields.ecPpm')}
            placeholder="PPM"
            value={value?.toString() || ''}
            onChangeText={(text) => onChange(text ? parseFloat(text) : undefined)}
            keyboardType="numeric"
            error={errors.ecPpm?.message}
            leftIcon="zap"
          />
        )}
      />

      <ThemedView className="flex-row space-x-3">
        <ThemedView className="flex-1">
          <Controller
            control={control}
            name="temperature"
            render={({ field: { onChange, value } }) => (
              <EnhancedTextInput
                ref={getInputRef('temperature')}
                label={t('metricsForm.fields.temperature')}
                placeholder="0"
                value={value?.toString() || ''}
                onChangeText={(text) => onChange(text ? parseFloat(text) : undefined)}
                keyboardType="numeric"
                error={errors.temperature?.message}
                leftIcon="thermometer"
              />
            )}
          />
        </ThemedView>
        
        <ThemedView className="w-24">
          <Controller
            control={control}
            name="temperatureUnit"
            render={({ field: { onChange, value } }) => (
              <ThemedView className="mt-6">
                <UnitToggle
                  value={value || 'celsius'}
                  onChange={onChange}
                  options={[
                    { value: 'celsius', label: '°C' },
                    { value: 'fahrenheit', label: '°F' },
                  ]}
                />
              </ThemedView>
            )}
          />
        </ThemedView>
      </ThemedView>

      <Controller
        control={control}
        name="humidity"
        render={({ field: { onChange, value } }) => (
          <EnhancedTextInput
            ref={getInputRef('humidity')}
            label={t('metricsForm.fields.humidity')}
            placeholder="0-100%"
            value={value?.toString() || ''}
            onChangeText={(text) => onChange(text ? parseFloat(text) : undefined)}
            keyboardType="numeric"
            error={errors.humidity?.message}
            leftIcon="droplets"
            maxLength={3}
          />
        )}
      />

      {/* VPD Display */}
      {calculatedVPD !== null && (
        <ThemedView className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <ThemedView className="flex-row items-center space-x-2">
            <OptimizedIcon 
              name="help-circle" 
              size={16} 
              className="text-green-600 dark:text-green-400" 
            />
            <ThemedText className="text-sm font-medium text-green-800 dark:text-green-200">
              {`${t('metricsForm.fields.vpd')}: ${calculatedVPD} kPa`}
            </ThemedText>
          </ThemedView>
          <ThemedText className="text-xs text-green-600 dark:text-green-400 mt-1">
            {calculatedVPD >= 0.8 && calculatedVPD <= 1.5 
              ? t('metricsForm.vpdOptimal') 
              : t('metricsForm.vpdSuboptimal')
            }
          </ThemedText>
        </ThemedView>
      )}

      <Controller
        control={control}
        name="notes"
        render={({ field: { onChange, value } }) => (
          <EnhancedTextInput
            ref={getInputRef('notes')}
            label={t('metricsForm.fields.notes')}
            placeholder={t('metricsForm.fields.notesPlaceholder')}
            value={value || ''}
            onChangeText={onChange}
            multiline
            maxLength={500}
            showCharacterCount
          />
        )}
      />
    </ThemedView>
  );

  const renderFloweringStep = () => (
    <ThemedView className="space-y-4">
      <Controller
        control={control}
        name="trichomeStatus"
        render={({ field: { onChange, value } }) => (
          <TrichomeSelector
            value={value as TrichomeStatus}
            onChange={onChange}
            label={t('metricsForm.fields.trichomeStatus')}
            error={errors.trichomeStatus?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="pistilBrownPercentage"
        render={({ field: { onChange, value } }) => (
          <EnhancedTextInput
            ref={getInputRef('pistilBrownPercentage')}
            label={t('metricsForm.fields.pistilBrownPercentage')}
            placeholder="0-100%"
            value={value?.toString() || ''}
            onChangeText={(text) => onChange(text ? parseFloat(text) : undefined)}
            keyboardType="numeric"
            error={errors.pistilBrownPercentage?.message}
            leftIcon="percent"
            maxLength={3}
          />
        )}
      />

      <Controller
        control={control}
        name="budDensity"
        render={({ field: { onChange, value } }) => (
          <ThemedView>
            <ThemedText className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t('metricsForm.fields.budDensity')}
            </ThemedText>
            <ThemedView className="flex-row items-center space-x-4">
              <ThemedView className="flex-1">
                <EnhancedTextInput
                  ref={getInputRef('budDensity')}
                  placeholder="1-10"
                  value={value?.toString() || ''}
                  onChangeText={(text) => onChange(text ? parseInt(text) : undefined)}
                  keyboardType="numeric"
                  error={errors.budDensity?.message}
                  leftIcon="layers"
                  maxLength={2}
                />
              </ThemedView>
              <ThemedView className="flex-row space-x-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                  <Pressable
                    key={rating}
                    className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                      (value || 0) >= rating
                        ? 'bg-green-500 border-green-500'
                        : 'bg-transparent border-neutral-300 dark:border-neutral-600'
                    }`}
                    onPress={() => onChange(rating)}
                  >
                    {(value || 0) >= rating && (
                      <OptimizedIcon name="checkmark" size={10} className="text-white" />
                    )}
                  </Pressable>
                ))}
              </ThemedView>
            </ThemedView>
            <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              {t('metricsForm.fields.budDensityDescription')}
            </ThemedText>
          </ThemedView>
        )}
      />
    </ThemedView>
  );

  const currentStepData = FORM_STEPS[currentStep];
  const isLastStep = currentStep === FORM_STEPS.length - 1;

  if (!currentStepData) return null;

  return (
    <EnhancedKeyboardWrapper className="flex-1">
      <ScrollView
        className="flex-1 p-4"
        contentContainerStyle={{
          paddingBottom: 30,
        }}
      >
        {/* Header */}
        <ThemedView className="mb-6">
          <ThemedText className="text-2xl font-bold mb-2">
            {t(currentStepData.title)}
          </ThemedText>
          {currentStepData.description && (
            <ThemedText className="text-gray-600 mb-4">
              {t(currentStepData.description)}
            </ThemedText>
          )}
          <ThemedText className="text-sm text-neutral-500 dark:text-neutral-400">
            {currentStep + 1} / {FORM_STEPS.length}
          </ThemedText>
        </ThemedView>

        {/* Progress Bar */}
        <ThemedView className="h-2 bg-gray-200 rounded-full mb-6">
          <Animated.View
            style={progressBarStyle}
            className="h-full bg-green-500 rounded-full"
          />
        </ThemedView>

        {/* Form Content */}
        {renderStepContent()}

        {/* Navigation Buttons */}
        <ThemedView className="flex-row justify-between mt-6">
          {currentStep > 0 && (
            <Pressable
              className="flex-1 bg-gray-200 rounded-lg p-4 mr-2 items-center justify-center"
              onTouchStart={handleButtonPressIn}
              onTouchEnd={handleButtonPressOut}
              onPress={handlePrevious}
            >
              <ThemedText className="text-center font-medium text-neutral-700 dark:text-neutral-300">
                {t('metricsForm.buttons.previous')}
              </ThemedText>
            </Pressable>
          )}

          <Animated.View
            className="flex-1 bg-green-500 rounded-lg p-4 ml-2 items-center justify-center"
            style={buttonStyle}
          >
            <Pressable
              className="flex-1 w-full items-center justify-center"
              onTouchStart={handleButtonPressIn}
              onTouchEnd={handleButtonPressOut}
              onPress={isLastStep ? handleSubmit(onFormSubmit) : handleNext}
            >
              <ThemedText className="text-center font-medium text-white">
                {isSubmitting
                  ? t('metricsForm.buttons.submitting')
                  : isLastStep
                    ? t('metricsForm.buttons.save')
                    : t('metricsForm.buttons.next')
                }
              </ThemedText>
            </Pressable>
          </Animated.View>

          <Pressable
            className="flex-1 bg-red-500 rounded-lg p-4 ml-2 items-center justify-center"
            onPress={onCancel}
          >
            <ThemedText className="text-center text-neutral-500 dark:text-neutral-400">
              {t('metricsForm.buttons.cancel')}
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ScrollView>
    </EnhancedKeyboardWrapper>
  );
};

// Unit Toggle Component
interface UnitToggleProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

const UnitToggle: React.FC<UnitToggleProps> = ({ value, onChange, options }) => {
  const selectedIndex = options.findIndex(option => option.value === value);
  const translateX = useSharedValue(selectedIndex * 50);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const handlePress = (optionValue: string, index: number) => {
    onChange(optionValue);
    translateX.value = withSpring(index * 50);
    triggerLightHaptic();
  };

  return (
    <ThemedView className="relative flex-row bg-neutral-200 dark:bg-neutral-700 rounded-lg p-1">
      <Animated.View 
        style={[animatedStyle]}
        className="absolute top-1 left-1 w-12 h-8 bg-white dark:bg-neutral-600 rounded-md shadow-sm"
      />
      {options.map((option, index) => (
        <Pressable
          key={option.value}
          className="w-12 h-8 items-center justify-center"
          onPress={() => handlePress(option.value, index)}
        >
          <ThemedText 
            className={`text-xs font-medium ${
              value === option.value 
                ? 'text-neutral-900 dark:text-neutral-100' 
                : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            {option.label}
          </ThemedText>
        </Pressable>
      ))}
    </ThemedView>
  );
};