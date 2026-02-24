import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { verificationService, VerificationRequest } from '../services/verificationService';
import { supabase } from '../lib/supabase';
import { badgeService } from '../services/badgeService';

export const IdentityVerificationScreen = () => {
    const { theme } = useTheme();
    const navigation = useNavigation<any>();

    const [request, setRequest] = useState<VerificationRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [idType, setIdType] = useState('citizenship');
    const [idNumber, setIdNumber] = useState('');
    const [fullName, setFullName] = useState('');
    const [frontImage, setFrontImage] = useState<any>(null);
    const [backImage, setBackImage] = useState<any>(null);

    useEffect(() => {
        loadRequest();
    }, []);

    const loadRequest = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const data = await verificationService.getRequest(user.id);
            setRequest(data);
            if (data) {
                setIdType(data.id_type);
                setIdNumber(data.id_number || '');
                setFullName(data.full_name_on_id || '');
            }
        }
        setLoading(false);
    };

    const pickDocument = async (side: 'front' | 'back') => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                const asset = result.assets[0];
                if (side === 'front') setFrontImage(asset);
                else setBackImage(asset);
            }
        } catch (error) {
            console.error('Error picking document:', error);
        }
    };

    const handleSubmit = async () => {
        if (!fullName || !idNumber || !frontImage) {
            Alert.alert('Error', 'Please fill in all required fields and upload the front of your ID.');
            return;
        }

        setSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            setSubmitting(false);
            return;
        }

        const result = await verificationService.submitRequest(user.id, {
            idType,
            idNumber,
            fullName,
            frontImage,
            backImage,
        });

        setSubmitting(false);

        if (result.success) {
            Alert.alert('Success', 'Your verification request has been submitted and is pending review.', [
                { text: 'OK', onPress: () => loadRequest() }
            ]);
        } else {
            Alert.alert('Error', result.error || 'Something went wrong');
        }
    };

    const handleMockApprove = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setSubmitting(true);
        const success = await verificationService.mockApprove(user.id);
        if (success) {
            // Trigger badge check manually for immediate feedback
            await badgeService.awardBadge(user.id, 'Verified Pro');
            Alert.alert('Test Approved', 'Your account is now verified! Badge awarded.', [
                { text: 'Awesome', onPress: () => loadRequest() }
            ]);
        }
        setSubmitting(false);
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator style={styles.center} size="large" color={theme.colors.primary} />
            </SafeAreaView>
        );
    }

    if (request?.status === 'approved') {
        return (
            <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
                <View style={styles.successContainer}>
                    <View style={styles.checkCircle}>
                        <Feather name="check" size={60} color="#fff" />
                    </View>
                    <Text style={[styles.successTitle, { color: theme.colors.text }]}>Verified Pro!</Text>
                    <Text style={[styles.successText, { color: theme.colors.textSecondary }]}>
                        Your identity has been successfully verified. You now have the blue shield badge on your profile.
                    </Text>
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: theme.colors.primary }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.buttonText}>Back to Profile</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={[styles.title, { color: theme.colors.text }]}>Identity Verification</Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                    Upload your government-issued ID to build trust and unlock the "Verified Pro" badge.
                </Text>

                {request?.status === 'pending' && (
                    <View style={styles.pendingBanner}>
                        <Feather name="clock" size={20} color="#f59e0b" />
                        <Text style={styles.pendingText}>Verification Pending Review</Text>
                    </View>
                )}

                {request?.status === 'rejected' && (
                    <View style={styles.rejectedBanner}>
                        <Feather name="alert-circle" size={20} color="#ef4444" />
                        <View style={styles.rejectedContent}>
                            <Text style={styles.rejectedTitle}>Verification Rejected</Text>
                            <Text style={styles.rejectedText}>{request.admin_notes || 'Please provide clearer images and try again.'}</Text>
                        </View>
                    </View>
                )}

                <View style={styles.form}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>Full Name (As on ID)</Text>
                    <TextInput
                        style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="e.g. Ram Bahadur Thapa"
                        placeholderTextColor={theme.colors.textMuted}
                    />

                    <Text style={[styles.label, { color: theme.colors.text }]}>ID Type</Text>
                    <View style={styles.typeRow}>
                        {['citizenship', 'passport', 'license'].map(type => (
                            <TouchableOpacity
                                key={type}
                                style={[
                                    styles.typeButton,
                                    { borderColor: theme.colors.border },
                                    idType === type && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                ]}
                                onPress={() => setIdType(type)}
                            >
                                <Text style={[styles.typeButtonText, idType === type && { color: '#fff' }]}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={[styles.label, { color: theme.colors.text }]}>ID Number</Text>
                    <TextInput
                        style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                        value={idNumber}
                        onChangeText={setIdNumber}
                        placeholder="Document Number"
                        placeholderTextColor={theme.colors.textMuted}
                    />

                    <View style={styles.uploadRow}>
                        <View style={styles.uploadBlock}>
                            <Text style={[styles.label, { color: theme.colors.text }]}>Front View</Text>
                            <TouchableOpacity
                                style={[styles.uploadCard, { borderColor: theme.colors.border }]}
                                onPress={() => pickDocument('front')}
                            >
                                {frontImage ? (
                                    <Image source={{ uri: frontImage.uri }} style={styles.previewImage} />
                                ) : (
                                    <View style={styles.uploadPlaceholder}>
                                        <Feather name="camera" size={24} color={theme.colors.textMuted} />
                                        <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 4 }}>Upload</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.uploadBlock}>
                            <Text style={[styles.label, { color: theme.colors.text }]}>Back View (Optional)</Text>
                            <TouchableOpacity
                                style={[styles.uploadCard, { borderColor: theme.colors.border }]}
                                onPress={() => pickDocument('back')}
                            >
                                {backImage ? (
                                    <Image source={{ uri: backImage.uri }} style={styles.previewImage} />
                                ) : (
                                    <View style={styles.uploadPlaceholder}>
                                        <Feather name="camera" size={24} color={theme.colors.textMuted} />
                                        <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 4 }}>Upload</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.mainButton, { backgroundColor: theme.colors.primary }]}
                        onPress={handleSubmit}
                        disabled={submitting || request?.status === 'pending'}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.mainButtonText}>
                                {request ? 'Update Request' : 'Submit for Verification'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {__DEV__ && (
                        <TouchableOpacity
                            style={[styles.mockButton, { borderColor: theme.colors.primary }]}
                            onPress={handleMockApprove}
                        >
                            <Text style={[styles.mockButtonText, { color: theme.colors.primary }]}>
                                [DEV] Auto-Approve Verification
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scroll: {
        padding: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 24,
    },
    pendingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fffbeb',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#fef3c7',
    },
    pendingText: {
        color: '#92400e',
        marginLeft: 12,
        fontWeight: '600',
    },
    rejectedBanner: {
        flexDirection: 'row',
        backgroundColor: '#fef2f2',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#fee2e2',
    },
    rejectedContent: {
        marginLeft: 12,
        flex: 1,
    },
    rejectedTitle: {
        color: '#b91c1c',
        fontWeight: 'bold',
        marginBottom: 4,
    },
    rejectedText: {
        color: '#991b1b',
        fontSize: 14,
    },
    form: {
        marginTop: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 20,
        fontSize: 16,
    },
    typeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    typeButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1,
        width: '31%',
        alignItems: 'center',
    },
    typeButtonText: {
        fontSize: 12,
        fontWeight: '600',
    },
    uploadRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    uploadBlock: {
        width: '48%',
    },
    uploadCard: {
        height: 120,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    uploadPlaceholder: {
        alignItems: 'center',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    mainButton: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    mainButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    mockButton: {
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    mockButtonText: {
        fontWeight: '600',
    },
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    checkCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    successTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    successText: {
        textAlign: 'center',
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 32,
    },
    button: {
        height: 50,
        paddingHorizontal: 32,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
