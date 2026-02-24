import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserInsights } from '../types';

export const analyticsService = {
  /**
   * Get comprehensive insights for the current user
   */
  async getUserInsights(): Promise<UserInsights> {
    if (!isSupabaseConfigured()) {
      return this.getMockInsights();
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch all analytics data in parallel
      const [
        profileViewsResult,
        matchStats,
        messageStats,
        ratingData,
      ] = await Promise.all([
        this.getProfileViews(user.id),
        this.getMatchStats(user.id),
        this.getMessageStats(user.id),
        this.getRatingData(user.id),
      ]);

      return {
        profile_views: profileViewsResult.total,
        profile_views_change: profileViewsResult.change,
        match_rate: matchStats.matchRate,
        total_matches: matchStats.totalMatches,
        total_swipes_received: matchStats.totalSwipesReceived,
        response_rate: messageStats.responseRate,
        avg_response_time_minutes: messageStats.avgResponseTime,
        total_messages_sent: messageStats.totalSent,
        total_messages_received: messageStats.totalReceived,
        average_rating: ratingData.average,
        total_reviews: ratingData.count,
        jobs_completed: ratingData.jobsCompleted,
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error fetching user insights:', error);
      return this.getMockInsights();
    }
  },

  /**
   * Get profile view count and week-over-week change
   */
  async getProfileViews(userId: string): Promise<{ total: number; change: number }> {
    try {
      // Get total views
      const { count: totalViews } = await supabase
        .from('profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('viewed_user_id', userId);

      // Get views from last 7 days
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { count: recentViews } = await supabase
        .from('profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('viewed_user_id', userId)
        .gte('viewed_at', weekAgo.toISOString());

      // Get views from previous week for comparison
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const { count: previousWeekViews } = await supabase
        .from('profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('viewed_user_id', userId)
        .gte('viewed_at', twoWeeksAgo.toISOString())
        .lt('viewed_at', weekAgo.toISOString());

      const change = previousWeekViews && previousWeekViews > 0
        ? Math.round(((recentViews || 0) - previousWeekViews) / previousWeekViews * 100)
        : 0;

      return {
        total: totalViews || 0,
        change,
      };
    } catch (error) {
      console.error('Error getting profile views:', error);
      return { total: 0, change: 0 };
    }
  },

  /**
   * Get match statistics
   */
  async getMatchStats(userId: string): Promise<{
    matchRate: number;
    totalMatches: number;
    totalSwipesReceived: number;
  }> {
    try {
      // Get total matches
      const { count: totalMatches } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      // Get swipes received (where current user was swiped on)
      const { count: totalSwipesReceived } = await supabase
        .from('swipes')
        .select('*', { count: 'exact', head: true })
        .eq('swiped_id', userId);

      // Get right swipes received
      const { count: rightSwipesReceived } = await supabase
        .from('swipes')
        .select('*', { count: 'exact', head: true })
        .eq('swiped_id', userId)
        .eq('direction', 'right');

      const matchRate = totalSwipesReceived && totalSwipesReceived > 0
        ? Math.round((rightSwipesReceived || 0) / totalSwipesReceived * 100)
        : 0;

      return {
        matchRate,
        totalMatches: totalMatches || 0,
        totalSwipesReceived: totalSwipesReceived || 0,
      };
    } catch (error) {
      console.error('Error getting match stats:', error);
      return { matchRate: 0, totalMatches: 0, totalSwipesReceived: 0 };
    }
  },

  /**
   * Get messaging statistics
   */
  async getMessageStats(userId: string): Promise<{
    responseRate: number;
    avgResponseTime: number;
    totalSent: number;
    totalReceived: number;
  }> {
    try {
      // Get messages sent
      const { count: totalSent } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', userId);

      // Get messages received
      const { count: totalReceived } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .neq('sender_id', userId);

      // For response rate, we'd need to check conversations where we were messaged first
      // Simplified: % of received messages that got a reply
      // This is a simplification - full implementation would track conversation threads

      // Get unique conversations where user received messages
      const { data: receivedConvos } = await supabase
        .from('messages')
        .select('match_id')
        .neq('sender_id', userId);

      const uniqueReceivedConvos = new Set(receivedConvos?.map(m => m.match_id) || []);

      // Get conversations where user replied
      const { data: repliedConvos } = await supabase
        .from('messages')
        .select('match_id')
        .eq('sender_id', userId);

      const uniqueRepliedConvos = new Set(repliedConvos?.map(m => m.match_id) || []);

      // Calculate overlap
      let respondedCount = 0;
      uniqueReceivedConvos.forEach(convoId => {
        if (uniqueRepliedConvos.has(convoId)) {
          respondedCount++;
        }
      });

      const responseRate = uniqueReceivedConvos.size > 0
        ? Math.round(respondedCount / uniqueReceivedConvos.size * 100)
        : 100;

      // Average response time would require more complex query with timestamps
      // Using a placeholder for now
      const avgResponseTime = 30; // minutes

      return {
        responseRate,
        avgResponseTime,
        totalSent: totalSent || 0,
        totalReceived: totalReceived || 0,
      };
    } catch (error) {
      console.error('Error getting message stats:', error);
      return { responseRate: 0, avgResponseTime: 0, totalSent: 0, totalReceived: 0 };
    }
  },

  /**
   * Get rating data
   */
  async getRatingData(userId: string): Promise<{
    average: number;
    count: number;
    jobsCompleted: number;
  }> {
    try {
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewed_id', userId);

      const count = reviews?.length || 0;
      const average = count > 0 && reviews
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / count
        : 0;

      // Jobs completed = reviews received (simplified assumption)
      return {
        average: Math.round(average * 10) / 10,
        count,
        jobsCompleted: count,
      };
    } catch (error) {
      console.error('Error getting rating data:', error);
      return { average: 0, count: 0, jobsCompleted: 0 };
    }
  },

  /**
   * Record a profile view
   */
  async recordProfileView(viewedUserId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id === viewedUserId) return;

      await supabase.from('profile_views').insert({
        viewer_id: user.id,
        viewed_user_id: viewedUserId,
      });
    } catch (error) {
      console.error('Error recording profile view:', error);
    }
  },

  /**
   * Get mock insights for development/demo
   */
  getMockInsights(): UserInsights {
    return {
      profile_views: 47,
      profile_views_change: 12,
      match_rate: 68,
      total_matches: 23,
      total_swipes_received: 89,
      response_rate: 92,
      avg_response_time_minutes: 15,
      total_messages_sent: 156,
      total_messages_received: 142,
      average_rating: 4.7,
      total_reviews: 12,
      jobs_completed: 15,
      last_updated: new Date().toISOString(),
    };
  },
};
