/**
 * Network Status Hook
 *
 * Provides offline detection and network state management.
 *
 * Usage:
 * const { isOnline, isInternetReachable, networkType } = useNetworkStatus();
 *
 * Note: For full functionality, install @react-native-community/netinfo:
 * npm install @react-native-community/netinfo
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';

export interface NetworkStatus {
  isOnline: boolean;
  isInternetReachable: boolean | null;
  networkType: string;
  isWifi: boolean;
  isCellular: boolean;
}

const DEFAULT_STATUS: NetworkStatus = {
  isOnline: true,
  isInternetReachable: true,
  networkType: 'unknown',
  isWifi: false,
  isCellular: false,
};

// Singleton state for network status
let networkListeners: ((status: NetworkStatus) => void)[] = [];
let currentStatus: NetworkStatus = DEFAULT_STATUS;
let NetInfo: any = null;
let isNetInfoInitialized = false;

// Try to load NetInfo synchronously using require
const tryLoadNetInfo = (): any => {
  try {
    return require('@react-native-community/netinfo').default;
  } catch {
    return null;
  }
};

// Initialize NetInfo if available
const initNetInfo = () => {
  if (isNetInfoInitialized) return;
  isNetInfoInitialized = true;

  NetInfo = tryLoadNetInfo();

  if (NetInfo) {
    // Subscribe to network changes
    NetInfo.addEventListener((state: any) => {
      const newStatus: NetworkStatus = {
        isOnline: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable,
        networkType: state.type || 'unknown',
        isWifi: state.type === 'wifi',
        isCellular: state.type === 'cellular',
      };

      currentStatus = newStatus;
      networkListeners.forEach(listener => listener(newStatus));
    });

    // Get initial state
    NetInfo.fetch().then((state: any) => {
      currentStatus = {
        isOnline: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable,
        networkType: state.type || 'unknown',
        isWifi: state.type === 'wifi',
        isCellular: state.type === 'cellular',
      };
      networkListeners.forEach(listener => listener(currentStatus));
    });
  } else {
    // NetInfo not installed - use fallback detection
    if (__DEV__) {
      console.log('[NetworkStatus] @react-native-community/netinfo not installed');
      console.log('To enable offline detection, run: npm install @react-native-community/netinfo');
    }
    // Use web API fallback
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      currentStatus = {
        ...DEFAULT_STATUS,
        isOnline: navigator.onLine,
      };

      window.addEventListener('online', () => {
        currentStatus = { ...currentStatus, isOnline: true };
        networkListeners.forEach(l => l(currentStatus));
      });

      window.addEventListener('offline', () => {
        currentStatus = { ...currentStatus, isOnline: false };
        networkListeners.forEach(l => l(currentStatus));
      });
    }
  }
};

/**
 * Hook for monitoring network connectivity
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(currentStatus);

  useEffect(() => {
    // Initialize NetInfo on first use
    initNetInfo();

    // Subscribe to updates
    const listener = (newStatus: NetworkStatus) => {
      setStatus(newStatus);
    };
    networkListeners.push(listener);

    // Set initial status
    setStatus(currentStatus);

    return () => {
      networkListeners = networkListeners.filter(l => l !== listener);
    };
  }, []);

  return status;
}

/**
 * Hook for showing offline banner/toast
 */
export function useOfflineAlert() {
  const { isOnline, isInternetReachable } = useNetworkStatus();
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline || isInternetReachable === false) {
      setShowOfflineAlert(true);
      setWasOffline(true);
    } else if (wasOffline) {
      // Show "back online" message briefly
      setTimeout(() => {
        setShowOfflineAlert(false);
        setWasOffline(false);
      }, 2000);
    } else {
      setShowOfflineAlert(false);
    }
  }, [isOnline, isInternetReachable, wasOffline]);

  return {
    showOfflineAlert,
    isOnline,
    wasOffline,
  };
}

/**
 * Get current network status (non-hook version)
 */
export const getNetworkStatus = (): NetworkStatus => currentStatus;

/**
 * Check if online (simple helper)
 */
export const isOnline = (): boolean => currentStatus.isOnline;

export default useNetworkStatus;
