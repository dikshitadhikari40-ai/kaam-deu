-- ============================================
-- KAAM DEU - AGORA VIDEO/VOICE CALLS SETUP
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop existing active_calls if it has old schema
DROP TABLE IF EXISTS active_calls CASCADE;

-- ============================================
-- 1. ACTIVE CALLS TABLE (For Agora)
-- ============================================

CREATE TABLE active_calls (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    caller_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    callee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
    channel_name text NOT NULL, -- Agora channel name
    call_type text NOT NULL CHECK (call_type IN ('voice', 'video')),
    status text NOT NULL DEFAULT 'ringing' CHECK (status IN (
        'ringing',     -- Call initiated, waiting for answer
        'accepted',    -- Callee accepted
        'connected',   -- Both parties connected
        'ended',       -- Call ended normally
        'missed',      -- Callee didn't answer
        'declined',    -- Callee declined
        'busy',        -- Callee is in another call
        'failed'       -- Technical failure
    )),
    started_at timestamp with time zone DEFAULT now(),
    connected_at timestamp with time zone,
    ended_at timestamp with time zone,
    duration_seconds integer,
    end_reason text, -- 'caller_ended', 'callee_ended', 'timeout', 'error'
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Indexes for faster queries
CREATE INDEX idx_active_calls_caller ON active_calls(caller_id);
CREATE INDEX idx_active_calls_callee ON active_calls(callee_id);
CREATE INDEX idx_active_calls_match ON active_calls(match_id);
CREATE INDEX idx_active_calls_channel ON active_calls(channel_name);
CREATE INDEX idx_active_calls_status ON active_calls(status);
CREATE INDEX idx_active_calls_created ON active_calls(created_at DESC);

-- Enable RLS
ALTER TABLE active_calls ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view calls they're part of" ON active_calls
FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "Users can create calls as caller" ON active_calls
FOR INSERT WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can update calls they're part of" ON active_calls
FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- ============================================
-- 2. CALL HISTORY TABLE (For completed calls)
-- ============================================

CREATE TABLE IF NOT EXISTS call_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    caller_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    callee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
    channel_name text,
    call_type text NOT NULL CHECK (call_type IN ('voice', 'video')),
    status text NOT NULL CHECK (status IN ('completed', 'missed', 'declined', 'failed')),
    started_at timestamp with time zone NOT NULL,
    connected_at timestamp with time zone,
    ended_at timestamp with time zone NOT NULL,
    duration_seconds integer DEFAULT 0,
    end_reason text,
    quality_rating integer CHECK (quality_rating IS NULL OR (quality_rating >= 1 AND quality_rating <= 5)),
    created_at timestamp with time zone DEFAULT now()
);

-- Indexes
CREATE INDEX idx_call_history_caller ON call_history(caller_id);
CREATE INDEX idx_call_history_callee ON call_history(callee_id);
CREATE INDEX idx_call_history_match ON call_history(match_id);
CREATE INDEX idx_call_history_created ON call_history(created_at DESC);

-- Enable RLS
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own call history" ON call_history
FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "System can insert call history" ON call_history
FOR INSERT WITH CHECK (auth.uid() = caller_id OR auth.uid() = callee_id);

-- ============================================
-- 3. FUNCTION TO END CALL AND ARCHIVE
-- ============================================

CREATE OR REPLACE FUNCTION end_call_and_archive(
    p_call_id uuid,
    p_status text,
    p_end_reason text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_call record;
BEGIN
    -- Get the call
    SELECT * INTO v_call FROM active_calls WHERE id = p_call_id;

    IF v_call IS NULL THEN
        RAISE EXCEPTION 'Call not found';
    END IF;

    -- Update the active call
    UPDATE active_calls SET
        status = p_status,
        ended_at = now(),
        end_reason = p_end_reason,
        duration_seconds = EXTRACT(EPOCH FROM (now() - COALESCE(connected_at, started_at)))::integer,
        updated_at = now()
    WHERE id = p_call_id;

    -- Archive to call history
    INSERT INTO call_history (
        caller_id, callee_id, match_id, channel_name, call_type,
        status, started_at, connected_at, ended_at, duration_seconds, end_reason
    )
    SELECT
        caller_id, callee_id, match_id, channel_name, call_type,
        CASE
            WHEN p_status = 'ended' THEN 'completed'
            ELSE p_status
        END,
        started_at, connected_at, now(),
        EXTRACT(EPOCH FROM (now() - COALESCE(connected_at, started_at)))::integer,
        p_end_reason
    FROM active_calls WHERE id = p_call_id;

    -- Delete from active calls
    DELETE FROM active_calls WHERE id = p_call_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. FUNCTION TO CHECK IF USER IS IN A CALL
-- ============================================

CREATE OR REPLACE FUNCTION is_user_in_call(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM active_calls
        WHERE (caller_id = p_user_id OR callee_id = p_user_id)
        AND status IN ('ringing', 'accepted', 'connected')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. FUNCTION TO GET INCOMING CALL
-- ============================================

CREATE OR REPLACE FUNCTION get_incoming_call(p_user_id uuid)
RETURNS TABLE (
    call_id uuid,
    caller_id uuid,
    caller_name text,
    caller_photo text,
    match_id uuid,
    channel_name text,
    call_type text,
    started_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ac.id as call_id,
        ac.caller_id,
        COALESCE(p.name, p.company_name) as caller_name,
        COALESCE(p.photo_url, p.logo_url) as caller_photo,
        ac.match_id,
        ac.channel_name,
        ac.call_type,
        ac.started_at
    FROM active_calls ac
    JOIN profiles p ON p.id = ac.caller_id
    WHERE ac.callee_id = p_user_id
    AND ac.status = 'ringing';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. ENABLE REALTIME FOR ACTIVE CALLS
-- ============================================

-- Enable realtime for call notifications
ALTER PUBLICATION supabase_realtime ADD TABLE active_calls;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'SUCCESS: Agora calls setup complete!' as status;

-- Show tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('active_calls', 'call_history')
ORDER BY table_name;
