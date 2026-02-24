-- ============================================
-- CHECK WHAT'S MISSING IN YOUR DATABASE
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. MISSING TABLES
SELECT 'MISSING TABLE: ' || t.name AS missing_item
FROM (VALUES
    ('profiles'), ('swipes'), ('matches'), ('messages'),
    ('job_posts'), ('job_applications'), ('reviews'), ('reports'),
    ('blocks'), ('badges'), ('user_badges'), ('user_streaks'),
    ('boosts'), ('subscriptions'), ('business_posts'), ('post_likes'),
    ('post_comments'), ('work_identities'), ('payments'), ('active_calls')
) AS t(name)
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = t.name
)

UNION ALL

-- 2. MISSING COLUMNS IN PROFILES
SELECT 'MISSING COLUMN profiles.' || c.name
FROM (VALUES
    ('has_seen_welcome'), ('career_tier'), ('auth_provider'),
    ('google_uid'), ('linkedin_uid')
) AS c(name)
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles')
AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = c.name
)

UNION ALL

-- 3. MISSING COLUMNS IN MESSAGES
SELECT 'MISSING COLUMN messages.' || c.name
FROM (VALUES
    ('media_url'), ('message_type')
) AS c(name)
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages')
AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = c.name
)

UNION ALL

-- 4. MISSING FUNCTIONS
SELECT 'MISSING FUNCTION: ' || f.name
FROM (VALUES
    ('increment_likes'), ('decrement_likes'),
    ('increment_comments'), ('decrement_comments'),
    ('handle_new_user'), ('check_for_match')
) AS f(name)
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_name = f.name
)

ORDER BY 1;

-- ============================================
-- SHOW CURRENT DATA COUNTS
-- ============================================
SELECT '--- DATA COUNTS ---' as info;

SELECT 'profiles: ' || COUNT(*)::text FROM profiles
UNION ALL SELECT 'swipes: ' || COUNT(*)::text FROM swipes
UNION ALL SELECT 'matches: ' || COUNT(*)::text FROM matches
UNION ALL SELECT 'messages: ' || COUNT(*)::text FROM messages;
