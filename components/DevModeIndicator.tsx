import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, Pressable } from 'react-native';
import { isDevelopment, authConfig } from '../lib/config';
import { useAuth } from '../lib/contexts/AuthProvider';
import { resetDatabase } from '../lib/utils/database';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DevModeIndicatorProps {
  showFullDetails?: boolean;
}

/**
 * A component that displays a development mode indicator
 * Only visible in development mode
 */
export function DevModeIndicator({ showFullDetails = false }: DevModeIndicatorProps) {
  const { devBypassAuth, user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const handleReset = async () => {
    // Confirm before resetting
    Alert.alert(
      "Reset Database",
      "This will delete your local database to fix schema issues. This action cannot be undone. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset", 
          style: "destructive",
          onPress: async () => {
            await resetDatabase();
          }
        }
      ]
    );
  };

  // Don't show anything in production mode
  if (!isDevelopment) {
    return null;
  }

  // Minimal version for normal screens
  if (!showFullDetails) {
    return (
      <View style={styles.miniContainer}>
        <Text style={styles.miniText}>DEV MODE</Text>
      </View>
    );
  }

  // Full version with auth details
  return (
    <>
      <View style={styles.container}>
        <Text style={styles.title}>Development Mode</Text>
        <Text style={styles.detail}>
          Auth: {authConfig.forceDevBypass ? 'Auto Bypass' : 'Manual'}
        </Text>
        {/* Remove reference to non-existent property useMockAdapter */}
        <Text style={styles.detail}>Mock User: {authConfig.mockUserEmail || 'None'}</Text>
        <Text style={styles.detail}>User ID: {user?.id || 'Not logged in'}</Text>

        {!authConfig.forceDevBypass && (
          <TouchableOpacity style={styles.button} onPress={() => devBypassAuth()}>
            <Text style={styles.buttonText}>Use Dev Auth</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity 
        style={[
          styles.indicator, 
          { top: insets.top + 10 }
        ]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.indicatorText}>DEV</Text>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <BlurView intensity={50} style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Developer Options</Text>
            
            <View style={styles.buttonSection}>
              <Text style={styles.sectionTitle}>Database</Text>
              <Pressable 
                style={styles.actionButton}
                onPress={handleReset}
              >
                <Text style={styles.actionButtonText}>Reset Database (Fix Schema)</Text>
              </Pressable>
            </View>
            
            <Pressable 
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
        </BlurView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: 'rgba(255, 200, 0, 0.2)',
    borderRadius: 6,
    marginVertical: 8,
    marginHorizontal: 12,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  detail: {
    fontSize: 12,
    marginBottom: 2,
  },
  button: {
    backgroundColor: '#0066cc',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  miniContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 200, 0, 0.6)',
    borderRadius: 4,
    padding: 4,
    zIndex: 999,
  },
  miniText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  indicator: {
    position: 'absolute',
    right: 10,
    backgroundColor: 'rgba(255, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1000,
  },
  indicatorText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 10,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  buttonSection: {
    width: '100%',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#555',
  },
  actionButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 10,
  },
  closeButtonText: {
    color: '#333',
    fontWeight: '500',
  },
});
