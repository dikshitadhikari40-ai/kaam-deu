const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { prepare } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Record a swipe
router.post('/', authMiddleware, (req, res) => {
    try {
        const { swipedId, direction } = req.body;
        const swiperId = req.user.id;

        if (!swipedId || !direction) {
            return res.status(400).json({ error: 'swipedId and direction are required' });
        }

        if (!['left', 'right', 'up'].includes(direction)) {
            return res.status(400).json({ error: 'direction must be left, right, or up' });
        }

        // Check if already swiped
        const existingSwipe = prepare('SELECT id FROM swipes WHERE swiper_id = ? AND swiped_id = ?')
            .get(swiperId, swipedId);

        if (existingSwipe) {
            return res.status(400).json({ error: 'Already swiped on this user' });
        }

        // Record the swipe
        const swipeId = uuidv4();
        prepare('INSERT INTO swipes (id, swiper_id, swiped_id, direction) VALUES (?, ?, ?, ?)')
            .run(swipeId, swiperId, swipedId, direction);

        let match = null;

        // Check for match if swiped right or super like (up)
        if (direction === 'right' || direction === 'up') {
            const reciprocalSwipe = prepare(`
                SELECT id FROM swipes
                WHERE swiper_id = ? AND swiped_id = ? AND direction IN ('right', 'up')
            `).get(swipedId, swiperId);

            if (reciprocalSwipe) {
                // It's a match!
                const matchId = uuidv4();

                // Order user IDs consistently
                const [user1, user2] = [swiperId, swipedId].sort();

                // Check if match already exists
                const existingMatch = prepare(`
                    SELECT id FROM matches WHERE user1_id = ? AND user2_id = ?
                `).get(user1, user2);

                if (!existingMatch) {
                    prepare('INSERT INTO matches (id, user1_id, user2_id) VALUES (?, ?, ?)')
                        .run(matchId, user1, user2);

                    // Get the matched user's profile
                    const matchedUser = prepare('SELECT id, email, role FROM users WHERE id = ?').get(swipedId);

                    let matchedProfile = null;
                    if (matchedUser.role === 'worker') {
                        matchedProfile = prepare('SELECT * FROM worker_profiles WHERE user_id = ?').get(swipedId);
                        if (matchedProfile) {
                            matchedProfile.skills = JSON.parse(matchedProfile.skills || '[]');
                            matchedProfile.images = JSON.parse(matchedProfile.images || '[]');
                        }
                    } else {
                        matchedProfile = prepare('SELECT * FROM business_profiles WHERE user_id = ?').get(swipedId);
                        if (matchedProfile) {
                            matchedProfile.images = JSON.parse(matchedProfile.images || '[]');
                        }
                    }

                    match = {
                        id: matchId,
                        user: matchedUser,
                        profile: matchedProfile
                    };
                }
            }
        }

        res.json({
            swipe: { id: swipeId, direction },
            match
        });
    } catch (error) {
        console.error('Swipe error:', error);
        res.status(500).json({ error: 'Failed to record swipe' });
    }
});

// Get all matches
router.get('/matches', authMiddleware, (req, res) => {
    try {
        const userId = req.user.id;

        const matches = prepare(`
            SELECT m.*,
                   CASE WHEN m.user1_id = ? THEN m.user2_id ELSE m.user1_id END as other_user_id
            FROM matches m
            WHERE (m.user1_id = ? OR m.user2_id = ?) AND m.is_active = 1
            ORDER BY m.matched_at DESC
        `).all(userId, userId, userId);

        // Get profiles for each match
        const matchesWithProfiles = matches.map(match => {
            const otherUser = prepare('SELECT id, email, role FROM users WHERE id = ?')
                .get(match.other_user_id);

            let profile = null;
            if (otherUser.role === 'worker') {
                profile = prepare('SELECT * FROM worker_profiles WHERE user_id = ?')
                    .get(match.other_user_id);
                if (profile) {
                    profile.skills = JSON.parse(profile.skills || '[]');
                    profile.images = JSON.parse(profile.images || '[]');
                }
            } else {
                profile = prepare('SELECT * FROM business_profiles WHERE user_id = ?')
                    .get(match.other_user_id);
                if (profile) {
                    profile.images = JSON.parse(profile.images || '[]');
                }
            }

            // Get last message
            const lastMessage = prepare(`
                SELECT * FROM messages WHERE match_id = ? ORDER BY created_at DESC LIMIT 1
            `).get(match.id);

            // Get unread count
            const unreadCount = prepare(`
                SELECT COUNT(*) as count FROM messages
                WHERE match_id = ? AND sender_id != ? AND read_at IS NULL
            `).get(match.id, userId);

            return {
                id: match.id,
                matched_at: match.matched_at,
                user: otherUser,
                profile,
                lastMessage,
                unreadCount: unreadCount.count
            };
        });

        res.json({ matches: matchesWithProfiles });
    } catch (error) {
        console.error('Get matches error:', error);
        res.status(500).json({ error: 'Failed to get matches' });
    }
});

module.exports = router;
