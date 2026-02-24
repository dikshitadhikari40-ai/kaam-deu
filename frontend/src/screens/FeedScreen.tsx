import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
  FadeIn,
  ZoomIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import SwipeCard from '../components/SwipeCard';
import FilterModal from '../components/FilterModal';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { ProfileCard, FeedFilters } from '../types';
import { profileService, swipeService, jobPostService } from '../services/database';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { sendMatchNotification } from '../services/notifications';
import { calculateDistance } from '../utils/matchingAlgorithm';

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
  error: '#ff6b6b',
  superLike: '#00D4FF',
  purple: '#9B59B6',
};
const SWIPE_THRESHOLD = width * 0.25;

export default function FeedScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [profiles, setProfiles] = useState<ProfileCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchModal, setMatchModal] = useState<any>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FeedFilters>({});
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const context = useSharedValue({ x: 0, y: 0 });

  // Load profiles from Supabase with filters
  const loadProfiles = useCallback(async (filters?: FeedFilters) => {
    // FIXED: Strict null safety - wait for user data to be fully loaded
    if (!user) {
      console.log('FeedScreen: User not loaded yet, skipping profile fetch');
      return;
    }

    if (!user.role) {
      console.log('FeedScreen: User role not set, skipping profile fetch');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get profiles of the opposite role (workers see businesses, businesses see workers)
      const currentRole = user.role;
      console.log('FeedScreen: Loading profiles for role:', currentRole);
      const feedProfiles = await profileService.getSwipeProfiles(currentRole, filters);

      // Get current user's location for distance calculation
      const currentUserProfile = await profileService.getCurrentProfile();
      const userLocation = currentUserProfile?.current_location || currentUserProfile?.location || 'Kathmandu';

      // Transform database profiles to ProfileCard format (now includes matchScore from algorithm)
      const transformedProfiles: ProfileCard[] = feedProfiles.map((p) => {
        // Calculate real distance between user and profile
        const profileLocation = p.current_location || p.location || 'Nepal';
        // Mock distance calculation if needed or use real one
        // For now using simple distance logic
        const distanceKm = 5; // Placeholder default

        return {
          id: p.id,
          userId: p.id,
          role: p.role,
          name: p.name || p.company_name || 'Unknown',
          age: undefined, // Not stored currently
          jobTitle: p.job_title || p.industry || '',
          companyName: p.company_name || '',
          location: profileLocation,
          distance: Math.round(distanceKm), // Real distance in km
          bio: p.bio || p.description || '',
          images: p.photos?.length ? p.photos :
            p.photo_url ? [p.photo_url] :
              p.logo_url ? [p.logo_url] :
                [`https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || p.company_name || 'User')}&background=1E3A5F&color=fff&size=400`],
          skills: p.skills || [],
          interests: [],
          verified: p.verified || p.is_verified_business || false,
          activeStatus: p.is_active ? 'online' : 'offline',
          expectedSalary: p.expected_salary_max,
          experienceYears: p.experience_years,
          matchScore: p.matchScore, // Smart matching algorithm score
          isProfileComplete: p.is_profile_complete, // Show badge for incomplete profiles
        };
      });

      // FOR WORKERS: Fetch and mix in job posts
      let finalProfiles = transformedProfiles;
      if (currentRole === 'worker') {
        console.log('FeedScreen: Fetching job posts for worker feed');
        const jobPosts = await jobPostService.getSwipeableJobPosts(filters);
        console.log('FeedScreen: Found', jobPosts.length, 'job posts');

        // Transform job posts to ProfileCard format
        const jobCards: ProfileCard[] = jobPosts.map((job) => ({
          id: job.id,
          userId: job.business_id,
          role: 'business' as const,
          name: job.business?.company_name || 'Company',
          jobTitle: job.title,
          bio: job.description,
          companyName: job.business?.company_name || '',
          industry: job.business?.industry || '',
          location: job.location,
          distance: 5, // Placeholder
          images: job.business?.logo_url ? [job.business.logo_url] :
            [`https://ui-avatars.com/api/?name=${encodeURIComponent(job.business?.company_name || 'Company')}&background=1E3A5F&color=fff&size=400`],
          verified: job.business?.is_verified_business || false,
          activeStatus: 'online' as const,
          skills: job.skills_required || [],
          // Job post specific fields
          isJobPost: true,
          jobId: job.id,
          jobDetails: {
            title: job.title,
            description: job.description,
            requirements: job.requirements || [],
            skills_required: job.skills_required || [],
            employment_type: job.employment_type,
            salary_min: job.salary_min,
            salary_max: job.salary_max,
            salary_negotiable: job.salary_negotiable,
            is_remote: job.is_remote,
            business_id: job.business_id,
          },
        }));

        // Mix job posts with business profiles (1 job post per 3 business profiles)
        const mixed: ProfileCard[] = [];
        let jobIndex = 0;
        for (let i = 0; i < transformedProfiles.length; i++) {
          mixed.push(transformedProfiles[i]);
          // Insert a job post every 3 profiles
          if ((i + 1) % 3 === 0 && jobIndex < jobCards.length) {
            mixed.push(jobCards[jobIndex]);
            jobIndex++;
          }
        }
        // Add remaining job posts at the end
        while (jobIndex < jobCards.length) {
          mixed.push(jobCards[jobIndex]);
          jobIndex++;
        }

        finalProfiles = mixed;
        console.log('FeedScreen: Mixed feed contains', finalProfiles.length, 'cards (profiles + jobs)');
      }

      setProfiles(finalProfiles);
      setCurrentIndex(0);
      setHistory([]);
    } catch (error: any) {
      console.error('Error loading profiles:', error);
      Alert.alert('Error', 'Failed to load profiles. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  // Handle filter application
  const handleApplyFilters = useCallback((filters: FeedFilters) => {
    setActiveFilters(filters);
    const hasFilters = Object.values(filters).some(v =>
      v !== undefined && (Array.isArray(v) ? v.length > 0 : true)
    );
    setHasActiveFilters(hasFilters);
    loadProfiles(filters);
  }, [loadProfiles]);

  const handleResetSwipes = async () => {
    try {
      setLoading(true);
      const success = await swipeService.resetSwipes();
      if (success) {
        if (Platform.OS === 'web') {
          alert('Discovery Reset: Your swipe history has been cleared. You can now see profiles again.');
        } else {
          Alert.alert('Discovery Reset', 'Your swipe history has been cleared. You can now see profiles again.');
        }
        loadProfiles(activeFilters);
      } else {
        if (Platform.OS === 'web') {
          alert('Error: Failed to reset discovery. Please try again.');
        } else {
          Alert.alert('Error', 'Failed to reset discovery. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error in handleResetSwipes:', error);
      if (Platform.OS === 'web') {
        alert('Error: Something went wrong. Please try again.');
      } else {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debug: Log all profiles in database on mount
    profileService.debugGetAllProfiles();
    loadProfiles();
  }, [loadProfiles]);

  const currentProfile = profiles[currentIndex];
  const nextProfile = profiles[currentIndex + 1];

  const handleSwipeComplete = async (direction: 'left' | 'right' | 'up') => {
    if (!currentProfile) return;

    console.log(`[FeedScreen] Swiped ${direction} on ${currentProfile.name} (ID: ${currentProfile.id})`);

    // Add to history for undo
    setHistory(prev => [...prev, currentIndex]);
    setCurrentIndex(prev => prev + 1);

    translateX.value = 0;
    translateY.value = 0;
    scale.value = 1;

    // Haptic feedback
    if (direction === 'up') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Handle job post swipes differently
    if (currentProfile.isJobPost && currentProfile.jobId) {
      console.log(`[FeedScreen] This is a job post card, jobId: ${currentProfile.jobId}`);

      // Only create application on right swipe
      if (direction === 'right' || direction === 'up') {
        try {
          console.log(`[FeedScreen] Creating job application for job ${currentProfile.jobId}`);

          // Create job application via Supabase
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { error } = await supabase
              .from('job_applications')
              .insert({
                job_post_id: currentProfile.jobId,
                worker_id: user.id,
                status: 'applied',
                applied_at: new Date().toISOString(),
              });

            if (error) {
              console.error('[FeedScreen] Error creating job application:', error);
              if (Platform.OS === 'web') {
                alert('Failed to apply to job. Please try again.');
              } else {
                Alert.alert('Error', 'Failed to apply to job. Please try again.');
              }
            } else {
              console.log('[FeedScreen] Job application created successfully');
              // Show success feedback
              if (Platform.OS === 'web') {
                // Don't show alert on web, just haptic feedback
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } else {
                // On mobile, could show a toast or brief alert
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            }
          }
        } catch (error) {
          console.error('[FeedScreen] Error in job application flow:', error);
        }
      } else {
        console.log(`[FeedScreen] Left swipe on job post, no action needed`);
      }
      return; // Don't continue with match logic for job posts
    }

    // Regular profile swipe logic (for business/worker profiles)
    try {
      // Map 'up' to 'super' for the database
      const swipeDirection = direction === 'up' ? 'super' : direction;
      console.log(`[FeedScreen] Recording swipe: ${swipeDirection} on profile ${currentProfile.id}`);

      const result = await swipeService.recordSwipe(currentProfile.id, swipeDirection);
      console.log(`[FeedScreen] Swipe result:`, result);

      // Check if it's a match
      if (result.isMatch) {
        console.log(`[FeedScreen] IT'S A MATCH! matchId: ${result.matchId}`);

        // Get the matched profile for display
        const matchedProfile = await profileService.getProfileById(currentProfile.id);
        console.log(`[FeedScreen] Matched profile:`, matchedProfile?.name || matchedProfile?.company_name);

        // Show match modal with matchId for navigation
        setMatchModal({ profile: matchedProfile, matchId: result.matchId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Send push notification for the match
        const matchName = matchedProfile?.name || matchedProfile?.company_name || 'Someone';
        sendMatchNotification(matchName);
      } else {
        console.log(`[FeedScreen] No match (other user hasn't swiped right yet)`);
      }
    } catch (error) {
      console.error('[FeedScreen] Error recording swipe:', error);
      Alert.alert('Error', 'Failed to record swipe. Please try again.');
    }
  };

  const handleUndo = async () => {
    if (history.length > 0) {
      const previousIndex = history[history.length - 1];
      const profileToRestore = profiles[previousIndex];

      if (profileToRestore) {
        // Haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Optimistically update UI
        setHistory(prev => prev.slice(0, -1));
        setCurrentIndex(previousIndex);

        // Persist undo to database
        try {
          await swipeService.deleteLastSwipe(profileToRestore.id);
        } catch (error) {
          console.error('Failed to undo swipe in database:', error);
          // We don't revert UI here for better UX, the next load will correct it if it failed
        }
      }
    }
  };

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { x: translateX.value, y: translateY.value };
    })
    .onUpdate((event) => {
      translateX.value = context.value.x + event.translationX;
      translateY.value = context.value.y + event.translationY;

      // Scale down slightly while dragging
      const distance = Math.sqrt(event.translationX ** 2 + event.translationY ** 2);
      scale.value = Math.max(0.95, 1 - distance / 1000);
    })
    .onEnd((event) => {
      const velocityX = event.velocityX;
      const velocityY = event.velocityY;

      // Super like (swipe up)
      if (event.translationY < -SWIPE_THRESHOLD && Math.abs(event.translationX) < SWIPE_THRESHOLD) {
        translateY.value = withSpring(-height * 1.5, { velocity: velocityY });
        translateX.value = withSpring(0);
        runOnJS(handleSwipeComplete)('up');
      }
      // Swipe left or right
      else if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        const direction = event.translationX > 0 ? 'right' : 'left';
        translateX.value = withSpring(
          direction === 'right' ? width * 1.5 : -width * 1.5,
          { velocity: velocityX }
        );
        translateY.value = withSpring(event.translationY, { velocity: velocityY });
        runOnJS(handleSwipeComplete)(direction);
      }
      // Return to center
      else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        scale.value = withSpring(1);
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-width / 2, 0, width / 2],
      [-15, 0, 15],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
        { scale: scale.value },
      ],
    };
  });

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, width / 4], [0, 1], Extrapolate.CLAMP),
  }));

  const nopeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-width / 4, 0], [1, 0], Extrapolate.CLAMP),
  }));

  const superLikeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [-height / 6, 0], [1, 0], Extrapolate.CLAMP),
    transform: [{ scale: interpolate(translateY.value, [-height / 6, 0], [1, 0.5], Extrapolate.CLAMP) }],
  }));

  const nextCardStyle = useAnimatedStyle(() => {
    const scaleInterpolated = interpolate(
      Math.abs(translateX.value),
      [0, width / 2],
      [0.94, 1],
      Extrapolate.CLAMP
    );

    const opacityInterpolated = interpolate(
      Math.abs(translateX.value),
      [0, width / 2],
      [0.5, 1],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ scale: scaleInterpolated }],
      opacity: opacityInterpolated,
    };
  });

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>Loading profiles...</Text>
      </SafeAreaView>
    );
  }

  // No profiles
  if (profiles.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <View style={styles.emptyStateIcon}>
          <MaterialCommunityIcons name="account-search" size={48} color={colors.gold} />
        </View>
        <Text style={styles.noMoreText}>No profiles found</Text>
        <Text style={styles.noMoreSubtext}>
          {user?.role === 'worker'
            ? 'No businesses are looking for workers right now'
            : 'No workers available in your area'}
        </Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => loadProfiles()}
          testID="refresh-button"
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // All profiles swiped
  if (currentIndex >= profiles.length) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <View style={[styles.emptyStateIcon, {
          shadowColor: colors.gold, shadowOpacity: 0.3, shadowRadius: 20
        }]}>
          <MaterialCommunityIcons name="trophy-outline" size={56} color={colors.gold} />
        </View>
        <Text style={styles.noMoreText}>All Caught Up!</Text>
        <Text style={styles.noMoreSubtext}>
          You've seen all available profiles for now.
          Expand your filters or check back later for new matches.
        </Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => {
            loadProfiles();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          activeOpacity={0.8}
          testID="refresh-profiles-button"
        >
          <Feather name="refresh-cw" size={18} color={colors.background} />
          <Text style={styles.refreshButtonText}>Refresh Profiles</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.refreshButton, { marginTop: 12, backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.gold }]}
          onPress={handleResetSwipes}
          activeOpacity={0.8}
        >
          <Feather name="rotate-ccw" size={18} color={colors.gold} />
          <Text style={[styles.refreshButtonText, { color: colors.gold }]}>Reset Discovery</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* Match Modal */}
        {matchModal && (
          <View style={styles.matchOverlay}>
            <Animated.View
              entering={FadeIn}
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5,5,10,0.92)' }]}
            />
            <Animated.View
              entering={ZoomIn.duration(400).springify()}
              style={styles.matchModal}
            >
              <View style={styles.matchIconContainer}>
                <MaterialCommunityIcons name="heart-multiple" size={56} color={colors.gold} />
              </View>
              <Text style={styles.matchTitle}>It's a Match!</Text>
              <Text style={styles.matchText}>
                You and {matchModal.profile?.name || matchModal.profile?.company_name} liked each other. Start a conversation now!
              </Text>
              <View style={styles.matchButtonRow}>
                <TouchableOpacity
                  style={styles.matchButtonSecondary}
                  onPress={() => setMatchModal(null)}
                >
                  <Text style={styles.matchButtonSecondaryText}>Keep Swiping</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.matchButton}
                  onPress={() => {
                    const matchId = matchModal.matchId;
                    const matchedProfile = matchModal.profile;
                    setMatchModal(null);
                    // Navigate to chat conversation with the matched user
                    navigation.navigate('ChatConversation', {
                      matchId: matchId,
                      otherUser: {
                        id: matchedProfile?.id,
                        name: matchedProfile?.name || matchedProfile?.company_name,
                        imageUrl: matchedProfile?.photo_url || matchedProfile?.photos?.[0],
                      },
                    });
                  }}
                >
                  <Feather name="message-circle" size={18} color={colors.background} />
                  <Text style={styles.matchButtonText}>Send Message</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        )}

        {/* Filter Modal */}
        <FilterModal
          visible={filterModalVisible}
          onClose={() => setFilterModalVisible(false)}
          onApply={handleApplyFilters}
          currentFilters={activeFilters}
          userRole={user?.role || 'worker'}
        />

        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Discover</Text>
            <Text style={styles.subtitle}>
              {user?.role === 'worker' ? 'Find your next opportunity' : 'Find talented workers'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
            onPress={() => setFilterModalVisible(true)}
          >
            <Feather name="sliders" size={20} color={hasActiveFilters ? colors.background : colors.text} />
            {hasActiveFilters && <View style={styles.filterBadge} />}
          </TouchableOpacity>
        </View>

        <View style={styles.cardsContainer}>
          {nextProfile && (
            <Animated.View style={[styles.cardWrapper, styles.nextCard, nextCardStyle]}>
              <SwipeCard user={nextProfile} />
            </Animated.View>
          )}

          <GestureDetector gesture={gesture}>
            <Animated.View style={[styles.cardWrapper, cardStyle]}>
              {/* Swipe Stamps */}
              <Animated.View style={[styles.likeStamp, likeOpacity]}>
                <Text style={styles.likeText}>LIKE</Text>
              </Animated.View>
              <Animated.View style={[styles.nopeStamp, nopeOpacity]}>
                <Text style={styles.nopeText}>NOPE</Text>
              </Animated.View>
              <Animated.View style={[styles.superLikeStamp, superLikeOpacity]}>
                <MaterialCommunityIcons name="star" size={32} color="#00D4FF" />
                <Text style={styles.superLikeText}>SUPER LIKE</Text>
              </Animated.View>

              <SwipeCard user={currentProfile} />
            </Animated.View>
          </GestureDetector>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.smallButton, history.length === 0 && styles.buttonDisabled]}
            onPress={handleUndo}
            disabled={history.length === 0}
          >
            <Feather
              name="rotate-ccw"
              size={18}
              color={history.length === 0 ? colors.textSecondary : colors.gold}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.mainButton, styles.nopeButton]}
            onPress={() => {
              translateX.value = withSpring(-width * 1.5);
              handleSwipeComplete('left');
            }}
          >
            <Feather name="x" size={28} color={colors.error} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.superLikeButton]}
            onPress={() => {
              translateY.value = withSpring(-height * 1.5);
              handleSwipeComplete('up');
            }}
          >
            <MaterialCommunityIcons name="star" size={24} color={colors.superLike} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.mainButton, styles.likeButton]}
            onPress={() => {
              translateX.value = withSpring(width * 1.5);
              handleSwipeComplete('right');
            }}
          >
            <Feather name="heart" size={26} color={colors.success} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.smallButton, styles.boostButton]}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              // Boost logic here
            }}
          >
            <MaterialCommunityIcons name="lightning-bolt" size={20} color={colors.purple} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  filterButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  cardsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardWrapper: {
    position: 'absolute',
    width: width * 0.92,
    height: height * 0.65,
    zIndex: 1,
  },
  nextCard: {
    zIndex: 0,
    transform: [{ scale: 0.94 }],
    opacity: 0.4,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
    paddingTop: 12,
    paddingHorizontal: 16,
    gap: 16,
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  smallButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderColor: colors.border,
  },
  mainButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  nopeButton: {
    borderColor: colors.error,
    backgroundColor: `${colors.error}15`,
  },
  superLikeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderColor: colors.superLike,
    backgroundColor: `${colors.superLike}15`,
  },
  likeButton: {
    borderColor: colors.success,
    backgroundColor: `${colors.success}15`,
  },
  boostButton: {
    borderColor: colors.purple,
    backgroundColor: `${colors.purple}15`,
  },
  likeStamp: {
    position: 'absolute',
    top: 50,
    left: 30,
    zIndex: 10,
    borderWidth: 4,
    borderColor: colors.success,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: `${colors.success}20`,
    transform: [{ rotate: '-15deg' }],
  },
  likeText: {
    color: colors.success,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
  },
  nopeStamp: {
    position: 'absolute',
    top: 50,
    right: 30,
    zIndex: 10,
    borderWidth: 4,
    borderColor: colors.error,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: `${colors.error}20`,
    transform: [{ rotate: '15deg' }],
  },
  nopeText: {
    color: colors.error,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
  },
  superLikeStamp: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    zIndex: 10,
    borderWidth: 4,
    borderColor: colors.superLike,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: `${colors.superLike}20`,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  superLikeText: {
    color: colors.superLike,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: colors.textSecondary,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  noMoreText: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
    color: colors.text,
  },
  noMoreSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 28,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: colors.gold,
    borderRadius: 12,
    gap: 8,
  },
  refreshButtonText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 15,
  },
  matchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5,5,10,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  matchModal: {
    backgroundColor: colors.card,
    padding: 28,
    borderRadius: 24,
    alignItems: 'center',
    marginHorizontal: 24,
    borderWidth: 1,
    borderColor: colors.border,
    width: width - 48,
  },
  matchIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: `${colors.gold}15`,
    borderWidth: 2,
    borderColor: colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.gold,
    marginTop: 20,
    marginBottom: 8,
  },
  matchText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  matchButtonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  matchButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  matchButtonSecondaryText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  matchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.gold,
    paddingVertical: 14,
    borderRadius: 12,
  },
  matchButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
});
