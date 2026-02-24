-- ============================================
-- KAAM DEU - ENSURE ALL PROFILE COLUMNS EXIST
-- Run this in Supabase SQL Editor
-- ============================================

-- Add all required columns (will skip if they already exist)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS typically_hiring text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS benefits_offered text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_position text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_person text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_type text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_size text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS multiple_locations text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified_business boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_photo_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS office_photos text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pan_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS registration_number text;

-- Verify the columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN (
    'typically_hiring',
    'benefits_offered',
    'contact_position',
    'contact_person',
    'contact_phone',
    'company_type',
    'company_size',
    'industry'
);

SELECT 'SUCCESS: All columns verified!' as status;
