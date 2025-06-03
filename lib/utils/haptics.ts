/**
 * Haptic feedback utility for CanaBro app
 * Provides consistent haptic feedback across the application
 */

import * as Haptics from 'expo-haptics';

export interface HapticOptions {
  enabled?: boolean;
}

/**
 * Trigger light haptic feedback (for minor interactions)
 */
export const triggerLightHaptic = async (options: HapticOptions = {}): Promise<void> => {
  const { enabled = true } = options;
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
  const { enabled = true } = options;
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
  const { enabled = true } = options;
  if (!enabled) return;
  
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (error) {
    console.warn('Failed to trigger heavy haptic feedback:', error);
  }
};

/**
 * Trigger success haptic feedback
 */
export const triggerSuccessHaptic = async (options: HapticOptions = {}): Promise<void> => {
  const { enabled = true } = options;
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
  const { enabled = true } = options;
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
  const { enabled = true } = options;
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
  const { enabled = true } = options;
  if (!enabled) return;
  
  try {
    await Haptics.selectionAsync();
  } catch (error) {
    console.warn('Failed to trigger selection haptic feedback:', error);
  }
};
