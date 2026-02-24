-- ============================================
-- FIX AUTH TRIGGER AND PROFILES SCHEMA V2
-- ============================================

-- 1. Ensure profiles table has all necessary columns
-- We re-run this to be sure
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'worker',
  name TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  auth_provider TEXT DEFAULT 'email',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add columns if they mistakenly don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'auth_provider') THEN
        ALTER TABLE public.profiles ADD COLUMN auth_provider TEXT DEFAULT 'email';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'worker';
    END IF;
END $$;

-- 2. Drop the trigger first to avoid locking issues
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Create or Replace the Handler Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_name TEXT;
  v_photo_url TEXT;
  v_auth_provider TEXT;
BEGIN
  -- Log the event for debugging (visible in Supabase logs)
  RAISE NOTICE 'New user signup: %', NEW.id;

  -- Extract and normalize metadata with fallbacks
  v_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'worker'));
  -- Validate role
  IF v_role NOT IN ('worker', 'business') THEN
    v_role := 'worker';
  END IF;

  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');
  v_photo_url := COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '');
  v_auth_provider := COALESCE(NEW.raw_user_meta_data->>'auth_provider', 'email');

  -- Insert into profiles
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
    email = EXCLUDED.email,
    role = COALESCE(public.profiles.role, EXCLUDED.role),
    name = COALESCE(NULLIF(EXCLUDED.name, ''), public.profiles.name),
    photo_url = COALESCE(NULLIF(EXCLUDED.photo_url, ''), public.profiles.photo_url),
    auth_provider = EXCLUDED.auth_provider,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block auth?
  -- Better to block auth if profile creation fails, so we catch errors early
  RAISE EXCEPTION 'Failed to create profile: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Re-bind the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Fix permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
