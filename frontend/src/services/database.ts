import { supabase } from '../lib/supabase';
import { badgeService } from './badgeService';
import { notificationService } from './notificationService';
import { FeedFilters } from '../types';
import { rankProfiles, RankedProfile, MatchScore } from '../utils/matchingAlgorithm';

// Re-export for convenience
export type { RankedProfile, MatchScore };

// ============================================
// USER PROFILES
// ============================================
export interface UserProfile {
  id: string;
  email: string;
  role: 'worker' | 'business';
  name: string;
  phone?: string;

  // Profile completion status
  is_profile_complete: boolean;

  // Verification & Status
  verified: boolean;
  verification_score: number;
  verification_date: string | null;
  is_active: boolean;
  last_online?: string;

  // Social/Auth
  auth_provider?: string;
  linkedin?: string;
  google_uid?: string;
  linkedin_uid?: string;

  // ============================================
  // WORKER-SPECIFIC FIELDS
  // ============================================
  job_title?: string;
  bio?: string;
  skills?: string[];
  experience_years?: number;
  education?: string;

  // Work Preferences
  expected_salary_min?: number;
  expected_salary_max?: number;
  salary?: string; // Legacy field for display
  preferred_employment?: string[];
  availability?: string;
  available_from?: string;
  willing_to_relocate?: boolean;

  // Location
  current_location?: string;
  location?: string;
  preferred_locations?: string[];

  // Documents & Verification
  resume_url?: string;
  cv_url?: string | null;
  cv_name?: string | null;
  certifications?: string[];
  portfolio_urls?: string[];

  // Additional Worker Info
  languages?: string[];

  // Media (Worker)
  photo_url?: string;
  avatar_url?: string;
  photos?: string[];
  video_intro_url?: string;

  // ============================================
  // BUSINESS-SPECIFIC FIELDS
  // ============================================
  company_name?: string;
  company_type?: string;
  company_size?: string;
  industry?: string;
  description?: string;
  website?: string;

  // Contact Person
  contact_person?: string;
  contact_position?: string;
  contact_phone?: string;

  // Business Locations
  multiple_locations?: string[];

  // Business Verification
  is_verified_business?: boolean;
  pan_number?: string;
  registration_number?: string;

  // Media (Business)
  logo_url?: string;
  cover_photo_url?: string;
  office_photos?: string[];

  // Hiring Preferences
  typically_hiring?: string[];
  benefits_offered?: string[];

  // Timestamps
  created_at: string;
  updated_at: string;
}

export const profileService = {
  // Get current user's profile
  async getCurrentProfile(): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  },

  // Create or update profile
  async upsertProfile(profile: Partial<UserProfile>): Promise<UserProfile | null> {
    // Try getUser first, fall back to getSession if needed
    let user = null;

    const { data: userData } = await supabase.auth.getUser();
    user = userData?.user;

    if (!user) {
      // Fallback: try to get user from session
      console.log('upsertProfile: getUser returned null, trying getSession...');
      const { data: sessionData } = await supabase.auth.getSession();
      user = sessionData?.session?.user;
    }

    if (!user) {
      // Last resort: use the profile.id if provided
      console.error('upsertProfile: No authenticated user from getUser or getSession');
      if (profile.id) {
        console.log('upsertProfile: Using profile.id as fallback:', profile.id);
        // Proceed with the upsert using the provided id
      } else {
        return null;
      }
    }

    // Filter out any base64 data URLs from photos/logo_url - they're too large for storage
    const cleanProfile = { ...profile };
    if (cleanProfile.photos) {
      cleanProfile.photos = cleanProfile.photos.filter(p => !p.startsWith('data:'));
      console.log('upsertProfile: Filtered photos array, remaining:', cleanProfile.photos.length);
    }
    if (cleanProfile.logo_url?.startsWith('data:')) {
      console.warn('upsertProfile: Removing base64 logo_url - use storage upload instead');
      delete cleanProfile.logo_url;
    }
    if (cleanProfile.photo_url?.startsWith('data:')) {
      console.warn('upsertProfile: Removing base64 photo_url - use storage upload instead');
      delete cleanProfile.photo_url;
    }

    const userId = user?.id || profile.id;
    const userEmail = user?.email || profile.email;

    console.log('upsertProfile: Saving profile for user:', userId);

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: userEmail,
        ...cleanProfile,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('upsertProfile: Supabase error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      // Throw the error with details so the caller can handle it
      throw new Error(`Database error: ${error.message} (${error.code})`);
    }
    console.log('upsertProfile: Success, profile saved');
    return data;
  },

  // Get profiles to swipe (opposite role) with optional filters
  // Returns profiles ranked by smart matching algorithm
  // NEW: Prioritizes unswiped profiles, then shows swiped ones when running out
  async getSwipeProfiles(
    currentRole: 'worker' | 'business',
    filters?: FeedFilters,
    options: { excludeSwiped?: boolean; allowAnyRole?: boolean } = { excludeSwiped: false, allowAnyRole: false }
  ): Promise<RankedProfile[]> {
    const targetRole = currentRole === 'worker' ? 'business' : 'worker';
    console.log('getSwipeProfiles: Looking for profiles with role:', targetRole, '(current user role:', currentRole, ')');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('getSwipeProfiles: No authenticated user');
      return [];
    }
    console.log('getSwipeProfiles: Current user ID:', user.id);

    // Get current user's profile for smart matching
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Get list of swiped profile IDs
    const { data: swipedIds } = await supabase
      .from('swipes')
      .select('swiped_id')
      .eq('swiper_id', user.id);

    const swipedIdList = swipedIds?.map(s => s.swiped_id) || [];
    console.log('getSwipeProfiles: User has swiped on', swipedIdList.length, 'profiles');

    // Get blocked user IDs (both directions)
    const { data: blockedData } = await supabase
      .from('blocks')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

    const blockedIds = blockedData?.map(b =>
      b.blocker_id === user.id ? b.blocked_id : b.blocker_id
    ) || [];

    // Base query - fetch ALL profiles (not excluding swiped ones)
    let query = supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .not('name', 'is', null)  // Must have a name at minimum
      .neq('name', '');

    // Apply role filter unless all roles are allowed
    if (!options.allowAnyRole) {
      query = query.eq('role', targetRole);
    }

    // Always exclude blocked profiles
    if (blockedIds.length > 0) {
      query = query.not('id', 'in', `(${blockedIds.join(',')})`);
    }

    // Apply filters
    if (filters) {
      // Filter by skills (array overlap) - for workers
      if (filters.skills && filters.skills.length > 0 && targetRole === 'worker') {
        query = query.overlaps('skills', filters.skills);
      }

      // Filter by location
      if (filters.location) {
        query = query.or(`current_location.ilike.%${filters.location}%,location.ilike.%${filters.location}%`);
      }

      // Filter by salary range (for workers)
      if (targetRole === 'worker') {
        if (filters.minSalary) {
          query = query.gte('expected_salary_max', filters.minSalary);
        }
        if (filters.maxSalary) {
          query = query.lte('expected_salary_min', filters.maxSalary);
        }
      }

      // Filter by experience
      if (filters.experienceMin !== undefined) {
        query = query.gte('experience_years', filters.experienceMin);
      }
      if (filters.experienceMax !== undefined) {
        query = query.lte('experience_years', filters.experienceMax);
      }

      // Filter by verified only
      if (filters.verifiedOnly) {
        query = query.eq('verified', true);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('getSwipeProfiles: Error fetching profiles:', error);
      return [];
    }

    console.log('getSwipeProfiles: Found', data?.length || 0, 'total profiles with role:', targetRole);

    if (!data || data.length === 0) {
      return [];
    }

    // Separate profiles into unswiped and swiped groups
    const unswipedProfiles = data.filter(p => !swipedIdList.includes(p.id));
    const swipedProfiles = data.filter(p => swipedIdList.includes(p.id));

    console.log('getSwipeProfiles: Unswiped:', unswipedProfiles.length, '| Swiped:', swipedProfiles.length);

    // Rank both groups by match score
    let rankedUnswiped: RankedProfile[] = [];
    let rankedSwiped: RankedProfile[] = [];

    if (currentUserProfile) {
      if (unswipedProfiles.length > 0) {
        rankedUnswiped = rankProfiles(currentUserProfile, unswipedProfiles);
      }
      if (swipedProfiles.length > 0) {
        rankedSwiped = rankProfiles(currentUserProfile, swipedProfiles);
      }
    } else {
      // No current profile, return with default scores
      const defaultScore = {
        overall: 50,
        skillMatch: 50,
        locationMatch: 50,
        salaryFit: 50,
        experienceScore: 50,
        availabilityScore: 50,
        profileQuality: 50
      };
      rankedUnswiped = unswipedProfiles.map(p => ({ ...p, matchScore: defaultScore }));
      rankedSwiped = swipedProfiles.map(p => ({ ...p, matchScore: defaultScore }));
    }

    // Combine: unswiped first, then swiped
    const combinedProfiles = [...rankedUnswiped, ...rankedSwiped];

    console.log('getSwipeProfiles: Returning', combinedProfiles.length, 'profiles (unswiped first, then swiped)');
    if (combinedProfiles.length > 0) {
      console.log('getSwipeProfiles: Top match:', {
        name: combinedProfiles[0].name || combinedProfiles[0].company_name,
        score: combinedProfiles[0].matchScore.overall,
        alreadySwiped: swipedIdList.includes(combinedProfiles[0].id)
      });
    }

    return combinedProfiles;
  },

  // Debug: Get all profiles summary (for troubleshooting feed issues)
  async debugGetAllProfiles(): Promise<void> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, company_name, role, is_profile_complete, email');

    if (error) {
      console.error('debugGetAllProfiles: Error:', error);
      return;
    }

    console.log('=== ALL PROFILES IN DATABASE ===');
    console.log('Total profiles:', data?.length || 0);
    data?.forEach((p, i) => {
      console.log(`[${i + 1}] ${p.name || p.company_name || 'No name'} | role: ${p.role} | complete: ${p.is_profile_complete} | email: ${p.email}`);
    });
    console.log('================================');
  },

  // Get profile by ID
  async getProfileById(id: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  },

  // Alias for getProfileById (for convenience)
  async getProfile(id: string): Promise<UserProfile | null> {
    return this.getProfileById(id);
  },

  // Get profiles by role (for feed)
  async getProfilesByRole(role: 'worker' | 'business'): Promise<UserProfile[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get profiles that haven't been swiped yet
    const { data: swipedIds } = await supabase
      .from('swipes')
      .select('swiped_id')
      .eq('swiper_id', user.id);

    const swipedIdList = swipedIds?.map(s => s.swiped_id) || [];

    let query = supabase
      .from('profiles')
      .select('*')
      .eq('role', role)
      .eq('is_profile_complete', true)
      .neq('id', user.id);

    if (swipedIdList.length > 0) {
      query = query.not('id', 'in', `(${swipedIdList.join(',')})`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching profiles by role:', error);
      return [];
    }
    return data || [];
  },
};

// ============================================
// SWIPES
// ============================================
export interface Swipe {
  id: string;
  swiper_id: string;
  swiped_id: string;
  direction: 'left' | 'right' | 'super';
  created_at: string;
}

export const swipeService = {
  // Record a swipe and check for match
  async recordSwipe(swipedId: string, direction: 'left' | 'right' | 'super'): Promise<{ isMatch: boolean; matchId?: string }> {
    console.log('[SwipeService] recordSwipe called:', { swipedId, direction });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[SwipeService] No authenticated user');
      return { isMatch: false };
    }
    console.log('[SwipeService] Current user:', user.id);

    // Record the swipe
    const { data: swipeData, error: swipeError } = await supabase
      .from('swipes')
      .insert({
        swiper_id: user.id,
        swiped_id: swipedId,
        direction,
      })
      .select()
      .single();

    if (swipeError) {
      console.error('[SwipeService] Error recording swipe:', swipeError);
      // If duplicate swipe, that's okay - continue to check for match
      if (swipeError.code !== '23505') {
        return { isMatch: false };
      }
      console.log('[SwipeService] Swipe already exists (duplicate), checking for match anyway');
    } else {
      console.log('[SwipeService] Swipe recorded successfully:', swipeData?.id);
    }

    // Only check for match on right/super swipes
    if (direction === 'left') {
      console.log('[SwipeService] Left swipe, no match check needed');
      return { isMatch: false };
    }

    // Check for mutual match
    console.log('[SwipeService] Checking for mutual swipe from', swipedId, 'to', user.id);
    const { data: mutualSwipe, error: mutualError } = await supabase
      .from('swipes')
      .select('*')
      .eq('swiper_id', swipedId)
      .eq('swiped_id', user.id)
      .in('direction', ['right', 'super'])
      .maybeSingle();

    if (mutualError) {
      console.error('[SwipeService] Error checking mutual swipe:', mutualError);
    }

    console.log('[SwipeService] Mutual swipe found:', mutualSwipe ? 'YES' : 'NO');

    if (mutualSwipe) {
      // It's a match! The database trigger should have created it, but let's verify
      const sortedIds = [user.id, swipedId].sort();
      console.log('[SwipeService] Sorted IDs for match lookup:', sortedIds);

      // First check if match already exists (created by trigger)
      const { data: existingMatch, error: existingError } = await supabase
        .from('matches')
        .select('id')
        .eq('user1_id', sortedIds[0])
        .eq('user2_id', sortedIds[1])
        .maybeSingle();

      if (existingError) {
        console.error('[SwipeService] Error checking existing match:', existingError);
      }

      if (existingMatch) {
        console.log('[SwipeService] Match already exists (from trigger):', existingMatch.id);
        return { isMatch: true, matchId: existingMatch.id };
      }

      // Match doesn't exist, create it manually
      console.log('[SwipeService] Creating match manually...');
      const { data: newMatch, error: matchError } = await supabase
        .from('matches')
        .insert({
          user1_id: sortedIds[0],
          user2_id: sortedIds[1],
          matched_at: new Date().toISOString(),
          is_active: true,
        })
        .select()
        .single();

      if (matchError) {
        console.error('[SwipeService] Error creating match:', matchError);
        // If duplicate, try to fetch it again
        if (matchError.code === '23505') {
          const { data: retryMatch } = await supabase
            .from('matches')
            .select('id')
            .eq('user1_id', sortedIds[0])
            .eq('user2_id', sortedIds[1])
            .single();

          if (retryMatch) {
            console.log('[SwipeService] Match found on retry:', retryMatch.id);
            return { isMatch: true, matchId: retryMatch.id };
          }
        }
        // Still return true since mutual swipe exists
        console.log('[SwipeService] Match creation failed but mutual swipe exists');
        return { isMatch: true, matchId: undefined };
      }

      console.log('[SwipeService] Match created successfully:', newMatch.id);

      // TRIGGER BADGE CHECK: Connections
      // Count total matches for this user
      const { count: matchCount } = await supabase
        .from('matches')
        .select('id', { count: 'exact', head: true })
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (matchCount) {
        badgeService.checkConnectionBadge(user.id, matchCount);
      }

      // TRIGGER NOTIFICATION: New Match
      // Notify current user
      await notificationService.createNotification(
        user.id,
        'new_match',
        'New Match! 💖',
        'You have a new match! Start chatting now.',
        { matchId: newMatch.id, otherUserId: swipedId }
      );
      // Notify other user (swipedId)
      await notificationService.createNotification(
        swipedId,
        'new_match',
        'New Match! 💖',
        'You have a new match! Start chatting now.',
        { matchId: newMatch.id, otherUserId: user.id }
      );

      return { isMatch: true, matchId: newMatch.id };
    }

    console.log('[SwipeService] No mutual swipe, no match');
    return { isMatch: false };
  },

  // Delete the last swipe recorded by the user
  // This is used for the "Undo" functionality
  async deleteLastSwipe(targetId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // We use the targetId to ensure we delete the correct one (safety check)
    const { error } = await supabase
      .from('swipes')
      .delete()
      .eq('swiper_id', user.id)
      .eq('swiped_id', targetId);

    if (error) {
      console.error('Error deleting swipe:', error);
      return false;
    }

    // Also check if we need to delete a match that was created by this swipe
    // Use sorted IDs to match how the database trigger creates matches
    const sortedIds = [user.id, targetId].sort();
    await supabase
      .from('matches')
      .delete()
      .eq('user1_id', sortedIds[0])
      .eq('user2_id', sortedIds[1]);

    return true;
  },

  // Reset all swipes for the current user
  async resetSwipes(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('swipes')
      .delete()
      .eq('swiper_id', user.id);

    if (error) {
      console.error('[SwipeService] Error resetting swipes:', error);
      return false;
    }

    console.log('[SwipeService] All swipes reset successfully for user:', user.id);
    return true;
  },
};

// ============================================
// MATCHES
// ============================================
export interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  matched_at: string;
  created_at: string;
  is_active: boolean;
  other_user?: UserProfile;
  last_message?: Message;
  unread_count?: number;
}

export const matchService = {
  // Get all matches for current user with unread counts
  async getMatches(): Promise<Match[]> {
    console.log('[MatchService] getMatches called');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[MatchService] No authenticated user');
      return [];
    }
    console.log('[MatchService] Getting matches for user:', user.id);

    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        user1:profiles!matches_user1_id_fkey(*),
        user2:profiles!matches_user2_id_fkey(*)
      `)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[MatchService] Error fetching matches:', error);
      return [];
    }

    console.log('[MatchService] Found', data?.length || 0, 'matches');

    // Get unread counts for each match
    const matchesWithUnread = await Promise.all((data || []).map(async (match) => {
      const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;

      // Count unread messages from the other user
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('match_id', match.id)
        .eq('sender_id', otherUserId)
        .eq('is_read', false);

      // Get last message for this match
      const { data: lastMsgData } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', match.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        ...match,
        other_user: match.user1_id === user.id ? match.user2 : match.user1,
        unread_count: count || 0,
        last_message: lastMsgData || undefined,
      };
    }));

    // Sort by last message time (most recent first)
    matchesWithUnread.sort((a, b) => {
      const aTime = a.last_message?.created_at || a.created_at;
      const bTime = b.last_message?.created_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    return matchesWithUnread;
  },

  // Debug: Get all swipes and matches for current user
  async debugGetSwipesAndMatches(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[DEBUG] No authenticated user');
      return;
    }

    console.log('=== DEBUG: SWIPES AND MATCHES ===');
    console.log('Current user ID:', user.id);

    // Get all swipes by current user
    const { data: mySwipes } = await supabase
      .from('swipes')
      .select('*')
      .eq('swiper_id', user.id);

    console.log('My swipes (I swiped on them):');
    mySwipes?.forEach(s => {
      console.log(`  → ${s.direction} on ${s.swiped_id} at ${s.created_at}`);
    });

    // Get all swipes on current user
    const { data: swipesOnMe } = await supabase
      .from('swipes')
      .select('*')
      .eq('swiped_id', user.id);

    console.log('Swipes on me (they swiped on me):');
    swipesOnMe?.forEach(s => {
      console.log(`  ← ${s.direction} from ${s.swiper_id} at ${s.created_at}`);
    });

    // Get all matches
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

    console.log('My matches:');
    matches?.forEach(m => {
      const otherUserId = m.user1_id === user.id ? m.user2_id : m.user1_id;
      console.log(`  ♥ Match ${m.id} with ${otherUserId} (active: ${m.is_active})`);
    });

    console.log('=================================');
  },

  // Get match by ID
  async getMatchById(matchId: string): Promise<Match | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        user1:profiles!matches_user1_id_fkey(*),
        user2:profiles!matches_user2_id_fkey(*)
      `)
      .eq('id', matchId)
      .single();

    if (error) {
      console.error('Error fetching match:', error);
      return null;
    }

    return {
      ...data,
      other_user: data.user1_id === user.id ? data.user2 : data.user1,
    };
  },
};

// ============================================
// MESSAGES
// ============================================
export type MessageType = 'text' | 'image' | 'document' | 'voice' | 'video' | 'location';
export type DeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string | null;
  message_type: MessageType;
  media_url?: string;
  media_thumbnail_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  media_width?: number;
  media_height?: number;
  media_duration?: number; // For voice/video in seconds
  is_deleted?: boolean;
  reply_to_id?: string;
  delivery_status: DeliveryStatus;
  is_read?: boolean;
  read_at?: string;
  created_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
}

export const messageService = {
  // Get messages for a match
  async getMessages(matchId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
    // Map database response to ensure correct types with defaults for older messages
    return (data || []).map(msg => ({
      ...msg,
      message_type: msg.message_type || 'text',
      delivery_status: msg.delivery_status || 'sent',
    }));
  },

  // Send a text message
  async sendMessage(matchId: string, content: string): Promise<Message | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('messages')
      .insert({
        match_id: matchId,
        sender_id: user.id,
        content,
        message_type: 'text',
        delivery_status: 'sent',
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return null;
    }
    return { ...data, message_type: data.message_type || 'text', delivery_status: data.delivery_status || 'sent' };
  },

  // Send a media message (image, document, voice, video)
  async sendMediaMessage(
    matchId: string,
    mediaType: MessageType,
    mediaUrl: string,
    options: {
      content?: string;
      fileName?: string;
      fileSize?: number;
      fileType?: string;
      thumbnailUrl?: string;
      width?: number;
      height?: number;
      duration?: number;
      replyToId?: string;
    } = {}
  ): Promise<Message | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('messages')
      .insert({
        match_id: matchId,
        sender_id: user.id,
        content: options.content || null,
        message_type: mediaType,
        media_url: mediaUrl,
        media_thumbnail_url: options.thumbnailUrl,
        file_name: options.fileName,
        file_size: options.fileSize,
        file_type: options.fileType,
        media_width: options.width,
        media_height: options.height,
        media_duration: options.duration,
        reply_to_id: options.replyToId,
        delivery_status: 'sent',
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending media message:', error);
      return null;
    }
    return data;
  },

  // Upload chat attachment to storage
  async uploadChatAttachment(
    matchId: string,
    uri: string,
    fileType: string,
    fileName?: string
  ): Promise<{ url: string; thumbnailUrl?: string } | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    try {
      // Generate unique file name
      const timestamp = Date.now();
      const extension = fileName?.split('.').pop() || fileType.split('/')[1] || 'file';
      const uniqueFileName = `${matchId}/${user.id}/${timestamp}.${extension}`;

      // Fetch the file as blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload to chat-attachments bucket
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(uniqueFileName, blob, {
          contentType: fileType,
          cacheControl: '3600',
        });

      if (error) {
        console.error('Error uploading chat attachment:', error);
        return null;
      }

      // Get signed URL (private bucket)
      const { data: urlData } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(data.path, 60 * 60 * 24 * 7); // 7 days

      return {
        url: urlData?.signedUrl || '',
        thumbnailUrl: fileType.startsWith('image/') ? urlData?.signedUrl : undefined,
      };
    } catch (error) {
      console.error('Error in uploadChatAttachment:', error);
      return null;
    }
  },

  // Delete a message (soft delete)
  async deleteMessage(messageId: string): Promise<boolean> {
    const { error } = await supabase
      .from('messages')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        content: null,
        media_url: null,
      })
      .eq('id', messageId);

    if (error) {
      console.error('Error deleting message:', error);
      return false;
    }
    return true;
  },

  // Add reaction to message
  async addReaction(messageId: string, reaction: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('message_reactions')
      .upsert({
        message_id: messageId,
        user_id: user.id,
        reaction,
      });

    if (error) {
      console.error('Error adding reaction:', error);
      return false;
    }
    return true;
  },

  // Remove reaction from message
  async removeReaction(messageId: string, reaction: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .match({ message_id: messageId, user_id: user.id, reaction });

    if (error) {
      console.error('Error removing reaction:', error);
      return false;
    }
    return true;
  },

  // Get reactions for a message
  async getReactions(messageId: string): Promise<MessageReaction[]> {
    const { data, error } = await supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', messageId);

    if (error) {
      console.error('Error getting reactions:', error);
      return [];
    }
    return data || [];
  },

  // Subscribe to new messages and updates
  subscribeToMessages(matchId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`messages:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();
  },

  // Mark messages as read
  async markAsRead(matchId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Mark all unread messages from the other user as read
    const { error } = await supabase
      .from('messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('match_id', matchId)
      .neq('sender_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking messages as read:', error);
      return false;
    }
    return true;
  },

  // Get unread count for a match
  async getUnreadCount(matchId: string): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('match_id', matchId)
      .neq('sender_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
    return count || 0;
  },
};

// ============================================
// TYPING INDICATORS
// ============================================
export const typingService = {
  // Set typing status
  async setTyping(matchId: string, isTyping: boolean): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('typing_indicators')
      .upsert({
        match_id: matchId,
        user_id: user.id,
        is_typing: isTyping,
        updated_at: new Date().toISOString(),
      });
  },

  // Subscribe to typing indicators
  subscribeToTyping(matchId: string, callback: (userId: string, isTyping: boolean) => void) {
    return supabase
      .channel(`typing:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const data = payload.new as any;
          if (data) {
            callback(data.user_id, data.is_typing);
          }
        }
      )
      .subscribe();
  },
};

// ============================================
// PRESENCE / ONLINE STATUS
// ============================================
export const presenceService = {
  // Update user presence
  async updatePresence(isOnline: boolean, currentMatchId?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('user_presence')
      .upsert({
        user_id: user.id,
        is_online: isOnline,
        last_seen: new Date().toISOString(),
        current_match_id: currentMatchId || null,
      });
  },

  // Get user presence
  async getPresence(userId: string): Promise<{ isOnline: boolean; lastSeen: string | null } | null> {
    const { data, error } = await supabase
      .from('user_presence')
      .select('is_online, last_seen')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return { isOnline: data.is_online, lastSeen: data.last_seen };
  },

  // Subscribe to presence changes
  subscribeToPresence(userId: string, callback: (isOnline: boolean, lastSeen: string) => void) {
    return supabase
      .channel(`presence:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const data = payload.new as any;
          if (data) {
            callback(data.is_online, data.last_seen);
          }
        }
      )
      .subscribe();
  },
};

// ============================================
// VOICE/VIDEO CALLS
// ============================================
export type CallType = 'voice' | 'video';
export type CallStatus = 'initiated' | 'ringing' | 'accepted' | 'connected' | 'ended' | 'missed' | 'declined' | 'busy' | 'failed';

export interface CallLog {
  id: string;
  match_id: string;
  caller_id: string;
  receiver_id: string;
  call_type: CallType;
  status: CallStatus;
  started_at: string;
  accepted_at?: string;
  connected_at?: string;
  ended_at?: string;
  duration_seconds: number;
  end_reason?: string;
  created_at: string;
}

export interface ActiveCall {
  id: string;
  call_log_id: string;
  match_id: string;
  caller_id: string;
  receiver_id: string;
  call_type: CallType;
  caller_sdp?: string;
  receiver_sdp?: string;
  ice_candidates: any[];
  status: string;
}

export const callService = {
  // Initiate a call
  async initiateCall(matchId: string, receiverId: string, callType: CallType): Promise<{ callLog: CallLog; activeCall: ActiveCall } | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Create call log
    const { data: callLog, error: logError } = await supabase
      .from('call_logs')
      .insert({
        match_id: matchId,
        caller_id: user.id,
        receiver_id: receiverId,
        call_type: callType,
        status: 'initiated',
      })
      .select()
      .single();

    if (logError || !callLog) {
      console.error('Error creating call log:', logError);
      return null;
    }

    // Create active call for signaling
    const { data: activeCall, error: activeError } = await supabase
      .from('active_calls')
      .insert({
        call_log_id: callLog.id,
        match_id: matchId,
        caller_id: user.id,
        receiver_id: receiverId,
        call_type: callType,
        status: 'ringing',
      })
      .select()
      .single();

    if (activeError || !activeCall) {
      console.error('Error creating active call:', activeError);
      // Cleanup call log
      await supabase.from('call_logs').delete().eq('id', callLog.id);
      return null;
    }

    // Update call log status to ringing
    await supabase
      .from('call_logs')
      .update({ status: 'ringing' })
      .eq('id', callLog.id);

    return { callLog, activeCall };
  },

  // Accept a call
  async acceptCall(activeCallId: string): Promise<boolean> {
    const { error } = await supabase
      .from('active_calls')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', activeCallId);

    if (error) {
      console.error('Error accepting call:', error);
      return false;
    }

    // Update call log
    const { data: activeCall } = await supabase
      .from('active_calls')
      .select('call_log_id')
      .eq('id', activeCallId)
      .single();

    if (activeCall) {
      await supabase
        .from('call_logs')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', activeCall.call_log_id);
    }

    return true;
  },

  // Decline a call
  async declineCall(activeCallId: string): Promise<boolean> {
    const { data: activeCall } = await supabase
      .from('active_calls')
      .select('call_log_id')
      .eq('id', activeCallId)
      .single();

    if (activeCall) {
      await supabase
        .from('call_logs')
        .update({
          status: 'declined',
          ended_at: new Date().toISOString(),
          end_reason: 'receiver_declined',
        })
        .eq('id', activeCall.call_log_id);
    }

    // Delete active call
    await supabase.from('active_calls').delete().eq('id', activeCallId);
    return true;
  },

  // End a call
  async endCall(activeCallId: string, endReason: string = 'normal'): Promise<boolean> {
    const { data: activeCall } = await supabase
      .from('active_calls')
      .select('call_log_id, created_at')
      .eq('id', activeCallId)
      .single();

    if (activeCall) {
      const duration = Math.floor((Date.now() - new Date(activeCall.created_at).getTime()) / 1000);

      await supabase
        .from('call_logs')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          duration_seconds: duration,
          end_reason: endReason,
        })
        .eq('id', activeCall.call_log_id);
    }

    // Delete active call
    await supabase.from('active_calls').delete().eq('id', activeCallId);
    return true;
  },

  // Update SDP (WebRTC signaling)
  async updateSDP(activeCallId: string, sdp: string, isCaller: boolean): Promise<boolean> {
    const field = isCaller ? 'caller_sdp' : 'receiver_sdp';
    const { error } = await supabase
      .from('active_calls')
      .update({ [field]: sdp, updated_at: new Date().toISOString() })
      .eq('id', activeCallId);

    return !error;
  },

  // Add ICE candidate
  async addIceCandidate(activeCallId: string, candidate: any): Promise<boolean> {
    const { data: currentCall } = await supabase
      .from('active_calls')
      .select('ice_candidates')
      .eq('id', activeCallId)
      .single();

    if (!currentCall) return false;

    const candidates = [...(currentCall.ice_candidates || []), candidate];

    const { error } = await supabase
      .from('active_calls')
      .update({ ice_candidates: candidates, updated_at: new Date().toISOString() })
      .eq('id', activeCallId);

    return !error;
  },

  // Subscribe to incoming calls
  subscribeToIncomingCalls(callback: (activeCall: ActiveCall) => void) {
    return supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return null;

      return supabase
        .channel(`calls:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'active_calls',
            filter: `receiver_id=eq.${user.id}`,
          },
          (payload) => {
            callback(payload.new as ActiveCall);
          }
        )
        .subscribe();
    });
  },

  // Subscribe to call updates (for SDP/ICE exchange)
  subscribeToCallUpdates(activeCallId: string, callback: (activeCall: ActiveCall) => void) {
    return supabase
      .channel(`call:${activeCallId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'active_calls',
          filter: `id=eq.${activeCallId}`,
        },
        (payload) => {
          callback(payload.new as ActiveCall);
        }
      )
      .subscribe();
  },

  // Get call history
  async getCallHistory(limit: number = 50): Promise<CallLog[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting call history:', error);
      return [];
    }
    return data || [];
  },

  // Check for active incoming call
  async checkIncomingCall(): Promise<ActiveCall | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('active_calls')
      .select('*')
      .eq('receiver_id', user.id)
      .eq('status', 'ringing')
      .single();

    if (error || !data) return null;
    return data;
  },
};

// ============================================
// STORAGE (Photos, Documents, Logos)
// ============================================
// Bucket names must match what's created in Supabase Dashboard
const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  DOCUMENTS: 'documents',
  COMPANY_LOGOS: 'company-logos',
  JOB_IMAGES: 'job-images',
};

export const storageService = {
  // Upload profile photo (avatar)
  // userId parameter is optional - if provided, skip auth check (useful when auth state is known)
  async uploadProfilePhoto(uri: string, userId?: string): Promise<string | null> {
    let finalUserId = userId;

    // If userId not provided, try to get from auth
    if (!finalUserId) {
      // Retry logic for auth - sometimes session takes a moment to be available
      for (let attempt = 0; attempt < 3; attempt++) {
        // Try getUser first
        const userResult = await supabase.auth.getUser();
        console.log(`uploadProfilePhoto: getUser attempt ${attempt + 1}:`, userResult.data.user?.id || 'null', userResult.error?.message || 'no error');

        if (userResult.data.user) {
          finalUserId = userResult.data.user.id;
          break;
        }

        // Try getSession as fallback
        const sessionResult = await supabase.auth.getSession();
        console.log(`uploadProfilePhoto: getSession attempt ${attempt + 1}:`, sessionResult.data.session?.user?.id || 'null');

        if (sessionResult.data.session?.user) {
          finalUserId = sessionResult.data.session.user.id;
          break;
        }

        // Wait briefly before retry
        if (attempt < 2) {
          console.log(`uploadProfilePhoto: Auth not ready, retrying (${attempt + 1}/3)...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    if (!finalUserId) {
      console.error('uploadProfilePhoto: No authenticated user after 3 attempts');
      return null;
    }

    console.log('uploadProfilePhoto: Using user ID:', finalUserId);

    try {
      // Handle base64 data URIs (common on web)
      let blob: Blob;
      if (uri.startsWith('data:')) {
        console.log('uploadProfilePhoto: Converting base64 data URI to blob...');
        const response = await fetch(uri);
        blob = await response.blob();
      } else {
        console.log('uploadProfilePhoto: Fetching image from URI:', uri.substring(0, 100) + '...');
        const response = await fetch(uri);
        blob = await response.blob();
      }

      console.log('uploadProfilePhoto: Blob created, size:', blob.size, 'type:', blob.type);

      // Determine content type - convert HEIC to JPEG on server
      let contentType = blob.type || 'image/jpeg';
      // HEIC is not widely supported, use jpeg as default
      if (contentType === 'image/heic' || contentType === 'image/heif') {
        contentType = 'image/jpeg';
      }

      const fileName = `${finalUserId}/profile-${Date.now()}.jpg`;
      console.log('uploadProfilePhoto: Uploading to bucket:', STORAGE_BUCKETS.AVATARS, 'path:', fileName);

      const { error, data } = await supabase.storage
        .from(STORAGE_BUCKETS.AVATARS)
        .upload(fileName, blob, {
          contentType: contentType,
          upsert: true,
        });

      if (error) {
        console.error('uploadProfilePhoto: Upload error:', error.message, error);
        return null;
      }

      console.log('uploadProfilePhoto: Upload successful, path:', data?.path);

      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKETS.AVATARS)
        .getPublicUrl(fileName);

      console.log('uploadProfilePhoto: Public URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('uploadProfilePhoto: Exception:', error);
      return null;
    }
  },

  // Upload CV/Resume
  async uploadCV(uri: string, fileName: string): Promise<{ url: string; name: string } | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    try {
      const response = await fetch(uri);
      if (!response.ok) {
        console.error('Error fetching CV file:', response.status);
        return null;
      }
      const blob = await response.blob();

      // Detect content type from file extension or blob type
      const extension = fileName.split('.').pop()?.toLowerCase();
      let contentType = blob.type || 'application/octet-stream';
      if (extension === 'pdf') contentType = 'application/pdf';
      else if (extension === 'doc') contentType = 'application/msword';
      else if (extension === 'docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      const storagePath = `${user.id}/resume_${Date.now()}_${fileName}`;

      const { error } = await supabase.storage
        .from(STORAGE_BUCKETS.DOCUMENTS)
        .upload(storagePath, blob, {
          contentType,
          upsert: true,
        });

      if (error) {
        console.error('Error uploading CV:', error);
        return null;
      }

      // Documents bucket is private, need signed URL
      const { data, error: signError } = await supabase.storage
        .from(STORAGE_BUCKETS.DOCUMENTS)
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

      if (signError) {
        console.error('Error getting signed URL:', signError);
        return null;
      }

      return { url: data.signedUrl, name: fileName };
    } catch (error) {
      console.error('Error uploading CV:', error);
      return null;
    }
  },

  // Upload certificate
  async uploadCertificate(uri: string, fileName: string): Promise<{ url: string; name: string } | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const storagePath = `${user.id}/certificate_${Date.now()}_${fileName}`;

      const { error } = await supabase.storage
        .from(STORAGE_BUCKETS.DOCUMENTS)
        .upload(storagePath, blob, {
          upsert: true,
        });

      if (error) {
        console.error('Error uploading certificate:', error);
        return null;
      }

      const { data, error: signError } = await supabase.storage
        .from(STORAGE_BUCKETS.DOCUMENTS)
        .createSignedUrl(storagePath, 3600);

      if (signError) {
        console.error('Error getting signed URL:', signError);
        return null;
      }

      return { url: data.signedUrl, name: fileName };
    } catch (error) {
      console.error('Error uploading certificate:', error);
      return null;
    }
  },

  // Upload company logo
  async uploadCompanyLogo(uri: string): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storagePath = `${user.id}/logo_${Date.now()}.jpg`;

      const { error } = await supabase.storage
        .from(STORAGE_BUCKETS.COMPANY_LOGOS)
        .upload(storagePath, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        console.error('Error uploading logo:', error);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKETS.COMPANY_LOGOS)
        .getPublicUrl(storagePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      return null;
    }
  },

  /**
   * Upload a file to Supabase Storage (Generic)
   */
  async uploadFile(bucket: string, path: string, file: any): Promise<{ url: string; error: string | null }> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          upsert: true,
          contentType: file.type || 'application/octet-stream',
        });

      if (error) {
        console.error(`Error uploading to ${bucket}:`, error);
        return { url: null, error: error.message };
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return { url: publicUrl, error: null };
    } catch (err: any) {
      console.error(`Unexpected error uploading to ${bucket}:`, err);
      return { url: null, error: err.message };
    }
  },

  /**
   * Delete a file from Supabase Storage (Generic)
   */
  async deleteFile(bucket: string, path: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        console.error(`Error deleting from ${bucket}:`, error);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      console.error(`Unexpected error deleting from ${bucket}:`, err);
      return { success: false, error: err.message };
    }
  }
};

// ============================================
// ACCOUNT MANAGEMENT
// ============================================
export const accountService = {
  // Delete user account and all associated data
  async deleteAccount(): Promise<{ success: boolean; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      // Delete in order to respect foreign key constraints:
      // 1. Delete messages (references matches)
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('sender_id', user.id);
      if (messagesError) console.error('Error deleting messages:', messagesError);

      // 2. Delete matches (references profiles)
      const { error: matchesError1 } = await supabase
        .from('matches')
        .delete()
        .eq('user1_id', user.id);
      if (matchesError1) console.error('Error deleting matches (user1):', matchesError1);

      const { error: matchesError2 } = await supabase
        .from('matches')
        .delete()
        .eq('user2_id', user.id);
      if (matchesError2) console.error('Error deleting matches (user2):', matchesError2);

      // 3. Delete swipes
      const { error: swipesError1 } = await supabase
        .from('swipes')
        .delete()
        .eq('swiper_id', user.id);
      if (swipesError1) console.error('Error deleting swipes (swiper):', swipesError1);

      const { error: swipesError2 } = await supabase
        .from('swipes')
        .delete()
        .eq('swiped_id', user.id);
      if (swipesError2) console.error('Error deleting swipes (swiped):', swipesError2);

      // 4. Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
      if (profileError) console.error('Error deleting profile:', profileError);

      // 5. Delete storage files (photos and CVs)
      try {
        // List and delete photos
        const { data: photoFiles } = await supabase.storage
          .from('photos')
          .list(user.id);
        if (photoFiles && photoFiles.length > 0) {
          const photoFilePaths = photoFiles.map(f => `${user.id}/${f.name}`);
          await supabase.storage.from('photos').remove(photoFilePaths);
        }

        // List and delete CVs
        const { data: cvFiles } = await supabase.storage
          .from('cvs')
          .list(user.id);
        if (cvFiles && cvFiles.length > 0) {
          const cvFilePaths = cvFiles.map(f => `${user.id}/${f.name}`);
          await supabase.storage.from('cvs').remove(cvFilePaths);
        }
      } catch (storageError) {
        console.error('Error deleting storage files:', storageError);
      }

      // 6. Sign out the user (this doesn't delete the auth user, but clears the session)
      await supabase.auth.signOut();

      return { success: true };
    } catch (error) {
      console.error('Error deleting account:', error);
      return { success: false, error: 'Failed to delete account' };
    }
  },
};

// ============================================
// REPORTS
// ============================================
export const reportService = {
  // Create a new report
  async createReport(
    reportedId: string,
    reason: 'inappropriate_content' | 'harassment' | 'spam' | 'fake_profile' | 'scam' | 'other',
    description?: string
  ): Promise<{ success: boolean; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
      .from('reports')
      .insert({
        reporter_id: user.id,
        reported_id: reportedId,
        reason,
        description,
      });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'You have already reported this user' };
      }
      console.error('Error creating report:', error);
      return { success: false, error: 'Failed to create report' };
    }

    return { success: true };
  },

  // Get reports made by current user
  async getMyReports(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('reports')
      .select('*, reported:reported_id(name, company_name, photo_url, logo_url)')
      .eq('reporter_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
      return [];
    }

    return data || [];
  },
};

// ============================================
// BLOCKS
// ============================================
export const blockService = {
  // Block a user
  async blockUser(blockedId: string): Promise<{ success: boolean; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
      .from('blocks')
      .insert({
        blocker_id: user.id,
        blocked_id: blockedId,
      });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'User is already blocked' };
      }
      console.error('Error blocking user:', error);
      return { success: false, error: 'Failed to block user' };
    }

    return { success: true };
  },

  // Unblock a user
  async unblockUser(blockedId: string): Promise<{ success: boolean; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedId);

    if (error) {
      console.error('Error unblocking user:', error);
      return { success: false, error: 'Failed to unblock user' };
    }

    return { success: true };
  },

  // Get blocked users
  async getBlockedUsers(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('blocks')
      .select('*, blocked:blocked_id(id, name, company_name, photo_url, logo_url, role)')
      .eq('blocker_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching blocked users:', error);
      return [];
    }

    return data || [];
  },

  // Check if a user is blocked
  async isUserBlocked(userId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('blocks')
      .select('id')
      .or(`blocker_id.eq.${user.id}.and.blocked_id.eq.${userId},blocker_id.eq.${userId}.and.blocked_id.eq.${user.id}`)
      .limit(1);

    if (error) {
      console.error('Error checking block status:', error);
      return false;
    }

    return (data?.length ?? 0) > 0;
  },
};

// ============================================
// REVIEWS
// ============================================
export const reviewService = {
  // Create a review
  async createReview(input: {
    reviewed_id: string;
    match_id: string;
    rating: number;
    comment?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    if (input.rating < 1 || input.rating > 5) {
      return { success: false, error: 'Rating must be between 1 and 5' };
    }

    const { error } = await supabase
      .from('reviews')
      .insert({
        reviewer_id: user.id,
        reviewed_id: input.reviewed_id,
        match_id: input.match_id,
        rating: input.rating,
        comment: input.comment,
      });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'You have already reviewed this match' };
      }
      console.error('Error creating review:', error);
      return { success: false, error: 'Failed to create review' };
    }

    return { success: true };
  },

  // Get reviews for a user
  async getReviewsForUser(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, reviewer:reviewer_id(name, company_name, photo_url, logo_url, role)')
      .eq('reviewed_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }

    // Map reviewer info to flat fields
    return (data || []).map((review: any) => ({
      ...review,
      reviewer_name: review.reviewer?.name || review.reviewer?.company_name || 'Anonymous',
      reviewer_photo: review.reviewer?.photo_url || review.reviewer?.logo_url,
    }));
  },

  // Get average rating for a user
  async getAverageRating(userId: string): Promise<{ average: number; count: number }> {
    const { data, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewed_id', userId);

    if (error) {
      console.error('Error fetching average rating:', error);
      return { average: 0, count: 0 };
    }

    if (!data || data.length === 0) {
      return { average: 0, count: 0 };
    }

    const sum = data.reduce((acc, r) => acc + r.rating, 0);
    return {
      average: Math.round((sum / data.length) * 10) / 10,
      count: data.length,
    };
  },

  // Check if current user has reviewed a match
  async hasReviewedMatch(matchId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('reviews')
      .select('id')
      .eq('reviewer_id', user.id)
      .eq('match_id', matchId)
      .limit(1);

    if (error) {
      console.error('Error checking review status:', error);
      return false;
    }

    return (data?.length ?? 0) > 0;
  },
};

// ============================================
// JOB POSTS
// ============================================
export interface JobPost {
  id: string;
  business_id: string;
  title: string;
  description: string;
  requirements: string[];
  skills_required: string[];
  employment_type: 'full_time' | 'part_time' | 'contract' | 'daily_wage';
  salary_min?: number;
  salary_max?: number;
  salary_negotiable: boolean;
  location: string;
  is_remote: boolean;
  status: 'active' | 'paused' | 'filled' | 'expired';
  applications_count: number;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  business?: {
    company_name: string;
    logo_url?: string;
    industry?: string;
    is_verified_business?: boolean;
  };
}

export interface CreateJobPostInput {
  title: string;
  description: string;
  requirements?: string[];
  skills_required?: string[];
  employment_type: 'full_time' | 'part_time' | 'contract' | 'daily_wage';
  salary_min?: number;
  salary_max?: number;
  salary_negotiable?: boolean;
  location: string;
  is_remote?: boolean;
  expires_at?: string;
}

export const jobPostService = {
  // Create a new job post
  async createJobPost(input: CreateJobPostInput): Promise<JobPost | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('job_posts')
      .insert({
        business_id: user.id,
        title: input.title,
        description: input.description,
        requirements: input.requirements || [],
        skills_required: input.skills_required || [],
        employment_type: input.employment_type,
        salary_min: input.salary_min,
        salary_max: input.salary_max,
        // salary_negotiable: input.salary_negotiable ?? false, // Column missing in DB cache
        location: input.location,
        is_remote: input.is_remote ?? false,
        expires_at: input.expires_at,
        status: 'active',
        // applications_count: 0, // Removed to let DB default handle it and avoid schema error
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating job post:', error);
      return null;
    }
    return data;
  },

  // Get all active job posts (for workers to browse)
  async getJobPosts(filters?: {
    skills?: string[];
    location?: string;
    employmentType?: string;
    isRemote?: boolean;
  }): Promise<JobPost[]> {
    let query = supabase
      .from('job_posts')
      .select(`
        *,
        business:business_id(company_name, logo_url, industry, verified)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.skills && filters.skills.length > 0) {
      query = query.overlaps('skills_required', filters.skills);
    }
    if (filters?.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }
    if (filters?.employmentType) {
      query = query.eq('employment_type', filters.employmentType);
    }
    if (filters?.isRemote !== undefined) {
      query = query.eq('is_remote', filters.isRemote);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching job posts:', error);
      return [];
    }
    return data || [];
  },

  // Get job posts by current business user
  async getMyJobPosts(): Promise<JobPost[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('job_posts')
      .select('*')
      .eq('business_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching my job posts:', error);
      return [];
    }
    return data || [];
  },

  // Get a single job post by ID
  async getJobPostById(id: string): Promise<JobPost | null> {
    const { data, error } = await supabase
      .from('job_posts')
      .select(`
        *,
        business:business_id(company_name, logo_url, industry, verified, description, location, website)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching job post:', error);
      return null;
    }
    return data;
  },

  // Update a job post
  async updateJobPost(id: string, updates: Partial<CreateJobPostInput> & { status?: string }): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('job_posts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('business_id', user.id); // Ensure user owns this post

    if (error) {
      console.error('Error updating job post:', error);
      return false;
    }
    return true;
  },

  // Delete a job post
  async deleteJobPost(id: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('job_posts')
      .delete()
      .eq('id', id)
      .eq('business_id', user.id); // Ensure user owns this post

    if (error) {
      console.error('Error deleting job post:', error);
      return false;
    }
    return true;
  },

  // Toggle job post status (active/paused)
  async toggleJobPostStatus(id: string, newStatus: 'active' | 'paused' | 'filled'): Promise<boolean> {
    return this.updateJobPost(id, { status: newStatus });
  },

  // Get swipeable job posts for workers (for swipe feed integration)
  async getSwipeableJobPosts(filters?: FeedFilters): Promise<JobPost[]> {
    console.log('getSwipeableJobPosts: Fetching job posts for worker swipe feed');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('getSwipeableJobPosts: No authenticated user');
      return [];
    }

    // Get job IDs the worker has already applied to
    const { data: applications } = await supabase
      .from('job_applications')
      .select('job_post_id')
      .eq('worker_id', user.id);

    const appliedJobIds = applications?.map(a => a.job_post_id) || [];
    console.log('getSwipeableJobPosts: Worker has applied to', appliedJobIds.length, 'jobs');

    // Get blocked business IDs
    const { data: blockedData } = await supabase
      .from('blocks')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

    const blockedBusinessIds = blockedData?.map(b =>
      b.blocker_id === user.id ? b.blocked_id : b.blocker_id
    ) || [];

    // Fetch active job posts
    let query = supabase
      .from('job_posts')
      .select(`
        *,
        profiles:business_id(
          id,
          company_name,
          logo_url,
          industry,
          is_verified_business,
          location
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // Exclude jobs already applied to
    if (appliedJobIds.length > 0) {
      query = query.not('id', 'in', `(${appliedJobIds.join(',')})`);
    }

    // Exclude jobs from blocked businesses
    if (blockedBusinessIds.length > 0) {
      query = query.not('business_id', 'in', `(${blockedBusinessIds.join(',')})`);
    }

    // Apply filters
    if (filters) {
      if (filters.skills && filters.skills.length > 0) {
        query = query.overlaps('skills_required', filters.skills);
      }
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }
      if (filters.minSalary) {
        query = query.gte('salary_max', filters.minSalary);
      }
      if (filters.maxSalary) {
        query = query.lte('salary_min', filters.maxSalary);
      }
    }

    const { data, error } = await query.limit(20); // Limit to 20 job posts

    if (error) {
      console.error('getSwipeableJobPosts: Error fetching job posts:', error);
      return [];
    }

    console.log('getSwipeableJobPosts: Found', data?.length || 0, 'job posts');

    // Transform to include business info properly
    const transformedJobs = (data || []).map(job => ({
      ...job,
      business: job.profiles ? {
        company_name: job.profiles.company_name,
        logo_url: job.profiles.logo_url,
        industry: job.profiles.industry,
        is_verified_business: job.profiles.is_verified_business,
      } : undefined
    }));

    return transformedJobs;
  },
};

// ============================================
// JOB APPLICATIONS
// ============================================
export type ApplicationStatus =
  | 'applied'      // Worker applied
  | 'viewed'       // Business viewed application
  | 'shortlisted'  // Business shortlisted
  | 'interview'    // Scheduled for interview
  | 'offered'      // Job offered
  | 'accepted'     // Worker accepted offer
  | 'rejected'     // Business rejected
  | 'withdrawn';   // Worker withdrew

export interface JobApplication {
  id: string;
  job_post_id: string;
  worker_id: string;
  status: ApplicationStatus;
  cover_message?: string;
  applied_at: string;
  status_updated_at: string;
  interview_scheduled_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  job_post?: JobPost;
  worker?: {
    id: string;
    name: string;
    photo_url?: string;
    job_title?: string;
    skills?: string[];
    experience_years?: number;
    current_location?: string;
  };
}

export const jobApplicationService = {
  // Worker applies to a job
  async applyToJob(jobPostId: string, coverMessage?: string): Promise<JobApplication | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check if already applied
    const { data: existing } = await supabase
      .from('job_applications')
      .select('id')
      .eq('job_post_id', jobPostId)
      .eq('worker_id', user.id)
      .single();

    if (existing) {
      console.log('Already applied to this job');
      return null;
    }

    const { data, error } = await supabase
      .from('job_applications')
      .insert({
        job_post_id: jobPostId,
        worker_id: user.id,
        status: 'applied',
        cover_message: coverMessage,
        applied_at: new Date().toISOString(),
        status_updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error applying to job:', error);
      return null;
    }
    return data;
  },

  // Worker withdraws application
  async withdrawApplication(applicationId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('job_applications')
      .update({
        status: 'withdrawn',
        status_updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .eq('worker_id', user.id);

    if (error) {
      console.error('Error withdrawing application:', error);
      return false;
    }
    return true;
  },

  // Get worker's applications
  async getMyApplications(): Promise<JobApplication[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('job_applications')
      .select(`
        *,
        job_post:job_post_id(
          id, title, description, location, employment_type, salary_min, salary_max,
          status, business_id,
          business:business_id(company_name, logo_url)
        )
      `)
      .eq('worker_id', user.id)
      .order('applied_at', { ascending: false });

    if (error) {
      console.error('Error fetching my applications:', error);
      return [];
    }
    return data || [];
  },

  // Check if worker has applied to a job
  async hasApplied(jobPostId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('job_applications')
      .select('id, status')
      .eq('job_post_id', jobPostId)
      .eq('worker_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking application status:', error);
    }

    // Return true if applied and not withdrawn
    return data ? data.status !== 'withdrawn' : false;
  },

  // Get application status for a job
  async getApplicationStatus(jobPostId: string): Promise<ApplicationStatus | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('job_applications')
      .select('status')
      .eq('job_post_id', jobPostId)
      .eq('worker_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not applied
      console.error('Error getting application status:', error);
      return null;
    }
    return data?.status || null;
  },

  // Business: Get applicants for a job post
  async getJobApplicants(jobPostId: string): Promise<JobApplication[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('job_applications')
      .select(`
        *,
        worker:worker_id(
          id, name, photo_url, job_title, skills, experience_years,
          current_location, bio, resume_url
        )
      `)
      .eq('job_post_id', jobPostId)
      .order('applied_at', { ascending: false });

    if (error) {
      console.error('Error fetching applicants:', error);
      return [];
    }
    return data || [];
  },

  // Business: Update application status
  async updateApplicationStatus(
    applicationId: string,
    status: ApplicationStatus,
    notes?: string,
    interviewDate?: string
  ): Promise<boolean> {
    const updates: any = {
      status,
      status_updated_at: new Date().toISOString(),
    };

    if (notes !== undefined) updates.notes = notes;
    if (interviewDate) updates.interview_scheduled_at = interviewDate;

    const { error, data } = await supabase
      .from('job_applications')
      .update(updates)
      .eq('id', applicationId)
      .select('worker_id') // Select worker_id to award badge
      .single();

    if (error) {
      console.error('Error updating application status:', error);
      return false;
    }

    // TRIGGER BADGE CHECK: Job Completion (if accepted or completed)
    if (status === 'accepted' && data?.worker_id) {
      // Count total accepted jobs for this worker
      const { count: jobCount } = await supabase
        .from('job_applications')
        .select('id', { count: 'exact', head: true })
        .eq('worker_id', data.worker_id)
        .eq('status', 'accepted');

      if (jobCount) {
        badgeService.checkJobCompletionBadge(data.worker_id, jobCount);
      }
    }

    // TRIGGER NOTIFICATION: Application Status Update
    if (data?.worker_id) {
      await notificationService.createNotification(
        data.worker_id,
        'job_update',
        'Application Update 💼',
        `Your application status has been updated to: ${status.toUpperCase()}`,
        { applicationId, status }
      );
    }

    return true;
  },

  // Business: Get all applicants grouped by job
  async getAllApplicants(): Promise<{ job: JobPost; applications: JobApplication[] }[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // First get all jobs for this business
    const jobs = await jobPostService.getMyJobPosts();

    // Then get applicants for each job
    const result = await Promise.all(
      jobs.map(async (job) => {
        const applications = await this.getJobApplicants(job.id);
        return { job, applications };
      })
    );

    // Filter out jobs with no applications
    return result.filter(r => r.applications.length > 0);
  },

  // Get application counts by status for a job
  async getApplicationCounts(jobPostId: string): Promise<Record<ApplicationStatus, number>> {
    const { data, error } = await supabase
      .from('job_applications')
      .select('status')
      .eq('job_post_id', jobPostId);

    if (error) {
      console.error('Error fetching application counts:', error);
      return {
        applied: 0, viewed: 0, shortlisted: 0, interview: 0,
        offered: 0, accepted: 0, rejected: 0, withdrawn: 0
      };
    }

    const counts: Record<ApplicationStatus, number> = {
      applied: 0, viewed: 0, shortlisted: 0, interview: 0,
      offered: 0, accepted: 0, rejected: 0, withdrawn: 0
    };

    data?.forEach(app => {
      counts[app.status as ApplicationStatus]++;
    });

    return counts;
  },
};

// ============================================
// SAVED JOBS (Worker bookmarks)
// ============================================
export const savedJobsService = {
  // Save a job
  async saveJob(jobPostId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('worker_job_interactions')
      .upsert({
        worker_id: user.id,
        job_post_id: jobPostId,
        action: 'saved',
        created_at: new Date().toISOString(),
      }, { onConflict: 'worker_id,job_post_id,action' });

    if (error) {
      console.error('Error saving job:', error);
      return false;
    }
    return true;
  },

  // Unsave a job
  async unsaveJob(jobPostId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('worker_job_interactions')
      .delete()
      .eq('worker_id', user.id)
      .eq('job_post_id', jobPostId)
      .eq('action', 'saved');

    if (error) {
      console.error('Error unsaving job:', error);
      return false;
    }
    return true;
  },

  // Check if job is saved
  async isJobSaved(jobPostId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('worker_job_interactions')
      .select('id')
      .eq('worker_id', user.id)
      .eq('job_post_id', jobPostId)
      .eq('action', 'saved')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking saved status:', error);
    }
    return !!data;
  },

  // Get all saved jobs
  async getSavedJobs(): Promise<JobPost[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('worker_job_interactions')
      .select(`
        job_post:job_post_id(
          *,
          business:business_id(company_name, logo_url, industry, is_verified_business)
        )
      `)
      .eq('worker_id', user.id)
      .eq('action', 'saved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching saved jobs:', error);
      return [];
    }

    // Extract job posts from the nested structure
    return (data || [])
      .map((item: any) => item.job_post)
      .filter((job: any): job is JobPost => Boolean(job));
  },
};

// ============================================
// LOGIN STREAKS (Month 2)
// ============================================
export interface UserStreak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_login_date: string;
  updated_at: string;
}

export const streakService = {
  // Get current user's streak
  async getStreak(): Promise<UserStreak | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No streak record exists yet
        return null;
      }
      console.error('Error fetching streak:', error);
      return null;
    }

    return data;
  },

  // Update login streak - call this on app open/login
  async updateLoginStreak(): Promise<{ streak: UserStreak; isNewDay: boolean; badgeEarned?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Get existing streak
    const { data: existing, error: fetchError } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching streak:', fetchError);
      throw fetchError;
    }

    if (!existing) {
      // Create new streak record
      const newStreak = {
        user_id: user.id,
        current_streak: 1,
        longest_streak: 1,
        last_login_date: today,
      };

      const { data, error } = await supabase
        .from('user_streaks')
        .insert(newStreak)
        .select()
        .single();

      if (error) {
        console.error('Error creating streak:', error);
        throw error;
      }

      return { streak: data, isNewDay: true };
    }

    // Check if already logged in today
    if (existing.last_login_date === today) {
      return { streak: existing, isNewDay: false };
    }

    // Calculate if this continues the streak
    const lastLogin = new Date(existing.last_login_date);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));

    let newCurrentStreak: number;
    let badgeEarned: string | undefined;

    if (diffDays === 1) {
      // Consecutive day - increment streak
      newCurrentStreak = existing.current_streak + 1;

      // Check for streak milestones
      if (newCurrentStreak === 7) {
        badgeEarned = 'Week Warrior';
      }
    } else {
      // Gap in streak - reset to 1
      newCurrentStreak = 1;
    }

    const newLongestStreak = Math.max(existing.longest_streak, newCurrentStreak);

    const { data, error } = await supabase
      .from('user_streaks')
      .update({
        current_streak: newCurrentStreak,
        longest_streak: newLongestStreak,
        last_login_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating streak:', error);
      throw error;
    }

    return { streak: data, isNewDay: true, badgeEarned };
  },

  // Get streak for display (current streak and flame emoji level)
  async getStreakDisplay(): Promise<{ count: number; level: 'none' | 'low' | 'medium' | 'high' | 'fire' }> {
    const streak = await this.getStreak();

    if (!streak || streak.current_streak === 0) {
      return { count: 0, level: 'none' };
    }

    const count = streak.current_streak;
    let level: 'none' | 'low' | 'medium' | 'high' | 'fire';

    if (count >= 30) {
      level = 'fire';
    } else if (count >= 14) {
      level = 'high';
    } else if (count >= 7) {
      level = 'medium';
    } else if (count >= 3) {
      level = 'low';
    } else {
      level = 'none';
    }

    return { count, level };
  },
};
