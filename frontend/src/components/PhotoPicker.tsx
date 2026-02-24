import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    Modal,
    Pressable,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import {
    pickImageFromGallery,
    takePhoto,
    ImagePickerResult,
    validateImageSize,
} from '../services/imageUpload';
import { storageService } from '../services/database';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

interface PhotoPickerProps {
    photos: string[];
    onPhotosChange: (photos: string[]) => void;
    maxPhotos?: number;
    title?: string;
    subtitle?: string;
}

export default function PhotoPicker({
    photos,
    onPhotosChange,
    maxPhotos = 5,
    title = 'Add Photos',
    subtitle = 'Add up to 5 photos to your profile',
}: PhotoPickerProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [showActionSheet, setShowActionSheet] = useState(false);

    const handleAddPhoto = () => {
        if (photos.length >= maxPhotos) {
            Alert.alert('Maximum Photos', `You can only add up to ${maxPhotos} photos.`);
            return;
        }
        setShowActionSheet(true);
    };

    const handleTakePhoto = async () => {
        setShowActionSheet(false);
        setLoading(true);

        try {
            const result = await takePhoto({
                allowsEditing: true,
                aspect: [4, 5],
                quality: 0.8,
            });

            if (result && validateImageSize(result)) {
                // Upload to Supabase storage - pass userId from AuthContext
                console.log('PhotoPicker: user object:', user);
                console.log('PhotoPicker: Uploading with userId:', user?.id);

                if (!user?.id) {
                    console.error('PhotoPicker: No user ID available from AuthContext');
                    Alert.alert('Upload Failed', 'You must be logged in to upload photos.');
                    setLoading(false);
                    return;
                }

                const uploadedUrl = await storageService.uploadProfilePhoto(result.uri, user.id);

                if (uploadedUrl) {
                    onPhotosChange([...photos, uploadedUrl]);
                } else {
                    // Upload failed - show error instead of using local URI
                    // Local URIs (especially base64) are too large for database storage
                    console.error('Photo upload failed');
                    Alert.alert(
                        'Upload Failed',
                        'Could not upload photo. Please check your internet connection and try again.',
                        [{ text: 'OK' }]
                    );
                }
            }
        } catch (error) {
            console.error('Error taking photo:', error);
            Alert.alert('Error', 'Failed to take photo. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePickFromGallery = async () => {
        setShowActionSheet(false);
        setLoading(true);

        try {
            const result = await pickImageFromGallery({
                allowsEditing: true,
                aspect: [4, 5],
                quality: 0.8,
                allowsMultipleSelection: false,
            });

            if (result && !Array.isArray(result) && validateImageSize(result)) {
                // Upload to Supabase storage - pass userId from AuthContext
                console.log('PhotoPicker: user object:', user);
                console.log('PhotoPicker: Uploading with userId:', user?.id);

                if (!user?.id) {
                    console.error('PhotoPicker: No user ID available from AuthContext');
                    Alert.alert('Upload Failed', 'You must be logged in to upload photos.');
                    setLoading(false);
                    return;
                }

                const uploadedUrl = await storageService.uploadProfilePhoto(result.uri, user.id);

                if (uploadedUrl) {
                    onPhotosChange([...photos, uploadedUrl]);
                } else {
                    // Upload failed - show error instead of using local URI
                    // Local URIs (especially base64) are too large for database storage
                    console.error('Photo upload failed');
                    Alert.alert(
                        'Upload Failed',
                        'Could not upload photo. Please check your internet connection and try again.',
                        [{ text: 'OK' }]
                    );
                }
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleRemovePhoto = (index: number) => {
        Alert.alert(
            'Remove Photo',
            'Are you sure you want to remove this photo?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                        const newPhotos = [...photos];
                        newPhotos.splice(index, 1);
                        onPhotosChange(newPhotos);
                    },
                },
            ]
        );
    };

    const handleReorderPhoto = (fromIndex: number, direction: 'left' | 'right') => {
        const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
        if (toIndex < 0 || toIndex >= photos.length) return;

        const newPhotos = [...photos];
        [newPhotos[fromIndex], newPhotos[toIndex]] = [newPhotos[toIndex], newPhotos[fromIndex]];
        onPhotosChange(newPhotos);
    };

    const renderPhotoSlot = (index: number) => {
        const photo = photos[index];
        const isMainPhoto = index === 0;

        if (photo) {
            return (
                <TouchableOpacity
                    key={index}
                    style={[styles.photoSlot, isMainPhoto && styles.mainPhotoSlot]}
                    onPress={() => setPreviewImage(photo)}
                    onLongPress={() => handleRemovePhoto(index)}
                >
                    <Image source={{ uri: photo }} style={styles.photo} />
                    {isMainPhoto && (
                        <View style={styles.mainBadge}>
                            <Text style={styles.mainBadgeText}>Main</Text>
                        </View>
                    )}
                    <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemovePhoto(index)}
                        accessibilityLabel="Remove photo"
                        accessibilityRole="button"
                    >
                        <Feather name="x" size={18} color="#fff" />
                    </TouchableOpacity>
                    {photos.length > 1 && (
                        <View style={styles.reorderButtons}>
                            {index > 0 && (
                                <TouchableOpacity
                                    style={styles.reorderButton}
                                    onPress={() => handleReorderPhoto(index, 'left')}
                                >
                                    <Feather name="chevron-left" size={16} color="#fff" />
                                </TouchableOpacity>
                            )}
                            {index < photos.length - 1 && (
                                <TouchableOpacity
                                    style={styles.reorderButton}
                                    onPress={() => handleReorderPhoto(index, 'right')}
                                >
                                    <Feather name="chevron-right" size={16} color="#fff" />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </TouchableOpacity>
            );
        }

        // Empty slot
        const canAdd = index === photos.length;
        return (
            <TouchableOpacity
                key={index}
                style={[
                    styles.photoSlot,
                    styles.emptySlot,
                    isMainPhoto && styles.mainPhotoSlot,
                    !canAdd && styles.disabledSlot,
                ]}
                onPress={canAdd ? handleAddPhoto : undefined}
                disabled={!canAdd || loading}
            >
                {canAdd ? (
                    loading ? (
                        <ActivityIndicator color={theme.colors.primary} />
                    ) : (
                        <>
                            <View style={styles.addIconContainer}>
                                <Feather name="plus" size={24} color={theme.colors.primary} />
                            </View>
                            <Text style={styles.addText}>
                                {isMainPhoto ? 'Add Main Photo' : 'Add Photo'}
                            </Text>
                        </>
                    )
                ) : (
                    <View style={styles.lockedSlot}>
                        <Feather name="lock" size={20} color="#444" />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
                <Text style={styles.photoCount}>
                    {photos.length} / {maxPhotos} photos
                </Text>
            </View>

            <View style={styles.photosGrid}>
                {/* Main photo (larger) */}
                <View style={styles.mainPhotoContainer}>
                    {renderPhotoSlot(0)}
                </View>

                {/* Secondary photos grid */}
                <View style={styles.secondaryPhotosContainer}>
                    <View style={styles.secondaryRow}>
                        {renderPhotoSlot(1)}
                        {renderPhotoSlot(2)}
                    </View>
                    <View style={styles.secondaryRow}>
                        {renderPhotoSlot(3)}
                        {renderPhotoSlot(4)}
                    </View>
                </View>
            </View>

            <View style={styles.tips}>
                <MaterialCommunityIcons name="lightbulb-outline" size={16} color="#888" />
                <Text style={styles.tipsText}>
                    Tip: Your first photo will be shown on your profile card. Tap the X button to remove.
                </Text>
            </View>

            {/* Action Sheet Modal */}
            <Modal
                visible={showActionSheet}
                transparent
                animationType="fade"
                onRequestClose={() => setShowActionSheet(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowActionSheet(false)}
                >
                    <View style={styles.actionSheet}>
                        <Text style={styles.actionSheetTitle}>Add Photo</Text>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={handleTakePhoto}
                        >
                            <View style={styles.actionIconContainer}>
                                <Feather name="camera" size={22} color={theme.colors.primary} />
                            </View>
                            <View style={styles.actionTextContainer}>
                                <Text style={styles.actionButtonText}>Take Photo</Text>
                                <Text style={styles.actionButtonSubtext}>Use your camera</Text>
                            </View>
                            <Feather name="chevron-right" size={20} color="#666" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={handlePickFromGallery}
                        >
                            <View style={styles.actionIconContainer}>
                                <Feather name="image" size={22} color={theme.colors.primary} />
                            </View>
                            <View style={styles.actionTextContainer}>
                                <Text style={styles.actionButtonText}>Choose from Gallery</Text>
                                <Text style={styles.actionButtonSubtext}>Select from your photos</Text>
                            </View>
                            <Feather name="chevron-right" size={20} color="#666" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setShowActionSheet(false)}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>

            {/* Image Preview Modal */}
            <Modal
                visible={!!previewImage}
                transparent
                animationType="fade"
                onRequestClose={() => setPreviewImage(null)}
            >
                <Pressable
                    style={styles.previewOverlay}
                    onPress={() => setPreviewImage(null)}
                >
                    <View style={styles.previewContainer}>
                        {previewImage && (
                            <Image
                                source={{ uri: previewImage }}
                                style={styles.previewImage}
                                resizeMode="contain"
                            />
                        )}
                        <TouchableOpacity
                            style={styles.previewCloseButton}
                            onPress={() => setPreviewImage(null)}
                        >
                            <Feather name="x" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    header: {
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 8,
    },
    photoCount: {
        fontSize: 12,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    photosGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    mainPhotoContainer: {
        flex: 1,
    },
    secondaryPhotosContainer: {
        flex: 1,
        gap: 12,
    },
    secondaryRow: {
        flexDirection: 'row',
        gap: 12,
        flex: 1,
    },
    photoSlot: {
        flex: 1,
        aspectRatio: 0.8,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    mainPhotoSlot: {
        aspectRatio: 0.75,
    },
    emptySlot: {
        justifyContent: 'center',
        alignItems: 'center',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: theme.colors.border,
    },
    disabledSlot: {
        opacity: 0.4,
    },
    lockedSlot: {
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.3,
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    addIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(74, 144, 217, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    addText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontWeight: '500',
        textAlign: 'center',
    },
    mainBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    mainBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#fff',
    },
    removeButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 59, 48, 0.9)', // Red for visibility
        justifyContent: 'center',
        alignItems: 'center',
        // Web-friendly: add hover effect via shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    reorderButtons: {
        position: 'absolute',
        bottom: 8,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    reorderButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tips: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 16,
        paddingHorizontal: 4,
        gap: 8,
    },
    tipsText: {
        flex: 1,
        fontSize: 12,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    actionSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    actionSheetTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 24,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    actionIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(74, 144, 217, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    actionTextContainer: {
        flex: 1,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    actionButtonSubtext: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    cancelButton: {
        marginTop: 16,
        paddingVertical: 16,
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    previewOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewImage: {
        width: '90%',
        height: '70%',
        borderRadius: 12,
    },
    previewCloseButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
