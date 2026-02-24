-- ============================================
-- KAAM DEU - SR DECISION ENGINE
-- ============================================
-- This migration adds the "Decision Card" system for businesses
-- Core Features:
--   1. Enhanced scoring RPC with explanation generation
--   2. Business premium flag for feature gating
--   3. Compare identities RPC for side-by-side comparison
-- ============================================
-- RUN AFTER: WORK_IDENTITY_SYSTEM.sql
-- ============================================

-- ============================================
-- PART 1: ADD PREMIUM FLAG TO PROFILES
-- ============================================

-- Add business premium flag (additive, does not modify existing columns)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS premium_tier TEXT DEFAULT 'free' CHECK (premium_tier IN ('free', 'pro', 'business'));

-- Index for premium lookups
CREATE INDEX IF NOT EXISTS idx_profiles_premium ON profiles(is_premium) WHERE is_premium = TRUE;

COMMENT ON COLUMN profiles.is_premium IS 'Business premium status for advanced features (compare, saved searches, advanced filters)';
COMMENT ON COLUMN profiles.premium_tier IS 'Premium tier level: free, pro, business';

-- ============================================
-- PART 2: DECISION CARD RPC WITH EXPLANATION
-- ============================================

-- Type for decision card result
DROP TYPE IF EXISTS decision_card_result CASCADE;
CREATE TYPE decision_card_result AS (
    identity_id UUID,
    user_id UUID,
    job_category TEXT,
    job_title TEXT,
    capability_score INTEGER,
    experience_level TEXT,
    experience_years INTEGER,
    expected_pay_min INTEGER,
    expected_pay_max INTEGER,
    pay_type TEXT,
    availability TEXT,
    preferred_locations TEXT[],
    is_remote_ok BOOLEAN,
    skill_count INTEGER,
    verified_skill_count INTEGER,
    matching_skill_count INTEGER,
    pay_fit_score INTEGER,
    availability_score INTEGER,
    overall_fit_score INTEGER,
    explanation TEXT,
    explanation_points TEXT[]
);

-- Enhanced search with Decision Card explanations
CREATE OR REPLACE FUNCTION get_decision_cards(
    p_categories TEXT[] DEFAULT NULL,
    p_min_capability INTEGER DEFAULT NULL,
    p_experience_levels TEXT[] DEFAULT NULL,
    p_budget_max INTEGER DEFAULT NULL,
    p_availability_types TEXT[] DEFAULT NULL,
    p_required_skills TEXT[] DEFAULT NULL,
    p_locations TEXT[] DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS SETOF decision_card_result AS $$
DECLARE
    v_record RECORD;
    v_result decision_card_result;
    v_skill_count INTEGER;
    v_verified_skill_count INTEGER;
    v_matching_skill_count INTEGER;
    v_pay_fit INTEGER;
    v_availability_fit INTEGER;
    v_overall_fit INTEGER;
    v_explanation TEXT;
    v_explanation_points TEXT[];
BEGIN
    FOR v_record IN
        SELECT
            wi.id,
            wi.user_id,
            wi.job_category,
            wi.job_title,
            wi.capability_score,
            wi.experience_level,
            wi.experience_years,
            wi.expected_pay_min,
            wi.expected_pay_max,
            wi.pay_type,
            wi.availability,
            wi.preferred_locations,
            wi.is_remote_ok
        FROM work_identities wi
        WHERE wi.visibility_status = 'active'
        AND (p_categories IS NULL OR wi.job_category = ANY(p_categories))
        AND (p_min_capability IS NULL OR wi.capability_score >= p_min_capability)
        AND (p_experience_levels IS NULL OR wi.experience_level = ANY(p_experience_levels))
        AND (p_budget_max IS NULL OR wi.expected_pay_min IS NULL OR wi.expected_pay_min <= p_budget_max)
        AND (p_availability_types IS NULL OR wi.availability = ANY(p_availability_types))
        AND (p_locations IS NULL OR wi.preferred_locations && p_locations OR wi.is_remote_ok = TRUE)
        ORDER BY wi.capability_score DESC, wi.updated_at DESC
        LIMIT p_limit
        OFFSET p_offset
    LOOP
        -- Count skills
        SELECT
            COUNT(*),
            COUNT(*) FILTER (WHERE is_verified = TRUE)
        INTO v_skill_count, v_verified_skill_count
        FROM identity_skills
        WHERE identity_id = v_record.id;

        -- Count matching skills
        IF p_required_skills IS NOT NULL THEN
            SELECT COUNT(*)
            INTO v_matching_skill_count
            FROM identity_skills
            WHERE identity_id = v_record.id
            AND skill = ANY(p_required_skills);
        ELSE
            v_matching_skill_count := 0;
        END IF;

        -- Calculate pay fit (0-100)
        IF p_budget_max IS NULL OR v_record.expected_pay_min IS NULL THEN
            v_pay_fit := 75; -- Neutral if no budget specified
        ELSIF v_record.expected_pay_max IS NOT NULL AND v_record.expected_pay_max <= p_budget_max THEN
            v_pay_fit := 100; -- Perfect fit
        ELSIF v_record.expected_pay_min <= p_budget_max THEN
            -- Partial fit - calculate how close
            v_pay_fit := 100 - ((v_record.expected_pay_min - p_budget_max * 0.8) * 100 / (p_budget_max * 0.2))::INTEGER;
            v_pay_fit := GREATEST(v_pay_fit, 50);
        ELSE
            v_pay_fit := 30; -- Above budget
        END IF;

        -- Calculate availability fit (0-100)
        IF p_availability_types IS NULL THEN
            v_availability_fit := 100;
        ELSIF v_record.availability = ANY(p_availability_types) THEN
            v_availability_fit := 100;
        ELSIF v_record.availability = 'flexible' THEN
            v_availability_fit := 90; -- Flexible is usually good
        ELSE
            v_availability_fit := 50;
        END IF;

        -- Calculate overall fit score
        v_overall_fit := (
            v_record.capability_score * 0.4 +
            v_pay_fit * 0.25 +
            v_availability_fit * 0.20 +
            LEAST(v_skill_count * 5, 15) -- Up to 15 points for skills
        )::INTEGER;

        -- Add matching skills bonus
        IF p_required_skills IS NOT NULL AND array_length(p_required_skills, 1) > 0 THEN
            v_overall_fit := v_overall_fit + (v_matching_skill_count * 100 / array_length(p_required_skills, 1) * 0.15)::INTEGER;
        END IF;

        v_overall_fit := LEAST(v_overall_fit, 100);

        -- Generate explanation points
        v_explanation_points := ARRAY[]::TEXT[];

        -- Capability explanation
        IF v_record.capability_score >= 80 THEN
            v_explanation_points := v_explanation_points || 'Top performer with excellent capability score';
        ELSIF v_record.capability_score >= 60 THEN
            v_explanation_points := v_explanation_points || 'Strong capability score';
        END IF;

        -- Skills explanation
        IF v_skill_count > 0 THEN
            IF v_verified_skill_count > 0 THEN
                v_explanation_points := v_explanation_points || format('%s verified skills out of %s total', v_verified_skill_count, v_skill_count);
            ELSE
                v_explanation_points := v_explanation_points || format('%s skills listed', v_skill_count);
            END IF;
        END IF;

        -- Matching skills explanation
        IF v_matching_skill_count > 0 AND p_required_skills IS NOT NULL THEN
            v_explanation_points := v_explanation_points || format('Matches %s of your required skills', v_matching_skill_count);
        END IF;

        -- Pay explanation
        IF v_pay_fit >= 90 THEN
            v_explanation_points := v_explanation_points || 'Salary expectations within budget';
        ELSIF v_pay_fit >= 70 THEN
            v_explanation_points := v_explanation_points || 'Salary expectations near budget';
        END IF;

        -- Availability explanation
        IF v_availability_fit = 100 THEN
            v_explanation_points := v_explanation_points || format('Available %s as required',
                CASE v_record.availability
                    WHEN 'full_time' THEN 'full-time'
                    WHEN 'part_time' THEN 'part-time'
                    WHEN 'contract' THEN 'for contract work'
                    WHEN 'daily_wage' THEN 'for daily wage work'
                    ELSE 'with flexible schedule'
                END
            );
        END IF;

        -- Experience explanation
        IF v_record.experience_years >= 5 THEN
            v_explanation_points := v_explanation_points || format('%s+ years of experience', v_record.experience_years);
        ELSIF v_record.experience_years >= 2 THEN
            v_explanation_points := v_explanation_points || format('%s years of experience', v_record.experience_years);
        END IF;

        -- Location explanation
        IF v_record.is_remote_ok THEN
            v_explanation_points := v_explanation_points || 'Open to remote work';
        END IF;

        -- Build main explanation
        IF array_length(v_explanation_points, 1) >= 3 THEN
            v_explanation := 'Strong match: ' || array_to_string(v_explanation_points[1:3], ', ');
        ELSIF array_length(v_explanation_points, 1) >= 1 THEN
            v_explanation := 'Match: ' || array_to_string(v_explanation_points, ', ');
        ELSE
            v_explanation := 'Potential match based on category';
        END IF;

        -- Build result
        v_result := (
            v_record.id,
            v_record.user_id,
            v_record.job_category,
            v_record.job_title,
            v_record.capability_score,
            v_record.experience_level,
            v_record.experience_years,
            v_record.expected_pay_min,
            v_record.expected_pay_max,
            v_record.pay_type,
            v_record.availability,
            v_record.preferred_locations,
            v_record.is_remote_ok,
            v_skill_count,
            v_verified_skill_count,
            v_matching_skill_count,
            v_pay_fit,
            v_availability_fit,
            v_overall_fit,
            v_explanation,
            v_explanation_points
        );

        RETURN NEXT v_result;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 3: COMPARE IDENTITIES RPC
-- ============================================

-- Compare multiple identities side by side
CREATE OR REPLACE FUNCTION compare_identities(
    p_identity_ids UUID[],
    p_budget_max INTEGER DEFAULT NULL,
    p_required_skills TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    identity_id UUID,
    job_category TEXT,
    job_title TEXT,
    capability_score INTEGER,
    experience_level TEXT,
    experience_years INTEGER,
    pay_range TEXT,
    availability TEXT,
    skill_count INTEGER,
    verified_skill_count INTEGER,
    matching_skill_count INTEGER,
    pay_fit_score INTEGER,
    overall_fit_score INTEGER,
    skills_json JSONB,
    strengths TEXT[],
    considerations TEXT[]
) AS $$
DECLARE
    v_id UUID;
    v_skills JSONB;
    v_strengths TEXT[];
    v_considerations TEXT[];
    v_identity RECORD;
    v_skill_count INTEGER;
    v_verified_count INTEGER;
    v_matching_count INTEGER;
    v_pay_fit INTEGER;
    v_overall_fit INTEGER;
BEGIN
    -- Limit to 5 identities for comparison
    IF array_length(p_identity_ids, 1) > 5 THEN
        RAISE EXCEPTION 'Cannot compare more than 5 identities';
    END IF;

    FOREACH v_id IN ARRAY p_identity_ids
    LOOP
        -- Get identity
        SELECT * INTO v_identity
        FROM work_identities
        WHERE id = v_id AND visibility_status = 'active';

        IF NOT FOUND THEN
            CONTINUE;
        END IF;

        -- Get skills as JSON
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'skill', skill,
            'level', skill_level,
            'verified', is_verified,
            'years', years_experience
        ) ORDER BY
            CASE WHEN is_verified THEN 0 ELSE 1 END,
            CASE skill_level
                WHEN 'expert' THEN 0
                WHEN 'good' THEN 1
                WHEN 'intermediate' THEN 2
                ELSE 3
            END
        ), '[]'::jsonb)
        INTO v_skills
        FROM identity_skills
        WHERE identity_id = v_id;

        -- Count skills
        SELECT
            COUNT(*),
            COUNT(*) FILTER (WHERE is_verified),
            COUNT(*) FILTER (WHERE skill = ANY(COALESCE(p_required_skills, ARRAY[]::TEXT[])))
        INTO v_skill_count, v_verified_count, v_matching_count
        FROM identity_skills
        WHERE identity_id = v_id;

        -- Calculate pay fit
        IF p_budget_max IS NULL OR v_identity.expected_pay_min IS NULL THEN
            v_pay_fit := 75;
        ELSIF v_identity.expected_pay_max IS NOT NULL AND v_identity.expected_pay_max <= p_budget_max THEN
            v_pay_fit := 100;
        ELSIF v_identity.expected_pay_min <= p_budget_max THEN
            v_pay_fit := 80;
        ELSE
            v_pay_fit := 40;
        END IF;

        -- Calculate overall fit
        v_overall_fit := (
            v_identity.capability_score * 0.5 +
            v_pay_fit * 0.3 +
            LEAST(v_skill_count * 3, 20)
        )::INTEGER;

        -- Build strengths
        v_strengths := ARRAY[]::TEXT[];

        IF v_identity.capability_score >= 80 THEN
            v_strengths := v_strengths || 'Top performer';
        END IF;

        IF v_verified_count > 0 THEN
            v_strengths := v_strengths || format('%s verified skills', v_verified_count);
        END IF;

        IF v_identity.experience_years >= 5 THEN
            v_strengths := v_strengths || 'Highly experienced';
        END IF;

        IF v_pay_fit >= 90 THEN
            v_strengths := v_strengths || 'Within budget';
        END IF;

        IF v_identity.is_remote_ok THEN
            v_strengths := v_strengths || 'Remote OK';
        END IF;

        IF v_matching_count > 0 AND p_required_skills IS NOT NULL THEN
            v_strengths := v_strengths || format('%s/%s skills match', v_matching_count, array_length(p_required_skills, 1));
        END IF;

        -- Build considerations
        v_considerations := ARRAY[]::TEXT[];

        IF v_identity.capability_score < 50 THEN
            v_considerations := v_considerations || 'Building capability';
        END IF;

        IF v_skill_count = 0 THEN
            v_considerations := v_considerations || 'No skills listed';
        END IF;

        IF v_pay_fit < 50 THEN
            v_considerations := v_considerations || 'Above budget';
        END IF;

        IF v_identity.experience_years < 2 THEN
            v_considerations := v_considerations || 'Limited experience';
        END IF;

        -- Format pay range
        RETURN QUERY SELECT
            v_id,
            v_identity.job_category,
            v_identity.job_title,
            v_identity.capability_score,
            v_identity.experience_level,
            v_identity.experience_years,
            CASE
                WHEN v_identity.expected_pay_min IS NOT NULL AND v_identity.expected_pay_max IS NOT NULL THEN
                    format('Rs. %s - %s', v_identity.expected_pay_min, v_identity.expected_pay_max)
                WHEN v_identity.expected_pay_min IS NOT NULL THEN
                    format('Rs. %s+', v_identity.expected_pay_min)
                ELSE 'Negotiable'
            END,
            v_identity.availability,
            v_skill_count,
            v_verified_count,
            v_matching_count,
            v_pay_fit,
            v_overall_fit,
            v_skills,
            v_strengths,
            v_considerations;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 4: PREMIUM CHECK FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION check_premium_access()
RETURNS TABLE (
    is_premium BOOLEAN,
    premium_tier TEXT,
    can_compare BOOLEAN,
    can_save_searches BOOLEAN,
    can_advanced_filter BOOLEAN,
    max_saved_searches INTEGER,
    max_compare_identities INTEGER
) AS $$
DECLARE
    v_profile RECORD;
BEGIN
    SELECT p.is_premium, p.premium_tier, p.premium_expires_at
    INTO v_profile
    FROM profiles p
    WHERE p.id = auth.uid();

    IF NOT FOUND THEN
        RETURN QUERY SELECT
            FALSE, 'free'::TEXT, FALSE, FALSE, FALSE, 0, 0;
        RETURN;
    END IF;

    -- Check if premium has expired
    IF v_profile.is_premium AND v_profile.premium_expires_at IS NOT NULL
       AND v_profile.premium_expires_at < NOW() THEN
        -- Premium expired, update profile
        UPDATE profiles
        SET is_premium = FALSE, premium_tier = 'free'
        WHERE id = auth.uid();

        v_profile.is_premium := FALSE;
        v_profile.premium_tier := 'free';
    END IF;

    RETURN QUERY SELECT
        COALESCE(v_profile.is_premium, FALSE),
        COALESCE(v_profile.premium_tier, 'free'),
        COALESCE(v_profile.is_premium, FALSE) OR COALESCE(v_profile.premium_tier, 'free') IN ('pro', 'business'),
        COALESCE(v_profile.is_premium, FALSE) OR COALESCE(v_profile.premium_tier, 'free') IN ('pro', 'business'),
        COALESCE(v_profile.is_premium, FALSE) OR COALESCE(v_profile.premium_tier, 'free') IN ('pro', 'business'),
        CASE
            WHEN COALESCE(v_profile.premium_tier, 'free') = 'business' THEN 20
            WHEN COALESCE(v_profile.premium_tier, 'free') = 'pro' THEN 10
            ELSE 3
        END,
        CASE
            WHEN COALESCE(v_profile.premium_tier, 'free') = 'business' THEN 5
            WHEN COALESCE(v_profile.premium_tier, 'free') = 'pro' THEN 3
            ELSE 0
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 5: FEATURE FLAGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    enabled BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default feature flags
INSERT INTO public.feature_flags (name, enabled, description) VALUES
    ('FEATURE_WORK_IDENTITY', TRUE, 'Enable work identity system'),
    ('FEATURE_DECISION_CARDS', TRUE, 'Enable decision card search results'),
    ('FEATURE_COMPARE_MODE', TRUE, 'Enable compare mode for business'),
    ('FEATURE_SAVED_SEARCHES', TRUE, 'Enable saved searches for business'),
    ('FEATURE_PREMIUM_GATING', TRUE, 'Enable premium feature gating')
ON CONFLICT (name) DO UPDATE SET
    enabled = EXCLUDED.enabled,
    updated_at = NOW();

-- RLS for feature flags (read only for authenticated)
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read feature flags" ON feature_flags;
CREATE POLICY "Anyone can read feature flags" ON feature_flags FOR SELECT
USING (TRUE);

-- Function to check feature flags
CREATE OR REPLACE FUNCTION is_feature_enabled(p_feature_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_enabled BOOLEAN;
BEGIN
    SELECT enabled INTO v_enabled
    FROM feature_flags
    WHERE name = p_feature_name;

    RETURN COALESCE(v_enabled, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 6: GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_decision_cards(TEXT[], INTEGER, TEXT[], INTEGER, TEXT[], TEXT[], TEXT[], INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION compare_identities(UUID[], INTEGER, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION check_premium_access() TO authenticated;
GRANT EXECUTE ON FUNCTION is_feature_enabled(TEXT) TO authenticated;

-- ============================================
-- PART 7: VERIFICATION
-- ============================================

SELECT '=== SR DECISION ENGINE MIGRATION COMPLETE ===' as status;

SELECT
    'Profiles premium columns' as check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'is_premium'
    ) THEN 'OK' ELSE 'MISSING' END as status;

SELECT
    'Feature flags table' as check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'feature_flags'
    ) THEN 'OK' ELSE 'MISSING' END as status;

SELECT
    'Decision cards function' as check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'get_decision_cards'
    ) THEN 'OK' ELSE 'MISSING' END as status;

SELECT
    'Compare identities function' as check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'compare_identities'
    ) THEN 'OK' ELSE 'MISSING' END as status;
