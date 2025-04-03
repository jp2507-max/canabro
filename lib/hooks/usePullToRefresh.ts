import { useState, useCallback } from 'react';
import { Alert } from 'react-native';

import { useDatabase } from '../contexts/DatabaseProvider';

/**
 * Hook for implementing consistent pull-to-refresh functionality across screens
 *
 * @param options Configuration options
 * @returns Object containing refreshing state and handlers
 */
export function usePullToRefresh(options?: {
  onRefreshStart?: () => void;
  onRefreshComplete?: (success: boolean) => void;
  showFeedback?: boolean;
  forceSync?: boolean;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const { sync, isSyncing } = useDatabase();

  const handleRefresh = useCallback(async () => {
    try {
      // Call optional onRefreshStart callback
      options?.onRefreshStart?.();

      // Set refreshing state
      setRefreshing(true);

      // Perform sync operation with options
      const success = await sync({
        showFeedback: options?.showFeedback ?? true,
        force: options?.forceSync ?? true, // Default to true for pull-to-refresh
      });

      // Call optional onRefreshComplete callback with success status
      options?.onRefreshComplete?.(success);

      return success;
    } catch (error) {
      console.error('Pull-to-refresh error:', error);

      // Show error alert if showFeedback is enabled
      if (options?.showFeedback) {
        Alert.alert('Sync Error', 'Failed to refresh data. Please try again later.');
      }

      // Call optional onRefreshComplete callback with failure status
      options?.onRefreshComplete?.(false);

      return false;
    } finally {
      setRefreshing(false);
    }
  }, [sync, options]);

  return {
    refreshing: refreshing || isSyncing,
    handleRefresh,
    // Expose the sync function directly in case it's needed
    sync,
  };
}

export default usePullToRefresh;
