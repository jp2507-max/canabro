import { BlurView } from 'expo-blur';
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Modal, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { isDevelopment, authConfig } from '../lib/config';
import { useAuth } from '../lib/contexts/AuthProvider';
import { resetDatabase } from '../lib/utils/database';
import { triggerLightHapticSync, triggerMediumHapticSync } from '../lib/utils/haptics';
import { useI18n } from '../lib/hooks/useI18n';
import LanguageToggle from './ui/LanguageToggle';

// Add import for AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DevModeIndicatorProps {
  showFullDetails?: boolean;
}

/**
 * A component that displays a development mode indicator
 * Only visible in development mode - completely removed in production builds
 */
export function DevModeIndicator({ showFullDetails = false }: DevModeIndicatorProps) {
  // Completely remove from production builds
  if (!__DEV__) {
    return null;
  }
  const { t } = useTranslation('devMode');
  const { t: tCommon } = useTranslation('common');
  const { t: tDebug } = useTranslation('debug');
  
  // Add i18n debugging
  const { t: tNav } = useTranslation('navigation');
  const { currentLanguage, isReady } = useI18n();
  
  const { devBypassAuth, user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  // Animation values
  const authButtonScale = useSharedValue(1);
  const indicatorScale = useSharedValue(1);

  const handleReset = async () => {
    // Confirm before resetting
    Alert.alert(
      tDebug('resetDatabase'),
      tDebug('resetDatabaseConfirmation'),
      [
        { text: tCommon('cancel'), style: 'cancel' },
        {
          text: tDebug('resetDatabase'),
          style: 'destructive',
          onPress: async () => {
            await resetDatabase();
          },
        },
      ]
    );
  };

  const handleClearLanguageStorage = async () => {
    try {
      await AsyncStorage.removeItem('language');
      console.log('[DevMode] Language storage cleared, app will use device language on next restart');
      Alert.alert('Success', 'Language storage cleared. Restart the app to use device language detection.');
    } catch (error) {
      console.error('[DevMode] Error clearing language storage:', error);
      Alert.alert('Error', 'Failed to clear language storage');
    }
  };

  // Animated styles
  const authButtonAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: authButtonScale.value }],
    };
  });

  const indicatorAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: indicatorScale.value }],
    };
  });

  // Gesture handlers
  const authButtonGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      authButtonScale.value = withTiming(0.95, { duration: 100 });
      runOnJS(triggerLightHapticSync)();
    })
    .onFinalize(() => {
      'worklet';
      authButtonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
      runOnJS(devBypassAuth)();
    });

  const indicatorGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      indicatorScale.value = withTiming(0.9, { duration: 100 });
      runOnJS(triggerMediumHapticSync)();
    })
    .onFinalize(() => {
      'worklet';
      indicatorScale.value = withSpring(1, { damping: 15, stiffness: 400 });
      runOnJS(setModalVisible)(true);
    });

  // Don't show anything in production mode
  if (!isDevelopment) {
    return null;
  }

  // Minimal version for normal screens
  if (!showFullDetails) {
    return (
      <View style={styles.miniContainer}>
        <Text style={styles.miniText}>{t('indicator')}</Text>
      </View>
    );
  }

  // Full version with auth details
  return (
    <>
      <View style={styles.container}>
        <Text style={styles.title}>{tDebug('developmentMode')}</Text>
        <Text style={styles.detail}>
          {tDebug('auth')}: {authConfig.forceDevBypass ? tDebug('autoBypass') : tDebug('manual')}
        </Text>
        {/* Remove reference to non-existent property useMockAdapter */}
        <Text style={styles.detail}>{tDebug('mockUser')}: {authConfig.mockUserEmail || tDebug('none')}</Text>
        <Text style={styles.detail}>{tDebug('userId')}: {user?.id || tDebug('notLoggedIn')}</Text>
        
        {/* Add i18n debugging */}
        <Text style={styles.detail}>Language: {currentLanguage} ({isReady ? 'ready' : 'loading'})</Text>
        <Text style={styles.detail}>Home tab: {tNav('tabs.home')}</Text>
        <Text style={styles.detail}>Welcome: {tCommon('welcome')}</Text>

        {!authConfig.forceDevBypass && (
          <GestureDetector gesture={authButtonGesture}>
            <Animated.View style={[styles.button, authButtonAnimatedStyle]}>
              <Text style={styles.buttonText}>{tDebug('useDevAuth')}</Text>
            </Animated.View>
          </GestureDetector>
        )}
      </View>

      <GestureDetector gesture={indicatorGesture}>
        <Animated.View style={[styles.indicator, { top: insets.top + 10 }, indicatorAnimatedStyle]}>
          <Text style={styles.indicatorText}>{t('indicator')}</Text>
        </Animated.View>
      </GestureDetector>

      <Modal
        animationType="fade"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <BlurView intensity={50} style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{tDebug('developerOptions')}</Text>

            <View style={styles.buttonSection}>
              <Text style={styles.sectionTitle}>{tDebug('database')}</Text>
              <Pressable style={styles.actionButton} onPress={handleReset}>
                <Text style={styles.actionButtonText}>{tDebug('resetDatabaseSchema')}</Text>
              </Pressable>
            </View>

            <View style={styles.buttonSection}>
              <Text style={styles.sectionTitle}>Language Settings</Text>
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                <LanguageToggle showLabel />
              </View>
              <Pressable style={styles.actionButton} onPress={handleClearLanguageStorage}>
                <Text style={styles.actionButtonText}>Clear Language Storage</Text>
              </Pressable>
            </View>

            <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButtonText}>{tDebug('close')}</Text>
            </Pressable>
          </View>
        </BlurView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#ff3b30',
    borderRadius: 8,
    marginBottom: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    width: '100%',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#0066cc',
    borderRadius: 4,
    marginTop: 8,
    padding: 8,
  },
  buttonSection: {
    marginBottom: 20,
    width: '100%',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    marginTop: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  closeButtonText: {
    color: '#333',
    fontWeight: '500',
  },
  container: {
    backgroundColor: 'rgba(255, 200, 0, 0.2)',
    borderRadius: 6,
    marginHorizontal: 12,
    marginVertical: 8,
    padding: 12,
  },
  detail: {
    fontSize: 12,
    marginBottom: 2,
  },
  indicator: {
    backgroundColor: 'rgba(255, 0, 0, 0.6)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'absolute',
    right: 10,
    zIndex: 1000,
  },
  indicatorText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  miniContainer: {
    backgroundColor: 'rgba(255, 200, 0, 0.6)',
    borderRadius: 4,
    padding: 4,
    position: 'absolute',
    right: 8,
    top: 8,
    zIndex: 999,
  },
  miniText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalBackdrop: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  modalContent: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    elevation: 5,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    width: '80%',
  },
  modalTitle: {
    color: '#333',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#555',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
});
