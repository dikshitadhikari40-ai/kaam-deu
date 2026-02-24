-- ============================================
-- KAAM DEU - SUPABASE DATABASE SCHEMA
-- ============================================
-- Run this SQL in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
--
-- This schema uses a SINGLE profiles table for both workers and businesses
-- The 'role' field determines which fields are relevant

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE (Unified for Workers & Businesses)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  -- Primary fields
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('worker', 'business')) NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT,

  -- Profile completion status
  is_profile_complete BOOLEAN DEFAULT FALSE,

  -- Verification & Status
  verified BOOLEAN DEFAULT FALSE,
  verification_score INTEGER DEFAULT 0,
  verification_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  last_online TIMESTAMPTZ DEFAULT NOW(),

  -- Social/Auth
  auth_provider TEXT DEFAULT 'email',
  linkedin TEXT DEFAULT '',
  google_uid TEXT,
  linkedin_uid TEXT,

  -- ============================================
  -- WORKER-SPECIFIC FIELDS
  -- ============================================
  -- Professional Info
  job_title TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  skills TEXT[] DEFAULT '{}',
  experience_years INTEGER DEFAULT 0,
  education TEXT,

  -- Work Preferences
  expected_salary_min NUMERIC,
  expected_salary_max NUMERIC,
  salary TEXT, -- Legacy field for display
  preferred_employment TEXT[] DEFAULT '{}', -- ['full_time', 'part_time', 'contract', 'daily_wage']
  availability TEXT CHECK (availability IN ('available', 'employed', 'looking')),
  available_from DATE,
  willing_to_relocate BOOLEAN DEFAULT FALSE,

  -- Location
  current_location TEXT DEFAULT '',
  location TEXT DEFAULT '', -- Alias for current_location
  preferred_locations TEXT[] DEFAULT '{}',

  -- Documents & Verification
  resume_url TEXT,
  cv_url TEXT,
  cv_name TEXT,
  certifications TEXT[] DEFAULT '{}',
  portfolio_urls TEXT[] DEFAULT '{}',

  -- Additional Worker Info
  languages TEXT[] DEFAULT '{}',

  -- Media (Worker)
  photo_url TEXT DEFAULT '',
  photos TEXT[] DEFAULT '{}',
  video_intro_url TEXT,

  -- ============================================
  -- BUSINESS-SPECIFIC FIELDS
  -- ============================================
  -- Company Info
  company_name TEXT,
  company_type TEXT CHECK (company_type IN ('company', 'startup', 'agency', 'individual') OR company_type IS NULL),
  company_size TEXT CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '500+') OR company_size IS NULL),
  industry TEXT,
  description TEXT,
  website TEXT,

  -- Contact Person
  contact_person TEXT,
  contact_position TEXT,
  contact_phone TEXT,

  -- Business Locations
  multiple_locations TEXT[] DEFAULT '{}',

  -- Business Verification
  is_verified_business BOOLEAN DEFAULT FALSE,
  pan_number TEXT,
  registration_number TEXT,

  -- Media (Business)
  logo_url TEXT,
  cover_photo_url TEXT,
  office_photos TEXT[] DEFAULT '{}',

  -- Hiring Preferences
  typically_hiring TEXT[] DEFAULT '{}',
  benefits_offered TEXT[] DEFAULT '{}',

  -- ============================================
  -- TIMESTAMPS
  -- ============================================
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. SWIPES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.swipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swiper_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  swiped_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  direction TEXT CHECK (direction IN ('left', 'right', 'up')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(swiper_id, swiped_id)
);

-- Enable RLS
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;

-- Policies for swipes
DROP POLICY IF EXISTS "Users can view own swipes" ON public.swipes;
CREATE POLICY "Users can view own swipes"
  ON public.swipes FOR SELECT
  USING (auth.uid() = swiper_id);

DROP POLICY IF EXISTS "Users can insert own swipes" ON public.swipes;
CREATE POLICY "Users can insert own swipes"
  ON public.swipes FOR INSERT
  WITH CHECK (auth.uid() = swiper_id);

-- ============================================
-- 3. MATCHES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count_user1 INTEGER DEFAULT 0,
  unread_count_user2 INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  unmatch_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

-- Enable RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Policies for matches
DROP POLICY IF EXISTS "Users can view own matches" ON public.matches;
CREATE POLICY "Users can view own matches"
  ON public.matches FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can insert matches" ON public.matches;
CREATE POLICY "Users can insert matches"
  ON public.matches FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can update own matches" ON public.matches;
CREATE POLICY "Users can update own matches"
  ON public.matches FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ============================================
-- 4. MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'location')),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies for messages (users can only see messages from their matches)
DROP POLICY IF EXISTS "Users can view messages from their matches" ON public.messages;
CREATE POLICY "Users can view messages from their matches"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = messages.match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert messages to their matches" ON public.messages;
CREATE POLICY "Users can insert messages to their matches"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- ============================================
-- 5. JOB POSTS TABLE (Optional - for businesses)
-- ============================================
CREATE TABLE IF NOT EXISTS public.job_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  requirements TEXT[] DEFAULT '{}',
  skills_required TEXT[] DEFAULT '{}',
  employment_type TEXT CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'daily_wage')),
  salary_min NUMERIC,
  salary_max NUMERIC,
  salary_negotiable BOOLEAN DEFAULT TRUE,
  location TEXT,
  is_remote BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'filled', 'expired')),
  applications_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active job posts" ON public.job_posts;
CREATE POLICY "Anyone can view active job posts"
  ON public.job_posts FOR SELECT
  USING (status = 'active' OR business_id = auth.uid());

DROP POLICY IF EXISTS "Businesses can manage own job posts" ON public.job_posts;
CREATE POLICY "Businesses can manage own job posts"
  ON public.job_posts FOR ALL
  USING (business_id = auth.uid());

-- ============================================
-- 6. USER PREFERENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  show_me TEXT DEFAULT 'both' CHECK (show_me IN ('worker', 'business', 'both')),
  max_distance INTEGER DEFAULT 50,
  min_age INTEGER,
  max_age INTEGER,
  push_enabled BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  new_match_alert BOOLEAN DEFAULT TRUE,
  message_alert BOOLEAN DEFAULT TRUE,
  show_online_status BOOLEAN DEFAULT TRUE,
  show_read_receipts BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own preferences" ON public.user_preferences;
CREATE POLICY "Users can manage own preferences"
  ON public.user_preferences FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(location);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_is_profile_complete ON public.profiles(is_profile_complete);
CREATE INDEX IF NOT EXISTS idx_swipes_swiper ON public.swipes(swiper_id);
CREATE INDEX IF NOT EXISTS idx_swipes_swiped ON public.swipes(swiped_id);
CREATE INDEX IF NOT EXISTS idx_swipes_direction ON public.swipes(direction);
CREATE INDEX IF NOT EXISTS idx_matches_user1 ON public.matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON public.matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_matches_is_active ON public.matches(is_active);
CREATE INDEX IF NOT EXISTS idx_messages_match ON public.messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_job_posts_business ON public.job_posts(business_id);
CREATE INDEX IF NOT EXISTS idx_job_posts_status ON public.job_posts(status);

-- ============================================
-- 8. TRIGGER: Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, name, photo_url, auth_provider)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'worker'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    COALESCE(NEW.raw_user_meta_data->>'auth_provider', 'email')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 9. TRIGGER: Auto-create match on mutual swipe
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_swipe()
RETURNS TRIGGER AS $$
DECLARE
  other_swipe RECORD;
BEGIN
  -- Check for right swipe, super like (frontend sends 'super'), or legacy 'up'
  IF NEW.direction IN ('right', 'super', 'up') THEN
    -- Check if the other person also swiped right/super/up on me
    SELECT * FROM public.swipes
    WHERE swiper_id = NEW.swiped_id
      AND swiped_id = NEW.swiper_id
      AND direction IN ('right', 'super', 'up')
    INTO other_swipe;

    IF other_swipe IS NOT NULL THEN
      -- It's a match! Insert with sorted IDs to avoid duplicates
      INSERT INTO public.matches (user1_id, user2_id)
      VALUES (LEAST(NEW.swiper_id, NEW.swiped_id), GREATEST(NEW.swiper_id, NEW.swiped_id))
      ON CONFLICT (user1_id, user2_id) DO NOTHING;
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
-- 10. TRIGGER: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_job_posts_updated_at ON public.job_posts;
CREATE TRIGGER update_job_posts_updated_at
  BEFORE UPDATE ON public.job_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 11. ENABLE REALTIME FOR MESSAGES
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============================================
-- 12. REPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('inappropriate_content', 'harassment', 'spam', 'fake_profile', 'scam', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reporter_id, reported_id)
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- ============================================
-- 13. BLOCKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own blocks" ON public.blocks;
CREATE POLICY "Users can manage own blocks"
  ON public.blocks FOR ALL
  USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can view blocks involving them" ON public.blocks;
CREATE POLICY "Users can view blocks involving them"
  ON public.blocks FOR SELECT
  USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

-- Indexes for blocks
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON public.blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON public.blocks(blocked_id);

-- ============================================
-- 14. REVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewed_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reviewer_id, match_id)
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
CREATE POLICY "Users can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = reviewer_id);

-- Indexes for reviews
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed ON public.reviews(reviewed_id);
CREATE INDEX IF NOT EXISTS idx_reviews_match ON public.reviews(match_id);

-- ============================================
-- 15. BADGES & ACHIEVEMENTS (Month 2)
-- ============================================

-- Badge definitions
CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('engagement', 'quality', 'milestone', 'special')),
  color TEXT DEFAULT '#4A90D9',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User earned badges
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Badges policies
DROP POLICY IF EXISTS "Anyone can view badges" ON public.badges;
CREATE POLICY "Anyone can view badges"
  ON public.badges FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Anyone can view user badges" ON public.user_badges;
CREATE POLICY "Anyone can view user badges"
  ON public.user_badges FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "System can insert user badges" ON public.user_badges;
CREATE POLICY "System can insert user badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (TRUE);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON public.user_badges(badge_id);

-- ============================================
-- 16. LOGIN STREAKS (Month 2)
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_login_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own streak" ON public.user_streaks;
CREATE POLICY "Users can view own streak"
  ON public.user_streaks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own streak" ON public.user_streaks;
CREATE POLICY "Users can update own streak"
  ON public.user_streaks FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage streaks" ON public.user_streaks;
CREATE POLICY "System can manage streaks"
  ON public.user_streaks FOR ALL
  USING (TRUE);

-- ============================================
-- 17. PROFILE BOOSTS (Month 2)
-- ============================================

CREATE TABLE IF NOT EXISTS public.boosts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  boost_type TEXT NOT NULL CHECK (boost_type IN ('standard', 'super', 'spotlight')),
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

-- Enable RLS
ALTER TABLE public.boosts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own boosts" ON public.boosts;
CREATE POLICY "Users can view own boosts"
  ON public.boosts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create boosts" ON public.boosts;
CREATE POLICY "Users can create boosts"
  ON public.boosts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_boosts_user ON public.boosts(user_id);
CREATE INDEX IF NOT EXISTS idx_boosts_active ON public.boosts(is_active, expires_at);

-- ============================================
-- 18. SUBSCRIPTIONS (Month 2)
-- ============================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'premium')),
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
CREATE POLICY "Users can update own subscription"
  ON public.subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);

-- ============================================
-- 19. PROFILE VIEWS (Month 2 - Analytics)
-- ============================================

CREATE TABLE IF NOT EXISTS public.profile_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile views" ON public.profile_views;
CREATE POLICY "Users can view own profile views"
  ON public.profile_views FOR SELECT
  USING (auth.uid() = viewed_user_id);

DROP POLICY IF EXISTS "Users can insert profile views" ON public.profile_views;
CREATE POLICY "Users can insert profile views"
  ON public.profile_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_id AND viewer_id != viewed_user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed ON public.profile_views(viewed_user_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_time ON public.profile_views(viewed_at);

-- ============================================
-- 20. STORAGE BUCKETS
-- ============================================
-- Run these in Supabase Dashboard -> Storage:
-- 1. Create bucket 'photos' (public)
-- 2. Create bucket 'cvs' (public or private based on preference)

-- Storage policies (run after creating buckets):
-- For photos bucket:
-- CREATE POLICY "Anyone can view photos" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
-- CREATE POLICY "Users can upload own photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can update own photos" ON storage.objects FOR UPDATE USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can delete own photos" ON storage.objects FOR DELETE USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- For cvs bucket:
-- CREATE POLICY "Users can view own CVs" ON storage.objects FOR SELECT USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can upload own CVs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can update own CVs" ON storage.objects FOR UPDATE USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can delete own CVs" ON storage.objects FOR DELETE USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- 21. PAYMENT TRANSACTIONS (eSewa Integration)
-- ============================================

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id TEXT PRIMARY KEY, -- Transaction ID (e.g., KD-xxxxx)
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('subscription', 'boost', 'super_like', 'spotlight')),
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'NPR',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT DEFAULT 'esewa' CHECK (payment_method IN ('esewa', 'khalti', 'card')),
  esewa_ref_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.payment_transactions;
CREATE POLICY "Users can view own transactions"
  ON public.payment_transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.payment_transactions;
CREATE POLICY "Users can insert own transactions"
  ON public.payment_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON public.payment_transactions;
CREATE POLICY "Users can update own transactions"
  ON public.payment_transactions FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created ON public.payment_transactions(created_at);

-- ============================================
-- 22. USER CREDITS (Super Likes, Boosts, Spotlights)
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  super_likes INTEGER DEFAULT 0,
  boosts INTEGER DEFAULT 0,
  spotlights INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own credits" ON public.user_credits;
CREATE POLICY "Users can view own credits"
  ON public.user_credits FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own credits" ON public.user_credits;
CREATE POLICY "Users can update own credits"
  ON public.user_credits FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own credits" ON public.user_credits;
CREATE POLICY "Users can insert own credits"
  ON public.user_credits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_user_credits_updated_at ON public.user_credits;
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 23. UPDATE SUBSCRIPTIONS TABLE
-- ============================================
-- Add missing columns to subscriptions if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'auto_renew') THEN
    ALTER TABLE public.subscriptions ADD COLUMN auto_renew BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'payment_transaction_id') THEN
    ALTER TABLE public.subscriptions ADD COLUMN payment_transaction_id TEXT REFERENCES public.payment_transactions(id);
  END IF;
END $$;

-- ============================================
-- 24. UPDATE PROFILES TABLE FOR BOOSTS/SPOTLIGHT
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_boosted') THEN
    ALTER TABLE public.profiles ADD COLUMN is_boosted BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'boost_expires_at') THEN
    ALTER TABLE public.profiles ADD COLUMN boost_expires_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_spotlight') THEN
    ALTER TABLE public.profiles ADD COLUMN is_spotlight BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'spotlight_expires_at') THEN
    ALTER TABLE public.profiles ADD COLUMN spotlight_expires_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_tier') THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium'));
  END IF;
END $$;

-- ============================================
-- TABLE COMMENTS
-- ============================================
COMMENT ON TABLE public.profiles IS 'Unified user profiles for workers and businesses. The role field determines which fields are relevant.';
COMMENT ON TABLE public.swipes IS 'Swipe actions (left=pass, right=like, up=super like)';
COMMENT ON TABLE public.matches IS 'Mutual matches between users';
COMMENT ON TABLE public.messages IS 'Chat messages between matched users';
COMMENT ON TABLE public.job_posts IS 'Job listings posted by businesses';
COMMENT ON TABLE public.user_preferences IS 'User discovery and notification preferences';
COMMENT ON TABLE public.payment_transactions IS 'eSewa payment transactions for subscriptions and purchases';
COMMENT ON TABLE public.user_credits IS 'User credits for super likes, boosts, and spotlights';
