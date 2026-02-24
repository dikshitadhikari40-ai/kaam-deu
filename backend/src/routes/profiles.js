const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { prepare } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get profiles to swipe (feed)
router.get('/feed', authMiddleware, (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        // Workers see businesses, businesses see workers
        const targetRole = userRole === 'worker' ? 'business' : 'worker';

        // Get IDs of users already swiped
        const swipedIds = prepare(`
            SELECT swiped_id FROM swipes WHERE swiper_id = ?
        `).all(userId).map(s => s.swiped_id);

        let profiles = [];

        if (targetRole === 'worker') {
            // Business looking at workers
            const query = `
                SELECT
                    u.id as user_id,
                    u.email,
                    u.role,
                    wp.*
                FROM users u
                JOIN worker_profiles wp ON u.id = wp.user_id
                WHERE u.role = 'worker'
                ${swipedIds.length > 0 ? `AND u.id NOT IN (${swipedIds.map(() => '?').join(',')})` : ''}
                ORDER BY wp.verified DESC, wp.updated_at DESC
                LIMIT 20
            `;
            profiles = prepare(query).all(...swipedIds);

            profiles = profiles.map(p => ({
                ...p,
                skills: JSON.parse(p.skills || '[]'),
                images: JSON.parse(p.images || '[]')
            }));
        } else {
            // Worker looking at businesses
            const query = `
                SELECT
                    u.id as user_id,
                    u.email,
                    u.role,
                    bp.*
                FROM users u
                JOIN business_profiles bp ON u.id = bp.user_id
                WHERE u.role = 'business'
                ${swipedIds.length > 0 ? `AND u.id NOT IN (${swipedIds.map(() => '?').join(',')})` : ''}
                ORDER BY bp.verified DESC, bp.updated_at DESC
                LIMIT 20
            `;
            profiles = prepare(query).all(...swipedIds);

            profiles = profiles.map(p => ({
                ...p,
                images: JSON.parse(p.images || '[]')
            }));
        }

        res.json({ profiles });
    } catch (error) {
        console.error('Feed error:', error);
        res.status(500).json({ error: 'Failed to get feed' });
    }
});

// Update worker profile
router.put('/worker', authMiddleware, (req, res) => {
    try {
        if (req.user.role !== 'worker') {
            return res.status(403).json({ error: 'Only workers can update worker profiles' });
        }

        const { name, age, phone, location, bio, job_title, experience_years, expected_salary_npr, skills, images } = req.body;

        prepare(`
            UPDATE worker_profiles
            SET name = COALESCE(?, name),
                age = COALESCE(?, age),
                phone = COALESCE(?, phone),
                location = COALESCE(?, location),
                bio = COALESCE(?, bio),
                job_title = COALESCE(?, job_title),
                experience_years = COALESCE(?, experience_years),
                expected_salary_npr = COALESCE(?, expected_salary_npr),
                skills = COALESCE(?, skills),
                images = COALESCE(?, images),
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `).run(
            name, age, phone, location, bio, job_title, experience_years, expected_salary_npr,
            skills ? JSON.stringify(skills) : null,
            images ? JSON.stringify(images) : null,
            req.user.id
        );

        const profile = prepare('SELECT * FROM worker_profiles WHERE user_id = ?').get(req.user.id);
        profile.skills = JSON.parse(profile.skills || '[]');
        profile.images = JSON.parse(profile.images || '[]');

        res.json({ profile });
    } catch (error) {
        console.error('Update worker profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Update business profile
router.put('/business', authMiddleware, (req, res) => {
    try {
        if (req.user.role !== 'business') {
            return res.status(403).json({ error: 'Only businesses can update business profiles' });
        }

        const { company_name, contact_person, phone, location, description, industry, company_size, logo_url, images } = req.body;

        prepare(`
            UPDATE business_profiles
            SET company_name = COALESCE(?, company_name),
                contact_person = COALESCE(?, contact_person),
                phone = COALESCE(?, phone),
                location = COALESCE(?, location),
                description = COALESCE(?, description),
                industry = COALESCE(?, industry),
                company_size = COALESCE(?, company_size),
                logo_url = COALESCE(?, logo_url),
                images = COALESCE(?, images),
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `).run(
            company_name, contact_person, phone, location, description, industry, company_size, logo_url,
            images ? JSON.stringify(images) : null,
            req.user.id
        );

        const profile = prepare('SELECT * FROM business_profiles WHERE user_id = ?').get(req.user.id);
        profile.images = JSON.parse(profile.images || '[]');

        res.json({ profile });
    } catch (error) {
        console.error('Update business profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Get single profile by user ID
router.get('/:userId', authMiddleware, (req, res) => {
    try {
        const { userId } = req.params;

        const user = prepare('SELECT id, email, role FROM users WHERE id = ?').get(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let profile = null;
        if (user.role === 'worker') {
            profile = prepare('SELECT * FROM worker_profiles WHERE user_id = ?').get(userId);
            if (profile) {
                profile.skills = JSON.parse(profile.skills || '[]');
                profile.images = JSON.parse(profile.images || '[]');
            }
        } else {
            profile = prepare('SELECT * FROM business_profiles WHERE user_id = ?').get(userId);
            if (profile) {
                profile.images = JSON.parse(profile.images || '[]');
            }
        }

        res.json({ user, profile });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

module.exports = router;
