import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform, AppState, AppStateStatus } from 'react-native';

// Get Supabase config from environment variables via app.config.js
const config = Constants.expoConfig?.extra || {};

// Supabase credentials from environment config
// IMPORTANT: These must be set in .env - do not hardcode credentials
// Check both app.config.js extra AND direct env vars (for web)
const supabaseUrl = config.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = config.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('Supabase Debug:', {
    url: supabaseUrl,
    keyLength: supabaseAnonKey?.length
});

// Debug: Log Supabase config status
console.log('Supabase Config:', {
    urlSet: !!supabaseUrl,
    keySet: !!supabaseAnonKey,
    fromExtra: !!config.supabaseUrl,
    fromEnv: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
});

// Config is valid if we have both URL and key
const isValidConfig = !!supabaseUrl && !!supabaseAnonKey;

// Warn in development if Supabase is not configured
if (!isValidConfig && typeof __DEV__ !== 'undefined' && __DEV__) {
    console.error(
        'Supabase not configured! Set SUPABASE_URL and SUPABASE_ANON_KEY in .env file.\n' +
        'Get credentials from: https://supabase.com/dashboard/project/_/settings/api'
    );
}

// Use localStorage for web, AsyncStorage for native
const storage = Platform.OS === 'web'
    ? {
        getItem: (key: string) => {
            if (typeof window !== 'undefined') {
                return Promise.resolve(window.localStorage.getItem(key));
            }
            return Promise.resolve(null);
        },
        setItem: (key: string, value: string) => {
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, value);
            }
            return Promise.resolve();
        },
        removeItem: (key: string) => {
            if (typeof window !== 'undefined') {
                window.localStorage.removeItem(key);
            }
            return Promise.resolve();
        },
    }
    : AsyncStorage;

// Throw error in production if Supabase is not configured
if (!isValidConfig && typeof __DEV__ !== 'undefined' && !__DEV__) {
    throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
        auth: {
            storage: storage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true, // Required for OAuth redirects to work on web
            flowType: 'pkce', // Use PKCE flow for better security with OAuth
        },
    }
);

// ============================================================================
// WEB OAUTH CALLBACK HANDLING
// Automatically processes OAuth callback when app loads on web
// ============================================================================

// Handle OAuth callback on web - extract session from URL hash/query params
if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Check if this is an OAuth callback URL
    const url = window.location.href;
    const isAuthCallback = url.includes('/auth/callback') ||
        url.includes('access_token=') ||
        url.includes('code=') ||
        url.includes('error=');

    if (isAuthCallback) {
        console.log('Supabase: Detected OAuth callback URL, processing...');

        // Supabase's detectSessionInUrl should handle this automatically,
        // but we log for debugging purposes
        supabase.auth.getSession().then(({ data, error }) => {
            if (error) {
                console.error('Supabase: Error processing OAuth callback:', error);
            } else if (data.session) {
                console.log('Supabase: OAuth callback processed, session established');
                // Clean up the URL by removing the hash/query params
                // This prevents issues with the OAuth params persisting
                if (window.history && window.history.replaceState) {
                    const cleanUrl = window.location.origin + window.location.pathname;
                    window.history.replaceState({}, document.title, cleanUrl);
                    console.log('Supabase: Cleaned up URL after OAuth callback');
                }
            } else {
                console.log('Supabase: OAuth callback detected but no session yet');
            }
        });
    }
}

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
    return !!isValidConfig;
};

// ============================================================================
// APP STATE & CONNECTION MANAGEMENT
// Handles sleep/wake cycles to prevent stale connections and expired tokens
// ============================================================================

let appStateSubscription: { remove: () => void } | null = null;
let lastActiveTime: number = Date.now();

/**
 * Refreshes the Supabase session when the app comes to foreground.
 * This prevents issues with stale tokens after device sleep.
 */
export const refreshSession = async (): Promise<boolean> => {
    try {
        console.log('Supabase: Refreshing session after wake...');
        const { error } = await supabase.auth.refreshSession();

        if (error) {
            console.warn('Supabase: Session refresh failed:', error.message);
            // If refresh fails, check if we have a valid session
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) {
                console.log('Supabase: No valid session after refresh attempt');
                return false;
            }
        }

        console.log('Supabase: Session refreshed successfully');
        return true;
    } catch (error) {
        console.error('Supabase: Error refreshing session:', error);
        return false;
    }
};

/**
 * Reconnects all active Supabase realtime channels.
 * Call this after the app wakes from sleep to restore subscriptions.
 */
export const reconnectRealtime = async (): Promise<void> => {
    try {
        console.log('Supabase: Reconnecting realtime channels...');

        // Get all channels and reconnect them
        const channels = supabase.getChannels();

        for (const channel of channels) {
            // Unsubscribe and resubscribe to force reconnection
            const channelName = channel.topic;
            console.log(`Supabase: Reconnecting channel: ${channelName}`);

            // The channel will automatically attempt to reconnect
            // Force a reconnect by unsubscribing and resubscribing
            channel.unsubscribe();
            channel.subscribe();
        }

        console.log(`Supabase: Reconnected ${channels.length} realtime channels`);
    } catch (error) {
        console.error('Supabase: Error reconnecting realtime:', error);
    }
};

/**
 * Handles app state changes (background/foreground transitions).
 * Automatically refreshes session and reconnects realtime on wake.
 */
const handleAppStateChange = async (nextAppState: AppStateStatus): Promise<void> => {
    const now = Date.now();
    const timeSinceActive = now - lastActiveTime;

    console.log(`Supabase: App state changed to: ${nextAppState}, time since active: ${Math.round(timeSinceActive / 1000)}s`);

    if (nextAppState === 'active') {
        // App came to foreground
        // Only refresh if we've been inactive for more than 30 seconds
        // This prevents unnecessary refreshes on quick app switches
        if (timeSinceActive > 30000) {
            console.log('Supabase: App woke after extended sleep, refreshing...');

            // Refresh session first
            const sessionValid = await refreshSession();

            if (sessionValid) {
                // Then reconnect realtime channels
                await reconnectRealtime();
            }
        }
    }

    lastActiveTime = now;
};

/**
 * Starts monitoring app state changes.
 * Call this once when the app initializes (e.g., in App.tsx or AuthProvider).
 */
export const startAppStateMonitoring = (): void => {
    if (appStateSubscription) {
        console.log('Supabase: App state monitoring already active');
        return;
    }

    console.log('Supabase: Starting app state monitoring');
    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    lastActiveTime = Date.now();
};

/**
 * Stops monitoring app state changes.
 * Call this on cleanup if needed.
 */
export const stopAppStateMonitoring = (): void => {
    if (appStateSubscription) {
        appStateSubscription.remove();
        appStateSubscription = null;
        console.log('Supabase: Stopped app state monitoring');
    }
};

/**
 * Performs a health check on the Supabase connection.
 * Returns true if the connection is healthy.
 */
export const checkConnectionHealth = async (): Promise<{ healthy: boolean; session: boolean; realtime: boolean }> => {
    const result = { healthy: false, session: false, realtime: false };

    try {
        // Check session
        const { data } = await supabase.auth.getSession();
        result.session = !!data.session;

        // Check realtime connection state
        const channels = supabase.getChannels();
        result.realtime = channels.length === 0 || channels.some(ch => ch.state === 'joined');

        result.healthy = result.session || !isValidConfig; // Healthy if session valid or not configured (dev mode)

        console.log('Supabase: Connection health check:', result);
    } catch (error) {
        console.error('Supabase: Health check failed:', error);
    }

    return result;
};
