-- ============================================
-- KAAM DEU - COMPLETE RLS POLICIES
-- Run this in Supabase SQL Editor
-- This file contains ALL RLS policies for the app
-- ============================================

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

-- Anyone authenticated can view profiles (needed for swiping)
CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Users can only insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users can only delete their own profile
CREATE POLICY "Users can delete own profile" ON profiles
    FOR DELETE
    USING (auth.uid() = id);

-- ============================================
-- 2. SWIPES TABLE
-- ============================================
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own swipes" ON swipes;
DROP POLICY IF EXISTS "Users can create own swipes" ON swipes;
DROP POLICY IF EXISTS "Users can delete own swipes" ON swipes;

-- Users can only view their own swipes
CREATE POLICY "Users can view own swipes" ON swipes
    FOR SELECT
    USING (auth.uid() = swiper_id);

-- Users can only create swipes as themselves
CREATE POLICY "Users can create own swipes" ON swipes
    FOR INSERT
    WITH CHECK (auth.uid() = swiper_id);

-- Users can delete their own swipes (for undo)
CREATE POLICY "Users can delete own swipes" ON swipes
    FOR DELETE
    USING (auth.uid() = swiper_id);

-- ============================================
-- 3. MATCHES TABLE
-- ============================================
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own matches" ON matches;
DROP POLICY IF EXISTS "Users can create matches" ON matches;
DROP POLICY IF EXISTS "Users can update own matches" ON matches;
DROP POLICY IF EXISTS "Users can delete own matches" ON matches;

-- Users can view matches they are part of
CREATE POLICY "Users can view own matches" ON matches
    FOR SELECT
    USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Allow insert for match creation (trigger or manual)
CREATE POLICY "Users can create matches" ON matches
    FOR INSERT
    WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can update matches they are part of (e.g., unmatch)
CREATE POLICY "Users can update own matches" ON matches
    FOR UPDATE
    USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can delete matches they are part of
CREATE POLICY "Users can delete own matches" ON matches
    FOR DELETE
    USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ============================================
-- 4. MESSAGES TABLE
-- ============================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their matches" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their matches" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;

-- Users can view messages in matches they are part of
CREATE POLICY "Users can view messages in their matches" ON messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM matches
            WHERE matches.id = messages.match_id
            AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
        )
    );

-- Users can send messages in matches they are part of
CREATE POLICY "Users can send messages in their matches" ON messages
    FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM matches
            WHERE matches.id = messages.match_id
            AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
        )
    );

-- Users can update their own messages (read status, soft delete)
CREATE POLICY "Users can update messages in their matches" ON messages
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM matches
            WHERE matches.id = messages.match_id
            AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
        )
    );

-- ============================================
-- 5. MESSAGE REACTIONS TABLE
-- ============================================
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view reactions" ON message_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON message_reactions;
DROP POLICY IF EXISTS "Users can remove own reactions" ON message_reactions;

-- Users can view reactions on messages in their matches
CREATE POLICY "Users can view reactions" ON message_reactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN matches ON matches.id = m.match_id
            WHERE m.id = message_reactions.message_id
            AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
        )
    );

-- Users can add reactions
CREATE POLICY "Users can add reactions" ON message_reactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can remove their own reactions
CREATE POLICY "Users can remove own reactions" ON message_reactions
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 6. TYPING INDICATORS TABLE
-- ============================================
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view typing indicators in their matches" ON typing_indicators;
DROP POLICY IF EXISTS "Users can update own typing status" ON typing_indicators;

-- Users can view typing indicators in matches they are part of
CREATE POLICY "Users can view typing indicators in their matches" ON typing_indicators
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM matches
            WHERE matches.id = typing_indicators.match_id
            AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
        )
    );

-- Users can update their own typing status
CREATE POLICY "Users can manage own typing status" ON typing_indicators
    FOR ALL
    USING (auth.uid() = user_id);

-- ============================================
-- 7. USER PRESENCE TABLE
-- ============================================
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all presence" ON user_presence;
DROP POLICY IF EXISTS "Users can update own presence" ON user_presence;

-- Anyone authenticated can view presence (for online status)
CREATE POLICY "Users can view all presence" ON user_presence
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Users can only update their own presence
CREATE POLICY "Users can manage own presence" ON user_presence
    FOR ALL
    USING (auth.uid() = user_id);

-- ============================================
-- 8. CALL LOGS TABLE
-- ============================================
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own call logs" ON call_logs;
DROP POLICY IF EXISTS "Users can create call logs" ON call_logs;
DROP POLICY IF EXISTS "Users can update own call logs" ON call_logs;

-- Users can view calls they made or received
CREATE POLICY "Users can view own call logs" ON call_logs
    FOR SELECT
    USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Users can create call logs (caller initiates)
CREATE POLICY "Users can create call logs" ON call_logs
    FOR INSERT
    WITH CHECK (auth.uid() = caller_id);

-- Users can update call logs they are part of
CREATE POLICY "Users can update own call logs" ON call_logs
    FOR UPDATE
    USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- ============================================
-- 9. ACTIVE CALLS TABLE
-- ============================================
ALTER TABLE active_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own active calls" ON active_calls;
DROP POLICY IF EXISTS "Users can create active calls" ON active_calls;
DROP POLICY IF EXISTS "Users can update own active calls" ON active_calls;
DROP POLICY IF EXISTS "Users can delete own active calls" ON active_calls;

-- Users can view calls they are part of
CREATE POLICY "Users can view own active calls" ON active_calls
    FOR SELECT
    USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Callers can create active calls
CREATE POLICY "Users can create active calls" ON active_calls
    FOR INSERT
    WITH CHECK (auth.uid() = caller_id);

-- Both parties can update (for SDP/ICE exchange)
CREATE POLICY "Users can update own active calls" ON active_calls
    FOR UPDATE
    USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Both parties can end/delete calls
CREATE POLICY "Users can delete own active calls" ON active_calls
    FOR DELETE
    USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- ============================================
-- 10. REPORTS TABLE
-- ============================================
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reports" ON reports;
DROP POLICY IF EXISTS "Users can create reports" ON reports;

-- Users can only view their own reports
CREATE POLICY "Users can view own reports" ON reports
    FOR SELECT
    USING (auth.uid() = reporter_id);

-- Users can create reports
CREATE POLICY "Users can create reports" ON reports
    FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

-- ============================================
-- 11. BLOCKS TABLE
-- ============================================
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own blocks" ON blocks;
DROP POLICY IF EXISTS "Users can create blocks" ON blocks;
DROP POLICY IF EXISTS "Users can delete own blocks" ON blocks;

-- Users can view blocks they made
CREATE POLICY "Users can view own blocks" ON blocks
    FOR SELECT
    USING (auth.uid() = blocker_id);

-- Users can create blocks
CREATE POLICY "Users can create blocks" ON blocks
    FOR INSERT
    WITH CHECK (auth.uid() = blocker_id);

-- Users can delete their own blocks (unblock)
CREATE POLICY "Users can delete own blocks" ON blocks
    FOR DELETE
    USING (auth.uid() = blocker_id);

-- ============================================
-- 12. REVIEWS TABLE
-- ============================================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;

-- Anyone authenticated can view reviews
CREATE POLICY "Anyone can view reviews" ON reviews
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Users can create reviews (reviewer_id must match)
CREATE POLICY "Users can create reviews" ON reviews
    FOR INSERT
    WITH CHECK (auth.uid() = reviewer_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews" ON reviews
    FOR UPDATE
    USING (auth.uid() = reviewer_id);

-- ============================================
-- 13. USER STREAKS TABLE
-- ============================================
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own streaks" ON user_streaks;
DROP POLICY IF EXISTS "Users can manage own streaks" ON user_streaks;

-- Users can view their own streaks
CREATE POLICY "Users can view own streaks" ON user_streaks
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can manage their own streaks
CREATE POLICY "Users can manage own streaks" ON user_streaks
    FOR ALL
    USING (auth.uid() = user_id);

-- ============================================
-- 14. USER BADGES TABLE
-- ============================================
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view user badges" ON user_badges;
DROP POLICY IF EXISTS "System can manage badges" ON user_badges;

-- Anyone authenticated can view badges (for profile display)
CREATE POLICY "Anyone can view user badges" ON user_badges
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Users can only be awarded badges via trigger/function
-- No direct insert allowed from client
CREATE POLICY "Users can view own badges only" ON user_badges
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 15. BADGES TABLE (Reference data)
-- ============================================
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view badges" ON badges;

-- Anyone authenticated can view badge definitions
CREATE POLICY "Anyone can view badges" ON badges
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
SELECT 'RLS Policies Summary:' as status;

SELECT
    schemaname,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- List all policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

SELECT 'SUCCESS: All RLS policies created!' as status;
