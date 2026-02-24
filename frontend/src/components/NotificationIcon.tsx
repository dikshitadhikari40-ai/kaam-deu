import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { notificationService } from '../services/notificationService';
import { supabase } from '../lib/supabase';
import { useTheme } from '../theme/ThemeContext';

interface NotificationIconProps {
    color: string;
    size: number;
}

export const NotificationIcon: React.FC<NotificationIconProps> = ({ color, size }) => {
    const { theme } = useTheme();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        let isMounted = true;

        const fetchCount = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && isMounted) {
                const count = await notificationService.getUnreadCount(user.id);
                setUnreadCount(count);
            }
        };

        fetchCount();

        // Subscribe to changes in notifications table
        const subscription = supabase
            .channel('notification_count')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications'
                },
                () => {
                    fetchCount();
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return (
        <View style={styles.container}>
            <Feather name="bell" size={size} color={color} />
            {unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.colors.error || '#ef4444' }]}>
                    <Text style={styles.badgeText}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 1,
        borderColor: '#fff',
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
