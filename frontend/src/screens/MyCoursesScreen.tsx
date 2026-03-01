// ============================================
// MY COURSES SCREEN
// Shows user's enrolled/saved courses with progress tracking
// ============================================

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Linking,
    Alert,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Course,
    getUserEnrollments,
    getCourseUrl
} from '../services/learningService';
import { PLATFORMS } from '../services/learningService';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

interface Props {
    navigation: any;
    route: any;
}

interface UserCourse extends Course {
    enrolled_at: string;
    progress_percentage: number;
    last_accessed_at?: string;
}

const MyCoursesScreen: React.FC<Props> = ({ navigation }) => {
    const { user } = useAuth();
    const [enrolledCourses, setEnrolledCourses] = useState<UserCourse[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState<'all' | 'in-progress' | 'completed'>('all');

    useEffect(() => {
        loadEnrollments();
    }, [user]);

    const loadEnrollments = async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('user_courses')
                .select(`
                    *,
                    courses (
                        id,
                        title,
                        description,
                        thumbnail,
                        platform,
                        category,
                        level,
                        duration,
                        rating,
                        instructor,
                        isFree,
                        originalUrl,
                        tags,
                        createdAt
                    )
                `)
                .eq('user_id', user.id)
                .order('enrolled_at', { ascending: false });

            if (error) throw error;
            setEnrolledCourses(data?.map((item: any) => ({
                ...item.courses,
                enrolled_at: item.enrolled_at,
                progress_percentage: item.progress_percentage || 0,
                last_accessed_at: item.last_accessed_at
            })) || []);
        } catch (error) {
            console.error('Error loading enrollments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCoursePress = (course: UserCourse) => {
        Alert.alert(
            'Continue Learning',
            `${course.title}\n\nProgress: ${course.progress_percentage}%`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove from My Courses',
                    style: 'destructive',
                    onPress: () => removeCourse(course.id)
                },
                {
                    text: 'Continue',
                    onPress: () => openCourse(course)
                }
            ]
        );
    };

    const openCourse = async (course: UserCourse) => {
        const url = course.originalUrl;
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
                // Update last accessed
                await supabase
                    .from('user_courses')
                    .update({ last_accessed_at: new Date().toISOString() })
                    .eq('user_id', user?.id)
                    .eq('course_id', course.id);
            }
        } catch (error) {
            console.error('Error opening URL:', error);
        }
    };

    const removeCourse = async (courseId: string) => {
        try {
            await supabase
                .from('user_courses')
                .delete()
                .eq('user_id', user?.id)
                .eq('course_id', courseId);
            setEnrolledCourses(prev => prev.filter(c => c.id !== courseId));
        } catch (error) {
            console.error('Error removing course:', error);
        }
    };

    const getFilteredCourses = () => {
        switch (selectedTab) {
            case 'in-progress':
                return enrolledCourses.filter(c => c.progress_percentage > 0 && c.progress_percentage < 100);
            case 'completed':
                return enrolledCourses.filter(c => c.progress_percentage === 100);
            default:
                return enrolledCourses;
        }
    };

    const renderCourseCard = (course: UserCourse) => {
        const platform = PLATFORMS[course.platform];
        const isCompleted = course.progress_percentage === 100;

        return (
            <TouchableOpacity
                key={course.id}
                style={styles.courseCard}
                onPress={() => handleCoursePress(course)}
                activeOpacity={0.9}
            >
                <Image
                    source={{ uri: course.thumbnail }}
                    style={styles.courseThumbnail}
                    defaultSource={require('../assets/adaptive-icon.png')}
                />

                {/* Progress Overlay */}
                <View style={styles.progressOverlay}>
                    <View style={[
                        styles.progressBar,
                        { width: `${course.progress_percentage}%` }
                    ]} />
                </View>

                {/* Platform Badge */}
                <View style={[styles.platformBadge, { backgroundColor: platform.color }]}>
                    <Feather name={platform.icon as any} size={12} color="white" />
                    <Text style={styles.platformBadgeText}>{platform.name}</Text>
                </View>

                {/* Completed Badge */}
                {isCompleted && (
                    <View style={styles.completedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#059669" />
                        <Text style={styles.completedBadgeText}>Completed</Text>
                    </View>
                )}

                <View style={styles.courseContent}>
                    <Text style={styles.courseTitle} numberOfLines={2}>
                        {course.title}
                    </Text>

                    <Text style={styles.instructor}>
                        {course.instructor} • {course.duration}
                    </Text>

                    {/* Progress Stats */}
                    <View style={styles.progressStats}>
                        <Feather name="calendar" size={14} color="#666" />
                        <Text style={styles.progressStatText}>
                            Enrolled {new Date(course.enrolled_at).toLocaleDateString()}
                        </Text>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressTrack}>
                        <View style={[
                            styles.progressFill,
                            { width: `${course.progress_percentage}%`,
                              backgroundColor: isCompleted ? '#059669' : '#2563eb' }
                        ]} />
                    </View>
                    <Text style={styles.progressPercent}>
                        {course.progress_percentage}% complete
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderTab = (key: typeof selectedTab, label: string, count: number) => {
        const isActive = selectedTab === key;
        return (
            <TouchableOpacity
                key={key}
                style={[styles.tab, isActive && styles.activeTab]}
                onPress={() => setSelectedTab(key)}
            >
                <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                    {label} {count > 0 && `(${count})`}
                </Text>
            </TouchableOpacity>
        );
    };

    const inProgressCount = enrolledCourses.filter(c => c.progress_percentage > 0 && c.progress_percentage < 100).length;
    const completedCount = enrolledCourses.filter(c => c.progress_percentage === 100).length;

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
                    <Text style={styles.headerTitle}>My Courses</Text>
                    <Text style={styles.headerSubtitle}>
                        {enrolledCourses.length} courses enrolled
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.browseButton}
                    onPress={() => navigation.navigate('LearningResources')}
                >
                    <Feather name="plus" size={24} color="#2563eb" />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                {renderTab('all', 'All', enrolledCourses.length)}
                {renderTab('in-progress', 'In Progress', inProgressCount)}
                {renderTab('completed', 'Completed', completedCount)}
            </View>

            {/* Courses */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={styles.loadingText}>Loading your courses...</Text>
                </View>
            ) : enrolledCourses.length === 0 ? (
                <View style={styles.emptyState}>
                    <Feather name="book-open" size={64} color="#ccc" />
                    <Text style={styles.emptyTitle}>No courses yet</Text>
                    <Text style={styles.emptyText}>
                        Start learning by browsing our course catalog
                    </Text>
                    <TouchableOpacity
                        style={styles.browseButtonPrimary}
                        onPress={() => navigation.navigate('LearningResources')}
                    >
                        <Feather name="compass" size={18} color="white" style={{ marginRight: 8 }} />
                        <Text style={styles.browseButtonText}>Browse Courses</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    style={styles.coursesScroll}
                    contentContainerStyle={styles.coursesContent}
                    showsVerticalScrollIndicator={false}
                >
                    {getFilteredCourses().map(renderCourseCard)}
                </ScrollView>
            )}
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
    browseButton: {
        padding: 8
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e5e5'
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0'
    },
    activeTab: {
        backgroundColor: '#2563eb'
    },
    tabText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500'
    },
    activeTabText: {
        color: 'white',
        fontWeight: '600'
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
        height: 140,
        backgroundColor: '#f0f0f0'
    },
    progressOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: 'rgba(0,0,0,0.2)'
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#2563eb'
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
    completedBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(5, 150, 105, 0.9)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4
    },
    completedBadgeText: {
        fontSize: 11,
        color: 'white',
        fontWeight: '600'
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
    instructor: {
        fontSize: 13,
        color: '#666',
        marginBottom: 12
    },
    progressStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8
    },
    progressStatText: {
        marginLeft: 6,
        fontSize: 12,
        color: '#666'
    },
    progressTrack: {
        height: 6,
        backgroundColor: '#e5e5e5',
        borderRadius: 3,
        overflow: 'hidden'
    },
    progressFill: {
        height: '100%',
        borderRadius: 3
    },
    progressPercent: {
        fontSize: 11,
        color: '#666',
        marginTop: 6,
        textAlign: 'right'
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 20
    },
    emptyText: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
        textAlign: 'center',
        marginBottom: 24
    },
    browseButtonPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2563eb',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24
    },
    browseButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600'
    }
});

export default MyCoursesScreen;
