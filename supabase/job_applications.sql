-- ============================================
-- JOB APPLICATIONS TABLE AND FUNCTIONS
-- Run this in Supabase SQL Editor
-- ============================================

-- Create job_applications table
CREATE TABLE IF NOT EXISTS public.job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.job_posts(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cover_letter TEXT,
    resume_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'shortlisted', 'rejected', 'hired', 'withdrawn')),
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    UNIQUE(job_id, worker_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON public.job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_worker_id ON public.job_applications(worker_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON public.job_applications(status);

-- Enable RLS
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_applications

-- Workers can view their own applications
CREATE POLICY "Workers can view own applications"
ON public.job_applications FOR SELECT
TO authenticated
USING (worker_id = auth.uid());

-- Business owners can view applications for their jobs
CREATE POLICY "Business owners can view job applications"
ON public.job_applications FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.job_posts
        WHERE job_posts.id = job_applications.job_id
        AND job_posts.business_id = auth.uid()
    )
);

-- Workers can create applications
CREATE POLICY "Workers can apply to jobs"
ON public.job_applications FOR INSERT
TO authenticated
WITH CHECK (
    worker_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'worker'
    )
);

-- Workers can withdraw their applications
CREATE POLICY "Workers can update own applications"
ON public.job_applications FOR UPDATE
TO authenticated
USING (worker_id = auth.uid())
WITH CHECK (worker_id = auth.uid());

-- Business owners can update application status
CREATE POLICY "Business owners can update application status"
ON public.job_applications FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.job_posts
        WHERE job_posts.id = job_applications.job_id
        AND job_posts.business_id = auth.uid()
    )
);

-- Function to increment job applications count
CREATE OR REPLACE FUNCTION public.increment_job_applications(job_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.job_posts
    SET applications_count = COALESCE(applications_count, 0) + 1,
        updated_at = NOW()
    WHERE id = job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement job applications count
CREATE OR REPLACE FUNCTION public.decrement_job_applications(job_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.job_posts
    SET applications_count = GREATEST(0, COALESCE(applications_count, 0) - 1),
        updated_at = NOW()
    WHERE id = job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.increment_job_applications(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_job_applications(UUID) TO authenticated;

-- Auto-update updated_at on job_applications
CREATE OR REPLACE FUNCTION public.update_job_application_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS job_applications_updated_at ON public.job_applications;
CREATE TRIGGER job_applications_updated_at
    BEFORE UPDATE ON public.job_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_job_application_timestamp();

-- Trigger to auto-increment applications count on insert
CREATE OR REPLACE FUNCTION public.auto_increment_applications()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.job_posts
    SET applications_count = COALESCE(applications_count, 0) + 1
    WHERE id = NEW.job_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS job_application_insert_trigger ON public.job_applications;
CREATE TRIGGER job_application_insert_trigger
    AFTER INSERT ON public.job_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_increment_applications();

-- Trigger to auto-decrement applications count on withdrawal
CREATE OR REPLACE FUNCTION public.auto_decrement_applications()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'withdrawn' AND OLD.status != 'withdrawn' THEN
        UPDATE public.job_posts
        SET applications_count = GREATEST(0, COALESCE(applications_count, 0) - 1)
        WHERE id = NEW.job_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS job_application_withdraw_trigger ON public.job_applications;
CREATE TRIGGER job_application_withdraw_trigger
    AFTER UPDATE ON public.job_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_decrement_applications();

-- Success message
SELECT 'Job applications table and functions created successfully!' as message;
