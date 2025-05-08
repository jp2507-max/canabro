import React, { memo } from 'react';
import { View, ScrollView, Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CameraCapture from '../../components/diagnosis/CameraCapture';
import ThemedText from '../../components/ui/ThemedText';
import ThemedView from '../../components/ui/ThemedView';
import { Feather } from '@expo/vector-icons';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { DiagnosisResult } from '../../lib/types/diagnosis';

interface DiagnosisViewProps {
  theme: any;
  image: string | null;
  cameraMode: boolean;
  isAnalyzing: boolean;
  diagnosisResult: DiagnosisResult | null;
  companionScale: any;
  companionY: any;
  loadingRotation: any;
  width: number;
  onCameraToggle: () => void;
  onImageCaptured: (imageUri: string) => void;
  onAnalyzeImage: (imageUri: string) => void;
  onResetImage: () => void;
  onResetDatabase: () => void;
}

const DiagnosisView = memo(function DiagnosisView({
  theme,
  image,
  cameraMode,
  isAnalyzing,
  diagnosisResult,
  companionScale,
  companionY,
  loadingRotation,
  width,
  onCameraToggle,
  onImageCaptured,
  onAnalyzeImage,
  onResetImage,
  onResetDatabase,
}: DiagnosisViewProps) {
  const companionAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: companionY.value }, { scale: companionScale.value }],
  }));
  const loadingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${loadingRotation.value}deg` }],
  }));

  if (cameraMode) {
    return <CameraCapture onImageCaptured={onImageCaptured} onClose={onCameraToggle} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ padding: 10 }}>
        <Button title="!!! RESET DATABASE !!!" color="red" onPress={onResetDatabase} />
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <ThemedView className="p-5">
          <ThemedText
            className="mb-3 text-xl font-bold"
            lightClassName="text-emerald-800"
            darkClassName="text-emerald-400">
            Diagnosis Results
          </ThemedText>
          {diagnosisResult && (
            <DiagnosisResultCard
              diagnosisResult={diagnosisResult}
              theme={theme}
            />
          )}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
});

interface DiagnosisResultCardProps {
  diagnosisResult: DiagnosisResult;
  theme: any;
}

const DiagnosisResultCard = memo(function DiagnosisResultCard({ diagnosisResult, theme }: DiagnosisResultCardProps) {
  return (
    <ThemedView
      className="mb-4 rounded-xl p-4"
      lightClassName="bg-emerald-50"
      darkClassName="bg-emerald-950/30">
      <ThemedText
        className="mb-1 text-lg font-bold"
        lightClassName="text-emerald-800"
        darkClassName="text-emerald-400">
        {diagnosisResult.details?.name || 'Unknown Issue'}
      </ThemedText>
      <View className="mb-3 flex-row items-center">
        <ThemedText
          className="mr-2 text-sm"
          lightClassName="text-emerald-700"
          darkClassName="text-emerald-300">
          Confidence:
        </ThemedText>
        <View
          style={{
            height: 8,
            width: 100,
            backgroundColor: theme.colors.neutral[200],
            borderRadius: 4,
            overflow: 'hidden',
          }}>
          <View
            style={{
              height: '100%',
              width: `${diagnosisResult.confidence * 100}%`,
              backgroundColor: theme.colors.primary[500],
              borderRadius: 4,
            }}
          />
        </View>
        <ThemedText
          className="ml-2 text-sm"
          lightClassName="text-neutral-500"
          darkClassName="text-neutral-400">
          {Math.round(diagnosisResult.confidence * 100)}%
        </ThemedText>
      </View>
      <ThemedText
        className="mb-4"
        lightClassName="text-neutral-700"
        darkClassName="text-neutral-300">
        {diagnosisResult.details?.description || 'No description available'}
      </ThemedText>
      <ThemedText
        className="mb-2 font-medium"
        lightClassName="text-emerald-800"
        darkClassName="text-emerald-400">
        Recommendations:
      </ThemedText>
      {diagnosisResult.details?.recommendations.map((rec, index) => (
        <View key={index} className="mb-2 flex-row items-start">
          <Feather
            name="check-circle"
            size={16}
            color={theme.colors.primary[500]}
            style={{ marginTop: 2, marginRight: 8 }}
          />
          <ThemedText
            lightClassName="text-neutral-700"
            darkClassName="text-neutral-300">
            {rec}
          </ThemedText>
        </View>
      ))}
    </ThemedView>
  );
});

export default DiagnosisView;
