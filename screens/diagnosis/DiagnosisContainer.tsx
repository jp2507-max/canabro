import React, { useState, useCallback } from 'react';
import { useWindowDimensions, Alert } from 'react-native';
import { useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';

import DiagnosisView from './DiagnosisView';
import { useAuth } from '../../lib/contexts/AuthProvider';
import { useTheme } from '../../lib/contexts/ThemeContext';
import { resetDatabase } from '../../lib/database/database';
import { analyzeImage } from '../../lib/services/diagnosis-service';
import { DiagnosisResult } from '../../lib/types/diagnosis';

const INITIAL_STATE = {
  image: null as string | null,
  cameraMode: false,
  isAnalyzing: false,
  diagnosisResult: null as DiagnosisResult | null,
};

export default function DiagnosisContainer() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [image, setImage] = useState<string | null>(INITIAL_STATE.image);
  const [cameraMode, setCameraMode] = useState(INITIAL_STATE.cameraMode);
  const [isAnalyzing, setIsAnalyzing] = useState(INITIAL_STATE.isAnalyzing);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(
    INITIAL_STATE.diagnosisResult
  );

  // Animation shared values
  const companionScale = useSharedValue(1);
  const companionY = useSharedValue(0);
  const loadingRotation = useSharedValue(0);

  React.useEffect(() => {
    companionY.value = withRepeat(
      withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
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

  const handleCameraToggle = useCallback(() => {
    setCameraMode((prev) => !prev);
    setDiagnosisResult(null);
  }, []);

  const handleImageCaptured = useCallback((imageUri: string) => {
    setImage(imageUri);
    setCameraMode(false);
    handleAnalyzeImage(imageUri);
  }, []);

  const handleAnalyzeImage = useCallback(
    async (imageUri: string) => {
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
    },
    [user?.id]
  );

  const resetImage = useCallback(() => {
    setImage(null);
    setDiagnosisResult(null);
  }, []);

  const handleResetDatabase = useCallback(() => {
    Alert.alert(
      'Confirm Reset',
      'Are you sure you want to delete the local database? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetDatabase();
            setImage(null);
            setDiagnosisResult(null);
          },
        },
      ]
    );
  }, []);

  return (
    <DiagnosisView
      theme={theme}
      image={image}
      cameraMode={cameraMode}
      isAnalyzing={isAnalyzing}
      diagnosisResult={diagnosisResult}
      companionScale={companionScale}
      companionY={companionY}
      loadingRotation={loadingRotation}
      width={width}
      onCameraToggle={handleCameraToggle}
      onImageCaptured={handleImageCaptured}
      onAnalyzeImage={handleAnalyzeImage}
      onResetImage={resetImage}
      onResetDatabase={handleResetDatabase}
    />
  );
}
