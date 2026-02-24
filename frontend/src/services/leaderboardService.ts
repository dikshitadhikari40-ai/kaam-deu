import { supabase } from '../lib/supabase';

export interface LeaderboardEntry {
    user_id: string;
    name: string;
    profile_pic: string | null;
    job_title: string;
    total_score: number;
    badge_count?: number;
    jobs_completed?: number;
    active_jobs?: number;
    people_hired?: number;
    rank: number;
}

export const leaderboardService = {
    /**
     * Fetch top performers
     */
    getTopPerformers: async (limit: number = 50): Promise<LeaderboardEntry[]> => {
        const { data, error } = await supabase
            .from('worker_leaderboard')
            .select('*')
            .order('total_score', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching worker leaderboard:', error);
            return [];
        }

        return data as LeaderboardEntry[];
    },

    /**
     * Fetch top businesses
     */
    getTopBusinesses: async (limit: number = 50): Promise<LeaderboardEntry[]> => {
        const { data, error } = await supabase
            .from('business_leaderboard')
            .select('*')
            .order('total_score', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching business leaderboard:', error);
            return [];
        }

        return data as LeaderboardEntry[];
    },

    /**
     * Get specific user profile on the leaderboard
     */
    getUserRank: async (userId: string): Promise<LeaderboardEntry | null> => {
        const { data, error } = await supabase
            .from('worker_leaderboard')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code !== 'PGRST116') { // PGRST116 is 'No rows found'
                console.error('Error fetching user rank:', error);
            }
            return null;
        }

        return data as LeaderboardEntry;
    }
};
