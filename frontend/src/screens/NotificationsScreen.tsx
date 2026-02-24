import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, Alert, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { supabase } from '../lib/supabase';
import { notificationService } from '../services/notificationService';
import { Notification } from '../types';
import { NotificationItem } from '../components/NotificationItem';

export const NotificationsScreen = () => {
    const { theme } = useTheme();
    const navigation = useNavigation<any>();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState<any>(null);

    // Initial load
    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUser(user);
            fetchNotifications(user.id);
        } else {
            setLoading(false);
        }
    };

    const fetchNotifications = async (userId: string) => {
        setLoading(true);
        const data = await notificationService.getNotifications(userId);
        setNotifications(data);
        setLoading(false);
    };

    const onRefresh = useCallback(async () => {
        if (!user) return;
        setRefreshing(true);
        const data = await notificationService.getNotifications(user.id);
        setNotifications(data);
        setRefreshing(false);
    }, [user]);

    const handleMarkAllRead = async () => {
        if (!user) return;

        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

        const success = await notificationService.markAllAsRead(user.id);
        if (!success) {
            Alert.alert('Error', 'Failed to mark all as read');
            // Revert could be complex, just re-fetch
            fetchNotifications(user.id);
        }
    };

    const handlePressNotification = async (notification: Notification) => {
        // Mark as read if not already
        if (!notification.is_read) {
            // Optimistic
            setNotifications(prev =>
                prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
            );
            notificationService.markAsRead(notification.id);
        }

        // Navigation/Action logic
        if (notification.type === 'badge_earned') {
            // Navigate to Profile to see badges
            navigation.navigate('Profile');
        } else if (notification.type === 'new_match') {
            // Navigate to Match or Chat list. 
            // Assuming 'ChatList' or 'MatchList' screen exists. 
            // If not sure, maybe just stay here or alert for now.
            // Based on existing code, there is likely a root tab for Matches.
            navigation.navigate('Matches');
        } else if (notification.type === 'job_update') {
            navigation.navigate('Applications'); // Assuming this exists
        }
    };

    const EmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconInfo, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Feather name="bell-off" size={48} color={theme.colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Notifications</Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                You're all caught up! Check back later for updates.
            </Text>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Notifications</Text>
                {notifications.some(n => !n.is_read) && (
                    <TouchableOpacity onPress={handleMarkAllRead}>
                        <Text style={[styles.markReadText, { color: theme.colors.primary }]}>
                            Mark all read
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={notifications}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <NotificationItem
                        notification={item}
                        onPress={handlePressNotification}
                    />
                )}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={EmptyState}
                refreshing={refreshing}
                onRefresh={onRefresh}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    markReadText: {
        fontSize: 14,
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: 20,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        paddingHorizontal: 40,
    },
    emptyIconInfo: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 16,
        lineHeight: 24,
    },
});
