/**
 * Streaks API Routes
 *
 * Track user login/activity streaks:
 * - GET /api/streaks/me - Get current user's streak
 * - POST /api/streaks/ping - Record activity and update streak
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { prepare } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * Helper: Get today's date as YYYY-MM-DD string
 */
function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Helper: Get yesterday's date as YYYY-MM-DD string
 */
function getYesterdayString() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
}

/**
 * Helper: Calculate streak level for badges/UI
 */
function getStreakLevel(currentStreak) {
    if (currentStreak >= 30) return 'fire';      // 30+ days
    if (currentStreak >= 14) return 'high';      // 14+ days
    if (currentStreak >= 7) return 'medium';     // 7+ days
    if (currentStreak >= 3) return 'low';        // 3+ days
    return 'none';
}

/**
 * Helper: Check for milestone badges
 */
function checkMilestones(newStreak, oldStreak) {
    const milestones = [
        { days: 7, badge: 'Week Warrior' },
        { days: 14, badge: 'Two Week Champion' },
        { days: 30, badge: 'Monthly Master' },
        { days: 100, badge: 'Century Club' }
    ];

    for (const milestone of milestones) {
        if (newStreak >= milestone.days && oldStreak < milestone.days) {
            return milestone.badge;
        }
    }
    return null;
}

/**
 * GET /api/streaks/me
 * Get current user's streak information
 */
router.get('/me', authMiddleware, (req, res) => {
    try {
        const userId = req.user.id;

        const streak = prepare(`
            SELECT * FROM user_streaks WHERE user_id = ?
        `).get(userId);

        if (!streak) {
            // No streak record exists yet
            return res.json({
                data: {
                    current_streak: 0,
                    longest_streak: 0,
                    last_activity_date: null,
                    level: 'none',
                    next_milestone: 3
                }
            });
        }

        const level = getStreakLevel(streak.current_streak);

        // Calculate next milestone
        let nextMilestone = null;
        const milestones = [3, 7, 14, 30, 100];
        for (const m of milestones) {
            if (streak.current_streak < m) {
                nextMilestone = m;
                break;
            }
        }

        res.json({
            data: {
                ...streak,
                level,
                next_milestone: nextMilestone,
                days_to_next_milestone: nextMilestone ? nextMilestone - streak.current_streak : null
            }
        });
    } catch (error) {
        console.error('Get streak error:', error);
        res.status(500).json({ error: 'Failed to fetch streak' });
    }
});

/**
 * POST /api/streaks/ping
 * Record activity and update streak
 * Call this when user opens app or completes a "streak-worthy" action
 */
router.post('/ping', authMiddleware, (req, res) => {
    try {
        const userId = req.user.id;
        const today = getTodayString();
        const yesterday = getYesterdayString();

        // Get existing streak
        const existingStreak = prepare(`
            SELECT * FROM user_streaks WHERE user_id = ?
        `).get(userId);

        if (!existingStreak) {
            // Create new streak record
            const streakId = uuidv4();
            prepare(`
                INSERT INTO user_streaks (id, user_id, current_streak, longest_streak, last_activity_date)
                VALUES (?, ?, 1, 1, ?)
            `).run(streakId, userId, today);

            return res.json({
                data: {
                    current_streak: 1,
                    longest_streak: 1,
                    last_activity_date: today,
                    level: 'none',
                    is_new_day: true,
                    badge_earned: null
                }
            });
        }

        // Already logged in today - no change
        if (existingStreak.last_activity_date === today) {
            return res.json({
                data: {
                    current_streak: existingStreak.current_streak,
                    longest_streak: existingStreak.longest_streak,
                    last_activity_date: existingStreak.last_activity_date,
                    level: getStreakLevel(existingStreak.current_streak),
                    is_new_day: false,
                    badge_earned: null
                }
            });
        }

        let newCurrentStreak;
        let badgeEarned = null;
        const oldStreak = existingStreak.current_streak;

        if (existingStreak.last_activity_date === yesterday) {
            // Consecutive day - increment streak
            newCurrentStreak = existingStreak.current_streak + 1;
            badgeEarned = checkMilestones(newCurrentStreak, oldStreak);
        } else {
            // Gap in streak - reset to 1
            newCurrentStreak = 1;
        }

        const newLongestStreak = Math.max(existingStreak.longest_streak, newCurrentStreak);

        // Update the streak
        prepare(`
            UPDATE user_streaks
            SET current_streak = ?,
                longest_streak = ?,
                last_activity_date = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `).run(newCurrentStreak, newLongestStreak, today, userId);

        res.json({
            data: {
                current_streak: newCurrentStreak,
                longest_streak: newLongestStreak,
                last_activity_date: today,
                level: getStreakLevel(newCurrentStreak),
                is_new_day: true,
                badge_earned: badgeEarned,
                streak_continued: existingStreak.last_activity_date === yesterday
            }
        });
    } catch (error) {
        console.error('Ping streak error:', error);
        res.status(500).json({ error: 'Failed to update streak' });
    }
});

/**
 * GET /api/streaks/leaderboard
 * Get top users by streak (optional feature)
 */
router.get('/leaderboard', authMiddleware, (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const leaders = prepare(`
            SELECT
                us.user_id,
                us.current_streak,
                us.longest_streak,
                u.role,
                CASE
                    WHEN u.role = 'worker' THEN wp.name
                    WHEN u.role = 'business' THEN bp.company_name
                END as name,
                CASE
                    WHEN u.role = 'worker' THEN (SELECT images FROM worker_profiles WHERE user_id = u.id)
                    WHEN u.role = 'business' THEN bp.logo_url
                END as photo
            FROM user_streaks us
            JOIN users u ON us.user_id = u.id
            LEFT JOIN worker_profiles wp ON u.id = wp.user_id AND u.role = 'worker'
            LEFT JOIN business_profiles bp ON u.id = bp.user_id AND u.role = 'business'
            WHERE us.current_streak > 0
            ORDER BY us.current_streak DESC, us.longest_streak DESC
            LIMIT ?
        `).all(parseInt(limit));

        // Add rank and level to each leader
        const leadersWithRank = leaders.map((leader, index) => ({
            ...leader,
            rank: index + 1,
            level: getStreakLevel(leader.current_streak)
        }));

        res.json({ data: leadersWithRank });
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

module.exports = router;
