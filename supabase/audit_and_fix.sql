-- ============================================
-- KAAM DEU - COMPREHENSIVE AUDIT & FIX SQL
-- ============================================
-- Run this in Supabase SQL Editor
-- Last updated: December 2024
--
-- This script addresses:
-- A. Fix role/account_type for test accounts
-- B. Add constraints to enforce worker vs business behavior
-- C. Verify and fix swipe → match trigger
-- D. Add worker_id/business_id columns to matches
-- E. Create performance indexes
-- ============================================

-- ============================================
-- PART A: FIX TEST ACCOUNT ROLES (CRITICAL)
-- ============================================
-- PROBLEM IDENTIFIED:
-- - dikshitadhikari40@gmail.com has role='business' but should be 'worker'
-- - This breaks swipe logic (workers see businesses, businesses see workers)

-- Step 1: View current state (diagnostic)
SELECT '=== CURRENT STATE ===' as section;
SELECT
  id,
  email,
  role,
  is_profile_complete,
  name,
  company_name,
  created_at
FROM profiles
WHERE email IN ('dikshitadhikari40@gmail.com', 'bhumauri@gmail.com');

-- Step 2: Fix dikshitadhikari40@gmail.com → WORKER
UPDATE profiles
SET
  role = 'worker',
  -- Clear business-specific fields to prevent confusion
  company_name = NULL,
  company_type = NULL,
  company_size = NULL,
  industry = NULL,
  contact_person = NULL,
  contact_position = NULL,
  contact_phone = NULL,
  is_verified_business = FALSE,
  logo_url = NULL,
  typically_hiring = '{}',
  benefits_offered = '{}',
  updated_at = NOW()
WHERE email = 'dikshitadhikari40@gmail.com';

-- Step 3: Ensure bhumauri@gmail.com → BUSINESS
UPDATE profiles
SET
  role = 'business',
  -- Clear worker-specific fields
  job_title = NULL,
  skills = '{}',
  experience_years = NULL,
  expected_salary_min = NULL,
  expected_salary_max = NULL,
  preferred_employment = '{}',
  availability = NULL,
  resume_url = NULL,
  certifications = '{}',
  updated_at = NOW()
WHERE email = 'bhumauri@gmail.com';


-- ============================================
-- PART B: ADD ROLE CONSTRAINTS & VALIDATION
-- ============================================

-- Ensure all profiles have a valid role (no NULLs)
UPDATE profiles SET role = 'worker' WHERE role IS NULL;

-- Add check constraint for valid roles
DO $$
BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('worker', 'business'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Make role NOT NULL
DO $$
BEGIN
  ALTER TABLE profiles ALTER COLUMN role SET NOT NULL;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Column role constraint handling';
END $$;


-- ============================================
-- PART C: ENFORCE BUSINESS-ONLY JOB POSTS
-- ============================================
-- Trigger to prevent workers from creating job posts

CREATE OR REPLACE FUNCTION public.check_business_can_post_jobs()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = NEW.business_id AND role = 'business'
  ) THEN
    RAISE EXCEPTION 'Only business accounts can create job posts';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_job_post_business ON public.job_posts;
CREATE TRIGGER check_job_post_business
  BEFORE INSERT ON public.job_posts
  FOR EACH ROW EXECUTE FUNCTION public.check_business_can_post_jobs();


-- ============================================
-- PART D: ADD worker_id/business_id TO MATCHES
-- ============================================
-- This makes queries easier and enforces worker-business relationships

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'worker_id'
  ) THEN
    ALTER TABLE public.matches ADD COLUMN worker_id UUID REFERENCES public.profiles(id);
    RAISE NOTICE 'Added worker_id column to matches';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.matches ADD COLUMN business_id UUID REFERENCES public.profiles(id);
    RAISE NOTICE 'Added business_id column to matches';
  END IF;
END $$;

-- Create indexes on new columns
CREATE INDEX IF NOT EXISTS idx_matches_worker ON public.matches(worker_id);
CREATE INDEX IF NOT EXISTS idx_matches_business ON public.matches(business_id);


-- ============================================
-- PART E: ENHANCED AUTO-MATCH TRIGGER
-- ============================================
-- Updated to set worker_id and business_id on match creation

CREATE OR REPLACE FUNCTION public.handle_new_swipe()
RETURNS TRIGGER AS $$
DECLARE
  other_swipe RECORD;
  match_exists BOOLEAN;
  swiper_role TEXT;
  swiped_role TEXT;
  v_worker_id UUID;
  v_business_id UUID;
BEGIN
  -- Log for debugging
  RAISE LOG 'handle_new_swipe: swiper=%, swiped=%, direction=%',
    NEW.swiper_id, NEW.swiped_id, NEW.direction;

  -- Only process right swipes and super likes
  IF NEW.direction IN ('right', 'super', 'up') THEN
    -- Check if other user also swiped right/super
    SELECT * INTO other_swipe
    FROM public.swipes
    WHERE swiper_id = NEW.swiped_id
      AND swiped_id = NEW.swiper_id
      AND direction IN ('right', 'super', 'up');

    IF other_swipe IS NOT NULL THEN
      RAISE LOG 'handle_new_swipe: Mutual swipe found! Creating match...';

      -- Check if match already exists
      SELECT EXISTS(
        SELECT 1 FROM public.matches
        WHERE user1_id = LEAST(NEW.swiper_id, NEW.swiped_id)
          AND user2_id = GREATEST(NEW.swiper_id, NEW.swiped_id)
      ) INTO match_exists;

      IF NOT match_exists THEN
        -- Get roles of both users
        SELECT role INTO swiper_role FROM public.profiles WHERE id = NEW.swiper_id;
        SELECT role INTO swiped_role FROM public.profiles WHERE id = NEW.swiped_id;

        -- Determine worker_id and business_id
        IF swiper_role = 'worker' AND swiped_role = 'business' THEN
          v_worker_id := NEW.swiper_id;
          v_business_id := NEW.swiped_id;
        ELSIF swiper_role = 'business' AND swiped_role = 'worker' THEN
          v_worker_id := NEW.swiped_id;
          v_business_id := NEW.swiper_id;
        ELSE
          -- Both same role - shouldn't happen but handle gracefully
          v_worker_id := NULL;
          v_business_id := NULL;
          RAISE WARNING 'Match between same roles: swiper=% swiped=%', swiper_role, swiped_role;
        END IF;

        -- Create the match (use sorted IDs to prevent duplicates)
        INSERT INTO public.matches (
          user1_id,
          user2_id,
          worker_id,
          business_id,
          matched_at,
          is_active
        )
        VALUES (
          LEAST(NEW.swiper_id, NEW.swiped_id),
          GREATEST(NEW.swiper_id, NEW.swiped_id),
          v_worker_id,
          v_business_id,
          NOW(),
          true
        )
        ON CONFLICT (user1_id, user2_id) DO UPDATE SET
          worker_id = COALESCE(matches.worker_id, EXCLUDED.worker_id),
          business_id = COALESCE(matches.business_id, EXCLUDED.business_id);

        RAISE LOG 'handle_new_swipe: Match created! worker=%, business=%', v_worker_id, v_business_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger
DROP TRIGGER IF EXISTS on_swipe_created ON public.swipes;
CREATE TRIGGER on_swipe_created
  AFTER INSERT ON public.swipes
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_swipe();


-- ============================================
-- PART F: SWIPES TABLE CONSTRAINTS
-- ============================================

-- Add check constraint for valid swipe directions
DO $$
BEGIN
  ALTER TABLE swipes DROP CONSTRAINT IF EXISTS swipes_direction_check;
  ALTER TABLE swipes ADD CONSTRAINT swipes_direction_check
    CHECK (direction IN ('left', 'right', 'super', 'up'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Ensure unique constraint exists (prevent duplicate swipes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'swipes_swiper_id_swiped_id_key'
  ) THEN
    ALTER TABLE swipes ADD CONSTRAINT swipes_swiper_id_swiped_id_key
      UNIQUE (swiper_id, swiped_id);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


-- ============================================
-- PART G: PERFORMANCE INDEXES
-- ============================================

-- Swipes indexes
CREATE INDEX IF NOT EXISTS idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX IF NOT EXISTS idx_swipes_swiped ON swipes(swiped_id);
CREATE INDEX IF NOT EXISTS idx_swipes_direction ON swipes(direction);
CREATE INDEX IF NOT EXISTS idx_swipes_lookup ON swipes(swiper_id, swiped_id, direction);

-- Matches indexes
CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_matches_active ON matches(is_active);

-- Profiles indexes for feed queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_complete ON profiles(is_profile_complete);
CREATE INDEX IF NOT EXISTS idx_profiles_role_complete ON profiles(role, is_profile_complete);

-- Job posts indexes
CREATE INDEX IF NOT EXISTS idx_job_posts_business ON job_posts(business_id);
CREATE INDEX IF NOT EXISTS idx_job_posts_status ON job_posts(status);


-- ============================================
-- PART H: BACKFILL EXISTING MATCHES
-- ============================================
-- Set worker_id/business_id for existing matches

UPDATE public.matches m
SET
  worker_id = CASE
    WHEN p1.role = 'worker' THEN m.user1_id
    WHEN p2.role = 'worker' THEN m.user2_id
    ELSE NULL
  END,
  business_id = CASE
    WHEN p1.role = 'business' THEN m.user1_id
    WHEN p2.role = 'business' THEN m.user2_id
    ELSE NULL
  END
FROM public.profiles p1, public.profiles p2
WHERE m.user1_id = p1.id
  AND m.user2_id = p2.id
  AND (m.worker_id IS NULL OR m.business_id IS NULL);


-- ============================================
-- PART I: RETROACTIVE MATCH CREATION
-- ============================================
-- Create matches for any existing mutual swipes that don't have matches

INSERT INTO matches (user1_id, user2_id, matched_at, is_active, worker_id, business_id)
SELECT DISTINCT
  LEAST(s1.swiper_id, s1.swiped_id) as user1_id,
  GREATEST(s1.swiper_id, s1.swiped_id) as user2_id,
  GREATEST(s1.created_at, s2.created_at) as matched_at,
  true as is_active,
  CASE
    WHEN p1.role = 'worker' THEN LEAST(s1.swiper_id, s1.swiped_id)
    WHEN p2.role = 'worker' THEN GREATEST(s1.swiper_id, s1.swiped_id)
    ELSE NULL
  END as worker_id,
  CASE
    WHEN p1.role = 'business' THEN LEAST(s1.swiper_id, s1.swiped_id)
    WHEN p2.role = 'business' THEN GREATEST(s1.swiper_id, s1.swiped_id)
    ELSE NULL
  END as business_id
FROM swipes s1
JOIN swipes s2 ON s1.swiper_id = s2.swiped_id AND s1.swiped_id = s2.swiper_id
JOIN profiles p1 ON p1.id = LEAST(s1.swiper_id, s1.swiped_id)
JOIN profiles p2 ON p2.id = GREATEST(s1.swiper_id, s1.swiped_id)
WHERE s1.direction IN ('right', 'super', 'up')
  AND s2.direction IN ('right', 'super', 'up')
  AND s1.swiper_id < s1.swiped_id  -- Avoid duplicate pairs
  AND NOT EXISTS (
    SELECT 1 FROM matches m
    WHERE m.user1_id = LEAST(s1.swiper_id, s1.swiped_id)
      AND m.user2_id = GREATEST(s1.swiper_id, s1.swiped_id)
  )
ON CONFLICT (user1_id, user2_id) DO NOTHING;


-- ============================================
-- PART J: VERIFICATION QUERIES
-- ============================================

SELECT '=== VERIFICATION ===' as section;

-- Check role assignments
SELECT
  email,
  role,
  CASE
    WHEN email = 'dikshitadhikari40@gmail.com' AND role = 'worker' THEN '✅ CORRECT'
    WHEN email = 'bhumauri@gmail.com' AND role = 'business' THEN '✅ CORRECT'
    ELSE '❌ CHECK THIS'
  END as status
FROM profiles
WHERE email IN ('dikshitadhikari40@gmail.com', 'bhumauri@gmail.com');

-- Check table counts
SELECT 'profiles' as table_name, COUNT(*) as row_count FROM profiles
UNION ALL SELECT 'swipes', COUNT(*) FROM swipes
UNION ALL SELECT 'matches', COUNT(*) FROM matches
UNION ALL SELECT 'messages', COUNT(*) FROM messages
UNION ALL SELECT 'job_posts', COUNT(*) FROM job_posts;

-- Verify trigger exists
SELECT
  CASE WHEN COUNT(*) > 0 THEN '✅ TRIGGER EXISTS' ELSE '❌ TRIGGER MISSING' END as trigger_status
FROM pg_trigger
WHERE tgname = 'on_swipe_created';

-- Check profiles by role
SELECT
  role,
  COUNT(*) as count,
  SUM(CASE WHEN is_profile_complete THEN 1 ELSE 0 END) as complete
FROM profiles
GROUP BY role;


-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT '✅ AUDIT AND FIX COMPLETE!' as status;
SELECT 'Run the verification queries above to confirm all fixes applied correctly.' as note;
