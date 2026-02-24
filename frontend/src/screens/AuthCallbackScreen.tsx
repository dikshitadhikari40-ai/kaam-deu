import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { supabase } from '../lib/supabase';

/**
 * AuthCallbackScreen - Handles OAuth callback redirects
 *
 * This screen is shown briefly after OAuth providers (Google, LinkedIn) redirect back to the app.
 * Supabase's detectSessionInUrl: true option automatically handles extracting the session
 * from the URL hash/query params. This screen just shows a loading state while that happens.
 *
 * The AuthContext's onAuthStateChange listener will detect the new session and
 * update the navigation accordingly.
 */
export default function AuthCallbackScreen() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('AuthCallbackScreen: Handling OAuth callback...');

        // On web, Supabase automatically handles the session from URL when detectSessionInUrl is true
        // We just need to check if a session was established
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          // Check for error in URL hash (OAuth errors come as hash fragments)
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const error = hashParams.get('error');
          const errorDescription = hashParams.get('error_description');

          if (error) {
            console.error('AuthCallbackScreen: OAuth error in URL:', error, errorDescription);
            setErrorMessage(errorDescription || error);
            setStatus('error');
            return;
          }

          // Check for access_token in hash (successful OAuth)
          const accessToken = hashParams.get('access_token');
          if (accessToken) {
            console.log('AuthCallbackScreen: Found access token in URL hash');
            // Supabase should handle this automatically, but we can manually set the session
            // if needed. For now, just wait for onAuthStateChange to fire.
          }

          // Also check query params (some OAuth flows use query strings)
          const queryParams = new URLSearchParams(window.location.search);
          const code = queryParams.get('code');
          if (code) {
            console.log('AuthCallbackScreen: Found authorization code in URL');
            // Supabase will exchange this code for a session automatically
          }
        }

        // Wait a moment for Supabase to process the callback
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if we have a session now
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('AuthCallbackScreen: Error getting session:', error);
          setErrorMessage(error.message);
          setStatus('error');
          return;
        }

        if (session) {
          console.log('AuthCallbackScreen: Session established successfully');
          setStatus('success');
          // The AuthContext onAuthStateChange will handle navigation
        } else {
          console.log('AuthCallbackScreen: No session yet, waiting for auth state change...');
          // Session might still be processing, keep showing loading
          // The onAuthStateChange listener will handle it
        }
      } catch (err: any) {
        console.error('AuthCallbackScreen: Unexpected error:', err);
        setErrorMessage(err.message || 'Authentication failed');
        setStatus('error');
      }
    };

    handleCallback();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color="#C9A962" />
            <Text style={styles.text}>Completing sign in...</Text>
            <Text style={styles.subtext}>Please wait while we verify your account</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <View style={styles.successIcon}>
              <Text style={styles.successCheck}>&#x2713;</Text>
            </View>
            <Text style={styles.text}>Sign in successful!</Text>
            <Text style={styles.subtext}>Redirecting...</Text>
          </>
        )}

        {status === 'error' && (
          <>
            <View style={styles.errorIcon}>
              <Text style={styles.errorX}>&#x2717;</Text>
            </View>
            <Text style={styles.text}>Sign in failed</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Text style={styles.subtext}>Please try again</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 24,
  },
  text: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  subtext: {
    color: '#8BA3C4',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successCheck: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  errorIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorX: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
});
