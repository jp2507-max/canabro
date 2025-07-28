/**
 * TaskCompletionForm - Adapted from MetricsInputForm for task completion tracking
 * 
 * Features:
 * - Quick completion mode for simple task marking
 * - Comprehensive mode with detailed metrics
 * - Photo capture and note-taking (reused from MetricsInputForm)
 * - Environmental condition recording (reused patterns)
 * - Task-specific completion data (duration, supplies used)
 * - Form validation with Zod schemas
 */

import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextInput, ScrollView, Alert, Pressable, Image } from 'react-native';
import { z } from 'zod';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';

import { EnhancedTextInput } from '@/components/ui/EnhancedTextInput';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import EnhancedKeyboardWrapper from '@/components/keyboard/EnhancedKeyboardWrapper';
import { TaskCompletion } from '@/lib/models/PlantTask';
import { PlantMetrics } from '@/lib/models/PlantMetrics';
import { takePhoto, selectFromGallery, ImageResult } from '@/lib/utils/image-picker';
import {
    triggerLightHaptic,
    triggerMediumHaptic,
    triggerSelectionHaptic
} from '@/lib/utils/haptics';

// Task completion form validation schema
const getTaskCompletionSchema = (t: (key: string) => string) => z.object({
    // Basic completion data
    notes: z.string().optional(),
    duration: z.number()
        .min(0, t('taskCompletion.validation.durationMin'))
        .optional(),

    // Environmental conditions (reused from MetricsInputForm)
    temperature: z.number().optional(),
    humidity: z.number()
        .min(0, t('taskCompletion.validation.humidityMin'))
        .max(100, t('taskCompletion.validation.humidityMax'))
        .optional(),
    pH: z.number()
        .min(0, t('taskCompletion.validation.phMin'))
        .max(14, t('taskCompletion.validation.phMax'))
        .optional(),

    // Supply tracking
    suppliesUsed: z.array(z.string()).optional(),
    supplyAmounts: z.record(z.string(), z.number()).optional(),

    // Photos
    photos: z.array(z.string()).optional(),
});

type TaskCompletionFormData = z.infer<ReturnType<typeof getTaskCompletionSchema>>;

interface CompletionMode {
    id: 'quick' | 'comprehensive';
    title: string;
    description: string;
    fields: (keyof TaskCompletionFormData)[];
}

const COMPLETION_MODES: CompletionMode[] = [
    {
        id: 'quick',
        title: 'taskCompletion.quickMode.title',
        description: 'taskCompletion.quickMode.description',
        fields: ['notes'],
    },
    {
        id: 'comprehensive',
        title: 'taskCompletion.comprehensiveMode.title',
        description: 'taskCompletion.comprehensiveMode.description',
        fields: ['notes', 'duration', 'temperature', 'humidity', 'pH', 'suppliesUsed', 'supplyAmounts', 'photos'],
    },
];

interface TaskCompletionFormProps {
    taskId: string;
    taskTitle: string;
    taskType: string;
    initialData?: Partial<TaskCompletionFormData>;
    onSubmit: (completion: TaskCompletion) => Promise<void>;
    onCancel: () => void;
}

export const TaskCompletionForm: React.FC<TaskCompletionFormProps> = ({
    taskId,
    taskTitle,
    taskType,
    initialData,
    onSubmit,
    onCancel,
}) => {
    const { t } = useTranslation();
    const [completionMode, setCompletionMode] = useState<'quick' | 'comprehensive'>('quick');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [capturedPhotos, setCapturedPhotos] = useState<ImageResult[]>([]);
    const [supplies, setSupplies] = useState<string[]>([]);

    // Form setup
    const {
        control,
        handleSubmit,
        formState: { errors },
        watch,
        setValue,
    } = useForm<TaskCompletionFormData>({
        resolver: zodResolver(getTaskCompletionSchema(t)),
        defaultValues: {
            notes: '',
            suppliesUsed: [],
            supplyAmounts: {},
            photos: [],
            ...initialData,
        },
        mode: 'onChange',
    });

    // Watch values for VPD calculation (reused from MetricsInputForm)
    const temperature = watch('temperature');
    const humidity = watch('humidity');

    // Calculate VPD when temperature and humidity change
    const calculatedVPD = React.useMemo(() => {
        if (temperature && humidity) {
            return PlantMetrics.calculateVPD(temperature, humidity, 'celsius');
        }
        return null;
    }, [temperature, humidity]);

    // Animation values
    const buttonScale = useSharedValue(1);
    const modeToggleScale = useSharedValue(1);

    // Animated styles
    const buttonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

    const modeToggleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: modeToggleScale.value }],
    }));

    // Input refs for keyboard navigation
    const inputRefs = useRef<Record<string, React.RefObject<TextInput | null>>>({});

    // Get or create input ref
    const getInputRef = useCallback((fieldName: string) => {
        if (!inputRefs.current[fieldName]) {
            inputRefs.current[fieldName] = React.createRef<TextInput | null>();
        }
        return inputRefs.current[fieldName];
    }, []);

    // Photo capture handlers (reused from image-picker utility)
    const handleTakePhoto = useCallback(async () => {
        const photo = await takePhoto();
        if (photo) {
            setCapturedPhotos(prev => [...prev, photo]);
            setValue('photos', [...capturedPhotos.map(p => p.uri), photo.uri]);
            triggerLightHaptic();
        }
    }, [capturedPhotos, setValue]);

    const handleSelectPhoto = useCallback(async () => {
        const photo = await selectFromGallery();
        if (photo) {
            setCapturedPhotos(prev => [...prev, photo]);
            setValue('photos', [...capturedPhotos.map(p => p.uri), photo.uri]);
            triggerLightHaptic();
        }
    }, [capturedPhotos, setValue]);

    const handleRemovePhoto = useCallback((index: number) => {
        const newPhotos = capturedPhotos.filter((_, i) => i !== index);
        setCapturedPhotos(newPhotos);
        setValue('photos', newPhotos.map(p => p.uri));
        triggerLightHaptic();
    }, [capturedPhotos, setValue]);

    // Supply management
    const handleAddSupply = useCallback((supply: string) => {
        if (supply.trim() && !supplies.includes(supply.trim())) {
            const newSupplies = [...supplies, supply.trim()];
            setSupplies(newSupplies);
            setValue('suppliesUsed', newSupplies);
            triggerLightHaptic();
        }
    }, [supplies, setValue]);

    const handleRemoveSupply = useCallback((supply: string) => {
        const newSupplies = supplies.filter(s => s !== supply);
        setSupplies(newSupplies);
        setValue('suppliesUsed', newSupplies);

        // Remove from amounts as well
        const currentAmounts = watch('supplyAmounts') || {};
        const newAmounts = { ...currentAmounts };
        delete newAmounts[supply];
        setValue('supplyAmounts', newAmounts);

        triggerLightHaptic();
    }, [supplies, setValue, watch]);

    // Mode toggle handler
    const handleModeToggle = useCallback((mode: 'quick' | 'comprehensive') => {
        setCompletionMode(mode);
        modeToggleScale.value = withSpring(0.95, {}, () => {
            modeToggleScale.value = withSpring(1);
        });
        triggerSelectionHaptic();
    }, [modeToggleScale]);

    // Form submission
    const onFormSubmit: SubmitHandler<TaskCompletionFormData> = async (data) => {
        try {
            setIsSubmitting(true);
            triggerMediumHaptic();

            // Build TaskCompletion object
            const completion: TaskCompletion = {
                taskId,
                completedAt: new Date(),
                notes: data.notes,
                photos: data.photos || [],
                conditions: {
                    temperature: data.temperature,
                    humidity: data.humidity,
                    pH: data.pH,
                },
                supplies: {
                    used: data.suppliesUsed || [],
                    amounts: data.supplyAmounts || {},
                },
            };

            await onSubmit(completion);
            triggerSelectionHaptic();
        } catch (error) {
            console.error('Error submitting task completion:', error);
            Alert.alert(
                t('taskCompletion.errors.submitTitle'),
                t('taskCompletion.errors.submitMessage')
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

    // Render mode selector
    const renderModeSelector = () => (
        <ThemedView className="mb-6">
            <ThemedText className="text-lg font-semibold mb-3">
                {t('taskCompletion.modeSelector.title')}
            </ThemedText>
            <ThemedView className="flex-row space-x-3">
                {COMPLETION_MODES.map((mode) => (
                    <Animated.View key={mode.id} style={modeToggleStyle} className="flex-1">
                        <Pressable
                            className={`p-4 rounded-lg border-2 ${completionMode === mode.id
                                    ? 'bg-green-50 border-green-500 dark:bg-green-900/20 dark:border-green-400'
                                    : 'bg-neutral-50 border-neutral-200 dark:bg-neutral-800 dark:border-neutral-600'
                                }`}
                            onPress={() => handleModeToggle(mode.id)}
                        >
                            <ThemedText className={`font-medium text-center ${completionMode === mode.id
                                    ? 'text-green-700 dark:text-green-300'
                                    : 'text-neutral-700 dark:text-neutral-300'
                                }`}>
                                {t(mode.title)}
                            </ThemedText>
                            <ThemedText className={`text-xs text-center mt-1 ${completionMode === mode.id
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-neutral-500 dark:text-neutral-400'
                                }`}>
                                {t(mode.description)}
                            </ThemedText>
                        </Pressable>
                    </Animated.View>
                ))}
            </ThemedView>
        </ThemedView>
    );

    // Render quick completion form
    const renderQuickCompletion = () => (
        <ThemedView className="space-y-4">
            <Controller
                control={control}
                name="notes"
                render={({ field: { onChange, value } }) => (
                    <EnhancedTextInput
                        ref={getInputRef('notes')}
                        label={t('taskCompletion.fields.notes')}
                        placeholder={t('taskCompletion.fields.notesPlaceholder')}
                        value={value || ''}
                        onChangeText={onChange}
                        multiline
                        maxLength={500}
                        showCharacterCount
                        error={errors.notes?.message}
                    />
                )}
            />
        </ThemedView>
    );

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
                        {t('taskCompletion.title')}
                    </ThemedText>
                    <ThemedText className="text-lg text-neutral-600 dark:text-neutral-400 mb-1">
                        {taskTitle}
                    </ThemedText>
                    <ThemedText className="text-sm text-neutral-500 dark:text-neutral-400 capitalize">
                        {taskType}
                    </ThemedText>
                </ThemedView>

                {/* Mode Selector */}
                {renderModeSelector()}

                {/* Form Content */}
                {completionMode === 'quick' ? renderQuickCompletion() : renderComprehensiveCompletion()}

                {/* Action Buttons */}
                <ThemedView className="flex-row space-x-3 mt-6">
                    <Animated.View className="flex-1" style={buttonStyle}>
                        <Pressable
                            className="bg-green-500 rounded-lg p-4 items-center justify-center"
                            onTouchStart={handleButtonPressIn}
                            onTouchEnd={handleButtonPressOut}
                            onPress={handleSubmit(onFormSubmit)}
                            disabled={isSubmitting}
                        >
                            <ThemedText className="text-white font-medium">
                                {isSubmitting
                                    ? t('taskCompletion.buttons.submitting')
                                    : t('taskCompletion.buttons.complete')
                                }
                            </ThemedText>
                        </Pressable>
                    </Animated.View>

                    <Pressable
                        className="flex-1 bg-neutral-200 dark:bg-neutral-700 rounded-lg p-4 items-center justify-center"
                        onPress={onCancel}
                    >
                        <ThemedText className="text-neutral-700 dark:text-neutral-300 font-medium">
                            {t('taskCompletion.buttons.cancel')}
                        </ThemedText>
                    </Pressable>
                </ThemedView>
            </ScrollView>
        </EnhancedKeyboardWrapper>
    );

    // Render comprehensive completion form
    function renderComprehensiveCompletion() {
        return (
            <ThemedView className="space-y-6">
                {/* Notes Section */}
                <Controller
                    control={control}
                    name="notes"
                    render={({ field: { onChange, value } }) => (
                        <EnhancedTextInput
                            ref={getInputRef('notes')}
                            label={t('taskCompletion.fields.notes')}
                            placeholder={t('taskCompletion.fields.notesPlaceholder')}
                            value={value || ''}
                            onChangeText={onChange}
                            multiline
                            maxLength={500}
                            showCharacterCount
                            error={errors.notes?.message}
                        />
                    )}
                />

                {/* Duration Section */}
                <Controller
                    control={control}
                    name="duration"
                    render={({ field: { onChange, value } }) => (
                        <EnhancedTextInput
                            ref={getInputRef('duration')}
                            label={t('taskCompletion.fields.duration')}
                            placeholder={t('taskCompletion.fields.durationPlaceholder')}
                            value={value?.toString() || ''}
                            onChangeText={(text) => onChange(text ? parseFloat(text) : undefined)}
                            keyboardType="numeric"
                            error={errors.duration?.message}
                            leftIcon="clock"
                        />
                    )}
                />

                {/* Environmental Conditions Section (reused from MetricsInputForm) */}
                <ThemedView>
                    <ThemedText className="text-lg font-semibold mb-3">
                        {t('taskCompletion.sections.environmental')}
                    </ThemedText>

                    <ThemedView className="space-y-4">
                        <Controller
                            control={control}
                            name="temperature"
                            render={({ field: { onChange, value } }) => (
                                <EnhancedTextInput
                                    ref={getInputRef('temperature')}
                                    label={t('taskCompletion.fields.temperature')}
                                    placeholder="°C"
                                    value={value?.toString() || ''}
                                    onChangeText={(text) => onChange(text ? parseFloat(text) : undefined)}
                                    keyboardType="numeric"
                                    error={errors.temperature?.message}
                                    leftIcon="thermometer"
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="humidity"
                            render={({ field: { onChange, value } }) => (
                                <EnhancedTextInput
                                    ref={getInputRef('humidity')}
                                    label={t('taskCompletion.fields.humidity')}
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

                        <Controller
                            control={control}
                            name="pH"
                            render={({ field: { onChange, value } }) => (
                                <EnhancedTextInput
                                    ref={getInputRef('pH')}
                                    label={t('taskCompletion.fields.pH')}
                                    placeholder="0.0 - 14.0"
                                    value={value?.toString() || ''}
                                    onChangeText={(text) => onChange(text ? parseFloat(text) : undefined)}
                                    keyboardType="numeric"
                                    error={errors.pH?.message}
                                    leftIcon="beaker"
                                />
                            )}
                        />

                        {/* VPD Display (reused from MetricsInputForm) */}
                        {calculatedVPD !== null && (
                            <ThemedView className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                <ThemedView className="flex-row items-center space-x-2">
                                    <OptimizedIcon
                                        name="help-circle"
                                        size={16}
                                        className="text-green-600 dark:text-green-400"
                                    />
                                    <ThemedText className="text-sm font-medium text-green-800 dark:text-green-200">
                                        {`${t('taskCompletion.fields.vpd')}: ${calculatedVPD} kPa`}
                                    </ThemedText>
                                </ThemedView>
                                <ThemedText className="text-xs text-green-600 dark:text-green-400 mt-1">
                                    {calculatedVPD >= 0.8 && calculatedVPD <= 1.5
                                        ? t('taskCompletion.vpdOptimal')
                                        : t('taskCompletion.vpdSuboptimal')
                                    }
                                </ThemedText>
                            </ThemedView>
                        )}
                    </ThemedView>
                </ThemedView>

                {/* Supplies Section */}
                <ThemedView>
                    <ThemedText className="text-lg font-semibold mb-3">
                        {t('taskCompletion.sections.supplies')}
                    </ThemedText>

                    {/* Supply Input */}
                    <ThemedView className="mb-4">
                        <SupplyInput onAddSupply={handleAddSupply} />
                    </ThemedView>

                    {/* Supply List */}
                    {supplies.length > 0 && (
                        <ThemedView className="space-y-2">
                            {supplies.map((supply, index) => (
                                <SupplyItem
                                    key={`${supply}-${index}`}
                                    supply={supply}
                                    onRemove={() => handleRemoveSupply(supply)}
                                    onAmountChange={(amount) => {
                                        const currentAmounts = watch('supplyAmounts') || {};
                                        setValue('supplyAmounts', {
                                            ...currentAmounts,
                                            [supply]: amount,
                                        });
                                    }}
                                    amount={watch('supplyAmounts')?.[supply]}
                                />
                            ))}
                        </ThemedView>
                    )}
                </ThemedView>

                {/* Photos Section (reused photo capture functionality) */}
                <ThemedView>
                    <ThemedText className="text-lg font-semibold mb-3">
                        {t('taskCompletion.sections.photos')}
                    </ThemedText>

                    {/* Photo Capture Buttons */}
                    <ThemedView className="flex-row space-x-3 mb-4">
                        <Pressable
                            className="flex-1 bg-blue-500 rounded-lg p-3 items-center justify-center flex-row space-x-2"
                            onPress={handleTakePhoto}
                        >
                            <OptimizedIcon name="camera" size={20} className="text-white" />
                            <ThemedText className="text-white font-medium">
                                {t('taskCompletion.buttons.takePhoto')}
                            </ThemedText>
                        </Pressable>

                        <Pressable
                            className="flex-1 bg-purple-500 rounded-lg p-3 items-center justify-center flex-row space-x-2"
                            onPress={handleSelectPhoto}
                        >
                            <OptimizedIcon name="image-outline" size={20} className="text-white" />
                            <ThemedText className="text-white font-medium">
                                {t('taskCompletion.buttons.selectPhoto')}
                            </ThemedText>
                        </Pressable>
                    </ThemedView>

                    {/* Photo Grid */}
                    {capturedPhotos.length > 0 && (
                        <ThemedView className="flex-row flex-wrap gap-2">
                            {capturedPhotos.map((photo, index) => (
                                <ThemedView key={`photo-${index}`} className="relative">
                                    <Image
                                        source={{ uri: photo.uri }}
                                        className="w-20 h-20 rounded-lg"
                                        resizeMode="cover"
                                    />
                                    <Pressable
                                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full items-center justify-center"
                                        onPress={() => handleRemovePhoto(index)}
                                    >
                                        <OptimizedIcon name="close" size={12} className="text-white" />
                                    </Pressable>
                                </ThemedView>
                            ))}
                        </ThemedView>
                    )}
                </ThemedView>
            </ThemedView>
        );
    }
};

// Supply Input Component
interface SupplyInputProps {
    onAddSupply: (supply: string) => void;
}

const SupplyInput: React.FC<SupplyInputProps> = ({ onAddSupply }) => {
    const { t } = useTranslation();
    const [inputValue, setInputValue] = useState('');

    const handleSubmit = useCallback(() => {
        if (inputValue.trim()) {
            onAddSupply(inputValue.trim());
            setInputValue('');
        }
    }, [inputValue, onAddSupply]);

    return (
        <ThemedView className="flex-row space-x-2">
            <ThemedView className="flex-1">
                <EnhancedTextInput
                    placeholder={t('taskCompletion.fields.supplyPlaceholder')}
                    value={inputValue}
                    onChangeText={setInputValue}
                    onSubmitEditing={handleSubmit}
                    returnKeyType="done"
                />
            </ThemedView>
            <Pressable
                className="bg-green-500 rounded-lg px-4 py-2 items-center justify-center"
                onPress={handleSubmit}
            >
                <OptimizedIcon name="add" size={20} className="text-white" />
            </Pressable>
        </ThemedView>
    );
};

// Supply Item Component
interface SupplyItemProps {
    supply: string;
    amount?: number;
    onRemove: () => void;
    onAmountChange: (amount: number) => void;
}

const SupplyItem: React.FC<SupplyItemProps> = ({
    supply,
    amount,
    onRemove,
    onAmountChange
}) => {
    const { t } = useTranslation();

    return (
        <ThemedView className="flex-row items-center space-x-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <ThemedView className="flex-1">
                <ThemedText className="font-medium">{supply}</ThemedText>
            </ThemedView>

            <ThemedView className="w-20">
                <EnhancedTextInput
                    placeholder={t('taskCompletion.fields.amount')}
                    value={amount?.toString() || ''}
                    onChangeText={(text) => onAmountChange(text ? parseFloat(text) : 0)}
                    keyboardType="numeric"
                    textAlign="center"
                />
            </ThemedView>

            <Pressable
                className="w-8 h-8 bg-red-500 rounded-full items-center justify-center"
                onPress={onRemove}
            >
                <OptimizedIcon name="trash" size={14} className="text-white" />
            </Pressable>
        </ThemedView>
    );
};