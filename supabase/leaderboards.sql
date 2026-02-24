-- ============================================
-- KAAM DEU - LEADERBOARDS SYSTEM
-- ============================================

-- WORKER LEADERBOARD VIEW
-- Scoring:
--   - Badges (earned_at exists): 10 points each
--   - Completed Jobs (job_applications.status = 'hired'): 5 points each
--   - Average Rating: 2 points * average rating (1-5)
-- ============================================

DROP VIEW IF EXISTS public.worker_leaderboard CASCADE;

CREATE VIEW public.worker_leaderboard AS
WITH worker_stats AS (
    SELECT 
        p.id as user_id,
        p.name,
        p.photos[1] as profile_pic,
        p.job_title,
        -- Count badges
        COALESCE((
            SELECT COUNT(*) FROM user_badges ub 
            WHERE ub.user_id = p.id
        ), 0) as badge_count,
        -- Count completed jobs (hired)
        COALESCE((
            SELECT COUNT(*) FROM job_applications ja
            WHERE ja.worker_id = p.id AND ja.status = 'hired'
        ), 0) as jobs_completed,
        -- Average rating
        COALESCE((
            SELECT AVG(rating) FROM reviews r
            WHERE r.reviewed_id = p.id AND r.type = 'business_to_worker'
        ), 0) as avg_rating
    FROM profiles p
    WHERE p.role = 'worker' AND p.is_active = TRUE
)
SELECT 
    user_id,
    name,
    profile_pic,
    job_title,
    badge_count,
    jobs_completed,
    (badge_count * 10 + jobs_completed * 5 + ROUND(avg_rating::numeric * 2)) as total_score,
    RANK() OVER (ORDER BY (badge_count * 10 + jobs_completed * 5 + ROUND(avg_rating::numeric * 2)) DESC) as rank
FROM worker_stats
ORDER BY total_score DESC;

-- BUSINESS LEADERBOARD VIEW
-- Scoring:
--   - Active Jobs: 5 points each
--   - People Hired (Total): 10 points each
--   - Average Rating: 2 points * average rating (1-5)
-- ============================================

DROP VIEW IF EXISTS public.business_leaderboard CASCADE;

CREATE VIEW public.business_leaderboard AS
WITH business_stats AS (
    SELECT 
        p.id as user_id,
        p.company_name as name,
        p.logo_url as profile_pic,
        p.industry as job_title,
        -- Count active jobs
        COALESCE((
            SELECT COUNT(*) FROM job_posts jp 
            WHERE jp.business_id = p.id AND jp.status = 'active'
        ), 0) as active_jobs,
        -- Count total hired workers
        COALESCE((
            SELECT COUNT(*) FROM job_applications ja
            JOIN job_posts jp ON ja.job_id = jp.id
            WHERE jp.business_id = p.id AND ja.status = 'hired'
        ), 0) as people_hired,
        -- Average rating
        COALESCE((
            SELECT AVG(rating) FROM reviews r
            WHERE r.reviewed_id = p.id AND r.type = 'worker_to_business'
        ), 0) as avg_rating
    FROM profiles p
    WHERE p.role = 'business' AND p.is_active = TRUE
)
SELECT 
    user_id,
    name,
    profile_pic,
    job_title,
    active_jobs,
    people_hired,
    (active_jobs * 5 + people_hired * 10 + ROUND(avg_rating::numeric * 2)) as total_score,
    RANK() OVER (ORDER BY (active_jobs * 5 + people_hired * 10 + ROUND(avg_rating::numeric * 2)) DESC) as rank
FROM business_stats
ORDER BY total_score DESC;

-- GRANT ACCESS
GRANT SELECT ON public.worker_leaderboard TO authenticated;
GRANT SELECT ON public.business_leaderboard TO authenticated;
GRANT SELECT ON public.worker_leaderboard TO anon;
GRANT SELECT ON public.business_leaderboard TO anon;
