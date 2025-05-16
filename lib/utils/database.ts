/**
 * Database utility functions
 */

import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import database from '../database/database'; // Corrected import path
import { Plant } from '../models/Plant'; // Import Plant model for proper typing

// Database file path
const DB_NAME = 'canabro.db';
const getDatabasePath = async () => {
  return `${FileSystem.documentDirectory}${DB_NAME}`;
};

/**
 * Reset the database to fix schema issues
 * This is a development utility that should be used when schema changes are made
 * or when relationship errors occur
 */
export async function resetDatabase(): Promise<void> {
  try {
    // Get the database file path
    const dbPath = await getDatabasePath();

    // Check if the database file exists
    const fileInfo = await FileSystem.getInfoAsync(dbPath);

    if (fileInfo.exists) {
      console.log('Database file found, deleting to reset...');
      // Delete the database file
      await FileSystem.deleteAsync(dbPath);
      console.log('Database file deleted successfully. The app will restart.');
      
      // Force reload/restart the app to reinitialize the database
      // This is a hack, but it works for development
      setTimeout(() => {
        Alert.alert(
          'Database Reset',
          'The database has been reset. The app will now close. Please reopen it manually.',
          [{ text: 'OK' }]
        );
      }, 500);
    } else {
      console.log('No database file found, nothing to delete.');
      Alert.alert('Database Reset', 'No database file found. No action needed.');
    }
  } catch (error) {
    console.error('Error while trying to reset database:', error);
    Alert.alert('Reset Failed', 'Failed to reset the database. Check console for details.');
  }
}

/**
 * Check if the database needs to be reset due to schema changes
 * This can be called on app startup to detect schema version mismatches
 */
export function checkDatabaseSchema(): void {
  // You can add logic here to check if the database schema version
  // matches the expected version and prompt for reset if needed
  console.log('Database schema version:', database.adapter.schema.version);
}

/**
 * Checks if a specific record exists in the local WatermelonDB.
 */
export async function checkRecordExistsLocally(
  tableName: string,
  recordId: string
): Promise<boolean> {
  try {
    const collection = database.get(tableName);
    const record = await collection.find(recordId);
    return !!record;
  } catch (error) {
    console.error(`Error checking for record ${recordId} in ${tableName}:`, error);
    return false;
  }
}
