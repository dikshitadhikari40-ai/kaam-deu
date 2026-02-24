-- ============================================
-- FIX MATCH FOR BUSINESS1 - COPY PASTE THIS ENTIRE SCRIPT
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Check if users exist
SELECT '=== CHECKING USERS ===' as step;

SELECT 
    id as profile_id,
    email,
    role,
    name
FROM profiles 
WHERE email IN ('business1@example.com', 'worker1@example.com', 'worker2@example.com', 'worker3@example.com')
ORDER BY email;

-- Step 2: Create the match (this does everything)
DO $$
DECLARE
    business1_id UUID;
    worker_id UUID;
    match_id UUID;
    id1 UUID;
    id2 UUID;
BEGIN
    -- Get business1 profile ID (this should match auth.users.id)
    SELECT id INTO business1_id 
    FROM profiles 
    WHERE email = 'business1@example.com' AND role = 'business';
    
    -- Get any worker profile ID
    SELECT id INTO worker_id 
    FROM profiles 
    WHERE email = 'worker1@example.com' AND role = 'worker';
    
    -- If worker1 doesn't exist, get first available worker
    IF worker_id IS NULL THEN
        SELECT id INTO worker_id 
        FROM profiles 
        WHERE role = 'worker' 
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;
    
    -- Check if users exist
    IF business1_id IS NULL THEN
        RAISE NOTICE 'ERROR: business1@example.com not found!';
        RAISE NOTICE 'Please make sure you have created this account.';
        RETURN;
    END IF;
    
    IF worker_id IS NULL THEN
        RAISE NOTICE 'ERROR: No worker accounts found!';
        RAISE NOTICE 'Please create a worker account first.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Business1 ID: %', business1_id;
    RAISE NOTICE 'Worker ID: %', worker_id;
    
    -- Delete existing swipes
    DELETE FROM swipes 
    WHERE (swiper_id = business1_id AND swiped_id = worker_id)
       OR (swiper_id = worker_id AND swiped_id = business1_id);
    
    -- Create swipes (both swipe right = match)
    INSERT INTO swipes (swiper_id, swiped_id, direction, created_at) 
    VALUES 
        (business1_id, worker_id, 'right', NOW()),
        (worker_id, business1_id, 'right', NOW())
    ON CONFLICT (swiper_id, swiped_id) DO UPDATE SET direction = 'right', created_at = NOW();
    
    RAISE NOTICE 'Created swipes';
    
    -- Create match with sorted IDs (important: user1_id < user2_id)
    SELECT LEAST(business1_id, worker_id), GREATEST(business1_id, worker_id) INTO id1, id2;
    
    -- Delete old match if exists
    DELETE FROM matches WHERE user1_id = id1 AND user2_id = id2;
    
    -- Create new match
    INSERT INTO matches (user1_id, user2_id, is_active, matched_at, created_at) 
    VALUES (id1, id2, true, NOW(), NOW())
    RETURNING id INTO match_id;
    
    RAISE NOTICE 'Created match: %', match_id;
    
    -- Delete old messages
    DELETE FROM messages WHERE match_id = match_id;
    
    -- Add sample messages
    INSERT INTO messages (match_id, sender_id, content, message_type, is_read, created_at) VALUES
    (match_id, worker_id, 'Hi! I saw your job posting and I am very interested. I have 5 years of experience in this field.', 'text', true, NOW() - INTERVAL '2 hours'),
    (match_id, business1_id, 'Hello! Thanks for reaching out. Can you tell me more about your availability?', 'text', true, NOW() - INTERVAL '1 hour'),
    (match_id, worker_id, 'I am available full-time and can start immediately. Would you like to schedule a call?', 'text', false, NOW() - INTERVAL '30 minutes'),
    (match_id, business1_id, 'That sounds great! Yes, let''s schedule a video call to discuss further.', 'text', false, NOW() - INTERVAL '10 minutes');
    
    RAISE NOTICE 'Added 4 messages';
    RAISE NOTICE 'SUCCESS! Match is ready. Refresh your app!';
    
END $$;

-- Step 3: Verify the match exists
SELECT '=== VERIFICATION ===' as step;

SELECT 
    m.id as match_id,
    m.user1_id,
    m.user2_id,
    p1.email as user1_email,
    p1.role as user1_role,
    p2.email as user2_email,
    p2.role as user2_role,
    m.is_active,
    m.matched_at,
    (SELECT COUNT(*) FROM messages WHERE match_id = m.id) as message_count
FROM matches m
JOIN profiles p1 ON m.user1_id = p1.id
JOIN profiles p2 ON m.user2_id = p2.id
WHERE p1.email = 'business1@example.com' OR p2.email = 'business1@example.com';

-- Step 4: Test the query the app uses
SELECT '=== APP QUERY TEST ===' as step;

-- This is what the app does: .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
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
WHERE (m.user1_id = (SELECT id FROM profiles WHERE email = 'business1@example.com')
   OR m.user2_id = (SELECT id FROM profiles WHERE email = 'business1@example.com'))
  AND m.is_active = true;

-- Step 5: Show messages
SELECT '=== MESSAGES ===' as step;

SELECT 
    p.email as sender,
    LEFT(msg.content, 60) as message,
    msg.is_read,
    msg.created_at
FROM messages msg
JOIN profiles p ON msg.sender_id = p.id
JOIN matches m ON msg.match_id = m.id
WHERE m.user1_id = (SELECT id FROM profiles WHERE email = 'business1@example.com')
   OR m.user2_id = (SELECT id FROM profiles WHERE email = 'business1@example.com')
ORDER BY msg.created_at ASC;

SELECT '=== DONE! ===' as final;
SELECT 'Now refresh your app (pull down to refresh) and check the Messages/Chat page' as next_step;
