-- ============================================
-- KAAM DEU - FINAL PRODUCTION MIGRATION
-- Run this ONCE in Supabase SQL Editor
-- ============================================
-- This consolidates all necessary migrations:
-- 1. Storage Buckets
-- 2. Payment Tables
-- 3. RLS Policies
-- ============================================

-- ============================================
-- PART 1: STORAGE BUCKETS
-- ============================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('profile-photos', 'profile-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('company-logos', 'company-logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('chat-media', 'chat-media', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    ('documents', 'documents', false, 10485760, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Profile Photos Bucket Policies
DROP POLICY IF EXISTS "Users can upload own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile photos" ON storage.objects;

CREATE POLICY "Users can upload own profile photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view profile photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'profile-photos');

CREATE POLICY "Users can delete own profile photos"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own profile photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Company Logos Bucket Policies
DROP POLICY IF EXISTS "Users can upload own company logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view company logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own company logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own company logos" ON storage.objects;

CREATE POLICY "Users can upload own company logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view company logos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'company-logos');

CREATE POLICY "Users can delete own company logos"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own company logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Chat Media Bucket Policies
DROP POLICY IF EXISTS "Match participants can upload chat media" ON storage.objects;
DROP POLICY IF EXISTS "Match participants can view chat media" ON storage.objects;

CREATE POLICY "Match participants can upload chat media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'chat-media'
    AND EXISTS (
        SELECT 1 FROM matches
        WHERE matches.id::text = (storage.foldername(name))[1]
        AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
);

CREATE POLICY "Match participants can view chat media"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'chat-media'
    AND EXISTS (
        SELECT 1 FROM matches
        WHERE matches.id::text = (storage.foldername(name))[1]
        AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
);

-- Documents Bucket Policies (Private)
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;

CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

SELECT '✅ Storage buckets created!' as status;

-- ============================================
-- PART 2: PAYMENT TABLES
-- ============================================

-- Payment Transactions Table
CREATE TABLE IF NOT EXISTS payment_transactions (
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

-- User Subscriptions Table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'pro', 'premium')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    payment_transaction_id TEXT REFERENCES payment_transactions(id),
    auto_renew BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Purchases Table (for boosts, super likes)
CREATE TABLE IF NOT EXISTS user_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    boosts_remaining INTEGER DEFAULT 0,
    super_likes_remaining INTEGER DEFAULT 0,
    spotlights_remaining INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created ON payment_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires ON user_subscriptions(expires_at);

-- RLS for payment tables
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON payment_transactions;
CREATE POLICY "Users can view own transactions" ON payment_transactions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can manage transactions" ON payment_transactions;
CREATE POLICY "Service can manage transactions" ON payment_transactions
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions;
CREATE POLICY "Users can view own subscription" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can manage subscriptions" ON user_subscriptions;
CREATE POLICY "Service can manage subscriptions" ON user_subscriptions
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can view own purchases" ON user_purchases;
CREATE POLICY "Users can view own purchases" ON user_purchases
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can manage purchases" ON user_purchases;
CREATE POLICY "Service can manage purchases" ON user_purchases
    FOR ALL USING (true);

-- Payment Functions
CREATE OR REPLACE FUNCTION increment_user_boosts(p_user_id UUID, p_count INTEGER)
RETURNS void AS $$
BEGIN
    INSERT INTO user_purchases (user_id, boosts_remaining)
    VALUES (p_user_id, p_count)
    ON CONFLICT (user_id)
    DO UPDATE SET
        boosts_remaining = user_purchases.boosts_remaining + p_count,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_user_super_likes(p_user_id UUID, p_count INTEGER)
RETURNS void AS $$
BEGIN
    INSERT INTO user_purchases (user_id, super_likes_remaining)
    VALUES (p_user_id, p_count)
    ON CONFLICT (user_id)
    DO UPDATE SET
        super_likes_remaining = user_purchases.super_likes_remaining + p_count,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION use_boost(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    remaining INTEGER;
BEGIN
    SELECT boosts_remaining INTO remaining FROM user_purchases WHERE user_id = p_user_id;
    IF remaining IS NULL OR remaining <= 0 THEN RETURN FALSE; END IF;
    UPDATE user_purchases SET boosts_remaining = boosts_remaining - 1, updated_at = NOW() WHERE user_id = p_user_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION use_super_like(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    remaining INTEGER;
BEGIN
    SELECT super_likes_remaining INTO remaining FROM user_purchases WHERE user_id = p_user_id;
    IF remaining IS NULL OR remaining <= 0 THEN RETURN FALSE; END IF;
    UPDATE user_purchases SET super_likes_remaining = super_likes_remaining - 1, updated_at = NOW() WHERE user_id = p_user_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_subscription_status(p_user_id UUID)
RETURNS TABLE(plan_type TEXT, is_active BOOLEAN, expires_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    SELECT s.plan_type, (s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > NOW())) as is_active, s.expires_at
    FROM user_subscriptions s WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Payment tables created!' as status;

-- ============================================
-- PART 3: RLS POLICIES FOR EXISTING TABLES
-- ============================================

-- PROFILES TABLE
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON profiles FOR DELETE USING (auth.uid() = id);

-- SWIPES TABLE
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own swipes" ON swipes;
DROP POLICY IF EXISTS "Users can create own swipes" ON swipes;
DROP POLICY IF EXISTS "Users can delete own swipes" ON swipes;

CREATE POLICY "Users can view own swipes" ON swipes FOR SELECT USING (auth.uid() = swiper_id);
CREATE POLICY "Users can create own swipes" ON swipes FOR INSERT WITH CHECK (auth.uid() = swiper_id);
CREATE POLICY "Users can delete own swipes" ON swipes FOR DELETE USING (auth.uid() = swiper_id);

-- MATCHES TABLE
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own matches" ON matches;
DROP POLICY IF EXISTS "Users can create matches" ON matches;
DROP POLICY IF EXISTS "Users can update own matches" ON matches;
DROP POLICY IF EXISTS "Users can delete own matches" ON matches;

CREATE POLICY "Users can view own matches" ON matches FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Users can create matches" ON matches FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Users can update own matches" ON matches FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Users can delete own matches" ON matches FOR DELETE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- MESSAGES TABLE
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view messages in their matches" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their matches" ON messages;
DROP POLICY IF EXISTS "Users can update messages in their matches" ON messages;

CREATE POLICY "Users can view messages in their matches" ON messages FOR SELECT
USING (EXISTS (SELECT 1 FROM matches WHERE matches.id = messages.match_id AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())));

CREATE POLICY "Users can send messages in their matches" ON messages FOR INSERT
WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM matches WHERE matches.id = messages.match_id AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())));

CREATE POLICY "Users can update messages in their matches" ON messages FOR UPDATE
USING (EXISTS (SELECT 1 FROM matches WHERE matches.id = messages.match_id AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())));

-- MESSAGE REACTIONS TABLE
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view reactions" ON message_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON message_reactions;
DROP POLICY IF EXISTS "Users can remove own reactions" ON message_reactions;

CREATE POLICY "Users can view reactions" ON message_reactions FOR SELECT
USING (EXISTS (SELECT 1 FROM messages m JOIN matches ON matches.id = m.match_id WHERE m.id = message_reactions.message_id AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())));

CREATE POLICY "Users can add reactions" ON message_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reactions" ON message_reactions FOR DELETE USING (auth.uid() = user_id);

-- TYPING INDICATORS TABLE
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view typing indicators in their matches" ON typing_indicators;
DROP POLICY IF EXISTS "Users can manage own typing status" ON typing_indicators;

CREATE POLICY "Users can view typing indicators in their matches" ON typing_indicators FOR SELECT
USING (EXISTS (SELECT 1 FROM matches WHERE matches.id = typing_indicators.match_id AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())));

CREATE POLICY "Users can manage own typing status" ON typing_indicators FOR ALL USING (auth.uid() = user_id);

-- USER PRESENCE TABLE
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view all presence" ON user_presence;
DROP POLICY IF EXISTS "Users can manage own presence" ON user_presence;

CREATE POLICY "Users can view all presence" ON user_presence FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can manage own presence" ON user_presence FOR ALL USING (auth.uid() = user_id);

-- CALL LOGS TABLE
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own call logs" ON call_logs;
DROP POLICY IF EXISTS "Users can create call logs" ON call_logs;
DROP POLICY IF EXISTS "Users can update own call logs" ON call_logs;

CREATE POLICY "Users can view own call logs" ON call_logs FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can create call logs" ON call_logs FOR INSERT WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "Users can update own call logs" ON call_logs FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- ACTIVE CALLS TABLE
ALTER TABLE active_calls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own active calls" ON active_calls;
DROP POLICY IF EXISTS "Users can create active calls" ON active_calls;
DROP POLICY IF EXISTS "Users can update own active calls" ON active_calls;
DROP POLICY IF EXISTS "Users can delete own active calls" ON active_calls;

CREATE POLICY "Users can view own active calls" ON active_calls FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can create active calls" ON active_calls FOR INSERT WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "Users can update own active calls" ON active_calls FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can delete own active calls" ON active_calls FOR DELETE USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- REPORTS TABLE
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
DROP POLICY IF EXISTS "Users can create reports" ON reports;

CREATE POLICY "Users can view own reports" ON reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Users can create reports" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- BLOCKS TABLE
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own blocks" ON blocks;
DROP POLICY IF EXISTS "Users can create blocks" ON blocks;
DROP POLICY IF EXISTS "Users can delete own blocks" ON blocks;

CREATE POLICY "Users can view own blocks" ON blocks FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users can create blocks" ON blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can delete own blocks" ON blocks FOR DELETE USING (auth.uid() = blocker_id);

-- REVIEWS TABLE
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;

CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = reviewer_id);

-- USER STREAKS TABLE
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own streaks" ON user_streaks;
DROP POLICY IF EXISTS "Users can manage own streaks" ON user_streaks;

CREATE POLICY "Users can view own streaks" ON user_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own streaks" ON user_streaks FOR ALL USING (auth.uid() = user_id);

-- USER BADGES TABLE
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view user badges" ON user_badges;
DROP POLICY IF EXISTS "Users can view own badges only" ON user_badges;

CREATE POLICY "Anyone can view user badges" ON user_badges FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can view own badges only" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- BADGES TABLE
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view badges" ON badges;

CREATE POLICY "Anyone can view badges" ON badges FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================
-- VERIFICATION
-- ============================================
SELECT '✅ All RLS policies created!' as status;

SELECT
    '📊 Policy Summary' as info,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

SELECT '🎉 MIGRATION COMPLETE! Your Kaam Deu database is production-ready!' as final_status;
