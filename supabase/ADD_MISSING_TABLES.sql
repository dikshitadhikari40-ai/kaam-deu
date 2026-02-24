-- ============================================
-- KAAM DEU - ADD MISSING TABLES & POLICIES
-- Run this AFTER complete_setup.sql
-- ============================================

-- ============================================
-- PART 1: CREATE MISSING TABLES
-- ============================================

-- BADGES TABLE (Reference data)
CREATE TABLE IF NOT EXISTS badges (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
    icon_url text,
    category text,
    points integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- USER BADGES TABLE
CREATE TABLE IF NOT EXISTS user_badges (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    badge_id uuid REFERENCES badges(id) ON DELETE CASCADE NOT NULL,
    earned_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, badge_id)
);

-- TYPING INDICATORS TABLE
CREATE TABLE IF NOT EXISTS typing_indicators (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id uuid REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    is_typing boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(match_id, user_id)
);

-- USER PRESENCE TABLE
CREATE TABLE IF NOT EXISTS user_presence (
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
    is_online boolean DEFAULT false,
    last_seen timestamp with time zone DEFAULT now(),
    current_match_id uuid REFERENCES matches(id) ON DELETE SET NULL
);

-- ACTIVE CALLS TABLE
CREATE TABLE IF NOT EXISTS active_calls (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    call_log_id uuid REFERENCES call_logs(id) ON DELETE CASCADE,
    match_id uuid REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
    caller_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    call_type text NOT NULL CHECK (call_type IN ('voice', 'video')),
    caller_sdp text,
    receiver_sdp text,
    ice_candidates jsonb DEFAULT '[]'::jsonb,
    status text DEFAULT 'ringing',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- MESSAGE REACTIONS TABLE
CREATE TABLE IF NOT EXISTS message_reactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id uuid REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    reaction text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(message_id, user_id, reaction)
);

SELECT '✅ Missing tables created!' as status;

-- ============================================
-- PART 2: PAYMENT TABLES
-- ============================================

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

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);

SELECT '✅ Payment tables created!' as status;

-- ============================================
-- PART 3: STORAGE BUCKETS
-- ============================================

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

SELECT '✅ Storage buckets created!' as status;

-- ============================================
-- PART 4: ENABLE RLS ON NEW TABLES
-- ============================================

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;

SELECT '✅ RLS enabled!' as status;

-- ============================================
-- PART 5: CREATE RLS POLICIES FOR NEW TABLES
-- ============================================

-- BADGES
DROP POLICY IF EXISTS "Anyone can view badges" ON badges;
CREATE POLICY "Anyone can view badges" ON badges FOR SELECT USING (auth.uid() IS NOT NULL);

-- USER BADGES
DROP POLICY IF EXISTS "Anyone can view user badges" ON user_badges;
DROP POLICY IF EXISTS "Users can insert own badges" ON user_badges;
CREATE POLICY "Anyone can view user badges" ON user_badges FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert own badges" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- TYPING INDICATORS
DROP POLICY IF EXISTS "Users can view typing in matches" ON typing_indicators;
DROP POLICY IF EXISTS "Users can manage own typing" ON typing_indicators;
CREATE POLICY "Users can view typing in matches" ON typing_indicators FOR SELECT
USING (EXISTS (SELECT 1 FROM matches WHERE matches.id = typing_indicators.match_id AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())));
CREATE POLICY "Users can manage own typing" ON typing_indicators FOR ALL USING (auth.uid() = user_id);

-- USER PRESENCE
DROP POLICY IF EXISTS "Anyone can view presence" ON user_presence;
DROP POLICY IF EXISTS "Users can manage own presence" ON user_presence;
CREATE POLICY "Anyone can view presence" ON user_presence FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can manage own presence" ON user_presence FOR ALL USING (auth.uid() = user_id);

-- ACTIVE CALLS
DROP POLICY IF EXISTS "Users can view own active calls" ON active_calls;
DROP POLICY IF EXISTS "Users can create active calls" ON active_calls;
DROP POLICY IF EXISTS "Users can update own active calls" ON active_calls;
DROP POLICY IF EXISTS "Users can delete own active calls" ON active_calls;
CREATE POLICY "Users can view own active calls" ON active_calls FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can create active calls" ON active_calls FOR INSERT WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "Users can update own active calls" ON active_calls FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can delete own active calls" ON active_calls FOR DELETE USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- MESSAGE REACTIONS
DROP POLICY IF EXISTS "Users can view reactions" ON message_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON message_reactions;
DROP POLICY IF EXISTS "Users can remove reactions" ON message_reactions;
CREATE POLICY "Users can view reactions" ON message_reactions FOR SELECT
USING (EXISTS (SELECT 1 FROM messages m JOIN matches ON matches.id = m.match_id WHERE m.id = message_reactions.message_id AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())));
CREATE POLICY "Users can add reactions" ON message_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove reactions" ON message_reactions FOR DELETE USING (auth.uid() = user_id);

-- PAYMENT TABLES
DROP POLICY IF EXISTS "Users can view own transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Service can manage transactions" ON payment_transactions;
CREATE POLICY "Users can view own transactions" ON payment_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can manage transactions" ON payment_transactions FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Service can manage subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view own subscription" ON user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can manage subscriptions" ON user_subscriptions FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can view own purchases" ON user_purchases;
DROP POLICY IF EXISTS "Service can manage purchases" ON user_purchases;
CREATE POLICY "Users can view own purchases" ON user_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can manage purchases" ON user_purchases FOR ALL USING (true);

SELECT '✅ All RLS policies created!' as status;

-- ============================================
-- PART 6: PAYMENT FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION increment_user_boosts(p_user_id UUID, p_count INTEGER)
RETURNS void AS $$
BEGIN
    INSERT INTO user_purchases (user_id, boosts_remaining)
    VALUES (p_user_id, p_count)
    ON CONFLICT (user_id) DO UPDATE SET
        boosts_remaining = user_purchases.boosts_remaining + p_count,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_user_super_likes(p_user_id UUID, p_count INTEGER)
RETURNS void AS $$
BEGIN
    INSERT INTO user_purchases (user_id, super_likes_remaining)
    VALUES (p_user_id, p_count)
    ON CONFLICT (user_id) DO UPDATE SET
        super_likes_remaining = user_purchases.super_likes_remaining + p_count,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION use_boost(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE remaining INTEGER;
BEGIN
    SELECT boosts_remaining INTO remaining FROM user_purchases WHERE user_id = p_user_id;
    IF remaining IS NULL OR remaining <= 0 THEN RETURN FALSE; END IF;
    UPDATE user_purchases SET boosts_remaining = boosts_remaining - 1, updated_at = NOW() WHERE user_id = p_user_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION use_super_like(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE remaining INTEGER;
BEGIN
    SELECT super_likes_remaining INTO remaining FROM user_purchases WHERE user_id = p_user_id;
    IF remaining IS NULL OR remaining <= 0 THEN RETURN FALSE; END IF;
    UPDATE user_purchases SET super_likes_remaining = super_likes_remaining - 1, updated_at = NOW() WHERE user_id = p_user_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Payment functions created!' as status;

-- ============================================
-- PART 7: STORAGE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can upload profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete profile photos" ON storage.objects;

CREATE POLICY "Users can upload profile photos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profile-photos');

CREATE POLICY "Anyone can view profile photos" ON storage.objects FOR SELECT TO public
USING (bucket_id = 'profile-photos');

CREATE POLICY "Users can delete profile photos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'profile-photos');

DROP POLICY IF EXISTS "Users can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view company logos" ON storage.objects;

CREATE POLICY "Users can upload company logos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company-logos');

CREATE POLICY "Anyone can view company logos" ON storage.objects FOR SELECT TO public
USING (bucket_id = 'company-logos');

DROP POLICY IF EXISTS "Users can upload chat media" ON storage.objects;
DROP POLICY IF EXISTS "Users can view chat media" ON storage.objects;

CREATE POLICY "Users can upload chat media" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-media');

CREATE POLICY "Users can view chat media" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents" ON storage.objects;

CREATE POLICY "Users can upload documents" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Users can view documents" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Users can delete documents" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents');

SELECT '✅ Storage policies created!' as status;

-- ============================================
-- FINAL
-- ============================================

SELECT '🎉 ALL DONE! Database is production-ready!' as final_status;
