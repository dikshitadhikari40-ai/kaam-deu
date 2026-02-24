import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

// Cross-platform alert helper
const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';
import { useAuth, UserRole } from '../context/AuthContext';
import { useLinkedInAuth, isLinkedInConfigured, authService } from '../services/auth';
import { supabase } from '../lib/supabase';

// Email validation helper
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Helper to get proper redirect URL based on platform
const getRedirectUrl = (): string => {
  if (Platform.OS === 'web') {
    // For web, use current origin with auth callback path
    if (typeof window !== 'undefined' && window.location) {
      const redirectUrl = `${window.location.origin}/auth/callback`;
      console.log('getRedirectUrl (web): Generated redirect URL:', redirectUrl);
      return redirectUrl;
    }
    console.log('getRedirectUrl (web): Using fallback localhost URL');
    return 'http://localhost:8081/auth/callback';
  }
  // For native, use the app scheme
  const nativeRedirectUri = makeRedirectUri({
    scheme: 'kaamdeu',
    path: 'auth/callback',
  });
  console.log('getRedirectUrl (native): Generated redirect URL:', nativeRedirectUri);
  return nativeRedirectUri;
};

// Get config from environment variables via app.config.js
const config = Constants.expoConfig?.extra || {};

// Google OAuth credentials - check both app.config.js extra AND direct env vars (for web)
// IMPORTANT: These must be set in .env - do not hardcode credentials
const googleConfig = {
  iosClientId: config.googleIosClientId || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
  androidClientId: config.googleAndroidClientId || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
  webClientId: config.googleWebClientId || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
};

// Debug: Log the config to see what's loaded
console.log('Google OAuth Config:', {
  webClientId: googleConfig.webClientId ? `${googleConfig.webClientId.substring(0, 20)}...` : 'NOT SET',
  iosClientId: googleConfig.iosClientId ? 'SET' : 'NOT SET',
  fromExtra: !!config.googleWebClientId,
  fromEnv: !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

// Google OAuth is configured if we have at least web client ID
const isGoogleConfigured = !!googleConfig.webClientId;

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { selectedRole, login, register, socialLogin } = useAuth();
  // Let expo-auth-session handle the redirect URI automatically
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: googleConfig.iosClientId,
    androidClientId: googleConfig.androidClientId,
    webClientId: googleConfig.webClientId,
    scopes: ['openid', 'profile', 'email'],  // openid is required for ID token
  });

  // Debug: Log the actual redirect URI being used
  React.useEffect(() => {
    if (request) {
      console.log('Google Auth Request:', {
        redirectUri: request.redirectUri,
        url: request.url,
      });
    }
  }, [request]);

  // LinkedIn Auth
  const { signIn: linkedinSignIn } = useLinkedInAuth();

  const handleLinkedInLogin = async (role?: UserRole) => {
    console.log('LinkedIn Login: Button pressed with role:', role);
    if (!isLinkedInConfigured) {
      showAlert(
        'LinkedIn Not Configured',
        'LinkedIn OAuth is not configured. Please enable LinkedIn in your Supabase dashboard.'
      );
      return;
    }

    setLoading(true);
    try {
      console.log('LinkedIn Login: Calling linkedinSignIn via Supabase...');
      const result = await linkedinSignIn(role);
      console.log('LinkedIn Login: Got result', { hasUser: !!result.user, error: result.error });

      // With Supabase OAuth, the user will be redirected to LinkedIn
      // After successful auth, they'll be redirected back and onAuthStateChange will handle it
      if (result.error) {
        console.error('LinkedIn Login: Error from linkedinSignIn:', result.error);
        if (result.error !== 'Sign in cancelled') {
          showAlert('LinkedIn Error', `Failed to connect to LinkedIn: ${result.error}`);
        }
      } else {
        console.log('LinkedIn Login: OAuth initiated successfully');
      }
      // Note: If no error, the OAuth flow has started and user will be redirected
    } catch (error: any) {
      console.error('LinkedIn Login: Unexpected error:', error);
      showAlert('Error', error.message || 'LinkedIn sign in failed');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (response?.type === 'success') {
      // Debug: log the full response to see where the token is
      console.log('Google OAuth response:', JSON.stringify(response, null, 2));

      const { authentication, params } = response as any;

      // ID token can be in authentication.idToken OR params.id_token depending on responseType
      const idToken = authentication?.idToken || params?.id_token;
      const accessToken = authentication?.accessToken;

      console.log('Google OAuth tokens:', {
        hasIdToken: !!idToken,
        hasAccessToken: !!accessToken,
        idTokenPreview: idToken ? idToken.substring(0, 50) + '...' : 'none'
      });

      // Use Supabase's signInWithIdToken for proper Google OAuth
      // This works for both new users AND existing Google OAuth users
      const handleGoogleAuth = async () => {
        try {
          setLoading(true);

          if (idToken) {
            // Best path: use ID token with Supabase
            console.log('Google OAuth: Using signInWithIdToken');
            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: idToken,
            });

            if (error) {
              console.error('Google signInWithIdToken error:', error);
              throw error;
            }

            console.log('Google OAuth: Success!', { userId: data.user?.id, email: data.user?.email });
            // The onAuthStateChange listener in AuthContext will handle the rest
            return;
          }

          // Fallback: No ID token, use access token to get user info
          // Then use Supabase's native OAuth redirect instead
          if (accessToken) {
            console.log('No ID token, using Supabase native OAuth instead');

            // Use Supabase's signInWithOAuth which handles everything properly
            const { error } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: getRedirectUrl(),
              }
            });

            if (error) {
              throw error;
            }
            // User will be redirected to Google and back
            return;
          }

          throw new Error('No authentication tokens received from Google');

        } catch (err: any) {
          console.error('Google auth error:', err);
          showAlert('Google Sign In Error', err.message || 'Failed to sign in with Google');
        } finally {
          setLoading(false);
        }
      };

      handleGoogleAuth();
    } else if (response?.type === 'error') {
      showAlert('Google Sign In Error', response.error?.message || 'Unknown error');
    }
  }, [response]);

  const handleSocialLogin = async (provider: 'google' | 'linkedin', providerId: string, email: string, name: string, photoUrl?: string) => {
    setLoading(true);
    try {
      await socialLogin(provider, providerId, email, name, photoUrl, selectedRole as any);
    } catch (error: any) {
      showAlert('Login Error', error.message || 'Social login failed');
    } finally {
      setLoading(false);
    }
  };
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!email || !isValidEmail(email)) {
      showAlert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.sendPasswordReset(email);
      if (result.success) {
        showAlert(
          'Password Reset Email Sent',
          'Check your email for a link to reset your password. If you don\'t see it, check your spam folder.'
        );
        setShowForgotPassword(false);
      } else {
        showAlert('Error', result.error || 'Failed to send password reset email');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Trim inputs
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedName = name.trim();

    if (!trimmedEmail || !trimmedPassword) {
      showAlert('Error', 'Please enter email and password');
      return;
    }

    // Validate email format
    if (!isValidEmail(trimmedEmail)) {
      showAlert('Error', 'Please enter a valid email address');
      return;
    }

    // Validate password length for registration
    if (!isLogin && trimmedPassword.length < 6) {
      showAlert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (!isLogin && !trimmedName) {
      showAlert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(trimmedEmail, trimmedPassword);
      } else {
        const profile = selectedRole === 'worker'
          ? { name: trimmedName, job_title: 'New Worker' }
          : { company_name: trimmedName, contact_person: trimmedName };
        await register(trimmedEmail, trimmedPassword, selectedRole, profile);
      }
      // Navigation is handled by RootNavigator based on auth state
    } catch (error: any) {
      // Provide user-friendly error messages
      let errorMessage = error.message || 'Authentication failed';

      // Handle common Supabase auth errors
      if (errorMessage.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (errorMessage.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and confirm your account before logging in.';
      } else if (errorMessage.includes('User already registered')) {
        errorMessage = 'An account with this email already exists. Please log in instead.';
      } else if (errorMessage.includes('Password should be at least')) {
        errorMessage = 'Password must be at least 6 characters long.';
      } else if (errorMessage.includes('Unable to validate email')) {
        errorMessage = 'Please enter a valid email address.';
      }

      showAlert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplay = () => {
    if (selectedRole === 'worker') return 'Worker';
    if (selectedRole === 'business') return 'Business';
    return 'Worker';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Role Badge */}
          <View style={styles.header}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {getRoleDisplay()}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {isLogin ? 'Sign in' : 'Create an account'}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin
              ? 'Your next job starts here'
              : 'Sign in to see your personalized job recommendations.'}
          </Text>

          {/* Form */}
          <View style={styles.form}>
            {!isLogin && (
              <View style={styles.inputContainer}>
                {/* <Feather name="user" size={20} color="#888" style={styles.inputIcon} /> */}
                <TextInput
                  style={styles.input}
                  placeholder={selectedRole === 'worker' ? 'Your Name' : 'Company Name'}
                  placeholderTextColor="#666"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              {/* <Feather name="mail" size={20} color="#888" style={styles.inputIcon} /> */}
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              {/* <Feather name="lock" size={20} color="#888" style={styles.inputIcon} /> */}
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {isLogin && (
              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={handleForgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isLogin ? 'Log In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={[styles.googleButton, !isGoogleConfigured && styles.socialButtonDisabled]}
                onPress={async () => {
                  console.log('Google button pressed!');

                  // Use Supabase's native OAuth for Google - this is the most reliable method
                  // It handles both new users and existing Google OAuth users properly
                  if (Platform.OS === 'web') {
                    setLoading(true);
                    try {
                      const redirectUrl = getRedirectUrl();
                      console.log('Google OAuth: Starting with redirect URL:', redirectUrl);

                      const { data, error } = await supabase.auth.signInWithOAuth({
                        provider: 'google',
                        options: {
                          redirectTo: redirectUrl,
                          queryParams: {
                            access_type: 'offline',
                            prompt: 'consent',
                          },
                          data: { role: selectedRole }, // Pass the role to the auth trigger
                        } as any
                      });

                      console.log('Google OAuth: Response', { url: data?.url, error });
                      console.log('Google OAuth: full data', data);

                      if (error) {
                        console.error('Google OAuth error:', error);
                        showAlert('Google Sign In Error', `Authentication failed: ${error.message}. Please check if your project URL is correct.`);
                      } else if (!data?.url) {
                        console.error('Google OAuth error: No URL returned');
                        showAlert('Google Sign In Error', 'No redirection URL received from Supabase. The project might be misconfigured.');
                      } else {
                        console.log('Google OAuth: Redirecting to', data.url);
                        // For web, window.location.href works better for absolute redirects from Supabase
                        if (Platform.OS === 'web') {
                          window.location.href = data.url;
                        }
                      }
                    } catch (err: any) {
                      console.error('Google OAuth error:', err);
                      showAlert('Google Sign In Error', err.message || 'Failed to start Google sign in');
                    } finally {
                      setLoading(false);
                    }
                    return;
                  }

                  // For native platforms (Android/iOS), use Supabase OAuth directly
                  // This is more reliable than expo-auth-session for production builds
                  console.log('Google button: Native platform, using Supabase OAuth');
                  setLoading(true);
                  try {
                    const redirectUrl = getRedirectUrl();
                    console.log('Google OAuth (native): Starting with redirect URL:', redirectUrl);

                    const { data, error } = await supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: {
                        redirectTo: redirectUrl,
                        queryParams: {
                          access_type: 'offline',
                          prompt: 'consent',
                        },
                      }
                    });

                    console.log('Google OAuth (native): Response', { url: data?.url, error });

                    if (error) {
                      console.error('Google OAuth error:', error);
                      showAlert('Google Sign In Error', error.message);
                    }
                    // User will be redirected to Google and back via deep link
                  } catch (err: any) {
                    console.error('Google OAuth error:', err);
                    showAlert('Google Sign In Error', err.message || 'Failed to start Google sign in');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {/* Google Multicolor G Logo */}
                <View style={styles.googleLogoWrapper}>
                  <View style={styles.googleLogoOuter}>
                    <View style={[styles.googleArc, styles.googleArcBlue]} />
                    <View style={[styles.googleArc, styles.googleArcGreen]} />
                    <View style={[styles.googleArc, styles.googleArcYellow]} />
                    <View style={[styles.googleArc, styles.googleArcRed]} />
                    <View style={styles.googleLogoInner}>
                      <View style={styles.googleBar} />
                    </View>
                  </View>
                </View>
                <Text style={styles.googleButtonText}>Google</Text>
              </TouchableOpacity>
              <Pressable
                style={({ pressed }) => [
                  styles.linkedinButton,
                  loading && styles.socialButtonDisabled,
                  pressed && { opacity: 0.7 }
                ]}
                onPress={() => {
                  console.log('LinkedIn button tapped!');
                  handleLinkedInLogin(selectedRole);
                }}
                disabled={loading}
              >
                <View style={styles.linkedinIconContainer}>
                  <Text style={styles.linkedinIn}>in</Text>
                </View>
                <Text style={styles.linkedinButtonText}>LinkedIn</Text>
              </Pressable>
            </View>

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setIsLogin(!isLogin)}
            >
              <Text style={styles.toggleText}>
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <Text style={styles.toggleTextHighlight}>
                  {isLogin ? 'Sign Up' : 'Log In'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // White background
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f2f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d4d2d0',
    gap: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2557a7',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2d2d2d',
    marginBottom: 8,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 16,
    color: '#6f6f6f',
    textAlign: 'left',
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d4d2d0',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2d2d2d',
  },
  submitButton: {
    backgroundColor: '#2557a7',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  toggleText: {
    color: '#8BA3C4',
    fontSize: 14,
  },
  toggleTextHighlight: {
    color: '#2557a7',
    fontWeight: '600',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-start',
    marginTop: -8,
    marginBottom: 8,
  },
  forgotPasswordText: {
    color: '#2557a7',
    fontSize: 14,
    fontWeight: '500',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#d4d2d0',
  },
  dividerText: {
    color: '#6f6f6f',
    marginHorizontal: 10,
    fontSize: 14,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 10,
  },
  socialButton: {
    flex: 1,
    backgroundColor: '#1A2F4A',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A4A6A',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  socialButtonDisabled: {
    opacity: 0.5,
  },
  socialButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Google Button Styles
  googleButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  googleLogoWrapper: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleLogoOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleArc: {
    position: 'absolute',
    width: 20,
    height: 20,
  },
  googleArcBlue: {
    backgroundColor: '#4285F4',
    borderTopRightRadius: 10,
    top: 0,
    right: 0,
    width: 10,
    height: 10,
  },
  googleArcGreen: {
    backgroundColor: '#34A853',
    borderBottomRightRadius: 10,
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
  },
  googleArcYellow: {
    backgroundColor: '#FBBC05',
    borderBottomLeftRadius: 10,
    bottom: 0,
    left: 0,
    width: 10,
    height: 10,
  },
  googleArcRed: {
    backgroundColor: '#EA4335',
    borderTopLeftRadius: 10,
    top: 0,
    left: 0,
    width: 10,
    height: 10,
  },
  googleLogoInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'flex-end',
    zIndex: 1,
  },
  googleBar: {
    width: 8,
    height: 3,
    backgroundColor: '#4285F4',
    marginRight: -4,
  },
  googleButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  // LinkedIn Button Styles
  linkedinButton: {
    flex: 1,
    backgroundColor: '#0A66C2',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#0A66C2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  linkedinIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkedinIn: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0A66C2',
  },
  linkedinButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
