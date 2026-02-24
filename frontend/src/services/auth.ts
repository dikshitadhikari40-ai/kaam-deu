import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { UserRole } from '../context/AuthContext';

// Initialize WebBrowser for OAuth redirects
WebBrowser.maybeCompleteAuthSession();

// Get config from environment variables via app.config.js
const config = Constants.expoConfig?.extra || {};

// Helper to get proper redirect URL based on platform
const getRedirectUrl = (): string => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location) {
      const redirectUrl = `${window.location.origin}/auth/callback`;
      console.log('auth.ts getRedirectUrl (web):', redirectUrl);
      return redirectUrl;
    }
    console.log('auth.ts getRedirectUrl (web): Using fallback localhost URL');
    return 'http://localhost:8081/auth/callback';
  }
  const nativeRedirectUri = makeRedirectUri({
    scheme: 'kaamdeu',
    path: 'auth/callback',
  });
  console.log('auth.ts getRedirectUrl (native):', nativeRedirectUri);
  return nativeRedirectUri;
};

// Google client IDs from environment config
// IMPORTANT: These must be set in .env - do not hardcode credentials
const googleWebClientId = config.googleWebClientId || '';
const googleIosClientId = config.googleIosClientId || '';
const googleAndroidClientId = config.googleAndroidClientId || '';

// Warn in development if credentials are missing
if (__DEV__) {
  if (!googleWebClientId) {
    console.warn('Google OAuth: GOOGLE_WEB_CLIENT_ID not configured in .env');
  }
}

// LinkedIn is always configured via Supabase (no client-side credentials needed)
export const isLinkedInConfigured = true;

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  photo_url?: string;
}

export const authService = {
  // Get current user
  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    return {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.full_name || user.user_metadata?.name,
      photo_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
    };
  },

  // Sign in with Google using Supabase OAuth
  async signInWithGoogle(): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      console.log('Google Auth: Starting OAuth with Supabase', {
        redirectTo: getRedirectUrl(),
        supabaseUrl: (supabase as any).supabaseUrl
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getRedirectUrl(),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Google Auth: Supabase returned error:', error);
        return { user: null, error: error.message };
      }

      console.log('Google Auth: Redirect initiated by Supabase', { url: data?.url });

      // The OAuth flow will redirect, so we return null here
      // The app will pick up the session after redirect
      return { user: null, error: null };
    } catch (error: any) {
      console.error('Google sign in error:', error);
      return { user: null, error: error.message };
    }
  },

  // Sign in with email (magic link)
  async signInWithEmail(email: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: getRedirectUrl(),
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Sign in with email and password
  async signInWithPassword(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      console.log('authService: Attempting sign in with password for:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        console.error('authService: Sign in error:', error.message);
        return { user: null, error: error.message };
      }

      if (!data.session) {
        console.log('authService: No session returned - email may need confirmation');
        return { user: null, error: 'Please check your email and confirm your account before logging in.' };
      }

      if (data.user) {
        console.log('authService: Sign in successful for user:', data.user.id);
        return {
          user: {
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.full_name,
            photo_url: data.user.user_metadata?.avatar_url,
          },
          error: null,
        };
      }

      return { user: null, error: 'No user returned' };
    } catch (error: any) {
      console.error('authService: Unexpected error:', error);
      return { user: null, error: error.message };
    }
  },

  // Sign up with email and password
  async signUpWithPassword(email: string, password: string, name: string): Promise<{ user: AuthUser | null; error: string | null; requiresConfirmation?: boolean }> {
    try {
      console.log('authService: Attempting sign up for:', email);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        console.error('authService: Sign up error:', error.message);
        return { user: null, error: error.message };
      }

      // Check if email confirmation is required
      // Supabase returns user but no session when email confirmation is required
      if (data.user && !data.session) {
        console.log('authService: Sign up successful but email confirmation required');
        return {
          user: {
            id: data.user.id,
            email: data.user.email || '',
            name: name,
          },
          error: null,
          requiresConfirmation: true,
        };
      }

      if (data.user) {
        console.log('authService: Sign up successful for user:', data.user.id);
        return {
          user: {
            id: data.user.id,
            email: data.user.email || '',
            name: name,
          },
          error: null,
          requiresConfirmation: false,
        };
      }

      return { user: null, error: 'No user returned' };
    } catch (error: any) {
      console.error('authService: Unexpected error during signup:', error);
      return { user: null, error: error.message };
    }
  },

  // Sign out
  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },

  // Listen for auth state changes
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        callback({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
          photo_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
        });
      } else {
        callback(null);
      }
    });
  },

  // Get session
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // Send password reset email
  async sendPasswordReset(email: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: Platform.OS === 'web'
          ? `${window.location.origin}/auth/reset-password`
          : 'kaamdeu://auth/reset-password',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Update password (after clicking reset link)
  async updatePassword(newPassword: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Resend email verification
  async resendVerificationEmail(email: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: Platform.OS === 'web'
            ? `${window.location.origin}/auth/callback`
            : 'kaamdeu://auth/callback',
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};

// Hook for using Google auth with Expo
export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: googleWebClientId,
    iosClientId: googleIosClientId,
    androidClientId: googleAndroidClientId,
  });

  const signIn = async () => {
    const result = await promptAsync();

    if (result.type === 'success') {
      const { id_token } = result.params;

      // Sign in to Supabase with the Google token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: id_token,
      });

      if (error) {
        console.error('Supabase sign in error:', error);
        return { user: null, error: error.message };
      }

      if (data.user) {
        return {
          user: {
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
            photo_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
          },
          error: null,
        };
      }
    }

    return { user: null, error: 'Sign in cancelled' };
  };

  return { request, signIn };
}

// Hook for using LinkedIn auth with Supabase OAuth (same pattern as Google)
export function useLinkedInAuth() {
  const signIn = async (role?: UserRole): Promise<{ user: { id: string; email: string; name: string; picture?: string } | null; error: string | null }> => {
    try {
      const redirectUrl = getRedirectUrl();
      console.log('LinkedIn Auth: Starting Supabase OAuth with redirect:', redirectUrl);
      console.log('LinkedIn Auth: Platform:', Platform.OS);
      console.log('LinkedIn Auth: User role being passed:', role);

      // For native platforms (iOS/Android), we need to use expo-web-browser
      // to open the OAuth URL and handle the redirect properly
      if (Platform.OS !== 'web') {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'linkedin_oidc',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
            data: { role }, // Pass the role to the auth trigger
          } as any,
        });

        if (error) {
          console.error('LinkedIn sign in error:', error);
          return { user: null, error: error.message };
        }

        if (!data?.url) {
          console.error('LinkedIn Auth: No OAuth URL returned');
          return { user: null, error: 'Failed to get LinkedIn login URL' };
        }

        console.log('LinkedIn Auth: Opening WebBrowser with URL:', data.url);
        console.log('LinkedIn Auth: Expected callback scheme:', 'kaamdeu');

        // Open the OAuth URL in the system browser
        // The browser will redirect to Supabase callback, which redirects to our app deep link
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl, // This is the URL we expect to be redirected back to (kaamdeu://auth/callback)
          {
            showInRecents: true,
            preferEphemeralSession: false, // Keep cookies for better UX
          }
        );

        console.log('LinkedIn Auth: WebBrowser result type:', result.type);

        if (result.type === 'success' && result.url) {
          console.log('LinkedIn Auth: Success! Callback URL:', result.url);
          // The URL contains the auth tokens as hash/query parameters
          // We need to manually extract and set the session for native apps
          // since detectSessionInUrl only works automatically on web

          try {
            // Parse the callback URL to extract tokens
            const url = new URL(result.url);
            // Tokens can be in hash fragment (#access_token=...) or query params (?access_token=...)
            const hashParams = new URLSearchParams(url.hash.substring(1));
            const queryParams = new URLSearchParams(url.search);

            const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');

            if (accessToken && refreshToken) {
              console.log('LinkedIn Auth: Found tokens, setting session...');
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (error) {
                console.error('LinkedIn Auth: Error setting session:', error);
                return { user: null, error: error.message };
              }

              console.log('LinkedIn Auth: Session set successfully!', { userId: data.user?.id });
              return { user: null, error: null };
            } else {
              // Check for error in URL
              const errorParam = hashParams.get('error') || queryParams.get('error');
              const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
              if (errorParam) {
                console.error('LinkedIn Auth: OAuth error:', errorParam, errorDescription);
                return { user: null, error: errorDescription || errorParam };
              }

              console.log('LinkedIn Auth: No tokens in URL, session may be set via detectSessionInUrl');
              // Fall through - session might already be set automatically
            }
          } catch (parseError) {
            console.error('LinkedIn Auth: Error parsing callback URL:', parseError);
            // Continue anyway - session might be set via other means
          }

          return { user: null, error: null };
        } else if (result.type === 'cancel' || result.type === 'dismiss') {
          console.log('LinkedIn Auth: User cancelled');
          return { user: null, error: 'Sign in cancelled' };
        } else {
          console.log('LinkedIn Auth: Unexpected result:', result);
          return { user: null, error: 'LinkedIn sign in failed' };
        }
      }

      // For web platform, use standard redirect flow
      console.log('LinkedIn Auth: Starting web redirect flow', {
        redirectTo: redirectUrl,
        provider: 'linkedin_oidc'
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'linkedin_oidc',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
          data: { role }, // Pass the role to the auth trigger
        } as any,
      });

      if (error) {
        console.error('LinkedIn Auth: Supabase web error:', error);
        return { user: null, error: error.message };
      }

      console.log('LinkedIn Auth: Redirect initiated', { url: data?.url });

      // The OAuth flow will redirect, so we return null here
      // The app will pick up the session after redirect via onAuthStateChange
      console.log('LinkedIn Auth: OAuth initiated, awaiting redirect');
      return { user: null, error: null };
    } catch (error: any) {
      console.error('LinkedIn sign in error:', error);
      return { user: null, error: error.message || 'LinkedIn sign in failed' };
    }
  };

  return { request: true, signIn };
}

// ============================================
// ACCOUNT LINKING FUNCTIONS
// ============================================
// These functions allow users who signed up with email/password
// to link their Google or LinkedIn accounts

export const accountLinkingService = {
  // Get current user's linked identities
  async getLinkedAccounts(): Promise<{ google: boolean; linkedin: boolean; email: boolean }> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        return { google: false, linkedin: false, email: false };
      }

      const identities = user.identities || [];

      return {
        google: identities.some(id => id.provider === 'google'),
        linkedin: identities.some(id => id.provider === 'linkedin_oidc'),
        email: identities.some(id => id.provider === 'email'),
      };
    } catch (error) {
      console.error('Error getting linked accounts:', error);
      return { google: false, linkedin: false, email: false };
    }
  },

  // Link Google account to existing user
  async linkGoogleAccount(): Promise<{ success: boolean; error: string | null }> {
    try {
      const redirectUrl = getRedirectUrl();
      console.log('Account Linking: Starting Google link with redirect:', redirectUrl);

      // Use linkIdentity to link Google to existing account
      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Google account linking error:', error);
        return { success: false, error: error.message };
      }

      console.log('Account Linking: Google link initiated');
      return { success: true, error: null };
    } catch (error: any) {
      console.error('Google account linking error:', error);
      return { success: false, error: error.message };
    }
  },

  // Link LinkedIn account to existing user
  async linkLinkedInAccount(): Promise<{ success: boolean; error: string | null }> {
    try {
      const redirectUrl = getRedirectUrl();
      console.log('Account Linking: Starting LinkedIn link with redirect:', redirectUrl);

      // For native platforms, handle with WebBrowser
      if (Platform.OS !== 'web') {
        const { data, error } = await supabase.auth.linkIdentity({
          provider: 'linkedin_oidc',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
          },
        });

        if (error) {
          console.error('LinkedIn account linking error:', error);
          return { success: false, error: error.message };
        }

        if (!data?.url) {
          return { success: false, error: 'Failed to get LinkedIn linking URL' };
        }

        // Open the OAuth URL in the system browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl,
          {
            showInRecents: true,
            preferEphemeralSession: false,
          }
        );

        if (result.type === 'success' && result.url) {
          // Parse tokens from callback URL
          try {
            const url = new URL(result.url);
            const hashParams = new URLSearchParams(url.hash.substring(1));
            const queryParams = new URLSearchParams(url.search);

            const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');

            if (accessToken && refreshToken) {
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
            }
          } catch (parseError) {
            console.error('Error parsing callback URL:', parseError);
          }
          return { success: true, error: null };
        } else if (result.type === 'cancel' || result.type === 'dismiss') {
          return { success: false, error: 'Account linking cancelled' };
        }
        return { success: false, error: 'LinkedIn account linking failed' };
      }

      // For web platform
      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'linkedin_oidc',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error('LinkedIn account linking error:', error);
        return { success: false, error: error.message };
      }

      console.log('Account Linking: LinkedIn link initiated');
      return { success: true, error: null };
    } catch (error: any) {
      console.error('LinkedIn account linking error:', error);
      return { success: false, error: error.message };
    }
  },

  // Unlink an identity (Google or LinkedIn)
  async unlinkAccount(provider: 'google' | 'linkedin_oidc'): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        return { success: false, error: 'Not authenticated' };
      }

      const identities = user.identities || [];
      const identity = identities.find(id => id.provider === provider);

      if (!identity) {
        return { success: false, error: `No ${provider} account linked` };
      }

      // Check if this is the only identity - don't allow unlinking if it's the only auth method
      if (identities.length <= 1) {
        return { success: false, error: 'Cannot unlink your only authentication method. Add another login method first.' };
      }

      const { error } = await supabase.auth.unlinkIdentity(identity);

      if (error) {
        console.error(`Error unlinking ${provider}:`, error);
        return { success: false, error: error.message };
      }

      console.log(`Account Linking: ${provider} unlinked successfully`);
      return { success: true, error: null };
    } catch (error: any) {
      console.error(`Error unlinking ${provider}:`, error);
      return { success: false, error: error.message };
    }
  },
};
