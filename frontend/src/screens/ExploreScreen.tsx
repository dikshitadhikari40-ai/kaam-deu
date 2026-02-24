import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    ScrollView,
    ActivityIndicator,
    Dimensions,
    RefreshControl,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { profileService, swipeService, RankedProfile } from '../services/database';
import { getTrendingPosts, businessFeedService } from '../services/businessFeed';
import { newsService } from '../services/news';
import { BusinessPost, NewsItem } from '../types';
import { theme } from '../theme';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

// Reuse colors for consistency
const colors = {
    background: '#ffffff',
    surface: '#f3f2f1',
    card: '#ffffff',
    border: '#d4d2d0',
    primary: '#2557a7',
    text: '#2d2d2d',
    textSecondary: '#6f6f6f',
    success: '#00af41',
    error: '#d12020',
    blue: '#2557a7',
    purple: '#8B5CF6',
    gold: '#2557a7', // Replaced gold with primary blue for Indeed feel
    textMuted: '#949494',
};

const SuggestedProfileCard = ({ profile, onPress }: { profile: RankedProfile, onPress: () => void }) => {
    return (
        <TouchableOpacity style={styles.suggestedCard} onPress={onPress} activeOpacity={0.9}>
            <Image
                source={{ uri: profile.photo_url || profile.photos?.[0] || 'https://via.placeholder.com/150' }}
                style={styles.suggestedImage}
            />
            <View style={styles.suggestedOverlay}>
                <Text style={styles.suggestedName} numberOfLines={1}>{profile.name || profile.company_name}</Text>
                <Text style={styles.suggestedJob} numberOfLines={1}>{profile.job_title || profile.industry || 'Professional'}</Text>
            </View>
            <View style={styles.matchBadge}>
                <Text style={styles.matchText}>{Math.round((profile.matchScore?.overall || 0))}% Match</Text>
            </View>
        </TouchableOpacity>
    );
};

// Premium News Card for Explore
const NewsCard = ({ item, onPress }: { item: NewsItem, onPress: () => void }) => {
    const formattedDate = new Date(item.published_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });

    return (
        <TouchableOpacity style={styles.newsCard} onPress={onPress} activeOpacity={0.9}>
            {item.image_url && (
                <Image source={{ uri: item.image_url }} style={styles.newsImage} />
            )}
            <View style={styles.newsContent}>
                <View style={styles.newsHeader}>
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{item.category.replace('_', ' ').toUpperCase()}</Text>
                    </View>
                    <Text style={styles.newsDate}>{formattedDate}</Text>
                </View>
                <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.newsFooter}>
                    <Text style={styles.newsSource}>{item.source}</Text>
                    <Feather name="external-link" size={14} color={colors.textSecondary} />
                </View>
            </View>
        </TouchableOpacity>
    );
};

// Simplified Post Card for Explore
const TrendingPostCard = ({ post, onPress }: { post: BusinessPost, onPress: () => void }) => {
    const typeInfo = businessFeedService.getPostTypeInfo(post.post_type);

    return (
        <TouchableOpacity style={styles.trendingPostCard} onPress={onPress} activeOpacity={0.9}>
            <View style={styles.trendingPostHeader}>
                <View style={styles.authorRow}>
                    <Image
                        source={{ uri: post.business_logo || 'https://via.placeholder.com/40' }}
                        style={styles.trendingAvatar}
                    />
                    <View>
                        <Text style={styles.trendingAuthorName}>{post.business_name}</Text>
                        <Text style={styles.trendingPostMeta}>{post.business_industry}</Text>
                    </View>
                </View>
                <View style={[styles.typeTag, { backgroundColor: typeInfo.color + '20' }]}>
                    <Feather name={typeInfo.icon as any} size={12} color={typeInfo.color} />
                    <Text style={[styles.typeTagText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
                </View>
            </View>

            <Text style={styles.trendingPostTitle} numberOfLines={2}>{post.title || post.content}</Text>

            <View style={styles.trendingPostFooter}>
                <View style={styles.engagementRow}>
                    <Feather name="trending-up" size={14} color={colors.gold} />
                    <Text style={styles.engagementText}>{(post.likes_count || 0) + (post.dislikes_count || 0)} engagements</Text>
                </View>
                <Feather name="arrow-right" size={18} color={colors.textSecondary} />
            </View>
        </TouchableOpacity>
    );
};

export default function ExploreScreen({ navigation }: { navigation: any }) {
    const { user, selectedRole } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [suggestedProfiles, setSuggestedProfiles] = useState<RankedProfile[]>([]);
    const [trendingPosts, setTrendingPosts] = useState<BusinessPost[]>([]);
    const [latestNews, setLatestNews] = useState<NewsItem[]>([]);

    const loadData = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);
            const [profiles, posts, news] = await Promise.all([
                profileService.getSwipeProfiles(selectedRole || 'worker', undefined, { excludeSwiped: false }),
                getTrendingPosts(5),
                newsService.getLatestNews(10)
            ]);

            // Take top 5 for horizontal list
            setSuggestedProfiles(profiles.slice(0, 8));
            setTrendingPosts(posts);
            setLatestNews(news);
        } catch (error) {
            console.error('[ExploreScreen] Error loading data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user, selectedRole]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const renderHeader = () => (
        <View style={styles.headerContent}>
            <View style={styles.searchContainer}>
                <View style={styles.searchInputWrapper}>
                    <Feather name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        placeholder="Job title, keywords, or company"
                        placeholderTextColor={colors.textMuted}
                        style={styles.searchInput}
                    />
                </View>
                <View style={styles.searchInputSeparator} />
                <View style={styles.searchInputWrapper}>
                    <Feather name="map-pin" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        placeholder="City, state, or zip code"
                        placeholderTextColor={colors.textMuted}
                        style={styles.searchInput}
                    />
                </View>
                <TouchableOpacity style={styles.searchButton}>
                    <Text style={styles.searchButtonText}>Search</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.heroSection}>
                <Text style={styles.heroTitle}>Your next job starts here</Text>
                <TouchableOpacity style={styles.getStartedButton}>
                    <Text style={styles.getStartedButtonText}>Get Started ➔</Text>
                </TouchableOpacity>
            </View>

            {/* News Section - Priority 1 */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Latest News</Text>
                <TouchableOpacity onPress={() => navigation.navigate('NewsFeed')}>
                    <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
            </View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
            >
                {latestNews.map((item) => (
                    <NewsCard
                        key={item.id}
                        item={item}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            navigation.navigate('NewsFeed');
                        }}
                    />
                ))}
            </ScrollView>

            {/* Quick Shortcuts */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Quick Shortcuts</Text>
            </View>
            <View style={styles.shortcutsRow}>
                <TouchableOpacity
                    style={styles.shortcutItem}
                    onPress={() => navigation.navigate('Jobs')}
                >
                    <View style={[styles.shortcutIcon, { backgroundColor: '#10B98115' }]}>
                        <Feather name="briefcase" size={22} color="#10B981" />
                    </View>
                    <Text style={styles.shortcutLabel}>Opportunities</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.shortcutItem}
                    onPress={() => navigation.navigate('Insights')}
                >
                    <View style={[styles.shortcutIcon, { backgroundColor: '#8B5CF615' }]}>
                        <Feather name="trending-up" size={22} color="#8B5CF6" />
                    </View>
                    <Text style={styles.shortcutLabel}>Insights</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.shortcutItem}
                    onPress={() => navigation.navigate('Feed')}
                >
                    <View style={[styles.shortcutIcon, { backgroundColor: '#2557a715' }]}>
                        <Feather name="rss" size={22} color="#2557a7" />
                    </View>
                    <Text style={styles.shortcutLabel}>Network</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.shortcutItem}
                    onPress={() => navigation.navigate('Leaderboard')}
                >
                    <View style={[styles.shortcutIcon, { backgroundColor: '#FCD34D15' }]}>
                        <Feather name="award" size={22} color="#FCD34D" />
                    </View>
                    <Text style={styles.shortcutLabel}>Leaderboard</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Suggested For You</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Swipe')}>
                    <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
            >
                {suggestedProfiles.length > 0 ? (
                    suggestedProfiles.map((profile) => (
                        <SuggestedProfileCard
                            key={profile.id}
                            profile={profile}
                            onPress={() => navigation.navigate('Profile', { userId: profile.id })}
                        />
                    ))
                ) : (
                    <View style={styles.emptySuggestions}>
                        <Feather name="users" size={32} color={colors.textSecondary} />
                        <Text style={styles.emptySuggestionsText}>
                            {selectedRole === 'worker' ? 'No businesses yet' : 'No workers yet'}
                        </Text>
                    </View>
                )}
            </ScrollView>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Trending Now</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Feed')}>
                    <Text style={styles.viewAllText}>View More</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={colors.gold} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={trendingPosts}
                renderItem={({ item }) => (
                    <TrendingPostCard
                        post={item}
                        onPress={() => navigation.navigate('Feed', { postId: item.id })}
                    />
                )}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.gold} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Feather name="search" size={48} color={colors.textSecondary} />
                        <Text style={styles.emptyText}>Nothing trending yet. Check back later!</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: 20,
    },
    headerContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    screenTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
    },
    screenSubtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        marginBottom: 24,
    },
    searchContainer: {
        backgroundColor: colors.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 4,
        marginTop: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 48,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: colors.text,
        fontWeight: '500',
    },
    searchInputSeparator: {
        height: 1,
        backgroundColor: colors.border,
        marginHorizontal: 12,
    },
    searchButton: {
        backgroundColor: colors.primary,
        borderRadius: 8,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        margin: 4,
    },
    searchButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
    heroSection: {
        alignItems: 'center',
        marginVertical: 32,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 20,
    },
    getStartedButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 30,
    },
    getStartedButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    viewAllText: {
        fontSize: 14,
        color: colors.gold,
        fontWeight: '600',
    },
    seeAllText: {
        color: colors.gold,
        fontSize: 14,
        fontWeight: '600',
    },
    horizontalScroll: {
        paddingLeft: 20,
        paddingBottom: 8,
    },
    emptySuggestions: {
        width: 200,
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 16,
        marginRight: 16,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    emptySuggestionsText: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 10,
    },
    suggestedCard: {
        width: 140,
        height: 180,
        backgroundColor: colors.surface,
        borderRadius: 16,
        marginRight: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    suggestedImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    suggestedOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    suggestedName: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '600',
    },
    suggestedJob: {
        color: colors.gold,
        fontSize: 12,
    },
    matchBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: colors.gold,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    matchText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.background,
    },
    // News Card Styles
    newsCard: {
        width: 280,
        backgroundColor: colors.surface,
        borderRadius: 20,
        marginRight: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    newsImage: {
        width: '100%',
        height: 140,
    },
    newsContent: {
        padding: 16,
    },
    newsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    categoryBadge: {
        backgroundColor: colors.gold + '20',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    categoryText: {
        color: colors.gold,
        fontSize: 10,
        fontWeight: '800',
    },
    newsDate: {
        color: colors.textSecondary,
        fontSize: 11,
    },
    newsTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 22,
        marginBottom: 12,
        height: 44, // Fixed height for 2 lines
    },
    newsFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    newsSource: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '500',
    },
    // Shortcuts Styles
    shortcutsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    shortcutItem: {
        alignItems: 'center',
        width: '23%',
    },
    shortcutIcon: {
        width: 50,
        height: 50,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    shortcutLabel: {
        color: colors.textSecondary,
        fontSize: 10,
        fontWeight: '600',
        textAlign: 'center',
    },
    trendingPostCard: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    trendingPostHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    trendingAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 10,
    },
    trendingAuthorName: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '600',
    },
    trendingPostMeta: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    typeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    typeTagText: {
        fontSize: 10,
        fontWeight: '700',
        marginLeft: 4,
    },
    trendingPostTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 22,
        marginBottom: 12,
    },
    trendingPostFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 12,
    },
    engagementRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    engagementText: {
        color: colors.gold,
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 6,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 40,
    },
    emptyText: {
        color: colors.textSecondary,
        marginTop: 12,
        fontSize: 14,
    },
});
