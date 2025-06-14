import { BlurView } from 'expo-blur';
import * as Haptics from '@/lib/utils/haptics';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Image, StyleSheet, ScrollView, useWindowDimensions, Alert } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
  interpolateColor,
  Extrapolation,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import CameraCapture from '../../components/diagnosis/CameraCapture';
import DiagnosisResultCard from '../../components/diagnosis/DiagnosisResultCard';
import PlantDoctorHero from '../../components/diagnosis/PlantDoctorHero';
import DatabaseResetButton from '../../components/ui/DatabaseResetButton';
import { OptimizedIcon } from '../../components/ui/OptimizedIcon';
import ThemedText from '../../components/ui/ThemedText';
import ThemedView from '../../components/ui/ThemedView';
import { SPRING_CONFIGS } from '../../lib/animations/presets';
import { useAuth } from '../../lib/contexts/AuthProvider';
import { analyzeImage } from '../../lib/services/diagnosis-service';
import { DiagnosisResult } from '../../lib/types/diagnosis';

// Animated Action Button Component
interface AnimatedControlButtonProps {
  onPress: () => void;
  icon: 'close' | 'camera';
  label: string;
  className?: string;
  disabled?: boolean;
}

const AnimatedControlButton: React.FC<AnimatedControlButtonProps> = ({
  onPress,
  icon,
  label,
  className = '',
  disabled = false,
}) => {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const handlePress = useCallback(() => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress, disabled]);

  const gesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      if (disabled) return;
      scale.value = withSpring(0.9, SPRING_CONFIGS.quick);
      pressed.value = withTiming(1, { duration: 100 });
    })
    .onFinalize(() => {
      'worklet';
      if (disabled) return;
      scale.value = withSpring(1, SPRING_CONFIGS.smooth);
      pressed.value = withTiming(0, { duration: 150 });
      runOnJS(handlePress)();
    });

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.value }],
      backgroundColor: interpolateColor(
        pressed.value,
        [0, 1],
        disabled
          ? ['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.3)'] // Disabled state - no color change
          : ['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.7)']
      ),
      opacity: disabled ? 0.4 : 1,
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        className={`rounded-full p-3 ${className}`}
        style={animatedStyle}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}>
        <OptimizedIcon
          name={icon}
          size={24}
          className={disabled ? 'text-white/60' : 'text-white'}
        />
      </Animated.View>
    </GestureDetector>
  );
};

export default function DiagnosisScreen() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();

  // State management
  const [image, setImage] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);

  // Strict-mode safe mount flag
  const isMounted = useRef(true);

  // Ensure the flag resets correctly on unmount for each mount cycle
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Animation values
  const imageScale = useSharedValue(0.9);
  const imageOpacity = useSharedValue(0);
  const loadingRotation = useSharedValue(0);
  const analysisScale = useSharedValue(0.8);
  const controlsOpacity = useSharedValue(0);

  // Animated styles
  const imagePreviewStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: imageScale.value }],
      opacity: imageOpacity.value,
    };
  });

  const loadingAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ rotateZ: `${loadingRotation.value}deg` }],
    };
  });

  const analysisOverlayStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: analysisScale.value }],
      opacity: interpolate(analysisScale.value, [0.8, 1], [0, 1], Extrapolation.CLAMP),
    };
  });

  const controlsStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: controlsOpacity.value,
    };
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      // Cancel all running animations
      cancelAnimation(loadingRotation);
      cancelAnimation(analysisScale);
      cancelAnimation(imageScale);
      cancelAnimation(imageOpacity);
      cancelAnimation(controlsOpacity);
    };
  }, []);

  // Animation effects
  useEffect(() => {
    if (image && !isAnalyzing) {
      // Image entrance animation
      imageScale.value = withSpring(1, SPRING_CONFIGS.smooth);
      imageOpacity.value = withTiming(1, { duration: 500 });
      controlsOpacity.value = withTiming(1, { duration: 600 });
    }
  }, [image, isAnalyzing]);

  useEffect(() => {
    if (isAnalyzing && isMounted.current) {
      // Loading animation with proper cleanup
      const startRotationLoop = () => {
        loadingRotation.value = withTiming(360, { duration: 2000 }, (finished) => {
          if (finished && isAnalyzing && isMounted.current) {
            loadingRotation.value = 0;
            startRotationLoop();
          }
        });
      };

      startRotationLoop();

      // Analysis overlay entrance
      analysisScale.value = withSequence(
        withSpring(1.05, SPRING_CONFIGS.quick),
        withSpring(1, SPRING_CONFIGS.smooth)
      );
    } else {
      analysisScale.value = withTiming(0.8, { duration: 300 });
    }
  }, [isAnalyzing]);

  // Event handlers
  const handleCameraToggle = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCameraMode((prev) => !prev);
    setDiagnosisResult(null);
  }, []);

  const handleAnalyzeImage = useCallback(
    async (imageUri: string) => {
      if (!user?.id) return;

      setIsAnalyzing(true);
      setDiagnosisResult(null);

      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        const result = await analyzeImage(imageUri, user.id);

        if (isMounted.current) {
          setDiagnosisResult(result);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (error) {
        console.error('Error analyzing image:', error);

        if (isMounted.current) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Analysis Failed', 'Please try again with a clearer image of your plant.');
        }
      } finally {
        if (isMounted.current) {
          setIsAnalyzing(false);
        }
      }
    },
    [user?.id]
  );

  const handleImageCaptured = useCallback(
    async (imageUri: string) => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setImage(imageUri);
      setCameraMode(false);
      handleAnalyzeImage(imageUri);
    },
    [handleAnalyzeImage]
  );

  const handleResetImage = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Exit animations
    imageScale.value = withTiming(0.8, { duration: 300 });
    imageOpacity.value = withTiming(0, { duration: 300 });
    controlsOpacity.value = withTiming(0, { duration: 200 });

    setTimeout(() => {
      setImage(null);
      setDiagnosisResult(null);
    }, 300);
  }, []);

  const handleRetryAnalysis = useCallback(() => {
    if (image) {
      handleAnalyzeImage(image);
    }
  }, [image, handleAnalyzeImage]);

  // Camera mode
  if (cameraMode) {
    return (
      <CameraCapture onImageCaptured={handleImageCaptured} onClose={() => setCameraMode(false)} />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      {/* Development reset button */}
      {__DEV__ && (
        <View className="items-center p-2">
          <DatabaseResetButton />
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}>
        {!image ? (
          // Hero Section
          <PlantDoctorHero onTakePhoto={handleCameraToggle} />
        ) : (
          // Image Analysis Section
          <ThemedView className="flex-1">
            {/* Image Preview */}
            <Animated.View style={imagePreviewStyle}>
              <View className="relative" style={{ width: '100%', height: width * 1.33 }}>
                <Image
                  source={{ uri: image }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />

                {/* Image Controls */}
                <Animated.View style={[styles.imageControls, controlsStyle]}>
                  <AnimatedControlButton
                    onPress={handleResetImage}
                    icon="close"
                    label="Remove image"
                    disabled={isAnalyzing}
                  />
                  <AnimatedControlButton
                    onPress={handleCameraToggle}
                    icon="camera"
                    label="Take new photo"
                    disabled={isAnalyzing}
                  />
                </Animated.View>

                {/* Analysis Overlay */}
                {isAnalyzing && (
                  <BlurView intensity={50} style={styles.analysisOverlay}>
                    <Animated.View style={analysisOverlayStyle}>
                      <ThemedView className="items-center rounded-3xl bg-white/95 px-8 py-10 shadow-xl dark:bg-neutral-800/95">
                        <Animated.View style={loadingAnimatedStyle}>
                          <OptimizedIcon name="loading1" size={48} color="#10b981" />
                        </Animated.View>

                        <ThemedText className="mt-6 text-xl font-bold text-primary-600 dark:text-primary-400">
                          Analyzing Plant...
                        </ThemedText>

                        <ThemedText className="mt-3 text-center text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                          Our AI is examining your plant for{'\n'}
                          diseases, pests, and nutrient deficiencies
                        </ThemedText>
                      </ThemedView>
                    </Animated.View>
                  </BlurView>
                )}
              </View>
            </Animated.View>

            {/* Diagnosis Results */}
            {diagnosisResult && !isAnalyzing && (
              <View className="p-6">
                <DiagnosisResultCard
                  diagnosisResult={diagnosisResult}
                  onRetry={handleRetryAnalysis}
                />
              </View>
            )}
          </ThemedView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  imageControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 48, // Account for safe area
  },
  analysisOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
