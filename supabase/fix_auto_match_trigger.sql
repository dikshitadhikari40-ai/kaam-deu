-- ============================================
-- FIX: AUTO-MATCH TRIGGER FOR KAAM DEU
-- ============================================
-- Run this SQL in Supabase SQL Editor to ensure
-- the auto-match trigger is properly installed.
--
-- This trigger automatically creates a match when
-- both users swipe right (or super like) on each other.
-- ============================================

-- First, let's check if the trigger exists
-- (This is just for diagnostics - run SELECT separately to see results)
-- SELECT tgname FROM pg_trigger WHERE tgname = 'on_swipe_created';

-- ============================================
-- STEP 1: Create or replace the trigger function
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_swipe()
RETURNS TRIGGER AS $$
DECLARE
  other_swipe RECORD;
  match_exists BOOLEAN;
BEGIN
  -- Log for debugging (visible in Supabase logs)
  RAISE LOG 'handle_new_swipe triggered: swiper=%, swiped=%, direction=%',
    NEW.swiper_id, NEW.swiped_id, NEW.direction;

  -- Only check for matches on right swipes or super likes
  -- Frontend sends: 'right', 'super', or legacy 'up'
  IF NEW.direction IN ('right', 'super', 'up') THEN
    -- Check if the other person also swiped right/super on the current user
    SELECT * INTO other_swipe
    FROM public.swipes
    WHERE swiper_id = NEW.swiped_id
      AND swiped_id = NEW.swiper_id
      AND direction IN ('right', 'super', 'up');

    IF other_swipe IS NOT NULL THEN
      RAISE LOG 'Mutual swipe detected! Creating match...';

      -- Check if match already exists (using sorted IDs for consistency)
      SELECT EXISTS(
        SELECT 1 FROM public.matches
        WHERE user1_id = LEAST(NEW.swiper_id, NEW.swiped_id)
          AND user2_id = GREATEST(NEW.swiper_id, NEW.swiped_id)
      ) INTO match_exists;

      IF NOT match_exists THEN
        -- It's a match! Insert with sorted IDs to avoid duplicates
        INSERT INTO public.matches (user1_id, user2_id, matched_at, is_active)
        VALUES (
          LEAST(NEW.swiper_id, NEW.swiped_id),
          GREATEST(NEW.swiper_id, NEW.swiped_id),
          NOW(),
          true
        )
        ON CONFLICT (user1_id, user2_id) DO NOTHING;

        RAISE LOG 'Match created between % and %',
          LEAST(NEW.swiper_id, NEW.swiped_id),
          GREATEST(NEW.swiper_id, NEW.swiped_id);
      ELSE
        RAISE LOG 'Match already exists, skipping creation';
      END IF;
    ELSE
      RAISE LOG 'No mutual swipe found yet';
    END IF;
  ELSE
    RAISE LOG 'Left swipe, no match check needed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 2: Drop existing trigger if it exists
-- ============================================
DROP TRIGGER IF EXISTS on_swipe_created ON public.swipes;

-- ============================================
-- STEP 3: Create the trigger
-- ============================================
CREATE TRIGGER on_swipe_created
  AFTER INSERT ON public.swipes
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_swipe();

-- ============================================
-- STEP 4: Verify the trigger was created
-- ============================================
-- Run this to confirm:
SELECT
  tgname as trigger_name,
  tgtype as trigger_type,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'on_swipe_created';

-- ============================================
-- STEP 5: Test the trigger (OPTIONAL)
-- ============================================
-- You can test by manually inserting swipes:
--
-- -- First, get two user IDs from your profiles table:
-- SELECT id, name, role FROM profiles LIMIT 5;
--
-- -- Then insert swipes (replace UUIDs with real ones):
-- INSERT INTO swipes (swiper_id, swiped_id, direction)
-- VALUES ('user1-uuid', 'user2-uuid', 'right');
--
-- INSERT INTO swipes (swiper_id, swiped_id, direction)
-- VALUES ('user2-uuid', 'user1-uuid', 'right');
--
-- -- Check if match was created:
-- SELECT * FROM matches ORDER BY created_at DESC LIMIT 5;

-- ============================================
-- DIAGNOSTICS: Check current state
-- ============================================
-- Run these separately to diagnose issues:

-- Count of swipes by direction:
-- SELECT direction, COUNT(*) FROM swipes GROUP BY direction;

-- Recent swipes:
-- SELECT s.*, p1.name as swiper_name, p2.name as swiped_name
-- FROM swipes s
-- JOIN profiles p1 ON s.swiper_id = p1.id
-- JOIN profiles p2 ON s.swiped_id = p2.id
-- ORDER BY s.created_at DESC LIMIT 10;

-- Mutual swipes that should be matches:
-- SELECT
--   s1.swiper_id as user1,
--   s1.swiped_id as user2,
--   s1.direction as user1_direction,
--   s2.direction as user2_direction,
--   EXISTS(
--     SELECT 1 FROM matches m
--     WHERE (m.user1_id = LEAST(s1.swiper_id, s1.swiped_id)
--       AND m.user2_id = GREATEST(s1.swiper_id, s1.swiped_id))
--   ) as match_exists
-- FROM swipes s1
-- JOIN swipes s2 ON s1.swiper_id = s2.swiped_id
--   AND s1.swiped_id = s2.swiper_id
-- WHERE s1.direction IN ('right', 'super', 'up')
--   AND s2.direction IN ('right', 'super', 'up')
--   AND s1.swiper_id < s1.swiped_id; -- Avoid duplicates

-- ============================================
-- RETROACTIVE FIX: Create matches for existing mutual swipes
-- ============================================
-- If you have existing mutual swipes without matches, run this:

INSERT INTO matches (user1_id, user2_id, matched_at, is_active)
SELECT DISTINCT
  LEAST(s1.swiper_id, s1.swiped_id) as user1_id,
  GREATEST(s1.swiper_id, s1.swiped_id) as user2_id,
  GREATEST(s1.created_at, s2.created_at) as matched_at,
  true as is_active
FROM swipes s1
JOIN swipes s2 ON s1.swiper_id = s2.swiped_id
  AND s1.swiped_id = s2.swiper_id
WHERE s1.direction IN ('right', 'super', 'up')
  AND s2.direction IN ('right', 'super', 'up')
  AND s1.swiper_id < s1.swiped_id -- Avoid processing same pair twice
  AND NOT EXISTS (
    SELECT 1 FROM matches m
    WHERE m.user1_id = LEAST(s1.swiper_id, s1.swiped_id)
      AND m.user2_id = GREATEST(s1.swiper_id, s1.swiped_id)
  )
ON CONFLICT (user1_id, user2_id) DO NOTHING;

-- Report how many matches exist now:
SELECT 'Total matches:' as info, COUNT(*) as count FROM matches
UNION ALL
SELECT 'Active matches:' as info, COUNT(*) as count FROM matches WHERE is_active = true;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'Auto-match trigger installed successfully!' as status;
