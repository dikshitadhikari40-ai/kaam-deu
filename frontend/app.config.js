// NOTE: dotenv is loaded by Expo CLI automatically
// In EAS Build, env vars are set in eas.json

// Backend API URL - the root domain for backend calls
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://kaamdeu.aghealthindustries.com';

// Public Base URL - for OAuth callbacks (same as root domain)
const PUBLIC_BASE_URL = process.env.EXPO_PUBLIC_PUBLIC_BASE_URL || API_BASE_URL;

export default {
    expo: {
        name: 'Kaam Deu',
        slug: 'kaam-deu-',
        version: '1.0.0',
        scheme: 'kaamdeu',
        orientation: 'portrait',
        userInterfaceStyle: 'dark',
        icon: './assets/icon.png',
        splash: {
            image: './assets/splash.png',
            resizeMode: 'contain',
            backgroundColor: '#05050a'
        },
        ios: {
            supportsTablet: true,
            bundleIdentifier: 'com.kaamdeu.app',
            infoPlist: {
                NSCameraUsageDescription: 'Kaam Deu needs access to your camera to take profile photos and make video calls.',
                NSPhotoLibraryUsageDescription: 'Kaam Deu needs access to your photos to upload profile pictures and share images in chat.',
                NSMicrophoneUsageDescription: 'Kaam Deu needs access to your microphone for voice and video calls.',
                ITSAppUsesNonExemptEncryption: false,
            },
            config: {
                usesNonExemptEncryption: false,
            },
        },
        android: {
            adaptiveIcon: {
                foregroundImage: './assets/adaptive-icon.png',
                backgroundColor: "#05050a"
            },
            package: 'com.kaamdeu.app',
            permissions: [
                'CAMERA',
                'RECORD_AUDIO',
                'MODIFY_AUDIO_SETTINGS',
                'READ_EXTERNAL_STORAGE',
                'WRITE_EXTERNAL_STORAGE',
                'BLUETOOTH',
                'BLUETOOTH_CONNECT',
            ],
            intentFilters: [
                {
                    action: 'VIEW',
                    autoVerify: true,
                    data: [
                        {
                            scheme: 'kaamdeu',
                        },
                        {
                            scheme: 'https',
                            host: 'kaamdeu.aghealthindustries.com',
                            pathPrefix: '/auth',
                        },
                        {
                            scheme: 'https',
                            host: '*.supabase.co',
                            pathPrefix: '/auth',
                        },
                    ],
                    category: ['BROWSABLE', 'DEFAULT'],
                },
            ],
        },
        web: {
            bundler: 'metro',
            favicon: './assets/favicon.png'
        },
        plugins: [
            [
                'expo-image-picker',
                {
                    photosPermission: 'Kaam Deu needs access to your photos to upload profile pictures.',
                    cameraPermission: 'Kaam Deu needs access to your camera to take profile photos.',
                },
            ],
            [
                'expo-build-properties',
                {
                    android: {
                        minSdkVersion: 23,
                        compileSdkVersion: 34,
                        targetSdkVersion: 34,
                        buildToolsVersion: '34.0.0',
                        enableProguardInReleaseBuilds: false,
                        newArchEnabled: false,
                    },
                    ios: {
                        deploymentTarget: '15.1',
                    },
                },
            ],
        ],
        assetBundlePatterns: [
            "**/*"
        ],
        extra: {
            // Supabase Configuration
            supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
            supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
            // Google OAuth
            googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.GOOGLE_WEB_CLIENT_ID,
            googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.GOOGLE_IOS_CLIENT_ID,
            googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || process.env.GOOGLE_ANDROID_CLIENT_ID,
            // LinkedIn OAuth
            linkedinClientId: process.env.EXPO_PUBLIC_LINKEDIN_CLIENT_ID || process.env.LINKEDIN_CLIENT_ID,
            // API Base URL - for backend API calls (LinkedIn token exchange, etc.)
            apiBaseUrl: API_BASE_URL,
            // Public Base URL - for OAuth redirects (must be publicly accessible)
            publicBaseUrl: PUBLIC_BASE_URL,
            // eSewa Payment Configuration
            esewaMerchantId: process.env.ESEWA_MERCHANT_ID,
            esewaProduction: process.env.ESEWA_PRODUCTION,
            // Sentry Error Reporting
            sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
            // Agora Voice/Video
            agoraAppId: process.env.EXPO_PUBLIC_AGORA_APP_ID,
            // EAS Build
            eas: {
                projectId: "d49f7e3e-e38e-410b-9a7c-24d3c71bca13"
            }
        }
    }
};
