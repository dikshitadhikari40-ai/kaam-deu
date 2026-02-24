import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';
import { storageService } from './database';

export interface ImagePickerResult {
    uri: string;
    base64?: string;
    width: number;
    height: number;
    type?: string;
    fileName?: string;
}

// Request camera permissions
export async function requestCameraPermissions(): Promise<boolean> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert(
            'Permission Required',
            'Camera access is needed to take photos. Please enable it in your device settings.',
            [{ text: 'OK' }]
        );
        return false;
    }
    return true;
}

// Request media library permissions
export async function requestMediaLibraryPermissions(): Promise<boolean> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert(
            'Permission Required',
            'Photo library access is needed to select photos. Please enable it in your device settings.',
            [{ text: 'OK' }]
        );
        return false;
    }
    return true;
}

// Pick image from gallery
export async function pickImageFromGallery(
    options?: {
        allowsEditing?: boolean;
        aspect?: [number, number];
        quality?: number;
        allowsMultipleSelection?: boolean;
    }
): Promise<ImagePickerResult | ImagePickerResult[] | null> {
    const hasPermission = await requestMediaLibraryPermissions();
    if (!hasPermission) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options?.allowsEditing ?? true,
        aspect: options?.aspect ?? [1, 1],
        quality: options?.quality ?? 0.8,
        allowsMultipleSelection: options?.allowsMultipleSelection ?? false,
        base64: true,
        exif: false,
        // This ensures HEIC images are converted to JPEG
        legacy: true,
    });

    if (result.canceled) return null;

    if (options?.allowsMultipleSelection && result.assets.length > 1) {
        return result.assets.map(asset => ({
            uri: asset.uri,
            base64: asset.base64 ?? undefined,
            width: asset.width,
            height: asset.height,
            type: asset.mimeType,
            fileName: asset.fileName ?? undefined,
        }));
    }

    const asset = result.assets[0];
    return {
        uri: asset.uri,
        base64: asset.base64 ?? undefined,
        width: asset.width,
        height: asset.height,
        type: asset.mimeType,
        fileName: asset.fileName ?? undefined,
    };
}

// Take photo with camera
export async function takePhoto(
    options?: {
        allowsEditing?: boolean;
        aspect?: [number, number];
        quality?: number;
    }
): Promise<ImagePickerResult | null> {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return null;

    const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options?.allowsEditing ?? true,
        aspect: options?.aspect ?? [1, 1],
        quality: options?.quality ?? 0.8,
        base64: true,
        exif: false,
    });

    if (result.canceled) return null;

    const asset = result.assets[0];
    return {
        uri: asset.uri,
        base64: asset.base64 ?? undefined,
        width: asset.width,
        height: asset.height,
        type: asset.mimeType,
        fileName: asset.fileName ?? undefined,
    };
}

// Show image picker options (camera or gallery)
export function showImagePickerOptions(
    onImageSelected: (image: ImagePickerResult) => void,
    options?: {
        allowsEditing?: boolean;
        aspect?: [number, number];
        quality?: number;
    }
): void {
    Alert.alert(
        'Select Photo',
        'Choose how you want to add a photo',
        [
            {
                text: 'Take Photo',
                onPress: async () => {
                    const image = await takePhoto(options);
                    if (image) onImageSelected(image);
                },
            },
            {
                text: 'Choose from Gallery',
                onPress: async () => {
                    const image = await pickImageFromGallery(options);
                    if (image && !Array.isArray(image)) {
                        onImageSelected(image);
                    }
                },
            },
            {
                text: 'Cancel',
                style: 'cancel',
            },
        ],
        { cancelable: true }
    );
}

// Upload profile photo to Supabase storage
export async function uploadProfilePhoto(
    image: ImagePickerResult
): Promise<{ url: string } | null> {
    try {
        const url = await storageService.uploadProfilePhoto(image.uri);
        if (!url) {
            throw new Error('Upload failed');
        }
        return { url };
    } catch (error) {
        console.error('Error uploading image:', error);
        Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
        return null;
    }
}

// Upload image to server (legacy function for custom endpoints)
export async function uploadImage(
    image: ImagePickerResult,
    uploadUrl: string,
    additionalData?: Record<string, string>
): Promise<{ url: string } | null> {
    try {
        const formData = new FormData();

        // Create file object for upload
        const fileUri = Platform.OS === 'ios'
            ? image.uri.replace('file://', '')
            : image.uri;

        const file = {
            uri: fileUri,
            type: image.type || 'image/jpeg',
            name: image.fileName || `photo_${Date.now()}.jpg`,
        } as any;

        formData.append('image', file);

        // Add any additional data
        if (additionalData) {
            Object.entries(additionalData).forEach(([key, value]) => {
                formData.append(key, value);
            });
        }

        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const data = await response.json();
        return { url: data.url };
    } catch (error) {
        console.error('Error uploading image:', error);
        Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
        return null;
    }
}

// Convert image to base64 data URL (for preview or inline storage)
export function getBase64DataUrl(image: ImagePickerResult): string | null {
    if (!image.base64) return null;
    const mimeType = image.type || 'image/jpeg';
    return `data:${mimeType};base64,${image.base64}`;
}

// Validate image size
export function validateImageSize(
    image: ImagePickerResult,
    maxSizeMB: number = 5
): boolean {
    if (!image.base64) return true;

    // Base64 increases size by ~33%, so account for that
    const sizeInBytes = (image.base64.length * 3) / 4;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    if (sizeInMB > maxSizeMB) {
        Alert.alert(
            'Image Too Large',
            `Please select an image smaller than ${maxSizeMB}MB.`,
            [{ text: 'OK' }]
        );
        return false;
    }
    return true;
}

export default {
    requestCameraPermissions,
    requestMediaLibraryPermissions,
    pickImageFromGallery,
    takePhoto,
    showImagePickerOptions,
    uploadProfilePhoto,
    uploadImage,
    getBase64DataUrl,
    validateImageSize,
};
