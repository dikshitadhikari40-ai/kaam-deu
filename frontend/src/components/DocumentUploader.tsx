import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { storageService } from '../services/storageService';
import { theme } from '../theme';

interface DocumentUploaderProps {
    currentDocument?: {
        name: string;
        url: string;
        path?: string;
    };
    onDocumentUploaded: (url: string, path: string, name: string) => void;
    onDocumentRemoved?: () => void;
    onError?: (error: string) => void;
    userId: string;
    label?: string;
    acceptedTypes?: string;
}

export default function DocumentUploader({
    currentDocument,
    onDocumentUploaded,
    onDocumentRemoved,
    onError,
    userId,
    label = 'Upload CV/Resume',
    acceptedTypes = 'PDF, DOC, DOCX',
}: DocumentUploaderProps) {
    const [isUploading, setIsUploading] = useState(false);

    const handlePickDocument = async () => {
        try {
            const result = await storageService.pickDocument();

            if (result.canceled || !result.assets?.[0]) {
                return;
            }

            const document = result.assets[0];
            setIsUploading(true);

            const uploadResult = await storageService.uploadDocument(
                userId,
                document.uri,
                document.name,
                document.mimeType || 'application/pdf'
            );

            if (uploadResult.success && uploadResult.url && uploadResult.path) {
                onDocumentUploaded(uploadResult.url, uploadResult.path, document.name);
            } else {
                onError?.(uploadResult.error || 'Upload failed');
                Alert.alert('Upload Failed', uploadResult.error || 'Could not upload document');
            }
        } catch (error: any) {
            onError?.(error.message);
            Alert.alert('Error', error.message || 'Could not upload document');
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemove = () => {
        Alert.alert(
            'Remove Document',
            'Are you sure you want to remove this document?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                        if (currentDocument?.path) {
                            storageService.deleteDocument(currentDocument.path);
                        }
                        onDocumentRemoved?.();
                    },
                },
            ]
        );
    };

    const getFileIcon = (name?: string) => {
        if (!name) return 'file';
        const ext = name.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'pdf':
                return 'file-text';
            case 'doc':
            case 'docx':
                return 'file';
            default:
                return 'file';
        }
    };

    if (currentDocument) {
        return (
            <View style={styles.documentCard}>
                <View style={styles.documentInfo}>
                    <View style={styles.iconContainer}>
                        <Feather
                            name={getFileIcon(currentDocument.name)}
                            size={24}
                            color={theme.colors.accent}
                        />
                    </View>
                    <View style={styles.documentDetails}>
                        <Text style={styles.documentName} numberOfLines={1}>
                            {currentDocument.name}
                        </Text>
                        <Text style={styles.documentStatus}>Uploaded</Text>
                    </View>
                </View>
                <View style={styles.documentActions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handlePickDocument}
                        disabled={isUploading}
                    >
                        <Feather name="refresh-cw" size={18} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.removeButton]}
                        onPress={handleRemove}
                        disabled={isUploading}
                    >
                        <Feather name="trash-2" size={18} color="#FF4444" />
                    </TouchableOpacity>
                </View>
                {isUploading && (
                    <View style={styles.uploadingOverlay}>
                        <ActivityIndicator size="small" color={theme.colors.accent} />
                        <Text style={styles.uploadingText}>Uploading...</Text>
                    </View>
                )}
            </View>
        );
    }

    return (
        <TouchableOpacity
            style={styles.uploadButton}
            onPress={handlePickDocument}
            disabled={isUploading}
        >
            {isUploading ? (
                <>
                    <ActivityIndicator size="small" color={theme.colors.accent} />
                    <Text style={styles.uploadingText}>Uploading...</Text>
                </>
            ) : (
                <>
                    <Feather name="upload" size={24} color={theme.colors.accent} />
                    <Text style={styles.uploadLabel}>{label}</Text>
                    <Text style={styles.acceptedTypes}>{acceptedTypes}</Text>
                </>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    uploadButton: {
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.card,
    },
    uploadLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginTop: 12,
    },
    acceptedTypes: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    uploadingText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 8,
    },
    documentCard: {
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
    },
    documentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: `${theme.colors.accent}20`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    documentDetails: {
        marginLeft: 12,
        flex: 1,
    },
    documentName: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    documentStatus: {
        fontSize: 12,
        color: theme.colors.success,
        marginTop: 2,
    },
    documentActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeButton: {
        backgroundColor: 'rgba(255,68,68,0.1)',
    },
    uploadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        borderRadius: 12,
    },
});
