import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// Storage bucket names
const BUCKETS = {
    PROFILE_PHOTOS: 'profile-photos',
    CHAT_MEDIA: 'chat-media',
    DOCUMENTS: 'documents',
    COMPANY_LOGOS: 'company-logos',
};

// File size limits (in bytes)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

interface UploadResult {
    success: boolean;
    url?: string;
    path?: string;
    error?: string;
}

class StorageService {
    // Request camera permissions
    async requestCameraPermissions(): Promise<boolean> {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        return status === 'granted';
    }

    // Request media library permissions
    async requestMediaLibraryPermissions(): Promise<boolean> {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        return status === 'granted';
    }

    // Pick image from gallery
    async pickImage(options?: {
        allowsEditing?: boolean;
        aspect?: [number, number];
        quality?: number;
    }): Promise<ImagePicker.ImagePickerResult> {
        const hasPermission = await this.requestMediaLibraryPermissions();
        if (!hasPermission) {
            return { canceled: true, assets: null };
        }

        return ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: options?.allowsEditing ?? true,
            aspect: options?.aspect ?? [1, 1],
            quality: options?.quality ?? 0.8,
        });
    }

    // Take photo with camera
    async takePhoto(options?: {
        allowsEditing?: boolean;
        aspect?: [number, number];
        quality?: number;
    }): Promise<ImagePicker.ImagePickerResult> {
        const hasPermission = await this.requestCameraPermissions();
        if (!hasPermission) {
            return { canceled: true, assets: null };
        }

        return ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: options?.allowsEditing ?? true,
            aspect: options?.aspect ?? [1, 1],
            quality: options?.quality ?? 0.8,
        });
    }

    // Pick document (PDF, DOC, etc.)
    async pickDocument(): Promise<DocumentPicker.DocumentPickerResult> {
        return DocumentPicker.getDocumentAsync({
            type: ALLOWED_DOCUMENT_TYPES,
            copyToCacheDirectory: true,
        });
    }

    // Compress image before upload
    async compressImage(uri: string, maxWidth: number = 1200): Promise<string> {
        try {
            const result = await manipulateAsync(
                uri,
                [{ resize: { width: maxWidth } }],
                { compress: 0.8, format: SaveFormat.JPEG }
            );
            return result.uri;
        } catch (error) {
            console.error('Image compression error:', error);
            return uri; // Return original if compression fails
        }
    }

    // Upload profile photo
    async uploadProfilePhoto(
        userId: string,
        imageUri: string,
        photoIndex: number = 0
    ): Promise<UploadResult> {
        try {
            // Compress image
            const compressedUri = await this.compressImage(imageUri);

            // Generate unique filename
            const fileName = `${userId}/${Date.now()}_${photoIndex}.jpg`;

            // Convert URI to blob
            const response = await fetch(compressedUri);
            const blob = await response.blob();

            // Check file size
            if (blob.size > MAX_IMAGE_SIZE) {
                return { success: false, error: 'Image size exceeds 5MB limit' };
            }

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from(BUCKETS.PROFILE_PHOTOS)
                .upload(fileName, blob, {
                    contentType: 'image/jpeg',
                    upsert: true,
                });

            if (error) {
                console.error('Profile photo upload error:', error);
                return { success: false, error: error.message };
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from(BUCKETS.PROFILE_PHOTOS)
                .getPublicUrl(fileName);

            return {
                success: true,
                url: urlData.publicUrl,
                path: fileName,
            };
        } catch (error: any) {
            console.error('Profile photo upload error:', error);
            return { success: false, error: error.message };
        }
    }

    // Upload company logo
    async uploadCompanyLogo(userId: string, imageUri: string): Promise<UploadResult> {
        try {
            const compressedUri = await this.compressImage(imageUri, 800);
            const fileName = `${userId}/logo_${Date.now()}.jpg`;

            const response = await fetch(compressedUri);
            const blob = await response.blob();

            if (blob.size > MAX_IMAGE_SIZE) {
                return { success: false, error: 'Logo size exceeds 5MB limit' };
            }

            const { data, error } = await supabase.storage
                .from(BUCKETS.COMPANY_LOGOS)
                .upload(fileName, blob, {
                    contentType: 'image/jpeg',
                    upsert: true,
                });

            if (error) {
                return { success: false, error: error.message };
            }

            const { data: urlData } = supabase.storage
                .from(BUCKETS.COMPANY_LOGOS)
                .getPublicUrl(fileName);

            return {
                success: true,
                url: urlData.publicUrl,
                path: fileName,
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    // Upload chat media (images in messages)
    async uploadChatMedia(
        matchId: string,
        senderId: string,
        imageUri: string
    ): Promise<UploadResult> {
        try {
            const compressedUri = await this.compressImage(imageUri, 1600);
            const fileName = `${matchId}/${senderId}_${Date.now()}.jpg`;

            const response = await fetch(compressedUri);
            const blob = await response.blob();

            if (blob.size > MAX_IMAGE_SIZE) {
                return { success: false, error: 'Image size exceeds 5MB limit' };
            }

            const { data, error } = await supabase.storage
                .from(BUCKETS.CHAT_MEDIA)
                .upload(fileName, blob, {
                    contentType: 'image/jpeg',
                });

            if (error) {
                return { success: false, error: error.message };
            }

            const { data: urlData } = supabase.storage
                .from(BUCKETS.CHAT_MEDIA)
                .getPublicUrl(fileName);

            return {
                success: true,
                url: urlData.publicUrl,
                path: fileName,
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    // Upload document (CV, resume, certificates)
    async uploadDocument(
        userId: string,
        documentUri: string,
        documentName: string,
        documentType: string
    ): Promise<UploadResult> {
        try {
            // Validate file type
            if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
                return { success: false, error: 'Invalid document type. Only PDF and DOC files are allowed.' };
            }

            const response = await fetch(documentUri);
            const blob = await response.blob();

            // Check file size
            if (blob.size > MAX_DOCUMENT_SIZE) {
                return { success: false, error: 'Document size exceeds 10MB limit' };
            }

            // Generate safe filename
            const safeFileName = documentName.replace(/[^a-zA-Z0-9.-]/g, '_');
            const fileName = `${userId}/${Date.now()}_${safeFileName}`;

            const { data, error } = await supabase.storage
                .from(BUCKETS.DOCUMENTS)
                .upload(fileName, blob, {
                    contentType: documentType,
                });

            if (error) {
                return { success: false, error: error.message };
            }

            const { data: urlData } = supabase.storage
                .from(BUCKETS.DOCUMENTS)
                .getPublicUrl(fileName);

            return {
                success: true,
                url: urlData.publicUrl,
                path: fileName,
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    // Delete file from storage
    async deleteFile(bucket: string, path: string): Promise<boolean> {
        try {
            const { error } = await supabase.storage
                .from(bucket)
                .remove([path]);

            if (error) {
                console.error('Delete file error:', error);
                return false;
            }
            return true;
        } catch (error) {
            console.error('Delete file error:', error);
            return false;
        }
    }

    // Delete profile photo
    async deleteProfilePhoto(path: string): Promise<boolean> {
        return this.deleteFile(BUCKETS.PROFILE_PHOTOS, path);
    }

    // Delete document
    async deleteDocument(path: string): Promise<boolean> {
        return this.deleteFile(BUCKETS.DOCUMENTS, path);
    }

    // Get signed URL for private files (if needed)
    async getSignedUrl(bucket: string, path: string, expiresIn: number = 3600): Promise<string | null> {
        try {
            const { data, error } = await supabase.storage
                .from(bucket)
                .createSignedUrl(path, expiresIn);

            if (error) {
                console.error('Get signed URL error:', error);
                return null;
            }
            return data.signedUrl;
        } catch (error) {
            console.error('Get signed URL error:', error);
            return null;
        }
    }

    // Upload multiple profile photos
    async uploadMultipleProfilePhotos(
        userId: string,
        imageUris: string[]
    ): Promise<UploadResult[]> {
        const results: UploadResult[] = [];

        for (let i = 0; i < imageUris.length; i++) {
            const result = await this.uploadProfilePhoto(userId, imageUris[i], i);
            results.push(result);
        }

        return results;
    }
}

export const storageService = new StorageService();
export default storageService;
export { BUCKETS };
