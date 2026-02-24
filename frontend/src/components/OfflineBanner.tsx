/**
 * Offline Banner Component
 *
 * Shows a banner when the app is offline.
 * Automatically appears/disappears based on network status.
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useOfflineAlert } from '../hooks/useNetworkStatus';

interface OfflineBannerProps {
  position?: 'top' | 'bottom';
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ position = 'top' }) => {
  const { showOfflineAlert, isOnline, wasOffline } = useOfflineAlert();
  const translateY = React.useRef(new Animated.Value(-100)).current;

  React.useEffect(() => {
    Animated.spring(translateY, {
      toValue: showOfflineAlert ? 0 : -100,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  }, [showOfflineAlert, translateY]);

  if (!showOfflineAlert && !wasOffline) {
    return null;
  }

  const isBackOnline = isOnline && wasOffline;

  return (
    <Animated.View
      style={[
        styles.container,
        position === 'bottom' ? styles.bottom : styles.top,
        { transform: [{ translateY }] },
        isBackOnline ? styles.onlineContainer : styles.offlineContainer,
      ]}
    >
      <Feather
        name={isBackOnline ? 'wifi' : 'wifi-off'}
        size={16}
        color="#fff"
      />
      <Text style={styles.text}>
        {isBackOnline ? 'Back online' : 'No internet connection'}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
    zIndex: 9999,
  },
  top: {
    top: 0,
  },
  bottom: {
    bottom: 0,
  },
  offlineContainer: {
    backgroundColor: '#EF4444', // Red for offline
  },
  onlineContainer: {
    backgroundColor: '#10B981', // Green for back online
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default OfflineBanner;
