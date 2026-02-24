import { useState, useEffect, useRef } from 'react';
import {
    registerForPushNotificationsAsync,
    addNotificationReceivedListener,
    addNotificationResponseListener,
    removeNotificationSubscription,
} from '../services/notifications';

interface UseNotificationsReturn {
    expoPushToken: string | null;
    notification: unknown | null;
    isLoading: boolean;
    error: string | null;
}

export function useNotifications(): UseNotificationsReturn {
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const [notification, setNotification] = useState<unknown | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const notificationListener = useRef<{ remove: () => void }>();
    const responseListener = useRef<{ remove: () => void }>();

    useEffect(() => {
        // Register for push notifications
        registerForPushNotificationsAsync()
            .then((token) => {
                setExpoPushToken(token);
                setIsLoading(false);
            })
            .catch((err) => {
                setError(err.message || 'Failed to register for notifications');
                setIsLoading(false);
            });

        // Listen for incoming notifications while app is foregrounded
        notificationListener.current = addNotificationReceivedListener((notification) => {
            setNotification(notification);
        });

        // Listen for user interactions with notifications
        responseListener.current = addNotificationResponseListener((response: any) => {
            const data = response?.notification?.request?.content?.data;

            // Handle different notification types
            if (data?.type === 'match') {
                // Navigate to matches screen
                console.log('User tapped on match notification');
            } else if (data?.type === 'message') {
                // Navigate to chat screen
                console.log('User tapped on message notification');
            }
        });

        // Cleanup
        return () => {
            if (notificationListener.current) {
                removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                removeNotificationSubscription(responseListener.current);
            }
        };
    }, []);

    return {
        expoPushToken,
        notification,
        isLoading,
        error,
    };
}

export default useNotifications;
