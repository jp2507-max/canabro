import { useState, useEffect } from 'react';
import { Keyboard, KeyboardEventListener, Platform } from 'react-native';

export interface EnhancedKeyboardState {
  // Keyboard state
  isKeyboardVisible: boolean;
  keyboardHeight: number;
  
  // Input navigation state
  currentIndex: number;
  activeInputIndex: number | null;
  
  // Navigation methods
  goToNextInput: () => boolean;
  goToPreviousInput: () => boolean;
  goToInput: (index: number) => boolean;
  dismissKeyboard: () => void;
  setCurrentIndex: (index: number) => void;
  setActiveInputIndex: (index: number | null) => void;
  
  // Helper properties
  canGoNext: boolean;
  canGoPrevious: boolean;
}

/**
 * Unified hook for keyboard state management and input navigation
 * Combines useKeyboardState and useInputNavigation for simpler API
 */
export const useEnhancedKeyboard = (
  inputRefs: React.RefObject<any>[] = [], 
  totalInputs: number = 0
): EnhancedKeyboardState => {
  // Keyboard state
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
    // Input navigation state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeInputIndex, setActiveInputIndex] = useState<number | null>(null);

  // Keyboard event handlers - defined before useEffect to avoid TDZ
  const handleKeyboardShow: KeyboardEventListener = (event) => {
    setIsKeyboardVisible(true);
    setKeyboardHeight(event.endCoordinates.height);
  };

  const handleKeyboardHide: KeyboardEventListener = () => {
    setIsKeyboardVisible(false);
    setKeyboardHeight(0);
    setActiveInputIndex(null);
    setCurrentIndex(0);
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);
  // Input navigation methods
  const goToNextInput = () => {
    if (totalInputs === 0) return false;
    
    const nextIndex = currentIndex + 1;
    if (nextIndex < totalInputs && inputRefs[nextIndex]?.current) {
      inputRefs[nextIndex].current.focus();
      setCurrentIndex(nextIndex);
      setActiveInputIndex(nextIndex);
      return true;
    }
    return false;
  };

  const goToPreviousInput = () => {
    if (totalInputs === 0) return false;
    
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0 && inputRefs[prevIndex]?.current) {
      inputRefs[prevIndex].current.focus();
      setCurrentIndex(prevIndex);
      setActiveInputIndex(prevIndex);
      return true;
    }
    return false;
  };

  const goToInput = (index: number) => {
    if (totalInputs === 0) return false;
    
    if (index >= 0 && index < totalInputs && inputRefs[index]?.current) {
      inputRefs[index].current.focus();
      setCurrentIndex(index);
      setActiveInputIndex(index);
      return true;
    }
    return false;
  };

  const dismissKeyboard = () => {
    if (!isKeyboardVisible) {
      // Keyboard already hidden – no action needed
      return;
    }
    Keyboard.dismiss();
    // Don't reset currentIndex to 0 immediately; let keyboardHide event handle cleanup
  };

  // Helper methods for external use
  const setCurrentIndexSafe = (index: number) => {
    if (index >= 0 && index < totalInputs) {
      setCurrentIndex(index);
      setActiveInputIndex(index);
    }
  };

  const setActiveInputIndexSafe = (index: number | null) => {
    setActiveInputIndex(index);
    if (index !== null && index >= 0 && index < totalInputs) {
      setCurrentIndex(index);
    }
  };

  const canGoNext = totalInputs > 0 && currentIndex < totalInputs - 1;
  const canGoPrevious = totalInputs > 0 && currentIndex > 0;

  return {
    // Keyboard state
    isKeyboardVisible,
    keyboardHeight,
    
    // Input navigation state
    currentIndex,
    activeInputIndex,
      // Navigation methods
    goToNextInput,
    goToPreviousInput,
    goToInput,
    dismissKeyboard,
    setCurrentIndex: setCurrentIndexSafe,
    setActiveInputIndex: setActiveInputIndexSafe,
    
    // Helper properties
    canGoNext,
    canGoPrevious,  };
};
