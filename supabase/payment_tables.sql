-- ============================================
-- KAAM DEU - PAYMENT TABLES
-- Run this in Supabase SQL Editor
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

-- User Purchases Table (for one-time items like boosts, super likes)
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

-- RLS Policies
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;

-- Payment Transactions policies
DROP POLICY IF EXISTS "Users can view own transactions" ON payment_transactions;
CREATE POLICY "Users can view own transactions" ON payment_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Backend service can insert/update (using service key)
DROP POLICY IF EXISTS "Service can manage transactions" ON payment_transactions;
CREATE POLICY "Service can manage transactions" ON payment_transactions
    FOR ALL USING (true);

-- User Subscriptions policies
DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions;
CREATE POLICY "Users can view own subscription" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can manage subscriptions" ON user_subscriptions;
CREATE POLICY "Service can manage subscriptions" ON user_subscriptions
    FOR ALL USING (true);

-- User Purchases policies
DROP POLICY IF EXISTS "Users can view own purchases" ON user_purchases;
CREATE POLICY "Users can view own purchases" ON user_purchases
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can manage purchases" ON user_purchases;
CREATE POLICY "Service can manage purchases" ON user_purchases
    FOR ALL USING (true);

-- Function to increment user boosts
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

-- Function to increment super likes
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

-- Function to use a boost
CREATE OR REPLACE FUNCTION use_boost(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    remaining INTEGER;
BEGIN
    SELECT boosts_remaining INTO remaining
    FROM user_purchases
    WHERE user_id = p_user_id;

    IF remaining IS NULL OR remaining <= 0 THEN
        RETURN FALSE;
    END IF;

    UPDATE user_purchases
    SET boosts_remaining = boosts_remaining - 1, updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to use a super like
CREATE OR REPLACE FUNCTION use_super_like(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    remaining INTEGER;
BEGIN
    SELECT super_likes_remaining INTO remaining
    FROM user_purchases
    WHERE user_id = p_user_id;

    IF remaining IS NULL OR remaining <= 0 THEN
        RETURN FALSE;
    END IF;

    UPDATE user_purchases
    SET super_likes_remaining = super_likes_remaining - 1, updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check subscription status
CREATE OR REPLACE FUNCTION get_user_subscription_status(p_user_id UUID)
RETURNS TABLE(
    plan_type TEXT,
    is_active BOOLEAN,
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.plan_type,
        (s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > NOW())) as is_active,
        s.expires_at
    FROM user_subscriptions s
    WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Payment tables created successfully!' as status;
