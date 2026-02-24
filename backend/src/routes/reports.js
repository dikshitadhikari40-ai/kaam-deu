/**
 * Reports API Routes
 *
 * Allow users to report other users or job posts:
 * - POST /api/reports - Create a new report
 * - GET /api/reports - Get reports filed by current user
 * - GET /api/reports/:id - Get a specific report by ID
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { prepare } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Valid report reasons
const VALID_REASONS = [
    'inappropriate_content',
    'harassment',
    'spam',
    'fake_profile',
    'scam',
    'misleading_job',
    'discrimination',
    'other'
];

/**
 * POST /api/reports
 * Create a new report for a user or job post
 */
router.post('/', authMiddleware, (req, res) => {
    try {
        const { targetUserId, targetJobId, reason, message } = req.body;
        const reporterId = req.user.id;

        // Must report either a user or a job
        if (!targetUserId && !targetJobId) {
            return res.status(400).json({ error: 'Must provide either targetUserId or targetJobId' });
        }

        // Validate reason
        if (!reason) {
            return res.status(400).json({ error: 'Reason is required' });
        }

        if (!VALID_REASONS.includes(reason)) {
            return res.status(400).json({
                error: `Invalid reason. Must be one of: ${VALID_REASONS.join(', ')}`
            });
        }

        // Cannot report yourself
        if (targetUserId === reporterId) {
            return res.status(400).json({ error: 'You cannot report yourself' });
        }

        // Validate target user exists (if reporting a user)
        if (targetUserId) {
            const targetUser = prepare('SELECT id FROM users WHERE id = ?').get(targetUserId);
            if (!targetUser) {
                return res.status(404).json({ error: 'Target user not found' });
            }

            // Check for existing report on this user
            const existingReport = prepare(`
                SELECT id FROM reports
                WHERE reporter_id = ? AND target_user_id = ? AND status = 'open'
            `).get(reporterId, targetUserId);

            if (existingReport) {
                return res.status(400).json({ error: 'You already have an open report for this user' });
            }
        }

        // Validate target job exists (if reporting a job)
        if (targetJobId) {
            const targetJob = prepare('SELECT id FROM job_posts WHERE id = ?').get(targetJobId);
            if (!targetJob) {
                return res.status(404).json({ error: 'Target job post not found' });
            }

            // Check for existing report on this job
            const existingReport = prepare(`
                SELECT id FROM reports
                WHERE reporter_id = ? AND target_job_id = ? AND status = 'open'
            `).get(reporterId, targetJobId);

            if (existingReport) {
                return res.status(400).json({ error: 'You already have an open report for this job' });
            }
        }

        const reportId = uuidv4();

        prepare(`
            INSERT INTO reports (id, reporter_id, target_user_id, target_job_id, reason, message)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            reportId,
            reporterId,
            targetUserId || null,
            targetJobId || null,
            reason,
            message || null
        );

        // Fetch the created report
        const report = prepare('SELECT * FROM reports WHERE id = ?').get(reportId);

        res.status(201).json({ data: report });
    } catch (error) {
        console.error('Create report error:', error);
        res.status(500).json({ error: 'Failed to create report' });
    }
});

/**
 * GET /api/reports
 * Get all reports filed by current user
 */
router.get('/', authMiddleware, (req, res) => {
    try {
        const reporterId = req.user.id;

        const reports = prepare(`
            SELECT
                r.*,
                CASE
                    WHEN r.target_user_id IS NOT NULL AND tu.role = 'worker' THEN wp.name
                    WHEN r.target_user_id IS NOT NULL AND tu.role = 'business' THEN bp.company_name
                    ELSE NULL
                END as target_name,
                CASE
                    WHEN r.target_user_id IS NOT NULL AND tu.role = 'worker' THEN (SELECT images FROM worker_profiles WHERE user_id = tu.id)
                    WHEN r.target_user_id IS NOT NULL AND tu.role = 'business' THEN bp.logo_url
                    ELSE NULL
                END as target_photo,
                tu.role as target_role,
                jp.title as job_title
            FROM reports r
            LEFT JOIN users tu ON r.target_user_id = tu.id
            LEFT JOIN worker_profiles wp ON tu.id = wp.user_id AND tu.role = 'worker'
            LEFT JOIN business_profiles bp ON tu.id = bp.user_id AND tu.role = 'business'
            LEFT JOIN job_posts jp ON r.target_job_id = jp.id
            WHERE r.reporter_id = ?
            ORDER BY r.created_at DESC
        `).all(reporterId);

        res.json({ data: reports });
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

/**
 * GET /api/reports/:id
 * Get a specific report by ID (only reporter can view)
 */
router.get('/:id', authMiddleware, (req, res) => {
    try {
        const { id } = req.params;
        const reporterId = req.user.id;

        const report = prepare(`
            SELECT
                r.*,
                CASE
                    WHEN r.target_user_id IS NOT NULL AND tu.role = 'worker' THEN wp.name
                    WHEN r.target_user_id IS NOT NULL AND tu.role = 'business' THEN bp.company_name
                    ELSE NULL
                END as target_name,
                tu.role as target_role,
                jp.title as job_title,
                jp.description as job_description
            FROM reports r
            LEFT JOIN users tu ON r.target_user_id = tu.id
            LEFT JOIN worker_profiles wp ON tu.id = wp.user_id AND tu.role = 'worker'
            LEFT JOIN business_profiles bp ON tu.id = bp.user_id AND tu.role = 'business'
            LEFT JOIN job_posts jp ON r.target_job_id = jp.id
            WHERE r.id = ? AND r.reporter_id = ?
        `).get(id, reporterId);

        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        res.json({ data: report });
    } catch (error) {
        console.error('Get report error:', error);
        res.status(500).json({ error: 'Failed to fetch report' });
    }
});

module.exports = router;
