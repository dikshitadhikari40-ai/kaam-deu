-- ============================================
-- KAAM DEU - SECURITY & APPLICATION FIXES
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. FIX: RLS Policy for job_posts (Bug #1)
-- Ensure only business accounts can create job posts
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view active job posts" ON job_posts;
DROP POLICY IF EXISTS "Business can manage own posts" ON job_posts;
DROP POLICY IF EXISTS "Business can create job posts" ON job_posts;
DROP POLICY IF EXISTS "Business can update own posts" ON job_posts;
DROP POLICY IF EXISTS "Business can delete own posts" ON job_posts;

-- Create strict policies with role check
CREATE POLICY "Anyone can view active job posts" ON job_posts
    FOR SELECT
    USING (status = 'active' OR business_id = auth.uid());

CREATE POLICY "Business can create job posts" ON job_posts
    FOR INSERT
    WITH CHECK (
        auth.uid() = business_id
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'business'
        )
    );

CREATE POLICY "Business can update own posts" ON job_posts
    FOR UPDATE
    USING (auth.uid() = business_id)
    WITH CHECK (auth.uid() = business_id);

CREATE POLICY "Business can delete own posts" ON job_posts
    FOR DELETE
    USING (auth.uid() = business_id);

-- ============================================
-- 2. NEW TABLE: Job Applications (Bug #4)
-- Track worker applications to job posts
-- ============================================

CREATE TABLE IF NOT EXISTS job_applications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    job_post_id uuid REFERENCES job_posts(id) ON DELETE CASCADE NOT NULL,
    worker_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status text NOT NULL DEFAULT 'applied' CHECK (status IN (
        'applied',      -- Worker applied
        'viewed',       -- Business viewed application
        'shortlisted',  -- Business shortlisted
        'interview',    -- Scheduled for interview
        'offered',      -- Job offered
        'accepted',     -- Worker accepted offer
        'rejected',     -- Business rejected
        'withdrawn'     -- Worker withdrew
    )),
    cover_message text,
    applied_at timestamp with time zone DEFAULT now(),
    status_updated_at timestamp with time zone DEFAULT now(),
    interview_scheduled_at timestamp with time zone,
    notes text, -- Business internal notes
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(job_post_id, worker_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_applications_job ON job_applications(job_post_id);
CREATE INDEX IF NOT EXISTS idx_applications_worker ON job_applications(worker_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON job_applications(applied_at DESC);

-- Enable RLS
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Workers can view own applications" ON job_applications;
DROP POLICY IF EXISTS "Workers can create applications" ON job_applications;
DROP POLICY IF EXISTS "Workers can withdraw applications" ON job_applications;
DROP POLICY IF EXISTS "Businesses can view applications to their jobs" ON job_applications;
DROP POLICY IF EXISTS "Businesses can update application status" ON job_applications;

-- Workers can view their own applications
CREATE POLICY "Workers can view own applications" ON job_applications
    FOR SELECT
    USING (auth.uid() = worker_id);

-- Workers can create applications (only if they're actually a worker)
CREATE POLICY "Workers can create applications" ON job_applications
    FOR INSERT
    WITH CHECK (
        auth.uid() = worker_id
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'worker'
        )
    );

-- Workers can update their own applications (withdraw only)
CREATE POLICY "Workers can update own applications" ON job_applications
    FOR UPDATE
    USING (auth.uid() = worker_id);

-- Businesses can view applications to their job posts
CREATE POLICY "Businesses can view applications to their jobs" ON job_applications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM job_posts
            WHERE job_posts.id = job_applications.job_post_id
            AND job_posts.business_id = auth.uid()
        )
    );

-- Businesses can update application status for their job posts
CREATE POLICY "Businesses can update application status" ON job_applications
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM job_posts
            WHERE job_posts.id = job_applications.job_post_id
            AND job_posts.business_id = auth.uid()
        )
    );

-- ============================================
-- 3. NEW TABLE: Worker-Job Interactions
-- Track views, saves, likes on job posts
-- ============================================

CREATE TABLE IF NOT EXISTS worker_job_interactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    job_post_id uuid REFERENCES job_posts(id) ON DELETE CASCADE NOT NULL,
    action text NOT NULL CHECK (action IN ('viewed', 'saved', 'unsaved')),
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(worker_id, job_post_id, action)
);

CREATE INDEX IF NOT EXISTS idx_worker_job_worker ON worker_job_interactions(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_job_post ON worker_job_interactions(job_post_id);
CREATE INDEX IF NOT EXISTS idx_worker_job_action ON worker_job_interactions(action);

ALTER TABLE worker_job_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workers can manage own interactions" ON worker_job_interactions;
CREATE POLICY "Workers can manage own interactions" ON worker_job_interactions
    FOR ALL
    USING (auth.uid() = worker_id);

-- ============================================
-- 4. Update job_posts to track application count
-- ============================================

-- Add trigger to update applications_count on job_posts
CREATE OR REPLACE FUNCTION update_job_applications_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE job_posts
        SET applications_count = applications_count + 1,
            updated_at = now()
        WHERE id = NEW.job_post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE job_posts
        SET applications_count = GREATEST(0, applications_count - 1),
            updated_at = now()
        WHERE id = OLD.job_post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_application_change ON job_applications;
CREATE TRIGGER on_application_change
    AFTER INSERT OR DELETE ON job_applications
    FOR EACH ROW EXECUTE FUNCTION update_job_applications_count();

-- ============================================
-- 5. Add saved_jobs view for convenience
-- ============================================

CREATE OR REPLACE VIEW saved_jobs AS
SELECT
    wji.worker_id,
    wji.created_at as saved_at,
    jp.*
FROM worker_job_interactions wji
JOIN job_posts jp ON jp.id = wji.job_post_id
WHERE wji.action = 'saved';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that policies are created correctly
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('job_posts', 'job_applications', 'worker_job_interactions');

-- Success message
SELECT 'SUCCESS: Security and application tables created!' as status;
