import { useCallback, useRef } from 'react';
import {
  runOnJS,
  withDelay,
  withSequence,
  withTiming,
  withSpring,
  cancelAnimation,
  SharedValue,
  WithTimingConfig,
  WithSpringConfig,
} from 'react-native-reanimated';

import { SPRING_CONFIGS } from './presets';

interface SequenceStep {
  value: number;
  /** Use `WithTimingConfig` when `type==="timing"` and `WithSpringConfig` otherwise */
  config?: WithTimingConfig | WithSpringConfig;
  delay?: number;
  type?: 'timing' | 'spring';
}

interface ParallelAnimationConfig {
  sharedValue: SharedValue<number>;
  steps: SequenceStep[];
  onComplete?: () => void;
  onStepComplete?: (stepIndex: number) => void;
}

interface ChainedAnimationConfig {
  animations: {
    sharedValue: SharedValue<number>;
    toValue: number;
    config?: any;
    type?: 'timing' | 'spring';
  }[];
  onComplete?: () => void;
  onAnimationComplete?: (index: number) => void;
}

interface StaggerConfig {
  sharedValues: SharedValue<number>[];
  toValue: number;
  staggerDelay: number;
  config?: any;
  type?: 'timing' | 'spring';
  onComplete?: () => void;
  onItemComplete?: (index: number) => void;
}

export function useAnimationSequence() {
  const activeAnimations = useRef<Set<SharedValue<number>>>(new Set());

  // Cancel all active animations
  const cancelAll = useCallback(() => {
    activeAnimations.current.forEach((sharedValue) => {
      cancelAnimation(sharedValue);
    });
    activeAnimations.current.clear();
  }, []);
  // Sequential animation - one step after another
  const runSequence = useCallback((config: ParallelAnimationConfig) => {
    const { sharedValue, steps, onComplete, onStepComplete } = config;

    if (steps.length === 0) return;

    // Track this animation
    activeAnimations.current.add(sharedValue);

    // Build sequence of animations with proper typing
    const animationSteps = steps.map((step, index) => {
      const baseAnimation =
        step.type === 'spring'
          ? withSpring(step.value, step.config || SPRING_CONFIGS.smooth)
          : withTiming(step.value, step.config || { duration: 300 });

      // Add step callback if provided
      const withStepCallback = onStepComplete
        ? step.type === 'spring'
          ? withSpring(step.value, step.config || SPRING_CONFIGS.smooth, () => {
              runOnJS(onStepComplete)(index);
            })
          : withTiming(step.value, step.config || { duration: 300 }, () => {
              runOnJS(onStepComplete)(index);
            })
        : baseAnimation;

      return step.delay ? withDelay(step.delay, withStepCallback) : withStepCallback;
    });
    // Setup completion callback for the last step
    if (onComplete && steps.length > 0) {
      const lastStepIndex = steps.length - 1;
      const lastStep = steps[lastStepIndex]!; // Non-null assertion since we check length > 0

      animationSteps[lastStepIndex] = (() => {
        const baseAnimation =
          lastStep.type === 'spring'
            ? withSpring(lastStep.value, lastStep.config || SPRING_CONFIGS.smooth, () => {
                // Marshal back to JS to update ref & callback
                runOnJS(() => {
                  activeAnimations.current.delete(sharedValue);
                  onComplete();
                })();
              })
            : withTiming(lastStep.value, lastStep.config || { duration: 300 }, () => {
                // Marshal back to JS to update ref & callback
                runOnJS(() => {
                  activeAnimations.current.delete(sharedValue);
                  onComplete();
                })();
              });

        return lastStep.delay ? withDelay(lastStep.delay, baseAnimation) : baseAnimation;
      })();
    }

    // Apply the sequence
    sharedValue.value = withSequence(...animationSteps);
  }, []);
  // Chained animations - different shared values in sequence
  const runChain = useCallback((config: ChainedAnimationConfig) => {
    const { animations, onComplete, onAnimationComplete } = config;

    if (animations.length === 0) return;

    // Track all animations
    animations.forEach(({ sharedValue }) => {
      activeAnimations.current.add(sharedValue);
    });

    const executeChain = async () => {
      for (let i = 0; i < animations.length; i++) {
        const animation = animations[i];
        if (!animation) continue;

        const { sharedValue, toValue, config: animConfig, type } = animation;

        await new Promise<void>((resolve) => {
          const animationFn =
            type === 'spring'
              ? withSpring(toValue, animConfig || SPRING_CONFIGS.smooth, () => {
                  if (onAnimationComplete) runOnJS(onAnimationComplete)(i);
                  runOnJS(resolve)();
                })
              : withTiming(toValue, animConfig || { duration: 300 }, () => {
                  if (onAnimationComplete) runOnJS(onAnimationComplete)(i);
                  runOnJS(resolve)();
                });

          sharedValue.value = animationFn;
        });
      }
      // Clean up tracking - must run on JS thread
      runOnJS(() => {
        animations.forEach(({ sharedValue }) => {
          activeAnimations.current.delete(sharedValue);
        });
        if (onComplete) {
          onComplete();
        }
      })();
    };

    executeChain();
  }, []);

  // Staggered animations - multiple values with delays
  const runStagger = useCallback((config: StaggerConfig) => {
    const {
      sharedValues,
      toValue,
      staggerDelay,
      config: animConfig,
      type,
      onComplete,
      onItemComplete,
    } = config;

    // Track all animations
    sharedValues.forEach((sharedValue) => {
      activeAnimations.current.add(sharedValue);
    });

    let completedCount = 0;
    const totalAnimations = sharedValues.length;

    sharedValues.forEach((sharedValue, index) => {
      const delay = index * staggerDelay;
      const animationFn =
        type === 'spring'
          ? withSpring(toValue, animConfig || SPRING_CONFIGS.smooth, () => {
              runOnJS(() => {
                completedCount++;
                onItemComplete?.(index);

                if (completedCount === totalAnimations) {
                  // Clean up tracking - must run on JS thread
                  runOnJS(() => {
                    sharedValues.forEach((sv) => activeAnimations.current.delete(sv));
                    onComplete?.();
                  })();
                }
              })();
            })
          : withTiming(toValue, animConfig || { duration: 300 }, () => {
              runOnJS(() => {
                completedCount++;
                onItemComplete?.(index);

                if (completedCount === totalAnimations) {
                  // Clean up tracking - must run on JS thread
                  runOnJS(() => {
                    sharedValues.forEach((sv) => activeAnimations.current.delete(sv));
                    onComplete?.();
                  })();
                }
              })();
            });

      sharedValue.value = delay > 0 ? withDelay(delay, animationFn) : animationFn;
    });
  }, []);
  // Parallel animations - multiple animations at once
  const runParallel = useCallback(
    (
      animations: {
        sharedValue: SharedValue<number>;
        toValue: number;
        config?: any;
        type?: 'timing' | 'spring';
        delay?: number;
      }[],
      onComplete?: () => void
    ) => {
      // Track all animations
      animations.forEach(({ sharedValue }) => {
        activeAnimations.current.add(sharedValue);
      });

      let completedCount = 0;
      const totalAnimations = animations.length;

      animations.forEach(({ sharedValue, toValue, config: animConfig, type, delay }) => {
        const animationFn =
          type === 'spring'
            ? withSpring(toValue, animConfig || SPRING_CONFIGS.smooth, () => {
                runOnJS(() => {
                  completedCount++;
                  if (completedCount === totalAnimations) {
                    // Clean up tracking - must run on JS thread
                    runOnJS(() => {
                      animations.forEach(({ sharedValue: sv }) => {
                        activeAnimations.current.delete(sv);
                      });
                      if (onComplete) onComplete();
                    })();
                  }
                })();
              })
            : withTiming(toValue, animConfig || { duration: 300 }, () => {
                runOnJS(() => {
                  completedCount++;
                  if (completedCount === totalAnimations) {
                    // Clean up tracking - must run on JS thread
                    runOnJS(() => {
                      animations.forEach(({ sharedValue: sv }) => {
                        activeAnimations.current.delete(sv);
                      });
                      if (onComplete) onComplete();
                    })();
                  }
                })();
              });

        sharedValue.value = delay ? withDelay(delay, animationFn) : animationFn;
      });
    },
    []
  );
  // Create a repeating animation
  const runRepeating = useCallback(
    (
      sharedValue: SharedValue<number>,
      fromValue: number,
      toValue: number,
      config?: any,
      type: 'timing' | 'spring' = 'timing'
    ) => {
      activeAnimations.current.add(sharedValue);

      const loop = () => {
        sharedValue.value =
          type === 'spring'
            ? withSpring(toValue, config || SPRING_CONFIGS.smooth, () => {
                sharedValue.value = withSpring(fromValue, config || SPRING_CONFIGS.smooth, loop);
              })
            : withTiming(toValue, config || { duration: 1000 }, () => {
                sharedValue.value = withTiming(fromValue, config || { duration: 1000 }, loop);
              });
      };

      loop();
    },
    []
  ); // Stop a specific repeating animation
  const stopRepeating = useCallback((sharedValue: SharedValue<number>) => {
    cancelAnimation(sharedValue);
    activeAnimations.current.delete(sharedValue);
  }, []);

  return {
    runSequence,
    runChain,
    runStagger,
    runParallel,
    runRepeating,
    stopRepeating,
    cancelAll,
    activeAnimationsCount: activeAnimations.current.size,
  };
}

// Preset sequence configurations
export const SEQUENCE_PRESETS = {
  // Bounce in effect
  bounceIn: (scale: SharedValue<number>, onComplete?: () => void): ParallelAnimationConfig => ({
    sharedValue: scale,
    steps: [
      { value: 0.3, type: 'spring' as const, config: SPRING_CONFIGS.bouncy },
      { value: 1.05, type: 'spring' as const, config: SPRING_CONFIGS.bouncy },
      { value: 0.95, type: 'spring' as const, config: SPRING_CONFIGS.bouncy },
      { value: 1, type: 'spring' as const, config: SPRING_CONFIGS.smooth },
    ],
    onComplete,
  }),

  // Slide up and fade in
  slideUpFadeIn: (
    translateY: SharedValue<number>,
    opacity: SharedValue<number>,
    onComplete?: () => void
  ) => ({
    parallel: [
      {
        sharedValue: translateY,
        toValue: 0,
        type: 'spring' as const,
        config: SPRING_CONFIGS.smooth,
      },
      { sharedValue: opacity, toValue: 1, type: 'timing' as const, config: { duration: 400 } },
    ],
    onComplete,
  }),

  // Pulse effect
  pulse: (scale: SharedValue<number>): ParallelAnimationConfig => ({
    sharedValue: scale,
    steps: [
      { value: 1.1, type: 'timing' as const, config: { duration: 150 } },
      { value: 1, type: 'timing' as const, config: { duration: 150 } },
    ],
  }),

  // Loading dots stagger
  loadingDots: (opacity: SharedValue<number>[], staggerDelay: number = 200) => ({
    sharedValues: opacity,
    toValue: 0.3,
    staggerDelay,
    type: 'timing' as const,
    config: { duration: 600 },
  }),
} as const;
