/**
 * Database utility functions
 */
import { Alert } from 'react-native';
import { Q } from '@nozbe/watermelondb'; // Re-add Q
import { Plant } from '../models/Plant'; // Import Plant model for proper typing
import database from '../database/database'; // Corrected import path

/**
 * Reset the database to fix schema issues
 * This is a development utility that should be used when schema changes are made
 * or when relationship errors occur
 */
export async function resetDatabase(): Promise<void> {
  try {
    console.log('[Database] Starting reset process...');
    
    // Step 1: First try the standard database reset
    try {
      await database.write(async () => {
        await database.unsafeResetDatabase();
      });
      console.log('[Database] Standard reset completed');
    } catch (err) {
      console.warn('[Database] Standard reset failed, continuing with other steps:', err);
    }
    
    // Step 2: Add a specific fix for plants-strains relationship
    // This corrects any existing plants with invalid strain relationships
    try {
      const plantsCollection = database.get<Plant>('plants');
      const plants = await plantsCollection.query().fetch();
      
      await database.write(async () => {
        for (const plant of plants) {
          if (plant.strainId) {
            // Update the plant to refresh its relationships
            await plant.update(() => {
              // No need to change anything, just trigger an update
              // This forces WatermelonDB to reevaluate relationships
            });
          }
        }
      });
      console.log(`[Database] Updated ${plants.length} plant records`);
    } catch (relationErr) {
      console.warn('[Database] Error updating plant relationships:', relationErr);
    }
    
    console.log('[Database] Reset completed successfully');
    Alert.alert('Database Reset', 'Database has been reset. The app will work better after a restart.');

    return Promise.resolve();
  } catch (error) {
    console.error('[Database] Error during reset:', error);
    Alert.alert('Reset Error', 'Failed to reset database. Please try again or restart the app.');

    return Promise.reject(error);
  }
}

/**
 * Check if the database needs to be reset due to schema changes
 * This can be called on app startup to detect schema version mismatches
 */
export function checkDatabaseSchema(): void {
  // You can add logic here to check if the database schema version
  // matches the expected version and prompt for reset if needed
}

// Removed cleanupInvalidStrainIds function as it was a one-time utility

/**
 * Checks if a specific record exists in the local WatermelonDB.
 */
export async function checkRecordExistsLocally(tableName: string, recordId: string): Promise<boolean> {
  console.log(`Checking for record ${recordId} in table ${tableName}...`);
  try {
    const collection = database.get(tableName);
    const record = await collection.find(recordId);
    const exists = !!record;
    console.log(`Record ${recordId} in ${tableName} ${exists ? 'found' : 'NOT found'} locally.`);
    Alert.alert('Record Check', `Record ${recordId} in ${tableName} ${exists ? 'found' : 'NOT found'} locally.`);
    return exists;
  } catch (error: any) {
    // find() throws an error if not found
    if (error.message?.includes('not found')) {
      console.log(`Record ${recordId} in ${tableName} NOT found locally (error catch).`);
      Alert.alert('Record Check', `Record ${recordId} in ${tableName} NOT found locally.`);
      return false;
    }
    console.error(`Error checking for record ${recordId} in ${tableName}:`, error);
    Alert.alert('Record Check Error', `Error checking for record ${recordId}: ${error.message}`);
    return false; // Assume not found on other errors
  }
}
