import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    SafeAreaView,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Feather } from '../components/Icons';
import { theme } from '../theme';
import { newsService } from '../services/news';
import { NewsItem } from '../types';
import * as Haptics from 'expo-haptics';

const { colors } = theme;

const NewsFeedScreen = ({ navigation }: any) => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const categories = [
        { id: 'all', label: 'All News', icon: 'grid' },
        { id: 'industry', label: 'Industry', icon: 'briefcase' },
        { id: 'job_market', label: 'Job Market', icon: 'users' },
        { id: 'economy', label: 'Economy', icon: 'trending-up' },
    ];

    const loadNews = useCallback(async () => {
        try {
            setLoading(true);
            const data = await newsService.getLatestNews(20);
            setNews(data);
        } catch (error) {
            console.error('[NewsFeedScreen] Error loading news:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadNews();
    }, [loadNews]);

    const onRefresh = () => {
        setRefreshing(true);
        loadNews();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const filteredNews = selectedCategory === 'all'
        ? news
        : news.filter(item => item.category === selectedCategory);

    const renderNewsItem = ({ item }: { item: NewsItem }) => {
        const date = new Date(item.published_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        return (
            <TouchableOpacity
                style={styles.newsCard}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                activeOpacity={0.7}
            >
                {item.image_url && (
                    <Image source={{ uri: item.image_url }} style={styles.newsImage} />
                )}
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.badge, { backgroundColor: colors.accent + '20' }]}>
                            <Text style={[styles.badgeText, { color: colors.accent }]}>
                                {item.category.replace('_', ' ').toUpperCase()}
                            </Text>
                        </View>
                        <Text style={styles.dateText}>{date}</Text>
                    </View>
                    <Text style={styles.titleText}>{item.title}</Text>
                    <Text style={styles.summaryText} numberOfLines={3}>{item.content}</Text>
                    <View style={styles.cardFooter}>
                        <Text style={styles.sourceText}>{item.source}</Text>
                        <TouchableOpacity style={styles.readMoreBtn}>
                            <Text style={styles.readMoreText}>Read More</Text>
                            <Feather name="arrow-right" size={14} color={colors.accent} />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.categoryScroll}>
                <FlatList
                    horizontal
                    data={categories}
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.categoryItem,
                                selectedCategory === item.id && styles.categoryItemActive
                            ]}
                            onPress={() => {
                                setSelectedCategory(item.id);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                        >
                            <Feather
                                name={item.icon as any}
                                size={14}
                                color={selectedCategory === item.id ? colors.background : colors.textSecondary}
                            />
                            <Text style={[
                                styles.categoryLabel,
                                selectedCategory === item.id && styles.categoryLabelActive
                            ]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.categoryList}
                />
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={filteredNews}
                keyExtractor={(item) => item.id}
                renderItem={renderNewsItem}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.accent}
                    />
                }
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <Feather name="info" size={48} color={colors.textSecondary} />
                            <Text style={styles.emptyText}>No news found in this category</Text>
                        </View>
                    ) : (
                        <View style={styles.loaderContainer}>
                            <ActivityIndicator size="large" color={colors.accent} />
                        </View>
                    )
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingVertical: 12,
    },
    categoryScroll: {
        marginBottom: 8,
    },
    categoryList: {
        paddingHorizontal: 20,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.surface,
        marginRight: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    categoryItemActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    categoryLabel: {
        marginLeft: 6,
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    categoryLabelActive: {
        color: colors.background,
    },
    listContent: {
        paddingBottom: 30,
    },
    newsCard: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        marginHorizontal: 20,
        marginBottom: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    newsImage: {
        width: '100%',
        height: 200,
    },
    cardContent: {
        padding: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    dateText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    titleText: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        lineHeight: 28,
        marginBottom: 12,
    },
    summaryText: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 22,
        marginBottom: 20,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    sourceText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    readMoreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    readMoreText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.accent,
        marginRight: 4,
    },
    emptyContainer: {
        marginTop: 100,
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 16,
        color: colors.textSecondary,
        fontSize: 16,
    },
    loaderContainer: {
        marginTop: 100,
    },
});

export default NewsFeedScreen;
