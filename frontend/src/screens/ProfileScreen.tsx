import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    Modal,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';
import { supabase } from '../lib/supabase';
import { reviewService, streakService, jobPostService, profileService, storageService, JobPost } from '../services/database';
import { badgeService } from '../services/badgeService';
import StarRating from '../components/StarRating';
import ReviewCard from '../components/ReviewCard';
import { BadgeCard } from '../components/BadgeCard';
import { Review, UserBadge } from '../types';

export default function ProfileScreen({ navigation, route }: { navigation: any, route?: any }) {
    const { user, profile: authProfile, selectedRole, updateProfile } = useAuth();
    const [viewProfile, setViewProfile] = useState<any>(null);
    const [viewRole, setViewRole] = useState<any>(null);

    const viewUserId = route?.params?.userId;
    const isOwnProfile = !viewUserId || viewUserId === user?.id;

    const profile = isOwnProfile ? authProfile : viewProfile;
    const [isEditing, setIsEditing] = useState(false);
    const [editedProfile, setEditedProfile] = useState<Record<string, any> | null>(null);
    const [showSkillModal, setShowSkillModal] = useState(false);
    const [newSkill, setNewSkill] = useState('');
    const [reviews, setReviews] = useState<Review[]>([]);
    const [averageRating, setAverageRating] = useState(0);
    const [reviewCount, setReviewCount] = useState(0);
    const [loadingReviews, setLoadingReviews] = useState(true);
    const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
    const [loadingBadges, setLoadingBadges] = useState(true);
    const [currentStreak, setCurrentStreak] = useState(0);
    const [myJobPosts, setMyJobPosts] = useState<JobPost[]>([]);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    // Sync editedProfile when profile loads/changes
    useEffect(() => {
        if (profile) {
            setEditedProfile(profile);
        }
    }, [profile]);

    useEffect(() => {
        if (user?.id) {
            fetchReviews();
            fetchBadges();
            fetchStreak();
            if (!isWorker) fetchMyJobPosts();

            // Check for profile badges
            if (isOwnProfile && profile) {
                checkProfileBadge();
            }
        }
    }, [user?.id, selectedRole, profile?.id]); // Check when profile loads/updates

    const fetchReviews = async () => {
        if (!user?.id) return;

        try {
            const [reviewsData, ratingData] = await Promise.all([
                reviewService.getReviewsForUser(user.id),
                reviewService.getAverageRating(user.id),
            ]);

            setReviews(reviewsData);
            setAverageRating(ratingData.average);
            setReviewCount(ratingData.count);
        } catch (error) {
            console.error('Error fetching reviews:', error);
        } finally {
            setLoadingReviews(false);
        }
    };

    const fetchBadges = async () => {
        try {
            if (user?.id) {
                const badges = await badgeService.getUserBadges(user.id);
                setUserBadges(badges);
            }
        } catch (error) {
            console.error('Error fetching badges:', error);
        } finally {
            setLoadingBadges(false);
        }
    };

    const fetchStreak = async () => {
        try {
            const { count } = await streakService.getStreakDisplay();
            setCurrentStreak(count);
        } catch (error) {
            console.error('Error fetching streak:', error);
        }
    };

    const checkProfileBadge = async () => {
        if (!user?.id) return;
        const completion = profileCompletion();
        const badgeEarned = await badgeService.checkProfileBadge(user.id, completion);
        if (badgeEarned) {
            fetchBadges();
            Alert.alert('Badge Earned! 🏆', 'You earned the "Profile Master" badge for completing your profile!');
        }
    };

    const fetchMyJobPosts = async () => {
        // Determine target ID and Role
        const targetId = isOwnProfile ? user?.id : viewUserId;
        const role = isOwnProfile ? selectedRole : viewRole;
        if (!targetId || role !== 'business') return;

        setLoadingJobs(true);
        try {
            let jobs = [];
            if (isOwnProfile) {
                jobs = await jobPostService.getMyJobPosts();
            } else {
                // Fetch public jobs for business
                // Assuming viewProfile is loaded and has id, but we use targetId which is userId.
                // jobPostService.getJobPostsByBusiness usually takes userId or businessId depending on impl.
                // Checking database.ts, likely userId if getMyJobPosts uses userId internally.
                // Safe bet: fetch directly if not own.
                const { data } = await supabase
                    .from('job_posts')
                    .select('*')
                    .eq('business_id', (viewProfile as any)?.id) // Need business_id
                    .order('created_at', { ascending: false });
                jobs = (data as any) || [];
            }
            setMyJobPosts(jobs);
        } catch (error) {
            console.error('Error fetching job posts:', error);
        } finally {
            setLoadingJobs(false);
        }
    };

    const isWorker = isOwnProfile
        ? (profile?.role === 'worker')
        : (viewRole === 'worker');

    useEffect(() => {
        if (!isOwnProfile && viewUserId) {
            const fetchProfile = async () => {
                try {
                    const { data: pData } = await supabase.from('profiles').select('*').eq('id', viewUserId).single();
                    if (pData) {
                        setViewRole(pData.role);
                        setViewProfile(pData);
                    }
                } catch (err) {
                    console.error('Error fetching view profile:', err);
                }
            };
            fetchProfile();
        }
    }, [viewUserId, isOwnProfile]);

    // Default values
    const displayName = isWorker
        ? (profile?.name || user?.name || 'Your Name')
        : (profile?.company_name || 'Company Name');

    const displayRole = isWorker
        ? (profile?.job_title || 'Add your job title')
        : (profile?.industry || 'Add your industry');

    const displayBio = profile?.bio || profile?.description || 'Tell others about yourself...';
    const displayLocation = profile?.current_location || profile?.location || 'Add location';
    const displayExperience = profile?.experience_years || 0;
    const displaySkills = profile?.skills || [];
    const displaySalary = profile?.expected_salary_min
        ? `NPR ${profile.expected_salary_min.toLocaleString()} - ${profile.expected_salary_max?.toLocaleString() || 'Negotiable'}`
        : 'Add salary expectation';

    const handleDeleteJob = (jobId: string) => {
        const performDelete = async () => {
            try {
                const success = await jobPostService.deleteJobPost(jobId);
                if (success) {
                    setMyJobPosts(prev => prev.filter(p => p.id !== jobId));
                    if (Platform.OS === 'web') {
                        alert("Job post deleted successfully");
                    } else {
                        Alert.alert("Success", "Job post deleted successfully");
                    }
                } else {
                    if (Platform.OS === 'web') {
                        alert("Failed to delete job post");
                    } else {
                        Alert.alert("Error", "Failed to delete job post");
                    }
                }
            } catch (error) {
                console.error('Delete error:', error);
                if (Platform.OS === 'web') {
                    alert("An unexpected error occurred");
                } else {
                    Alert.alert("Error", "An unexpected error occurred");
                }
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to delete this job post?")) {
                performDelete();
            }
        } else {
            Alert.alert(
                "Delete Job Post",
                "Are you sure you want to delete this job post?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: performDelete
                    }
                ]
            );
        }
    };

    const handleSaveProfile = () => {
        if (!editedProfile) return;
        updateProfile(editedProfile);
        updateProfile(editedProfile);
        setIsEditing(false);
        // Re-check profile badge after delay to ensure profile is updated
        setTimeout(() => checkProfileBadge(), 1000);
        Alert.alert('Success', 'Profile updated successfully!');
    };

    const handleAddSkill = () => {
        if (!editedProfile) return;
        if (newSkill.trim()) {
            const updatedSkills = [...(editedProfile.skills || []), newSkill.trim()];
            setEditedProfile({ ...editedProfile, skills: updatedSkills });
            setNewSkill('');
            setShowSkillModal(false);
        }
    };

    const handleRemoveSkill = (index: number) => {
        if (!editedProfile) return;
        const updatedSkills = editedProfile.skills?.filter((_: string, i: number) => i !== index) || [];
        setEditedProfile({ ...editedProfile, skills: updatedSkills });
    };

    const handleUploadResume = async () => {
        if (!user?.id) {
            console.log('[Resume Upload] No user ID found');
            return;
        }

        try {
            console.log('[Resume Upload] Opening document picker...');
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                copyToCacheDirectory: true,
            });

            console.log('[Resume Upload] Document picker result:', result);

            if (result.canceled || !result.assets || result.assets.length === 0) {
                console.log('[Resume Upload] User canceled or no file selected');
                return;
            }

            setIsUploading(true);
            const asset = result.assets[0];
            console.log('[Resume Upload] Selected file:', asset.name, 'Size:', asset.size, 'URI:', asset.uri);

            // Client-side size check (limit to 5MB)
            const MAX_SIZE_MB = 5;
            const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

            if (asset.size && asset.size > MAX_SIZE_BYTES) {
                console.warn(`[Resume Upload] File size (${asset.size}) exceeds limit (${MAX_SIZE_BYTES})`);
                Alert.alert(
                    'File Too Large',
                    `Please select a file smaller than ${MAX_SIZE_MB}MB.\n\nYour file is ${(asset.size / (1024 * 1024)).toFixed(2)}MB.`
                );
                setIsUploading(false);
                return;
            }

            // Resolve file for upload
            let fileToUpload: any;
            console.log('[Resume Upload] Converting file to blob...');
            if (Platform.OS === 'web') {
                const response = await fetch(asset.uri);
                fileToUpload = await response.blob();
            } else {
                const response = await fetch(asset.uri);
                fileToUpload = await response.blob();
            }
            console.log('[Resume Upload] Blob created. Type:', fileToUpload.type, 'Size:', fileToUpload.size);

            const fileExt = asset.name.split('.').pop();
            const fileName = `${user.id}/resume-${Date.now()}.${fileExt}`;
            console.log('[Resume Upload] Uploading to documents bucket with path:', fileName);

            const uploadResult = await storageService.uploadFile('documents', fileName, fileToUpload);
            console.log('[Resume Upload] Upload result:', uploadResult);

            if (uploadResult.error) {
                console.error('[Resume Upload] Upload failed:', uploadResult.error);
                Alert.alert('Error', 'Failed to upload resume: ' + uploadResult.error);
                return;
            }

            if (uploadResult.url) {
                console.log('[Resume Upload] File uploaded successfully. URL:', uploadResult.url);
                console.log('[Resume Upload] Updating profile with resume URL...');

                // Update profile with new resume URL
                const updatedData = await profileService.upsertProfile({
                    id: user.id,
                    role: user.role || 'worker',  // Essential to satisfy NOT NULL constraint
                    resume_url: uploadResult.url,
                    updated_at: new Date().toISOString(),
                });

                console.log('[Resume Upload] Profile update result:', updatedData ? 'Success' : 'Failed');

                if (!updatedData) {
                    console.error('[Resume Upload] Profile update returned null');
                    Alert.alert('Error', 'Failed to update profile with resume URL');
                } else {
                    // Update local state via AuthContext updateProfile
                    console.log('[Resume Upload] Updating local profile state...');
                    updateProfile({ ...profile, resume_url: uploadResult.url });

                    // Check for Badge
                    const badgeEarned = await badgeService.checkResumeBadge(user.id);
                    if (badgeEarned) {
                        fetchBadges(); // Refresh badge list
                        Alert.alert('Badge Earned! 🏆', 'You earned the "Resume Ready" badge for uploading your resume!');
                    } else {
                        Alert.alert('Success', `Resume uploaded successfully!\n\nFile: ${asset.name}\n\nBusinesses can now view and download your resume.`);
                    }
                    console.log('[Resume Upload] ✅ Resume upload complete!');
                }
            } else {
                console.error('[Resume Upload] Upload succeeded but no URL returned');
                Alert.alert('Error', 'Upload succeeded but no URL was returned');
            }
        } catch (error) {
            console.error('[Resume Upload] Exception:', error);
            Alert.alert('Error', `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsUploading(false);
            console.log('[Resume Upload] Upload process finished');
        }
    };

    const profileCompletion = () => {
        let completed = 0;
        let total = isWorker ? 6 : 5;

        if (profile?.name || profile?.company_name) completed++;
        if (profile?.bio || profile?.description) completed++;
        if (profile?.current_location || profile?.location) completed++;
        if (isWorker && profile?.job_title) completed++;
        if (isWorker && (profile?.skills?.length ?? 0) > 0) completed++;
        if ((profile?.photos?.length ?? 0) > 0 || profile?.logo_url) completed++;

        return Math.round((completed / total) * 100);
    };

    // Show loading state while profile is being fetched
    if (!profile || !editedProfile) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Profile</Text>
                    {isOwnProfile && (
                        <TouchableOpacity
                            style={styles.editHeaderButton}
                            onPress={() => setIsEditing(!isEditing)}
                        >
                            <Feather
                                name={isEditing ? "x" : "edit-2"}
                                size={20}
                                color={theme.colors.primary}
                            />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <View style={styles.imageContainer}>
                        <Image
                            source={{
                                uri: profile?.photos?.[0] ||
                                    profile?.logo_url ||
                                    user?.profile_pic ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1E3A5F&color=fff&size=120`
                            }}
                            style={styles.profileImage}
                        />
                        {isOwnProfile && (
                            <TouchableOpacity style={styles.editImageButton}>
                                <Feather name="camera" size={16} color="#fff" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {isEditing ? (
                        <TextInput
                            style={styles.nameInput}
                            value={editedProfile.name || editedProfile.company_name || ''}
                            onChangeText={(text) => setEditedProfile({
                                ...editedProfile,
                                [isWorker ? 'name' : 'company_name']: text
                            })}
                            placeholder={isWorker ? "Your Name" : "Company Name"}
                            placeholderTextColor={theme.colors.textMuted}
                        />
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.name}>{displayName}</Text>
                            {profile?.verified && (
                                <MaterialCommunityIcons
                                    name="check-decagram"
                                    size={20}
                                    color={theme.colors.primary}
                                    style={{ marginLeft: 6 }}
                                />
                            )}
                        </View>
                    )}

                    {isEditing ? (
                        <TextInput
                            style={styles.roleInput}
                            value={editedProfile.job_title || editedProfile.industry || ''}
                            onChangeText={(text) => setEditedProfile({
                                ...editedProfile,
                                [isWorker ? 'job_title' : 'industry']: text
                            })}
                            placeholder={isWorker ? "Job Title" : "Industry"}
                            placeholderTextColor={theme.colors.textMuted}
                        />
                    ) : (
                        <Text style={styles.role}>{displayRole}</Text>
                    )}

                    {/* Role Badge */}
                    <View style={styles.roleBadge}>
                        <MaterialCommunityIcons
                            name={isWorker ? "account-hard-hat" : "domain"}
                            size={14}
                            color={theme.colors.secondary}
                        />
                        <Text style={styles.roleBadgeText}>
                            {isWorker ? 'Worker' : 'Business'}
                        </Text>
                    </View>

                    {/* Verification Banner */}
                    {isOwnProfile && !profile?.verified && (
                        <TouchableOpacity
                            style={styles.verificationBanner}
                            onPress={() => navigation.navigate('IdentityVerification')}
                        >
                            <View style={styles.verificationBannerContent}>
                                <Feather name="shield" size={16} color="#fff" />
                                <Text style={styles.verificationBannerText}>Verify your identity to get the Verified Pro badge</Text>
                            </View>
                            <Feather name="chevron-right" size={16} color="#fff" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{profileCompletion()}%</Text>
                        <Text style={styles.statLabel}>Complete</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <View style={styles.streakContainer}>
                            <Text style={styles.statNumber}>{currentStreak}</Text>
                            {currentStreak > 0 && (
                                <Text style={styles.flameEmoji}>🔥</Text>
                            )}
                        </View>
                        <Text style={styles.statLabel}>Day Streak</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{userBadges.length}</Text>
                        <Text style={styles.statLabel}>Badges</Text>
                    </View>
                </View>

                {/* Action Buttons */}
                {isOwnProfile && (
                    <View style={styles.actionButtonsRow}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => navigation.navigate('Insights')}
                        >
                            <Feather name="bar-chart-2" size={18} color={theme.colors.accent} />
                            <Text style={styles.actionButtonText}>Insights</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.boostButton]}
                            onPress={() => navigation.navigate('Boost')}
                        >
                            <Feather name="zap" size={18} color={theme.colors.warning} />
                            <Text style={[styles.actionButtonText, styles.boostButtonText]}>Boost</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* About Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>
                    {isEditing ? (
                        <TextInput
                            style={styles.bioInput}
                            value={editedProfile.bio || editedProfile.description || ''}
                            onChangeText={(text) => setEditedProfile({
                                ...editedProfile,
                                [isWorker ? 'bio' : 'description']: text
                            })}
                            placeholder="Write something about yourself..."
                            placeholderTextColor={theme.colors.textMuted}
                            multiline
                            numberOfLines={4}
                        />
                    ) : (
                        <Text style={styles.bio}>{displayBio}</Text>
                    )}
                </View>

                {/* Photos Section */}
                {!isEditing && (profile?.photos && profile.photos.length > 0) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Photos</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
                            {profile.photos.map((photo: string, index: number) => (
                                <Image key={index} source={{ uri: photo }} style={styles.thumbnail} />
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Details Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Details</Text>

                    <View style={styles.detailRow}>
                        <Feather name="map-pin" size={20} color={theme.colors.textSecondary} style={styles.icon} />
                        {isEditing ? (
                            <TextInput
                                style={styles.detailInput}
                                value={editedProfile.current_location || editedProfile.location || ''}
                                onChangeText={(text) => setEditedProfile({
                                    ...editedProfile,
                                    [isWorker ? 'current_location' : 'location']: text
                                })}
                                placeholder="Location"
                                placeholderTextColor={theme.colors.textMuted}
                            />
                        ) : (
                            <Text style={styles.detailText}>{displayLocation}</Text>
                        )}
                    </View>

                    {isWorker && (
                        <>
                            <View style={styles.detailRow}>
                                <Feather name="award" size={20} color={theme.colors.textSecondary} style={styles.icon} />
                                {isEditing ? (
                                    <TextInput
                                        style={styles.detailInput}
                                        value={String(editedProfile.experience_years || '')}
                                        onChangeText={(text) => setEditedProfile({
                                            ...editedProfile,
                                            experience_years: parseInt(text) || 0
                                        })}
                                        placeholder="Years of experience"
                                        placeholderTextColor={theme.colors.textMuted}
                                        keyboardType="number-pad"
                                    />
                                ) : (
                                    <Text style={styles.detailText}>{displayExperience} Years Experience</Text>
                                )}
                            </View>

                            <View style={styles.detailRow}>
                                <MaterialCommunityIcons name="cash" size={20} color={theme.colors.textSecondary} style={styles.icon} />
                                <Text style={styles.detailText}>{displaySalary}</Text>
                            </View>
                        </>
                    )}

                    {!isWorker && (
                        <View style={styles.detailRow}>
                            <Feather name="users" size={20} color={theme.colors.textSecondary} style={styles.icon} />
                            <Text style={styles.detailText}>
                                {profile?.company_size || 'Add company size'}
                            </Text>
                        </View>
                    )}

                    <View style={styles.detailRow}>
                        <Feather name="mail" size={20} color={theme.colors.textSecondary} style={styles.icon} />
                        <Text style={styles.detailText}>{user?.email || 'Email not set'}</Text>
                    </View>
                </View>

                {/* Skills Section (Workers only) */}
                {isWorker && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Skills</Text>
                            {isEditing && (
                                <TouchableOpacity onPress={() => setShowSkillModal(true)}>
                                    <Feather name="plus-circle" size={24} color={theme.colors.primary} />
                                </TouchableOpacity>
                            )}
                        </View>
                        <View style={styles.skillsContainer}>
                            {(isEditing ? editedProfile.skills : displaySkills)?.map((skill: string, index: number) => (
                                <View key={index} style={styles.skillTag}>
                                    <Text style={styles.skillText}>{skill}</Text>
                                    {isEditing && (
                                        <TouchableOpacity onPress={() => handleRemoveSkill(index)}>
                                            <Feather name="x" size={14} color={theme.colors.textSecondary} style={{ marginLeft: 6 }} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                            {(!isEditing && displaySkills.length === 0) && (
                                <Text style={styles.emptyText}>Add your skills to stand out</Text>
                            )}
                        </View>
                    </View>
                )}

                {/* Active Job Posts (Business only) */}
                {!isWorker && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Active Job Posts</Text>
                            {isOwnProfile && (
                                <TouchableOpacity onPress={() => navigation.navigate('CreateJobPost')}>
                                    <Feather name="plus-circle" size={24} color={theme.colors.primary} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {loadingJobs ? (
                            <ActivityIndicator size="small" color={theme.colors.accent} />
                        ) : myJobPosts.length > 0 ? (
                            <View style={styles.jobsContainer}>
                                {myJobPosts.map((job) => (
                                    <View key={job.id} style={styles.jobCard}>
                                        <View style={styles.jobHeader}>
                                            <Text style={styles.jobTitle}>{job.title}</Text>
                                            <View style={[styles.statusBadge, { backgroundColor: job.status === 'active' ? theme.colors.success + '20' : theme.colors.textMuted + '20' }]}>
                                                <Text style={[styles.statusText, { color: job.status === 'active' ? theme.colors.success : theme.colors.textMuted }]}>
                                                    {job.status.toUpperCase()}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={styles.jobLocation}>{job.location} • {job.employment_type.replace('_', ' ')}</Text>
                                        <View style={styles.jobFooter}>
                                            <View style={styles.applicantCount}>
                                                <Feather name="users" size={14} color={theme.colors.textSecondary} />
                                                <Text style={styles.applicantText}>{job.applications_count} Applicants</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                                                <TouchableOpacity
                                                    onPress={() => navigation.navigate('CreateJobPost', { jobId: job.id })}
                                                >
                                                    <Feather name="edit-2" size={16} color={theme.colors.primary} />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => handleDeleteJob(job.id)}
                                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                >
                                                    <Feather name="trash-2" size={16} color={theme.colors.error} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.noJobsContainer}
                                onPress={() => navigation.navigate('CreateJobPost')}
                            >
                                <Feather name="briefcase" size={32} color={theme.colors.textMuted} />
                                <Text style={styles.noJobsText}>No active job posts</Text>
                                <Text style={styles.noJobsSubtext}>Tap + to post a new job</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Badges Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Badges</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Badges')}>
                            <Text style={styles.seeAllLink}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    {loadingBadges ? (
                        <ActivityIndicator size="small" color={theme.colors.accent} />
                    ) : userBadges.length > 0 ? (
                        <View style={styles.badgesRow}>
                            {userBadges.slice(0, 5).map((ub) => (
                                <BadgeCard
                                    key={ub.id}
                                    badge={ub.badge!}
                                    size="small"
                                />
                            ))}
                            {userBadges.length > 5 && (
                                <TouchableOpacity
                                    style={styles.moreBadgesButton}
                                    onPress={() => navigation.navigate('Badges')}
                                >
                                    <Text style={styles.moreBadgesText}>+{userBadges.length - 5}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.noBadgesContainer}
                            onPress={() => navigation.navigate('Badges')}
                        >
                            <Feather name="award" size={32} color={theme.colors.textMuted} />
                            <Text style={styles.noBadgesText}>No badges yet</Text>
                            <Text style={styles.noBadgesSubtext}>
                                Complete actions to earn badges
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Reviews Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Reviews</Text>
                        {reviewCount > 0 && (
                            <View style={styles.ratingBadge}>
                                <StarRating rating={averageRating} size={14} />
                                <Text style={styles.ratingText}>
                                    {averageRating.toFixed(1)} ({reviewCount})
                                </Text>
                            </View>
                        )}
                    </View>

                    {loadingReviews ? (
                        <ActivityIndicator size="small" color={theme.colors.accent} />
                    ) : reviews.length > 0 ? (
                        <View style={styles.reviewsContainer}>
                            {reviews.slice(0, 3).map((review) => (
                                <ReviewCard
                                    key={review.id}
                                    reviewerName={review.reviewer_name || 'Anonymous'}
                                    reviewerPhoto={review.reviewer_photo}
                                    rating={review.rating}
                                    comment={review.comment}
                                    date={review.created_at}
                                />
                            ))}
                            {reviews.length > 3 && (
                                <TouchableOpacity style={styles.seeAllButton}>
                                    <Text style={styles.seeAllText}>
                                        See all {reviewCount} reviews
                                    </Text>
                                    <Feather name="chevron-right" size={16} color={theme.colors.accent} />
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <View style={styles.noReviewsContainer}>
                            <Feather name="star" size={32} color={theme.colors.textMuted} />
                            <Text style={styles.noReviewsText}>No reviews yet</Text>
                            <Text style={styles.noReviewsSubtext}>
                                Complete jobs to receive reviews from employers
                            </Text>
                        </View>
                    )}
                </View>

                {/* Save Button */}
                {isEditing && (
                    <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    </TouchableOpacity>
                )}

                {/* Resume Display Section (Workers only) */}
                {isWorker && profile?.resume_url && !isEditing && (
                    <View style={styles.resumeSection}>
                        <View style={styles.resumeHeader}>
                            <Feather name="file-text" size={20} color={theme.colors.success} />
                            <Text style={styles.resumeTitle}>Resume Uploaded</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.resumeDownloadButton}
                            onPress={() => {
                                if (profile?.resume_url) {
                                    console.log('[Resume] Opening URL:', profile.resume_url);
                                    // On web, open in new tab. On mobile, use Linking
                                    if (Platform.OS === 'web') {
                                        window.open(profile.resume_url, '_blank');
                                    } else {
                                        import('react-native').then(({ Linking }) => {
                                            Linking.openURL(profile.resume_url!);
                                        });
                                    }
                                }
                            }}
                        >
                            <Feather name="download" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
                            <Text style={styles.resumeDownloadText}>
                                {isOwnProfile ? 'View/Download Resume' : 'Download Resume'}
                            </Text>
                        </TouchableOpacity>
                        {isOwnProfile && (
                            <Text style={styles.resumeHint}>✓ Visible to businesses</Text>
                        )}
                    </View>
                )}

                {/* Upload Resume (Workers only) */}
                {isWorker && isOwnProfile && !isEditing && (
                    <TouchableOpacity
                        style={[styles.uploadButton, isUploading && { opacity: 0.5 }]}
                        onPress={handleUploadResume}
                        disabled={isUploading}
                    >
                        {isUploading ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginRight: 8 }} />
                        ) : (
                            <Feather name="upload" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                        )}
                        <Text style={styles.uploadButtonText}>
                            {isUploading ? 'Uploading...' : (profile?.resume_url ? 'Update Resume' : 'Upload Resume')}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Achievements Section */}
                {!isEditing && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Achievements</Text>
                        {userBadges.length > 0 ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
                                {userBadges.map((userBadge) => (
                                    <BadgeCard
                                        key={userBadge.id}
                                        badge={userBadge.badge!}
                                        size="medium"
                                    />
                                ))}
                            </ScrollView>
                        ) : (
                            <Text style={styles.emptyText}>No badges earned yet.</Text>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Add Skill Modal */}
            <Modal visible={showSkillModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Skill</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={newSkill}
                            onChangeText={setNewSkill}
                            placeholder="e.g., Plumbing, Cooking, Driving"
                            placeholderTextColor={theme.colors.textMuted}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={() => setShowSkillModal(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalAddButton}
                                onPress={handleAddSkill}
                            >
                                <Text style={styles.modalAddText}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: theme.colors.text,
    },
    editHeaderButton: {
        padding: 10,
        backgroundColor: theme.colors.card,
        borderRadius: 50,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    imageContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: theme.colors.accent,
    },
    editImageButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: theme.colors.accent,
        padding: 10,
        borderRadius: 20,
        borderWidth: 3,
        borderColor: theme.colors.background,
    },
    name: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 4,
    },
    nameInput: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.text,
        textAlign: 'center',
        backgroundColor: theme.colors.card,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 8,
        minWidth: 200,
    },
    role: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginBottom: 12,
    },
    roleInput: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        backgroundColor: theme.colors.card,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 12,
        minWidth: 200,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.card,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    roleBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.secondary,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        paddingVertical: 20,
        backgroundColor: theme.colors.surface,
        marginHorizontal: 24,
        borderRadius: 16,
        marginBottom: 24,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.accent,
    },
    statLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    divider: {
        width: 1,
        backgroundColor: theme.colors.border,
    },
    section: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 12,
    },
    bio: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        lineHeight: 24,
    },
    bioInput: {
        fontSize: 15,
        color: theme.colors.text,
        lineHeight: 24,
        backgroundColor: theme.colors.card,
        padding: 16,
        borderRadius: 12,
        textAlignVertical: 'top',
        minHeight: 100,
    },
    photoList: {
        flexDirection: 'row',
        marginTop: 8,
    },
    thumbnail: {
        width: 120,
        height: 160,
        borderRadius: 12,
        marginRight: 12,
        backgroundColor: theme.colors.card,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    icon: {
        marginRight: 12,
    },
    detailText: {
        fontSize: 15,
        color: theme.colors.text,
    },
    detailInput: {
        flex: 1,
        fontSize: 15,
        color: theme.colors.text,
        backgroundColor: theme.colors.card,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    skillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    skillTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.card,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    skillText: {
        color: theme.colors.text,
        fontWeight: '500',
        fontSize: 14,
    },
    emptyText: {
        color: theme.colors.textMuted,
        fontSize: 14,
        fontStyle: 'italic',
    },
    saveButton: {
        margin: 24,
        backgroundColor: theme.colors.accent,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonText: {
        color: theme.colors.text,
        fontWeight: '700',
        fontSize: 16,
    },
    // Resume Section Styles
    resumeSection: {
        margin: 24,
        marginTop: 0,
        backgroundColor: theme.colors.surface,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.success + '40',
    },
    resumeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    resumeTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.success,
        marginLeft: 8,
    },
    resumeDownloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        marginBottom: 8,
    },
    resumeDownloadText: {
        color: '#ffffff', // Keep white if background is primary blue
        fontSize: 14,
        fontWeight: '600',
    },
    resumeHint: {
        fontSize: 12,
        color: theme.colors.success,
        fontStyle: 'italic',
    },
    uploadButton: {
        flexDirection: 'row',
        margin: 24,
        marginTop: 0,
        backgroundColor: theme.colors.card,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.colors.accent,
        borderStyle: 'dashed',
    },
    uploadButtonText: {
        color: theme.colors.accent,
        fontWeight: '600',
        fontSize: 15,
    },
    badgesScroll: {
        marginTop: 12,
        paddingBottom: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        padding: 24,
        borderRadius: 16,
        width: '85%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 16,
    },
    modalInput: {
        backgroundColor: theme.colors.card,
        padding: 16,
        borderRadius: 12,
        color: theme.colors.text,
        fontSize: 16,
        marginBottom: 20,
    },
    // Jobs Styles
    jobsContainer: {
        gap: 12,
    },
    jobCard: {
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    jobHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    jobTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        flex: 1,
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
    },
    jobLocation: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 12,
        textTransform: 'capitalize',
    },
    jobFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    applicantCount: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    applicantText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    noJobsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
    },
    noJobsText: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    noJobsSubtext: {
        marginTop: 4,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalCancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        backgroundColor: theme.colors.border,
        alignItems: 'center',
    },
    modalCancelText: {
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    modalAddButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        backgroundColor: theme.colors.accent,
        alignItems: 'center',
    },
    modalAddText: {
        color: theme.colors.text,
        fontWeight: '600',
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    ratingText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.warning,
    },
    reviewsContainer: {
        gap: 12,
    },
    noReviewsContainer: {
        alignItems: 'center',
        paddingVertical: 24,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
    },
    noReviewsText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginTop: 12,
    },
    noReviewsSubtext: {
        fontSize: 13,
        color: theme.colors.textMuted,
        marginTop: 4,
        textAlign: 'center',
    },
    seeAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 4,
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.accent,
    },
    seeAllLink: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.accent,
    },
    badgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    moreBadgesButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: theme.colors.border,
    },
    moreBadgesText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
    },
    noBadgesContainer: {
        alignItems: 'center',
        paddingVertical: 24,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
    },
    noBadgesText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginTop: 12,
    },
    noBadgesSubtext: {
        fontSize: 13,
        color: theme.colors.textMuted,
        marginTop: 4,
        textAlign: 'center',
    },
    streakContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    flameEmoji: {
        fontSize: 16,
    },
    actionButtonsRow: {
        flexDirection: 'row',
        marginHorizontal: 24,
        marginBottom: 24,
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 8,
    },
    actionButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.accent,
    },
    boostButton: {
        borderColor: theme.colors.warning,
        backgroundColor: `${theme.colors.warning}10`,
    },
    boostButtonText: {
        color: theme.colors.warning,
    },
    verificationBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.primary,
        marginHorizontal: 20,
        marginTop: 20,
        padding: 12,
        borderRadius: 8,
    },
    verificationBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 10,
    },
    verificationBannerText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
});
