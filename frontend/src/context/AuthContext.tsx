/**
 * AUTH CONTEXT INVARIANTS
 *
 * - user === Supabase auth user (nullable)
 * - profile === DB profile (nullable)
 * - isAuthenticated === Boolean(user)
 * - isLoading === true ONLY during initial session resolution
 *
 * Never:
 * - Fetch auth state outside this context
 * - Derive auth state in screens
 * - Navigate based on auth in screens (RootNavigator handles this)
 */

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured, startAppStateMonitoring, stopAppStateMonitoring } from '../lib/supabase';
import { profileService, streakService } from '../services/database';

// Storage key for persisting selected role across OAuth redirects
const SELECTED_ROLE_KEY = '@kaamdeu:selectedRole';
// Welcome state is now stored PER USER in the database (has_seen_welcome field)
// This ensures it persists across logout/login and is tied to the user account
const HAS_SEEN_WELCOME_KEY_PREFIX = '@kaamdeu:hasSeenWelcome:';

export type UserRole = 'worker' | 'business' | null;

interface User {
    id: string;
    email: string;
    role: UserRole;
    name?: string;
    profile_pic?: string;
}

interface Profile {
    id: string;
    email: string;
    role: UserRole;
    name: string;
    is_profile_complete: boolean;
    // Worker fields
    job_title?: string;
    bio?: string;
    skills?: string[];
    experience_years?: number;
    expected_salary_min?: number;
    expected_salary_max?: number;
    preferred_employment?: string[];
    availability?: string;
    current_location?: string;
    location?: string;
    preferred_locations?: string[];
    willing_to_relocate?: boolean;
    resume_url?: string;
    certifications?: string[];
    portfolio_urls?: string[];
    languages?: string[];
    education?: string;
    photos?: string[];
    photo_url?: string;
    video_intro_url?: string;
    // Worker onboarding fields
    job_categories?: string[];
    salary_type?: string;
    home_area?: string;
    travel_distance?: string;
    needs_accommodation?: boolean;
    employment_types?: string[];
    // Business fields
    company_name?: string;
    company_type?: string;
    company_size?: string;
    industry?: string;
    description?: string;
    website?: string;
    contact_person?: string;
    contact_position?: string;
    contact_phone?: string;
    multiple_locations?: string[];
    is_verified_business?: boolean;
    logo_url?: string;
    cover_photo_url?: string;
    office_photos?: string[];
    typically_hiring?: string[];
    benefits_offered?: string[];
    // Timestamps
    created_at?: string;
    updated_at?: string;
}

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    isProfileComplete: boolean;
    hasSeenWelcome: boolean;
    user: User | null;
    profile: Profile | null;
    selectedRole: UserRole;
    effectiveRole: 'worker' | 'business'; // Never null - always has a fallback
    setSelectedRole: (role: UserRole) => Promise<void>; // Fixed: Returns Promise
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, role: UserRole, profile?: any) => Promise<void>;
    socialLogin: (provider: 'google' | 'linkedin', providerId: string, email: string, name: string, photoUrl?: string, role?: UserRole) => Promise<void>;
    logout: () => Promise<void>; // Fixed: Returns Promise
    updateProfile: (profile: Partial<Profile>) => Promise<void>;
    completeProfile: () => Promise<void>; // Fixed: Returns Promise
    completeWelcome: () => Promise<void>; // Fixed: Returns Promise
    refreshProfile: () => Promise<void>;
    resetToRoleSelect: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isProfileComplete, setIsProfileComplete] = useState(false);
    const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [selectedRole, setSelectedRoleState] = useState<UserRole>(null);

    const useSupabase = isSupabaseConfigured();

    // Wrapper to persist selectedRole to AsyncStorage
    const setSelectedRole = async (role: UserRole) => {
        console.log('AuthContext: setSelectedRole called with:', role);
        setSelectedRoleState(role);
        try {
            if (role) {
                await AsyncStorage.setItem(SELECTED_ROLE_KEY, role);
                console.log('AuthContext: Role persisted to storage:', role);
            } else {
                await AsyncStorage.removeItem(SELECTED_ROLE_KEY);
            }
        } catch (error) {
            console.error('AuthContext: Error persisting role:', error);
        }
    };

    // Load persisted role from AsyncStorage
    const loadPersistedRole = async (): Promise<UserRole> => {
        try {
            const storedRole = await AsyncStorage.getItem(SELECTED_ROLE_KEY);
            console.log('AuthContext: Loaded persisted role:', storedRole);
            if (storedRole === 'worker' || storedRole === 'business') {
                return storedRole;
            }
        } catch (error) {
            console.error('AuthContext: Error loading persisted role:', error);
        }
        return null;
    };

    // Load persisted hasSeenWelcome state for a specific user
    // Now checks database first (source of truth), then falls back to local storage
    const loadPersistedWelcome = async (userId?: string): Promise<boolean> => {
        try {
            // If we have a userId, check database first (source of truth)
            if (userId) {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('has_seen_welcome, is_profile_complete')
                    .eq('id', userId)
                    .single();

                // If profile exists and has completed setup, they've seen welcome
                if (profileData) {
                    // If is_profile_complete is true, they definitely saw welcome
                    if (profileData.is_profile_complete) {
                        console.log('AuthContext: User has completed profile, marking welcome as seen');
                        return true;
                    }
                    // Check explicit has_seen_welcome flag if it exists
                    if (profileData.has_seen_welcome === true) {
                        return true;
                    }
                }

                // Also check per-user local storage
                const stored = await AsyncStorage.getItem(`${HAS_SEEN_WELCOME_KEY_PREFIX}${userId}`);
                if (stored === 'true') {
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error('AuthContext: Error loading welcome state:', error);
        }
        return false;
    };

    // Check for existing session on mount - FIXED: Proper async/await to prevent race conditions
    useEffect(() => {
        console.log('AuthContext: useEffect running, useSupabase =', useSupabase);
        let isMounted = true; // Track if component is still mounted
        let subscription: { unsubscribe: () => void } | null = null;

        const initializeAuth = async () => {
            try {
                if (!useSupabase) {
                    console.log('AuthContext: Supabase not configured, setting isLoading = false');
                    if (isMounted) setIsLoading(false);
                    return;
                }

                // FIXED: Load persisted role BEFORE checking session to prevent race conditions
                // Welcome state is now loaded per-user after we have the session
                const persistedRole = await loadPersistedRole();

                if (!isMounted) return;

                if (persistedRole) {
                    setSelectedRoleState(persistedRole);
                    console.log('AuthContext: Restored persisted role:', persistedRole);
                }
                // Note: Welcome state is loaded per-user in loadUserProfile

                // Now check session AFTER state is restored
                await checkSupabaseSession();

                // Start app state monitoring to handle sleep/wake cycles
                // This refreshes session and reconnects realtime when app wakes
                startAppStateMonitoring();

                // Listen for auth state changes
                const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
                    console.log('Auth state changed:', event);
                    if (!isMounted) return;

                    try {
                        if (event === 'SIGNED_IN' && session?.user) {
                            // Load persisted role for OAuth redirects where state is lost
                            const currentPersistedRole = await loadPersistedRole();
                            console.log('AuthContext: onAuthStateChange - persisted role:', currentPersistedRole);
                            // Pass session.user so we can extract OAuth metadata for profile creation
                            await loadUserProfile(session.user.id, session.user.email || '', currentPersistedRole || undefined, session.user);
                        } else if (event === 'SIGNED_OUT') {
                            resetAuthState();
                        }
                    } catch (error) {
                        console.error('AuthContext: Error in auth state change handler:', error);
                    }
                });
                subscription = data.subscription;

            } catch (error) {
                console.error('AuthContext ERROR:', error);
                if (isMounted) setIsLoading(false);
            }
        };

        initializeAuth();

        return () => {
            isMounted = false;
            if (subscription) {
                subscription.unsubscribe();
            }
            // Stop app state monitoring on unmount
            stopAppStateMonitoring();
        };
    }, [useSupabase]);

    const checkSupabaseSession = async () => {
        console.log('AuthContext: checkSupabaseSession starting...');
        try {
            // REDUCED TIMEOUT: 5 seconds instead of 15 for faster feedback
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Session check timeout')), 5000)
            );

            const sessionPromise = supabase.auth.getSession();
            const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;

            console.log('AuthContext: Session check complete, session:', session ? 'exists' : 'null');

            if (session?.user) {
                // Load persisted role in case state was lost (e.g., page reload after OAuth)
                const persistedRole = await loadPersistedRole();
                console.log('AuthContext: checkSupabaseSession - persisted role:', persistedRole);
                await loadUserProfile(session.user.id, session.user.email || '', persistedRole || undefined);
            }
        } catch (error) {
            console.error('Error checking session:', error);
            // Don't throw - let the user continue to login screen on timeout
        } finally {
            console.log('AuthContext: Setting isLoading = false');
            setIsLoading(false);
        }
    };

    const loadUserProfile = async (userId: string, email: string, roleOverride?: UserRole, authUser?: any) => {
        console.log('AuthContext: loadUserProfile starting for:', userId);
        try {
            console.log('AuthContext: loadUserProfile - Fetching from DB...');

            // TIMEOUT WRAPPER
            const withTimeout = <T,>(promise: any, ms: number, label: string): Promise<T> => {
                return Promise.race([
                    promise as Promise<T>,
                    new Promise<T>((_, reject) =>
                        setTimeout(() => reject(new Error(`Timeout: ${label}`)), ms)
                    )
                ]);
            };

            // 1. Connectivity Check (Debug: Raw Fetch)
            try {
                const startPing = Date.now();
                console.log('AuthContext: Testing DB connection (raw fetch)...');

                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;

                // Construct REST URL manually
                // NOTE: Using the internal URL from supabase-js client if possible, or fall back to known URL
                const supabaseUrl = (supabase as any).supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cdtgfeuinoqqxagutnlu.supabase.co';
                const supabaseKey = (supabase as any).supabaseKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

                if (!token || !supabaseKey) {
                    console.log('Skipping raw fetch - missing token or key');
                } else {
                    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=count&limit=1`, {
                        method: 'GET',
                        headers: {
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const json = await response.json();
                        console.log(`AuthContext: Raw Fetch OK (${Date.now() - startPing}ms)`, json);
                    } else {
                        console.error('AuthContext: Raw Fetch Failed:', response.status, await response.text());
                    }
                }
            } catch (pingError) {
                console.error('AuthContext: Raw Fetch Exception:', pingError);
            }

            // 2. Actual Profile Fetch with Timeout
            // Get profile from unified profiles table
            const { data: profileData, error: profileError } = await withTimeout<any>(
                supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single(),
                10000,
                'Profile Fetch'
            );

            console.log('AuthContext: loadUserProfile - Profile fetch complete', {
                found: !!profileData,
                error: profileError?.code
            });

            if (profileError && profileError.code !== 'PGRST116') {
                console.error('Error loading profile:', profileError);
            }

            // If no profile exists, create one for OAuth users
            // This handles users coming from Supabase OAuth (Google/LinkedIn) who don't have profiles yet
            if (!profileData && profileError?.code === 'PGRST116') {
                console.log('AuthContext: No profile found, creating one for OAuth user...');

                // Get user metadata from Supabase auth user (contains OAuth provider data)
                const { data: { user: supabaseUser } } = await supabase.auth.getUser();
                const metadata = supabaseUser?.user_metadata || authUser?.user_metadata || {};

                // Determine provider from app_metadata or identities
                const appMetadata = supabaseUser?.app_metadata || {};
                const provider = appMetadata.provider ||
                    (supabaseUser?.identities?.[0]?.provider) ||
                    'oauth';

                // Extract name from various OAuth provider formats
                const name = metadata.full_name ||
                    metadata.name ||
                    `${metadata.given_name || ''} ${metadata.family_name || ''}`.trim() ||
                    email.split('@')[0];

                // Extract photo from various OAuth provider formats
                const photoUrl = metadata.avatar_url ||
                    metadata.picture ||
                    metadata.photo_url;

                // Extract additional LinkedIn/OAuth data for better profile pre-population
                // LinkedIn provides: headline, industry, vanityName, etc.
                const jobTitle = metadata.headline || metadata.occupation || metadata.title || null;
                const industry = metadata.industry || null;
                const bio = metadata.summary || metadata.about || metadata.bio || null;
                const location = metadata.location?.name || metadata.location || null;

                // Try to extract experience years if available in metadata
                let experienceYears = metadata.experience_years || 0;

                // If not explicitly provided, try to find it in other fields (e.g. from bio or headline)
                if (!experienceYears && bio) {
                    const expMatch = bio.match(/(\d+)\+?\s*years?\s*of?\s*experience/i);
                    if (expMatch) experienceYears = parseInt(expMatch[1]);
                }

                // Try to extract skills from LinkedIn if available
                // LinkedIn OIDC may provide limited data, but we try
                const linkedInSkills: string[] = [];
                if (metadata.skills && Array.isArray(metadata.skills)) {
                    linkedInSkills.push(...metadata.skills.map((s: any) =>
                        typeof s === 'string' ? s : s.name || s.skill
                    ).filter(Boolean));
                } else if (typeof metadata.skills === 'string') {
                    // Handle comma-separated skills if that's how they come
                    linkedInSkills.push(...metadata.skills.split(',').map((s: string) => s.trim()).filter(Boolean));
                }

                // Get persisted role (set before OAuth redirect)
                const persistedRole = await loadPersistedRole();
                const userRole = roleOverride || persistedRole || 'worker';

                console.log('AuthContext: Creating profile for OAuth user', {
                    userId,
                    email,
                    name,
                    provider,
                    role: userRole,
                    hasPhoto: !!photoUrl,
                    hasJobTitle: !!jobTitle,
                    hasIndustry: !!industry,
                    skillsCount: linkedInSkills.length,
                });

                // Build profile data - include LinkedIn data if available
                const profileData: any = {
                    id: userId,
                    email: email,
                    name: name,
                    photo_url: photoUrl,
                    role: userRole,
                    auth_provider: provider,
                    is_profile_complete: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };

                // Add optional LinkedIn-extracted fields if available
                if (jobTitle) profileData.job_title = jobTitle;
                if (bio) profileData.bio = bio;
                if (location) profileData.current_location = location;
                if (industry) profileData.industry = industry;
                if (linkedInSkills.length > 0) profileData.skills = linkedInSkills;
                if (experienceYears > 0) profileData.experience_years = experienceYears;

                // Create the profile
                const { data: newProfile, error: createError } = await supabase
                    .from('profiles')
                    .upsert(profileData, { onConflict: 'id' })
                    .select()
                    .single();

                if (createError) {
                    console.error('AuthContext: Error creating profile:', createError);
                } else {
                    console.log('AuthContext: Profile created successfully for OAuth user');

                    // Use the newly created profile
                    setUser({
                        id: userId,
                        email: email,
                        role: userRole,
                        name: name,
                        profile_pic: photoUrl,
                    });
                    setProfile(newProfile as Profile);

                    if (userRole) {
                        await setSelectedRole(userRole);
                    }
                    setIsAuthenticated(true);
                    setIsProfileComplete(false); // New user needs to complete profile

                    console.log('AuthContext: OAuth user profile setup complete', {
                        userId,
                        role: userRole,
                        isProfileComplete: false
                    });
                    return;
                }
            }

            // Priority for EXISTING profiles: dbRole (source of truth) IS the correct role
            const dbRole = profileData?.role as UserRole || null;
            const effectiveRole = dbRole || roleOverride || selectedRole || 'worker';

            console.log('AuthContext: Role resolution (existing profile)', {
                roleOverride,
                dbRole,
                selectedRole,
                effectiveRole,
                usingDbRole: !!dbRole
            });

            // Sync the selectedRole state to match the database role
            // This ensures the UI displays the correct role from the database
            if (dbRole && dbRole !== selectedRole) {
                console.log('AuthContext: Syncing selectedRole to match database role:', dbRole);
                await setSelectedRole(dbRole);
            }

            setUser({
                id: userId,
                email: email,
                role: effectiveRole,
                name: profileData?.name,
                profile_pic: profileData?.photo_url,
            });
            setProfile(profileData as Profile);

            // Always set the effective role to ensure it's available for navigation
            // MUST await to ensure role is persisted before navigation decisions
            if (effectiveRole) {
                await setSelectedRole(effectiveRole);
            }
            setIsAuthenticated(true);
            const profileComplete = profileData?.is_profile_complete || false;
            console.log('AuthContext: Setting isProfileComplete from DB:', profileComplete);
            setIsProfileComplete(profileComplete);

            // FIXED: Load welcome state PER USER from database
            // If profile is complete, user has definitely seen welcome
            // This ensures returning users don't see onboarding again
            const seenWelcome = await loadPersistedWelcome(userId);
            const effectiveSeenWelcome = seenWelcome || profileComplete;
            console.log('AuthContext: Setting hasSeenWelcome:', effectiveSeenWelcome, {
                fromDB: seenWelcome,
                profileComplete,
            });
            setHasSeenWelcome(effectiveSeenWelcome);

            console.log('AuthContext: Profile loaded successfully', {
                userId,
                dbRole,
                effectiveRole,
                selectedRole,
                isProfileComplete: profileComplete,
                hasSeenWelcome: effectiveSeenWelcome,
                profileDataExists: !!profileData
            });

            // Update login streak - delay to ensure auth is complete
            // Only update streak if we have profile data (not a new user)
            if (profileData) {
                setTimeout(async () => {
                    try {
                        const streakResult = await streakService.updateLoginStreak();
                        console.log('AuthContext: Streak updated', {
                            currentStreak: streakResult.streak.current_streak,
                            isNewDay: streakResult.isNewDay,
                            badgeEarned: streakResult.badgeEarned
                        });
                    } catch (streakError) {
                        // Silent fail - streak is non-critical
                        console.log('Streak update skipped:', streakError);
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    };

    const refreshProfile = async () => {
        if (!user?.id) return;
        await loadUserProfile(user.id, user.email);
    };

    // Reset to role select screen (keeps user logged in but clears profile completion)
    const resetToRoleSelect = async () => {
        try {
            // Clear welcome and profile state to force back through onboarding
            setHasSeenWelcome(false);
            setIsProfileComplete(false);
            setSelectedRoleState(null);

            // Clear persisted state - include user-specific welcome key
            const keysToRemove = [SELECTED_ROLE_KEY];
            if (user?.id) {
                keysToRemove.push(`${HAS_SEEN_WELCOME_KEY_PREFIX}${user.id}`);
            }
            await AsyncStorage.multiRemove(keysToRemove);

            // Update profile in database to mark as incomplete
            if (user?.id) {
                await supabase
                    .from('profiles')
                    .update({
                        is_profile_complete: false,
                        role: null
                    })
                    .eq('id', user.id);
            }

            // Sign out to go back to role selection
            await supabase.auth.signOut();
            setIsAuthenticated(false);
            setUser(null);
            setProfile(null);

            console.log('AuthContext: Reset to role select complete');
        } catch (error) {
            console.error('AuthContext: Error resetting to role select:', error);
            throw error;
        }
    };

    const resetAuthState = () => {
        setIsAuthenticated(false);
        setUser(null);
        setProfile(null);
        setSelectedRole(null);
        setIsProfileComplete(false);
        setHasSeenWelcome(false);
    };

    const login = async (email: string, password: string) => {
        try {
            setIsLoading(true);

            // Capture the current selectedRole before login (set during role selection)
            const currentRole = selectedRole;

            if (useSupabase) {
                console.log('AuthContext: Attempting login for:', email);

                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) {
                    console.error('AuthContext: Login error from Supabase:', error.message);
                    throw error;
                }

                if (!data.user) {
                    console.error('AuthContext: Login succeeded but no user returned');
                    throw new Error('Login failed. Please try again.');
                }

                if (!data.session) {
                    console.log('AuthContext: Login succeeded but no session - email may not be confirmed');
                    throw new Error('Please check your email and confirm your account before logging in.');
                }

                console.log('AuthContext: Login successful for user:', data.user.id);

                // Pass the role that was selected before login
                await loadUserProfile(data.user.id, data.user.email || '', currentRole || undefined);
            } else {
                throw new Error('Supabase is not configured. Please check your environment variables.');
            }
        } catch (error: any) {
            console.error('Login error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (email: string, password: string, role: UserRole, profileData?: any) => {
        try {
            setIsLoading(true);

            if (useSupabase) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            role: role,
                            name: profileData?.name || email.split('@')[0],
                        },
                    },
                });

                if (error) throw error;

                // Check if email confirmation is required
                // Supabase returns user with identities=[] if email already exists (no confirmation sent)
                // Supabase returns session=null if email confirmation is required
                if (data.user && !data.session) {
                    // Email confirmation is required
                    console.log('AuthContext: Email confirmation required');
                    throw new Error('Please check your email to confirm your account before logging in.');
                }

                if (data.user && data.session) {
                    // Set the selected role immediately from registration - AWAIT to prevent race condition
                    await setSelectedRole(role);

                    // The trigger will create the profile automatically
                    // Wait a moment for the trigger to complete
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Pass the role to ensure it's used even if DB hasn't updated yet
                    await loadUserProfile(data.user.id, data.user.email || '', role);
                }
            } else {
                throw new Error('Supabase is not configured. Please check your environment variables.');
            }
        } catch (error: any) {
            console.error('Register error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const socialLogin = async (provider: 'google' | 'linkedin', providerId: string, email: string, name: string, photoUrl?: string, role?: UserRole) => {
        try {
            setIsLoading(true);

            if (!useSupabase) {
                throw new Error('Supabase is not configured. Please check your environment variables.');
            }

            // FIXED: Use persisted role to avoid stale closure issues after OAuth redirects
            const currentPersistedRole = await loadPersistedRole();
            const userRole = role || currentPersistedRole || selectedRole;
            // Use a deterministic password based on provider and email (not providerId which changes)
            const socialPassword = `${provider}_${email.split('@')[0]}_social_auth_v2`;

            console.log('SocialLogin: Starting for', email, 'provider:', provider, 'role:', userRole);

            // Strategy: Try signIn first (returning users are more common), then signUp (new users)

            // Step 1: Try to sign in first (for returning users)
            console.log('SocialLogin: Trying sign in first...');
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password: socialPassword,
            });

            if (signInData?.user) {
                console.log('SocialLogin: Sign in successful (returning user)');

                // Update profile with latest social info
                await supabase
                    .from('profiles')
                    .update({
                        photo_url: photoUrl,
                        auth_provider: provider,
                        [`${provider}_uid`]: providerId,
                    })
                    .eq('id', signInData.user.id);

                const effectiveRole = userRole || selectedRole;
                await loadUserProfile(signInData.user.id, email, effectiveRole || undefined);
                return;
            }

            console.log('SocialLogin: Sign in failed, trying signup...', signInError?.message);

            // Step 2: Try to sign up (for new users)
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password: socialPassword,
                options: {
                    data: {
                        full_name: name,
                        avatar_url: photoUrl,
                        provider: provider,
                        provider_id: providerId,
                        role: userRole,
                    },
                },
            });

            console.log('SocialLogin: SignUp result', {
                hasUser: !!signUpData?.user,
                error: signUpError?.message,
                errorStatus: signUpError?.status,
                // Supabase returns user with identities=[] if email already exists
                identitiesCount: signUpData?.user?.identities?.length
            });

            // If signUp succeeded with a real new user (has identities)
            if (signUpData?.user && signUpData.user.identities && signUpData.user.identities.length > 0) {
                console.log('SocialLogin: New user created successfully');

                // Set the role immediately
                if (userRole) {
                    setSelectedRole(userRole);
                }

                // IMPORTANT: Sign in immediately after signup to get a proper session
                console.log('SocialLogin: Signing in to establish session...');
                const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
                    email,
                    password: socialPassword,
                });

                if (sessionError) {
                    console.error('SocialLogin: Failed to establish session:', sessionError.message);
                    throw new Error('Account created but failed to sign in. Please try signing in again.');
                }

                console.log('SocialLogin: Session established successfully');

                // Wait for trigger to create profile
                await new Promise(resolve => setTimeout(resolve, 500));

                // Update profile with social login info
                await supabase
                    .from('profiles')
                    .update({
                        name: name,
                        photo_url: photoUrl,
                        role: userRole,
                        auth_provider: provider,
                        [`${provider}_uid`]: providerId,
                    })
                    .eq('id', signUpData.user.id);

                // Load user profile
                await loadUserProfile(signUpData.user.id, email, userRole || undefined);
                return;
            }

            // SignUp failed or returned empty identities (email already registered in Supabase auth)
            // Check if there's an existing profile we can use
            console.log('SocialLogin: SignUp did not create new user, checking for existing profile...');

            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id, auth_provider, role, name')
                .eq('email', email)
                .single();

            if (existingProfile) {
                // Profile exists - this email is registered with a different auth method
                console.log('SocialLogin: Found existing profile with auth_provider:', existingProfile.auth_provider);
                const providerName = existingProfile.auth_provider || 'email/password';
                throw new Error(
                    `This email is already registered with ${providerName}. Please sign in using ${providerName}, or use a different Google account.`
                );
            }

            // No profile exists but signup failed - likely a Supabase configuration issue
            if (signUpError) {
                console.error('SocialLogin: Signup failed with error:', signUpError);
                throw new Error(`Unable to create account: ${signUpError.message}. Please try again or contact support.`);
            }

            throw new Error('Unable to sign in. Please try again or use email/password registration.');
        } catch (error: any) {
            console.error('Social Login error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        console.log('AuthContext: Logout started');
        if (useSupabase) {
            await supabase.auth.signOut();
            console.log('AuthContext: Supabase signOut complete');
        }
        // Clear persisted auth state - handle both web (localStorage) and native (AsyncStorage)
        // IMPORTANT: Do NOT clear welcome state - that persists per-user in the database
        // This ensures returning users don't see onboarding again
        try {
            // Clear localStorage for web - only clear role, NOT welcome state
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.removeItem(SELECTED_ROLE_KEY);
                // DO NOT clear welcome state - it's per-user and stored in DB
                // Also clear Supabase session from localStorage
                const keys = Object.keys(window.localStorage);
                keys.forEach(key => {
                    if (key.startsWith('sb-')) {
                        window.localStorage.removeItem(key);
                    }
                });
                console.log('AuthContext: Cleared localStorage (preserved welcome state)');
            }
            // Also try AsyncStorage for native - only clear role
            await AsyncStorage.removeItem(SELECTED_ROLE_KEY);
            // DO NOT clear HAS_SEEN_WELCOME - it persists per-user
            console.log('AuthContext: Cleared AsyncStorage (preserved welcome state)');
        } catch (error) {
            console.error('AuthContext: Error clearing persisted state:', error);
        }
        resetAuthState();
        console.log('AuthContext: Logout complete');
    };

    const updateProfile = async (newProfile: Partial<Profile>) => {
        console.log('AuthContext updateProfile: Called', {
            useSupabase,
            userId: user?.id,
            is_profile_complete: newProfile.is_profile_complete
        });

        if (!useSupabase || !user) {
            console.error('AuthContext updateProfile: Not authenticated or Supabase not configured', { useSupabase, userId: user?.id });
            throw new Error('Cannot update profile: not authenticated or Supabase not configured');
        }

        try {
            console.log('AuthContext: Updating profile...', {
                is_profile_complete: newProfile.is_profile_complete,
                userId: user.id
            });

            // Use profileService from database.ts for consistent API
            const updatedProfile = await profileService.upsertProfile({
                ...profile,
                ...newProfile,
                role: selectedRole || profile?.role,
            } as any);

            if (!updatedProfile) {
                console.error('AuthContext: profileService.upsertProfile returned null (unexpected - should throw)');
                throw new Error('Failed to update profile in database');
            }

            console.log('AuthContext: Profile saved to DB, is_profile_complete:', updatedProfile.is_profile_complete);

            // Update local state
            setProfile(updatedProfile as unknown as Profile);

            if (newProfile.is_profile_complete || updatedProfile.is_profile_complete) {
                console.log('AuthContext: Setting isProfileComplete to TRUE - navigation should update');
                setIsProfileComplete(true);
            }

            // Update user state if name or photo changed
            if (newProfile.name || newProfile.photo_url) {
                setUser(prev => prev ? {
                    ...prev,
                    name: newProfile.name || prev.name,
                    profile_pic: newProfile.photo_url || prev.profile_pic,
                } : null);
            }

            console.log('AuthContext: Profile update complete!');
        } catch (error) {
            console.error('AuthContext: Error in updateProfile:', error);
            // Don't auto-set isProfileComplete on error - let the screen decide
            throw error;
        }
    };

    const completeProfile = async () => {
        // Update local state immediately for responsive UI
        setIsProfileComplete(true);
        setProfile((prev: any) => prev ? { ...prev, is_profile_complete: true } : null);

        // Persist to database to ensure state syncs across app restarts
        if (user?.id) {
            try {
                await profileService.upsertProfile({
                    id: user.id,
                    is_profile_complete: true,
                } as any);
                console.log('AuthContext: Profile completion persisted to database');
            } catch (error) {
                console.error('AuthContext: Failed to persist profile completion:', error);
                // Don't throw - local state is already updated, user can proceed
            }
        }
    };

    const completeWelcome = async () => {
        setHasSeenWelcome(true);
        try {
            // Save per-user locally
            if (user?.id) {
                await AsyncStorage.setItem(`${HAS_SEEN_WELCOME_KEY_PREFIX}${user.id}`, 'true');

                // Also persist to database for cross-device sync
                await supabase
                    .from('profiles')
                    .update({ has_seen_welcome: true })
                    .eq('id', user.id);
            }
            console.log('AuthContext: Welcome state persisted for user:', user?.id);
        } catch (error) {
            console.error('AuthContext: Error persisting welcome state:', error);
        }
    };

    // Compute effectiveRole: selectedRole > profile role > user role > fallback to 'worker'
    // FIXED: Never returns null - always defaults to 'worker' for safe navigation
    const effectiveRole: 'worker' | 'business' = selectedRole || profile?.role || user?.role || 'worker';

    if (__DEV__) {
        console.log('AuthContext: effectiveRole computation', {
            selectedRole,
            profileRole: profile?.role,
            userRole: user?.role,
            effectiveRole,
        });
    }

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                isLoading,
                isProfileComplete,
                hasSeenWelcome,
                user,
                profile,
                selectedRole,
                effectiveRole,
                setSelectedRole,
                login,
                register,
                socialLogin,
                logout,
                updateProfile,
                completeProfile,
                completeWelcome,
                refreshProfile,
                resetToRoleSelect,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
