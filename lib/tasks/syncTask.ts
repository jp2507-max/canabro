import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

// Import the singleton database instance and the sync function
import database from '../database/database';
import { synchronizeWithServer } from '../services/sync';
import { checkUnsyncedChanges } from '../services/sync';
import { deltaSyncStrains } from '../services/sync';

export const BACKGROUND_SYNC_TASK = 'background-sync';
const LAST_USER_ID_KEY = 'last_active_user_id';

// Function to store the last active user ID (call this from AuthProvider/DatabaseProvider)
export async function setLastActiveUserId(userId: string | null): Promise<void> {
  try {
    if (userId) {
      await AsyncStorage.setItem(LAST_USER_ID_KEY, userId);
      console.log(`[SyncTask] Stored last active user ID: ${userId}`);
    } else {
      await AsyncStorage.removeItem(LAST_USER_ID_KEY);
      console.log('[SyncTask] Cleared last active user ID.');
    }
  } catch (error) {
    console.error('[SyncTask] Error storing last active user ID:', error);
  }
}

// Check if background task functionality is available
function isBackgroundTaskAvailable(): boolean {
  try {
    // Check if the native module is available
    return (
      !!BackgroundTask &&
      typeof BackgroundTask?.registerTaskAsync === 'function' &&
      Platform.OS !== 'web'
    );
  } catch (error) {
    console.warn('[SyncTask] Background task not available:', error);
    return false;
  }
}

// Define the background task with error handling
if (isBackgroundTaskAvailable()) {
  try {
    TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
      const now = new Date();
      console.log(`[${BACKGROUND_SYNC_TASK}] Task executing at: ${now.toISOString()}`);

      try {
        // 1. Check network connectivity
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected || netInfo.isInternetReachable === false) {
          console.log(`[${BACKGROUND_SYNC_TASK}] No internet connection. Skipping sync.`);
          return BackgroundTask.BackgroundTaskResult.Success;
        }

        // 2. Get the last active user ID
        const userId = await AsyncStorage.getItem(LAST_USER_ID_KEY);
        if (!userId) {
          console.log(`[${BACKGROUND_SYNC_TASK}] No active user ID found. Skipping sync.`);
          return BackgroundTask.BackgroundTaskResult.Success;
        }

        // 3. Run a quick delta sync for strains to keep local cache fresh
        try {
          await deltaSyncStrains();
        } catch (err) {
          console.warn('[SyncTask] Strain delta sync failed', err);
        }

        // 4. Check if we have any changes to sync
        const hasChanges = await checkUnsyncedChanges(database);
        if (!hasChanges) {
          console.log(`[${BACKGROUND_SYNC_TASK}] No unsynced changes. Skipping sync.`);
          return BackgroundTask.BackgroundTaskResult.Success;
        }

        console.log(
          `[${BACKGROUND_SYNC_TASK}] Network online, User ID found: ${userId}. Attempting sync...`
        );

        // 5. Perform the synchronization
        // Note: synchronizeWithServer already includes mutex locking
        const syncSuccess = await synchronizeWithServer(database, userId);

        if (syncSuccess) {
          console.log(`[${BACKGROUND_SYNC_TASK}] Sync successful.`);
          return BackgroundTask.BackgroundTaskResult.Success;
        } else {
          console.warn(`[${BACKGROUND_SYNC_TASK}] Sync failed.`);
          return BackgroundTask.BackgroundTaskResult.Failed;
        }
      } catch (error) {
        console.error(`[${BACKGROUND_SYNC_TASK}] Error during background sync:`, error);
        return BackgroundTask.BackgroundTaskResult.Failed;
      }
    });
  } catch (error) {
    console.error('[SyncTask] Failed to define background task:', error);
  }
} else {
  console.warn('[SyncTask] Background tasks not available - task definition skipped');
}

// Helper function to register the background task
export async function registerBackgroundSyncAsync(): Promise<void> {
  try {
    // Check if background task is available before proceeding
    if (!isBackgroundTaskAvailable()) {
      console.warn('[SyncTask] Background task not available on this platform or configuration');
      return;
    }

    // Check if the task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (isRegistered) {
      console.log(`[${BACKGROUND_SYNC_TASK}] Task already registered.`);
      return;
    }

    await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
    });
    console.log(`[${BACKGROUND_SYNC_TASK}] Task registered successfully.`);

    // Optional: Log current status
    const status = await BackgroundTask.getStatusAsync();
    if (status !== null) {
      console.log(
        `[${BACKGROUND_SYNC_TASK}] Background task status: ${BackgroundTask.BackgroundTaskStatus[status]}`
      );
    } else {
      console.log(`[${BACKGROUND_SYNC_TASK}] Background task status: Unavailable`);
    }
  } catch (error) {
    console.error(`[${BACKGROUND_SYNC_TASK}] Failed to register task:`, error);
    // Don't throw the error, just log it to prevent app crashes
  }
}

// Helper function to unregister the background task
export async function unregisterBackgroundSyncAsync(): Promise<void> {
  try {
    if (!isBackgroundTaskAvailable()) {
      console.warn('[SyncTask] Background task not available for unregistration');
      return;
    }

    await BackgroundTask.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    console.log(`[${BACKGROUND_SYNC_TASK}] Task unregistered successfully.`);
  } catch (error) {
    console.error(`[${BACKGROUND_SYNC_TASK}] Failed to unregister task:`, error);
  }
}
