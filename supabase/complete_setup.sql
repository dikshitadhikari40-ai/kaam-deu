-- ============================================
-- KAAM DEU - COMPLETE DATABASE SETUP
-- Run this ONCE in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. PROFILES TABLE COLUMNS
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_profile_complete boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_score integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_date timestamp with time zone;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_online timestamp with time zone;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auth_provider text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_uid text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_uid text;

-- Worker fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience_years integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expected_salary_min integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expected_salary_max integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS salary text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS salary_negotiable boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_employment text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS availability text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS available_from text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS willing_to_relocate boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_location text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_locations text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cv_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cv_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS certifications text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portfolio_urls text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS languages text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photos text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS video_intro_url text;

-- Business fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_type text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_size text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_person text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_position text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS multiple_locations text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified_business boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pan_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS registration_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_photo_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS office_photos text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS typically_hiring text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS benefits_offered text[];

-- ============================================
-- 2. PROFILES RLS POLICIES
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- 3. SWIPES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS swipes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    swiper_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    swiped_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    direction text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(swiper_id, swiped_id)
);

ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can create swipes" ON swipes;
DROP POLICY IF EXISTS "Users can view own swipes" ON swipes;
DROP POLICY IF EXISTS "Users can view swipes on them" ON swipes;
DROP POLICY IF EXISTS "Users can delete own swipes" ON swipes;
CREATE POLICY "Users can create swipes" ON swipes FOR INSERT WITH CHECK (auth.uid() = swiper_id);
-- FIXED: Users can view swipes they made OR swipes made on them (needed for match detection)
CREATE POLICY "Users can view own swipes" ON swipes FOR SELECT USING (auth.uid() = swiper_id OR auth.uid() = swiped_id);
-- Allow users to delete their own swipes (for undo feature)
CREATE POLICY "Users can delete own swipes" ON swipes FOR DELETE USING (auth.uid() = swiper_id);

-- ============================================
-- 4. MATCHES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS matches (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user1_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    user2_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    matched_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    UNIQUE(user1_id, user2_id)
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own matches" ON matches;
DROP POLICY IF EXISTS "Users can create matches" ON matches;
CREATE POLICY "Users can view own matches" ON matches FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Users can create matches" ON matches FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ============================================
-- 5. MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
    sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view messages in their matches" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their matches" ON messages;
DROP POLICY IF EXISTS "Users can update messages" ON messages;
CREATE POLICY "Users can view messages in their matches" ON messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM matches WHERE matches.id = messages.match_id AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid()))
);
CREATE POLICY "Users can send messages in their matches" ON messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND EXISTS (SELECT 1 FROM matches WHERE matches.id = match_id AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid()))
);
CREATE POLICY "Users can update messages" ON messages FOR UPDATE USING (
    EXISTS (SELECT 1 FROM matches WHERE matches.id = messages.match_id AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid()))
);

-- ============================================
-- 6. BLOCKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS blocks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own blocks" ON blocks;
CREATE POLICY "Users can manage own blocks" ON blocks FOR ALL USING (auth.uid() = blocker_id);

-- ============================================
-- 7. REPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    reported_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    reason text NOT NULL,
    description text,
    status text DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(reporter_id, reported_id)
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can create reports" ON reports;
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can create reports" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view own reports" ON reports FOR SELECT USING (auth.uid() = reporter_id);

-- ============================================
-- 8. REVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    reviewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    reviewed_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(reviewer_id, match_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- ============================================
-- 9. JOB POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS job_posts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    requirements text[],
    skills_required text[],
    employment_type text,
    salary_min integer,
    salary_max integer,
    salary_negotiable boolean DEFAULT false,
    location text,
    is_remote boolean DEFAULT false,
    status text DEFAULT 'active',
    applications_count integer DEFAULT 0,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE job_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active job posts" ON job_posts;
DROP POLICY IF EXISTS "Business can manage own posts" ON job_posts;
CREATE POLICY "Anyone can view active job posts" ON job_posts FOR SELECT USING (status = 'active');
CREATE POLICY "Business can manage own posts" ON job_posts FOR ALL USING (auth.uid() = business_id);

-- ============================================
-- 10. USER STREAKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_streaks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    current_streak integer DEFAULT 0,
    longest_streak integer DEFAULT 0,
    last_login_date date,
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own streaks" ON user_streaks;
CREATE POLICY "Users can manage own streaks" ON user_streaks FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 11. STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('job-images', 'job-images', true) ON CONFLICT (id) DO UPDATE SET public = true;

-- ============================================
-- 12. AUTO-CREATE PROFILE TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(profiles.name, EXCLUDED.name),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 13. PROFILE VIEWS TABLE (for tracking who viewed your profile)
-- ============================================
CREATE TABLE IF NOT EXISTS profile_views (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    viewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    viewed_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    viewed_at timestamp with time zone DEFAULT now(),
    UNIQUE(viewer_id, viewed_user_id, (viewed_at::date))
);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_user ON profile_views(viewed_user_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer ON profile_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_date ON profile_views(viewed_at);

ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view who viewed them" ON profile_views;
DROP POLICY IF EXISTS "Users can record profile views" ON profile_views;
CREATE POLICY "Users can view who viewed them" ON profile_views FOR SELECT USING (auth.uid() = viewed_user_id);
CREATE POLICY "Users can record profile views" ON profile_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- ============================================
-- 14. CALL LOGS TABLE (for voice/video call history)
-- ============================================
CREATE TABLE IF NOT EXISTS call_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
    caller_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    call_type text NOT NULL CHECK (call_type IN ('voice', 'video')),
    status text NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'ringing', 'connected', 'ended', 'missed', 'declined')),
    started_at timestamp with time zone DEFAULT now(),
    connected_at timestamp with time zone,
    ended_at timestamp with time zone,
    duration_seconds integer,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_match ON call_logs(match_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_caller ON call_logs(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_receiver ON call_logs(receiver_id);

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own call logs" ON call_logs;
DROP POLICY IF EXISTS "Users can create call logs" ON call_logs;
DROP POLICY IF EXISTS "Users can update own call logs" ON call_logs;
CREATE POLICY "Users can view own call logs" ON call_logs FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can create call logs" ON call_logs FOR INSERT WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "Users can update own call logs" ON call_logs FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- ============================================
-- 15. AUTO-MATCH TRIGGER ON SWIPE
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
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_swipe_created ON public.swipes;
CREATE TRIGGER on_swipe_created
  AFTER INSERT ON public.swipes
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_swipe();

-- ============================================
-- 16. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX IF NOT EXISTS idx_swipes_swiped ON swipes(swiped_id);
CREATE INDEX IF NOT EXISTS idx_swipes_direction ON swipes(direction);
CREATE INDEX IF NOT EXISTS idx_swipes_lookup ON swipes(swiper_id, swiped_id, direction);
CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches(user2_id);

-- ============================================
-- DONE!
-- ============================================
SELECT 'SUCCESS: Complete database setup finished!' as status;
