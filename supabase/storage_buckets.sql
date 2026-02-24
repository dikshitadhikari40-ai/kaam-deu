-- ============================================
-- KAAM DEU - STORAGE BUCKETS SETUP
-- Run this in Supabase SQL Editor
-- ============================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('profile-photos', 'profile-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('company-logos', 'company-logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('chat-media', 'chat-media', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    ('documents', 'documents', false, 10485760, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Profile Photos Bucket Policies
DROP POLICY IF EXISTS "Users can upload own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile photos" ON storage.objects;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own profile photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to view profile photos (public bucket)
CREATE POLICY "Anyone can view profile photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-photos');

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own profile photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Company Logos Bucket Policies
CREATE POLICY "Users can upload own company logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view company logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-logos');

CREATE POLICY "Users can delete own company logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Chat Media Bucket Policies
CREATE POLICY "Match participants can upload chat media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'chat-media'
    AND EXISTS (
        SELECT 1 FROM matches
        WHERE matches.id::text = (storage.foldername(name))[1]
        AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
);

CREATE POLICY "Match participants can view chat media"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'chat-media'
    AND EXISTS (
        SELECT 1 FROM matches
        WHERE matches.id::text = (storage.foldername(name))[1]
        AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
);

-- Documents Bucket Policies (Private - only owner can access)
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own files (for upsert)
CREATE POLICY "Users can update own profile photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own company logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

SELECT 'Storage buckets and policies created successfully!' as status;
