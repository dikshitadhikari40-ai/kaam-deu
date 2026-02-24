import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, SafeAreaView, TouchableOpacity, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { leaderboardService, LeaderboardEntry } from '../services/leaderboardService';
import { supabase } from '../lib/supabase';

export const LeaderboardScreen = () => {
    const { theme } = useTheme();
    const navigation = useNavigation<any>();

    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [activeTab, setActiveTab] = useState<'workers' | 'businesses'>('workers');
    const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        const [top, mine] = await Promise.all([
            activeTab === 'workers'
                ? leaderboardService.getTopPerformers(50)
                : leaderboardService.getTopBusinesses(50),
            user ? leaderboardService.getUserRank(user.id) : Promise.resolve(null)
        ]);

        setEntries(top);
        setUserEntry(activeTab === 'workers' ? mine : null); // Only show rank bar for workers for now
        setLoading(false);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const renderRankIcon = (rank: number) => {
        if (rank === 1) return <Feather name="award" size={24} color="#fcd34d" />; // Gold
        if (rank === 2) return <Feather name="award" size={24} color="#d1d5db" />; // Silver
        if (rank === 3) return <Feather name="award" size={24} color="#b45309" />; // Bronze
        return <Text style={[styles.rankText, { color: theme.colors.textSecondary }]}>{rank}</Text>;
    };

    const renderItem = ({ item }: { item: LeaderboardEntry }) => {
        const isMe = userEntry?.user_id === item.user_id;

        return (
            <TouchableOpacity
                style={[
                    styles.card,
                    { backgroundColor: theme.colors.card },
                    isMe && { borderColor: theme.colors.primary, borderWidth: 1 }
                ]}
                onPress={() => {
                    if (activeTab === 'workers') {
                        navigation.navigate('CVPreview', { identityId: item.user_id });
                    } else {
                        // Navigate to business profile if available
                        navigation.navigate('Explore', { screen: 'BusinessSearch', params: { companyName: item.name } });
                    }
                }}
            >
                <View style={styles.rankContainer}>
                    {renderRankIcon(item.rank)}
                </View>

                <Image
                    source={item.profile_pic ? { uri: item.profile_pic } : require('../../assets/images/default-avatar.png')}
                    style={styles.avatar}
                />

                <View style={styles.infoContainer}>
                    <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
                        {item.name} {isMe && '(You)'}
                    </Text>
                    <Text style={[styles.jobTitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {activeTab === 'workers' ? item.job_title : item.job_title || 'Industry'}
                    </Text>
                    <View style={styles.statsRow}>
                        {activeTab === 'workers' ? (
                            <>
                                <Text style={[styles.statText, { color: theme.colors.textMuted }]}>
                                    🏆 {item.badge_count || 0} Badges
                                </Text>
                                <Text style={[styles.statText, { color: theme.colors.textMuted, marginLeft: 12 }]}>
                                    💼 {item.jobs_completed || 0} Jobs
                                </Text>
                            </>
                        ) : (
                            <>
                                <Text style={[styles.statText, { color: theme.colors.textMuted }]}>
                                    🔥 {item.active_jobs || 0} Active Jobs
                                </Text>
                                <Text style={[styles.statText, { color: theme.colors.textMuted, marginLeft: 12 }]}>
                                    🤝 {item.people_hired || 0} Hired
                                </Text>
                            </>
                        )}
                    </View>
                </View>

                <View style={styles.scoreContainer}>
                    <Text style={[styles.score, { color: theme.colors.primary }]}>{item.total_score}</Text>
                    <Text style={[styles.scoreLabel, { color: theme.colors.textMuted }]}>pts</Text>
                </View>
            </TouchableOpacity>
        );
    };

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
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Leaderboards 🏆</Text>

                <View style={[styles.tabContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'workers' && { backgroundColor: theme.colors.card }]}
                        onPress={() => setActiveTab('workers')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'workers' ? theme.colors.text : theme.colors.textSecondary }]}>
                            Talent
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'businesses' && { backgroundColor: theme.colors.card }]}
                        onPress={() => setActiveTab('businesses')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'businesses' ? theme.colors.text : theme.colors.textSecondary }]}>
                            Businesses
                        </Text>
                    </TouchableOpacity>
                </View>

                <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
                    {activeTab === 'workers'
                        ? 'The highest performing workers in Kaam Deu'
                        : 'Top businesses providing opportunities'
                    }
                </Text>
            </View>

            <FlatList
                data={entries}
                keyExtractor={item => item.user_id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
            />

            {userEntry && !entries.find(e => e.user_id === userEntry.user_id) && (
                <View style={[styles.myRankBar, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.myRankText}>
                        Your current rank: <Text style={styles.rankValue}>#{userEntry.rank}</Text>
                    </Text>
                    <Text style={styles.myRankScore}>{userEntry.total_score} pts</Text>
                </View>
            )}
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
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        lineHeight: 20,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 100, // Room for rank bar
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    rankContainer: {
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginHorizontal: 12,
        backgroundColor: '#e1e1e1',
    },
    infoContainer: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    jobTitle: {
        fontSize: 12,
    },
    scoreContainer: {
        alignItems: 'flex-end',
        paddingLeft: 8,
    },
    score: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    scoreLabel: {
        fontSize: 10,
        textTransform: 'uppercase',
    },
    tabContainer: {
        flexDirection: 'row',
        padding: 4,
        borderRadius: 12,
        marginVertical: 12,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 10,
        alignItems: 'center',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: 4,
    },
    statText: {
        fontSize: 11,
    },
    myRankBar: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 25,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    myRankText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    rankValue: {
        fontWeight: 'bold',
        fontSize: 18,
    },
    myRankScore: {
        color: '#fff',
        fontSize: 14,
        opacity: 0.9,
    },
});
