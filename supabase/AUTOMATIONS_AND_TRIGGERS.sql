-- ============================================================================
-- KAAM DEU - MASTER AUTOMATIONS, TRIGGERS & WORKFLOW FUNCTIONS
-- ============================================================================
-- This file contains all database automations to enhance:
-- 1. Job Board (auto-matching, recommendations, expiry)
-- 2. Messaging (read receipts, typing, presence)
-- 3. Notifications (real-time push triggers)
-- 4. Matching (smart matching, scoring)
-- 5. Gamification (streaks, badges, achievements)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For fuzzy text matching
CREATE EXTENSION IF NOT EXISTS btree_gin; -- For faster array searches

-- ============================================================================
-- SECTION 1: NOTIFICATIONS SYSTEM
-- ============================================================================

-- Create notifications table if not exists
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'new_match', 'new_message', 'job_application', 'application_status',
        'profile_view', 'super_like', 'job_recommendation', 'job_expiring',
        'new_review', 'badge_earned', 'streak_milestone', 'payment_success',
        'subscription_expiring', 'contact_request', 'call_missed', 'system'
    )),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type
    ON notifications(type);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON notifications;
CREATE POLICY "Users view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON notifications;
CREATE POLICY "Users update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (TRUE);

-- ============================================================================
-- SECTION 2: NOTIFICATION TRIGGER FUNCTIONS
-- ============================================================================

-- 2.1 Notify on New Match
CREATE OR REPLACE FUNCTION notify_new_match()
RETURNS TRIGGER AS $$
DECLARE
    user1_name TEXT;
    user2_name TEXT;
BEGIN
    -- Get user names
    SELECT name INTO user1_name FROM profiles WHERE id = NEW.user1_id;
    SELECT name INTO user2_name FROM profiles WHERE id = NEW.user2_id;

    -- Notify user1
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        NEW.user1_id,
        'new_match',
        'New Match!',
        'You matched with ' || user2_name || '! Start a conversation now.',
        jsonb_build_object(
            'match_id', NEW.id,
            'other_user_id', NEW.user2_id,
            'other_user_name', user2_name
        )
    );

    -- Notify user2
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        NEW.user2_id,
        'new_match',
        'New Match!',
        'You matched with ' || user1_name || '! Start a conversation now.',
        jsonb_build_object(
            'match_id', NEW.id,
            'other_user_id', NEW.user1_id,
            'other_user_name', user1_name
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_match ON matches;
CREATE TRIGGER trigger_notify_new_match
    AFTER INSERT ON matches
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_match();

-- 2.2 Notify on New Message (only if recipient not in chat)
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
    recipient_id UUID;
    sender_name TEXT;
    match_record RECORD;
    is_recipient_online BOOLEAN;
    recipient_current_match UUID;
BEGIN
    -- Get match info
    SELECT * INTO match_record FROM matches WHERE id = NEW.match_id;

    -- Determine recipient
    IF NEW.sender_id = match_record.user1_id THEN
        recipient_id := match_record.user2_id;
    ELSE
        recipient_id := match_record.user1_id;
    END IF;

    -- Check if recipient is currently in this chat
    SELECT
        is_online,
        current_match_id
    INTO is_recipient_online, recipient_current_match
    FROM user_presence
    WHERE user_id = recipient_id;

    -- Only notify if recipient is not currently viewing this chat
    IF NOT is_recipient_online OR recipient_current_match IS DISTINCT FROM NEW.match_id THEN
        SELECT name INTO sender_name FROM profiles WHERE id = NEW.sender_id;

        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
            recipient_id,
            'new_message',
            sender_name,
            CASE
                WHEN NEW.message_type = 'image' THEN '📷 Sent a photo'
                WHEN NEW.message_type = 'file' THEN '📎 Sent a file'
                WHEN NEW.message_type = 'audio' THEN '🎤 Sent a voice message'
                ELSE SUBSTRING(NEW.content FROM 1 FOR 100)
            END,
            jsonb_build_object(
                'match_id', NEW.match_id,
                'message_id', NEW.id,
                'sender_id', NEW.sender_id,
                'message_type', NEW.message_type
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;
CREATE TRIGGER trigger_notify_new_message
    AFTER INSERT ON messages
    FOR EACH ROW
    WHEN (NEW.message_type != 'system')
    EXECUTE FUNCTION notify_new_message();

-- 2.3 Notify on Super Like
CREATE OR REPLACE FUNCTION notify_super_like()
RETURNS TRIGGER AS $$
DECLARE
    swiper_name TEXT;
    swiper_photo TEXT;
BEGIN
    IF NEW.direction = 'super_like' THEN
        SELECT name, photos[1] INTO swiper_name, swiper_photo
        FROM profiles WHERE id = NEW.swiper_id;

        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
            NEW.swiped_id,
            'super_like',
            'Someone Super Liked You! ⭐',
            swiper_name || ' super liked your profile!',
            jsonb_build_object(
                'swiper_id', NEW.swiper_id,
                'swiper_name', swiper_name,
                'swiper_photo', swiper_photo
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_super_like ON swipes;
CREATE TRIGGER trigger_notify_super_like
    AFTER INSERT ON swipes
    FOR EACH ROW
    WHEN (NEW.direction = 'super_like')
    EXECUTE FUNCTION notify_super_like();

-- 2.4 Notify on Job Application
CREATE OR REPLACE FUNCTION notify_job_application()
RETURNS TRIGGER AS $$
DECLARE
    job_record RECORD;
    worker_name TEXT;
BEGIN
    -- Get job and business info
    SELECT jp.*, p.id as owner_id, p.name as owner_name
    INTO job_record
    FROM job_posts jp
    JOIN profiles p ON jp.business_id = p.id
    WHERE jp.id = NEW.job_id;

    -- Get worker name
    SELECT name INTO worker_name FROM profiles WHERE id = NEW.worker_id;

    -- Notify business owner
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        job_record.owner_id,
        'job_application',
        'New Application Received',
        worker_name || ' applied for "' || job_record.title || '"',
        jsonb_build_object(
            'application_id', NEW.id,
            'job_id', NEW.job_id,
            'job_title', job_record.title,
            'worker_id', NEW.worker_id,
            'worker_name', worker_name
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_job_application ON job_applications;
CREATE TRIGGER trigger_notify_job_application
    AFTER INSERT ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION notify_job_application();

-- 2.5 Notify on Application Status Change
CREATE OR REPLACE FUNCTION notify_application_status_change()
RETURNS TRIGGER AS $$
DECLARE
    job_title TEXT;
    company_name TEXT;
    status_message TEXT;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        SELECT jp.title, p.company_name
        INTO job_title, company_name
        FROM job_posts jp
        JOIN profiles p ON jp.business_id = p.id
        WHERE jp.id = NEW.job_id;

        status_message := CASE NEW.status
            WHEN 'viewed' THEN 'Your application was viewed'
            WHEN 'shortlisted' THEN 'Great news! You''ve been shortlisted'
            WHEN 'rejected' THEN 'Application update'
            WHEN 'hired' THEN 'Congratulations! You''re hired'
            ELSE 'Application status updated'
        END;

        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
            NEW.worker_id,
            'application_status',
            status_message,
            'Your application for "' || job_title || '" at ' || company_name ||
            ' status: ' || NEW.status,
            jsonb_build_object(
                'application_id', NEW.id,
                'job_id', NEW.job_id,
                'job_title', job_title,
                'company_name', company_name,
                'old_status', OLD.status,
                'new_status', NEW.status
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_application_status ON job_applications;
CREATE TRIGGER trigger_notify_application_status
    AFTER UPDATE ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION notify_application_status_change();

-- 2.6 Notify on Missed Call
CREATE OR REPLACE FUNCTION notify_missed_call()
RETURNS TRIGGER AS $$
DECLARE
    caller_name TEXT;
BEGIN
    IF NEW.status = 'missed' OR NEW.status = 'declined' THEN
        SELECT name INTO caller_name FROM profiles WHERE id = NEW.caller_id;

        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
            NEW.receiver_id,
            'call_missed',
            'Missed Call',
            'You missed a ' || NEW.call_type || ' call from ' || caller_name,
            jsonb_build_object(
                'call_id', NEW.id,
                'caller_id', NEW.caller_id,
                'caller_name', caller_name,
                'call_type', NEW.call_type,
                'match_id', NEW.match_id
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_missed_call ON call_logs;
CREATE TRIGGER trigger_notify_missed_call
    AFTER UPDATE ON call_logs
    FOR EACH ROW
    EXECUTE FUNCTION notify_missed_call();

-- ============================================================================
-- SECTION 3: JOB BOARD AUTOMATIONS
-- ============================================================================

-- 3.1 Auto-expire old job posts
CREATE OR REPLACE FUNCTION auto_expire_job_posts()
RETURNS void AS $$
BEGIN
    UPDATE job_posts
    SET status = 'expired'
    WHERE status = 'active'
    AND expires_at < NOW();

    -- Notify businesses about expiring jobs (3 days before)
    INSERT INTO notifications (user_id, type, title, body, data)
    SELECT
        business_id,
        'job_expiring',
        'Job Post Expiring Soon',
        'Your job post "' || title || '" will expire in 3 days.',
        jsonb_build_object(
            'job_id', id,
            'job_title', title,
            'expires_at', expires_at
        )
    FROM job_posts
    WHERE status = 'active'
    AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '3 days'
    AND id NOT IN (
        SELECT (data->>'job_id')::UUID
        FROM notifications
        WHERE type = 'job_expiring'
        AND created_at > NOW() - INTERVAL '3 days'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.2 Smart Job Recommendations Function
CREATE OR REPLACE FUNCTION get_job_recommendations(
    p_worker_id UUID,
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    job_id UUID,
    job_title TEXT,
    company_name TEXT,
    match_score NUMERIC,
    match_reasons TEXT[]
) AS $$
DECLARE
    worker_skills TEXT[];
    worker_location POINT;
    worker_expected_salary INT;
    worker_categories TEXT[];
BEGIN
    -- Get worker profile data
    SELECT
        skills,
        POINT(longitude, latitude),
        expected_salary_npr,
        ARRAY(
            SELECT DISTINCT job_category
            FROM work_identities
            WHERE user_id = p_worker_id AND visibility_status = 'active'
        )
    INTO worker_skills, worker_location, worker_expected_salary, worker_categories
    FROM profiles
    WHERE id = p_worker_id;

    RETURN QUERY
    WITH scored_jobs AS (
        SELECT
            jp.id,
            jp.title,
            p.company_name,
            -- Calculate match score
            (
                -- Skill match (40%)
                COALESCE(
                    (SELECT COUNT(*)::NUMERIC / GREATEST(array_length(jp.skills_required, 1), 1) * 40
                     FROM unnest(worker_skills) ws
                     WHERE ws = ANY(jp.skills_required)),
                    0
                ) +
                -- Salary match (30%)
                CASE
                    WHEN worker_expected_salary IS NULL THEN 15
                    WHEN worker_expected_salary BETWEEN jp.salary_min AND jp.salary_max THEN 30
                    WHEN worker_expected_salary < jp.salary_min THEN 25
                    ELSE 10
                END +
                -- Location proximity (20%)
                CASE
                    WHEN jp.is_remote THEN 20
                    WHEN worker_location IS NULL THEN 10
                    WHEN jp.latitude IS NOT NULL AND jp.longitude IS NOT NULL THEN
                        GREATEST(0, 20 - (worker_location <-> POINT(jp.longitude, jp.latitude)) / 5)
                    ELSE 10
                END +
                -- Category match (10%)
                CASE
                    WHEN jp.category = ANY(worker_categories) THEN 10
                    ELSE 0
                END
            ) as score,
            -- Build match reasons
            ARRAY_REMOVE(ARRAY[
                CASE WHEN (
                    SELECT COUNT(*) > 0
                    FROM unnest(worker_skills) ws
                    WHERE ws = ANY(jp.skills_required)
                ) THEN 'Skills match' END,
                CASE WHEN jp.is_remote THEN 'Remote work available' END,
                CASE WHEN worker_expected_salary BETWEEN jp.salary_min AND jp.salary_max
                    THEN 'Salary in your range' END,
                CASE WHEN jp.category = ANY(worker_categories)
                    THEN 'Matches your work identity' END
            ], NULL) as reasons
        FROM job_posts jp
        JOIN profiles p ON jp.business_id = p.id
        WHERE jp.status = 'active'
        AND jp.id NOT IN (
            SELECT job_id FROM job_applications WHERE worker_id = p_worker_id
        )
        AND jp.business_id NOT IN (
            SELECT blocked_id FROM blocks WHERE blocker_id = p_worker_id
            UNION
            SELECT blocker_id FROM blocks WHERE blocked_id = p_worker_id
        )
    )
    SELECT
        id,
        title,
        company_name,
        ROUND(score, 1),
        reasons
    FROM scored_jobs
    WHERE score > 20
    ORDER BY score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.3 Auto-fill job when hired
CREATE OR REPLACE FUNCTION auto_fill_job_on_hire()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'hired' AND OLD.status != 'hired' THEN
        -- Update job status
        UPDATE job_posts
        SET status = 'filled'
        WHERE id = NEW.job_id;

        -- Reject other pending applications
        UPDATE job_applications
        SET status = 'rejected',
            notes = COALESCE(notes, '') || ' [Auto-rejected: Position filled]'
        WHERE job_id = NEW.job_id
        AND id != NEW.id
        AND status IN ('pending', 'viewed', 'shortlisted');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_fill_job ON job_applications;
CREATE TRIGGER trigger_auto_fill_job
    AFTER UPDATE ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION auto_fill_job_on_hire();

-- ============================================================================
-- SECTION 4: SMART MATCHING AUTOMATIONS
-- ============================================================================

-- 4.1 Calculate Match Score Between Worker and Business
CREATE OR REPLACE FUNCTION calculate_match_score(
    p_worker_id UUID,
    p_business_id UUID
)
RETURNS TABLE (
    total_score INT,
    skill_score INT,
    experience_score INT,
    location_score INT,
    activity_score INT,
    compatibility_factors JSONB
) AS $$
DECLARE
    worker_profile RECORD;
    business_profile RECORD;
    v_skill_score INT := 0;
    v_experience_score INT := 0;
    v_location_score INT := 0;
    v_activity_score INT := 0;
    v_factors JSONB := '{}';
BEGIN
    -- Get profiles
    SELECT * INTO worker_profile FROM profiles WHERE id = p_worker_id;
    SELECT * INTO business_profile FROM profiles WHERE id = p_business_id;

    -- Skill matching (check if worker's skills match business industry)
    -- This would need more sophisticated matching in production
    v_skill_score := CASE
        WHEN array_length(worker_profile.skills, 1) > 5 THEN 30
        WHEN array_length(worker_profile.skills, 1) > 2 THEN 20
        ELSE 10
    END;

    -- Experience score
    v_experience_score := LEAST(25, COALESCE(worker_profile.experience_years, 0) * 5);

    -- Location proximity
    IF worker_profile.latitude IS NOT NULL AND business_profile.latitude IS NOT NULL THEN
        v_location_score := GREATEST(0, 25 - (
            POINT(worker_profile.longitude, worker_profile.latitude) <->
            POINT(business_profile.longitude, business_profile.latitude)
        )::INT);
    ELSE
        v_location_score := 15; -- Default if location unknown
    END IF;

    -- Activity score (recent activity)
    v_activity_score := CASE
        WHEN worker_profile.last_active > NOW() - INTERVAL '1 day' THEN 20
        WHEN worker_profile.last_active > NOW() - INTERVAL '7 days' THEN 15
        WHEN worker_profile.last_active > NOW() - INTERVAL '30 days' THEN 10
        ELSE 5
    END;

    -- Build factors
    v_factors := jsonb_build_object(
        'skills_count', array_length(worker_profile.skills, 1),
        'experience_years', worker_profile.experience_years,
        'is_verified', worker_profile.verified,
        'recently_active', worker_profile.last_active > NOW() - INTERVAL '7 days'
    );

    RETURN QUERY SELECT
        v_skill_score + v_experience_score + v_location_score + v_activity_score,
        v_skill_score,
        v_experience_score,
        v_location_score,
        v_activity_score,
        v_factors;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.2 Get Recommended Profiles for Swiping
CREATE OR REPLACE FUNCTION get_swipe_recommendations(
    p_user_id UUID,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    profile_id UUID,
    name TEXT,
    job_title TEXT,
    photos TEXT[],
    match_score INT,
    distance_km NUMERIC
) AS $$
DECLARE
    user_role TEXT;
    user_location POINT;
BEGIN
    SELECT role, POINT(longitude, latitude)
    INTO user_role, user_location
    FROM profiles WHERE id = p_user_id;

    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.job_title,
        p.photos,
        (calculate_match_score(
            CASE WHEN user_role = 'business' THEN p.id ELSE p_user_id END,
            CASE WHEN user_role = 'business' THEN p_user_id ELSE p.id END
        )).total_score,
        CASE
            WHEN user_location IS NOT NULL AND p.latitude IS NOT NULL THEN
                ROUND((user_location <-> POINT(p.longitude, p.latitude))::NUMERIC * 111, 1)
            ELSE NULL
        END
    FROM profiles p
    WHERE p.id != p_user_id
    AND p.is_active = TRUE
    AND p.role != user_role
    -- Exclude already swiped
    AND p.id NOT IN (
        SELECT swiped_id FROM swipes WHERE swiper_id = p_user_id
    )
    -- Exclude blocked users
    AND p.id NOT IN (
        SELECT blocked_id FROM blocks WHERE blocker_id = p_user_id
        UNION
        SELECT blocker_id FROM blocks WHERE blocked_id = p_user_id
    )
    ORDER BY
        -- Prioritize premium users
        p.is_premium DESC,
        -- Then by match score
        (calculate_match_score(
            CASE WHEN user_role = 'business' THEN p.id ELSE p_user_id END,
            CASE WHEN user_role = 'business' THEN p_user_id ELSE p.id END
        )).total_score DESC,
        -- Then by recent activity
        p.last_active DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECTION 5: MESSAGING AUTOMATIONS
-- ============================================================================

-- 5.1 Auto-mark messages as read when user views chat
CREATE OR REPLACE FUNCTION mark_messages_read(
    p_match_id UUID,
    p_user_id UUID
)
RETURNS INT AS $$
DECLARE
    updated_count INT;
BEGIN
    UPDATE messages
    SET
        is_read = TRUE,
        read_at = NOW(),
        delivery_status = 'read'
    WHERE match_id = p_match_id
    AND sender_id != p_user_id
    AND is_read = FALSE;

    GET DIAGNOSTICS updated_count = ROW_COUNT;

    -- Clear notifications for this chat
    UPDATE notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE user_id = p_user_id
    AND type = 'new_message'
    AND (data->>'match_id')::UUID = p_match_id
    AND is_read = FALSE;

    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2 Clean up old typing indicators
CREATE OR REPLACE FUNCTION cleanup_typing_indicators()
RETURNS void AS $$
BEGIN
    DELETE FROM typing_indicators
    WHERE updated_at < NOW() - INTERVAL '30 seconds';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.3 Auto-update delivery status
CREATE OR REPLACE FUNCTION update_message_delivery_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Set to 'sent' immediately after insert
    IF TG_OP = 'INSERT' THEN
        NEW.delivery_status := 'sent';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_message_delivery_status ON messages;
CREATE TRIGGER trigger_message_delivery_status
    BEFORE INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_message_delivery_status();

-- ============================================================================
-- SECTION 6: GAMIFICATION AUTOMATIONS
-- ============================================================================

-- 6.1 Update user streaks on activity
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS TABLE (
    current_streak INT,
    longest_streak INT,
    is_new_milestone BOOLEAN,
    milestone_reached INT
) AS $$
DECLARE
    streak_record RECORD;
    today DATE := CURRENT_DATE;
    v_is_new_milestone BOOLEAN := FALSE;
    v_milestone INT := 0;
BEGIN
    -- Get or create streak record
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date)
    VALUES (p_user_id, 0, 0, NULL)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO streak_record FROM user_streaks WHERE user_id = p_user_id;

    -- Update streak logic
    IF streak_record.last_activity_date IS NULL OR
       streak_record.last_activity_date < today - 1 THEN
        -- Reset streak (missed a day or first activity)
        UPDATE user_streaks
        SET current_streak = 1,
            last_activity_date = today
        WHERE user_id = p_user_id;

        streak_record.current_streak := 1;

    ELSIF streak_record.last_activity_date = today - 1 THEN
        -- Continue streak
        UPDATE user_streaks
        SET current_streak = current_streak + 1,
            longest_streak = GREATEST(longest_streak, current_streak + 1),
            last_activity_date = today
        WHERE user_id = p_user_id;

        streak_record.current_streak := streak_record.current_streak + 1;

        -- Check for milestones
        IF streak_record.current_streak IN (7, 30, 100, 365) THEN
            v_is_new_milestone := TRUE;
            v_milestone := streak_record.current_streak;

            -- Award badge
            PERFORM award_streak_badge(p_user_id, streak_record.current_streak);
        END IF;
    END IF;
    -- If same day, do nothing

    RETURN QUERY SELECT
        streak_record.current_streak,
        GREATEST(streak_record.longest_streak, streak_record.current_streak),
        v_is_new_milestone,
        v_milestone;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6.2 Award badges automatically
CREATE OR REPLACE FUNCTION award_streak_badge(
    p_user_id UUID,
    p_streak_days INT
)
RETURNS void AS $$
DECLARE
    badge_to_award TEXT;
    badge_id_to_award UUID;
BEGIN
    badge_to_award := CASE p_streak_days
        WHEN 7 THEN 'week_warrior'
        WHEN 30 THEN 'monthly_master'
        WHEN 100 THEN 'century_champion'
        WHEN 365 THEN 'yearly_legend'
        ELSE NULL
    END;

    IF badge_to_award IS NOT NULL THEN
        -- Get or create badge
        INSERT INTO badges (name, description, icon, category)
        VALUES (
            badge_to_award,
            p_streak_days || ' day streak achieved!',
            CASE badge_to_award
                WHEN 'week_warrior' THEN '🔥'
                WHEN 'monthly_master' THEN '⭐'
                WHEN 'century_champion' THEN '💎'
                WHEN 'yearly_legend' THEN '👑'
            END,
            'streak'
        )
        ON CONFLICT (name) DO NOTHING;

        SELECT id INTO badge_id_to_award FROM badges WHERE name = badge_to_award;

        -- Award to user
        INSERT INTO user_badges (user_id, badge_id)
        VALUES (p_user_id, badge_id_to_award)
        ON CONFLICT (user_id, badge_id) DO NOTHING;

        -- Notify user
        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
            p_user_id,
            'badge_earned',
            'New Badge Earned! 🎉',
            'You earned the ' || REPLACE(badge_to_award, '_', ' ') || ' badge!',
            jsonb_build_object(
                'badge_name', badge_to_award,
                'streak_days', p_streak_days
            )
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6.3 Auto-award activity badges
CREATE OR REPLACE FUNCTION check_and_award_activity_badges(p_user_id UUID)
RETURNS void AS $$
DECLARE
    match_count INT;
    message_count INT;
    application_count INT;
BEGIN
    -- Count user activities
    SELECT COUNT(*) INTO match_count
    FROM matches WHERE user1_id = p_user_id OR user2_id = p_user_id;

    SELECT COUNT(*) INTO message_count
    FROM messages WHERE sender_id = p_user_id;

    SELECT COUNT(*) INTO application_count
    FROM job_applications WHERE worker_id = p_user_id;

    -- First match badge
    IF match_count = 1 THEN
        PERFORM award_badge_if_not_exists(p_user_id, 'first_match', 'First Match!', '🤝', 'achievement');
    END IF;

    -- 10 matches badge
    IF match_count = 10 THEN
        PERFORM award_badge_if_not_exists(p_user_id, 'popular', 'Popular (10 matches)', '🌟', 'achievement');
    END IF;

    -- 100 messages badge
    IF message_count >= 100 THEN
        PERFORM award_badge_if_not_exists(p_user_id, 'chatterbox', 'Chatterbox (100 messages)', '💬', 'achievement');
    END IF;

    -- 10 applications badge
    IF application_count >= 10 THEN
        PERFORM award_badge_if_not_exists(p_user_id, 'job_hunter', 'Job Hunter (10 applications)', '🎯', 'achievement');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION award_badge_if_not_exists(
    p_user_id UUID,
    p_badge_name TEXT,
    p_description TEXT,
    p_icon TEXT,
    p_category TEXT
)
RETURNS void AS $$
DECLARE
    v_badge_id UUID;
BEGIN
    -- Ensure badge exists
    INSERT INTO badges (name, description, icon, category)
    VALUES (p_badge_name, p_description, p_icon, p_category)
    ON CONFLICT (name) DO NOTHING;

    SELECT id INTO v_badge_id FROM badges WHERE name = p_badge_name;

    -- Award if not already awarded
    INSERT INTO user_badges (user_id, badge_id)
    VALUES (p_user_id, v_badge_id)
    ON CONFLICT (user_id, badge_id) DO NOTHING;

    -- Check if actually inserted
    IF FOUND THEN
        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
            p_user_id,
            'badge_earned',
            'Badge Earned! ' || p_icon,
            'You earned: ' || p_description,
            jsonb_build_object('badge_name', p_badge_name, 'badge_icon', p_icon)
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECTION 7: SUBSCRIPTION & PAYMENT AUTOMATIONS
-- ============================================================================

-- 7.1 Auto-expire subscriptions
CREATE OR REPLACE FUNCTION auto_expire_subscriptions()
RETURNS void AS $$
BEGIN
    -- Update expired subscriptions
    UPDATE user_subscriptions
    SET status = 'expired'
    WHERE status = 'active'
    AND expires_at < NOW();

    -- Update premium status in profiles
    UPDATE profiles
    SET is_premium = FALSE,
        premium_tier = 'free'
    WHERE id IN (
        SELECT user_id FROM user_subscriptions
        WHERE status = 'expired'
        AND user_id NOT IN (
            SELECT user_id FROM user_subscriptions WHERE status = 'active'
        )
    );

    -- Notify users about expiring subscriptions (3 days before)
    INSERT INTO notifications (user_id, type, title, body, data)
    SELECT
        user_id,
        'subscription_expiring',
        'Subscription Expiring Soon',
        'Your ' || plan_type || ' subscription expires in 3 days. Renew to keep your benefits!',
        jsonb_build_object(
            'plan_type', plan_type,
            'expires_at', expires_at
        )
    FROM user_subscriptions
    WHERE status = 'active'
    AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '3 days'
    AND user_id NOT IN (
        SELECT (data->>'user_id')::UUID
        FROM notifications
        WHERE type = 'subscription_expiring'
        AND created_at > NOW() - INTERVAL '3 days'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.2 Process successful payment
CREATE OR REPLACE FUNCTION process_payment_success(
    p_transaction_id TEXT,
    p_plan_type TEXT,
    p_duration_days INT DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_subscription_id UUID;
BEGIN
    -- Get user from transaction
    SELECT user_id INTO v_user_id
    FROM payment_transactions
    WHERE id = p_transaction_id;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
    END IF;

    -- Update transaction status
    UPDATE payment_transactions
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = p_transaction_id;

    -- Create or extend subscription
    INSERT INTO user_subscriptions (user_id, plan_type, status, started_at, expires_at, payment_transaction_id)
    VALUES (
        v_user_id,
        p_plan_type,
        'active',
        NOW(),
        NOW() + (p_duration_days || ' days')::INTERVAL,
        p_transaction_id
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
        plan_type = p_plan_type,
        status = 'active',
        expires_at = GREATEST(
            user_subscriptions.expires_at,
            NOW()
        ) + (p_duration_days || ' days')::INTERVAL,
        payment_transaction_id = p_transaction_id
    RETURNING id INTO v_subscription_id;

    -- Update profile premium status
    UPDATE profiles
    SET is_premium = TRUE,
        premium_tier = p_plan_type,
        premium_expires_at = NOW() + (p_duration_days || ' days')::INTERVAL
    WHERE id = v_user_id;

    -- Notify user
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        v_user_id,
        'payment_success',
        'Payment Successful! 🎉',
        'Your ' || p_plan_type || ' subscription is now active.',
        jsonb_build_object(
            'plan_type', p_plan_type,
            'subscription_id', v_subscription_id,
            'duration_days', p_duration_days
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'subscription_id', v_subscription_id,
        'expires_at', NOW() + (p_duration_days || ' days')::INTERVAL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECTION 8: PROFILE & ACTIVITY AUTOMATIONS
-- ============================================================================

-- 8.1 Track profile views
CREATE TABLE IF NOT EXISTS profile_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    viewed_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_daily_view UNIQUE (viewer_id, viewed_id, (viewed_at::DATE))
);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewed ON profile_views(viewed_id, viewed_at DESC);

ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert views" ON profile_views;
CREATE POLICY "Users can insert views" ON profile_views
    FOR INSERT WITH CHECK (auth.uid() = viewer_id);

DROP POLICY IF EXISTS "Users can see who viewed them" ON profile_views;
CREATE POLICY "Users can see who viewed them" ON profile_views
    FOR SELECT USING (auth.uid() = viewed_id OR auth.uid() = viewer_id);

-- 8.2 Notify on profile view (for premium users)
CREATE OR REPLACE FUNCTION notify_profile_view()
RETURNS TRIGGER AS $$
DECLARE
    viewer_name TEXT;
    is_viewed_premium BOOLEAN;
BEGIN
    -- Check if viewed user is premium
    SELECT is_premium INTO is_viewed_premium FROM profiles WHERE id = NEW.viewed_id;

    IF is_viewed_premium THEN
        SELECT name INTO viewer_name FROM profiles WHERE id = NEW.viewer_id;

        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
            NEW.viewed_id,
            'profile_view',
            'Someone viewed your profile',
            viewer_name || ' viewed your profile',
            jsonb_build_object(
                'viewer_id', NEW.viewer_id,
                'viewer_name', viewer_name
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_profile_view ON profile_views;
CREATE TRIGGER trigger_notify_profile_view
    AFTER INSERT ON profile_views
    FOR EACH ROW
    EXECUTE FUNCTION notify_profile_view();

-- 8.3 Update last_active on any activity
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET last_active = NOW()
    WHERE id = auth.uid();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to key tables
DROP TRIGGER IF EXISTS trigger_update_active_swipes ON swipes;
CREATE TRIGGER trigger_update_active_swipes
    AFTER INSERT ON swipes
    FOR EACH ROW
    EXECUTE FUNCTION update_last_active();

DROP TRIGGER IF EXISTS trigger_update_active_messages ON messages;
CREATE TRIGGER trigger_update_active_messages
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_last_active();

-- ============================================================================
-- SECTION 9: CONTACT REQUEST AUTOMATIONS
-- ============================================================================

-- 9.1 Notify on contact request
CREATE OR REPLACE FUNCTION notify_contact_request()
RETURNS TRIGGER AS $$
DECLARE
    requester_name TEXT;
    identity_title TEXT;
BEGIN
    SELECT company_name INTO requester_name FROM profiles WHERE id = NEW.requester_id;
    SELECT job_title INTO identity_title FROM work_identities WHERE id = NEW.identity_id;

    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        (SELECT user_id FROM work_identities WHERE id = NEW.identity_id),
        'contact_request',
        'New Contact Request',
        requester_name || ' wants to contact you about your ' || identity_title || ' profile',
        jsonb_build_object(
            'request_id', NEW.id,
            'requester_id', NEW.requester_id,
            'requester_name', requester_name,
            'identity_id', NEW.identity_id,
            'message', NEW.message
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_contact_request ON identity_contact_requests;
CREATE TRIGGER trigger_notify_contact_request
    AFTER INSERT ON identity_contact_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_contact_request();

-- 9.2 Auto-expire contact requests
CREATE OR REPLACE FUNCTION auto_expire_contact_requests()
RETURNS void AS $$
BEGIN
    UPDATE identity_contact_requests
    SET status = 'expired'
    WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECTION 10: SCHEDULED JOBS (Run via pg_cron or external scheduler)
-- ============================================================================

-- These functions should be called periodically:
-- 1. SELECT auto_expire_job_posts(); -- Run hourly
-- 2. SELECT auto_expire_subscriptions(); -- Run hourly
-- 3. SELECT auto_expire_contact_requests(); -- Run hourly
-- 4. SELECT cleanup_typing_indicators(); -- Run every minute
-- 5. DELETE FROM notifications WHERE expires_at < NOW(); -- Run daily

-- Create a helper function to run all cleanup tasks
CREATE OR REPLACE FUNCTION run_scheduled_cleanup()
RETURNS TABLE (
    task_name TEXT,
    status TEXT
) AS $$
BEGIN
    -- Expire jobs
    PERFORM auto_expire_job_posts();
    RETURN QUERY SELECT 'expire_jobs'::TEXT, 'completed'::TEXT;

    -- Expire subscriptions
    PERFORM auto_expire_subscriptions();
    RETURN QUERY SELECT 'expire_subscriptions'::TEXT, 'completed'::TEXT;

    -- Expire contact requests
    PERFORM auto_expire_contact_requests();
    RETURN QUERY SELECT 'expire_contact_requests'::TEXT, 'completed'::TEXT;

    -- Clean typing indicators
    PERFORM cleanup_typing_indicators();
    RETURN QUERY SELECT 'cleanup_typing'::TEXT, 'completed'::TEXT;

    -- Clean old notifications
    DELETE FROM notifications WHERE expires_at < NOW();
    RETURN QUERY SELECT 'cleanup_notifications'::TEXT, 'completed'::TEXT;

    -- Clean old profile views (keep 30 days)
    DELETE FROM profile_views WHERE viewed_at < NOW() - INTERVAL '30 days';
    RETURN QUERY SELECT 'cleanup_profile_views'::TEXT, 'completed'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECTION 11: REALTIME SUBSCRIPTIONS HELPER
-- ============================================================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE active_calls;

-- ============================================================================
-- SECTION 12: ANALYTICS HELPERS
-- ============================================================================

-- 12.1 Get user activity summary
CREATE OR REPLACE FUNCTION get_user_activity_summary(p_user_id UUID)
RETURNS TABLE (
    total_matches INT,
    total_messages_sent INT,
    total_applications INT,
    profile_views_received INT,
    current_streak INT,
    badges_earned INT,
    member_since DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INT FROM matches WHERE user1_id = p_user_id OR user2_id = p_user_id),
        (SELECT COUNT(*)::INT FROM messages WHERE sender_id = p_user_id),
        (SELECT COUNT(*)::INT FROM job_applications WHERE worker_id = p_user_id),
        (SELECT COUNT(*)::INT FROM profile_views WHERE viewed_id = p_user_id AND viewed_at > NOW() - INTERVAL '30 days'),
        (SELECT COALESCE(us.current_streak, 0) FROM user_streaks us WHERE us.user_id = p_user_id),
        (SELECT COUNT(*)::INT FROM user_badges WHERE user_badges.user_id = p_user_id),
        (SELECT created_at::DATE FROM profiles WHERE id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12.2 Get business dashboard stats
CREATE OR REPLACE FUNCTION get_business_dashboard_stats(p_business_id UUID)
RETURNS TABLE (
    active_jobs INT,
    total_applications INT,
    pending_applications INT,
    hired_count INT,
    profile_views_30d INT,
    response_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INT FROM job_posts WHERE business_id = p_business_id AND status = 'active'),
        (SELECT COUNT(*)::INT FROM job_applications ja
         JOIN job_posts jp ON ja.job_id = jp.id
         WHERE jp.business_id = p_business_id),
        (SELECT COUNT(*)::INT FROM job_applications ja
         JOIN job_posts jp ON ja.job_id = jp.id
         WHERE jp.business_id = p_business_id AND ja.status = 'pending'),
        (SELECT COUNT(*)::INT FROM job_applications ja
         JOIN job_posts jp ON ja.job_id = jp.id
         WHERE jp.business_id = p_business_id AND ja.status = 'hired'),
        (SELECT COUNT(*)::INT FROM profile_views WHERE viewed_id = p_business_id AND viewed_at > NOW() - INTERVAL '30 days'),
        (SELECT ROUND(
            (SELECT COUNT(*)::NUMERIC FROM job_applications ja
             JOIN job_posts jp ON ja.job_id = jp.id
             WHERE jp.business_id = p_business_id AND ja.status != 'pending') /
            NULLIF((SELECT COUNT(*)::NUMERIC FROM job_applications ja
             JOIN job_posts jp ON ja.job_id = jp.id
             WHERE jp.business_id = p_business_id), 0) * 100,
            1
        ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_job_recommendations(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_swipe_recommendations(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_match_score(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_streak(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_dashboard_stats(UUID) TO authenticated;

-- Service role only functions
GRANT EXECUTE ON FUNCTION run_scheduled_cleanup() TO service_role;
GRANT EXECUTE ON FUNCTION process_payment_success(TEXT, TEXT, INT) TO service_role;

-- ============================================================================
-- SUMMARY OF AUTOMATIONS
-- ============================================================================
/*
TRIGGERS CREATED:
1. trigger_notify_new_match - Notifies both users on new match
2. trigger_notify_new_message - Notifies recipient of new messages
3. trigger_notify_super_like - Notifies user of super likes
4. trigger_notify_job_application - Notifies business of new applications
5. trigger_notify_application_status - Notifies worker of status changes
6. trigger_notify_missed_call - Notifies user of missed calls
7. trigger_auto_fill_job - Auto-fills job when someone is hired
8. trigger_message_delivery_status - Sets delivery status on insert
9. trigger_notify_profile_view - Notifies premium users of profile views
10. trigger_update_active_swipes - Updates last_active on swipe
11. trigger_update_active_messages - Updates last_active on message
12. trigger_notify_contact_request - Notifies workers of contact requests

FUNCTIONS CREATED:
- get_job_recommendations() - Smart job recommendations for workers
- get_swipe_recommendations() - Smart profile recommendations
- calculate_match_score() - Match compatibility scoring
- mark_messages_read() - Batch mark messages as read
- update_user_streak() - Track and update user streaks
- award_streak_badge() - Auto-award streak badges
- check_and_award_activity_badges() - Auto-award activity badges
- process_payment_success() - Handle successful payments
- get_user_activity_summary() - User analytics
- get_business_dashboard_stats() - Business analytics
- run_scheduled_cleanup() - Maintenance tasks

SCHEDULED TASKS (call periodically):
- auto_expire_job_posts() - Hourly
- auto_expire_subscriptions() - Hourly
- auto_expire_contact_requests() - Hourly
- cleanup_typing_indicators() - Every minute
- run_scheduled_cleanup() - Runs all cleanup tasks

REALTIME ENABLED:
- notifications, messages, typing_indicators, user_presence, matches, active_calls
*/
