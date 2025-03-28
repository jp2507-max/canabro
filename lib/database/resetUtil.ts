import { Alert, Platform } from 'react-native';
import { resetDatabase } from './database';
import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system';

/**
 * Utility to force reset the local WatermelonDB database.
 * This is useful when schema migrations fail and the app is in a corrupted state.
 * 
 * @returns Promise<boolean> - true if the database was reset or the reset is not needed
 */
export const forceResetDatabaseIfNeeded = async (): Promise<boolean> => {
  try {
    // Get app info
    const buildVersion = Application.nativeBuildVersion;
    const appVersion = Application.nativeApplicationVersion;
    
    // We'll store a flag file to track if we've already done the reset for this app version
    const resetFlagPath = `${FileSystem.documentDirectory}db_reset_${appVersion}_${buildVersion}.flag`;
    
    // Check if we've already done the reset for this version
    const flagExists = (await FileSystem.getInfoAsync(resetFlagPath)).exists;
    
    if (flagExists) {
      console.log('Database reset already performed for this version');
      return true;
    }
    
    // Perform the reset
    const resetResult = await resetDatabase();
    
    if (resetResult) {
      console.log('Database was reset successfully');
      
      // Create the flag file to indicate we've done the reset for this version
      await FileSystem.writeAsStringAsync(resetFlagPath, new Date().toISOString());
      
      return true;
    } else {
      console.log('Database reset was not needed or failed');
      return false;
    }
  } catch (error) {
    console.error('Error in forceResetDatabaseIfNeeded:', error);
    return false;
  }
};

/**
 * Shows an alert to the user asking if they want to reset the database.
 * This should be used when there are database issues that can't be automatically resolved.
 */
export const showDatabaseResetAlert = (): Promise<boolean> => {
  return new Promise((resolve) => {
    Alert.alert(
      'Database Error',
      'The app database is in a corrupted state. Would you like to reset it? This will clear all local data, but your account information will be preserved.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Reset Database',
          style: 'destructive',
          onPress: async () => {
            const result = await resetDatabase();
            resolve(result);
            
            if (result) {
              Alert.alert(
                'Database Reset',
                'The database has been reset. Please restart the app.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ],
      { cancelable: false }
    );
  });
};
