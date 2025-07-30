/**
 * Haptic feedback utility for CanaBro app
 * Provides consistent haptic feedback across the application
 * 
 * Features:
 * - Error handling to prevent crashes
 * - Global enable/disable option
 * - Reanimated worklet compatibility with sync wrappers
 * - Semantic function names for better UX
 */

import * as Haptics from 'expo-haptics';

export interface HapticOptions {
  enabled?: boolean;
}

// Global haptic settings (could be connected to user preferences later)
let globalHapticsEnabled = true;

export const setGlobalHapticsEnabled = (enabled: boolean): void => {
  globalHapticsEnabled = enabled;
};

export const isHapticsEnabled = (): boolean => globalHapticsEnabled;

/**
 * Trigger light haptic feedback (for minor interactions)
 */
export const triggerLightHaptic = async (options: HapticOptions = {}): Promise<void> => {
  const { enabled = globalHapticsEnabled } = options;
  if (!enabled) return;

  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (error) {
    console.warn('Failed to trigger light haptic feedback:', error);
  }
};

/**
 * Trigger medium haptic feedback (for standard interactions)
 */
export const triggerMediumHaptic = async (options: HapticOptions = {}): Promise<void> => {
  const { enabled = globalHapticsEnabled } = options;
  if (!enabled) return;

  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (error) {
    console.warn('Failed to trigger medium haptic feedback:', error);
  }
};

/**
 * Trigger heavy haptic feedback (for important actions)
 */
export const triggerHeavyHaptic = async (options: HapticOptions = {}): Promise<void> => {
  const { enabled = globalHapticsEnabled } = options;
  if (!enabled) return;

  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (error) {
    console.warn('Failed to trigger heavy haptic feedback:', error);
  }
};

// Wrapper functions for use with runOnJS() in worklets
// These are fire-and-forget functions that don't return promises
export const triggerLightHapticSync = (options: HapticOptions = {}): void => {
  triggerLightHaptic(options).catch(error => 
    console.warn('Failed to trigger light haptic feedback:', error)
  );
};

export const triggerMediumHapticSync = (options: HapticOptions = {}): void => {
  triggerMediumHaptic(options).catch(error => 
    console.warn('Failed to trigger medium haptic feedback:', error)
  );
};

export const triggerHeavyHapticSync = (options: HapticOptions = {}): void => {
  triggerHeavyHaptic(options).catch(error => 
    console.warn('Failed to trigger heavy haptic feedback:', error)
  );
};

// Additional sync wrapper functions for other haptic types
export const triggerSuccessHapticSync = (options: HapticOptions = {}): void => {
  triggerSuccessHaptic(options).catch(error => 
    console.warn('Failed to trigger success haptic feedback:', error)
  );
};

export const triggerWarningHapticSync = (options: HapticOptions = {}): void => {
  triggerWarningHaptic(options).catch(error => 
    console.warn('Failed to trigger warning haptic feedback:', error)
  );
};

export const triggerErrorHapticSync = (options: HapticOptions = {}): void => {
  triggerErrorHaptic(options).catch(error => 
    console.warn('Failed to trigger error haptic feedback:', error)
  );
};

export const triggerSelectionHapticSync = (options: HapticOptions = {}): void => {
  triggerSelectionHaptic(options).catch(error => 
    console.warn('Failed to trigger selection haptic feedback:', error)
  );
};

/**
 * Trigger success haptic feedback
 */
export const triggerSuccessHaptic = async (options: HapticOptions = {}): Promise<void> => {
  const { enabled = globalHapticsEnabled } = options;
  if (!enabled) return;

  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error) {
    console.warn('Failed to trigger success haptic feedback:', error);
  }
};

/**
 * Trigger warning haptic feedback
 */
export const triggerWarningHaptic = async (options: HapticOptions = {}): Promise<void> => {
  const { enabled = globalHapticsEnabled } = options;
  if (!enabled) return;

  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (error) {
    console.warn('Failed to trigger warning haptic feedback:', error);
  }
};

/**
 * Trigger error haptic feedback
 */
export const triggerErrorHaptic = async (options: HapticOptions = {}): Promise<void> => {
  const { enabled = globalHapticsEnabled } = options;
  if (!enabled) return;

  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (error) {
    console.warn('Failed to trigger error haptic feedback:', error);
  }
};

/**
 * Trigger selection haptic feedback (for toggles, checkboxes)
 */
export const triggerSelectionHaptic = async (options: HapticOptions = {}): Promise<void> => {
  const { enabled = globalHapticsEnabled } = options;
  if (!enabled) return;

  try {
    await Haptics.selectionAsync();
  } catch (error) {
    console.warn('Failed to trigger selection haptic feedback:', error);
  }
};


// Semantic aliases for easier usage: haptics.medium(), haptics.light(), etc.
export const light = triggerLightHaptic;
export const medium = triggerMediumHaptic;
export const heavy = triggerHeavyHaptic;
export const success = triggerSuccessHaptic;
export const warning = triggerWarningHaptic;
export const error = triggerErrorHaptic;
export const selection = triggerSelectionHaptic;

// Expose all underlying Expo Haptics exports so that other modules can simply
// `import * as Haptics from "lib/utils/haptics"` and keep the same API while
// benefiting from the centralized wrapper and global enable flag. This allows
// us to remove direct `expo-haptics` imports across the codebase without
// refactoring every call site immediately.
export * from 'expo-haptics';
