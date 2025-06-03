import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { SPRING_CONFIGS } from '../../lib/animations/presets';

// Define the types based on expo-camera documentation
type CameraType = 'front' | 'back';
type FlashMode = 'off' | 'on' | 'auto';

type CameraCaptureProps = {
  onImageCaptured: (imageUri: string) => void;
  onClose: () => void;
};

const CameraCapture: React.FC<CameraCaptureProps> = ({ onImageCaptured, onClose }) => {
  const { width, height } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const cameraRef = useRef<any>(null);

  // Animation values
  const captureScale = useSharedValue(1);
  const captureRotation = useSharedValue(0);
  const controlsOpacity = useSharedValue(0);
  const permissionScale = useSharedValue(0.8);

  // Animated styles
  const captureButtonStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: captureScale.value },
      { rotate: `${captureRotation.value}deg` }
    ],
  }));

  const controlsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      controlsOpacity.value,
      [0, 1],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  const permissionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: permissionScale.value }],
  }));

  // Initialize entrance animations
  useEffect(() => {
    controlsOpacity.value = withTiming(1, { duration: 500 });
    permissionScale.value = withSpring(1, SPRING_CONFIGS.smooth);
  }, []);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Trigger haptic feedback helper
  const triggerCaptureHaptic = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  // Gesture handlers
  const captureGesture = Gesture.Tap()
    .onStart(() => {
      'worklet';
      captureScale.value = withSequence(
        withSpring(0.9, SPRING_CONFIGS.quick),
        withSpring(1, SPRING_CONFIGS.smooth)
      );
      captureRotation.value = withSequence(
        withTiming(5, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );
      
      // Trigger haptic feedback on main thread
      runOnJS(triggerCaptureHaptic)();
    })
    .onEnd(() => {
      'worklet';
      // Take the picture on main thread
      runOnJS(takePicture)();
    });

  const closeGesture = Gesture.Tap()
    .onStart(() => {
      'worklet';
      controlsOpacity.value = withTiming(0, { duration: 300 });
    })
    .onEnd(() => {
      'worklet';
      runOnJS(handleClose)();
    });

  const handleCameraTypeToggle = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCameraType((prevType) => (prevType === 'back' ? 'front' : 'back'));
  }, []);

  const handleFlashToggle = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFlashMode((prevMode) => (prevMode === 'off' ? 'on' : 'off'));
  }, []);

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      const result = await cameraRef.current.takePictureAsync();
      if (result && result.uri) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onImageCaptured(result.uri);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', 'Failed to capture image');
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to take picture');
    }
  }, [onImageCaptured]);

  const pickImage = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]?.uri) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onImageCaptured(result.assets[0].uri);
    }
  }, [onImageCaptured]);

  const handleClose = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    controlsOpacity.value = withTiming(0, { duration: 300 });
    setTimeout(onClose, 300);
  }, [onClose]);

  const handlePermissionRequest = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    permissionScale.value = withSequence(
      withSpring(0.95, SPRING_CONFIGS.quick),
      withSpring(1, SPRING_CONFIGS.smooth)
    );
    requestPermission();
  }, [requestPermission]);

  if (!permission) {
    return (
      <ThemedView className="flex-1 items-center justify-center bg-neutral-900">
        <Animated.View style={permissionStyle}>
          <ThemedText className="text-lg text-white">Requesting camera permission...</ThemedText>
        </Animated.View>
      </ThemedView>
    );
  }

  if (!permission.granted) {
    return (
      <ThemedView className="flex-1 items-center justify-center bg-neutral-900 px-6">
        <Animated.View style={[permissionStyle, { alignItems: 'center' }]}>
          <OptimizedIcon name="camera" size={48} color="#10b981" style={{ marginBottom: 20 }} />
          <ThemedText className="mb-6 text-center text-xl font-bold text-white">
            Camera Access Required
          </ThemedText>
          <ThemedText className="mb-8 text-center text-base text-neutral-300">
            Please allow camera access to take photos of your plants for diagnosis
          </ThemedText>
          
          <TouchableOpacity
            onPress={handlePermissionRequest}
            className="mb-4 rounded-2xl bg-primary-500 px-8 py-4"
            accessibilityRole="button"
            accessibilityLabel="Grant camera permission">
            <ThemedText className="text-center font-semibold text-white">
              Grant Permission
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleClose}
            className="rounded-2xl bg-neutral-600 px-8 py-4"
            accessibilityRole="button"
            accessibilityLabel="Go back without granting permission">
            <ThemedText className="text-center font-medium text-white">
              Go Back
            </ThemedText>
          </TouchableOpacity>
        </Animated.View>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={cameraType}
          flash={flashMode}
          onCameraReady={() => console.log('Camera ready')}
          onMountError={(error) => {
            console.error('Camera mount error:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Failed to initialize camera');
          }}>
          
          <Animated.View style={[styles.cameraContent, controlsStyle]}>
            {/* Top controls */}
            <ThemedView className="absolute left-0 right-0 top-0 flex-row justify-between p-4 pt-safe bg-black/30">
              <GestureDetector gesture={closeGesture}>
                <Animated.View
                  className="rounded-full bg-black/40 p-3"
                  accessibilityRole="button"
                  accessibilityLabel="Close camera">
                  <OptimizedIcon name="close" size={24} color="white" />
                </Animated.View>
              </GestureDetector>
              
              <TouchableOpacity 
                onPress={handleFlashToggle}
                className="rounded-full bg-black/40 p-3"
                accessibilityRole="button"
                accessibilityLabel={`Toggle flash ${flashMode === 'on' ? 'off' : 'on'}`}>
                <OptimizedIcon
                  name={flashMode === 'on' ? 'flash' : 'flash-off'}
                  size={24}
                  color={flashMode === 'on' ? '#10b981' : 'white'}
                />
              </TouchableOpacity>
            </ThemedView>

            {/* Bottom controls */}
            <ThemedView className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between px-8 py-6 pb-safe bg-black/30">
              <TouchableOpacity 
                onPress={pickImage}
                className="rounded-full bg-black/40 p-4"
                accessibilityRole="button"
                accessibilityLabel="Select image from gallery">
                <OptimizedIcon name="image-outline" size={30} color="white" />
              </TouchableOpacity>

              <GestureDetector gesture={captureGesture}>
                <Animated.View
                  style={[styles.captureButton, captureButtonStyle]}
                  accessibilityRole="button"
                  accessibilityLabel="Take photo">
                  <Animated.View style={styles.captureButtonInner} />
                </Animated.View>
              </GestureDetector>

              <TouchableOpacity 
                onPress={handleCameraTypeToggle}
                className="rounded-full bg-black/40 p-4"
                accessibilityRole="button"
                accessibilityLabel={`Switch to ${cameraType === 'back' ? 'front' : 'back'} camera`}>
                <OptimizedIcon name="camera-flip-outline" size={30} color="white" />
              </TouchableOpacity>
            </ThemedView>
          </Animated.View>
        </CameraView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  cameraContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  captureButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'white',
    borderWidth: 3,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
});

export default React.memo(CameraCapture);
