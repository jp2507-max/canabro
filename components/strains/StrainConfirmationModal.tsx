import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Modal, Pressable, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';

import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type Environment,
  type Hemisphere,
  type PlantType,
  type StrainPredictions,
  preparePlantPredictions,
  inferPlantType,
} from '@/lib/services/StrainIntegrationService';
import { RawStrainApiResponse } from '@/lib/types/weed-db';
import { normalizeDifficultyString } from '@/lib/services/GuidanceService';

// Safely read difficulty across possible vendor key variants without unsafe casts
function getRawDifficulty(s: RawStrainApiResponse | null | undefined): string | null | undefined {
  if (!s) return undefined;
  if (typeof s.growDifficulty === 'string' || s.growDifficulty === null) {
    return s.growDifficulty;
  }
  const asRecord = s as Record<string, unknown>;
  const snakeCase = asRecord['grow_difficulty'];
  if (typeof snakeCase === 'string' || snakeCase === null) {
    return snakeCase as string | null;
  }
  const alt = asRecord['difficulty'];
  if (typeof alt === 'string' || alt === null) {
    return alt as string | null;
  }
  return undefined;
}

type ConfirmSettings = {
  environment: Environment;
  hemisphere: Hemisphere;
  plantType: PlantType;
  predictions: StrainPredictions;
};

export interface StrainConfirmationModalProps {
  visible: boolean;
  strain: RawStrainApiResponse | null;
  plantedDateISO?: string | null;
  defaultEnvironment?: Environment;
  defaultHemisphere?: Hemisphere;
  onClose: () => void;
  onConfirm: (settings: ConfirmSettings) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function StrainConfirmationModal({
  visible,
  strain,
  plantedDateISO,
  defaultEnvironment,
  defaultHemisphere,
  onClose,
  onConfirm,
}: StrainConfirmationModalProps) {
  const { height } = useWindowDimensions();
  const { t } = useTranslation();

  const [environment, setEnvironment] = useState<Environment>(defaultEnvironment || 'indoor');
  const [hemisphere, setHemisphere] = useState<Hemisphere>(defaultHemisphere || 'N');
  const [plantType, setPlantType] = useState<PlantType>('unknown');

  useEffect(() => {
    if (visible && strain) {
      setPlantType(inferPlantType(strain));
    }
  }, [visible, strain]);

  const predictions: StrainPredictions | null = useMemo(() => {
    if (!strain) return null;
    const iso = plantedDateISO || new Date().toISOString();
    return preparePlantPredictions(strain, {
      plantedDateISO: iso,
      preferredEnvironment: environment,
      hemisphereOverride: hemisphere,
      plantTypeOverride: plantType === 'unknown' ? undefined : plantType,
    });
  }, [strain, plantedDateISO, environment, hemisphere, plantType]);

  const difficultyLabel = useMemo(() => {
    if (!strain) return null;
    const raw = getRawDifficulty(strain);
    const d = normalizeDifficultyString(raw);
    return d === 'unknown' ? null : d;
  }, [strain]);

  // Animations
  const backdropOpacity = useSharedValue(0);
  const modalTranslateY = useSharedValue(height);
  const modalScale = useSharedValue(0.95);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 250 });
      modalTranslateY.value = withSpring(0, { damping: 20, stiffness: 220 });
      modalScale.value = withSpring(1, { damping: 18, stiffness: 240 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 250 });
      modalTranslateY.value = withTiming(height, { duration: 250 });
      modalScale.value = withTiming(0.95, { duration: 250 });
    }

    // Cleanup: cancel any running animations on dependency change/unmount
    return () => {
      cancelAnimation(backdropOpacity);
      cancelAnimation(modalTranslateY);
      cancelAnimation(modalScale);
    };
  }, [visible, height, backdropOpacity, modalTranslateY, modalScale]);

  const backdropAnimatedStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalTranslateY.value }, { scale: modalScale.value }],
  }));

  const backdropTapGesture = Gesture.Tap().onEnd(() => {
    'worklet';
    runOnJS(onClose)();
  });

  const closeTapGesture = Gesture.Tap().onEnd(() => {
    'worklet';
    runOnJS(onClose)();
  });

  const handleConfirm = useCallback(() => {
    if (!strain || !predictions) return;
    onConfirm({ environment, hemisphere, plantType: plantType === 'unknown' ? predictions.plantType : plantType, predictions });
  }, [strain, predictions, environment, hemisphere, plantType, onConfirm]);

  const renderChip = (label: string) => (
    <ThemedView className="mr-2 mb-2 rounded-full bg-neutral-200 px-3 py-1 dark:bg-neutral-700">
      <ThemedText className="text-xs text-neutral-800 dark:text-neutral-100">{label}</ThemedText>
    </ThemedView>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <GestureDetector gesture={backdropTapGesture}>
        <Animated.View className="flex-1 bg-black/50" style={backdropAnimatedStyle} />
      </GestureDetector>

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <GestureDetector gesture={Gesture.Pan()
        .onUpdate((e) => {
          'worklet';
          if (e.translationY > 0) modalTranslateY.value = e.translationY;
        })
        .onEnd((e) => {
          'worklet';
          if (e.translationY > 100 || e.velocityY > 600) {
            modalTranslateY.value = withTiming(height, { duration: 250 });
            backdropOpacity.value = withTiming(0, { duration: 250 });
            runOnJS(onClose)();
          } else {
            modalTranslateY.value = withSpring(0, { damping: 20, stiffness: 220 });
          }
        })}>
          <AnimatedPressable
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white p-6 pb-safe dark:bg-neutral-900"
            style={modalAnimatedStyle}>
          {/* Handle */}
          <ThemedView className="mb-4 items-center">
            <ThemedView className="h-1.5 w-12 rounded-full bg-neutral-300 dark:bg-neutral-700" />
          </ThemedView>

          {/* Header */}
          <ThemedView className="mb-4 flex-row items-center justify-between">
            <ThemedText className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {t('strains.confirmation.title', 'Confirm strain selection')}
            </ThemedText>
            <GestureDetector gesture={closeTapGesture}>
              <AnimatedPressable className="h-9 w-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                <OptimizedIcon name="close" size={18} className="text-neutral-600 dark:text-neutral-300" />
              </AnimatedPressable>
            </GestureDetector>
          </ThemedView>

          {/* Body */}
          {strain && (
            <>
              <ThemedText className="mb-1 text-base font-medium">{strain.name}</ThemedText>
              <ThemedText variant="muted" className="mb-4 text-sm">
                {strain.type || t('strains.labels.unknownType', 'Unknown type')}
              </ThemedText>

              {/* Preview chips */}
              <ThemedView className="mb-4 flex-row flex-wrap">
                {/* Conflict or fallback banners: Show when data is generic/low-confidence */}
                {predictions && typeof predictions.scheduleConfidence === 'number' && predictions.scheduleConfidence < 0.5 && (
                  <ThemedView className="mb-2 w-full rounded-lg bg-amber-100 p-3 dark:bg-amber-900/30">
                    <ThemedText className="text-xs text-amber-900 dark:text-amber-200">
                      {t('strains.preview.lowConfidence', 'Limited data detected — using a generic schedule. You can adjust later.')}
                    </ThemedText>
                  </ThemedView>
                )}
                {predictions && predictions.predictedFlowerMinDays !== null && predictions.predictedFlowerMaxDays !== null
                  ? renderChip(
                      t('strains.preview.floweringDays', {
                        defaultValue: 'Flowering: {{min}}-{{max}}d',
                        min: predictions.predictedFlowerMinDays,
                        max: predictions.predictedFlowerMaxDays,
                      })
                    )
                  : null}
                {predictions && predictions.yieldMin !== null && predictions.yieldMax !== null && predictions.yieldUnit
                  ? renderChip(
                      t('strains.preview.yield', {
                        defaultValue: predictions.yieldUnit === 'g_per_plant'
                          ? 'Yield: {{min}}-{{max}} g/plant'
                          : 'Yield: {{min}}-{{max}} g/m²',
                        min: predictions.yieldMin,
                        max: predictions.yieldMax,
                      })
                    )
                  : null}
                {predictions && predictions.predictedHarvestStart && predictions.predictedHarvestEnd
                  ? renderChip(
                      t('strains.preview.harvestWindow', {
                        defaultValue: 'Harvest: ~{{start}} → {{end}}',
                        start: new Date(predictions.predictedHarvestStart).toLocaleDateString(),
                        end: new Date(predictions.predictedHarvestEnd).toLocaleDateString(),
                      })
                    )
                  : null}
                {predictions && typeof predictions.scheduleConfidence === 'number'
                  ? renderChip(
                      t('strains.preview.confidence', {
                        defaultValue: 'Confidence: {{c}}',
                        c: Math.round(predictions.scheduleConfidence * 100) + '%',
                      })
                    )
                  : null}
                {difficultyLabel
                  ? renderChip(
                      t('guidance.preview.difficulty', {
                        defaultValue: 'Difficulty: {{d}}',
                        d: difficultyLabel,
                      })
                    )
                  : null}
              </ThemedView>

              {/* Quick selectors */}
              <ThemedView className="mb-3">
                <ThemedText className="mb-2 text-sm font-medium">{t('strains.preview.environment', 'Environment')}</ThemedText>
                <ThemedView className="flex-row space-x-2">
                  {(['indoor', 'outdoor', 'greenhouse'] as Environment[]).map((env) => (
                    <Pressable
                      key={env}
                      onPress={() => setEnvironment(env)}
                      accessibilityRole="button"
                      accessible={true}
                      accessibilityLabel={`${t('strains.preview.environment', 'Environment')}: ${t(env, env)}`}
                      accessibilityState={{ selected: environment === env }}
                      className={`rounded-full px-3 py-1 ${environment === env ? 'bg-primary-500' : 'bg-neutral-200 dark:bg-neutral-700'}`}>
                      <ThemedText className={environment === env ? 'text-white' : 'text-neutral-900 dark:text-neutral-100'}>
                        {env}
                      </ThemedText>
                    </Pressable>
                  ))}
                </ThemedView>
              </ThemedView>

              <ThemedView className="mb-4">
                <ThemedText className="mb-2 text-sm font-medium">{t('strains.preview.hemisphere', 'Hemisphere')}</ThemedText>
                <ThemedView className="flex-row space-x-2">
                  {(['N', 'S'] as Hemisphere[]).map((h) => (
                    <Pressable
                      key={h}
                      onPress={() => setHemisphere(h)}
                      accessibilityRole="button"
                      accessible={true}
                      accessibilityLabel={`${t('strains.preview.hemisphere', 'Hemisphere')}: ${h === 'N' ? t('strains.preview.northern', 'Northern') : t('strains.preview.southern', 'Southern')}`}
                      accessibilityState={{ selected: hemisphere === h }}
                      className={`rounded-full px-3 py-1 ${hemisphere === h ? 'bg-primary dark:bg-primary-dark' : 'bg-surface dark:bg-surface-dark'}`}>
                      <ThemedText className={hemisphere === h ? 'text-on-primary dark:text-on-primary-dark' : 'text-on-surface dark:text-on-surface-dark'}>
                        {h}
                      </ThemedText>
                    </Pressable>
                  ))}
                </ThemedView>
              </ThemedView>
              {/* Footer buttons */}
              <ThemedView className="mt-2 flex-row justify-end space-x-3">
                <Pressable onPress={onClose} className="rounded-xl bg-neutral-200 px-4 py-3 dark:bg-neutral-800">
                  <ThemedText className="text-neutral-900 dark:text-neutral-100">{t('common.cancel', 'Cancel')}</ThemedText>
                </Pressable>
                <Pressable onPress={handleConfirm} className="rounded-xl bg-primary px-4 py-3 dark:bg-primary-dark">
                  <ThemedText className="font-medium text-on-primary dark:text-on-primary-dark">{t('common.confirm', 'Confirm')}</ThemedText>
                </Pressable>
              </ThemedView>
            </>
          )}
          </AnimatedPressable>
        </GestureDetector>
      </SafeAreaView>
    </Modal>
  );
}


