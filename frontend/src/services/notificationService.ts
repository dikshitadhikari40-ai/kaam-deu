import { supabase } from '../lib/supabase';
import { Notification, NotificationType } from '../types';

export const notificationService = {
    /**
     * Fetch all notifications for the current user
     */
    getNotifications: async (userId: string): Promise<Notification[]> => {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }

        return data as Notification[];
    },

    /**
     * Get unread notification count
     */
    getUnreadCount: async (userId: string): Promise<number> => {
        const { count, error } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            console.error('Error getting unread count:', error);
            return 0;
        }

        return count || 0;
    },

    /**
     * Mark a single notification as read
     */
    markAsRead: async (notificationId: string): Promise<boolean> => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) {
            console.error('Error marking notification as read:', error);
            return false;
        }
        return true;
    },

    /**
     * Mark all notifications as read for a user
     */
    markAllAsRead: async (userId: string): Promise<boolean> => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            console.error('Error marking all notifications as read:', error);
            return false;
        }
        return true;
    },

    /**
     * Create a notification (Internal helper or client-side generation)
     * Ideally, most notifications are created by DB triggers or Edge Functions.
     * This is useful for testing or immediate client-side feedback loops.
     */
    createNotification: async (
        userId: string,
        type: NotificationType,
        title: string,
        body: string,
        data: any = {}
    ): Promise<Notification | null> => {
        const { data: notifData, error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                type,
                title,
                body,
                data
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating notification:', error);
            return null;
        }
        return notifData as Notification;
    },
    /**
     * Save push notification token to user profile
     */
    savePushToken: async (userId: string, token: string): Promise<boolean> => {
        const { error } = await supabase
            .from('profiles')
            .update({ push_token: token })
            .eq('id', userId);

        if (error) {
            console.error('Error saving push token:', error);
            return false;
        }
        return true;
    },

    /**
     * Register for push notifications using Expo
     * Note: Not supported on web platform
     */
    registerForPushNotifications: async (userId: string) => {
        try {
            // Web platform doesn't support expo-notifications
            if (typeof window !== 'undefined') {
                console.log('Push notifications not supported on web platform');
                return null;
            }

            const Notifications = await import('expo-notifications');
            const Device = await import('expo-device');
            const { Platform } = await import('react-native');

            if (!Device.isDevice) {
                console.log('Must use physical device for Push Notifications');
                return null;
            }

            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Failed to get push token for push notification!');
                return null;
            }

            const token = (await Notifications.getExpoPushTokenAsync()).data;
            console.log('Expo Push Token:', token);

            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
            }

            await notificationService.savePushToken(userId, token);
            return token;
        } catch (error) {
            console.error('Error in registerForPushNotifications:', error);
            return null;
        }
    }
};
