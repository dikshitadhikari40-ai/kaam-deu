-- ============================================
-- KAAM DEU - COMPLETE SUPABASE FIX
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. PROFILES TABLE RLS POLICIES
-- ============================================

-- Enable RLS on profiles table (if not already)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;

-- Create new policies
CREATE POLICY "Profiles are viewable by everyone" ON profiles
FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- 2. AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(profiles.name, EXCLUDED.name),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 3. STORAGE BUCKET SETUP
-- ============================================

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create company-logos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create documents bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create job-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-images', 'job-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ============================================
-- 4. STORAGE RLS POLICIES FOR AVATARS
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatar upload policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;

-- Allow authenticated users to upload to avatars bucket (their own folder)
CREATE POLICY "Avatar upload policy" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to avatars
CREATE POLICY "Avatar public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');

-- Allow users to update their own avatars
CREATE POLICY "Avatar update policy" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatars
CREATE POLICY "Avatar delete policy" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- 5. STORAGE RLS POLICIES FOR COMPANY-LOGOS
-- ============================================

DROP POLICY IF EXISTS "Company logo upload policy" ON storage.objects;
DROP POLICY IF EXISTS "Company logo public read" ON storage.objects;

CREATE POLICY "Company logo upload policy" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'company-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Company logo public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'company-logos');

-- ============================================
-- 6. STORAGE RLS POLICIES FOR DOCUMENTS
-- ============================================

DROP POLICY IF EXISTS "Document upload policy" ON storage.objects;
DROP POLICY IF EXISTS "Document owner access" ON storage.objects;

CREATE POLICY "Document upload policy" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Document owner access" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- 7. STORAGE RLS POLICIES FOR JOB-IMAGES
-- ============================================

DROP POLICY IF EXISTS "Job image upload policy" ON storage.objects;
DROP POLICY IF EXISTS "Job image public read" ON storage.objects;

CREATE POLICY "Job image upload policy" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'job-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Job image public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'job-images');

-- ============================================
-- 8. VERIFY SETUP
-- ============================================

-- Check if everything is set up correctly
SELECT 'Buckets created:' as status, COUNT(*) as count FROM storage.buckets WHERE id IN ('avatars', 'company-logos', 'documents', 'job-images');
SELECT 'Storage policies:' as status, COUNT(*) as count FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
SELECT 'Profile policies:' as status, COUNT(*) as count FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public';

-- Done!
SELECT 'SUCCESS: All Supabase configurations applied!' as message;
