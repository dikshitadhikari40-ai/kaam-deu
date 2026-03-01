import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Switch,
    TouchableOpacity,
    ScrollView,
    Alert,
    Image,
    Platform,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';
import { accountService } from '../services/database';
import { supabase } from '../lib/supabase';
import { accountLinkingService } from '../services/auth';

// Cross-platform alert helper
const showAlert = (
    title: string,
    message: string,
    buttons: { text: string; style?: 'cancel' | 'destructive' | 'default'; onPress?: () => void }[]
) => {
    if (Platform.OS === 'web') {
        // For web, use window.confirm for simple yes/no, or just show message
        const hasDestructive = buttons.some(b => b.style === 'destructive');
        const destructiveButton = buttons.find(b => b.style === 'destructive');
        const cancelButton = buttons.find(b => b.style === 'cancel');

        if (hasDestructive && destructiveButton) {
            const confirmed = window.confirm(`${title}\n\n${message}`);
            if (confirmed) {
                destructiveButton.onPress?.();
            } else {
                cancelButton?.onPress?.();
            }
        } else {
            window.alert(`${title}\n\n${message}`);
            const defaultButton = buttons.find(b => b.style !== 'cancel');
            defaultButton?.onPress?.();
        }
    } else {
        Alert.alert(title, message, buttons);
    }
};

// Cross-platform toast/snackbar helper
const showToast = (message: string) => {
    if (Platform.OS === 'web') {
        // Simple toast for web
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 9999;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    } else {
        Alert.alert('', message);
    }
};

export default function SettingsScreen({ navigation }: { navigation: any }) {
    const { user, profile, selectedRole, logout, resetToRoleSelect, refreshProfile } = useAuth();

    // Loading states
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [isSwitchingRole, setIsSwitchingRole] = useState(false);
    const [isFixingRole, setIsFixingRole] = useState(false);
    const [showDevTools, setShowDevTools] = useState(__DEV__); // Show in dev mode

    // Linked accounts state
    const [linkedAccounts, setLinkedAccounts] = useState({ google: false, linkedin: false, email: false });
    const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
    const [isLinkingLinkedIn, setIsLinkingLinkedIn] = useState(false);
    const [isLoadingLinkedAccounts, setIsLoadingLinkedAccounts] = useState(true);

    // Load linked accounts on mount
    useEffect(() => {
        loadLinkedAccounts();
    }, []);

    const loadLinkedAccounts = useCallback(async () => {
        setIsLoadingLinkedAccounts(true);
        try {
            const accounts = await accountLinkingService.getLinkedAccounts();
            setLinkedAccounts(accounts);
        } catch (error) {
            console.error('Error loading linked accounts:', error);
        } finally {
            setIsLoadingLinkedAccounts(false);
        }
    }, []);

    const handleLinkGoogle = useCallback(async () => {
        if (linkedAccounts.google) {
            // Unlink Google
            showAlert(
                'Unlink Google Account',
                'Are you sure you want to unlink your Google account? You will no longer be able to sign in with Google.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Unlink',
                        style: 'destructive',
                        onPress: async () => {
                            setIsLinkingGoogle(true);
                            try {
                                const result = await accountLinkingService.unlinkAccount('google');
                                if (result.success) {
                                    showToast('Google account unlinked successfully');
                                    await loadLinkedAccounts();
                                } else {
                                    showAlert('Error', result.error || 'Failed to unlink Google account', [{ text: 'OK' }]);
                                }
                            } catch (error: any) {
                                showAlert('Error', error.message || 'Failed to unlink Google account', [{ text: 'OK' }]);
                            } finally {
                                setIsLinkingGoogle(false);
                            }
                        },
                    },
                ]
            );
        } else {
            // Link Google
            setIsLinkingGoogle(true);
            try {
                const result = await accountLinkingService.linkGoogleAccount();
                if (!result.success && result.error) {
                    showAlert('Error', result.error, [{ text: 'OK' }]);
                }
                // On success, the page will redirect to Google OAuth
                // After returning, loadLinkedAccounts will be called again
            } catch (error: any) {
                showAlert('Error', error.message || 'Failed to link Google account', [{ text: 'OK' }]);
            } finally {
                setIsLinkingGoogle(false);
            }
        }
    }, [linkedAccounts.google, loadLinkedAccounts]);

    const handleLinkLinkedIn = useCallback(async () => {
        if (linkedAccounts.linkedin) {
            // Unlink LinkedIn
            showAlert(
                'Unlink LinkedIn Account',
                'Are you sure you want to unlink your LinkedIn account? You will no longer be able to sign in with LinkedIn.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Unlink',
                        style: 'destructive',
                        onPress: async () => {
                            setIsLinkingLinkedIn(true);
                            try {
                                const result = await accountLinkingService.unlinkAccount('linkedin_oidc');
                                if (result.success) {
                                    showToast('LinkedIn account unlinked successfully');
                                    await loadLinkedAccounts();
                                } else {
                                    showAlert('Error', result.error || 'Failed to unlink LinkedIn account', [{ text: 'OK' }]);
                                }
                            } catch (error: any) {
                                showAlert('Error', error.message || 'Failed to unlink LinkedIn account', [{ text: 'OK' }]);
                            } finally {
                                setIsLinkingLinkedIn(false);
                            }
                        },
                    },
                ]
            );
        } else {
            // Link LinkedIn
            setIsLinkingLinkedIn(true);
            try {
                const result = await accountLinkingService.linkLinkedInAccount();
                if (!result.success && result.error) {
                    showAlert('Error', result.error, [{ text: 'OK' }]);
                }
                // On success for web, the page will redirect to LinkedIn OAuth
                // For native, reload linked accounts after returning
                await loadLinkedAccounts();
            } catch (error: any) {
                showAlert('Error', error.message || 'Failed to link LinkedIn account', [{ text: 'OK' }]);
            } finally {
                setIsLinkingLinkedIn(false);
            }
        }
    }, [linkedAccounts.linkedin, loadLinkedAccounts]);

    // DEV TOOL: Fix database role to match selectedRole
    const handleFixDatabaseRole = useCallback(async () => {
        if (!user?.id || !selectedRole) {
            showAlert('Error', 'No user or role selected', [{ text: 'OK' }]);
            return;
        }

        showAlert(
            'Fix Database Role',
            `This will update your database role to "${selectedRole}" to match your UI selection.\n\nCurrent UI role: ${selectedRole}\nDatabase role: ${profile?.role || 'unknown'}\n\nProceed?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Fix Role',
                    onPress: async () => {
                        setIsFixingRole(true);
                        try {
                            // Directly update the role in the database
                            const { error } = await supabase
                                .from('profiles')
                                .update({
                                    role: selectedRole,
                                    updated_at: new Date().toISOString(),
                                })
                                .eq('id', user.id);

                            if (error) {
                                console.error('Error fixing role:', error);
                                showAlert('Error', `Failed to fix role: ${error.message}`, [{ text: 'OK' }]);
                            } else {
                                // Refresh the profile to get updated data
                                await refreshProfile();
                                showAlert('Success', `Database role updated to "${selectedRole}". Please log out and log back in for changes to take full effect.`, [{ text: 'OK' }]);
                            }
                        } catch (err: any) {
                            console.error('Error fixing role:', err);
                            showAlert('Error', `Unexpected error: ${err.message}`, [{ text: 'OK' }]);
                        } finally {
                            setIsFixingRole(false);
                        }
                    },
                },
            ]
        );
    }, [user?.id, selectedRole, profile?.role, refreshProfile]);

    // DEV TOOL: Show current database state
    const handleShowDatabaseState = useCallback(async () => {
        if (!user?.id) {
            showAlert('Error', 'No user logged in', [{ text: 'OK' }]);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, role, is_profile_complete, name, company_name')
                .eq('id', user.id)
                .single();

            if (error) {
                showAlert('Database Error', error.message, [{ text: 'OK' }]);
            } else {
                showAlert(
                    'Database Profile State',
                    `Email: ${data.email}\nDB Role: ${data.role}\nUI Role: ${selectedRole}\nProfile Complete: ${data.is_profile_complete}\nName: ${data.name || 'N/A'}\nCompany: ${data.company_name || 'N/A'}\n\n${data.role !== selectedRole ? '⚠️ ROLE MISMATCH DETECTED!' : '✅ Roles match'}`,
                    [{ text: 'OK' }]
                );
            }
        } catch (err: any) {
            showAlert('Error', err.message, [{ text: 'OK' }]);
        }
    }, [user?.id, selectedRole]);

    // Notification Settings
    const [pushNotifications, setPushNotifications] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [newMatchAlert, setNewMatchAlert] = useState(true);
    const [messageAlert, setMessageAlert] = useState(true);

    // Privacy Settings
    const [showOnlineStatus, setShowOnlineStatus] = useState(true);
    const [showReadReceipts, setShowReadReceipts] = useState(true);

    // Discovery Settings
    const [discoverable, setDiscoverable] = useState(true);

    const isWorker = selectedRole === 'worker';
    const displayName = isWorker
        ? (profile?.name || user?.email?.split('@')[0] || 'User')
        : (profile?.company_name || 'Business');

    const handleEditProfile = useCallback(() => {
        if (isWorker) {
            navigation.navigate('WorkerProfileSetup', { isEditing: true });
        } else {
            navigation.navigate('BusinessProfileSetup', { isEditing: true });
        }
    }, [isWorker, navigation]);

    const handleLogout = useCallback(async () => {
        console.log('handleLogout called');
        try {
            showAlert(
                'Log Out',
                'Are you sure you want to log out?',
                [
                    { text: 'Cancel', style: 'cancel', onPress: () => console.log('Logout cancelled') },
                    {
                        text: 'Log Out',
                        style: 'destructive',
                        onPress: async () => {
                            setIsLoggingOut(true);
                            try {
                                console.log('SettingsScreen: User confirmed logout');
                                await logout();
                                console.log('SettingsScreen: Logout complete');
                            } catch (error) {
                                console.error('Logout error:', error);
                                showToast('Failed to log out. Please try again.');
                            } finally {
                                setIsLoggingOut(false);
                            }
                        },
                    },
                ]
            );
            console.log('showAlert completed');
        } catch (error) {
            console.error('handleLogout error:', error);
        }
    }, [logout]);

    const handleDeleteAccount = useCallback(() => {
        showAlert(
            'Delete Account',
            'Are you sure you want to delete your account? This will permanently remove all your data including matches, messages, and uploaded files. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setIsDeletingAccount(true);
                        try {
                            const result = await accountService.deleteAccount();
                            if (result.success) {
                                showToast('Your account has been successfully deleted.');
                                await logout();
                            } else {
                                showAlert('Error', result.error || 'Failed to delete account. Please try again.', [
                                    { text: 'OK' }
                                ]);
                            }
                        } catch (error) {
                            showAlert('Error', 'An unexpected error occurred. Please try again.', [
                                { text: 'OK' }
                            ]);
                        } finally {
                            setIsDeletingAccount(false);
                        }
                    },
                },
            ]
        );
    }, [logout]);

    const handleSwitchAccountType = useCallback(() => {
        showAlert(
            'Switch Account Type',
            `You're currently signed in as a ${isWorker ? 'Worker' : 'Business'}. Switching will sign you out and let you choose a new account type.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Switch',
                    style: 'destructive',
                    onPress: async () => {
                        setIsSwitchingRole(true);
                        try {
                            await resetToRoleSelect();
                        } catch (error) {
                            showAlert('Error', 'Failed to switch account type. Please try again.', [
                                { text: 'OK' }
                            ]);
                        } finally {
                            setIsSwitchingRole(false);
                        }
                    },
                },
            ]
        );
    }, [isWorker, resetToRoleSelect]);

    const handleOpenLink = useCallback(async (url: string) => {
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                showToast('Unable to open link');
            }
        } catch (error) {
            showToast('Unable to open link');
        }
    }, []);

    const handleHelpCenter = useCallback(() => {
        showAlert(
            'Help & Support',
            'Need help? Contact us at:\n\nsupport@kaamdeu.aghealthindustries.com\n\nWe typically respond within 24 hours.',
            [
                {
                    text: 'Email Us',
                    onPress: () => handleOpenLink('mailto:support@kaamdeu.aghealthindustries.com')
                },
                { text: 'Close', style: 'cancel' }
            ]
        );
    }, [handleOpenLink]);

    const handleFeedback = useCallback(() => {
        showAlert(
            'Send Feedback',
            'We love hearing from you! Share your thoughts, suggestions, or report issues.',
            [
                {
                    text: 'Send Email',
                    onPress: () => handleOpenLink('mailto:feedback@kaamdeu.aghealthindustries.com?subject=App%20Feedback')
                },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    }, [handleOpenLink]);

    const SettingItem = ({
        iconName,
        iconType = 'feather',
        label,
        value,
        onValueChange,
        type = 'toggle',
        description,
        onPress,
        danger = false,
        loading = false,
        disabled = false,
    }: {
        iconName: string;
        iconType?: 'feather' | 'material';
        label: string;
        value?: boolean;
        onValueChange?: (value: boolean) => void;
        type?: 'toggle' | 'link' | 'action';
        description?: string;
        onPress?: () => void;
        danger?: boolean;
        loading?: boolean;
        disabled?: boolean;
    }) => {
        // Debug logging for button clicks
        const handlePress = () => {
            console.log('SettingItem pressed:', { label, type, loading, disabled, hasOnPress: !!onPress });
            if (onPress) {
                onPress();
            }
        };

        return (
            <TouchableOpacity
                style={[styles.settingItem, disabled && styles.settingItemDisabled]}
                onPress={type !== 'toggle' && !loading && !disabled ? handlePress : undefined}
                disabled={type === 'toggle' || loading || disabled}
                activeOpacity={type === 'toggle' ? 1 : 0.6}
            >
                <View style={styles.settingLeft}>
                    <View style={[
                        styles.iconContainer,
                        danger && styles.iconContainerDanger,
                        disabled && styles.iconContainerDisabled
                    ]}>
                        {loading ? (
                            <ActivityIndicator size="small" color={danger ? '#FF4B4B' : theme.colors.primary} />
                        ) : iconType === 'material' ? (
                            <MaterialCommunityIcons
                                name={iconName as any}
                                size={20}
                                color={danger ? '#FF4B4B' : disabled ? theme.colors.textSecondary : theme.colors.primary}
                            />
                        ) : (
                            <Feather
                                name={iconName as any}
                                size={20}
                                color={danger ? '#FF4B4B' : disabled ? theme.colors.textSecondary : theme.colors.primary}
                            />
                        )}
                    </View>
                    <View style={styles.settingTextContainer}>
                        <Text style={[
                            styles.settingLabel,
                            danger && styles.settingLabelDanger,
                            disabled && styles.settingLabelDisabled
                        ]}>
                            {label}
                        </Text>
                        {description && (
                            <Text style={styles.settingDescription}>{description}</Text>
                        )}
                    </View>
                </View>
                {type === 'toggle' && onValueChange && (
                    <Switch
                        value={value}
                        onValueChange={onValueChange}
                        trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
                        thumbColor={'#fff'}
                        ios_backgroundColor={theme.colors.border}
                        disabled={disabled}
                    />
                )}
                {type === 'link' && !loading && (
                    <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
                )}
                {type === 'action' && loading && (
                    <ActivityIndicator size="small" color={danger ? '#FF4B4B' : theme.colors.primary} />
                )}
            </TouchableOpacity>
        );
    };

    const SectionHeader = ({ title, icon }: { title: string; icon?: string }) => (
        <View style={styles.sectionHeaderContainer}>
            {icon && (
                <Feather name={icon as any} size={14} color={theme.colors.textSecondary} style={styles.sectionIcon} />
            )}
            <Text style={styles.sectionHeader}>{title}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Settings</Text>
                <Text style={styles.subtitle}>Manage your account preferences</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                bounces={true}
            >
                {/* Profile Card */}
                <TouchableOpacity
                    style={styles.profileCard}
                    activeOpacity={0.7}
                    onPress={handleEditProfile}
                >
                    <View style={styles.profileImageContainer}>
                        <Image
                            source={{
                                uri: profile?.photos?.[0] ||
                                    profile?.logo_url ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1E3A5F&color=fff&size=80`
                            }}
                            style={styles.profileImage}
                        />
                        <View style={styles.editBadge}>
                            <Feather name="edit-2" size={10} color="#fff" />
                        </View>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{displayName}</Text>
                        <Text style={styles.profileEmail}>{user?.email}</Text>
                        <View style={styles.roleBadge}>
                            <MaterialCommunityIcons
                                name={isWorker ? "account-hard-hat" : "domain"}
                                size={12}
                                color={theme.colors.secondary}
                            />
                            <Text style={styles.roleBadgeText}>
                                {isWorker ? 'Worker' : 'Business'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.editProfileButton}>
                        <Text style={styles.editProfileText}>Edit</Text>
                        <Feather name="chevron-right" size={16} color={theme.colors.primary} />
                    </View>
                </TouchableOpacity>

                {/* Quick Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>
                            {profile?.is_profile_complete ? '100%' : '50%'}
                        </Text>
                        <Text style={styles.statLabel}>Profile</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>
                            {(profile as any)?.verified || (profile as any)?.is_verified_business ? 'Yes' : 'No'}
                        </Text>
                        <Text style={styles.statLabel}>Verified</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>Active</Text>
                        <Text style={styles.statLabel}>Status</Text>
                    </View>
                </View>

                {/* Notifications Section */}
                <View style={styles.section}>
                    <SectionHeader title="Notifications" icon="bell" />
                    <View style={styles.sectionCard}>
                        <SettingItem
                            iconName="bell"
                            label="Push Notifications"
                            description="Receive push notifications"
                            value={pushNotifications}
                            onValueChange={setPushNotifications}
                        />
                        <View style={styles.separator} />
                        <SettingItem
                            iconName="mail"
                            label="Email Notifications"
                            description="Receive email updates"
                            value={emailNotifications}
                            onValueChange={setEmailNotifications}
                        />
                        <View style={styles.separator} />
                        <SettingItem
                            iconName="heart"
                            label="New Match Alerts"
                            description="Get notified when you match"
                            value={newMatchAlert}
                            onValueChange={setNewMatchAlert}
                        />
                        <View style={styles.separator} />
                        <SettingItem
                            iconName="message-circle"
                            label="Message Alerts"
                            description="Get notified for new messages"
                            value={messageAlert}
                            onValueChange={setMessageAlert}
                        />
                    </View>
                </View>

                {/* Privacy Section */}
                <View style={styles.section}>
                    <SectionHeader title="Privacy" icon="lock" />
                    <View style={styles.sectionCard}>
                        <SettingItem
                            iconName="eye"
                            label="Show Online Status"
                            description="Let others see when you're online"
                            value={showOnlineStatus}
                            onValueChange={setShowOnlineStatus}
                        />
                        <View style={styles.separator} />
                        <SettingItem
                            iconName="check-circle"
                            label="Read Receipts"
                            description="Let others know when you've read messages"
                            value={showReadReceipts}
                            onValueChange={setShowReadReceipts}
                        />
                        <View style={styles.separator} />
                        <SettingItem
                            iconName="search"
                            label="Discoverable"
                            description="Appear in search results"
                            value={discoverable}
                            onValueChange={setDiscoverable}
                        />
                    </View>
                </View>

                {/* Account Section */}
                <View style={styles.section}>
                    <SectionHeader title="Account" icon="user" />
                    <View style={styles.sectionCard}>
                        <SettingItem
                            iconName="credit-card"
                            label="Subscription"
                            description="Manage your plan"
                            type="link"
                            onPress={() => navigation.navigate('Premium')}
                        />
                        <View style={styles.separator} />
                        <SettingItem
                            iconName="lock"
                            label="Change Password"
                            type="link"
                            onPress={() => navigation.navigate('ChangePassword')}
                        />
                        <View style={styles.separator} />
                        <SettingItem
                            iconName="user-x"
                            label="Blocked Users"
                            type="link"
                            onPress={() => navigation.navigate('BlockedUsers')}
                        />
                        <View style={styles.separator} />
                        <SettingItem
                            iconName="repeat"
                            label="Switch Account Type"
                            description={`Currently: ${isWorker ? 'Worker' : 'Business'}`}
                            type="link"
                            onPress={handleSwitchAccountType}
                            loading={isSwitchingRole}
                        />
                    </View>
                </View>

                {/* Learning Section */}
                <View style={styles.section}>
                    <SectionHeader title="Learning & Skills" icon="book-open" />
                    <View style={styles.sectionCard}>
                        <SettingItem
                            iconName="compass"
                            label="Browse Courses"
                            description="Free courses from Coursera, YouTube & more"
                            type="link"
                            onPress={() => navigation.navigate('LearningResources')}
                        />
                        <View style={styles.separator} />
                        <SettingItem
                            iconName="book"
                            label="My Courses"
                            description="Track your learning progress"
                            type="link"
                            onPress={() => navigation.navigate('MyCourses')}
                        />
                    </View>
                </View>

                {/* Linked Accounts Section */}
                <View style={styles.section}>
                    <SectionHeader title="Linked Accounts" icon="link" />
                    <View style={styles.sectionCard}>
                        {isLoadingLinkedAccounts ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                                <Text style={styles.loadingText}>Loading linked accounts...</Text>
                            </View>
                        ) : (
                            <>
                                {/* Google Account */}
                                <TouchableOpacity
                                    style={styles.linkedAccountItem}
                                    onPress={handleLinkGoogle}
                                    disabled={isLinkingGoogle}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.linkedAccountLeft}>
                                        <View style={[styles.linkedAccountIcon, { backgroundColor: '#EA4335' }]}>
                                            <FontAwesome name="google" size={18} color="#fff" />
                                        </View>
                                        <View style={styles.linkedAccountInfo}>
                                            <Text style={styles.linkedAccountName}>Google</Text>
                                            <Text style={styles.linkedAccountStatus}>
                                                {linkedAccounts.google ? 'Connected' : 'Not connected'}
                                            </Text>
                                        </View>
                                    </View>
                                    {isLinkingGoogle ? (
                                        <ActivityIndicator size="small" color={theme.colors.primary} />
                                    ) : (
                                        <View style={[
                                            styles.linkedAccountButton,
                                            linkedAccounts.google && styles.linkedAccountButtonConnected
                                        ]}>
                                            <Text style={[
                                                styles.linkedAccountButtonText,
                                                linkedAccounts.google && styles.linkedAccountButtonTextConnected
                                            ]}>
                                                {linkedAccounts.google ? 'Unlink' : 'Link'}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                <View style={styles.separator} />

                                {/* LinkedIn Account */}
                                <TouchableOpacity
                                    style={styles.linkedAccountItem}
                                    onPress={handleLinkLinkedIn}
                                    disabled={isLinkingLinkedIn}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.linkedAccountLeft}>
                                        <View style={[styles.linkedAccountIcon, { backgroundColor: '#0077B5' }]}>
                                            <FontAwesome name="linkedin" size={18} color="#fff" />
                                        </View>
                                        <View style={styles.linkedAccountInfo}>
                                            <Text style={styles.linkedAccountName}>LinkedIn</Text>
                                            <Text style={styles.linkedAccountStatus}>
                                                {linkedAccounts.linkedin ? 'Connected' : 'Not connected'}
                                            </Text>
                                        </View>
                                    </View>
                                    {isLinkingLinkedIn ? (
                                        <ActivityIndicator size="small" color={theme.colors.primary} />
                                    ) : (
                                        <View style={[
                                            styles.linkedAccountButton,
                                            linkedAccounts.linkedin && styles.linkedAccountButtonConnected
                                        ]}>
                                            <Text style={[
                                                styles.linkedAccountButtonText,
                                                linkedAccounts.linkedin && styles.linkedAccountButtonTextConnected
                                            ]}>
                                                {linkedAccounts.linkedin ? 'Unlink' : 'Link'}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                {/* Email indicator */}
                                {linkedAccounts.email && (
                                    <>
                                        <View style={styles.separator} />
                                        <View style={styles.linkedAccountItem}>
                                            <View style={styles.linkedAccountLeft}>
                                                <View style={[styles.linkedAccountIcon, { backgroundColor: theme.colors.primary }]}>
                                                    <Feather name="mail" size={18} color="#fff" />
                                                </View>
                                                <View style={styles.linkedAccountInfo}>
                                                    <Text style={styles.linkedAccountName}>Email & Password</Text>
                                                    <Text style={styles.linkedAccountStatus}>Primary login method</Text>
                                                </View>
                                            </View>
                                            <View style={[styles.linkedAccountButton, styles.linkedAccountButtonConnected]}>
                                                <Text style={styles.linkedAccountButtonTextConnected}>Active</Text>
                                            </View>
                                        </View>
                                    </>
                                )}
                            </>
                        )}
                    </View>
                    <Text style={styles.linkedAccountsHint}>
                        Link additional accounts for easier sign-in options
                    </Text>
                </View>

                {/* Support Section */}
                <View style={styles.section}>
                    <SectionHeader title="Support" icon="help-circle" />
                    <View style={styles.sectionCard}>
                        <SettingItem
                            iconName="help-circle"
                            label="Help Center"
                            type="link"
                            onPress={handleHelpCenter}
                        />
                        <View style={styles.separator} />
                        <SettingItem
                            iconName="message-square"
                            label="Send Feedback"
                            type="link"
                            onPress={handleFeedback}
                        />
                        <View style={styles.separator} />
                        <SettingItem
                            iconName="file-text"
                            label="Terms of Service"
                            type="link"
                            onPress={() => navigation.navigate('TermsOfService')}
                        />
                        <View style={styles.separator} />
                        <SettingItem
                            iconName="shield"
                            iconType="material"
                            label="Privacy Policy"
                            type="link"
                            onPress={() => navigation.navigate('PrivacyPolicy')}
                        />
                    </View>
                </View>

                {/* Account Actions */}
                <View style={styles.section}>
                    <SectionHeader title="Account Actions" />
                    <View style={styles.sectionCard}>
                        <SettingItem
                            iconName="log-out"
                            label="Log Out"
                            type="action"
                            onPress={handleLogout}
                            loading={isLoggingOut}
                        />
                        <View style={styles.separator} />
                        <SettingItem
                            iconName="trash-2"
                            label="Delete Account"
                            description="Permanently delete your account"
                            type="action"
                            danger
                            onPress={handleDeleteAccount}
                            loading={isDeletingAccount}
                        />
                    </View>
                </View>

                {/* Developer Tools (only in dev mode) */}
                {showDevTools && (
                    <View style={styles.section}>
                        <SectionHeader title="Developer Tools" icon="code" />
                        <View style={[styles.sectionCard, styles.devToolsCard]}>
                            <SettingItem
                                iconName="database"
                                iconType="material"
                                label="Show Database State"
                                description="View current profile in database"
                                type="action"
                                onPress={handleShowDatabaseState}
                            />
                            <View style={styles.separator} />
                            <SettingItem
                                iconName="wrench"
                                iconType="material"
                                label="Fix Database Role"
                                description={`Sync DB role to "${selectedRole}"`}
                                type="action"
                                onPress={handleFixDatabaseRole}
                                loading={isFixingRole}
                            />
                            <View style={styles.separator} />
                            <SettingItem
                                iconName="eye-off"
                                label="Hide Dev Tools"
                                type="action"
                                onPress={() => setShowDevTools(false)}
                            />
                        </View>
                    </View>
                )}

                {/* App Info */}
                <View style={styles.appInfo}>
                    <View style={styles.appLogoContainer}>
                        <MaterialCommunityIcons name="briefcase-account" size={32} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.appName}>Kaam Deu</Text>
                    <Text style={styles.version}>Version 1.0.0</Text>
                    <Text style={styles.copyright}>Made with ❤️ in Nepal</Text>
                    {/* Tap 5 times to show dev tools */}
                    {!showDevTools && (
                        <TouchableOpacity
                            onPress={() => setShowDevTools(true)}
                            style={styles.devToolsToggle}
                        >
                            <Text style={styles.devToolsToggleText}>Show Dev Tools</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 12,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: theme.colors.text,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    content: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.card,
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
            },
            android: {
                elevation: 3,
            },
            web: {
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            },
        }),
    },
    profileImageContainer: {
        position: 'relative',
    },
    profileImage: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme.colors.surface,
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: theme.colors.primary,
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.card,
    },
    profileInfo: {
        flex: 1,
        marginLeft: 16,
    },
    profileName: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 2,
    },
    profileEmail: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginBottom: 8,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(201, 169, 98, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        alignSelf: 'flex-start',
        gap: 4,
    },
    roleBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.secondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    editProfileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(74, 144, 217, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 4,
    },
    editProfileText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.primary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statDivider: {
        width: 1,
        height: 32,
        backgroundColor: theme.colors.border,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        marginLeft: 4,
    },
    sectionIcon: {
        marginRight: 6,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionCard: {
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        minHeight: 60,
    },
    settingItemDisabled: {
        opacity: 0.5,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(74, 144, 217, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    iconContainerDanger: {
        backgroundColor: 'rgba(255, 75, 75, 0.12)',
    },
    iconContainerDisabled: {
        backgroundColor: 'rgba(128, 128, 128, 0.12)',
    },
    settingTextContainer: {
        flex: 1,
    },
    settingLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
    },
    settingLabelDanger: {
        color: '#FF4B4B',
    },
    settingLabelDisabled: {
        color: theme.colors.textSecondary,
    },
    settingDescription: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 3,
    },
    separator: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginLeft: 70,
    },
    appInfo: {
        alignItems: 'center',
        marginTop: 16,
        paddingVertical: 32,
    },
    appLogoContainer: {
        width: 64,
        height: 64,
        borderRadius: 16,
        backgroundColor: 'rgba(74, 144, 217, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    appName: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.primary,
        marginBottom: 4,
    },
    version: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginBottom: 4,
    },
    copyright: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    devToolsCard: {
        borderWidth: 1,
        borderColor: '#FF6B00',
        borderStyle: 'dashed',
    },
    devToolsToggle: {
        marginTop: 16,
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(255, 107, 0, 0.1)',
        borderRadius: 8,
    },
    devToolsToggleText: {
        fontSize: 12,
        color: '#FF6B00',
        fontWeight: '600',
    },
    // Linked Accounts styles
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    linkedAccountItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    linkedAccountLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    linkedAccountIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    linkedAccountInfo: {
        flex: 1,
    },
    linkedAccountName: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 2,
    },
    linkedAccountStatus: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    linkedAccountButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    linkedAccountButtonConnected: {
        backgroundColor: 'rgba(74, 144, 217, 0.12)',
    },
    linkedAccountButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
    },
    linkedAccountButtonTextConnected: {
        color: theme.colors.primary,
    },
    linkedAccountsHint: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 8,
        marginLeft: 4,
        fontStyle: 'italic',
    },
});
