/**
 * Job Posts API Routes
 *
 * CRUD operations for job posts:
 * - POST /api/jobs - Create a new job (business only)
 * - GET /api/jobs - List all active jobs with filters
 * - GET /api/jobs/mine - List current business's jobs
 * - GET /api/jobs/applications/mine - List worker's applications
 * - GET /api/jobs/:id - Get a single job by ID
 * - PUT /api/jobs/:id - Update a job (owner only)
 * - DELETE /api/jobs/:id - Delete/archive a job (owner only)
 *
 * Job Application Routes:
 * - POST /api/jobs/:id/apply - Apply to a job (workers only)
 * - GET /api/jobs/:id/applications - Get applications for a job (owner only)
 * - GET /api/jobs/:id/has-applied - Check if user has applied
 * - PATCH /api/jobs/:jobId/applications/:applicationId - Update application status
 * - DELETE /api/jobs/:jobId/applications/:applicationId - Withdraw application
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { prepare } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/jobs
 * Create a new job post (business only)
 */
router.post('/', authMiddleware, (req, res) => {
    try {
        // Only businesses can create jobs
        if (req.user.role !== 'business') {
            return res.status(403).json({ error: 'Only businesses can create job posts' });
        }

        const {
            title,
            description,
            category,
            location,
            latitude,
            longitude,
            salary_min,
            salary_max,
            salary_type,
            employment_type,
            requirements,
            skills_required,
            is_remote,
            expires_at
        } = req.body;

        // Validate required fields
        if (!title || !description) {
            return res.status(400).json({ error: 'Title and description are required' });
        }

        if (!location && !is_remote) {
            return res.status(400).json({ error: 'Location is required for non-remote jobs' });
        }

        const jobId = uuidv4();

        prepare(`
            INSERT INTO job_posts (
                id, business_id, title, description, category, location,
                latitude, longitude, salary_min, salary_max, salary_type,
                employment_type, requirements, skills_required, is_remote,
                status, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
        `).run(
            jobId,
            req.user.id,
            title,
            description,
            category || null,
            location || (is_remote ? 'Remote' : null),
            latitude || null,
            longitude || null,
            salary_min || null,
            salary_max || null,
            salary_type || 'monthly',
            employment_type || 'full_time',
            JSON.stringify(requirements || []),
            JSON.stringify(skills_required || []),
            is_remote ? 1 : 0,
            expires_at || null
        );

        // Fetch the created job
        const job = prepare('SELECT * FROM job_posts WHERE id = ?').get(jobId);
        job.requirements = JSON.parse(job.requirements || '[]');
        job.skills_required = JSON.parse(job.skills_required || '[]');
        job.is_remote = !!job.is_remote;

        res.status(201).json({ data: job });
    } catch (error) {
        console.error('Create job error:', error);
        res.status(500).json({ error: 'Failed to create job post' });
    }
});

/**
 * GET /api/jobs
 * List all active jobs with optional filters
 */
router.get('/', authMiddleware, (req, res) => {
    try {
        const {
            category,
            location,
            employment_type,
            is_remote,
            salary_min,
            salary_max,
            limit = 20,
            offset = 0
        } = req.query;

        let query = `
            SELECT
                jp.*,
                bp.company_name,
                bp.logo_url,
                bp.industry,
                bp.verified as business_verified
            FROM job_posts jp
            LEFT JOIN business_profiles bp ON jp.business_id = bp.user_id
            WHERE jp.status = 'active'
        `;
        const params = [];

        // Apply filters
        if (category) {
            query += ' AND jp.category = ?';
            params.push(category);
        }

        if (location) {
            query += ' AND jp.location LIKE ?';
            params.push(`%${location}%`);
        }

        if (employment_type) {
            query += ' AND jp.employment_type = ?';
            params.push(employment_type);
        }

        if (is_remote === 'true' || is_remote === '1') {
            query += ' AND jp.is_remote = 1';
        }

        if (salary_min) {
            query += ' AND (jp.salary_max >= ? OR jp.salary_max IS NULL)';
            params.push(parseInt(salary_min));
        }

        if (salary_max) {
            query += ' AND (jp.salary_min <= ? OR jp.salary_min IS NULL)';
            params.push(parseInt(salary_max));
        }

        // Order and pagination
        query += ' ORDER BY jp.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const jobs = prepare(query).all(...params);

        // Parse JSON fields
        const formattedJobs = jobs.map(job => ({
            ...job,
            requirements: JSON.parse(job.requirements || '[]'),
            skills_required: JSON.parse(job.skills_required || '[]'),
            is_remote: !!job.is_remote,
            business_verified: !!job.business_verified
        }));

        res.json({ data: formattedJobs });
    } catch (error) {
        console.error('List jobs error:', error);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

/**
 * GET /api/jobs/mine
 * List current business user's job posts
 */
router.get('/mine', authMiddleware, (req, res) => {
    try {
        if (req.user.role !== 'business') {
            return res.status(403).json({ error: 'Only businesses can view their job posts' });
        }

        const jobs = prepare(`
            SELECT * FROM job_posts
            WHERE business_id = ?
            ORDER BY created_at DESC
        `).all(req.user.id);

        const formattedJobs = jobs.map(job => ({
            ...job,
            requirements: JSON.parse(job.requirements || '[]'),
            skills_required: JSON.parse(job.skills_required || '[]'),
            is_remote: !!job.is_remote
        }));

        res.json({ data: formattedJobs });
    } catch (error) {
        console.error('Get my jobs error:', error);
        res.status(500).json({ error: 'Failed to fetch your job posts' });
    }
});

/**
 * GET /api/jobs/:id
 * Get a single job post by ID
 */
router.get('/:id', authMiddleware, (req, res) => {
    try {
        const { id } = req.params;

        const job = prepare(`
            SELECT
                jp.*,
                bp.company_name,
                bp.logo_url,
                bp.industry,
                bp.description as company_description,
                bp.location as company_location,
                bp.verified as business_verified
            FROM job_posts jp
            LEFT JOIN business_profiles bp ON jp.business_id = bp.user_id
            WHERE jp.id = ?
        `).get(id);

        if (!job) {
            return res.status(404).json({ error: 'Job post not found' });
        }

        job.requirements = JSON.parse(job.requirements || '[]');
        job.skills_required = JSON.parse(job.skills_required || '[]');
        job.is_remote = !!job.is_remote;
        job.business_verified = !!job.business_verified;

        res.json({ data: job });
    } catch (error) {
        console.error('Get job error:', error);
        res.status(500).json({ error: 'Failed to fetch job post' });
    }
});

/**
 * PUT /api/jobs/:id
 * Update a job post (owner only)
 */
router.put('/:id', authMiddleware, (req, res) => {
    try {
        const { id } = req.params;

        // Check ownership
        const existingJob = prepare('SELECT * FROM job_posts WHERE id = ?').get(id);

        if (!existingJob) {
            return res.status(404).json({ error: 'Job post not found' });
        }

        if (existingJob.business_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only update your own job posts' });
        }

        const {
            title,
            description,
            category,
            location,
            latitude,
            longitude,
            salary_min,
            salary_max,
            salary_type,
            employment_type,
            requirements,
            skills_required,
            is_remote,
            status,
            expires_at
        } = req.body;

        prepare(`
            UPDATE job_posts SET
                title = COALESCE(?, title),
                description = COALESCE(?, description),
                category = COALESCE(?, category),
                location = COALESCE(?, location),
                latitude = COALESCE(?, latitude),
                longitude = COALESCE(?, longitude),
                salary_min = COALESCE(?, salary_min),
                salary_max = COALESCE(?, salary_max),
                salary_type = COALESCE(?, salary_type),
                employment_type = COALESCE(?, employment_type),
                requirements = COALESCE(?, requirements),
                skills_required = COALESCE(?, skills_required),
                is_remote = COALESCE(?, is_remote),
                status = COALESCE(?, status),
                expires_at = COALESCE(?, expires_at),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            title || null,
            description || null,
            category || null,
            location || null,
            latitude || null,
            longitude || null,
            salary_min || null,
            salary_max || null,
            salary_type || null,
            employment_type || null,
            requirements ? JSON.stringify(requirements) : null,
            skills_required ? JSON.stringify(skills_required) : null,
            is_remote !== undefined ? (is_remote ? 1 : 0) : null,
            status || null,
            expires_at || null,
            id
        );

        // Fetch updated job
        const job = prepare('SELECT * FROM job_posts WHERE id = ?').get(id);
        job.requirements = JSON.parse(job.requirements || '[]');
        job.skills_required = JSON.parse(job.skills_required || '[]');
        job.is_remote = !!job.is_remote;

        res.json({ data: job });
    } catch (error) {
        console.error('Update job error:', error);
        res.status(500).json({ error: 'Failed to update job post' });
    }
});

/**
 * DELETE /api/jobs/:id
 * Archive/delete a job post (owner only)
 */
router.delete('/:id', authMiddleware, (req, res) => {
    try {
        const { id } = req.params;

        // Check ownership
        const existingJob = prepare('SELECT * FROM job_posts WHERE id = ?').get(id);

        if (!existingJob) {
            return res.status(404).json({ error: 'Job post not found' });
        }

        if (existingJob.business_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only delete your own job posts' });
        }

        // Soft delete by setting status to 'archived'
        prepare(`
            UPDATE job_posts
            SET status = 'archived', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(id);

        res.json({ data: { message: 'Job post archived successfully' } });
    } catch (error) {
        console.error('Delete job error:', error);
        res.status(500).json({ error: 'Failed to delete job post' });
    }
});

// ============================================
// JOB APPLICATION ROUTES
// ============================================

/**
 * GET /api/jobs/applications/mine
 * Get all applications by current user (workers)
 * NOTE: This route MUST be before /:id routes to avoid conflicts
 */
router.get('/applications/mine', authMiddleware, (req, res) => {
    try {
        if (req.user.role !== 'worker') {
            return res.status(403).json({ error: 'Only workers can view their applications' });
        }

        const { status, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT
                ja.*,
                jp.title as job_title,
                jp.description as job_description,
                jp.location as job_location,
                jp.salary_min,
                jp.salary_max,
                jp.salary_type,
                jp.status as job_status,
                bp.company_name,
                bp.logo_url
            FROM job_applications ja
            LEFT JOIN job_posts jp ON ja.job_id = jp.id
            LEFT JOIN business_profiles bp ON jp.business_id = bp.user_id
            WHERE ja.worker_id = ?
        `;
        const params = [req.user.id];

        if (status) {
            query += ' AND ja.status = ?';
            params.push(status);
        }

        query += ' ORDER BY ja.applied_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const applications = prepare(query).all(...params);

        res.json({ data: applications });
    } catch (error) {
        console.error('Get my applications error:', error);
        res.status(500).json({ error: 'Failed to fetch your applications' });
    }
});

/**
 * POST /api/jobs/:id/apply
 * Apply to a job (workers only)
 */
router.post('/:id/apply', authMiddleware, (req, res) => {
    try {
        // Only workers can apply to jobs
        if (req.user.role !== 'worker') {
            return res.status(403).json({ error: 'Only workers can apply to jobs' });
        }

        const { id: jobId } = req.params;
        const { cover_letter, resume_url } = req.body;

        // Check if job exists and is active
        const job = prepare('SELECT * FROM job_posts WHERE id = ?').get(jobId);

        if (!job) {
            return res.status(404).json({ error: 'Job post not found' });
        }

        if (job.status !== 'active') {
            return res.status(400).json({ error: 'This job is no longer accepting applications' });
        }

        // Check if already applied
        const existingApplication = prepare(
            'SELECT * FROM job_applications WHERE job_id = ? AND worker_id = ?'
        ).get(jobId, req.user.id);

        if (existingApplication) {
            return res.status(400).json({ error: 'You have already applied to this job' });
        }

        // Create application
        const applicationId = uuidv4();
        prepare(`
            INSERT INTO job_applications (id, job_id, worker_id, cover_letter, resume_url)
            VALUES (?, ?, ?, ?, ?)
        `).run(applicationId, jobId, req.user.id, cover_letter || null, resume_url || null);

        // Update applications count
        prepare(`
            UPDATE job_posts
            SET applications_count = applications_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(jobId);

        // Fetch the created application
        const application = prepare('SELECT * FROM job_applications WHERE id = ?').get(applicationId);

        res.status(201).json({ data: application });
    } catch (error) {
        console.error('Apply to job error:', error);
        res.status(500).json({ error: 'Failed to apply to job' });
    }
});

/**
 * GET /api/jobs/:id/applications
 * Get all applications for a job (job owner only)
 */
router.get('/:id/applications', authMiddleware, (req, res) => {
    try {
        const { id: jobId } = req.params;
        const { status, limit = 50, offset = 0 } = req.query;

        // Check job ownership
        const job = prepare('SELECT * FROM job_posts WHERE id = ?').get(jobId);

        if (!job) {
            return res.status(404).json({ error: 'Job post not found' });
        }

        if (job.business_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only view applications for your own jobs' });
        }

        // Build query with JOIN to get worker details (avoiding N+1)
        let query = `
            SELECT
                ja.*,
                wp.name as worker_name,
                wp.job_title as worker_job_title,
                wp.experience_years,
                wp.skills,
                wp.images,
                wp.location as worker_location,
                wp.bio as worker_bio
            FROM job_applications ja
            LEFT JOIN worker_profiles wp ON ja.worker_id = wp.user_id
            WHERE ja.job_id = ?
        `;
        const params = [jobId];

        if (status) {
            query += ' AND ja.status = ?';
            params.push(status);
        }

        query += ' ORDER BY ja.applied_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const applications = prepare(query).all(...params);

        // Parse JSON fields
        const formattedApplications = applications.map(app => ({
            ...app,
            skills: JSON.parse(app.skills || '[]'),
            images: JSON.parse(app.images || '[]'),
        }));

        res.json({ data: formattedApplications });
    } catch (error) {
        console.error('Get applications error:', error);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
});

/**
 * GET /api/jobs/:id/has-applied
 * Check if current user has applied to a job
 */
router.get('/:id/has-applied', authMiddleware, (req, res) => {
    try {
        const { id: jobId } = req.params;

        const application = prepare(
            'SELECT id, status, applied_at FROM job_applications WHERE job_id = ? AND worker_id = ?'
        ).get(jobId, req.user.id);

        res.json({
            data: {
                hasApplied: !!application,
                application: application || null
            }
        });
    } catch (error) {
        console.error('Check application error:', error);
        res.status(500).json({ error: 'Failed to check application status' });
    }
});

/**
 * PATCH /api/jobs/:jobId/applications/:applicationId
 * Update application status (job owner only)
 */
router.patch('/:jobId/applications/:applicationId', authMiddleware, (req, res) => {
    try {
        const { jobId, applicationId } = req.params;
        const { status, notes } = req.body;

        // Validate status
        const validStatuses = ['pending', 'viewed', 'shortlisted', 'rejected', 'hired'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Check job ownership
        const job = prepare('SELECT * FROM job_posts WHERE id = ?').get(jobId);

        if (!job) {
            return res.status(404).json({ error: 'Job post not found' });
        }

        if (job.business_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only update applications for your own jobs' });
        }

        // Check application exists
        const application = prepare(
            'SELECT * FROM job_applications WHERE id = ? AND job_id = ?'
        ).get(applicationId, jobId);

        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        // Update application
        prepare(`
            UPDATE job_applications
            SET status = COALESCE(?, status),
                notes = COALESCE(?, notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(status || null, notes || null, applicationId);

        // If status is 'hired', update the job status too
        if (status === 'hired') {
            prepare(`
                UPDATE job_posts
                SET status = 'filled', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(jobId);
        }

        // Fetch updated application
        const updatedApplication = prepare('SELECT * FROM job_applications WHERE id = ?').get(applicationId);

        res.json({ data: updatedApplication });
    } catch (error) {
        console.error('Update application error:', error);
        res.status(500).json({ error: 'Failed to update application' });
    }
});

/**
 * DELETE /api/jobs/:jobId/applications/:applicationId
 * Withdraw application (applicant only)
 */
router.delete('/:jobId/applications/:applicationId', authMiddleware, (req, res) => {
    try {
        const { jobId, applicationId } = req.params;

        // Check application exists and belongs to user
        const application = prepare(
            'SELECT * FROM job_applications WHERE id = ? AND job_id = ?'
        ).get(applicationId, jobId);

        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        if (application.worker_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only withdraw your own applications' });
        }

        // Don't allow withdrawal if already hired
        if (application.status === 'hired') {
            return res.status(400).json({ error: 'Cannot withdraw a hired application' });
        }

        // Update status to withdrawn
        prepare(`
            UPDATE job_applications
            SET status = 'withdrawn', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(applicationId);

        // Decrement applications count
        prepare(`
            UPDATE job_posts
            SET applications_count = MAX(0, applications_count - 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(jobId);

        res.json({ data: { message: 'Application withdrawn successfully' } });
    } catch (error) {
        console.error('Withdraw application error:', error);
        res.status(500).json({ error: 'Failed to withdraw application' });
    }
});

module.exports = router;
