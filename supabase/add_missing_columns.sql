-- ============================================
-- KAAM DEU - ADD ALL MISSING PROFILE COLUMNS
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- Worker location fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_location text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_locations text[];

-- Worker profile fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience_years integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education text;

-- Worker work preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expected_salary_min integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expected_salary_max integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS salary text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS salary_negotiable boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_employment text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS availability text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS available_from text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS willing_to_relocate boolean DEFAULT false;

-- Worker documents
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cv_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cv_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS certifications text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portfolio_urls text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS languages text[];

-- Worker media
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photos text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS video_intro_url text;

-- Business fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_type text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_size text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website text;

-- Business contact
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_person text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_position text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_phone text;

-- Business locations
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS multiple_locations text[];

-- Business verification
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified_business boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pan_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS registration_number text;

-- Business media
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_photo_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS office_photos text[];

-- Business hiring
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS typically_hiring text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS benefits_offered text[];

-- Verification & Status
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_score integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_date timestamp with time zone;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_online timestamp with time zone;

-- Social/Auth
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auth_provider text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_uid text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_uid text;

-- Profile completion
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_profile_complete boolean DEFAULT false;

-- ============================================
-- VERIFY COLUMNS WERE ADDED
-- ============================================
SELECT 'Columns in profiles table:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

SELECT 'SUCCESS: All columns added!' as status;
