/**
 * Network management for sync service
 * Handles network status checking and adaptive sync configuration
 */

import NetInfo from '@react-native-community/netinfo';
import { NetworkStatus, SyncConfig, TABLES_TO_SYNC } from './types';

/**
 * Checks if there is an active internet connection
 * @returns Promise that resolves to a boolean
 */
export async function isOnline(): Promise<boolean> {
  const netInfo = await NetInfo.fetch();
  return netInfo.isConnected === true;
}

/**
 * Get detailed network status information
 * 
 * @returns Network status including online state, type and metered status
 */
export async function getNetworkStatus(): Promise<NetworkStatus> {
  const netInfo = await NetInfo.fetch();
  return {
    isOnline: netInfo.isConnected === true,
    // Add null check on isConnected and use safe type comparison
    isMetered: (netInfo.isConnected === true) && 
               (netInfo.type === 'cellular' || 
                netInfo.type === 'wimax' || 
                netInfo.type === 'other'),
    type: netInfo.type
  };
}

/**
 * Adapt sync behavior based on network conditions
 * 
 * @param forceSync Whether to force full sync regardless of network conditions
 * @returns Configuration object with tables to sync and batch sizes
 */
export async function getSyncConfig(forceSync: boolean = false): Promise<SyncConfig> {
  const network = await getNetworkStatus();
  
  // Default config - full sync
  const defaultConfig: SyncConfig = {
    tablesToSync: [...TABLES_TO_SYNC],
    batchSize: 100,
    includeMedia: true
  };
  
  // If forcing sync, use default config
  if (forceSync) return defaultConfig;
  
  // Handle limited connectivity scenarios
  if (!network.isOnline) {
    return {
      tablesToSync: [],
      batchSize: 0,
      includeMedia: false
    };
  }
  
  // On metered connections, reduce batch size and skip media-heavy tables
  if (network.isMetered) {
    return {
      // Only sync essential tables on metered connection
      tablesToSync: ['profiles', 'plants', 'grow_journals', 'plant_tasks'],
      batchSize: 50, // Smaller batch size
      includeMedia: false // Skip media to save data
    };
  }
  
  // Adjust batch size based on connection type
  switch (network.type) {
    case 'wifi':
      return {
        tablesToSync: [...TABLES_TO_SYNC],
        batchSize: 200, // Larger batches on WiFi
        includeMedia: true
      };
    case 'cellular':
      return {
        tablesToSync: [...TABLES_TO_SYNC],
        batchSize: 75, // Medium batches on cellular
        includeMedia: true
      };
    default:
      return defaultConfig;
  }
}