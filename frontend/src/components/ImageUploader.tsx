import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { storageService } from '../services/storageService';
import { theme } from '../theme';

interface ImageUploaderProps {
    currentImageUrl?: string;
    onImageUploaded: (url: string, path: string) => void;
    onError?: (error: string) => void;
    userId: string;
    type: 'profile' | 'logo' | 'chat';
    matchId?: string; // Required for chat type
    size?: number;
    placeholder?: string;
    photoIndex?: number;
}

export default function ImageUploader({
    currentImageUrl,
    onImageUploaded,
    onError,
    userId,
    type,
    matchId,
    size = 120,
    placeholder = 'Add Photo',
    photoIndex = 0,
}: ImageUploaderProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [localImage, setLocalImage] = useState<string | null>(null);

    const handleSelectImage = async (source: 'camera' | 'gallery') => {
        setShowOptions(false);

        try {
            const result = source === 'camera'
                ? await storageService.takePhoto()
                : await storageService.pickImage();

            if (result.canceled || !result.assets?.[0]) {
                return;
            }

            const imageUri = result.assets[0].uri;
            setLocalImage(imageUri);
            setIsUploading(true);

            let uploadResult;

            switch (type) {
                case 'profile':
                    uploadResult = await storageService.uploadProfilePhoto(userId, imageUri, photoIndex);
                    break;
                case 'logo':
                    uploadResult = await storageService.uploadCompanyLogo(userId, imageUri);
                    break;
                case 'chat':
                    if (!matchId) {
                        throw new Error('matchId is required for chat uploads');
                    }
                    uploadResult = await storageService.uploadChatMedia(matchId, userId, imageUri);
                    break;
                default:
                    throw new Error('Invalid upload type');
            }

            if (uploadResult.success && uploadResult.url && uploadResult.path) {
                onImageUploaded(uploadResult.url, uploadResult.path);
            } else {
                setLocalImage(null);
                onError?.(uploadResult.error || 'Upload failed');
                Alert.alert('Upload Failed', uploadResult.error || 'Could not upload image');
            }
        } catch (error: any) {
            setLocalImage(null);
            onError?.(error.message);
            Alert.alert('Error', error.message || 'Could not upload image');
        } finally {
            setIsUploading(false);
        }
    };

    const displayImage = localImage || currentImageUrl;

    return (
        <>
            <TouchableOpacity
                style={[styles.container, { width: size, height: size }]}
                onPress={() => setShowOptions(true)}
                disabled={isUploading}
            >
                {displayImage ? (
                    <Image
                        source={{ uri: displayImage }}
                        style={[styles.image, { width: size, height: size }]}
                    />
                ) : (
                    <View style={[styles.placeholder, { width: size, height: size }]}>
                        <Feather name="camera" size={size * 0.3} color={theme.colors.textSecondary} />
                        <Text style={styles.placeholderText}>{placeholder}</Text>
                    </View>
                )}

                {isUploading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={theme.colors.accent} />
                    </View>
                )}

                {!isUploading && (
                    <View style={styles.editBadge}>
                        <Feather name="edit-2" size={12} color="#fff" />
                    </View>
                )}
            </TouchableOpacity>

            <Modal
                visible={showOptions}
                transparent
                animationType="fade"
                onRequestClose={() => setShowOptions(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowOptions(false)}
                >
                    <View style={styles.optionsContainer}>
                        <Text style={styles.optionsTitle}>Select Photo</Text>

                        <TouchableOpacity
                            style={styles.optionButton}
                            onPress={() => handleSelectImage('camera')}
                        >
                            <Feather name="camera" size={24} color={theme.colors.text} />
                            <Text style={styles.optionText}>Take Photo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.optionButton}
                            onPress={() => handleSelectImage('gallery')}
                        >
                            <Feather name="image" size={24} color={theme.colors.text} />
                            <Text style={styles.optionText}>Choose from Gallery</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.optionButton, styles.cancelButton]}
                            onPress={() => setShowOptions(false)}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: theme.colors.card,
        position: 'relative',
    },
    image: {
        borderRadius: 12,
    },
    placeholder: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
        borderRadius: 12,
    },
    placeholderText: {
        marginTop: 8,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
    },
    editBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: theme.colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: theme.colors.background,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    optionsContainer: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    optionsTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: 24,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        marginBottom: 12,
        gap: 16,
    },
    optionText: {
        fontSize: 16,
        color: theme.colors.text,
        fontWeight: '500',
    },
    cancelButton: {
        backgroundColor: 'transparent',
        justifyContent: 'center',
        marginTop: 8,
    },
    cancelText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
});
