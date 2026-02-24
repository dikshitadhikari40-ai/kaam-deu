import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Notification } from '../types';

interface NotificationItemProps {
    notification: Notification;
    onPress: (notification: Notification) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onPress }) => {
    const { theme } = useTheme();
    const isRead = notification.is_read;

    // Helper to get icon and color based on type
    const getIconInfo = () => {
        switch (notification.type) {
            case 'badge_earned':
                return { name: 'award' as const, color: '#f59e0b', bg: '#fffbeb' };
            case 'new_match':
                return { name: 'heart' as const, color: '#ec4899', bg: '#fdf2f8' };
            case 'job_update':
                return { name: 'briefcase' as const, color: '#3b82f6', bg: '#eff6ff' };
            case 'message':
                return { name: 'message-square' as const, color: '#10b981', bg: '#ecfdf5' };
            case 'system_alert':
            default:
                return { name: 'bell' as const, color: '#6b7280', bg: '#f3f4f6' };
        }
    };

    const iconInfo = getIconInfo();

    // Format time (e.g., "2 hours ago")
    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                { backgroundColor: isRead ? theme.colors.card : theme.colors.background }, // Highlight unread? Or maybe keep same bg but bold text?
                !isRead && styles.unreadContainer // Add slight highlight for unread
            ]}
            onPress={() => onPress(notification)}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, { backgroundColor: iconInfo.bg }]}>
                <Feather name={iconInfo.name} size={24} color={iconInfo.color} />
            </View>

            <View style={styles.contentContainer}>
                <View style={styles.header}>
                    <Text
                        style={[
                            styles.title,
                            { color: theme.colors.text },
                            !isRead && styles.unreadText
                        ]}
                        numberOfLines={1}
                    >
                        {notification.title}
                    </Text>
                    <Text style={[styles.time, { color: theme.colors.textMuted }]}>
                        {formatTime(notification.created_at)}
                    </Text>
                </View>
                <Text
                    style={[
                        styles.body,
                        { color: theme.colors.textSecondary },
                        !isRead && { color: theme.colors.text } // Darker text for unread
                    ]}
                    numberOfLines={2}
                >
                    {notification.body}
                </Text>
            </View>

            {!isRead && (
                <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
    },
    unreadContainer: {
        backgroundColor: 'rgba(59, 130, 246, 0.05)', // Subtle blue tint
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    contentContainer: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        marginRight: 8,
    },
    unreadText: {
        fontWeight: '700',
    },
    time: {
        fontSize: 12,
    },
    body: {
        fontSize: 14,
        lineHeight: 20,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 8,
    }
});
