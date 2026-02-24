import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '../components/Icons'; // Use Shim
import { useAuth } from '../context/AuthContext';

export default function RoleSelectScreen({ navigation }: { navigation: any }) {
    const { setSelectedRole } = useAuth();
    const [localRole, setLocalRole] = useState<'worker' | 'business' | null>(null);

    const handleContinue = () => {
        if (localRole) {
            setSelectedRole(localRole);
            if (navigation && navigation.navigate) {
                navigation.navigate('Login');
            }
        }
    };

    const RoleCard = ({
        role,
        icon,
        title,
        subtitle,
    }: {
        role: 'worker' | 'business';
        icon: string;
        title: string;
        subtitle: string;
    }) => {
        const isSelected = localRole === role;

        return (
            <TouchableOpacity
                style={[styles.roleCard, isSelected && styles.roleCardSelected]}
                onPress={() => setLocalRole(role)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconCircle, isSelected && styles.iconCircleSelected]}>
                    <MaterialCommunityIcons
                        name={icon as any}
                        size={40}
                        color={isSelected ? '#fff' : '#4A90D9'}
                    />
                </View>
                <View style={styles.roleTextContainer}>
                    <Text style={styles.roleTitle}>{title}</Text>
                    <Text style={styles.roleSubtitle}>{subtitle}</Text>
                </View>
                <View style={styles.checkContainer}>
                    {isSelected && (
                        <Feather name="check-circle" size={28} color="#C9A962" />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.logo}>Kaam Deu</Text>
                    <Text style={styles.tagline}>Tinder-style hiring for Nepal's gig workers</Text>
                </View>

                {/* Question */}
                <Text style={styles.question}>Who are you?</Text>

                {/* Role Options */}
                <View style={styles.rolesContainer}>
                    <RoleCard
                        role="worker"
                        icon="account-hard-hat"
                        title="I am a Worker"
                        subtitle="I want jobs"
                    />
                    <RoleCard
                        role="business"
                        icon="domain"
                        title="I am a Business"
                        subtitle="I need workers"
                    />
                </View>

                {/* Continue Button */}
                <TouchableOpacity
                    style={[styles.continueButton, !localRole && styles.continueButtonDisabled]}
                    onPress={handleContinue}
                    disabled={!localRole}
                    activeOpacity={0.8}
                >
                    <Text style={styles.continueButtonText}>Continue</Text>
                    <Feather name="arrow-right" size={20} color="#fff" />
                </TouchableOpacity>

                {/* Footer */}
                <Text style={styles.footer}>
                    By continuing, you agree to our Terms of Service and Privacy Policy
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A1628',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
        marginTop: 40,
    },
    logo: {
        fontSize: 48,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -1,
        marginBottom: 8,
    },
    tagline: {
        fontSize: 14,
        color: '#8BA3C4',
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 32,
    },
    question: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 32,
        textAlign: 'center',
    },
    rolesContainer: {
        gap: 16,
        marginBottom: 40,
    },
    roleCard: {
        backgroundColor: '#132337',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#2A4A6A',
    },
    roleCardSelected: {
        borderColor: '#4A90D9',
        backgroundColor: '#1A2F4A',
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#1A2F4A',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#4A90D9',
    },
    iconCircleSelected: {
        backgroundColor: '#4A90D9',
        borderColor: '#4A90D9',
    },
    roleTextContainer: {
        flex: 1,
        marginLeft: 16,
    },
    roleTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },
    roleSubtitle: {
        fontSize: 14,
        color: '#8BA3C4',
    },
    checkContainer: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    continueButton: {
        backgroundColor: '#4A90D9',
        borderRadius: 12,
        paddingVertical: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        shadowColor: '#4A90D9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 6,
    },
    continueButtonDisabled: {
        backgroundColor: '#1E3A5F',
        shadowOpacity: 0,
    },
    continueButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    footer: {
        fontSize: 11,
        color: '#5A7A9A',
        textAlign: 'center',
        marginTop: 32,
        lineHeight: 16,
        paddingHorizontal: 24,
    },
});
