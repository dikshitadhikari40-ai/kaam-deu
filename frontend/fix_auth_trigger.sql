-- ============================================
-- FIX AUTH TRIGGER AND PROFILES SCHEMA
-- ============================================

-- 1. Ensure profiles table has all necessary columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';

-- 2. Update the handle_new_user function with robust logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_name TEXT;
  v_photo_url TEXT;
  v_auth_provider TEXT;
BEGIN
  -- Extract and normalize metadata with fallbacks
  
  -- Role: Normalize to lowercase, default to 'worker' if invalid or missing
  v_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'worker'));
  IF v_role NOT IN ('worker', 'business') THEN
    v_role := 'worker';
  END IF;

  -- Name: Try full_name first, then name, then empty string
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');
  
  -- Photo: Try avatar_url first, then picture, then empty string
  v_photo_url := COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '');
  
  -- Auth Provider: Default to 'email'
  v_auth_provider := COALESCE(NEW.raw_user_meta_data->>'auth_provider', 'email');

  -- Insert into profiles handler with ON CONFLICT to prevent race conditions
  INSERT INTO public.profiles (id, email, role, name, photo_url, auth_provider)
  VALUES (
    NEW.id,
    NEW.email,
    v_role,
    v_name,
    v_photo_url,
    v_auth_provider
  )
  ON CONFLICT (id) DO UPDATE SET
    -- If profile exists (rare race condition), update empty fields
    email = EXCLUDED.email,
    role = CASE WHEN public.profiles.role IS NULL THEN EXCLUDED.role ELSE public.profiles.role END,
    name = CASE WHEN public.profiles.name = '' THEN EXCLUDED.name ELSE public.profiles.name END,
    photo_url = CASE WHEN public.profiles.photo_url = '' THEN EXCLUDED.photo_url ELSE public.profiles.photo_url END,
    auth_provider = EXCLUDED.auth_provider,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-create the trigger to ensure it's successfully bound
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Check specific user that might have failed (Optional - hardcoded for debugging if needed, but safe to skip)
-- If you need to fix a specific broken user manually:
-- INSERT INTO public.profiles (id, email, role, name) 
-- VALUES ('USER_UUID_HERE', 'email@example.com', 'worker', 'Name') 
-- ON CONFLICT (id) DO NOTHING;
