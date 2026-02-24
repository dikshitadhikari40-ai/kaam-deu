/**
 * Blocks API Routes
 *
 * Allow users to block/unblock other users:
 * - POST /api/blocks - Block a user
 * - DELETE /api/blocks/:blockedId - Unblock a user
 * - GET /api/blocks - Get list of blocked users
 * - GET /api/blocks/check/:userId - Check if a user is blocked
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { prepare } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/blocks
 * Block a user
 */
router.post('/', authMiddleware, (req, res) => {
    try {
        const { blockedId } = req.body;
        const blockerId = req.user.id;

        // Validate required field
        if (!blockedId) {
            return res.status(400).json({ error: 'blockedId is required' });
        }

        // Cannot block yourself
        if (blockedId === blockerId) {
            return res.status(400).json({ error: 'You cannot block yourself' });
        }

        // Check if target user exists
        const targetUser = prepare('SELECT id FROM users WHERE id = ?').get(blockedId);
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if already blocked
        const existingBlock = prepare(`
            SELECT id FROM blocks WHERE blocker_id = ? AND blocked_id = ?
        `).get(blockerId, blockedId);

        if (existingBlock) {
            return res.status(400).json({ error: 'User is already blocked' });
        }

        const blockId = uuidv4();

        prepare(`
            INSERT INTO blocks (id, blocker_id, blocked_id)
            VALUES (?, ?, ?)
        `).run(blockId, blockerId, blockedId);

        // Optionally: Deactivate any existing matches between these users
        // This ensures blocked users can't continue chatting
        prepare(`
            UPDATE matches
            SET status = 'archived'
            WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
        `).run(blockerId, blockedId, blockedId, blockerId);

        res.status(201).json({
            data: {
                id: blockId,
                blocker_id: blockerId,
                blocked_id: blockedId,
                message: 'User blocked successfully'
            }
        });
    } catch (error) {
        console.error('Block user error:', error);
        res.status(500).json({ error: 'Failed to block user' });
    }
});

/**
 * DELETE /api/blocks/:blockedId
 * Unblock a user
 */
router.delete('/:blockedId', authMiddleware, (req, res) => {
    try {
        const { blockedId } = req.params;
        const blockerId = req.user.id;

        // Check if block exists
        const existingBlock = prepare(`
            SELECT id FROM blocks WHERE blocker_id = ? AND blocked_id = ?
        `).get(blockerId, blockedId);

        if (!existingBlock) {
            return res.status(404).json({ error: 'Block not found' });
        }

        prepare(`
            DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?
        `).run(blockerId, blockedId);

        res.json({
            data: { message: 'User unblocked successfully' }
        });
    } catch (error) {
        console.error('Unblock user error:', error);
        res.status(500).json({ error: 'Failed to unblock user' });
    }
});

/**
 * GET /api/blocks
 * Get list of all users blocked by current user
 */
router.get('/', authMiddleware, (req, res) => {
    try {
        const blockerId = req.user.id;

        const blockedUsers = prepare(`
            SELECT
                b.id as block_id,
                b.blocked_id,
                b.created_at as blocked_at,
                u.email,
                u.role,
                CASE
                    WHEN u.role = 'worker' THEN wp.name
                    WHEN u.role = 'business' THEN bp.company_name
                END as name,
                CASE
                    WHEN u.role = 'worker' THEN (SELECT images FROM worker_profiles WHERE user_id = u.id)
                    WHEN u.role = 'business' THEN bp.logo_url
                END as photo
            FROM blocks b
            JOIN users u ON b.blocked_id = u.id
            LEFT JOIN worker_profiles wp ON u.id = wp.user_id AND u.role = 'worker'
            LEFT JOIN business_profiles bp ON u.id = bp.user_id AND u.role = 'business'
            WHERE b.blocker_id = ?
            ORDER BY b.created_at DESC
        `).all(blockerId);

        res.json({ data: blockedUsers });
    } catch (error) {
        console.error('Get blocked users error:', error);
        res.status(500).json({ error: 'Failed to fetch blocked users' });
    }
});

/**
 * GET /api/blocks/check/:userId
 * Check if a specific user is blocked (either direction)
 */
router.get('/check/:userId', authMiddleware, (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;

        // Check if either user has blocked the other
        const block = prepare(`
            SELECT
                id,
                blocker_id,
                blocked_id
            FROM blocks
            WHERE (blocker_id = ? AND blocked_id = ?)
               OR (blocker_id = ? AND blocked_id = ?)
        `).get(currentUserId, userId, userId, currentUserId);

        if (block) {
            res.json({
                data: {
                    isBlocked: true,
                    blockedByMe: block.blocker_id === currentUserId,
                    blockedByThem: block.blocker_id === userId
                }
            });
        } else {
            res.json({
                data: {
                    isBlocked: false,
                    blockedByMe: false,
                    blockedByThem: false
                }
            });
        }
    } catch (error) {
        console.error('Check block status error:', error);
        res.status(500).json({ error: 'Failed to check block status' });
    }
});

module.exports = router;
