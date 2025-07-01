import { useState, useEffect } from 'react';
import * as Network from 'expo-network';
import NetInfo, { NetInfoCellularGeneration } from '@react-native-community/netinfo';

interface NetworkTimeoutConfig {
  timeout: number;
  networkType: string;
  isConnected: boolean;
}

/**
 * Hook that provides network-aware timeout values for image loading
 * Adjusts timeout based on current network conditions
 */
export const useNetworkAwareTimeout = (baseTimeout: number = 6000): NetworkTimeoutConfig => {
  const [config, setConfig] = useState<NetworkTimeoutConfig>({
    timeout: baseTimeout,
    networkType: 'unknown',
    isConnected: true,
  });

  useEffect(() => {
    let mounted = true;

    const updateNetworkConfig = async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();
        const netInfoState = await NetInfo.fetch();
        
        if (!mounted) return;

        const isConnected = networkState.isConnected ?? false;
        let networkType = 'unknown';
        let timeout = baseTimeout;

        if (networkState.type === Network.NetworkStateType.WIFI) {
          networkType = 'wifi';
          timeout = Math.max(baseTimeout * 0.75, 3000); // 25% faster for WiFi
        } else if (networkState.type === Network.NetworkStateType.CELLULAR) {
          // Use NetInfo for more detailed cellular information
          const cellularGeneration = netInfoState.type === 'cellular' 
            ? netInfoState.details?.cellularGeneration 
            : null;
          
          switch (cellularGeneration) {
            case NetInfoCellularGeneration['5g']:
              networkType = '5g';
              timeout = Math.max(baseTimeout * 0.5, 2500);
              break;
            case NetInfoCellularGeneration['4g']:
              networkType = '4g';
              timeout = baseTimeout;
              break;
            case NetInfoCellularGeneration['3g']:
              networkType = '3g';
              timeout = baseTimeout * 2;
              break;
            case NetInfoCellularGeneration['2g']:
              networkType = '2g';
              timeout = baseTimeout * 3;
              break;
            default:
              networkType = 'cellular';
              timeout = baseTimeout * 1.5;
          }
        } else if (networkState.type === Network.NetworkStateType.NONE) {
          networkType = 'none';
          timeout = 1000; // Quick fail for no connection
        }

        setConfig({ timeout, networkType, isConnected });
      } catch (error) {
        console.warn('Failed to detect network conditions:', error);
        if (mounted) {
          setConfig({ timeout: baseTimeout, networkType: 'unknown', isConnected: true });
        }
      }
    };

    updateNetworkConfig();

    const subscription = Network.addNetworkStateListener(updateNetworkConfig);

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [baseTimeout]);

  return config;
};
