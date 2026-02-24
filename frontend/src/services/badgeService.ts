import { supabase } from '../lib/supabase';
import { Badge, UserBadge } from '../types';
import { notificationService } from './notificationService';

export const badgeService = {
    /**
     * Fetch all available badges
     */
    getAllBadges: async (): Promise<Badge[]> => {
        const { data, error } = await supabase
            .from('badges')
            .select('*')
            .order('tier', { ascending: true });

        if (error) {
            console.error('Error fetching badges:', error);
            return [];
        }

        return data as Badge[];
    },

    /**
     * Fetch earned badges for a user
     */
    getUserBadges: async (userId: string): Promise<UserBadge[]> => {
        const { data, error } = await supabase
            .from('user_badges')
            .select('*, badge:badges(*)')
            .eq('user_id', userId)
            .eq('progress', 100);

        if (error) {
            console.error('Error fetching user badges:', error);
            return [];
        }

        // Flatten structure for easier UI consumption if needed, or keep as is
        return data as UserBadge[];
    },

    /**
     * Award a badge to a user
     */
    awardBadge: async (userId: string, badgeName: string): Promise<UserBadge | null> => {
        try {
            // 1. Find the badge ID by name
            const { data: badgeData, error: badgeError } = await supabase
                .from('badges')
                .select('id')
                .eq('name', badgeName)
                .single();

            if (badgeError || !badgeData) {
                console.warn(`Badge '${badgeName}' not found`);
                return null;
            }

            // 2. Insert into user_badges
            const { data, error } = await supabase
                .from('user_badges')
                .insert({
                    user_id: userId,
                    badge_id: badgeData.id,
                    progress: 100,
                    earned_at: new Date().toISOString(),
                })
                .select('*, badge:badges(*)')
                .single();

            if (error) {
                // Ignore duplicate key errors (badge already earned)
                if (error.code === '23505') {
                    console.log(`User already has badge: ${badgeName}`);
                    return null;
                }
                console.error('Error awarding badge:', error);
                return null;
            }

            // Notify user
            await notificationService.createNotification(
                userId,
                'badge_earned',
                'Badge Earned! 🏆',
                `You've unlocked the "${badgeName}" badge!`,
                { badgeId: data.badge_id, badgeName }
            );

            return data as UserBadge;
        } catch (e) {
            console.error('Exception awarding badge:', e);
            return null;
        }
    },

    /**
     * Check for 'Resume Ready' Badge
     * To be called after resume upload
     */
    checkResumeBadge: async (userId: string): Promise<boolean> => {
        const badge = await badgeService.awardBadge(userId, 'Resume Ready');
        return !!badge;
    },

    /**
     * Check for 'Profile Master' Badge
     * To be called when profile is saved
     */
    checkProfileBadge: async (userId: string, completionPercentage: number): Promise<boolean> => {
        if (completionPercentage >= 100) {
            const badge = await badgeService.awardBadge(userId, 'Profile Master');
            return !!badge;
        }
        return false;
    },

    /**
     * Check badges for Jobs Completed
     */
    checkJobCompletionBadge: async (userId: string, totalJobs: number): Promise<UserBadge | null> => {
        let badge: UserBadge | null = null;
        if (totalJobs >= 25) badge = await badgeService.awardBadge(userId, 'Industry Legend');
        else if (totalJobs >= 5) badge = await badgeService.awardBadge(userId, 'High Performer');
        else if (totalJobs >= 1) badge = await badgeService.awardBadge(userId, 'First Paycheck');
        return badge;
    },

    /**
     * Check badges for Connections
     */
    checkConnectionBadge: async (userId: string, totalConnections: number): Promise<UserBadge | null> => {
        let badge: UserBadge | null = null;
        if (totalConnections >= 50) badge = await badgeService.awardBadge(userId, 'Community Pillar');
        else if (totalConnections >= 10) badge = await badgeService.awardBadge(userId, 'Networker');
        return badge;
    },

    /**
     * Check badges for Streak
     */
    checkStreakBadge: async (userId: string, currentStreak: number): Promise<UserBadge | null> => {
        let badge: UserBadge | null = null;
        if (currentStreak >= 30) badge = await badgeService.awardBadge(userId, 'Power User');
        else if (currentStreak >= 7) badge = await badgeService.awardBadge(userId, 'Dedicated');
        return badge;
    },

    /**
     * Check for Verification Badge
     */
    checkVerificationBadge: async (userId: string, isVerified: boolean): Promise<boolean> => {
        if (isVerified) {
            const badge = await badgeService.awardBadge(userId, 'Verified Pro');
            return !!badge;
        }
        return false;
    }
};
