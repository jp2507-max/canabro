/**
 * Database Reset Utility
 * 
 * Provides a function to reset the local database when needed.
 * This is useful during development when schema changes are made.
 */

import { resetDatabase } from '../database/database';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Completely resets the local WatermelonDB database and clears related cache
 * @returns {Promise<boolean>} True if the database was reset, false otherwise
 */
export async function resetLocalDatabase(): Promise<boolean> {
  try {
    console.log('[ResetUtil] Attempting to reset local database...');
    
    // First, clear related caches that might reference the database
    try {
      // Clear AsyncStorage keys related to database
      const keys = await AsyncStorage.getAllKeys();
      const dbKeys = keys.filter(key => 
        key.startsWith('strains-') || 
        key.startsWith('watermelon') ||
        key.startsWith('db-')
      );
      
      if (dbKeys.length > 0) {
        await AsyncStorage.multiRemove(dbKeys);
        console.log(`[ResetUtil] Cleared ${dbKeys.length} related cache keys`);
      }
    } catch (error) {
      console.warn('[ResetUtil] Error clearing cache keys:', error);
      // Continue with reset even if cache clearing fails
    }
    
    // Reset the actual database
    const result = await resetDatabase();
    
    if (result) {
      console.log('[ResetUtil] Database successfully reset');
      return true;
    } else {
      console.log('[ResetUtil] Database reset was not needed or failed');
      return false;
    }
  } catch (error) {
    console.error('[ResetUtil] Error resetting database:', error);
    return false;
  }
}