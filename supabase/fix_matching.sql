-- ============================================
-- COMPREHENSIVE FIX: MATCHING NOT WORKING
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: FIX SWIPES TABLE RLS POLICIES
-- ============================================
-- Problem: The swipes RLS policy was too restrictive
-- When User B swipes on User A, it needs to check if User A already swiped on User B
-- But the old policy only allowed viewing swipes where YOU are the swiper

DROP POLICY IF EXISTS "Users can view own swipes" ON swipes;
DROP POLICY IF EXISTS "Users can view swipes on them" ON swipes;
DROP POLICY IF EXISTS "Users can delete own swipes" ON swipes;

-- Users can view swipes they made OR swipes made on them (NEEDED FOR MATCH DETECTION)
CREATE POLICY "Users can view own swipes" ON swipes
  FOR SELECT
  USING (auth.uid() = swiper_id OR auth.uid() = swiped_id);

-- Allow deleting own swipes (for undo feature)
CREATE POLICY "Users can delete own swipes" ON swipes
  FOR DELETE
  USING (auth.uid() = swiper_id);

-- ============================================
-- STEP 2: FIX MATCHES TABLE RLS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view own matches" ON matches;
DROP POLICY IF EXISTS "Users can create matches" ON matches;
DROP POLICY IF EXISTS "Users can delete own matches" ON matches;

-- Users can view matches they're part of
CREATE POLICY "Users can view own matches" ON matches
  FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can create matches (needed for app-side match creation)
CREATE POLICY "Users can create matches" ON matches
  FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can delete matches they're part of (for unmatch feature)
CREATE POLICY "Users can delete own matches" ON matches
  FOR DELETE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ============================================
-- STEP 3: CREATE AUTO-MATCH TRIGGER
-- ============================================
-- This trigger automatically creates a match when both users swipe right

CREATE OR REPLACE FUNCTION public.handle_new_swipe()
RETURNS TRIGGER AS $$
DECLARE
  other_swipe RECORD;
  match_exists BOOLEAN;
BEGIN
  -- Only check for matches on right swipes or super likes
  IF NEW.direction IN ('right', 'super', 'up') THEN
    -- Check if the other person also swiped right/super on the current user
    SELECT * INTO other_swipe
    FROM public.swipes
    WHERE swiper_id = NEW.swiped_id
      AND swiped_id = NEW.swiper_id
      AND direction IN ('right', 'super', 'up');

    IF other_swipe IS NOT NULL THEN
      -- Check if match already exists
      SELECT EXISTS(
        SELECT 1 FROM public.matches
        WHERE (user1_id = LEAST(NEW.swiper_id, NEW.swiped_id)
          AND user2_id = GREATEST(NEW.swiper_id, NEW.swiped_id))
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

        RAISE NOTICE 'Match created between % and %', NEW.swiper_id, NEW.swiped_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_swipe_created ON public.swipes;
CREATE TRIGGER on_swipe_created
  AFTER INSERT ON public.swipes
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_swipe();

-- ============================================
-- STEP 4: ADD INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX IF NOT EXISTS idx_swipes_swiped ON swipes(swiped_id);
CREATE INDEX IF NOT EXISTS idx_swipes_direction ON swipes(direction);
CREATE INDEX IF NOT EXISTS idx_swipes_lookup ON swipes(swiper_id, swiped_id, direction);
CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches(user2_id);

-- ============================================
-- STEP 5: VERIFY THE FIX
-- ============================================
SELECT 'Checking swipes policies...' as step;
SELECT policyname, cmd, qual::text
FROM pg_policies
WHERE tablename = 'swipes';

SELECT 'Checking matches policies...' as step;
SELECT policyname, cmd, qual::text
FROM pg_policies
WHERE tablename = 'matches';

SELECT 'Checking triggers...' as step;
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public' AND event_object_table = 'swipes';

SELECT 'SUCCESS: All fixes applied! Matching should now work.' as status;

-- ============================================
-- DEBUG: Show current swipes and matches count
-- ============================================
SELECT 'Current swipes count: ' || COUNT(*)::text as debug FROM swipes;
SELECT 'Current matches count: ' || COUNT(*)::text as debug FROM matches;
