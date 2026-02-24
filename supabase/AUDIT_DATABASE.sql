-- ============================================
-- DATABASE AUDIT SCRIPT
-- Run this in Supabase SQL Editor to see what's missing
-- ============================================

-- This script checks for all required tables, columns, and features
-- Copy the output and share it to identify what needs to be created

SELECT '========================================' as info;
SELECT 'DATABASE AUDIT REPORT' as info;
SELECT '========================================' as info;

-- ============================================
-- 1. CHECK REQUIRED TABLES
-- ============================================

SELECT '--- REQUIRED TABLES ---' as section;

SELECT
    table_name,
    CASE WHEN table_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM (
    SELECT unnest(ARRAY[
        'profiles',
        'swipes',
        'matches',
        'messages',
        'job_posts',
        'job_applications',
        'reviews',
        'reports',
        'blocks',
        'badges',
        'user_badges',
        'user_streaks',
        'boosts',
        'subscriptions',
        'business_posts',
        'post_likes',
        'post_comments',
        'work_identities',
        'payments',
        'active_calls'
    ]) as required_table
) required
LEFT JOIN information_schema.tables existing
    ON existing.table_name = required.required_table
    AND existing.table_schema = 'public'
ORDER BY
    CASE WHEN existing.table_name IS NULL THEN 0 ELSE 1 END,
    required_table;

-- ============================================
-- 2. CHECK PROFILES TABLE COLUMNS
-- ============================================

SELECT '--- PROFILES TABLE COLUMNS ---' as section;

SELECT
    required_column,
    CASE WHEN column_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM (
    SELECT unnest(ARRAY[
        'id',
        'email',
        'name',
        'role',
        'photo_url',
        'phone',
        'is_profile_complete',
        'has_seen_welcome',
        'auth_provider',
        'career_tier',
        'google_uid',
        'linkedin_uid',
        -- Worker fields
        'job_title',
        'bio',
        'skills',
        'experience_years',
        'expected_salary_min',
        'expected_salary_max',
        'preferred_employment',
        'availability',
        'current_location',
        'preferred_locations',
        'willing_to_relocate',
        'resume_url',
        'certifications',
        'portfolio_urls',
        'languages',
        'education',
        'photos',
        'video_intro_url',
        -- Business fields
        'company_name',
        'company_type',
        'company_size',
        'industry',
        'description',
        'website',
        'contact_person',
        'contact_position',
        'contact_phone',
        'location',
        'multiple_locations',
        'is_verified_business',
        'logo_url',
        'cover_photo_url',
        'office_photos',
        'typically_hiring',
        'benefits_offered',
        -- Timestamps
        'created_at',
        'updated_at'
    ]) as required_column
) required
LEFT JOIN information_schema.columns existing
    ON existing.column_name = required.required_column
    AND existing.table_name = 'profiles'
    AND existing.table_schema = 'public'
ORDER BY
    CASE WHEN existing.column_name IS NULL THEN 0 ELSE 1 END,
    required_column;

-- ============================================
-- 3. CHECK MATCHES TABLE COLUMNS
-- ============================================

SELECT '--- MATCHES TABLE COLUMNS ---' as section;

SELECT
    required_column,
    CASE WHEN column_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM (
    SELECT unnest(ARRAY[
        'id',
        'user1_id',
        'user2_id',
        'is_active',
        'unmatched_by',
        'created_at',
        'updated_at'
    ]) as required_column
) required
LEFT JOIN information_schema.columns existing
    ON existing.column_name = required.required_column
    AND existing.table_name = 'matches'
    AND existing.table_schema = 'public'
ORDER BY
    CASE WHEN existing.column_name IS NULL THEN 0 ELSE 1 END,
    required_column;

-- ============================================
-- 4. CHECK MESSAGES TABLE COLUMNS
-- ============================================

SELECT '--- MESSAGES TABLE COLUMNS ---' as section;

SELECT
    required_column,
    CASE WHEN column_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM (
    SELECT unnest(ARRAY[
        'id',
        'match_id',
        'sender_id',
        'content',
        'message_type',
        'media_url',
        'is_read',
        'read_at',
        'created_at',
        'updated_at'
    ]) as required_column
) required
LEFT JOIN information_schema.columns existing
    ON existing.column_name = required.required_column
    AND existing.table_name = 'messages'
    AND existing.table_schema = 'public'
ORDER BY
    CASE WHEN existing.column_name IS NULL THEN 0 ELSE 1 END,
    required_column;

-- ============================================
-- 5. CHECK SWIPES TABLE COLUMNS
-- ============================================

SELECT '--- SWIPES TABLE COLUMNS ---' as section;

SELECT
    required_column,
    CASE WHEN column_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM (
    SELECT unnest(ARRAY[
        'id',
        'swiper_id',
        'swiped_id',
        'direction',
        'created_at'
    ]) as required_column
) required
LEFT JOIN information_schema.columns existing
    ON existing.column_name = required.required_column
    AND existing.table_name = 'swipes'
    AND existing.table_schema = 'public'
ORDER BY
    CASE WHEN existing.column_name IS NULL THEN 0 ELSE 1 END,
    required_column;

-- ============================================
-- 6. CHECK BUSINESS_POSTS TABLE (NEW FEATURE)
-- ============================================

SELECT '--- BUSINESS_POSTS TABLE COLUMNS ---' as section;

SELECT
    required_column,
    CASE WHEN column_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM (
    SELECT unnest(ARRAY[
        'id',
        'business_id',
        'author_id',
        'post_type',
        'title',
        'content',
        'media_urls',
        'likes_count',
        'comments_count',
        'shares_count',
        'is_pinned',
        'is_active',
        'created_at',
        'updated_at'
    ]) as required_column
) required
LEFT JOIN information_schema.columns existing
    ON existing.column_name = required.required_column
    AND existing.table_name = 'business_posts'
    AND existing.table_schema = 'public'
ORDER BY
    CASE WHEN existing.column_name IS NULL THEN 0 ELSE 1 END,
    required_column;

-- ============================================
-- 7. CHECK REQUIRED FUNCTIONS
-- ============================================

SELECT '--- REQUIRED FUNCTIONS ---' as section;

SELECT
    required_function,
    CASE WHEN routine_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM (
    SELECT unnest(ARRAY[
        'increment_likes',
        'decrement_likes',
        'increment_comments',
        'decrement_comments',
        'handle_new_user',
        'check_for_match',
        'update_updated_at_column'
    ]) as required_function
) required
LEFT JOIN information_schema.routines existing
    ON existing.routine_name = required.required_function
    AND existing.routine_schema = 'public'
ORDER BY
    CASE WHEN existing.routine_name IS NULL THEN 0 ELSE 1 END,
    required_function;

-- ============================================
-- 8. CHECK ROW LEVEL SECURITY
-- ============================================

SELECT '--- RLS STATUS ---' as section;

SELECT
    tablename,
    CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'profiles', 'swipes', 'matches', 'messages',
    'job_posts', 'reviews', 'business_posts', 'post_likes', 'post_comments'
)
ORDER BY tablename;

-- ============================================
-- 9. CHECK DATA COUNTS
-- ============================================

SELECT '--- DATA COUNTS ---' as section;

SELECT 'profiles' as table_name, COUNT(*) as row_count FROM profiles
UNION ALL SELECT 'swipes', COUNT(*) FROM swipes
UNION ALL SELECT 'matches', COUNT(*) FROM matches
UNION ALL SELECT 'messages', COUNT(*) FROM messages
UNION ALL SELECT 'job_posts', COALESCE((SELECT COUNT(*) FROM job_posts), 0)
UNION ALL SELECT 'business_posts', COALESCE((SELECT COUNT(*) FROM business_posts), 0);

-- ============================================
-- 10. SUMMARY OF MISSING ITEMS
-- ============================================

SELECT '========================================' as info;
SELECT 'MISSING ITEMS SUMMARY' as info;
SELECT '========================================' as info;

-- Missing tables
SELECT 'MISSING TABLE: ' || required_table as missing_item
FROM (
    SELECT unnest(ARRAY[
        'profiles', 'swipes', 'matches', 'messages', 'job_posts',
        'job_applications', 'reviews', 'reports', 'blocks', 'badges',
        'user_badges', 'user_streaks', 'boosts', 'subscriptions',
        'business_posts', 'post_likes', 'post_comments', 'work_identities',
        'payments', 'active_calls'
    ]) as required_table
) required
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = required.required_table
    AND table_schema = 'public'
);

-- Missing profile columns
SELECT 'MISSING COLUMN profiles.' || required_column as missing_item
FROM (
    SELECT unnest(ARRAY[
        'has_seen_welcome', 'career_tier', 'auth_provider'
    ]) as required_column
) required
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE column_name = required.required_column
    AND table_name = 'profiles'
    AND table_schema = 'public'
);

SELECT '========================================' as info;
SELECT 'AUDIT COMPLETE - Share the output above' as info;
SELECT '========================================' as info;
