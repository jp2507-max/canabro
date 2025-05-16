import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';

interface DatabaseErrorHandlerProps {
  error: Error | null;
  onResolve: () => void;
  onReset: () => Promise<void>;
}

const DB_NAME = 'canabro.db';
const getDatabasePath = async (): Promise<string> => {
  return `${FileSystem.documentDirectory}${DB_NAME}`;
};

export function DatabaseErrorHandler({ error, onResolve, onReset }: DatabaseErrorHandlerProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleResetDatabase = async () => {
    try {
      setIsProcessing(true);
      await onReset();
      setIsProcessing(false);
      Alert.alert(
        'Database Reset',
        'Database has been reset successfully. The app will now reload.',
        [{ text: 'OK', onPress: onResolve }]
      );
    } catch (err) {
      console.error('Reset failed:', err);
      setIsProcessing(false);
      Alert.alert('Reset Failed', 'Failed to reset the database. Please try again.');
    }
  };

  const errorMessage = error?.message || 'Unknown database error occurred.';
  const isMigrationError = errorMessage.includes('Missing migration') || errorMessage.includes('schema version');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Database Error</Text>
        
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Error Details:</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>

        {isMigrationError && (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Schema Version Mismatch</Text>
              <Text style={styles.infoText}>
                Your app's database schema version doesn't match the available migrations.
                This typically happens after updating the app with schema changes.
              </Text>
            </View>

            <View style={styles.actionsBox}>
              <Text style={styles.actionsTitle}>Suggested Action:</Text>
              <Text style={styles.actionText}>
                Reset the database to fix schema issues.{'\n'}
                Note: This will delete all local data.
              </Text>
              <TouchableOpacity
                style={[styles.button, isProcessing && styles.buttonDisabled]}
                onPress={handleResetDatabase}
                disabled={isProcessing}
              >
                <Text style={styles.buttonText}>
                  {isProcessing ? 'Resetting...' : 'Reset Database'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#212529',
  },
  errorBox: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeeba',
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    width: '100%',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#856404',
  },
  errorText: {
    color: '#856404',
    fontSize: 14,
  },
  infoBox: {
    backgroundColor: '#d1ecf1',
    borderColor: '#bee5eb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    width: '100%',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#0c5460',
  },
  infoText: {
    color: '#0c5460',
    fontSize: 14,
  },
  actionsBox: {
    backgroundColor: '#e2e3e5',
    borderColor: '#d6d8db',
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    width: '100%',
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#383d41',
  },
  actionText: {
    color: '#383d41',
    fontSize: 14,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});