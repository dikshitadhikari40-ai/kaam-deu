import { supabase } from '../lib/supabase';
import { Badge, UserBadge, BadgeCategory } from '../types';

// ============================================
// BADGE DEFINITIONS
// ============================================

export const BADGE_DEFINITIONS: Omit<Badge, 'id' | 'created_at'>[] = [
  {
    name: 'Quick Responder',
    description: 'Reply to messages within 1 hour',
    icon: 'zap',
    category: 'engagement',
    color: '#F39C12',
  },
  {
    name: 'Profile Star',
    description: 'Maintain a 5-star average rating',
    icon: 'star',
    category: 'quality',
    color: '#F1C40F',
  },
  {
    name: 'Super Matcher',
    description: 'Get 10 or more matches',
    icon: 'heart',
    category: 'milestone',
    color: '#E74C3C',
  },
  {
    name: 'Job Creator',
    description: 'Post 5 or more job listings',
    icon: 'briefcase',
    category: 'milestone',
    color: '#3498DB',
  },
  {
    name: 'Verified Pro',
    description: 'Complete profile verification',
    icon: 'shield',
    category: 'special',
    color: '#2ECC71',
  },
  {
    name: 'First Review',
    description: 'Leave your first review',
    icon: 'edit-3',
    category: 'engagement',
    color: '#9B59B6',
  },
  {
    name: 'Conversation Starter',
    description: 'Send your first message',
    icon: 'message-circle',
    category: 'engagement',
    color: '#1ABC9C',
  },
  {
    name: 'Profile Complete',
    description: 'Complete your profile 100%',
    icon: 'user-check',
    category: 'milestone',
    color: '#4A90D9',
  },
  {
    name: 'Week Warrior',
    description: 'Maintain a 7-day login streak',
    icon: 'trending-up',
    category: 'engagement',
    color: '#E67E22',
  },
  {
    name: 'Top Rated',
    description: 'Receive 5 or more 5-star reviews',
    icon: 'award',
    category: 'quality',
    color: '#C9A962',
  },
];

// ============================================
// BADGE SERVICE
// ============================================

export const badgeService = {
  // Get all available badges
  async getAllBadges(): Promise<Badge[]> {
    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .order('category', { ascending: true });

    if (error) {
      console.error('Error fetching badges:', error);
      return [];
    }

    return data || [];
  },

  // Get user's earned badges
  async getUserBadges(userId?: string): Promise<UserBadge[]> {
    let uid = userId;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      uid = user?.id;
    }
    if (!uid) return [];

    const { data, error } = await supabase
      .from('user_badges')
      .select('*, badge:badge_id(*)')
      .eq('user_id', uid)
      .order('earned_at', { ascending: false });

    if (error) {
      console.error('Error fetching user badges:', error);
      return [];
    }

    return data || [];
  },

  // Award a badge to user
  async awardBadge(badgeId: string, userId?: string): Promise<{ success: boolean; error?: string }> {
    let uid = userId;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      uid = user?.id;
    }
    if (!uid) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
      .from('user_badges')
      .insert({
        user_id: uid,
        badge_id: badgeId,
      });

    if (error) {
      if (error.code === '23505') {
        // Already has this badge
        return { success: true };
      }
      console.error('Error awarding badge:', error);
      return { success: false, error: 'Failed to award badge' };
    }

    return { success: true };
  },

  // Check if user has a specific badge
  async hasBadge(badgeName: string, userId?: string): Promise<boolean> {
    let uid = userId;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      uid = user?.id;
    }
    if (!uid) return false;

    const { data, error } = await supabase
      .from('user_badges')
      .select('id, badge:badge_id(name)')
      .eq('user_id', uid);

    if (error || !data) return false;

    return data.some((ub: any) => ub.badge?.name === badgeName);
  },

  // Check and award badges based on user actions
  async checkAndAwardBadges(action: string, userId?: string): Promise<UserBadge[]> {
    let uid = userId;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      uid = user?.id;
    }
    if (!uid) return [];

    const awardedBadges: UserBadge[] = [];

    // Get all badges for reference
    const allBadges = await this.getAllBadges();
    const getBadgeByName = (name: string) => allBadges.find(b => b.name === name);

    switch (action) {
      case 'first_message': {
        const badge = getBadgeByName('Conversation Starter');
        if (badge && !(await this.hasBadge('Conversation Starter', uid))) {
          await this.awardBadge(badge.id, uid);
          awardedBadges.push({ id: '', user_id: uid, badge_id: badge.id, earned_at: new Date().toISOString(), badge });
        }
        break;
      }

      case 'first_review': {
        const badge = getBadgeByName('First Review');
        if (badge && !(await this.hasBadge('First Review', uid))) {
          await this.awardBadge(badge.id, uid);
          awardedBadges.push({ id: '', user_id: uid, badge_id: badge.id, earned_at: new Date().toISOString(), badge });
        }
        break;
      }

      case 'check_matches': {
        // Check if user has 10+ matches
        const { count } = await supabase
          .from('matches')
          .select('*', { count: 'exact', head: true })
          .or(`user1_id.eq.${uid},user2_id.eq.${uid}`);

        if (count && count >= 10) {
          const badge = getBadgeByName('Super Matcher');
          if (badge && !(await this.hasBadge('Super Matcher', uid))) {
            await this.awardBadge(badge.id, uid);
            awardedBadges.push({ id: '', user_id: uid, badge_id: badge.id, earned_at: new Date().toISOString(), badge });
          }
        }
        break;
      }

      case 'check_jobs': {
        // Check if user has posted 5+ jobs
        const { count } = await supabase
          .from('job_posts')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', uid);

        if (count && count >= 5) {
          const badge = getBadgeByName('Job Creator');
          if (badge && !(await this.hasBadge('Job Creator', uid))) {
            await this.awardBadge(badge.id, uid);
            awardedBadges.push({ id: '', user_id: uid, badge_id: badge.id, earned_at: new Date().toISOString(), badge });
          }
        }
        break;
      }

      case 'check_rating': {
        // Check for 5-star average
        const { data: reviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('reviewed_id', uid);

        if (reviews && reviews.length > 0) {
          const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
          if (avg >= 5) {
            const badge = getBadgeByName('Profile Star');
            if (badge && !(await this.hasBadge('Profile Star', uid))) {
              await this.awardBadge(badge.id, uid);
              awardedBadges.push({ id: '', user_id: uid, badge_id: badge.id, earned_at: new Date().toISOString(), badge });
            }
          }

          // Check for 5+ 5-star reviews
          const fiveStarCount = reviews.filter(r => r.rating === 5).length;
          if (fiveStarCount >= 5) {
            const badge = getBadgeByName('Top Rated');
            if (badge && !(await this.hasBadge('Top Rated', uid))) {
              await this.awardBadge(badge.id, uid);
              awardedBadges.push({ id: '', user_id: uid, badge_id: badge.id, earned_at: new Date().toISOString(), badge });
            }
          }
        }
        break;
      }

      case 'check_streak': {
        // Check for 7-day streak
        const { data: streak } = await supabase
          .from('user_streaks')
          .select('current_streak')
          .eq('user_id', uid)
          .single();

        if (streak && streak.current_streak >= 7) {
          const badge = getBadgeByName('Week Warrior');
          if (badge && !(await this.hasBadge('Week Warrior', uid))) {
            await this.awardBadge(badge.id, uid);
            awardedBadges.push({ id: '', user_id: uid, badge_id: badge.id, earned_at: new Date().toISOString(), badge });
          }
        }
        break;
      }

      case 'verified': {
        const badge = getBadgeByName('Verified Pro');
        if (badge && !(await this.hasBadge('Verified Pro', uid))) {
          await this.awardBadge(badge.id, uid);
          awardedBadges.push({ id: '', user_id: uid, badge_id: badge.id, earned_at: new Date().toISOString(), badge });
        }
        break;
      }

      case 'profile_complete': {
        const badge = getBadgeByName('Profile Complete');
        if (badge && !(await this.hasBadge('Profile Complete', uid))) {
          await this.awardBadge(badge.id, uid);
          awardedBadges.push({ id: '', user_id: uid, badge_id: badge.id, earned_at: new Date().toISOString(), badge });
        }
        break;
      }
    }

    return awardedBadges;
  },

  // Get badge count for user
  async getBadgeCount(userId?: string): Promise<number> {
    let uid = userId;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      uid = user?.id;
    }
    if (!uid) return 0;

    const { count } = await supabase
      .from('user_badges')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid);

    return count || 0;
  },

  // Initialize badges in database (run once)
  async initializeBadges(): Promise<void> {
    for (const badge of BADGE_DEFINITIONS) {
      const { error } = await supabase
        .from('badges')
        .upsert(
          { ...badge },
          { onConflict: 'name' }
        );

      if (error) {
        console.error('Error initializing badge:', badge.name, error);
      }
    }
  },
};
