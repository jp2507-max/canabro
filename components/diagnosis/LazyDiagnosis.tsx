import React, { Suspense, lazy } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

// Lazy load TensorFlow.js only when needed for diagnosis features
const DiagnosisAI = lazy(() => import('./DiagnosisAICore.tsx'));

interface LazyDiagnosisProps {
  image?: string;
  onDiagnosisComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

const LoadingFallback = () => (
  <View className="flex-1 justify-center items-center p-4">
    <ActivityIndicator size="large" color="#16a34a" />
    <Text className="mt-2 text-gray-600">Loading AI diagnosis...</Text>
  </View>
);

export function LazyDiagnosis({ image, onDiagnosisComplete, onError }: LazyDiagnosisProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DiagnosisAI 
        image={image}
        onDiagnosisComplete={onDiagnosisComplete}
        onError={onError}
      />
    </Suspense>
  );
}

export default LazyDiagnosis;
