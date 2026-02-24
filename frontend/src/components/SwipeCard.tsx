import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from './Icons';
import { MatchScore } from '../types';
import { getMatchLabel } from '../utils/matchingAlgorithm';

const { width, height } = Dimensions.get('window');

// Theme colors matching the onboarding
const colors = {
    background: '#05050a',
    surface: '#0a0a14',
    card: '#12121c',
    border: '#1a1a2e',
    gold: '#f1d38b',
    goldDark: '#c9a962',
    text: '#ffffff',
    textSecondary: '#8b8b9e',
    success: '#4ade80',
};

interface CardProps {
    user: {
        id: string;
        name: string;
        age?: number;
        bio?: string;
        jobTitle?: string;
        company?: string;
        companyName?: string;
        location: string;
        distance?: number;
        images: string[];
        skills?: string[];
        interests?: string[];
        verified?: boolean;
        activeStatus?: 'online' | 'recently_active' | 'offline';
        expectedSalary?: number;
        experienceYears?: number;
        matchScore?: MatchScore;
        role?: 'worker' | 'business';
        isProfileComplete?: boolean;
    };
}

export default function SwipeCard({ user }: CardProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showFullBio, setShowFullBio] = useState(false);

    // Safe image access - ensure we always have at least a placeholder
    const hasImages = user.images && user.images.length > 0;
    const images = hasImages
        ? user.images
        : [`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=1E3A5F&color=fff&size=400`];

    const safeImageIndex = Math.min(currentImageIndex, images.length - 1);
    const currentImage = images[safeImageIndex] || images[0];

    const handleImagePress = (side: 'left' | 'right') => {
        if (side === 'left' && currentImageIndex > 0) {
            setCurrentImageIndex(prev => prev - 1);
        } else if (side === 'right' && currentImageIndex < images.length - 1) {
            setCurrentImageIndex(prev => prev + 1);
        }
    };

    const bio = user.bio || '';
    const truncatedBio = bio.length > 80 ? bio.substring(0, 80) + '...' : bio;
    const skills = user.skills || [];
    const company = user.company || user.companyName;

    return (
        <View style={styles.card}>
            {/* Main Image */}
            {hasImages ? (
                <Image source={{ uri: currentImage }} style={styles.image} />
            ) : (
                <View style={styles.placeholderContainer}>
                    <Feather name="image" size={80} color="rgba(255,255,255,0.2)" />
                    <Text style={styles.placeholderText}>New Profile - No Photos Yet</Text>
                </View>
            )}

            {/* Image Navigation Areas */}
            <View style={styles.imageNavigation}>
                <TouchableOpacity
                    style={styles.imageNavLeft}
                    onPress={() => handleImagePress('left')}
                    activeOpacity={0.7}
                />
                <TouchableOpacity
                    style={styles.imageNavRight}
                    onPress={() => handleImagePress('right')}
                    activeOpacity={0.7}
                />
            </View>

            {/* Image Indicators */}
            <View style={styles.imageIndicators}>
                {images.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.indicator,
                            index === currentImageIndex ? styles.indicatorActive : styles.indicatorInactive,
                        ]}
                    />
                ))}
            </View>

            {/* Role Badge - Shows Worker or Business clearly */}
            {user.role && (
                <View style={[
                    styles.roleBadge,
                    user.role === 'business' ? styles.roleBadgeBusiness : styles.roleBadgeWorker
                ]}>
                    <Feather
                        name={user.role === 'business' ? 'briefcase' : 'user'}
                        size={12}
                        color={user.role === 'business' ? '#3B82F6' : '#10B981'}
                    />
                    <Text style={[
                        styles.roleBadgeText,
                        user.role === 'business' ? styles.roleBadgeTextBusiness : styles.roleBadgeTextWorker
                    ]}>
                        {user.role === 'business' ? 'Business' : 'Worker'}
                    </Text>
                </View>
            )}

            {/* Incomplete Profile Badge - Shows when profile is partial */}
            {user.isProfileComplete === false && (
                <View style={styles.incompleteProfileBadge}>
                    <Feather name="alert-circle" size={12} color="#F59E0B" />
                    <Text style={styles.incompleteProfileText}>New Profile</Text>
                </View>
            )}

            {/* Match Score Badge */}
            {user.matchScore && user.matchScore.overall > 0 && (
                <View style={styles.matchScoreBadge}>
                    <View style={[
                        styles.matchScoreCircle,
                        { borderColor: getMatchLabel(user.matchScore.overall).color }
                    ]}>
                        <Text style={styles.matchScoreEmoji}>
                            {getMatchLabel(user.matchScore.overall).emoji}
                        </Text>
                        <Text style={[
                            styles.matchScoreText,
                            { color: getMatchLabel(user.matchScore.overall).color }
                        ]}>
                            {user.matchScore.overall}%
                        </Text>
                    </View>
                    <Text style={styles.matchLabel}>
                        {getMatchLabel(user.matchScore.overall).label}
                    </Text>
                </View>
            )}

            {/* Gradient Overlay */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
                style={styles.gradient}
                locations={[0, 0.5, 1]}
            >
                <View style={styles.content}>
                    {/* Activity Status Badge */}
                    {user.activeStatus === 'online' && (
                        <View style={styles.onlineBadge}>
                            <View style={styles.onlineDot} />
                            <Text style={styles.onlineText}>Online</Text>
                        </View>
                    )}

                    {/* Name and Age with Verification */}
                    <View style={styles.nameContainer}>
                        <Text style={styles.name}>
                            {user.name}{user.age ? `, ${user.age}` : ''}
                        </Text>
                        {user.verified && (
                            <MaterialCommunityIcons
                                name="check-decagram"
                                size={24}
                                color={colors.gold}
                                style={styles.verifiedBadge}
                            />
                        )}
                    </View>

                    {/* Job Title */}
                    <Text style={styles.job}>{user.jobTitle}</Text>

                    {/* Experience and Salary (for workers) */}
                    {(user.experienceYears || user.expectedSalary) && (
                        <View style={styles.infoRow}>
                            {user.experienceYears && (
                                <>
                                    <Feather name="award" size={14} color="rgba(255,255,255,0.8)" style={styles.icon} />
                                    <Text style={styles.infoText}>{user.experienceYears} yrs exp</Text>
                                </>
                            )}
                            {user.expectedSalary && (
                                <>
                                    <Text style={styles.infoText}> • </Text>
                                    <Text style={styles.salaryText}>NPR {user.expectedSalary.toLocaleString()}/mo</Text>
                                </>
                            )}
                        </View>
                    )}

                    {/* Company (for businesses) */}
                    {company && (
                        <View style={styles.infoRow}>
                            <Feather name="briefcase" size={14} color="rgba(255,255,255,0.8)" style={styles.icon} />
                            <Text style={styles.infoText}>{company}</Text>
                        </View>
                    )}

                    <View style={styles.infoRow}>
                        <Feather name="map-pin" size={14} color="rgba(255,255,255,0.8)" style={styles.icon} />
                        <Text style={styles.infoText}>
                            {user.location}
                            {user.distance && ` • ${user.distance} km away`}
                        </Text>
                    </View>

                    {/* Bio Section */}
                    <View style={styles.bioSection}>
                        <Text style={styles.bioText}>
                            {showFullBio ? bio : truncatedBio}
                        </Text>
                        {bio.length > 80 && (
                            <TouchableOpacity onPress={() => setShowFullBio(!showFullBio)}>
                                <Text style={styles.readMore}>
                                    {showFullBio ? 'Show less' : 'Read more'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Skills */}
                    <View style={styles.skillsContainer}>
                        {skills.slice(0, 3).map((skill, index) => (
                            <View key={index} style={styles.skillTag}>
                                <Text style={styles.skillText}>{skill}</Text>
                            </View>
                        ))}
                        {skills.length > 3 && (
                            <View style={styles.skillTag}>
                                <Text style={styles.skillText}>+{skills.length - 3}</Text>
                            </View>
                        )}
                    </View>

                    {/* Interests */}
                    {user.interests && user.interests.length > 0 && (
                        <View style={styles.interestsContainer}>
                            <Text style={styles.interestsTitle}>Interests</Text>
                            <View style={styles.interestsRow}>
                                {user.interests.slice(0, 3).map((interest, index) => (
                                    <View key={index} style={styles.interestTag}>
                                        <Text style={styles.interestText}>{interest}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: width * 0.92,
        height: height * 0.68, // Slightly taller
        borderRadius: 24,
        backgroundColor: colors.card,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 12,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)', // Subtle border
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    placeholderContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a2e',
    },
    placeholderText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 20,
    },
    imageNavigation: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
    },
    imageNavLeft: {
        flex: 1,
    },
    imageNavRight: {
        flex: 1,
    },
    imageIndicators: {
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        flexDirection: 'row',
        gap: 6,
        zIndex: 5,
    },
    indicator: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(0,0,0,0.3)', // Darker background for contrast
    },
    indicatorActive: {
        backgroundColor: '#fff', // White active
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
    },
    indicatorInactive: {
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    roleBadge: {
        position: 'absolute',
        top: 32,
        left: 16,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        zIndex: 10,
        gap: 6,
        // Glassmorphism
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    roleBadgeWorker: {
        // borderColor: '#10B981', // Optional colored border
    },
    roleBadgeBusiness: {
        // borderColor: '#3B82F6',
    },
    roleBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: '#fff',
    },
    roleBadgeTextWorker: {
        // color: '#10B981',
    },
    roleBadgeTextBusiness: {
        // color: '#3B82F6',
    },
    incompleteProfileBadge: {
        position: 'absolute',
        top: 32,
        left: 16,
        marginTop: 36,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.5)',
        gap: 5,
        zIndex: 10,
    },
    incompleteProfileText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#F59E0B',
        letterSpacing: 0.3,
    },
    matchScoreBadge: {
        position: 'absolute',
        top: 32,
        right: 16,
        alignItems: 'center',
        zIndex: 10,
    },
    matchScoreCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(10, 10, 20, 0.85)',
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    matchScoreEmoji: {
        fontSize: 18,
        marginBottom: -4,
    },
    matchScoreText: {
        fontSize: 16,
        fontWeight: '800',
        fontFamily: 'System', // Clean bold font
    },
    matchLabel: {
        marginTop: 6,
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 10,
        overflow: 'hidden',
        letterSpacing: 0.5,
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 160, // Taller gradient
    },
    content: {
        padding: 24,
        paddingBottom: 32,
    },
    onlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(46, 204, 113, 0.25)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(46, 204, 113, 0.6)',
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#2ecc71',
        marginRight: 6,
        shadowColor: '#2ecc71',
        shadowOpacity: 0.6,
        shadowRadius: 4,
    },
    onlineText: {
        color: '#2ecc71',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 8,
    },
    name: {
        fontSize: 34,
        fontWeight: '800',
        color: '#fff',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
        letterSpacing: -0.5,
    },
    verifiedBadge: {
        // Handled by icon
    },
    job: {
        fontSize: 18,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 10,
        letterSpacing: 0.2,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    icon: {
        marginRight: 8,
    },
    infoText: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 14,
        fontWeight: '500',
    },
    salaryText: {
        color: colors.gold,
        fontSize: 14,
        fontWeight: '700',
    },
    bioSection: {
        marginTop: 16,
        marginBottom: 12,
        backgroundColor: 'rgba(255,255,255,0.05)', // Subtle backdrop for bio
        padding: 12,
        borderRadius: 12,
    },
    bioText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 15,
        lineHeight: 22,
    },
    readMore: {
        color: colors.gold,
        fontSize: 14,
        fontWeight: '700',
        marginTop: 6,
    },
    skillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
        gap: 8,
    },
    skillTag: {
        backgroundColor: 'rgba(241, 211, 139, 0.15)', // Gold tint
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(241, 211, 139, 0.4)',
    },
    skillText: {
        color: colors.gold,
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    interestsContainer: {
        marginTop: 16,
    },
    interestsTitle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 8,
    },
    interestsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    interestTag: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    interestText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 12,
        fontWeight: '500',
    },
});
