-- ============================================
-- KAAM DEU - IDENTITY VERIFICATION SYSTEM
-- ============================================

-- VERIFICATION REQUESTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    id_type TEXT NOT NULL CHECK (id_type IN ('citizenship', 'passport', 'license', 'pan')),
    id_number TEXT,
    full_name_on_id TEXT,
    document_front_url TEXT NOT NULL,
    document_back_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own verification request" ON verification_requests;
CREATE POLICY "Users can view own verification request" ON verification_requests
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can submit own verification request" ON verification_requests;
CREATE POLICY "Users can submit own verification request" ON verification_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pending request" ON verification_requests;
CREATE POLICY "Users can update own pending request" ON verification_requests
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- ADMIN ACCESS (If we had an admin role, but for now we'll use RPC)
-- ============================================

-- RPC TO APPROVE VERIFICATION
-- This will mark the request as approved and also update the profile's verified flag
-- AND award the 'Verified Pro' badge.
-- ============================================

CREATE OR REPLACE FUNCTION public.approve_verification(target_user_id UUID, admin_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    badge_id UUID;
BEGIN
    -- 1. Update verification request
    UPDATE public.verification_requests
    SET 
        status = 'approved',
        verified_at = NOW(),
        updated_at = NOW()
    WHERE user_id = target_user_id;

    -- 2. Update profile
    UPDATE public.profiles
    SET 
        verified = TRUE,
        updated_at = NOW()
    WHERE id = target_user_id;

    -- 3. Award Badge (Ensure badge exists first)
    SELECT id INTO badge_id FROM public.badges WHERE name = 'Verified Pro';
    
    IF badge_id IS NOT NULL THEN
        INSERT INTO public.user_badges (user_id, badge_id, earned_at)
        VALUES (target_user_id, badge_id, NOW())
        ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;

    -- 4. Create Notification
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
        target_user_id,
        'badge_earned',
        'Identity Verified!',
        'Congratulations! Your identity has been verified. You now have the Verified Pro badge.',
        jsonb_build_object('badge_name', 'Verified Pro')
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC TO REJECT VERIFICATION
-- ============================================

CREATE OR REPLACE FUNCTION public.reject_verification(target_user_id UUID, notes TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- 1. Update verification request
    UPDATE public.verification_requests
    SET 
        status = 'rejected',
        admin_notes = notes,
        updated_at = NOW()
    WHERE user_id = target_user_id;

    -- 2. Create Notification
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
        target_user_id,
        'system',
        'Verification Update',
        'Your identity verification was not approved. Reason: ' || notes,
        jsonb_build_object('status', 'rejected', 'reason', notes)
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS tr_verification_requests_updated_at ON verification_requests;
CREATE TRIGGER tr_verification_requests_updated_at
    BEFORE UPDATE ON verification_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- GRANT ACCESS
GRANT EXECUTE ON FUNCTION public.approve_verification(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_verification(UUID, TEXT) TO authenticated;
GRANT SELECT ON public.verification_requests TO authenticated;
