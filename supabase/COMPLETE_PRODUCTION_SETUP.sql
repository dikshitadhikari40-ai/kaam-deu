-- ============================================
-- KAAM DEU - COMPLETE PRODUCTION SETUP
-- Run this ONCE in Supabase SQL Editor
-- ============================================
-- This includes everything needed for production:
-- 1. Core Tables (profiles, swipes, matches, messages)
-- 2. Job Posts & Applications (if not already created)
-- 3. Storage Buckets
-- 4. Payment Tables (for future use)
-- 5. All RLS Policies
-- ============================================

-- ============================================
-- PART 1: CORE TABLES
-- ============================================

-- Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    phone TEXT,
    role TEXT CHECK (role IN ('worker', 'business')),
    -- Worker fields
    age INTEGER,
    bio TEXT,
    job_title TEXT,
    experience_years INTEGER DEFAULT 0,
    expected_salary_npr INTEGER,
    skills TEXT[] DEFAULT '{}',
    photos TEXT[] DEFAULT '{}',
    current_location TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    -- Business fields
    company_name TEXT,
    contact_person TEXT,
    description TEXT,
    industry TEXT,
    company_size TEXT,
    logo_url TEXT,
    -- Common fields
    verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Swipes Table
CREATE TABLE IF NOT EXISTS public.swipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    swiper_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    swiped_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('left', 'right', 'super_like')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(swiper_id, swiped_id)
);

-- Matches Table
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'hired', 'blocked')),
    matched_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user1_id, user2_id)
);

-- Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'audio', 'system')),
    media_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message Reactions Table
CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- Typing Indicators Table
CREATE TABLE IF NOT EXISTS public.typing_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_typing BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_id, user_id)
);

-- User Presence Table
CREATE TABLE IF NOT EXISTS public.user_presence (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 2: JOB POSTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.job_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    location TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    salary_min INTEGER,
    salary_max INTEGER,
    salary_type TEXT DEFAULT 'monthly' CHECK (salary_type IN ('daily', 'monthly', 'hourly')),
    employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'daily_wage')),
    requirements TEXT[] DEFAULT '{}',
    skills_required TEXT[] DEFAULT '{}',
    is_remote BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'filled', 'expired', 'archived')),
    applications_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Applications Table (if not already created)
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

-- ============================================
-- PART 3: CALL TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    caller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    call_type TEXT DEFAULT 'voice' CHECK (call_type IN ('voice', 'video')),
    status TEXT DEFAULT 'initiated' CHECK (status IN ('initiated', 'ringing', 'answered', 'ended', 'missed', 'declined', 'failed')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    answered_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,
    end_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.active_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    caller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel_name TEXT NOT NULL,
    call_type TEXT DEFAULT 'voice' CHECK (call_type IN ('voice', 'video')),
    status TEXT DEFAULT 'ringing' CHECK (status IN ('ringing', 'active', 'ended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 4: REPORTS, BLOCKS, REVIEWS
-- ============================================

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reported_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.job_posts(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reviewed_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    type TEXT CHECK (type IN ('worker_to_business', 'business_to_worker')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(reviewer_id, reviewed_id, match_id)
);

-- ============================================
-- PART 5: GAMIFICATION (Streaks & Badges)
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- ============================================
-- PART 6: PAYMENT TABLES (for future use)
-- ============================================

CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'NPR',
    payment_method TEXT DEFAULT 'esewa',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'completed', 'failed', 'verification_failed', 'refunded')),
    esewa_ref_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'pro', 'premium')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    payment_transaction_id TEXT REFERENCES public.payment_transactions(id),
    auto_renew BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    boosts_remaining INTEGER DEFAULT 0,
    super_likes_remaining INTEGER DEFAULT 0,
    spotlights_remaining INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT '✅ All tables created!' as status;

-- ============================================
-- PART 7: INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(current_location);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX IF NOT EXISTS idx_swipes_swiped ON swipes(swiped_id);

CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_posts_business ON job_posts(business_id);
CREATE INDEX IF NOT EXISTS idx_job_posts_status ON job_posts(status);
CREATE INDEX IF NOT EXISTS idx_job_posts_category ON job_posts(category);

CREATE INDEX IF NOT EXISTS idx_job_applications_job ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_worker ON job_applications(worker_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);

CREATE INDEX IF NOT EXISTS idx_call_logs_match ON call_logs(match_id);
CREATE INDEX IF NOT EXISTS idx_active_calls_match ON active_calls(match_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);

SELECT '✅ All indexes created!' as status;

-- ============================================
-- PART 8: STORAGE BUCKETS
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('profile-photos', 'profile-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('company-logos', 'company-logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('chat-media', 'chat-media', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    ('documents', 'documents', false, 10485760, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
    ('resumes', 'resumes', false, 10485760, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

SELECT '✅ Storage buckets created!' as status;

-- ============================================
-- PART 9: ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;

SELECT '✅ RLS enabled on all tables!' as status;

-- ============================================
-- PART 10: RLS POLICIES
-- ============================================

-- PROFILES
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON profiles FOR DELETE USING (auth.uid() = id);

-- SWIPES
DROP POLICY IF EXISTS "Users can view own swipes" ON swipes;
DROP POLICY IF EXISTS "Users can create swipes" ON swipes;
DROP POLICY IF EXISTS "Users can delete own swipes" ON swipes;

CREATE POLICY "Users can view own swipes" ON swipes FOR SELECT USING (auth.uid() = swiper_id);
CREATE POLICY "Users can create swipes" ON swipes FOR INSERT WITH CHECK (auth.uid() = swiper_id);
CREATE POLICY "Users can delete own swipes" ON swipes FOR DELETE USING (auth.uid() = swiper_id);

-- MATCHES
DROP POLICY IF EXISTS "Users can view own matches" ON matches;
DROP POLICY IF EXISTS "Users can create matches" ON matches;
DROP POLICY IF EXISTS "Users can update own matches" ON matches;

CREATE POLICY "Users can view own matches" ON matches FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Users can create matches" ON matches FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Users can update own matches" ON matches FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- MESSAGES
DROP POLICY IF EXISTS "Users can view messages in matches" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update messages" ON messages;

CREATE POLICY "Users can view messages in matches" ON messages FOR SELECT
USING (EXISTS (SELECT 1 FROM matches WHERE matches.id = messages.match_id AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())));

CREATE POLICY "Users can send messages" ON messages FOR INSERT
WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM matches WHERE matches.id = messages.match_id AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())));

CREATE POLICY "Users can update messages" ON messages FOR UPDATE
USING (EXISTS (SELECT 1 FROM matches WHERE matches.id = messages.match_id AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())));

-- MESSAGE REACTIONS
DROP POLICY IF EXISTS "Users can view reactions" ON message_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON message_reactions;
DROP POLICY IF EXISTS "Users can remove reactions" ON message_reactions;

CREATE POLICY "Users can view reactions" ON message_reactions FOR SELECT
USING (EXISTS (SELECT 1 FROM messages m JOIN matches ON matches.id = m.match_id WHERE m.id = message_reactions.message_id AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())));
CREATE POLICY "Users can add reactions" ON message_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove reactions" ON message_reactions FOR DELETE USING (auth.uid() = user_id);

-- TYPING INDICATORS
DROP POLICY IF EXISTS "Users can view typing" ON typing_indicators;
DROP POLICY IF EXISTS "Users can manage typing" ON typing_indicators;

CREATE POLICY "Users can view typing" ON typing_indicators FOR SELECT
USING (EXISTS (SELECT 1 FROM matches WHERE matches.id = typing_indicators.match_id AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())));
CREATE POLICY "Users can manage typing" ON typing_indicators FOR ALL USING (auth.uid() = user_id);

-- USER PRESENCE
DROP POLICY IF EXISTS "Users can view presence" ON user_presence;
DROP POLICY IF EXISTS "Users can manage presence" ON user_presence;

CREATE POLICY "Users can view presence" ON user_presence FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can manage presence" ON user_presence FOR ALL USING (auth.uid() = user_id);

-- JOB POSTS
DROP POLICY IF EXISTS "Anyone can view active jobs" ON job_posts;
DROP POLICY IF EXISTS "Business can create jobs" ON job_posts;
DROP POLICY IF EXISTS "Business can update own jobs" ON job_posts;
DROP POLICY IF EXISTS "Business can delete own jobs" ON job_posts;

CREATE POLICY "Anyone can view active jobs" ON job_posts FOR SELECT USING (status = 'active' OR business_id = auth.uid());
CREATE POLICY "Business can create jobs" ON job_posts FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Business can update own jobs" ON job_posts FOR UPDATE USING (auth.uid() = business_id);
CREATE POLICY "Business can delete own jobs" ON job_posts FOR DELETE USING (auth.uid() = business_id);

-- JOB APPLICATIONS
DROP POLICY IF EXISTS "Workers can view own applications" ON job_applications;
DROP POLICY IF EXISTS "Business can view job applications" ON job_applications;
DROP POLICY IF EXISTS "Workers can apply" ON job_applications;
DROP POLICY IF EXISTS "Workers can update own applications" ON job_applications;
DROP POLICY IF EXISTS "Business can update applications" ON job_applications;

CREATE POLICY "Workers can view own applications" ON job_applications FOR SELECT USING (worker_id = auth.uid());
CREATE POLICY "Business can view job applications" ON job_applications FOR SELECT
USING (EXISTS (SELECT 1 FROM job_posts WHERE job_posts.id = job_applications.job_id AND job_posts.business_id = auth.uid()));
CREATE POLICY "Workers can apply" ON job_applications FOR INSERT WITH CHECK (worker_id = auth.uid());
CREATE POLICY "Workers can update own applications" ON job_applications FOR UPDATE USING (worker_id = auth.uid());
CREATE POLICY "Business can update applications" ON job_applications FOR UPDATE
USING (EXISTS (SELECT 1 FROM job_posts WHERE job_posts.id = job_applications.job_id AND job_posts.business_id = auth.uid()));

-- CALL LOGS
DROP POLICY IF EXISTS "Users can view own calls" ON call_logs;
DROP POLICY IF EXISTS "Users can create calls" ON call_logs;
DROP POLICY IF EXISTS "Users can update calls" ON call_logs;

CREATE POLICY "Users can view own calls" ON call_logs FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can create calls" ON call_logs FOR INSERT WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "Users can update calls" ON call_logs FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- ACTIVE CALLS
DROP POLICY IF EXISTS "Users can view active calls" ON active_calls;
DROP POLICY IF EXISTS "Users can create active calls" ON active_calls;
DROP POLICY IF EXISTS "Users can update active calls" ON active_calls;
DROP POLICY IF EXISTS "Users can delete active calls" ON active_calls;

CREATE POLICY "Users can view active calls" ON active_calls FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can create active calls" ON active_calls FOR INSERT WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "Users can update active calls" ON active_calls FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can delete active calls" ON active_calls FOR DELETE USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- REPORTS
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
DROP POLICY IF EXISTS "Users can create reports" ON reports;

CREATE POLICY "Users can view own reports" ON reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Users can create reports" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- BLOCKS
DROP POLICY IF EXISTS "Users can view own blocks" ON blocks;
DROP POLICY IF EXISTS "Users can create blocks" ON blocks;
DROP POLICY IF EXISTS "Users can delete blocks" ON blocks;

CREATE POLICY "Users can view own blocks" ON blocks FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users can create blocks" ON blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can delete blocks" ON blocks FOR DELETE USING (auth.uid() = blocker_id);

-- REVIEWS
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update reviews" ON reviews;

CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Users can update reviews" ON reviews FOR UPDATE USING (auth.uid() = reviewer_id);

-- USER STREAKS
DROP POLICY IF EXISTS "Users can view own streaks" ON user_streaks;
DROP POLICY IF EXISTS "Users can manage streaks" ON user_streaks;

CREATE POLICY "Users can view own streaks" ON user_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage streaks" ON user_streaks FOR ALL USING (auth.uid() = user_id);

-- BADGES
DROP POLICY IF EXISTS "Anyone can view badges" ON badges;
CREATE POLICY "Anyone can view badges" ON badges FOR SELECT USING (auth.uid() IS NOT NULL);

-- USER BADGES
DROP POLICY IF EXISTS "Anyone can view user badges" ON user_badges;
CREATE POLICY "Anyone can view user badges" ON user_badges FOR SELECT USING (auth.uid() IS NOT NULL);

-- PAYMENT TABLES
DROP POLICY IF EXISTS "Users can view own transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can view own purchases" ON user_purchases;

CREATE POLICY "Users can view own transactions" ON payment_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own subscription" ON user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own purchases" ON user_purchases FOR SELECT USING (auth.uid() = user_id);

SELECT '✅ All RLS policies created!' as status;

-- ============================================
-- PART 11: STORAGE POLICIES
-- ============================================

-- Profile Photos
DROP POLICY IF EXISTS "Users can upload profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete profile photos" ON storage.objects;

CREATE POLICY "Users can upload profile photos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view profile photos" ON storage.objects FOR SELECT TO public
USING (bucket_id = 'profile-photos');

CREATE POLICY "Users can delete profile photos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Company Logos
DROP POLICY IF EXISTS "Users can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view company logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete company logos" ON storage.objects;

CREATE POLICY "Users can upload company logos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view company logos" ON storage.objects FOR SELECT TO public
USING (bucket_id = 'company-logos');

CREATE POLICY "Users can delete company logos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Documents & Resumes
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents" ON storage.objects;

CREATE POLICY "Users can upload documents" ON storage.objects FOR INSERT TO authenticated
WITH CHECK ((bucket_id = 'documents' OR bucket_id = 'resumes') AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own documents" ON storage.objects FOR SELECT TO authenticated
USING ((bucket_id = 'documents' OR bucket_id = 'resumes') AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete documents" ON storage.objects FOR DELETE TO authenticated
USING ((bucket_id = 'documents' OR bucket_id = 'resumes') AND (storage.foldername(name))[1] = auth.uid()::text);

SELECT '✅ Storage policies created!' as status;

-- ============================================
-- PART 12: HELPER FUNCTIONS
-- ============================================

-- Auto-create match when both users swipe right
CREATE OR REPLACE FUNCTION handle_new_swipe()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.direction = 'right' OR NEW.direction = 'super_like' THEN
        IF EXISTS (
            SELECT 1 FROM swipes
            WHERE swiper_id = NEW.swiped_id
            AND swiped_id = NEW.swiper_id
            AND (direction = 'right' OR direction = 'super_like')
        ) THEN
            INSERT INTO matches (user1_id, user2_id)
            VALUES (
                LEAST(NEW.swiper_id, NEW.swiped_id),
                GREATEST(NEW.swiper_id, NEW.swiped_id)
            )
            ON CONFLICT (user1_id, user2_id) DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_swipe ON swipes;
CREATE TRIGGER on_new_swipe
    AFTER INSERT ON swipes
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_swipe();

-- Update last_message_at on new message
CREATE OR REPLACE FUNCTION update_match_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE matches SET last_message_at = NOW(), updated_at = NOW()
    WHERE id = NEW.match_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_match_last_message();

-- Increment job applications count
CREATE OR REPLACE FUNCTION increment_job_applications(p_job_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE job_posts
    SET applications_count = COALESCE(applications_count, 0) + 1,
        updated_at = NOW()
    WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement job applications count
CREATE OR REPLACE FUNCTION decrement_job_applications(p_job_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE job_posts
    SET applications_count = GREATEST(0, COALESCE(applications_count, 0) - 1),
        updated_at = NOW()
    WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_posts_updated_at ON job_posts;
CREATE TRIGGER update_job_posts_updated_at BEFORE UPDATE ON job_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_applications_updated_at ON job_applications;
CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON job_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION increment_job_applications(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_job_applications(UUID) TO authenticated;

SELECT '✅ Helper functions created!' as status;

-- ============================================
-- FINAL VERIFICATION
-- ============================================

SELECT
    '📊 Table Summary' as info,
    COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public';

SELECT
    '🔒 Policy Summary' as info,
    COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public';

SELECT '🎉 COMPLETE! Your Kaam Deu database is fully production-ready!' as final_status;
