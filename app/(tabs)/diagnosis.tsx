import React, { useState, useRef } from 'react';
import { View, Image, StyleSheet, ScrollView, useWindowDimensions, TouchableOpacity, ActivityIndicator, Button, Alert } from 'react-native'; // Added Button, Alert
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { resetDatabase } from '../../lib/database/database'; // Added resetDatabase import
import { AntDesign, Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import ThemedView from '../../components/ui/ThemedView';
import ThemedText from '../../components/ui/ThemedText';
import CameraCapture from '../../components/diagnosis/CameraCapture';
import { useTheme } from '../../lib/contexts/ThemeContext';
import { analyzeImage } from '../../lib/services/diagnosis-service';
import { useAuth } from '../../lib/contexts/AuthProvider';
import { DiagnosisResult } from '../../lib/types/diagnosis';

export default function DiagnosisScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [image, setImage] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const { width } = useWindowDimensions();

  // Animation values
  const companionScale = useSharedValue(1);
  const companionY = useSharedValue(0);
  const loadingRotation = useSharedValue(0);

  // Set up animated styles
  const companionAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: companionY.value },
        { scale: companionScale.value }
      ]
    };
  });

  const loadingAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotateZ: `${loadingRotation.value}deg` }]
    };
  });

  // Animate the companion character
  React.useEffect(() => {
    // Start a gentle floating animation
    companionY.value = withRepeat(
      withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Add a subtle "breathing" scale effect
    companionScale.value = withRepeat(
      withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    if (isAnalyzing) {
      loadingRotation.value = withRepeat(
        withTiming(360, { duration: 1500, easing: Easing.linear }),
        -1,
        false
      );
    }
  }, [isAnalyzing]);

  const handleCameraToggle = () => {
    setCameraMode(!cameraMode);
    setDiagnosisResult(null);
  };

  const handleImageCaptured = (imageUri: string) => {
    setImage(imageUri);
    setCameraMode(false);
    handleAnalyzeImage(imageUri);
  };

  const handleAnalyzeImage = async (imageUri: string) => {
    if (!user?.id) return;
    
    setIsAnalyzing(true);
    setDiagnosisResult(null);
    
    try {
      const result = await analyzeImage(imageUri, user.id);
      setDiagnosisResult(result);
    } catch (error) {
      console.error('Error analyzing image:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetImage = () => {
    setImage(null);
    setDiagnosisResult(null);
  };

  if (cameraMode) {
    return <CameraCapture onImageCaptured={handleImageCaptured} onClose={() => setCameraMode(false)} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* --- TEMPORARY RESET BUTTON --- */}
      <View style={{ padding: 10 }}>
        <Button title="!!! RESET DATABASE !!!" color="red" onPress={async () => {
          Alert.alert(
            "Confirm Reset",
            "Are you sure you want to delete the local database? This cannot be undone.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Reset", style: "destructive", onPress: async () => {
                  console.log('Attempting DB reset...');
                  const success = await resetDatabase();
                  console.log('Reset success:', success);
                  Alert.alert('Reset Attempted', `Database reset ${success ? 'successful' : 'failed'}. Please fully restart the app now.`);
                }
              }
            ]
          );
        }} />
      </View>
      {/* --- END TEMPORARY BUTTON --- */}
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {!image ? (
          <ThemedView className="flex-1 justify-center items-center p-6">
            <Animated.View style={[companionAnimatedStyle, { marginBottom: 20 }]}>
              <Image
                source={require('../../assets/icon.png')}
                style={{ width: 120, height: 120 }}
                resizeMode="contain"
              />
            </Animated.View>
            
            <ThemedText 
              className="text-2xl font-bold mb-2 text-center"
              lightClassName="text-emerald-800"
              darkClassName="text-emerald-400"
            >
              Plant Doctor
            </ThemedText>
            
            <ThemedText 
              className="text-base mb-8 text-center"
              lightClassName="text-gray-700"
              darkClassName="text-gray-300"
            >
              Take a photo of your plant to diagnose any problems it may have
            </ThemedText>
            
            <TouchableOpacity
              onPress={handleCameraToggle}
              style={{
                backgroundColor: theme.colors.primary[500],
                paddingHorizontal: 20,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                minWidth: width * 0.7,
              }}
            >
              <AntDesign name="camera" size={20} color="white" style={{ marginRight: 10 }} />
              <ThemedText className="text-white font-semibold text-base">
                Take a Photo
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : (
          <ThemedView className="flex-1">
            {/* Image preview */}
            <View style={{ width: '100%', height: width * 1.33, position: 'relative' }}>
              <Image
                source={{ uri: image }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
              
              {/* Controls overlay */}
              <View style={styles.imageControls}>
                <TouchableOpacity onPress={resetImage}>
                  <AntDesign name="close" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCameraToggle}>
                  <AntDesign name="camera" size={24} color="white" />
                </TouchableOpacity>
              </View>
              
              {/* Analysis overlay */}
              {isAnalyzing && (
                <BlurView intensity={40} style={styles.analysisOverlay}>
                  <ThemedView className="bg-white/90 dark:bg-neutral-800/90 px-6 py-8 rounded-2xl items-center">
                    <Animated.View style={loadingAnimatedStyle}>
                      <AntDesign name="loading1" size={36} color={theme.colors.primary[500]} />
                    </Animated.View>
                    <ThemedText className="text-lg font-medium mt-4">
                      Analyzing your plant...
                    </ThemedText>
                    <ThemedText className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
                      Our AI is looking for signs of nutrient deficiencies, pests, and diseases
                    </ThemedText>
                  </ThemedView>
                </BlurView>
              )}
            </View>
            
            {/* Diagnosis Results */}
            {diagnosisResult && (
              <ThemedView className="p-5">
                <ThemedText className="text-xl font-bold mb-3" lightClassName="text-emerald-800" darkClassName="text-emerald-400">
                  Diagnosis Results
                </ThemedText>
                
                <ThemedView className="rounded-xl p-4 mb-4" lightClassName="bg-emerald-50" darkClassName="bg-emerald-950/30">
                  <ThemedText className="text-lg font-bold mb-1" lightClassName="text-emerald-800" darkClassName="text-emerald-400">
                    {diagnosisResult.details?.name || 'Unknown Issue'}
                  </ThemedText>
                  
                  <View className="flex-row items-center mb-3">
                    <ThemedText className="text-sm mr-2" lightClassName="text-emerald-700" darkClassName="text-emerald-300">
                      Confidence:
                    </ThemedText>
                    <View style={{ 
                      height: 8, 
                      width: 100, 
                      backgroundColor: theme.colors.neutral[200],
                      borderRadius: 4,
                      overflow: 'hidden'
                    }}>
                      <View style={{ 
                        height: '100%', 
                        width: `${diagnosisResult.confidence * 100}%`,
                        backgroundColor: theme.colors.primary[500],
                        borderRadius: 4
                      }} />
                    </View>
                    <ThemedText className="text-sm ml-2" lightClassName="text-neutral-500" darkClassName="text-neutral-400">
                      {Math.round(diagnosisResult.confidence * 100)}%
                    </ThemedText>
                  </View>
                  
                  <ThemedText className="mb-4" lightClassName="text-neutral-700" darkClassName="text-neutral-300">
                    {diagnosisResult.details?.description || 'No description available'}
                  </ThemedText>
                  
                  <ThemedText className="font-medium mb-2" lightClassName="text-emerald-800" darkClassName="text-emerald-400">
                    Recommendations:
                  </ThemedText>
                  
                  {diagnosisResult.details?.recommendations.map((rec, index) => (
                    <View key={index} className="flex-row items-start mb-2">
                      <Feather name="check-circle" size={16} color={theme.colors.primary[500]} style={{ marginTop: 2, marginRight: 8 }} />
                      <ThemedText lightClassName="text-neutral-700" darkClassName="text-neutral-300">
                        {rec}
                      </ThemedText>
                    </View>
                  ))}
                </ThemedView>
              </ThemedView>
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
    backgroundColor: 'rgba(0,0,0,0.3)',
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
