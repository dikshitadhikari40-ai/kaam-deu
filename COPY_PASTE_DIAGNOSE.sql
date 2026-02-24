-- ============================================
-- DIAGNOSE MATCH ISSUE - COPY PASTE THIS
-- ============================================

-- Check if auth.users.id matches profiles.id
SELECT 
    au.id as auth_user_id,
    p.id as profile_id,
    p.email,
    CASE WHEN au.id = p.id THEN '✅ MATCH' ELSE '❌ MISMATCH' END as status
FROM auth.users au
JOIN profiles p ON au.id = p.id
WHERE p.email = 'business1@example.com';

-- Check the match
SELECT 
    m.id as match_id,
    m.user1_id,
    m.user2_id,
    m.is_active,
    p1.email as user1_email,
    p2.email as user2_email
FROM matches m
JOIN profiles p1 ON m.user1_id = p1.id
JOIN profiles p2 ON m.user2_id = p2.id
WHERE p1.email = 'business1@example.com' OR p2.email = 'business1@example.com';

-- Test RLS query (what app sees)
SELECT 
    m.id,
    m.user1_id,
    m.user2_id,
    m.is_active
FROM matches m
WHERE (m.user1_id = (SELECT id FROM profiles WHERE email = 'business1@example.com')
   OR m.user2_id = (SELECT id FROM profiles WHERE email = 'business1@example.com'))
  AND m.is_active = true;
