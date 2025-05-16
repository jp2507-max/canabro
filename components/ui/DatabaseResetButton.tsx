import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { resetDatabase } from '../../lib/database/database';

/**
 * A button component that allows manually triggering a database reset
 * Use this only during development when you need to recover from database migration issues.
 */
const DatabaseResetButton = () => {
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    Alert.alert(
      'Reset Database',
      'This will delete your local database and create a fresh one. This operation cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setIsResetting(true);
            try {
              await resetDatabase();
              Alert.alert(
                'Reset Complete', 
                'Database has been reset. Please restart the app for changes to take effect.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Failed to reset database:', error);
              Alert.alert('Error', 'Failed to reset database: ' + (error instanceof Error ? error.message : String(error)));
            } finally {
              setIsResetting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <TouchableOpacity 
      style={styles.button} 
      onPress={handleReset}
      disabled={isResetting}
    >
      {isResetting ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.buttonText}>Reset Database</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#D32F2F',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default DatabaseResetButton;
