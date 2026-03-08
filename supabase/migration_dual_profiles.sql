-- ============================================
-- DUAL PROFILES MIGRATION
-- Allows users to have both Worker and Business profiles
-- Run this in Supabase SQL Editor
-- ============================================

-- Add roles array column to store all roles a user has
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{}';

-- Add active_role column to track which role is currently selected
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_role TEXT DEFAULT 'worker';

-- Add worker_is_complete flag to track worker profile completion separately
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS worker_is_complete BOOLEAN DEFAULT FALSE;

-- Add business_is_complete flag to track business profile completion separately
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_is_complete BOOLEAN DEFAULT FALSE;

-- Migrate existing data: set roles array and active_role from existing role
UPDATE public.profiles
SET
    roles = ARRAY[role],
    active_role = role,
    worker_is_complete = CASE WHEN role = 'worker' AND is_profile_complete THEN TRUE ELSE FALSE END,
    business_is_complete = CASE WHEN role = 'business' AND is_profile_complete THEN TRUE ELSE FALSE END
WHERE roles = '{}';

-- Add index for active_role queries
CREATE INDEX IF NOT EXISTS idx_profiles_active_role ON public.profiles(active_role);

-- Add index for roles array queries
CREATE INDEX IF NOT EXISTS idx_profiles_roles ON public.profiles USING GIN(roles);

-- Add composite index for dual profile queries
CREATE INDEX IF NOT EXISTS idx_profiles_dual ON public.profiles(id, active_role, worker_is_complete, business_is_complete);

-- Comment on new columns
COMMENT ON COLUMN public.profiles.roles IS 'Array of roles this user has [''worker'', ''business'', or both]';
COMMENT ON COLUMN public.profiles.active_role IS 'Currently active role for this user';
COMMENT ON COLUMN public.profiles.worker_is_complete IS 'Whether the worker profile is complete';
COMMENT ON COLUMN public.profiles.business_is_complete IS 'Whether the business profile is complete';
