import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { ActivityIndicator, Image, View, Alert, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

import { OptimizedIcon } from '../components/ui/OptimizedIcon';
import ThemedText from '../components/ui/ThemedText';
import ThemedView from '../components/ui/ThemedView';
import { SPRING_CONFIGS } from '../lib/animations/presets';
import { logger } from '@/lib/config/production';
import { triggerLightHapticSync } from '@/lib/utils/haptics';

interface PlantImageSectionProps {
  initialImageUri?: string | null;
  isEditing?: boolean;
  onImageChange?: (uri: string | null) => void;
}

const PlantImageSection: React.FC<PlantImageSectionProps> = ({
  initialImageUri = null,
  isEditing = false,
  onImageChange,
}) => {
  const [imageUri, setImageUri] = useState<string | null>(initialImageUri);
  const [processing, setProcessing] = useState(false);

  // Animation values for buttons
  const pickImageScale = useSharedValue(1);
  const takePictureScale = useSharedValue(1);

  // Animated styles
  const pickImageStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: pickImageScale.value }],
    };
  });

  const takePictureStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: takePictureScale.value }],
    };
  });

  async function processAndSetImage(uri: string) {
    try {
      setProcessing(true);
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      setImageUri(manipResult.uri);
      onImageChange?.(manipResult.uri);
    } catch (error) {
      logger.error('Error processing image:', error);
      Alert.alert('Error', 'Failed to process image');
    } finally {
      setProcessing(false);
    }
  }

  async function handleImagePick() {
    try {
      logger.log('[PlantImageSection] Requesting media library permissions...');
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      logger.log('[PlantImageSection] Permission result:', permissionResult);

      if (!permissionResult.granted) {
        const message = permissionResult.canAskAgain
          ? 'Photo library access is needed to upload images. Please grant permission in your device settings.'
          : 'Photo library access was denied. Please enable it in your device settings to select images.';
        Alert.alert('Permission Required', message);
        return;
      }

      logger.log('[PlantImageSection] Launching image library...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        selectionLimit: 1,
      });

      logger.log('[PlantImageSection] Image picker result:', result);

      if (!result.canceled && result.assets?.[0]?.uri) {
        logger.log('[PlantImageSection] Image selected, processing...');
        await processAndSetImage(result.assets[0].uri);
      }
    } catch (error) {
      logger.error('[PlantImageSection] Error picking image:', error);
      Alert.alert(
        'Gallery Error',
        'Failed to access photo gallery. Please try again or restart the app if the problem persists.'
      );
    }
  }

  async function handleTakePicture() {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPermission || cameraPermission.status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        await processAndSetImage(result.assets[0].uri);
      }
    } catch (error) {
      logger.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture');
    }
  }

  // Gesture handlers
  const pickImageGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      pickImageScale.value = withSpring(0.95, SPRING_CONFIGS.quick);
    })
    .onFinalize(() => {
      'worklet';
      pickImageScale.value = withSpring(1, SPRING_CONFIGS.smooth);
    })
    .onEnd(() => {
      runOnJS(triggerLightHapticSync)();
      runOnJS(handleImagePick)();
    });

  const takePictureGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      takePictureScale.value = withSpring(0.95, SPRING_CONFIGS.quick);
    })
    .onFinalize(() => {
      'worklet';
      takePictureScale.value = withSpring(1, SPRING_CONFIGS.smooth);
    })
    .onEnd(() => {
      runOnJS(triggerLightHapticSync)();
      runOnJS(handleTakePicture)();
    });

  return (
    <ThemedView className="mb-6 items-center">
      {processing ? (
        <View style={StyleSheet.absoluteFill} className="items-center justify-center bg-black/50">
          <ActivityIndicator size="large" color="#3b82f6" />
          <ThemedText className="mt-2 text-white">Processing...</ThemedText>
        </View>
      ) : imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={{ width: 180, height: 180, borderRadius: 12 }}
          resizeMode="cover"
          accessibilityLabel="Plant image preview"
        />
      ) : (
        <OptimizedIcon
          name="leaf-outline"
          size={96}
          className="text-primary-500 dark:text-primary-300"
        />
      )}
      {isEditing && (
        <View className="mt-4 flex-row space-x-4">
          <GestureDetector gesture={pickImageGesture}>
            <Animated.View
              style={pickImageStyle}
              className="rounded-lg bg-primary-500 px-4 py-2"
              accessibilityRole="button"
              accessibilityLabel="Pick image from gallery">
              <ThemedText className="font-medium text-white">Pick Image</ThemedText>
            </Animated.View>
          </GestureDetector>
          <GestureDetector gesture={takePictureGesture}>
            <Animated.View
              style={takePictureStyle}
              className="rounded-lg bg-primary-500 px-4 py-2"
              accessibilityRole="button"
              accessibilityLabel="Take a new picture">
              <ThemedText className="font-medium text-white">Take Picture</ThemedText>
            </Animated.View>
          </GestureDetector>
        </View>
      )}
    </ThemedView>
  );
};

export default PlantImageSection;
