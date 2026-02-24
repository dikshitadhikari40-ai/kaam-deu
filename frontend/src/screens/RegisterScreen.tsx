import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';
import { useLinkedInAuth, isLinkedInConfigured } from '../services/auth';
import { theme } from '../theme';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen({ navigation }: { navigation: any }) {
    const { selectedRole, register, socialLogin } = useAuth();

    // Get config from expo config extra (for native) with fallback to process.env (for web)
    const config = Constants.expoConfig?.extra || {};

    // Google Auth Setup - Configure these in app.json or .env for production
    // Get client IDs from Google Cloud Console: https://console.cloud.google.com/
    const googleClientIds = {
        iosClientId: config.googleIosClientId || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        androidClientId: config.googleAndroidClientId || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
        webClientId: config.googleWebClientId || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    };

    const isGoogleConfigured = Object.values(googleClientIds).some(id => id && !id.startsWith('YOUR_'));

    const [request, response, promptAsync] = Google.useAuthRequest(
        isGoogleConfigured ? googleClientIds : {}
    );

    // LinkedIn Auth
    const { signIn: linkedinSignIn } = useLinkedInAuth();

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Handle Google OAuth Response
    React.useEffect(() => {
        if (response?.type === 'success') {
            const { authentication } = response;
            handleGoogleSuccess(authentication?.accessToken);
        }
    }, [response]);

    const handleGoogleSuccess = async (accessToken: string | undefined) => {
        if (!accessToken) return;

        setLoading(true);
        try {
            // Fetch Google profile
            const res = await fetch(
                `https://www.googleapis.com/oauth2/v2/userinfo?alt=json&access_token=${accessToken}`
            );
            const data = await res.json();

            // Call our social login
            await socialLogin(
                'google',
                data.id,
                data.email,
                data.name,
                data.picture,
                selectedRole || 'worker'
            );
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Google sign up failed');
        } finally {
            setLoading(false);
        }
    };

    const handleLinkedInLogin = async () => {
        if (!isLinkedInConfigured) {
            Alert.alert(
                'LinkedIn Not Configured',
                'LinkedIn OAuth requires a LinkedIn Developer App. Please configure LINKEDIN_CLIENT_ID in your .env file.',
                [{ text: 'OK' }]
            );
            return;
        }

        setLoading(true);
        try {
            const result = await linkedinSignIn();
            if (result.user) {
                await socialLogin(
                    'linkedin',
                    result.user.id,
                    result.user.email,
                    result.user.name,
                    result.user.picture,
                    selectedRole || 'worker'
                );
            } else if (result.error) {
                Alert.alert('LinkedIn Error', result.error);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'LinkedIn sign up failed');
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter your name');
            return false;
        }
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email');
            return false;
        }
        if (!email.includes('@')) {
            Alert.alert('Error', 'Please enter a valid email');
            return false;
        }
        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return false;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return false;
        }
        return true;
    };

    const handleRegister = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const profile = selectedRole === 'worker'
                ? {
                    name,
                    job_title: 'Looking for opportunities',
                    skills: [],
                    experience_years: 0,
                }
                : {
                    company_name: name,
                    contact_person: name,
                    industry: 'General',
                };

            await register(email, password, selectedRole, profile);
            // Navigation handled by RootNavigator based on auth state
        } catch (error: any) {
            Alert.alert('Registration Failed', error.message || 'Please try again');
        } finally {
            setLoading(false);
        }
    };

    const getRoleDisplay = () => {
        return selectedRole === 'business' ? 'Business' : 'Worker';
    };

    const getRoleIcon = () => {
        return selectedRole === 'business' ? 'domain' : 'account-hard-hat';
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Feather name="arrow-left" size={24} color="#fff" />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.logo}>Kaam Deu</Text>

                        {/* Role Badge */}
                        <View style={styles.roleBadge}>
                            <MaterialCommunityIcons
                                name={getRoleIcon() as any}
                                size={16}
                                color={theme.colors.secondary}
                            />
                            <Text style={styles.roleBadgeText}>
                                Creating {getRoleDisplay()} Account
                            </Text>
                        </View>
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>
                        Join thousands of {selectedRole === 'business' ? 'employers' : 'workers'} in Nepal
                    </Text>

                    {/* Social Login Buttons */}
                    <View style={styles.socialContainer}>
                        <TouchableOpacity
                            style={[styles.socialButton, !isGoogleConfigured && styles.socialButtonDisabled]}
                            onPress={() => {
                                if (!isGoogleConfigured) {
                                    Alert.alert(
                                        'Google Sign In',
                                        'Google authentication is not configured yet. Please use email registration.',
                                        [{ text: 'OK' }]
                                    );
                                } else {
                                    promptAsync();
                                }
                            }}
                            disabled={loading}
                        >
                            <MaterialCommunityIcons name="google" size={22} color={isGoogleConfigured ? "#DB4437" : theme.colors.textMuted} />
                            <Text style={[styles.socialButtonText, !isGoogleConfigured && styles.socialButtonTextDisabled]}>Continue with Google</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.socialButton, !isLinkedInConfigured && styles.socialButtonDisabled]}
                            onPress={handleLinkedInLogin}
                            disabled={loading}
                        >
                            <MaterialCommunityIcons name="linkedin" size={22} color={isLinkedInConfigured ? "#0A66C2" : theme.colors.textMuted} />
                            <Text style={[styles.socialButtonText, !isLinkedInConfigured && styles.socialButtonTextDisabled]}>Continue with LinkedIn</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Divider */}
                    <View style={styles.dividerContainer}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or sign up with email</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Registration Form */}
                    <View style={styles.form}>
                        {/* Name Input */}
                        <View style={styles.inputContainer}>
                            <Feather name="user" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder={selectedRole === 'business' ? 'Company Name' : 'Full Name'}
                                placeholderTextColor={theme.colors.textMuted}
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                            />
                        </View>

                        {/* Email Input */}
                        <View style={styles.inputContainer}>
                            <Feather name="mail" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Email Address"
                                placeholderTextColor={theme.colors.textMuted}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        {/* Password Input */}
                        <View style={styles.inputContainer}>
                            <Feather name="lock" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Password (min. 6 characters)"
                                placeholderTextColor={theme.colors.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Feather
                                    name={showPassword ? "eye-off" : "eye"}
                                    size={20}
                                    color={theme.colors.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Confirm Password Input */}
                        <View style={styles.inputContainer}>
                            <Feather name="check-circle" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Confirm Password"
                                placeholderTextColor={theme.colors.textMuted}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showPassword}
                            />
                        </View>

                        {/* Register Button */}
                        <TouchableOpacity
                            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Text style={styles.submitButtonText}>Create Account</Text>
                                    <Feather name="arrow-right" size={20} color="#fff" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Login Link */}
                    <TouchableOpacity
                        style={styles.toggleButton}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={styles.toggleText}>
                            Already have an account?{' '}
                            <Text style={styles.toggleTextHighlight}>Log In</Text>
                        </Text>
                    </TouchableOpacity>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            By creating an account, you agree to our{' '}
                            <Text style={styles.link}>Terms of Service</Text> and{' '}
                            <Text style={styles.link}>Privacy Policy</Text>
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 50,
        paddingBottom: 30,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        marginBottom: 16,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    logo: {
        fontSize: 36,
        fontWeight: '800',
        color: theme.colors.text,
        letterSpacing: -1,
        marginBottom: 12,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.secondary,
        gap: 6,
    },
    roleBadgeText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.secondary,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    socialContainer: {
        gap: 12,
        marginBottom: 24,
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 12,
    },
    socialButtonText: {
        color: theme.colors.text,
        fontSize: 15,
        fontWeight: '600',
    },
    socialButtonDisabled: {
        opacity: 0.6,
    },
    socialButtonTextDisabled: {
        color: theme.colors.textMuted,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: theme.colors.border,
    },
    dividerText: {
        color: theme.colors.textMuted,
        marginHorizontal: 16,
        fontSize: 13,
    },
    form: {
        gap: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        fontSize: 16,
        color: theme.colors.text,
    },
    submitButton: {
        backgroundColor: theme.colors.accent,
        paddingVertical: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 8,
        shadowColor: theme.colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    toggleButton: {
        alignItems: 'center',
        paddingVertical: 16,
        marginTop: 8,
    },
    toggleText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    toggleTextHighlight: {
        color: theme.colors.accent,
        fontWeight: '600',
    },
    footer: {
        marginTop: 16,
    },
    footerText: {
        fontSize: 11,
        color: theme.colors.textMuted,
        textAlign: 'center',
        lineHeight: 18,
    },
    link: {
        color: theme.colors.secondary,
        fontWeight: '500',
    },
});
