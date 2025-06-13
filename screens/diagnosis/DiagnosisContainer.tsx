import React, { useState, useCallback } from 'react';
import { useWindowDimensions, Alert } from 'react-native';

import DiagnosisView from './DiagnosisView';
import { useAuth } from '../../lib/contexts/AuthProvider';
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
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [image, setImage] = useState<string | null>(INITIAL_STATE.image);
  const [cameraMode, setCameraMode] = useState(INITIAL_STATE.cameraMode);
  const [isAnalyzing, setIsAnalyzing] = useState(INITIAL_STATE.isAnalyzing);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(
    INITIAL_STATE.diagnosisResult
  );

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
      image={image}
      cameraMode={cameraMode}
      isAnalyzing={isAnalyzing}
      diagnosisResult={diagnosisResult}
      onCameraToggle={handleCameraToggle}
      onImageCaptured={handleImageCaptured}
      onAnalyzeImage={handleAnalyzeImage}
      onResetImage={resetImage}
      onResetDatabase={handleResetDatabase}
    />
  );
}
