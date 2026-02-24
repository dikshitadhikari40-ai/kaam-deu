import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { matchService } from '../services/database';
import { theme } from '../theme';

interface Match {
    id: string;
    otherUserId: string;
    name: string;
    imageUrl: string;
    lastMessage: string | null;
    time: string;
    unread: number;
    isOnline: boolean;
    hasMessage: boolean;
}

export default function ChatScreen({ navigation }: { navigation: any }) {
    const { user, selectedRole } = useAuth();
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        return date.toLocaleDateString();
    };

    const loadMatches = useCallback(async () => {
        // Guard: don't fetch if user is not authenticated
        if (!user) {
            console.log('[ChatScreen] No user, skipping match load');
            setLoading(false);
            return;
        }

        try {
            console.log('[ChatScreen] Loading matches for user:', user.id);
            const matchData = await matchService.getMatches();
            console.log('[ChatScreen] Raw match data:', matchData.length, 'matches found');

            if (matchData.length > 0) {
                console.log('[ChatScreen] First match:', {
                    id: matchData[0].id,
                    user1_id: matchData[0].user1_id,
                    user2_id: matchData[0].user2_id,
                    other_user: matchData[0].other_user?.name || matchData[0].other_user?.company_name
                });
            }

            const formattedMatches: Match[] = matchData
                .filter((m: any) => m.other_user) // Filter out matches with no other_user data
                .map((m: any) => {
                    const otherUser = m.other_user || {};
                    const displayName = otherUser.name || otherUser.company_name || 'Unknown';
                    return {
                        id: m.id,
                        otherUserId: otherUser.id,
                        name: displayName,
                        imageUrl: otherUser.photos?.[0] || otherUser.logo_url || otherUser.photo_url ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1E3A5F&color=fff`,
                        lastMessage: m.last_message?.content || null,
                        time: m.last_message?.created_at ? formatTime(m.last_message.created_at) : formatTime(m.created_at),
                        unread: m.unread_count || 0,
                        isOnline: false,
                        hasMessage: !!m.last_message,
                    };
                });
            console.log('[ChatScreen] Formatted matches:', formattedMatches.length);
            setMatches(formattedMatches);
        } catch (error) {
            console.error('[ChatScreen] Error loading matches:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        loadMatches();
    }, [loadMatches]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadMatches();
    }, [loadMatches]);

    // Separate new matches (no messages yet) from conversations
    const newMatches = matches.filter(m => !m.hasMessage);
    const conversations = matches.filter(m => m.hasMessage);

    const handleOpenChat = (match: Match) => {
        navigation.navigate('ChatConversation', {
            matchId: match.id,
            matchName: match.name,
            matchImage: match.imageUrl,
            matchUserId: match.otherUserId,
        });
    };

    const renderNewMatch = ({ item }: { item: Match }) => (
        <TouchableOpacity
            style={styles.newMatchItem}
            onPress={() => handleOpenChat(item)}
        >
            <View style={styles.newMatchAvatarContainer}>
                <Image source={{ uri: item.imageUrl }} style={styles.newMatchAvatar} />
                {item.isOnline && <View style={styles.onlineDot} />}
            </View>
            <Text style={styles.newMatchName} numberOfLines={1}>{item.name}</Text>
        </TouchableOpacity>
    );

    const renderConversation = ({ item }: { item: Match }) => (
        <TouchableOpacity
            style={styles.conversationItem}
            onPress={() => handleOpenChat(item)}
        >
            <View style={styles.avatarContainer}>
                <Image source={{ uri: item.imageUrl }} style={styles.avatar} />
                {item.isOnline && <View style={styles.onlineIndicator} />}
            </View>

            <View style={styles.conversationContent}>
                <View style={styles.conversationHeader}>
                    <Text style={styles.conversationName}>{item.name}</Text>
                    <Text style={[styles.conversationTime, item.unread > 0 && styles.unreadTime]}>
                        {item.time}
                    </Text>
                </View>
                <View style={styles.messageRow}>
                    <Text
                        style={[styles.lastMessage, item.unread > 0 && styles.unreadMessage]}
                        numberOfLines={1}
                    >
                        {item.lastMessage || 'Say hello!'}
                    </Text>
                    {item.unread > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadCount}>{item.unread}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    // Loading state
    if (loading) {
        return (
            <SafeAreaView style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading matches...</Text>
            </SafeAreaView>
        );
    }

    // Empty state - no matches at all
    if (matches.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Messages</Text>
                    <TouchableOpacity style={styles.searchButton}>
                        <Feather name="search" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>
                <View style={[styles.emptyStateContainer]}>
                    <MaterialCommunityIcons name="heart-outline" size={80} color={theme.colors.textSecondary} />
                    <Text style={styles.emptyTitle}>No matches yet</Text>
                    <Text style={styles.emptySubtitle}>
                        {selectedRole === 'worker'
                            ? 'Start swiping to match with businesses and start conversations!'
                            : 'Start swiping to find workers and connect with talent!'}
                    </Text>
                    <TouchableOpacity
                        style={styles.startSwipingButton}
                        onPress={() => navigation.navigate('Swipe')}
                    >
                        <Feather name="layers" size={20} color="#fff" />
                        <Text style={styles.startSwipingText}>Start Swiping</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Messages</Text>
                <TouchableOpacity style={styles.searchButton}>
                    <Feather name="search" size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={[1]} // Dummy data to render once
                renderItem={() => (
                    <>
                        {/* New Matches Section */}
                        {newMatches.length > 0 && (
                            <View style={styles.newMatchesSection}>
                                <Text style={styles.sectionTitle}>New Matches</Text>
                                <FlatList
                                    horizontal
                                    data={newMatches}
                                    renderItem={renderNewMatch}
                                    keyExtractor={(item) => item.id}
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.newMatchesList}
                                />
                            </View>
                        )}

                        {/* Conversations Section */}
                        <View style={styles.conversationsSection}>
                            <Text style={styles.sectionTitle}>
                                {conversations.length > 0 ? 'Conversations' : 'Start a Conversation'}
                            </Text>
                            {conversations.length > 0 ? (
                                conversations.map((item) => (
                                    <View key={item.id}>
                                        {renderConversation({ item })}
                                    </View>
                                ))
                            ) : newMatches.length > 0 ? (
                                <View style={styles.noConversationsHint}>
                                    <Feather name="message-circle" size={40} color={theme.colors.textSecondary} />
                                    <Text style={styles.hintText}>
                                        Tap on a match above to start chatting!
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    </>
                )}
                keyExtractor={() => 'main'}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.colors.primary}
                    />
                }
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        paddingBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: theme.colors.text,
    },
    searchButton: {
        padding: 10,
        backgroundColor: theme.colors.card,
        borderRadius: 50,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingBottom: 100,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.text,
        marginTop: 24,
        marginBottom: 12,
    },
    emptySubtitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    startSwipingButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.accent,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 10,
    },
    startSwipingText: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    newMatchesSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginLeft: 24,
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    newMatchesList: {
        paddingHorizontal: 24,
    },
    newMatchItem: {
        alignItems: 'center',
        marginRight: 20,
        width: 70,
    },
    newMatchAvatarContainer: {
        position: 'relative',
    },
    newMatchAvatar: {
        width: 65,
        height: 65,
        borderRadius: 33,
        borderWidth: 2,
        borderColor: theme.colors.accent,
    },
    onlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: theme.colors.success,
        borderWidth: 2,
        borderColor: theme.colors.background,
    },
    newMatchName: {
        marginTop: 8,
        fontSize: 12,
        color: theme.colors.text,
        fontWeight: '500',
        textAlign: 'center',
    },
    conversationsSection: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 24,
        paddingBottom: 100,
        minHeight: 300,
    },
    conversationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: theme.colors.success,
        borderWidth: 2,
        borderColor: theme.colors.surface,
    },
    conversationContent: {
        flex: 1,
        marginLeft: 14,
    },
    conversationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    conversationName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    conversationTime: {
        fontSize: 12,
        color: theme.colors.textMuted,
    },
    unreadTime: {
        color: theme.colors.accent,
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    lastMessage: {
        fontSize: 14,
        color: theme.colors.textMuted,
        flex: 1,
    },
    unreadMessage: {
        color: theme.colors.text,
        fontWeight: '500',
    },
    unreadBadge: {
        backgroundColor: theme.colors.accent,
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
        paddingHorizontal: 6,
    },
    unreadCount: {
        color: theme.colors.text,
        fontSize: 12,
        fontWeight: '700',
    },
    noConversationsHint: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 24,
    },
    hintText: {
        marginTop: 16,
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
});
