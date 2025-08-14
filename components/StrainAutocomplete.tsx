import { useQuery } from '@tanstack/react-query';
import * as Haptics from '@/lib/utils/haptics';
import { debounce } from 'lodash-es';
import { strainIndexService } from '@/lib/services/strain-index.service';
import { useColorScheme } from 'nativewind';
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { View, TextInput, ActivityIndicator, Keyboard, ScrollView, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  runOnUI,
  FadeInDown,
  FadeOutUp,
  interpolateColor as rInterpolateColor,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import StrainConfirmationModal from '@/components/strains/StrainConfirmationModal';
import { preparePlantPredictions } from '@/lib/services/StrainIntegrationService';

import ThemedText from './ui/ThemedText';
import { EnhancedTextInput } from './ui/EnhancedTextInput';
import { searchStrainsIntelligent } from '../lib/services/strain-search.service';
import { RawStrainApiResponse } from '../lib/types/weed-db';
import { Logger } from '../lib/utils/production-utils';

interface StrainAutocompleteProps {
  onStrainSelect: (strain: RawStrainApiResponse | null) => void;
  initialStrainName?: string;
  label?: string;
  placeholder?: string;
  inputStyle?: React.ComponentProps<typeof EnhancedTextInput>['style'];
  containerStyle?: React.ComponentProps<typeof Animated.View>['style'];
  disabled?: boolean;
  limit?: number;
  onFocus?: () => void;
  onBlur?: () => void;
  onSubmitEditing?: () => void;
  returnKeyType?: 'search' | 'next' | 'done' | 'go' | 'send';
  showCultivationPreview?: boolean; // Task 6.1
  confirmOnSelect?: boolean; // Task 6.2
  plantedDateISO?: string | null; // optional context for predictions
}

// Ref interface for focus control
export interface StrainAutocompleteRef {
  focus: () => void;
  blur: () => void;
}

// Enhanced loading indicator with optimized animations
const AnimatedLoadingIndicator: React.FC<{
  searchTerm: string;
}> = ({ searchTerm }) => {
  const { colorScheme } = useColorScheme();
  const pulseAnimation = useSharedValue(0);
  const dotAnimation = useSharedValue(0);

  const pulseStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: 0.6 + pulseAnimation.value * 0.4,
      transform: [{ scale: 1 + pulseAnimation.value * 0.1 }],
    };
  });

  const dotStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateX: dotAnimation.value * 20 }],
    };
  });

  useEffect(() => {
    // Continuous pulse for the loading icon
    pulseAnimation.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Animated dots effect
    dotAnimation.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1, { duration: 500 }),
        withTiming(2, { duration: 500 }),
        withTiming(3, { duration: 500 })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(pulseAnimation);
      cancelAnimation(dotAnimation);
    };
  }, []);

  return (
    <Animated.View
      className="mt-3 flex-row items-center rounded-xl border border-neutral-200 bg-primary-50 p-2 dark:border-neutral-700 dark:bg-primary-900/20"
      entering={FadeInDown.duration(300).springify()}>
      <Animated.View style={pulseStyle}>
        <ActivityIndicator size="small" color={colorScheme === 'dark' ? '#8b5cf6' : '#7c3aed'} />
      </Animated.View>
      <View className="ml-3 flex-1">
        <ThemedText className="text-sm font-medium text-primary-700 dark:text-primary-300">
          {searchTerm.length <= 3
            ? 'Searching comprehensive database'
            : 'Searching your saved strains'}
        </ThemedText>
        <Animated.View className="mt-1 flex-row" style={dotStyle}>
          <ThemedText variant="caption" className="text-primary-600 dark:text-primary-400">
            Analyzing results...
          </ThemedText>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

// Animated suggestion item with optimized animations
type SuggestionPreview = {
  flowering?: string;
  difficulty?: string;
  yieldText?: string;
  harvest?: string;
};

const AnimatedSuggestionItem: React.FC<{
  strain: RawStrainApiResponse;
  onSelect: (strain: RawStrainApiResponse) => void;
  getSourceLabel: (source?: string) => string;
  index: number;
  preview?: SuggestionPreview | null;
}> = ({ strain, onSelect, getSourceLabel, index, preview }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePressIn = () => {
    runOnUI(() => {
      'worklet';
      scale.value = withTiming(0.96, { duration: 100 });
      opacity.value = withTiming(0.8, { duration: 100 });
    })();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    runOnUI(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      opacity.value = withTiming(1, { duration: 150 });
    })();
  };

  const handlePress = () => {
    onSelect(strain);
  };

  const getSourceBadgeClass = (source?: string): string => {
    switch (source) {
      case 'local':
        return 'bg-green-100 dark:bg-green-900/30';
      case 'supabase':
      case 'cloud':
        return 'bg-blue-100 dark:bg-blue-900/30';
      default:
        return 'bg-neutral-100 dark:bg-neutral-800';
    }
  };

  const getSourceTextClass = (source?: string): string => {
    switch (source) {
      case 'local':
        return 'text-green-700 dark:text-green-300';
      case 'supabase':
      case 'cloud':
        return 'text-blue-700 dark:text-blue-300';
      default:
        return 'text-neutral-600 dark:text-neutral-300';
    }
  };

  useEffect(() => {
    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, []);

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      accessible
      accessibilityLabel={`Select strain ${strain.name}${strain.type ? `, ${strain.type} type` : ''}`}
      accessibilityHint={`From ${getSourceLabel(strain._source).toLowerCase()} source`}
      accessibilityRole="button">
      <Animated.View
        style={animatedStyle}
        className="flex-row items-center justify-between border-b border-neutral-200 p-3 last:border-b-0 dark:border-neutral-700"
        entering={FadeInDown.delay(index * 50)
          .duration(200)
          .springify()}>
        <View className="flex-1">
          <ThemedText className="text-base font-medium">{strain.name}</ThemedText>
          {strain.type && (
            <ThemedText variant="caption" className="mt-1 italic">
              {strain.type}
            </ThemedText>
          )}
          {preview && (
            <View className="mt-1 flex-row flex-wrap">
              {preview.flowering ? (
                <View className="mr-1 mb-1 rounded-full bg-neutral-100 px-2 py-0.5 dark:bg-neutral-700">
                  <ThemedText className="text-[10px] text-neutral-700 dark:text-neutral-200">
                    {preview.flowering}
                  </ThemedText>
                </View>
              ) : null}
              {preview.difficulty ? (
                <View className="mr-1 mb-1 rounded-full bg-neutral-100 px-2 py-0.5 dark:bg-neutral-700">
                  <ThemedText className="text-[10px] text-neutral-700 dark:text-neutral-200">
                    {preview.difficulty}
                  </ThemedText>
                </View>
              ) : null}
              {preview.yieldText ? (
                <View className="mr-1 mb-1 rounded-full bg-neutral-100 px-2 py-0.5 dark:bg-neutral-700">
                  <ThemedText className="text-[10px] text-neutral-700 dark:text-neutral-200">
                    {preview.yieldText}
                  </ThemedText>
                </View>
              ) : null}
              {preview.harvest ? (
                <View className="mr-1 mb-1 rounded-full bg-neutral-100 px-2 py-0.5 dark:bg-neutral-700">
                  <ThemedText className="text-[10px] text-neutral-700 dark:text-neutral-200">
                    {preview.harvest}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          )}
        </View>
        <View className={`rounded-lg px-2 py-1 ${getSourceBadgeClass(strain._source)}`}>
          <ThemedText className={`text-xs font-medium ${getSourceTextClass(strain._source)}`}>
            {getSourceLabel(strain._source)}
          </ThemedText>
        </View>
      </Animated.View>
    </Pressable>
  );
};

export const StrainAutocomplete = forwardRef<StrainAutocompleteRef, StrainAutocompleteProps>(
  (
    {
      onStrainSelect,
      initialStrainName = '',
      label = 'Search Strain',
      placeholder = 'Type to search...',
      inputStyle = {},
      containerStyle = {},
      disabled = false,
      limit = 10,
      onFocus,
      onBlur,
      onSubmitEditing,
      returnKeyType = 'search',
      showCultivationPreview = true,
      confirmOnSelect = true,
      plantedDateISO,
    },
    ref
  ): React.JSX.Element => {
    const { t } = useTranslation('strains');
    const [searchTerm, setSearchTerm] = useState<string>(initialStrainName);
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>(searchTerm);
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const [pendingSelection, setPendingSelection] = useState<RawStrainApiResponse | null>(null);
    const [confirmVisible, setConfirmVisible] = useState<boolean>(false);

    // Enhanced keyboard handling for single search input
    const searchInputRef = useRef<TextInput>(null);

    // Expose focus methods to parent component
    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          searchInputRef.current?.focus();
        },
        blur: () => {
          searchInputRef.current?.blur();
        },
      }),
      []
    );

    // Container animation for the entire component
    const containerScale = useSharedValue(1);

    const containerAnimatedStyle = useAnimatedStyle(() => {
      'worklet';
      return {
        transform: [{ scale: containerScale.value }],
      };
    });

    const debouncedSetSearch = useCallback(
      debounce((text: string) => {
        setDebouncedSearchTerm(text);
      }, 300),
      []
    );

    useEffect(() => {
      if (searchTerm !== initialStrainName) {
        debouncedSetSearch(searchTerm);
      }
    }, [searchTerm, initialStrainName, debouncedSetSearch]);

    useEffect(() => {
      return () => {
        debouncedSetSearch.cancel();
      };
    }, [debouncedSetSearch]);

    // Animate container on focus with cleanup
    useEffect(() => {
      if (isFocused) {
        containerScale.value = withSpring(1, { damping: 20, stiffness: 400 });
      }

      return () => {
        cancelAnimation(containerScale);
      };
    }, [isFocused]);

    const {
      data: searchResult,
      isLoading,
      error,
    } = useQuery({
      queryKey: ['strains-intelligent', debouncedSearchTerm, limit],
      queryFn: async () => {
        if (!debouncedSearchTerm.trim()) {
          return { strains: [], sources: { local: 0, supabase: 0, external: 0 }, hasMore: false };
        }

        Logger.debug(
          `[StrainAutocomplete] Searching for "${debouncedSearchTerm}" using intelligent search`
        );

        // Ensure local index is fresh before searching
        try {
          await strainIndexService.ensureFresh();
        } catch (e) {
          Logger.warn('[StrainAutocomplete] Failed to ensure fresh strain index before search', {
            error: e,
          });
          throw e;
        }

        const results = await searchStrainsIntelligent(debouncedSearchTerm, limit);

        Logger.debug(
          `[StrainAutocomplete] Found ${results.strains.length} results for "${debouncedSearchTerm}"`,
          {
            sources: results.sources,
            hasMore: results.hasMore,
          }
        );

        return results;
      },
      enabled: !!debouncedSearchTerm.trim() && isFocused,
      gcTime: 1000 * 60 * 5,
      staleTime: 1000 * 60 * 2,
    });

    const strainData = searchResult?.strains || [];
    const sources = searchResult?.sources || { local: 0, supabase: 0, external: 0 };
    const hasMore = searchResult?.hasMore || false;

    const getSourceLabel = (source?: string): string => {
      switch (source) {
        case 'local':
          return 'Local';
        case 'supabase':
          return 'Cloud';
        case 'cloud':
          return 'Cloud';
        case 'external':
          return 'External';
        default:
          return 'Unknown';
      }
    };

    const handleSelectStrain = (strain: RawStrainApiResponse): void => {
      Logger.debug(
        `[StrainAutocomplete] Strain selected: ${strain.name} (API ID: ${strain.api_id})`
      );
      setSearchTerm(strain.name);
      if (confirmOnSelect) {
        setPendingSelection(strain);
        setConfirmVisible(true);
      } else {
        onStrainSelect(strain);
        setIsFocused(false);
        Keyboard.dismiss();
      }

      // Success haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleFocus = () => {
      setIsFocused(true);
      onFocus?.();
    };

    const handleBlur = () => {
      setTimeout(() => {
        setIsFocused(false);
        onBlur?.();
      }, 100);
    };

    const handleKeyboardDone = () => {
      if (onSubmitEditing) {
        onSubmitEditing();
      } else {
        Keyboard.dismiss();
        searchInputRef.current?.blur();
      }
    };

    return (
      <>
      <Animated.View
        style={[containerStyle, containerAnimatedStyle]}
        className="relative z-10 w-full">
        {label ? (
          <Animated.Text
            className="mb-2 text-base font-bold text-neutral-900 dark:text-white"
            entering={FadeInDown.duration(200)}>
            {label}
          </Animated.Text>
        ) : null}

        <EnhancedTextInput
          ref={searchInputRef}
          placeholder={placeholder}
          value={searchTerm}
          onChangeText={setSearchTerm}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          index={0}
          showCharacterCount={true}
          maxLength={50}
          accessibilityLabel={label || 'Search for cannabis strains'}
          accessibilityHint="Type to search for strains from your saved collection, cloud database, or external sources"
          style={inputStyle}
          returnKeyType={returnKeyType}
          onSubmitEditing={handleKeyboardDone}
        />

        {isLoading && isFocused && <AnimatedLoadingIndicator searchTerm={debouncedSearchTerm} />}

        {error && isFocused && error.message && (
          <Animated.View
            className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
            entering={FadeInDown.duration(300).springify()}>
            <ThemedText className="text-sm font-medium text-red-700 dark:text-red-300">
              {t('common.errorMessage', { message: error.message })}
            </ThemedText>
          </Animated.View>
        )}

        {isFocused && !isLoading && !error && strainData && strainData.length > 0 && (
          <Animated.View
            className="absolute left-0 right-0 top-full z-50 mt-2 max-h-52 rounded-xl bg-white shadow-md dark:bg-neutral-800"
            entering={FadeInDown.duration(300).springify()}
            exiting={FadeOutUp.duration(200)}>
            {(sources.local > 0 || sources.supabase > 0 || sources.external > 0) && (
              <Animated.View
                className="rounded-t-lg border-b border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900"
                entering={FadeInDown.duration(200)}
                accessible
                accessibilityRole="text"
                accessibilityLabel={`Search results: ${sources.local} saved locally, ${sources.supabase} from cloud, ${sources.external} from external sources`}>
                <ThemedText variant="caption" className="font-medium">
                  {sources.local > 0 ? `${sources.local} saved` : ''}
                  {sources.local > 0 && (sources.supabase > 0 || sources.external > 0) ? ' • ' : ''}
                  {sources.supabase > 0 ? `${sources.supabase} cloud` : ''}
                  {sources.supabase > 0 && sources.external > 0 ? ' • ' : ''}
                  {sources.external > 0 ? `${sources.external} external` : ''}
                  {hasMore ? ' • Type more for refined results' : ''}
                </ThemedText>
              </Animated.View>
            )}

              <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              className="max-h-52">
              {strainData.map((item, index) => {
                const preview = showCultivationPreview
                  ? (() => {
                      try {
                        const preds = preparePlantPredictions(item, {
                          plantedDateISO: plantedDateISO || new Date().toISOString(),
                        });
                        const flowering =
                          preds.predictedFlowerMinDays !== null && preds.predictedFlowerMaxDays !== null
                            ? `${preds.predictedFlowerMinDays}-${preds.predictedFlowerMaxDays}d`
                            : undefined;
                        const yieldText =
                          preds.yieldMin !== null && preds.yieldMax !== null && preds.yieldUnit
                            ? preds.yieldUnit === 'g_per_plant'
                              ? `${preds.yieldMin}-${preds.yieldMax} g/plant`
                              : `${preds.yieldMin}-${preds.yieldMax} g/m²`
                            : undefined;
                        const harvest = preds.predictedHarvestStart && preds.predictedHarvestEnd
                          ? `${new Date(preds.predictedHarvestStart).toLocaleDateString()} → ${new Date(preds.predictedHarvestEnd).toLocaleDateString()}`
                          : undefined;
                        const difficulty = (item.growDifficulty || item.difficulty) as string | undefined;
                        return { flowering, yieldText, harvest, difficulty } as SuggestionPreview;
                      } catch {
                        return null;
                      }
                    })()
                  : null;
                return (
                  <AnimatedSuggestionItem
                    key={item.api_id || `strain-${index}`}
                    strain={item}
                    onSelect={handleSelectStrain}
                    getSourceLabel={getSourceLabel}
                    index={index}
                    preview={preview}
                  />
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        {isFocused &&
          !isLoading &&
          !error &&
          strainData &&
          strainData.length === 0 &&
          debouncedSearchTerm.trim() && (
            <Animated.View
              className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl bg-white shadow-md dark:bg-neutral-800"
              entering={FadeInDown.duration(300).springify()}
              exiting={FadeOutUp.duration(200)}>
              <View className="p-4">
                <ThemedText className="mb-1 text-base font-medium">{t('noStrainsFound')}</ThemedText>
                <ThemedText variant="muted" className="text-sm">
                  {t('tryDifferentSpelling')}
                </ThemedText>
              </View>
            </Animated.View>
          )}
      </Animated.View>
      {/* Confirmation Modal (Task 6.2) */}
      {confirmOnSelect && (
        <StrainConfirmationModal
          visible={confirmVisible}
          strain={pendingSelection}
          plantedDateISO={plantedDateISO}
          onClose={() => {
            setConfirmVisible(false);
            setPendingSelection(null);
          }}
          onConfirm={() => {
            // We only pass the raw strain back up for now; callers can compute predictions too
            onStrainSelect(pendingSelection);
            setConfirmVisible(false);
            setPendingSelection(null);
            setIsFocused(false);
            Keyboard.dismiss();
          }}
        />
      )}
    </>
    );
  }
);

export default StrainAutocomplete;
