import React, { useEffect } from "react";
import { View, StyleSheet, Platform, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { OfflineBanner } from './src/components/OfflineBanner';
import { initErrorReporting } from './src/services/errorReporting';
import { useFonts } from 'expo-font';
import { Feather } from '@expo/vector-icons';

export default function App() {
  // Load fonts required by the app
  const [fontsLoaded] = useFonts({
    ...Feather.font,
  });

  // Initialize push notifications (mobile only)
  useEffect(() => {
    initErrorReporting();
    // Skip notification setup on web platform
    if (typeof window === 'undefined') {
      setupNotifications();
    }
  }, []);

  const setupNotifications = async () => {
    const { supabase } = await import('./src/lib/supabase');
    const { notificationService } = await import('./src/services/notificationService');

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await notificationService.registerForPushNotifications(user.id);
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading App Resources...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <AuthProvider>
          <SafeAreaProvider style={styles.container}>
            <View style={styles.container}>
              <StatusBar style="light" />
              <OfflineBanner />
              <RootNavigator />
            </View>
          </SafeAreaProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05050a',
    ...Platform.select({
      web: {
        height: '100vh' as any,
        minHeight: '100%',
      }
    }),
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#05050a',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
