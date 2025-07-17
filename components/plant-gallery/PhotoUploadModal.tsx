'use client';

import React, { memo, useCallback, useState } from 'react';
import {
  Modal,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../lib/contexts/AuthProvider';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

import { OptimizedIcon } from '../ui/OptimizedIcon';
import { EnhancedTextInput } from '../ui/EnhancedTextInput';
import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { takePhoto, selectFromGallery, ImageResult } from '../../lib/utils/image-picker';
import { uploadPlantGalleryImage } from '../../lib/utils/upload-image';
import { GrowthStage } from '../../lib/types/plant';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerErrorHaptic,
} from '../../lib/utils/haptics';

interface PhotoUploadModalProps {
  visible: boolean;
  plantId: string;
  onClose: () => void;
  onPhotoUploaded: (photoData: {
    imageUrl: string;
    thumbnailUrl?: string;
    caption?: string;
    growthStage: string;
    width?: number;
    height?: number;
    fileSize?: number;
  }) => void;
}

// Form schema
const photoUploadSchema = z.object({
  caption: z.string().max(200).optional(),
  growthStage: z.nativeEnum(GrowthStage),
});

type PhotoUploadFormData = z.infer<typeof photoUploadSchema>;

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

interface AnimatedButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive';
  className?: string;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = memo(function AnimatedButton({
  onPress,
  children,
  disabled = false,
  variant = 'primary',
  className = '',
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const variantClasses = {
    primary: 'bg-primary-500 dark:bg-primary-600',
    secondary: 'bg-neutral-200 dark:bg-neutral-700',
    tertiary: 'bg-transparent border border-neutral-300 dark:border-neutral-600',
    destructive: 'bg-red-500 dark:bg-red-600',
  };

  const triggerHaptic = useCallback(() => {
    const hapticFunction = variant === 'destructive' ? triggerMediumHaptic : triggerLightHaptic;
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
        className={`flex-row items-center justify-center rounded-2xl px-4 py-3 shadow-md ${variantClasses[variant]} ${disabled ? 'opacity-50' : ''} ${className}`}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
});

interface GrowthStageSelectionProps {
  selectedStage: GrowthStage | undefined;
  onStageSelect: (stage: GrowthStage) => void;
}

const GrowthStageSelection = memo(function GrowthStageSelection({
  selectedStage,
  onStageSelect,
}: GrowthStageSelectionProps) {
  const { t } = useTranslation();

  return (
    <ThemedView className="space-y-3">
      <ThemedText variant="heading" className="text-base">
        {t('photoUpload.growthStage')}
      </ThemedText>
      <ThemedView className="flex-row flex-wrap gap-2">
        {Object.values(GrowthStage).map((stage) => (
          <AnimatedButton
            key={stage}
            onPress={() => onStageSelect(stage)}
            variant={selectedStage === stage ? 'primary' : 'secondary'}
            className="flex-grow-0"
          >
            <ThemedText
              className={
                selectedStage === stage
                  ? 'font-medium text-white'
                  : 'text-neutral-900 dark:text-neutral-100'
              }
            >
              {stage}
            </ThemedText>
          </AnimatedButton>
        ))}
      </ThemedView>
    </ThemedView>
  );
});

export const PhotoUploadModal = memo(function PhotoUploadModal({
  visible,
  plantId,
  onClose,
  onPhotoUploaded,
}: PhotoUploadModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<ImageResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<PhotoUploadFormData>({
    resolver: zodResolver(photoUploadSchema),
    defaultValues: {
      caption: '',
      growthStage: GrowthStage.VEGETATIVE,
    },
  });

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (visible) {
      reset();
      setSelectedImage(null);
      setIsUploading(false);
    }
  }, [visible, reset]);

  const handleTakePhoto = useCallback(async () => {
    try {
      const result = await takePhoto();
      if (result) {
        setSelectedImage(result);
        triggerLightHaptic();
      }
    } catch (error) {
      console.error('[PhotoUploadModal] Camera error:', error);
      triggerErrorHaptic();
      Alert.alert(
        t('photoUpload.error.title'),
        t('photoUpload.error.cameraFailed')
      );
    }
  }, [t]);

  const handleSelectFromGallery = useCallback(async () => {
    try {
      const result = await selectFromGallery();
      if (result) {
        setSelectedImage(result);
        triggerLightHaptic();
      }
    } catch (error) {
      console.error('[PhotoUploadModal] Gallery error:', error);
      triggerErrorHaptic();
      Alert.alert(
        t('photoUpload.error.title'),
        t('photoUpload.error.galleryFailed')
      );
    }
  }, [t]);

  const handleRemoveImage = useCallback(() => {
    setSelectedImage(null);
    triggerLightHaptic();
  }, []);

  const onSubmit = useCallback(async (data: PhotoUploadFormData) => {
    if (!selectedImage) {
      Alert.alert(
        t('photoUpload.error.title'),
        t('photoUpload.error.noImageSelected')
      );
      return;
    }

    if (!user) {
      Alert.alert(
        t('photoUpload.error.title'),
        'User not authenticated'
      );
      return;
    }

    setIsUploading(true);

    try {
      // Upload image to Supabase Storage
      const uploadResult = await uploadPlantGalleryImage(user.id, selectedImage.uri);
      
      if (!uploadResult.success || !uploadResult.publicUrl) {
        throw new Error(uploadResult.error?.message || 'Upload failed');
      }

      // Prepare photo data
      const photoData = {
        imageUrl: uploadResult.publicUrl,
        thumbnailUrl: uploadResult.publicUrl, // Use same URL for thumbnail
        caption: data.caption || undefined,
        growthStage: data.growthStage,
        width: selectedImage.width,
        height: selectedImage.height,
        fileSize: uploadResult.fileSize,
      };

      // Notify parent component
      onPhotoUploaded(photoData);
      
      // Close modal
      onClose();
      
      triggerMediumHaptic();
    } catch (error) {
      console.error('[PhotoUploadModal] Upload error:', error);
      triggerErrorHaptic();
      Alert.alert(
        t('photoUpload.error.title'),
        t('photoUpload.error.uploadFailed', { 
          message: error instanceof Error ? error.message : 'Unknown error' 
        })
      );
    } finally {
      setIsUploading(false);
    }
  }, [selectedImage, plantId, onPhotoUploaded, onClose, t]);

  const handleClose = useCallback(() => {
    if (isUploading) return;
    onClose();
  }, [isUploading, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ThemedView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
          {/* Header */}
          <ThemedView className="flex-row items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
            <AnimatedButton
              onPress={handleClose}
              variant="tertiary"
              disabled={isUploading}
              className="px-3 py-2"
            >
              <ThemedText className="text-neutral-900 dark:text-neutral-100">
                {t('common.cancel')}
              </ThemedText>
            </AnimatedButton>

            <ThemedText variant="heading" className="text-lg">
              {t('photoUpload.title')}
            </ThemedText>

            <AnimatedButton
              onPress={handleSubmit(onSubmit)}
              variant="primary"
              disabled={!selectedImage || !isValid || isUploading}
              className="px-3 py-2"
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <ThemedText className="font-medium text-white">
                  {t('common.save')}
                </ThemedText>
              )}
            </AnimatedButton>
          </ThemedView>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <ThemedView className="space-y-6 p-4">
              {/* Image Selection */}
              <ThemedView className="space-y-4">
                <ThemedText variant="heading" className="text-base">
                  {t('photoUpload.selectImage')}
                </ThemedText>

                {selectedImage ? (
                  <ThemedView className="relative items-center">
                    <Image
                      source={{ uri: selectedImage.uri }}
                      className="h-64 w-full rounded-2xl"
                      resizeMode="cover"
                    />
                    <AnimatedButton
                      onPress={handleRemoveImage}
                      variant="destructive"
                      className="absolute -right-2 -top-2 h-10 w-10 rounded-full"
                    >
                      <OptimizedIcon name="close" size={20} className="text-white" />
                    </AnimatedButton>
                  </ThemedView>
                ) : (
                  <ThemedView className="h-64 items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-700">
                    <OptimizedIcon
                      name="image-outline"
                      size={48}
                      className="mb-4 text-neutral-400 dark:text-neutral-500"
                    />
                    <ThemedText variant="muted" className="mb-4 text-center">
                      {t('photoUpload.noImageSelected')}
                    </ThemedText>
                  </ThemedView>
                )}

                {/* Image Selection Buttons */}
                <ThemedView className="flex-row space-x-4">
                  <AnimatedButton
                    onPress={handleTakePhoto}
                    variant="primary"
                    className="flex-1"
                    disabled={isUploading}
                  >
                    <OptimizedIcon name="camera" size={20} className="mr-2 text-white" />
                    <ThemedText className="font-medium text-white">
                      {t('photoUpload.takePhoto')}
                    </ThemedText>
                  </AnimatedButton>

                  <AnimatedButton
                    onPress={handleSelectFromGallery}
                    variant="secondary"
                    className="flex-1"
                    disabled={isUploading}
                  >
                    <OptimizedIcon
                      name="image-outline"
                      size={20}
                      className="mr-2 text-neutral-900 dark:text-neutral-100"
                    />
                    <ThemedText className="font-medium text-neutral-900 dark:text-neutral-100">
                      {t('photoUpload.selectFromGallery')}
                    </ThemedText>
                  </AnimatedButton>
                </ThemedView>
              </ThemedView>

              {/* Caption Input */}
              <Controller
                control={control}
                name="caption"
                render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                  <EnhancedTextInput
                    label={t('photoUpload.caption')}
                    value={value || ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={t('photoUpload.captionPlaceholder')}
                    multiline
                    error={error?.message}
                    leftIcon="note-text-outline"
                    showCharacterCount
                    maxLength={200}
                    returnKeyType="done"
                    editable={!isUploading}
                  />
                )}
              />

              {/* Growth Stage Selection */}
              <Controller
                control={control}
                name="growthStage"
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <ThemedView>
                    <GrowthStageSelection
                      selectedStage={value}
                      onStageSelect={onChange}
                    />
                    {error && (
                      <ThemedText className="mt-1 text-xs text-red-500">
                        {error.message}
                      </ThemedText>
                    )}
                  </ThemedView>
                )}
              />
            </ThemedView>
          </ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
});