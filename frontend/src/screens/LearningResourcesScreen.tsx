// ============================================
// LEARNING RESOURCES SCREEN
// Displays courses from Coursera, YouTube, LinkedIn Learning, etc.
// with affiliate tracking for earning commissions
// ============================================

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    TextInput,
    ActivityIndicator,
    Linking,
    Alert,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import {
    Course,
    CourseCategory,
    CourseLevel,
    CoursePlatform,
    filterCourses,
    getCourseUrl,
    trackCourseClick,
    PLATFORMS
} from '../services/learningService';

const { width } = Dimensions.get('window');

interface Props {
    navigation: any;
    route: any;
}

// Category colors
const CATEGORY_COLORS: Record<CourseCategory, string> = {
    technology: '#2563eb',
    business: '#059669',
    design: '#db2777',
    marketing: '#7c3aed',
    data_science: '#0891b2',
    development: '#ea580c',
    languages: '#16a34a',
    soft_skills: '#6366f1',
    entrepreneurship: '#dc2626',
    finance: '#ca8a04'
};

const LearningResourcesScreen: React.FC<Props> = ({ navigation }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<CourseCategory | 'all'>('all');
    const [selectedPlatform, setSelectedPlatform] = useState<CoursePlatform | 'all'>('all');
    const [showFreeOnly, setShowFreeOnly] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        loadCourses();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [searchQuery, selectedCategory, selectedPlatform, showFreeOnly, courses]);

    const loadCourses = () => {
        setLoading(true);
        // Simulate loading - in real app, fetch from API
        setTimeout(() => {
            const { filterCourses: fc } = require('../services/learningService');
            const allCourses = fc({});
            setCourses(allCourses);
            setFilteredCourses(allCourses);
            setLoading(false);
        }, 500);
    };

    const applyFilters = () => {
        const { filterCourses: fc } = require('../services/learningService');
        const filtered = fc({
            category: selectedCategory === 'all' ? undefined : selectedCategory,
            platform: selectedPlatform === 'all' ? undefined : selectedPlatform,
            isFree: showFreeOnly ? true : undefined,
            searchQuery: searchQuery || undefined
        });
        setFilteredCourses(filtered);
    };

    const handleCoursePress = async (course: Course) => {
        // Get current user from auth context
        const userId = 'current-user-id'; // TODO: Get from auth context

        // Track click for analytics
        await trackCourseClick(userId, course.id, course.platform);

        // Show options
        Alert.alert(
            'Open Course',
            `"${course.title}" from ${PLATFORMS[course.platform].name}`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Open & Save to My Courses',
                    onPress: () => {
                        openCourse(course);
                        // Save to enrolled courses
                        // TODO: Implement enrollment
                    }
                },
                {
                    text: 'Open Now',
                    onPress: () => openCourse(course)
                }
            ]
        );
    };

    const openCourse = async (course: Course) => {
        const url = getCourseUrl(course);
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert('Error', 'Cannot open this course link');
            }
        } catch (error) {
            console.error('Error opening URL:', error);
        }
    };

    const categories: (CourseCategory | 'all')[] = [
        'all',
        'technology',
        'development',
        'data_science',
        'business',
        'entrepreneurship',
        'design',
        'marketing',
        'soft_skills',
        'languages',
        'finance'
    ];

    const platforms: (CoursePlatform | 'all')[] = [
        'all',
        'coursera',
        'youtube',
        'linkedin',
        'edx',
        'udemy',
        'skillshare',
        'khan_academy'
    ];

    const renderCourseCard = (course: Course) => {
        const platform = PLATFORMS[course.platform];
        const categoryColor = CATEGORY_COLORS[course.category];

        return (
            <TouchableOpacity
                key={course.id}
                style={styles.courseCard}
                onPress={() => handleCoursePress(course)}
                activeOpacity={0.9}
            >
                {/* Thumbnail */}
                <Image
                    source={{ uri: course.thumbnail }}
                    style={styles.courseThumbnail}
                    defaultSource={require('../assets/adaptive-icon.png')}
                />

                {/* Platform Badge */}
                <View style={[styles.platformBadge, { backgroundColor: platform.color }]}>
                    <Feather name={platform.icon as any} size={12} color="white" />
                    <Text style={styles.platformBadgeText}>{platform.name}</Text>
                </View>

                {/* Free Badge */}
                {course.isFree && (
                    <View style={styles.freeBadge}>
                        <Text style={styles.freeBadgeText}>FREE</Text>
                    </View>
                )}

                {/* Content */}
                <View style={styles.courseContent}>
                    <Text style={styles.courseTitle} numberOfLines={2}>
                        {course.title}
                    </Text>

                    <Text style={styles.courseDescription} numberOfLines={2}>
                        {course.description}
                    </Text>

                    {/* Tags */}
                    <View style={styles.tagsContainer}>
                        {course.tags.slice(0, 3).map((tag, index) => (
                            <View key={index} style={[styles.tag, { borderColor: categoryColor }]}>
                                <Text style={[styles.tagText, { color: categoryColor }]}>
                                    {tag}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Footer */}
                    <View style={styles.courseFooter}>
                        <View style={styles.courseMeta}>
                            <Feather name="clock" size={14} color="#666" />
                            <Text style={styles.courseMetaText}>{course.duration}</Text>
                        </View>

                        {course.rating && (
                            <View style={styles.courseMeta}>
                                <Ionicons name="star" size={14} color="#fbbf24" />
                                <Text style={styles.courseMetaText}>{course.rating}</Text>
                            </View>
                        )}

                        <View style={styles.instructorContainer}>
                            <Feather name="user" size={14} color="#666" />
                            <Text style={styles.instructorText} numberOfLines={1}>
                                {course.instructor}
                            </Text>
                        </View>
                    </View>

                    {/* Affiliate Indicator */}
                    {course.affiliateCommission && (
                        <View style={styles.affiliateTag}>
                            <Feather name="trending-up" size={10} color="#059669" />
                            <Text style={styles.affiliateText}>
                                Partner course
                            </Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderCategoryChip = (category: CourseCategory | 'all') => {
        const isSelected = selectedCategory === category;
        const color = category === 'all' ? '#666' : CATEGORY_COLORS[category];

        return (
            <TouchableOpacity
                key={category}
                style={[
                    styles.categoryChip,
                    isSelected && { backgroundColor: color }
                ]}
                onPress={() => setSelectedCategory(category)}
            >
                <Text style={[
                    styles.categoryChipText,
                    isSelected && { color: 'white' }
                ]}>
                    {category === 'all' ? 'All' : category.replace('_', ' ')}
                </Text>
            </TouchableOpacity>
        );
    };

    const renderPlatformChip = (platform: CoursePlatform | 'all') => {
        const isSelected = selectedPlatform === platform;
        const platformInfo = platform !== 'all' ? PLATFORMS[platform] : null;

        return (
            <TouchableOpacity
                key={platform}
                style={[
                    styles.platformChip,
                    isSelected && { backgroundColor: platformInfo?.color || '#666' }
                ]}
                onPress={() => setSelectedPlatform(platform)}
            >
                {platformInfo && (
                    <Feather
                        name={platformInfo.icon as any}
                        size={14}
                        color={isSelected ? 'white' : platformInfo.color}
                    />
                )}
                <Text style={[
                    styles.platformChipText,
                    isSelected && { color: 'white' }
                ]}>
                    {platform === 'all' ? 'All' : platformInfo?.name}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Feather name="arrow-left" size={24} color="#1a1a1a" />
                </TouchableOpacity>

                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Learning Resources</Text>
                    <Text style={styles.headerSubtitle}>
                        {filteredCourses.length} courses available
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setShowFilters(!showFilters)}
                >
                    <Feather name="sliders" size={24} color="#1a1a1a" />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Feather name="search" size={20} color="#999" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search courses..."
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Feather name="x" size={20} color="#999" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Filters Panel */}
            {showFilters && (
                <View style={styles.filtersPanel}>
                    {/* Free Filter */}
                    <TouchableOpacity
                        style={styles.freeFilterToggle}
                        onPress={() => setShowFreeOnly(!showFreeOnly)}
                    >
                        <View style={[
                            styles.toggleDot,
                            showFreeOnly && { backgroundColor: '#059669' }
                        ]} />
                        <Text style={styles.freeFilterText}>
                            Free courses only
                        </Text>
                    </TouchableOpacity>

                    {/* Platform Filter */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.platformsScroll}
                    >
                        {platforms.map(renderPlatformChip)}
                    </ScrollView>
                </View>
            )}

            {/* Categories */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoriesScroll}
                contentContainerStyle={styles.categoriesContent}
            >
                {categories.map(renderCategoryChip)}
            </ScrollView>

            {/* Courses List */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={styles.loadingText}>Loading courses...</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.coursesScroll}
                    contentContainerStyle={styles.coursesContent}
                    showsVerticalScrollIndicator={false}
                >
                    {filteredCourses.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Feather name="book-open" size={48} color="#ccc" />
                            <Text style={styles.emptyStateTitle}>No courses found</Text>
                            <Text style={styles.emptyStateText}>
                                Try adjusting your filters
                            </Text>
                        </View>
                    ) : (
                        filteredCourses.map(renderCourseCard)
                    )}
                </ScrollView>
            )}

            {/* Affiliate Info Banner */}
            <View style={styles.affiliateBanner}>
                <Feather name="info" size={14} color="#059669" />
                <Text style={styles.affiliateBannerText}>
                    We may earn a commission when you enroll in partner courses
                </Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e5e5'
    },
    backButton: {
        padding: 8,
        marginRight: 8
    },
    headerContent: {
        flex: 1
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a'
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#666',
        marginTop: 2
    },
    filterButton: {
        padding: 8
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 16,
        paddingHorizontal: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e5e5'
    },
    searchInput: {
        flex: 1,
        padding: 12,
        marginLeft: 8,
        fontSize: 16
    },
    filtersPanel: {
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e5e5'
    },
    freeFilterToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12
    },
    toggleDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#e5e5e5',
        marginRight: 8
    },
    freeFilterText: {
        fontSize: 14,
        color: '#333'
    },
    platformsScroll: {
        maxHeight: 50
    },
    platformChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0'
    },
    platformChipText: {
        marginLeft: 4,
        fontSize: 12,
        color: '#666'
    },
    categoriesScroll: {
        maxHeight: 50
    },
    categoriesContent: {
        paddingHorizontal: 16
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        borderRadius: 20,
        backgroundColor: '#e0e0e0'
    },
    categoryChipText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        marginTop: 12,
        color: '#666'
    },
    coursesScroll: {
        flex: 1
    },
    coursesContent: {
        padding: 16
    },
    courseCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    courseThumbnail: {
        width: '100%',
        height: 160,
        backgroundColor: '#f0f0f0'
    },
    platformBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4
    },
    platformBadgeText: {
        fontSize: 11,
        color: 'white',
        fontWeight: '600'
    },
    freeBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: '#059669',
        borderRadius: 8
    },
    freeBadgeText: {
        fontSize: 11,
        color: 'white',
        fontWeight: 'bold'
    },
    courseContent: {
        padding: 16
    },
    courseTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 8
    },
    courseDescription: {
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
        marginBottom: 12
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 12
    },
    tag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        marginRight: 6,
        marginBottom: 6
    },
    tagText: {
        fontSize: 11,
        fontWeight: '500'
    },
    courseFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0'
    },
    courseMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16
    },
    courseMetaText: {
        marginLeft: 4,
        fontSize: 12,
        color: '#666'
    },
    instructorContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 'auto'
    },
    instructorText: {
        marginLeft: 4,
        fontSize: 12,
        color: '#666',
        flex: 1
    },
    affiliateTag: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(5, 150, 105, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        gap: 3
    },
    affiliateText: {
        fontSize: 10,
        color: '#059669',
        fontWeight: '600'
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16
    },
    emptyStateText: {
        fontSize: 14,
        color: '#999',
        marginTop: 8
    },
    affiliateBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: 'rgba(5, 150, 105, 0.1)',
        margin: 16,
        borderRadius: 8,
        gap: 8
    },
    affiliateBannerText: {
        flex: 1,
        fontSize: 12,
        color: '#059669'
    }
});

export default LearningResourcesScreen;
