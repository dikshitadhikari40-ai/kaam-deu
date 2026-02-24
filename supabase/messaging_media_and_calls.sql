-- ============================================
-- KAAM DEU - ENHANCED MESSAGING, MEDIA & CALLS
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ENHANCE MESSAGES TABLE FOR MEDIA SUPPORT
-- ============================================

-- Add new columns to messages table for media support
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text'
    CHECK (message_type IN ('text', 'image', 'document', 'voice', 'video', 'location'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_thumbnail_url text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_size integer;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_type text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_width integer;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_height integer;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_duration integer; -- For voice/video in seconds
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'sent'
    CHECK (delivery_status IN ('sending', 'sent', 'delivered', 'read', 'failed'));

-- Make content nullable (for media-only messages)
ALTER TABLE messages ALTER COLUMN content DROP NOT NULL;

-- Index for faster message queries
CREATE INDEX IF NOT EXISTS idx_messages_match_id ON messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);

-- ============================================
-- 2. CREATE CHAT ATTACHMENTS STORAGE BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chat-attachments',
    'chat-attachments',
    false, -- Private bucket - requires signed URLs
    52428800, -- 50MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- Storage policies for chat attachments
DROP POLICY IF EXISTS "Users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view chat attachments in their matches" ON storage.objects;

CREATE POLICY "Users can upload chat attachments" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'chat-attachments' AND
    auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view chat attachments in their matches" ON storage.objects
FOR SELECT USING (
    bucket_id = 'chat-attachments' AND
    auth.uid() IS NOT NULL
);

-- ============================================
-- 3. TYPING INDICATORS TABLE (Real-time)
-- ============================================

CREATE TABLE IF NOT EXISTS typing_indicators (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id uuid REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    is_typing boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(match_id, user_id)
);

ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage typing in their matches" ON typing_indicators;
CREATE POLICY "Users can manage typing in their matches" ON typing_indicators
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM matches
        WHERE matches.id = typing_indicators.match_id
        AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
);

-- ============================================
-- 4. PRESENCE/ONLINE STATUS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_presence (
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
    is_online boolean DEFAULT false,
    last_seen timestamp with time zone DEFAULT now(),
    current_match_id uuid REFERENCES matches(id) ON DELETE SET NULL -- Which chat they're in
);

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view presence" ON user_presence;
DROP POLICY IF EXISTS "Users can update own presence" ON user_presence;

CREATE POLICY "Anyone can view presence" ON user_presence FOR SELECT USING (true);
CREATE POLICY "Users can update own presence" ON user_presence FOR ALL USING (auth.uid() = user_id);

-- Function to update presence
CREATE OR REPLACE FUNCTION update_user_presence(p_is_online boolean, p_match_id uuid DEFAULT NULL)
RETURNS void AS $$
BEGIN
    INSERT INTO user_presence (user_id, is_online, last_seen, current_match_id)
    VALUES (auth.uid(), p_is_online, now(), p_match_id)
    ON CONFLICT (user_id) DO UPDATE SET
        is_online = p_is_online,
        last_seen = now(),
        current_match_id = p_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. CALL LOGS TABLE (Voice/Video Calls)
-- ============================================

-- Drop and recreate with better schema
DROP TABLE IF EXISTS call_logs CASCADE;

CREATE TABLE call_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id uuid REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
    caller_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    call_type text NOT NULL CHECK (call_type IN ('voice', 'video')),
    status text NOT NULL DEFAULT 'initiated' CHECK (status IN (
        'initiated',   -- Call started
        'ringing',     -- Receiver notified
        'accepted',    -- Receiver accepted
        'connected',   -- Both parties connected
        'ended',       -- Normal end
        'missed',      -- Receiver didn't answer
        'declined',    -- Receiver declined
        'busy',        -- Receiver was in another call
        'failed'       -- Technical failure
    )),
    started_at timestamp with time zone DEFAULT now(),
    accepted_at timestamp with time zone,
    connected_at timestamp with time zone,
    ended_at timestamp with time zone,
    duration_seconds integer DEFAULT 0,
    end_reason text, -- 'caller_ended', 'receiver_ended', 'timeout', 'error'
    quality_rating integer CHECK (quality_rating >= 1 AND quality_rating <= 5),
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_match ON call_logs(match_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_caller ON call_logs(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_receiver ON call_logs(receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(status);
CREATE INDEX IF NOT EXISTS idx_call_logs_created ON call_logs(created_at DESC);

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own call logs" ON call_logs;
DROP POLICY IF EXISTS "Users can create call logs" ON call_logs;
DROP POLICY IF EXISTS "Users can update own call logs" ON call_logs;

CREATE POLICY "Users can view own call logs" ON call_logs
FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create call logs" ON call_logs
FOR INSERT WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can update own call logs" ON call_logs
FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- ============================================
-- 6. ACTIVE CALLS TABLE (For Signaling)
-- ============================================

CREATE TABLE IF NOT EXISTS active_calls (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    call_log_id uuid REFERENCES call_logs(id) ON DELETE CASCADE NOT NULL,
    match_id uuid REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
    caller_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    call_type text NOT NULL CHECK (call_type IN ('voice', 'video')),
    -- WebRTC Signaling
    caller_sdp text, -- Session Description Protocol offer
    receiver_sdp text, -- SDP answer
    ice_candidates jsonb DEFAULT '[]'::jsonb,
    -- Call state
    status text DEFAULT 'ringing',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_active_calls_receiver ON active_calls(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_active_calls_match ON active_calls(match_id);

ALTER TABLE active_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage calls they're part of" ON active_calls;
CREATE POLICY "Users can manage calls they're part of" ON active_calls
FOR ALL USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- ============================================
-- 7. MESSAGE REACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS message_reactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id uuid REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    reaction text NOT NULL, -- emoji like '❤️', '👍', '😂', etc.
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(message_id, user_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(message_id);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage reactions in their matches" ON message_reactions;
CREATE POLICY "Users can manage reactions in their matches" ON message_reactions
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM messages m
        JOIN matches ma ON m.match_id = ma.id
        WHERE m.id = message_reactions.message_id
        AND (ma.user1_id = auth.uid() OR ma.user2_id = auth.uid())
    )
);

-- ============================================
-- 8. PUSH NOTIFICATION TOKENS
-- ============================================

CREATE TABLE IF NOT EXISTS push_tokens (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    token text NOT NULL,
    platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    device_id text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id, is_active);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own push tokens" ON push_tokens;
CREATE POLICY "Users can manage own push tokens" ON push_tokens
FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================

-- Function to get conversation with other user details
CREATE OR REPLACE FUNCTION get_conversation_details(p_match_id uuid)
RETURNS TABLE (
    match_id uuid,
    other_user_id uuid,
    other_user_name text,
    other_user_photo text,
    other_user_online boolean,
    other_user_last_seen timestamp with time zone,
    last_message_content text,
    last_message_type text,
    last_message_time timestamp with time zone,
    unread_count bigint
) AS $$
DECLARE
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();

    RETURN QUERY
    SELECT
        m.id as match_id,
        CASE WHEN m.user1_id = v_user_id THEN m.user2_id ELSE m.user1_id END as other_user_id,
        COALESCE(p.name, p.company_name) as other_user_name,
        COALESCE(p.photo_url, p.logo_url) as other_user_photo,
        COALESCE(up.is_online, false) as other_user_online,
        up.last_seen as other_user_last_seen,
        lm.content as last_message_content,
        lm.message_type as last_message_type,
        lm.created_at as last_message_time,
        (
            SELECT COUNT(*) FROM messages
            WHERE match_id = m.id
            AND sender_id != v_user_id
            AND is_read = false
        ) as unread_count
    FROM matches m
    JOIN profiles p ON p.id = CASE WHEN m.user1_id = v_user_id THEN m.user2_id ELSE m.user1_id END
    LEFT JOIN user_presence up ON up.user_id = p.id
    LEFT JOIN LATERAL (
        SELECT content, message_type, created_at
        FROM messages
        WHERE match_id = m.id
        ORDER BY created_at DESC
        LIMIT 1
    ) lm ON true
    WHERE m.id = p_match_id
    AND (m.user1_id = v_user_id OR m.user2_id = v_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. REALTIME SUBSCRIPTIONS SETUP
-- ============================================

-- Enable realtime for necessary tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE active_calls;
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'SUCCESS: Enhanced messaging, media, and calls setup complete!' as status;

-- Show new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;
