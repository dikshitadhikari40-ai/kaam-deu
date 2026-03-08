/**
 * ROLE SWITCHER COMPONENT
 * Allows users with dual profiles to switch between Worker and Business modes
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

interface RoleSwitcherProps {
    style?: any;
}

export default function RoleSwitcher({ style }: RoleSwitcherProps) {
    const { activeRole, hasWorkerProfile, hasBusinessProfile, switchRole, createWorkerProfile, createBusinessProfile } = useAuth();
    const [switching, setSwitching] = useState(false);

    const handleRoleSwitch = async (role: 'worker' | 'business') => {
        if (role === activeRole || switching) return;

        // Check if user has the requested profile
        const hasProfile = role === 'worker' ? hasWorkerProfile : hasBusinessProfile;

        if (!hasProfile) {
            // Offer to create the missing profile
            Alert.alert(
                `No ${role === 'worker' ? 'Worker' : 'Business'} Profile`,
                `Would you like to create a ${role === 'worker' ? 'Worker' : 'Business'} profile?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Create',
                        onPress: async () => {
                            setSwitching(true);
                            try {
                                if (role === 'worker') {
                                    await createWorkerProfile();
                                } else {
                                    await createBusinessProfile();
                                }
                            } catch (error: any) {
                                Alert.alert('Error', error.message || 'Failed to create profile');
                            } finally {
                                setSwitching(false);
                            }
                        }
                    }
                ]
            );
            return;
        }

        // Switch to the existing profile
        setSwitching(true);
        try {
            await switchRole(role);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to switch roles');
        } finally {
            setSwitching(false);
        }
    };

    const hasDualProfiles = hasWorkerProfile && hasBusinessProfile;
    const canAddSecondProfile = hasWorkerProfile || hasBusinessProfile;

    // Don't show if user only has one profile and can't add another
    if (!hasDualProfiles && !canAddSecondProfile) {
        return null;
    }

    return (
        <View style={[styles.container, style]}>
            <Text style={styles.label}>Switch Profile</Text>

            <View style={styles.roleContainer}>
                {/* Worker Role Card */}
                <TouchableOpacity
                    style={[
                        styles.roleCard,
                        activeRole === 'worker' && styles.roleCardActive,
                    ]}
                    onPress={() => handleRoleSwitch('worker')}
                    disabled={switching}
                    activeOpacity={0.7}
                >
                    <View style={styles.roleIconContainer}>
                        {activeRole === 'worker' ? (
                            <MaterialCommunityIcons name="briefcase-check" size={28} color={theme.colors.accent} />
                        ) : (
                            <Feather name="briefcase" size={24} color={hasWorkerProfile ? theme.colors.text : theme.colors.textMuted} />
                        )}
                    </View>
                    <View style={styles.roleInfo}>
                        <Text style={[
                            styles.roleTitle,
                            activeRole === 'worker' && styles.roleTitleActive,
                            !hasWorkerProfile && styles.roleTitleLocked,
                        ]}>
                            Worker
                        </Text>
                        <Text style={styles.roleSubtitle}>
                            {hasWorkerProfile ? 'Find jobs' : 'Not created'}
                        </Text>
                    </View>
                    {switching && activeRole !== 'worker' && (
                        <ActivityIndicator size="small" color={theme.colors.accent} />
                    )}
                    {activeRole === 'worker' && (
                        <Feather name="check-circle" size={20} color={theme.colors.accent} />
                    )}
                </TouchableOpacity>

                {/* Business Role Card */}
                <TouchableOpacity
                    style={[
                        styles.roleCard,
                        activeRole === 'business' && styles.roleCardActive,
                    ]}
                    onPress={() => handleRoleSwitch('business')}
                    disabled={switching}
                    activeOpacity={0.7}
                >
                    <View style={styles.roleIconContainer}>
                        {activeRole === 'business' ? (
                            <MaterialCommunityIcons name="office-building" size={28} color={theme.colors.accent} />
                        ) : (
                            <MaterialCommunityIcons
                                name="office-building"
                                size={24}
                                color={hasBusinessProfile ? theme.colors.text : theme.colors.textMuted}
                            />
                        )}
                    </View>
                    <View style={styles.roleInfo}>
                        <Text style={[
                            styles.roleTitle,
                            activeRole === 'business' && styles.roleTitleActive,
                            !hasBusinessProfile && styles.roleTitleLocked,
                        ]}>
                            Business
                        </Text>
                        <Text style={styles.roleSubtitle}>
                            {hasBusinessProfile ? 'Hire workers' : 'Not created'}
                        </Text>
                    </View>
                    {switching && activeRole !== 'business' && (
                        <ActivityIndicator size="small" color={theme.colors.accent} />
                    )}
                    {activeRole === 'business' && (
                        <Feather name="check-circle" size={20} color={theme.colors.accent} />
                    )}
                </TouchableOpacity>
            </View>

            {!hasDualProfiles && (
                <View style={styles.tipContainer}>
                    <Feather name="info" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.tipText}>
                        Tap {hasWorkerProfile ? 'Business' : 'Worker'} to add a second profile
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    roleContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    roleCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 10,
    },
    roleCardActive: {
        borderColor: theme.colors.accent,
        backgroundColor: 'rgba(201, 169, 98, 0.08)',
    },
    roleIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roleInfo: {
        flex: 1,
    },
    roleTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 2,
    },
    roleTitleActive: {
        color: theme.colors.accent,
    },
    roleTitleLocked: {
        color: theme.colors.textMuted,
    },
    roleSubtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    tipContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 6,
    },
    tipText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        flex: 1,
    },
});
