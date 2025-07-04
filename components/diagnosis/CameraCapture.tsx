import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerSuccessHaptic,
  triggerErrorHaptic,
} from '@/lib/utils/haptics';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { selectFromGallery } from '@/lib/utils/image-picker';
import { View, StyleSheet, Alert } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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

import { SPRING_CONFIGS } from '../../lib/animations/presets';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import ThemedText from '../ui/ThemedText';
import ThemedView from '../ui/ThemedView';

type CameraCaptureProps = {
  onImageCaptured: (imageUri: string) => void;
  onClose: () => void;
};

const CameraCapture: React.FC<CameraCaptureProps> = ({ onImageCaptured, onClose }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<'front' | 'back'>('back');
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
  const cameraRef = useRef<CameraView>(null);

  // Animation values
  const captureScale = useSharedValue(1);
  const captureRotation = useSharedValue(0);
  const controlsOpacity = useSharedValue(0);
  const permissionScale = useSharedValue(0.8);
  const flashButtonScale = useSharedValue(1);
  const galleryButtonScale = useSharedValue(1);
  const flipButtonScale = useSharedValue(1);
  const permissionButtonScale = useSharedValue(1);
  const backButtonScale = useSharedValue(1);

  // Animated styles
  const captureButtonStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: captureScale.value }, { rotate: `${captureRotation.value}deg` }],
    };
  });

  const controlsStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: interpolate(controlsOpacity.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    };
  });

  const permissionStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: permissionScale.value }],
    };
  });

  const flashButtonStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: flashButtonScale.value }],
    };
  });

  const galleryButtonStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: galleryButtonScale.value }],
    };
  });

  const flipButtonStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: flipButtonScale.value }],
    };
  });

  const permissionButtonStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: permissionButtonScale.value }],
    };
  });

  const backButtonStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: backButtonScale.value }],
    };
  });

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
  const triggerCaptureHaptic = useCallback(() => {
    triggerMediumHaptic();
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

  // 🎯 Enhanced Flash Toggle Gesture
  const flashGesture = Gesture.Tap()
    .onStart(() => {
      'worklet';
      flashButtonScale.value = withSequence(
        withSpring(0.9, SPRING_CONFIGS.quick),
        withSpring(1, SPRING_CONFIGS.smooth)
      );
    })
    .onEnd(() => {
      'worklet';
      runOnJS(handleFlashToggle)();
    });

  // 🎯 Enhanced Gallery Button Gesture
  const galleryGesture = Gesture.Tap()
    .onStart(() => {
      'worklet';
      galleryButtonScale.value = withSequence(
        withSpring(0.9, SPRING_CONFIGS.quick),
        withSpring(1, SPRING_CONFIGS.smooth)
      );
    })
    .onEnd(() => {
      'worklet';
      runOnJS(pickImage)();
    });

  // 🎯 Enhanced Camera Flip Gesture
  const flipGesture = Gesture.Tap()
    .onStart(() => {
      'worklet';
      flipButtonScale.value = withSequence(
        withSpring(0.9, SPRING_CONFIGS.quick),
        withSpring(1, SPRING_CONFIGS.smooth)
      );
    })
    .onEnd(() => {
      'worklet';
      runOnJS(handleCameraTypeToggle)();
    });

  // 🎯 Enhanced Permission Button Gesture
  const permissionGesture = Gesture.Tap()
    .onStart(() => {
      'worklet';
      permissionButtonScale.value = withSequence(
        withSpring(0.95, SPRING_CONFIGS.quick),
        withSpring(1, SPRING_CONFIGS.smooth)
      );
    })
    .onEnd(() => {
      'worklet';
      runOnJS(handlePermissionRequest)();
    });

  // 🎯 Enhanced Back Button Gesture
  const backGesture = Gesture.Tap()
    .onStart(() => {
      'worklet';
      backButtonScale.value = withSequence(
        withSpring(0.95, SPRING_CONFIGS.quick),
        withSpring(1, SPRING_CONFIGS.smooth)
      );
    })
    .onEnd(() => {
      'worklet';
      runOnJS(handleClose)();
    });

  const handleCameraTypeToggle = useCallback(async () => {
    await triggerLightHaptic();
    setCameraType((prevType) => (prevType === 'back' ? 'front' : 'back'));
  }, []);

  const handleFlashToggle = useCallback(async () => {
    await triggerLightHaptic();
    setFlashMode((prevMode) => (prevMode === 'off' ? 'on' : 'off'));
  }, []);

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      const result = await cameraRef.current.takePictureAsync();
      if (result && result.uri) {
        await triggerSuccessHaptic();
        onImageCaptured(result.uri);
      } else {
        await triggerErrorHaptic();
        Alert.alert('Error', 'Failed to capture image');
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      await triggerErrorHaptic();
      Alert.alert('Error', 'Failed to take picture');
    }
  }, [onImageCaptured]);

  const pickImage = useCallback(async () => {
    await triggerMediumHaptic();

    const result = await selectFromGallery();
    if (result) {
      await triggerSuccessHaptic();
      onImageCaptured(result.uri);
    }
  }, [onImageCaptured]);

  const handleClose = useCallback(async () => {
    await triggerLightHaptic();
    controlsOpacity.value = withTiming(0, { duration: 300 });
    setTimeout(onClose, 300);
  }, [onClose]);

  const handlePermissionRequest = useCallback(async () => {
    await triggerMediumHaptic();
    permissionScale.value = withSequence(
      withSpring(0.95, SPRING_CONFIGS.quick),
      withSpring(1, SPRING_CONFIGS.smooth)
    );
    await requestPermission();
  }, [requestPermission]);

  if (permission === null) {
    return (
      <ThemedView className="flex-1 items-center justify-center bg-neutral-900">
        <Animated.View style={permissionStyle}>
          <ThemedText className="text-lg text-white">Requesting camera permission...</ThemedText>
        </Animated.View>
      </ThemedView>
    );
  }

  if (!permission?.granted) {
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

          {/* 🎯 Enhanced Permission Button */}
          <GestureDetector gesture={permissionGesture}>
            <Animated.View
              style={permissionButtonStyle}
              className="mb-4 rounded-2xl bg-primary-500 px-8 py-4"
              accessibilityRole="button"
              accessibilityLabel="Grant camera permission">
              <ThemedText className="text-center font-semibold text-white">
                Grant Permission
              </ThemedText>
            </Animated.View>
          </GestureDetector>

          {/* 🎯 Enhanced Back Button */}
          <GestureDetector gesture={backGesture}>
            <Animated.View
              style={backButtonStyle}
              className="rounded-2xl bg-neutral-600 px-8 py-4"
              accessibilityRole="button"
              accessibilityLabel="Go back without granting permission">
              <ThemedText className="text-center font-medium text-white">Go Back</ThemedText>
            </Animated.View>
          </GestureDetector>
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
            triggerErrorHaptic();
            Alert.alert('Error', 'Failed to initialize camera');
          }}>
          <Animated.View style={[styles.cameraContent, controlsStyle]}>
            {/* Top controls */}
            <ThemedView className="pt-safe absolute left-0 right-0 top-0 flex-row justify-between bg-black/30 p-4">
              <GestureDetector gesture={closeGesture}>
                <Animated.View
                  className="rounded-full bg-black/40 p-3"
                  accessibilityRole="button"
                  accessibilityLabel="Close camera">
                  <OptimizedIcon name="close" size={24} color="white" />
                </Animated.View>
              </GestureDetector>

              {/* 🎯 Enhanced Flash Toggle */}
              <GestureDetector gesture={flashGesture}>
                <Animated.View
                  style={flashButtonStyle}
                  className="rounded-full bg-black/40 p-3"
                  accessibilityRole="button"
                  accessibilityLabel={`Toggle flash ${flashMode === 'on' ? 'off' : 'on'}`}>
                  <OptimizedIcon
                    name={flashMode === 'on' ? 'flash' : 'flash-off'}
                    size={24}
                    color={flashMode === 'on' ? '#10b981' : 'white'}
                  />
                </Animated.View>
              </GestureDetector>
            </ThemedView>

            {/* Bottom controls */}
            <ThemedView className="pb-safe absolute bottom-0 left-0 right-0 flex-row items-center justify-between bg-black/30 px-8 py-6">
              {/* 🎯 Enhanced Gallery Button */}
              <GestureDetector gesture={galleryGesture}>
                <Animated.View
                  style={galleryButtonStyle}
                  className="rounded-full bg-black/40 p-4"
                  accessibilityRole="button"
                  accessibilityLabel="Select image from gallery">
                  <OptimizedIcon name="image-outline" size={30} color="white" />
                </Animated.View>
              </GestureDetector>

              <GestureDetector gesture={captureGesture}>
                <Animated.View
                  style={[styles.captureButton, captureButtonStyle]}
                  accessibilityRole="button"
                  accessibilityLabel="Take photo">
                  <Animated.View style={styles.captureButtonInner} />
                </Animated.View>
              </GestureDetector>

              {/* 🎯 Enhanced Camera Flip Button */}
              <GestureDetector gesture={flipGesture}>
                <Animated.View
                  style={flipButtonStyle}
                  className="rounded-full bg-black/40 p-4"
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to ${cameraType === 'back' ? 'front' : 'back'} camera`}>
                  <OptimizedIcon name="camera-flip-outline" size={30} color="white" />
                </Animated.View>
              </GestureDetector>
            </ThemedView>
          </Animated.View>
        </CameraView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  camera: {
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  cameraContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  captureButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 40,
    elevation: 8,
    height: 80,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    width: 80,
  },
  captureButtonInner: {
    backgroundColor: 'white',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 34,
    borderWidth: 3,
    height: 68,
    width: 68,
  },
  container: {
    backgroundColor: '#000',
    flex: 1,
  },
});

export default React.memo(CameraCapture);
