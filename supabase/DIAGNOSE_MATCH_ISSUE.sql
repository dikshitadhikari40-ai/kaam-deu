-- ============================================
-- DIAGNOSE WHY MATCHES AREN'T SHOWING IN APP
-- Run this to see what's wrong
-- ============================================

-- Step 1: Check if auth.users.id matches profiles.id for business1
SELECT '=== STEP 1: CHECK AUTH vs PROFILES ===' as step;

SELECT 
    au.id as auth_user_id,
    p.id as profile_id,
    p.email,
    p.role,
    CASE WHEN au.id = p.id THEN '✅ MATCH' ELSE '❌ MISMATCH' END as status
FROM auth.users au
JOIN profiles p ON au.id = p.id
WHERE p.email = 'business1@example.com';

-- Step 2: Check the match exists and what IDs it uses
SELECT '=== STEP 2: CHECK MATCH ===' as step;

SELECT 
    m.id as match_id,
    m.user1_id,
    m.user2_id,
    m.is_active,
    p1.email as user1_email,
    p1.id as user1_profile_id,
    p2.email as user2_email,
    p2.id as user2_profile_id,
    (SELECT id FROM auth.users WHERE id = p1.id) as user1_auth_id,
    (SELECT id FROM auth.users WHERE id = p2.id) as user2_auth_id
FROM matches m
JOIN profiles p1 ON m.user1_id = p1.id
JOIN profiles p2 ON m.user2_id = p2.id
WHERE p1.email = 'business1@example.com' OR p2.email = 'business1@example.com';

-- Step 3: Test what auth.uid() would see (simulate RLS)
SELECT '=== STEP 3: TEST RLS QUERY ===' as step;

-- This simulates what the app query does with RLS
SELECT 
    m.id as match_id,
    m.user1_id,
    m.user2_id,
    m.is_active,
    p1.email as user1_email,
    p2.email as user2_email,
    CASE 
        WHEN m.user1_id = (SELECT id FROM profiles WHERE email = 'business1@example.com') THEN '✅ user1 matches'
        WHEN m.user2_id = (SELECT id FROM profiles WHERE email = 'business1@example.com') THEN '✅ user2 matches'
        ELSE '❌ No match'
    END as rls_check
FROM matches m
JOIN profiles p1 ON m.user1_id = p1.id
JOIN profiles p2 ON m.user2_id = p2.id
WHERE (m.user1_id = (SELECT id FROM profiles WHERE email = 'business1@example.com')
   OR m.user2_id = (SELECT id FROM profiles WHERE email = 'business1@example.com'))
  AND m.is_active = true;

-- Step 4: Check if RLS policies exist
SELECT '=== STEP 4: CHECK RLS POLICIES ===' as step;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'matches'
ORDER BY policyname;

-- Step 5: Show what the app query would return
SELECT '=== STEP 5: APP QUERY SIMULATION ===' as step;

-- This is exactly what the app does
WITH business1_auth_id AS (
    SELECT id FROM auth.users WHERE id = (SELECT id FROM profiles WHERE email = 'business1@example.com')
)
SELECT 
    m.id,
    m.user1_id,
    m.user2_id,
    m.is_active,
    m.created_at,
    p1.email as user1_email,
    p2.email as user2_email
FROM matches m
JOIN profiles p1 ON m.user1_id = p1.id
JOIN profiles p2 ON m.user2_id = p2.id
CROSS JOIN business1_auth_id b1
WHERE (m.user1_id = b1.id OR m.user2_id = b1.id)
  AND m.is_active = true;

SELECT '=== DIAGNOSIS COMPLETE ===' as final;
