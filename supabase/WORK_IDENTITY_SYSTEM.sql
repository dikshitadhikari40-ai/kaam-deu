-- ============================================
-- KAAM DEU - WORK IDENTITY SYSTEM
-- Run this AFTER the base setup is complete
-- ============================================
-- This introduces the core concept:
-- Work Identity = How one person is evaluated for ONE type of work
-- One user can have MULTIPLE work identities
-- ============================================

-- ============================================
-- PART 1: WORK IDENTITIES TABLE (CORE)
-- ============================================

CREATE TABLE IF NOT EXISTS public.work_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Job Category (the type of work)
    job_category TEXT NOT NULL,  -- e.g., 'driver', 'helper', 'cook', 'electrician'
    job_title TEXT,              -- e.g., 'Heavy Vehicle Driver', 'House Helper'

    -- Capability Assessment
    capability_score INTEGER DEFAULT 0 CHECK (capability_score >= 0 AND capability_score <= 100),
    experience_level TEXT DEFAULT 'junior' CHECK (experience_level IN ('junior', 'mid', 'senior', 'expert')),
    experience_years INTEGER DEFAULT 0,

    -- Pay Expectations
    expected_pay_min INTEGER,
    expected_pay_max INTEGER,
    pay_type TEXT DEFAULT 'monthly' CHECK (pay_type IN ('hourly', 'daily', 'weekly', 'monthly')),

    -- Availability
    availability TEXT DEFAULT 'full_time' CHECK (availability IN ('full_time', 'part_time', 'contract', 'daily_wage', 'flexible')),
    available_from DATE,
    preferred_locations TEXT[] DEFAULT '{}',
    is_remote_ok BOOLEAN DEFAULT FALSE,

    -- Visibility & Status
    visibility_status TEXT DEFAULT 'active' CHECK (visibility_status IN ('active', 'hidden', 'paused')),
    is_primary BOOLEAN DEFAULT FALSE,  -- User's primary/featured identity

    -- Metrics (updated by backend)
    profile_views INTEGER DEFAULT 0,
    search_appearances INTEGER DEFAULT 0,
    contact_requests INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One user can only have one identity per job category
    UNIQUE(user_id, job_category)
);

-- ============================================
-- PART 2: IDENTITY SKILLS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.identity_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id UUID NOT NULL REFERENCES public.work_identities(id) ON DELETE CASCADE,

    skill TEXT NOT NULL,
    skill_level TEXT DEFAULT 'basic' CHECK (skill_level IN ('basic', 'intermediate', 'good', 'expert')),
    years_experience INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id),

    -- Evidence/Proof (optional)
    certificate_url TEXT,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(identity_id, skill)
);

-- ============================================
-- PART 3: CV SNAPSHOTS (AUTO-GENERATED)
-- ============================================

CREATE TABLE IF NOT EXISTS public.cv_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id UUID NOT NULL REFERENCES public.work_identities(id) ON DELETE CASCADE,

    -- CV Type determines the view mode
    cv_type TEXT NOT NULL CHECK (cv_type IN ('worker_confidence', 'business_decision', 'public_summary')),

    -- Generated content (structured JSON)
    content_json JSONB NOT NULL DEFAULT '{}',

    -- Metadata
    version INTEGER DEFAULT 1,
    is_current BOOLEAN DEFAULT TRUE,

    -- Generation tracking
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    generation_trigger TEXT,  -- 'skill_update', 'score_change', 'manual', 'scheduled'

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 4: JOB CATEGORIES (Reference Table)
-- ============================================

CREATE TABLE IF NOT EXISTS public.job_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    parent_category TEXT,  -- For hierarchical categories

    -- Default skills for this category
    default_skills TEXT[] DEFAULT '{}',

    -- Scoring weights for this category
    skill_weight DECIMAL(3,2) DEFAULT 0.40,
    experience_weight DECIMAL(3,2) DEFAULT 0.30,
    reliability_weight DECIMAL(3,2) DEFAULT 0.20,
    activity_weight DECIMAL(3,2) DEFAULT 0.10,

    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default job categories
INSERT INTO public.job_categories (name, display_name, description, default_skills, sort_order) VALUES
    ('driver', 'Driver', 'Vehicle drivers for various purposes', ARRAY['driving', 'navigation', 'vehicle_maintenance'], 1),
    ('helper', 'Helper', 'General household or office helpers', ARRAY['cleaning', 'organizing', 'errands'], 2),
    ('cook', 'Cook', 'Cooking and food preparation', ARRAY['cooking', 'meal_planning', 'kitchen_management'], 3),
    ('electrician', 'Electrician', 'Electrical work and repairs', ARRAY['wiring', 'repairs', 'installation'], 4),
    ('plumber', 'Plumber', 'Plumbing work and repairs', ARRAY['pipe_fitting', 'repairs', 'installation'], 5),
    ('security', 'Security Guard', 'Security and surveillance', ARRAY['surveillance', 'access_control', 'emergency_response'], 6),
    ('cleaner', 'Cleaner', 'Professional cleaning services', ARRAY['deep_cleaning', 'sanitization', 'organization'], 7),
    ('gardener', 'Gardener', 'Garden and landscape maintenance', ARRAY['planting', 'pruning', 'lawn_care'], 8),
    ('caretaker', 'Caretaker', 'Property or elderly care', ARRAY['caregiving', 'medication_management', 'companionship'], 9),
    ('office_assistant', 'Office Assistant', 'General office support', ARRAY['filing', 'data_entry', 'communication'], 10),
    ('delivery', 'Delivery Person', 'Package and food delivery', ARRAY['navigation', 'time_management', 'customer_service'], 11),
    ('waiter', 'Waiter/Server', 'Restaurant and hospitality service', ARRAY['customer_service', 'order_taking', 'table_management'], 12),
    ('receptionist', 'Receptionist', 'Front desk and reception duties', ARRAY['communication', 'scheduling', 'customer_service'], 13),
    ('construction', 'Construction Worker', 'Construction and building work', ARRAY['physical_labor', 'tool_operation', 'safety_compliance'], 14),
    ('tailor', 'Tailor', 'Clothing alterations and tailoring', ARRAY['sewing', 'measurements', 'alterations'], 15)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    default_skills = EXCLUDED.default_skills;

-- ============================================
-- PART 5: BUSINESS SAVED SEARCHES
-- ============================================

CREATE TABLE IF NOT EXISTS public.business_saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    name TEXT NOT NULL,

    -- Search Criteria (filters on work_identities)
    job_categories TEXT[] DEFAULT '{}',
    min_capability_score INTEGER,
    max_capability_score INTEGER,
    experience_levels TEXT[] DEFAULT '{}',
    pay_range_min INTEGER,
    pay_range_max INTEGER,
    availability_types TEXT[] DEFAULT '{}',
    required_skills TEXT[] DEFAULT '{}',
    locations TEXT[] DEFAULT '{}',

    -- Notifications
    notify_on_match BOOLEAN DEFAULT FALSE,
    notification_frequency TEXT DEFAULT 'daily' CHECK (notification_frequency IN ('instant', 'daily', 'weekly')),

    -- Usage tracking
    last_used_at TIMESTAMPTZ,
    use_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 6: IDENTITY CONTACT REQUESTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.identity_contact_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id UUID NOT NULL REFERENCES public.work_identities(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    message TEXT,

    -- For job-specific requests
    job_post_id UUID REFERENCES public.job_posts(id) ON DELETE SET NULL,

    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(identity_id, requester_id, job_post_id)
);

-- ============================================
-- PART 7: INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_work_identities_user ON work_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_work_identities_category ON work_identities(job_category);
CREATE INDEX IF NOT EXISTS idx_work_identities_capability ON work_identities(capability_score DESC);
CREATE INDEX IF NOT EXISTS idx_work_identities_visibility ON work_identities(visibility_status);
CREATE INDEX IF NOT EXISTS idx_work_identities_availability ON work_identities(availability);
CREATE INDEX IF NOT EXISTS idx_work_identities_pay ON work_identities(expected_pay_min, expected_pay_max);

CREATE INDEX IF NOT EXISTS idx_identity_skills_identity ON identity_skills(identity_id);
CREATE INDEX IF NOT EXISTS idx_identity_skills_skill ON identity_skills(skill);
CREATE INDEX IF NOT EXISTS idx_identity_skills_verified ON identity_skills(is_verified);

CREATE INDEX IF NOT EXISTS idx_cv_snapshots_identity ON cv_snapshots(identity_id);
CREATE INDEX IF NOT EXISTS idx_cv_snapshots_current ON cv_snapshots(identity_id, is_current) WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_saved_searches_business ON business_saved_searches(business_id);
CREATE INDEX IF NOT EXISTS idx_contact_requests_identity ON identity_contact_requests(identity_id);
CREATE INDEX IF NOT EXISTS idx_contact_requests_requester ON identity_contact_requests(requester_id);

SELECT '✅ Indexes created!' as status;

-- ============================================
-- PART 8: ENABLE RLS
-- ============================================

ALTER TABLE work_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_contact_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 9: RLS POLICIES
-- ============================================

-- WORK IDENTITIES
DROP POLICY IF EXISTS "Users can view active identities" ON work_identities;
DROP POLICY IF EXISTS "Users can manage own identities" ON work_identities;

CREATE POLICY "Users can view active identities" ON work_identities FOR SELECT
USING (visibility_status = 'active' OR user_id = auth.uid());

CREATE POLICY "Users can manage own identities" ON work_identities FOR ALL
USING (user_id = auth.uid());

-- IDENTITY SKILLS
DROP POLICY IF EXISTS "Anyone can view skills of visible identities" ON identity_skills;
DROP POLICY IF EXISTS "Users can manage own identity skills" ON identity_skills;

CREATE POLICY "Anyone can view skills of visible identities" ON identity_skills FOR SELECT
USING (EXISTS (
    SELECT 1 FROM work_identities wi
    WHERE wi.id = identity_skills.identity_id
    AND (wi.visibility_status = 'active' OR wi.user_id = auth.uid())
));

CREATE POLICY "Users can manage own identity skills" ON identity_skills FOR ALL
USING (EXISTS (
    SELECT 1 FROM work_identities wi
    WHERE wi.id = identity_skills.identity_id
    AND wi.user_id = auth.uid()
));

-- CV SNAPSHOTS
DROP POLICY IF EXISTS "Anyone can view current CV of visible identities" ON cv_snapshots;
DROP POLICY IF EXISTS "Users can view all own CV snapshots" ON cv_snapshots;

CREATE POLICY "Anyone can view current CV of visible identities" ON cv_snapshots FOR SELECT
USING (is_current = TRUE AND EXISTS (
    SELECT 1 FROM work_identities wi
    WHERE wi.id = cv_snapshots.identity_id
    AND (wi.visibility_status = 'active' OR wi.user_id = auth.uid())
));

CREATE POLICY "Users can view all own CV snapshots" ON cv_snapshots FOR SELECT
USING (EXISTS (
    SELECT 1 FROM work_identities wi
    WHERE wi.id = cv_snapshots.identity_id
    AND wi.user_id = auth.uid()
));

-- JOB CATEGORIES
DROP POLICY IF EXISTS "Anyone can view active categories" ON job_categories;
CREATE POLICY "Anyone can view active categories" ON job_categories FOR SELECT
USING (is_active = TRUE);

-- BUSINESS SAVED SEARCHES
DROP POLICY IF EXISTS "Business can manage own searches" ON business_saved_searches;
CREATE POLICY "Business can manage own searches" ON business_saved_searches FOR ALL
USING (business_id = auth.uid());

-- CONTACT REQUESTS
DROP POLICY IF EXISTS "Identity owners can view requests" ON identity_contact_requests;
DROP POLICY IF EXISTS "Requesters can view own requests" ON identity_contact_requests;
DROP POLICY IF EXISTS "Authenticated can create requests" ON identity_contact_requests;
DROP POLICY IF EXISTS "Identity owners can respond" ON identity_contact_requests;

CREATE POLICY "Identity owners can view requests" ON identity_contact_requests FOR SELECT
USING (EXISTS (
    SELECT 1 FROM work_identities wi
    WHERE wi.id = identity_contact_requests.identity_id
    AND wi.user_id = auth.uid()
));

CREATE POLICY "Requesters can view own requests" ON identity_contact_requests FOR SELECT
USING (requester_id = auth.uid());

CREATE POLICY "Authenticated can create requests" ON identity_contact_requests FOR INSERT
WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Identity owners can respond" ON identity_contact_requests FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM work_identities wi
    WHERE wi.id = identity_contact_requests.identity_id
    AND wi.user_id = auth.uid()
));

SELECT '✅ RLS policies created!' as status;

-- ============================================
-- PART 10: HELPER FUNCTIONS
-- ============================================

-- Calculate Capability Score
CREATE OR REPLACE FUNCTION calculate_capability_score(p_identity_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_skill_score DECIMAL;
    v_experience_score DECIMAL;
    v_reliability_score DECIMAL;
    v_activity_score DECIMAL;
    v_total_score INTEGER;
    v_skill_count INTEGER;
    v_category TEXT;
    v_weights RECORD;
BEGIN
    -- Get the job category for weight lookup
    SELECT job_category INTO v_category
    FROM work_identities WHERE id = p_identity_id;

    -- Get weights (default if category not found)
    SELECT
        COALESCE(skill_weight, 0.40) as skill_w,
        COALESCE(experience_weight, 0.30) as exp_w,
        COALESCE(reliability_weight, 0.20) as rel_w,
        COALESCE(activity_weight, 0.10) as act_w
    INTO v_weights
    FROM job_categories WHERE name = v_category;

    IF NOT FOUND THEN
        v_weights := ROW(0.40, 0.30, 0.20, 0.10);
    END IF;

    -- Calculate skill score (based on verified skills and levels)
    SELECT
        COUNT(*),
        COALESCE(AVG(
            CASE skill_level
                WHEN 'expert' THEN 100
                WHEN 'good' THEN 75
                WHEN 'intermediate' THEN 50
                WHEN 'basic' THEN 25
            END * CASE WHEN is_verified THEN 1.2 ELSE 1.0 END
        ), 0)
    INTO v_skill_count, v_skill_score
    FROM identity_skills WHERE identity_id = p_identity_id;

    -- Bonus for having more skills (max 20% bonus)
    v_skill_score := LEAST(v_skill_score * (1 + LEAST(v_skill_count, 10) * 0.02), 100);

    -- Calculate experience score
    SELECT
        CASE
            WHEN experience_level = 'expert' THEN 100
            WHEN experience_level = 'senior' THEN 80
            WHEN experience_level = 'mid' THEN 60
            WHEN experience_level = 'junior' THEN 40
            ELSE 20
        END + LEAST(experience_years * 2, 20)  -- Max 20 bonus from years
    INTO v_experience_score
    FROM work_identities WHERE id = p_identity_id;

    v_experience_score := LEAST(v_experience_score, 100);

    -- Reliability score (based on profile completeness and activity)
    -- For now, use profile completeness as proxy
    SELECT
        CASE WHEN job_title IS NOT NULL THEN 20 ELSE 0 END +
        CASE WHEN expected_pay_min IS NOT NULL THEN 20 ELSE 0 END +
        CASE WHEN array_length(preferred_locations, 1) > 0 THEN 20 ELSE 0 END +
        CASE WHEN available_from IS NOT NULL THEN 20 ELSE 0 END +
        20  -- Base score
    INTO v_reliability_score
    FROM work_identities WHERE id = p_identity_id;

    -- Activity score (based on recent activity)
    SELECT
        CASE
            WHEN updated_at > NOW() - INTERVAL '7 days' THEN 100
            WHEN updated_at > NOW() - INTERVAL '30 days' THEN 75
            WHEN updated_at > NOW() - INTERVAL '90 days' THEN 50
            ELSE 25
        END
    INTO v_activity_score
    FROM work_identities WHERE id = p_identity_id;

    -- Calculate weighted total
    v_total_score := ROUND(
        v_skill_score * v_weights.skill_w +
        v_experience_score * v_weights.exp_w +
        v_reliability_score * v_weights.rel_w +
        v_activity_score * v_weights.act_w
    );

    -- Update the identity with new score
    UPDATE work_identities
    SET capability_score = v_total_score, updated_at = NOW()
    WHERE id = p_identity_id;

    RETURN v_total_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate CV Snapshot
CREATE OR REPLACE FUNCTION generate_cv_snapshot(
    p_identity_id UUID,
    p_cv_type TEXT DEFAULT 'worker_confidence',
    p_trigger TEXT DEFAULT 'manual'
)
RETURNS UUID AS $$
DECLARE
    v_snapshot_id UUID;
    v_content JSONB;
    v_identity RECORD;
    v_skills JSONB;
BEGIN
    -- Get identity data
    SELECT * INTO v_identity FROM work_identities WHERE id = p_identity_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Identity not found';
    END IF;

    -- Get skills as JSON array
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'skill', skill,
        'level', skill_level,
        'verified', is_verified,
        'years', years_experience
    )), '[]'::jsonb)
    INTO v_skills
    FROM identity_skills WHERE identity_id = p_identity_id;

    -- Build content based on CV type
    IF p_cv_type = 'worker_confidence' THEN
        -- Worker-focused view: emphasizes strengths and growth
        v_content := jsonb_build_object(
            'header', jsonb_build_object(
                'job_category', v_identity.job_category,
                'job_title', v_identity.job_title,
                'capability_score', v_identity.capability_score,
                'experience_level', v_identity.experience_level
            ),
            'strengths', v_skills,
            'availability', jsonb_build_object(
                'type', v_identity.availability,
                'available_from', v_identity.available_from,
                'locations', v_identity.preferred_locations,
                'remote_ok', v_identity.is_remote_ok
            ),
            'expectations', jsonb_build_object(
                'pay_min', v_identity.expected_pay_min,
                'pay_max', v_identity.expected_pay_max,
                'pay_type', v_identity.pay_type
            ),
            'metrics', jsonb_build_object(
                'profile_views', v_identity.profile_views,
                'contact_requests', v_identity.contact_requests
            )
        );
    ELSIF p_cv_type = 'business_decision' THEN
        -- Business-focused view: emphasizes fit and reliability
        v_content := jsonb_build_object(
            'summary', jsonb_build_object(
                'category', v_identity.job_category,
                'title', v_identity.job_title,
                'capability', v_identity.capability_score,
                'experience', v_identity.experience_level,
                'years', v_identity.experience_years
            ),
            'skills_match', v_skills,
            'availability_fit', jsonb_build_object(
                'type', v_identity.availability,
                'start_date', v_identity.available_from,
                'locations', v_identity.preferred_locations
            ),
            'cost', jsonb_build_object(
                'range_min', v_identity.expected_pay_min,
                'range_max', v_identity.expected_pay_max,
                'period', v_identity.pay_type
            ),
            'reliability_indicators', jsonb_build_object(
                'search_appearances', v_identity.search_appearances,
                'contact_rate', CASE
                    WHEN v_identity.profile_views > 0
                    THEN ROUND(v_identity.contact_requests::decimal / v_identity.profile_views * 100, 1)
                    ELSE 0
                END
            )
        );
    ELSE
        -- Public summary view
        v_content := jsonb_build_object(
            'category', v_identity.job_category,
            'title', v_identity.job_title,
            'level', v_identity.experience_level,
            'availability', v_identity.availability,
            'skill_count', jsonb_array_length(v_skills)
        );
    END IF;

    -- Mark previous snapshots as not current
    UPDATE cv_snapshots
    SET is_current = FALSE
    WHERE identity_id = p_identity_id AND cv_type = p_cv_type;

    -- Insert new snapshot
    INSERT INTO cv_snapshots (identity_id, cv_type, content_json, generation_trigger)
    VALUES (p_identity_id, p_cv_type, v_content, p_trigger)
    RETURNING id INTO v_snapshot_id;

    RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Search Work Identities (for business)
CREATE OR REPLACE FUNCTION search_work_identities(
    p_categories TEXT[] DEFAULT NULL,
    p_min_capability INTEGER DEFAULT NULL,
    p_experience_levels TEXT[] DEFAULT NULL,
    p_pay_max INTEGER DEFAULT NULL,
    p_availability_types TEXT[] DEFAULT NULL,
    p_required_skills TEXT[] DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    identity_id UUID,
    user_id UUID,
    job_category TEXT,
    job_title TEXT,
    capability_score INTEGER,
    experience_level TEXT,
    expected_pay_min INTEGER,
    expected_pay_max INTEGER,
    availability TEXT,
    skill_match_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        wi.id,
        wi.user_id,
        wi.job_category,
        wi.job_title,
        wi.capability_score,
        wi.experience_level,
        wi.expected_pay_min,
        wi.expected_pay_max,
        wi.availability,
        COALESCE((
            SELECT COUNT(*)::INTEGER
            FROM identity_skills isk
            WHERE isk.identity_id = wi.id
            AND isk.skill = ANY(p_required_skills)
        ), 0) as skill_match_count
    FROM work_identities wi
    WHERE wi.visibility_status = 'active'
    AND (p_categories IS NULL OR wi.job_category = ANY(p_categories))
    AND (p_min_capability IS NULL OR wi.capability_score >= p_min_capability)
    AND (p_experience_levels IS NULL OR wi.experience_level = ANY(p_experience_levels))
    AND (p_pay_max IS NULL OR wi.expected_pay_min <= p_pay_max)
    AND (p_availability_types IS NULL OR wi.availability = ANY(p_availability_types))
    AND (p_required_skills IS NULL OR EXISTS (
        SELECT 1 FROM identity_skills isk
        WHERE isk.identity_id = wi.id
        AND isk.skill = ANY(p_required_skills)
    ))
    ORDER BY
        CASE WHEN p_required_skills IS NOT NULL THEN skill_match_count END DESC NULLS LAST,
        wi.capability_score DESC,
        wi.updated_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update capability score on skill change
CREATE OR REPLACE FUNCTION trigger_recalculate_capability()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM calculate_capability_score(
        CASE WHEN TG_OP = 'DELETE' THEN OLD.identity_id ELSE NEW.identity_id END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_skill_change ON identity_skills;
CREATE TRIGGER on_skill_change
    AFTER INSERT OR UPDATE OR DELETE ON identity_skills
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_capability();

-- Auto-generate CV on identity update
CREATE OR REPLACE FUNCTION trigger_regenerate_cv()
RETURNS TRIGGER AS $$
BEGIN
    -- Only regenerate if significant fields changed
    IF OLD.job_category IS DISTINCT FROM NEW.job_category
    OR OLD.job_title IS DISTINCT FROM NEW.job_title
    OR OLD.experience_level IS DISTINCT FROM NEW.experience_level
    OR OLD.expected_pay_min IS DISTINCT FROM NEW.expected_pay_min
    OR OLD.expected_pay_max IS DISTINCT FROM NEW.expected_pay_max
    OR OLD.availability IS DISTINCT FROM NEW.availability
    THEN
        PERFORM generate_cv_snapshot(NEW.id, 'worker_confidence', 'auto_update');
        PERFORM generate_cv_snapshot(NEW.id, 'business_decision', 'auto_update');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_identity_update ON work_identities;
CREATE TRIGGER on_identity_update
    AFTER UPDATE ON work_identities
    FOR EACH ROW
    EXECUTE FUNCTION trigger_regenerate_cv();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_capability_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_cv_snapshot(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_work_identities(TEXT[], INTEGER, TEXT[], INTEGER, TEXT[], TEXT[], INTEGER, INTEGER) TO authenticated;

SELECT '✅ Helper functions created!' as status;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT
    '📊 Work Identity Tables' as info,
    COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('work_identities', 'identity_skills', 'cv_snapshots', 'job_categories', 'business_saved_searches', 'identity_contact_requests');

SELECT '🎉 WORK IDENTITY SYSTEM READY!' as final_status;
SELECT 'Next: Create work identities for your workers and watch CVs auto-generate!' as next_step;
