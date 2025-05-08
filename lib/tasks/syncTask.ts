import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

// Import the singleton database instance and the sync function
import database from '../database/database';
import { synchronizeWithServer, checkUnsyncedChanges } from '../services/sync-service';

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

// Define the background task
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  const now = new Date();
  console.log(`[${BACKGROUND_SYNC_TASK}] Task executing at: ${now.toISOString()}`);

  try {
    // 1. Check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected || !netInfo.isInternetReachable) {
      console.log(`[${BACKGROUND_SYNC_TASK}] No internet connection. Skipping sync.`);
      return BackgroundFetch.BackgroundFetchResult.NoData; // Or Failed if appropriate
    }

    // 2. Get the last active user ID
    const userId = await AsyncStorage.getItem(LAST_USER_ID_KEY);
    if (!userId) {
      console.log(`[${BACKGROUND_SYNC_TASK}] No active user ID found. Skipping sync.`);
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // 3. Check if we have any changes to sync
    const hasChanges = await checkUnsyncedChanges(database);
    if (!hasChanges) {
      console.log(`[${BACKGROUND_SYNC_TASK}] No unsynced changes. Skipping sync.`);
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    console.log(
      `[${BACKGROUND_SYNC_TASK}] Network online, User ID found: ${userId}. Attempting sync...`
    );

    // 4. Perform the synchronization
    // Note: synchronizeWithServer already includes mutex locking
    const syncSuccess = await synchronizeWithServer(database, userId);

    if (syncSuccess) {
      console.log(`[${BACKGROUND_SYNC_TASK}] Sync successful.`);
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else {
      console.warn(`[${BACKGROUND_SYNC_TASK}] Sync failed.`);
      // Depending on the reason for failure, you might return Failed or NoData
      // If it failed due to temporary issues (like server down), Failed might be better
      // If it failed because sync wasn't needed or due to concurrency lock, NoData is fine
      return BackgroundFetch.BackgroundFetchResult.Failed; // Indicate failure
    }
  } catch (error) {
    console.error(`[${BACKGROUND_SYNC_TASK}] Error during background sync:`, error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Helper function to register the background task
export async function registerBackgroundSyncAsync(): Promise<void> {
  try {
    // Check if the task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (isRegistered) {
      console.log(`[${BACKGROUND_SYNC_TASK}] Task already registered.`);
      // Optionally unregister first if you need to update settings
      // await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      // console.log(`[${BACKGROUND_SYNC_TASK}] Unregistered existing task.`);
    }

    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false, // Keep running even if app is terminated
      startOnBoot: true, // Start task after device boot
    });
    console.log(`[${BACKGROUND_SYNC_TASK}] Task registered successfully.`);

    // Optional: Log current status
    const status = await BackgroundFetch.getStatusAsync();
    if (status !== null) {
      console.log(
        `[${BACKGROUND_SYNC_TASK}] Background fetch status: ${BackgroundFetch.BackgroundFetchStatus[status]}`
      );
    } else {
      console.log(`[${BACKGROUND_SYNC_TASK}] Background fetch status: Unavailable`);
    }
  } catch (error) {
    console.error(`[${BACKGROUND_SYNC_TASK}] Failed to register task:`, error);
  }
}

// Helper function to unregister the background task
export async function unregisterBackgroundSyncAsync(): Promise<void> {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    console.log(`[${BACKGROUND_SYNC_TASK}] Task unregistered successfully.`);
  } catch (error) {
    console.error(`[${BACKGROUND_SYNC_TASK}] Failed to unregister task:`, error);
  }
}
