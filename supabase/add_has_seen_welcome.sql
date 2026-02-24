-- Add has_seen_welcome column to profiles table
-- This column tracks whether the user has completed the welcome/onboarding flow
-- It persists across logout/login so returning users skip onboarding

-- Add the column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'has_seen_welcome'
    ) THEN
        ALTER TABLE profiles ADD COLUMN has_seen_welcome BOOLEAN DEFAULT FALSE;
    END IF;
END
$$;

-- Update existing users who have completed their profile to have seen welcome
-- This ensures existing users don't get re-onboarded after this migration
UPDATE profiles
SET has_seen_welcome = TRUE
WHERE is_profile_complete = TRUE AND (has_seen_welcome IS NULL OR has_seen_welcome = FALSE);

-- Add an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_has_seen_welcome ON profiles(has_seen_welcome);
