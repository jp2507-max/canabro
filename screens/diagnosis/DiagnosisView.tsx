import React, { memo } from 'react';
import { View, ScrollView, Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CameraCapture from '../../components/diagnosis/CameraCapture';
import { OptimizedIcon } from '../../components/ui/OptimizedIcon';
import ThemedText from '../../components/ui/ThemedText';
import ThemedView from '../../components/ui/ThemedView';
import type { DiagnosisResult } from '../../lib/types/diagnosis';

interface DiagnosisViewProps {
  image: string | null;
  cameraMode: boolean;
  isAnalyzing: boolean;
  diagnosisResult: DiagnosisResult | null;
  onCameraToggle: () => void;
  onImageCaptured: (imageUri: string) => void;
  onAnalyzeImage: (imageUri: string) => void;
  onResetImage: () => void;
  onResetDatabase: () => void;
}

const DiagnosisView = memo(function DiagnosisView({
  image,
  cameraMode,
  isAnalyzing,
  diagnosisResult,
  onCameraToggle,
  onImageCaptured,
  onAnalyzeImage,
  onResetImage,
  onResetDatabase,
}: DiagnosisViewProps) {
  if (cameraMode) {
    return <CameraCapture onImageCaptured={onImageCaptured} onClose={onCameraToggle} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      <View className="p-2.5">
        <Button title="!!! RESET DATABASE !!!" color="red" onPress={onResetDatabase} />
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <ThemedView className="p-5">
          <ThemedText className="mb-3 text-xl font-bold text-emerald-800 dark:text-emerald-400">
            Diagnosis Results
          </ThemedText>
          {diagnosisResult && <DiagnosisResultCard diagnosisResult={diagnosisResult} />}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
});

interface DiagnosisResultCardProps {
  diagnosisResult: DiagnosisResult;
}

const DiagnosisResultCard = memo(function DiagnosisResultCard({
  diagnosisResult,
}: DiagnosisResultCardProps) {
  return (
    <ThemedView className="mb-4 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
      <ThemedText className="mb-1 text-lg font-bold text-emerald-800 dark:text-emerald-400">
        {diagnosisResult.details?.name || 'Unknown Issue'}
      </ThemedText>
      <View className="mb-3 flex-row items-center">
        <ThemedText className="mr-2 text-sm text-emerald-700 dark:text-emerald-300">
          Confidence:
        </ThemedText>
        <View className="h-2 w-[100px] overflow-hidden rounded-sm bg-neutral-200 dark:bg-neutral-700">
          <View
            className="h-full rounded-sm bg-primary-500"
            style={{ width: `${diagnosisResult.confidence * 100}%` }}
          />
        </View>
        <ThemedText className="ml-2 text-sm text-neutral-500 dark:text-neutral-400">
          {Math.round(diagnosisResult.confidence * 100)}%
        </ThemedText>
      </View>
      <ThemedText className="mb-4 text-neutral-700 dark:text-neutral-300">
        {diagnosisResult.details?.description || 'No description available'}
      </ThemedText>
      <ThemedText className="mb-2 font-medium text-emerald-800 dark:text-emerald-400">
        Recommendations:
      </ThemedText>
      {diagnosisResult.details?.recommendations.map((rec, index) => (
        <View key={index} className="mb-2 flex-row items-start">
          <OptimizedIcon name="check-circle" size={16} className="mr-2 mt-0.5 text-primary-500" />
          <ThemedText className="flex-1 text-neutral-700 dark:text-neutral-300">{rec}</ThemedText>
        </View>
      ))}
    </ThemedView>
  );
});

export default DiagnosisView;
