/**
 * Reviews API Routes
 *
 * Allow workers and businesses to review each other:
 * - POST /api/reviews - Create a new review
 * - GET /api/reviews/:targetId - Get all reviews for a user
 * - GET /api/reviews/me - Get reviews received by current user
 * - GET /api/reviews/given - Get reviews given by current user
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { prepare } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/reviews
 * Create a new review for a user
 */
router.post('/', authMiddleware, (req, res) => {
    try {
        const { targetId, matchId, rating, comment } = req.body;
        const reviewerId = req.user.id;

        // Validate required fields
        if (!targetId) {
            return res.status(400).json({ error: 'Target user ID is required' });
        }

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        // Cannot review yourself
        if (targetId === reviewerId) {
            return res.status(400).json({ error: 'You cannot review yourself' });
        }

        // Check if target user exists
        const targetUser = prepare('SELECT id, role FROM users WHERE id = ?').get(targetId);
        if (!targetUser) {
            return res.status(404).json({ error: 'Target user not found' });
        }

        // Determine review type based on roles
        const reviewerRole = req.user.role;
        const targetRole = targetUser.role;
        let reviewType = null;

        if (reviewerRole === 'worker' && targetRole === 'business') {
            reviewType = 'worker_to_business';
        } else if (reviewerRole === 'business' && targetRole === 'worker') {
            reviewType = 'business_to_worker';
        }

        // Check if already reviewed this user (for this match if provided)
        const existingReview = matchId
            ? prepare('SELECT id FROM reviews WHERE reviewer_id = ? AND target_id = ? AND match_id = ?')
                .get(reviewerId, targetId, matchId)
            : prepare('SELECT id FROM reviews WHERE reviewer_id = ? AND target_id = ? AND match_id IS NULL')
                .get(reviewerId, targetId);

        if (existingReview) {
            return res.status(400).json({ error: 'You have already reviewed this user' });
        }

        const reviewId = uuidv4();

        prepare(`
            INSERT INTO reviews (id, reviewer_id, target_id, match_id, rating, comment, type)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            reviewId,
            reviewerId,
            targetId,
            matchId || null,
            rating,
            comment || null,
            reviewType
        );

        // Fetch the created review
        const review = prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId);

        res.status(201).json({ data: review });
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({ error: 'Failed to create review' });
    }
});

/**
 * GET /api/reviews/me
 * Get all reviews received by current user
 */
router.get('/me', authMiddleware, (req, res) => {
    try {
        const userId = req.user.id;

        const reviews = prepare(`
            SELECT
                r.*,
                u.email as reviewer_email,
                u.role as reviewer_role,
                CASE
                    WHEN u.role = 'worker' THEN wp.name
                    WHEN u.role = 'business' THEN bp.company_name
                END as reviewer_name,
                CASE
                    WHEN u.role = 'worker' THEN (SELECT images FROM worker_profiles WHERE user_id = u.id)
                    WHEN u.role = 'business' THEN bp.logo_url
                END as reviewer_photo
            FROM reviews r
            JOIN users u ON r.reviewer_id = u.id
            LEFT JOIN worker_profiles wp ON u.id = wp.user_id AND u.role = 'worker'
            LEFT JOIN business_profiles bp ON u.id = bp.user_id AND u.role = 'business'
            WHERE r.target_id = ?
            ORDER BY r.created_at DESC
        `).all(userId);

        // Calculate average rating
        const avgResult = prepare(`
            SELECT AVG(rating) as average, COUNT(*) as count
            FROM reviews WHERE target_id = ?
        `).get(userId);

        res.json({
            data: {
                reviews,
                stats: {
                    average: avgResult.average ? Math.round(avgResult.average * 10) / 10 : 0,
                    count: avgResult.count || 0
                }
            }
        });
    } catch (error) {
        console.error('Get my reviews error:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

/**
 * GET /api/reviews/given
 * Get all reviews given by current user
 */
router.get('/given', authMiddleware, (req, res) => {
    try {
        const userId = req.user.id;

        const reviews = prepare(`
            SELECT
                r.*,
                u.email as target_email,
                u.role as target_role,
                CASE
                    WHEN u.role = 'worker' THEN wp.name
                    WHEN u.role = 'business' THEN bp.company_name
                END as target_name
            FROM reviews r
            JOIN users u ON r.target_id = u.id
            LEFT JOIN worker_profiles wp ON u.id = wp.user_id AND u.role = 'worker'
            LEFT JOIN business_profiles bp ON u.id = bp.user_id AND u.role = 'business'
            WHERE r.reviewer_id = ?
            ORDER BY r.created_at DESC
        `).all(userId);

        res.json({ data: reviews });
    } catch (error) {
        console.error('Get given reviews error:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

/**
 * GET /api/reviews/:targetId
 * Get all reviews for a specific user
 */
router.get('/:targetId', authMiddleware, (req, res) => {
    try {
        const { targetId } = req.params;

        // Check if target user exists
        const targetUser = prepare('SELECT id FROM users WHERE id = ?').get(targetId);
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const reviews = prepare(`
            SELECT
                r.*,
                u.email as reviewer_email,
                u.role as reviewer_role,
                CASE
                    WHEN u.role = 'worker' THEN wp.name
                    WHEN u.role = 'business' THEN bp.company_name
                END as reviewer_name,
                CASE
                    WHEN u.role = 'worker' THEN (SELECT images FROM worker_profiles WHERE user_id = u.id)
                    WHEN u.role = 'business' THEN bp.logo_url
                END as reviewer_photo
            FROM reviews r
            JOIN users u ON r.reviewer_id = u.id
            LEFT JOIN worker_profiles wp ON u.id = wp.user_id AND u.role = 'worker'
            LEFT JOIN business_profiles bp ON u.id = bp.user_id AND u.role = 'business'
            WHERE r.target_id = ?
            ORDER BY r.created_at DESC
        `).all(targetId);

        // Calculate average rating
        const avgResult = prepare(`
            SELECT AVG(rating) as average, COUNT(*) as count
            FROM reviews WHERE target_id = ?
        `).get(targetId);

        res.json({
            data: {
                reviews,
                stats: {
                    average: avgResult.average ? Math.round(avgResult.average * 10) / 10 : 0,
                    count: avgResult.count || 0
                }
            }
        });
    } catch (error) {
        console.error('Get user reviews error:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

module.exports = router;
