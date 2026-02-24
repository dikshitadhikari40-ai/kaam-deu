-- ============================================
-- CHECK AND FIX MATCH FOR BUSINESS1
-- Run this to see what's happening
-- ============================================

-- Step 1: Check if users exist
SELECT '=== CHECKING USERS ===' as info;

SELECT 
    id,
    email,
    role,
    name,
    is_profile_complete,
    created_at
FROM profiles 
WHERE email IN ('business1@example.com', 'worker1@example.com', 'worker2@example.com', 'worker3@example.com')
ORDER BY email;

-- Step 2: Check existing matches
SELECT '=== EXISTING MATCHES ===' as info;

SELECT 
    m.id as match_id,
    p1.email as user1_email,
    p1.role as user1_role,
    p1.id as user1_id,
    p2.email as user2_email,
    p2.role as user2_role,
    p2.id as user2_id,
    m.is_active,
    m.matched_at,
    m.created_at
FROM matches m
JOIN profiles p1 ON m.user1_id = p1.id
JOIN profiles p2 ON m.user2_id = p2.id
WHERE p1.email = 'business1@example.com' OR p2.email = 'business1@example.com';

-- Step 3: Check swipes
SELECT '=== EXISTING SWIPES ===' as info;

SELECT 
    s.id,
    p1.email as swiper_email,
    p2.email as swiped_email,
    s.direction,
    s.created_at
FROM swipes s
JOIN profiles p1 ON s.swiper_id = p1.id
JOIN profiles p2 ON s.swiped_id = p2.id
WHERE p1.email = 'business1@example.com' OR p2.email = 'business1@example.com'
ORDER BY s.created_at DESC;

-- Step 4: Now create/fix the match
SELECT '=== CREATING/FIXING MATCH ===' as info;

DO $$
DECLARE
    business1_id UUID;
    worker_id UUID;
    match_id UUID;
    id1 UUID;
    id2 UUID;
    existing_match UUID;
BEGIN
    -- Get business1 ID
    SELECT id INTO business1_id 
    FROM profiles 
    WHERE email = 'business1@example.com' AND role = 'business';
    
    RAISE NOTICE 'Business1 ID: %', business1_id;
    
    IF business1_id IS NULL THEN
        RAISE NOTICE 'ERROR: business1@example.com not found!';
        RAISE NOTICE 'Please create the account first or check the email.';
        RETURN;
    END IF;
    
    -- Get any worker ID
    SELECT id INTO worker_id 
    FROM profiles 
    WHERE role = 'worker' 
    ORDER BY created_at ASC
    LIMIT 1;
    
    RAISE NOTICE 'Worker ID: %', worker_id;
    
    IF worker_id IS NULL THEN
        RAISE NOTICE 'ERROR: No worker accounts found!';
        RETURN;
    END IF;
    
    -- Delete any existing swipes between them
    DELETE FROM swipes 
    WHERE (swiper_id = business1_id AND swiped_id = worker_id)
       OR (swiper_id = worker_id AND swiped_id = business1_id);
    
    -- Create new swipes (both swipe right = match)
    INSERT INTO swipes (swiper_id, swiped_id, direction, created_at) 
    VALUES 
        (business1_id, worker_id, 'right', NOW()),
        (worker_id, business1_id, 'right', NOW())
    ON CONFLICT (swiper_id, swiped_id) DO UPDATE SET direction = 'right';
    
    RAISE NOTICE 'Created swipes';
    
    -- Create match (sorted IDs to avoid duplicates)
    SELECT LEAST(business1_id, worker_id), GREATEST(business1_id, worker_id) INTO id1, id2;
    
    -- Check if match already exists
    SELECT id INTO existing_match
    FROM matches
    WHERE user1_id = id1 AND user2_id = id2;
    
    IF existing_match IS NOT NULL THEN
        -- Update existing match to be active
        UPDATE matches 
        SET is_active = true, matched_at = NOW()
        WHERE id = existing_match;
        match_id := existing_match;
        RAISE NOTICE 'Updated existing match: %', match_id;
    ELSE
        -- Create new match
        INSERT INTO matches (user1_id, user2_id, is_active, matched_at, created_at) 
        VALUES (id1, id2, true, NOW(), NOW())
        RETURNING id INTO match_id;
        RAISE NOTICE 'Created new match: %', match_id;
    END IF;
    
    -- Delete old messages and create fresh ones
    DELETE FROM messages WHERE match_id = match_id;
    
    -- Add sample messages
    INSERT INTO messages (match_id, sender_id, content, message_type, is_read, created_at) VALUES
    (match_id, worker_id, 'Hi! I saw your job posting and I am very interested. I have 5 years of experience in this field.', 'text', true, NOW() - INTERVAL '2 hours'),
    (match_id, business1_id, 'Hello! Thanks for reaching out. Can you tell me more about your availability?', 'text', true, NOW() - INTERVAL '1 hour'),
    (match_id, worker_id, 'I am available full-time and can start immediately. Would you like to schedule a call?', 'text', false, NOW() - INTERVAL '30 minutes'),
    (match_id, business1_id, 'That sounds great! Yes, let''s schedule a video call to discuss further.', 'text', false, NOW() - INTERVAL '10 minutes');
    
    RAISE NOTICE 'Added messages';
    RAISE NOTICE 'SUCCESS! Match ID: %', match_id;
    
END $$;

-- Step 5: Verify the match was created
SELECT '=== VERIFICATION ===' as info;

SELECT 
    m.id as match_id,
    p1.email as user1_email,
    p1.id as user1_id,
    p2.email as user2_email,
    p2.id as user2_id,
    m.is_active,
    m.matched_at,
    (SELECT COUNT(*) FROM messages WHERE match_id = m.id) as message_count
FROM matches m
JOIN profiles p1 ON m.user1_id = p1.id
JOIN profiles p2 ON m.user2_id = p2.id
WHERE p1.email = 'business1@example.com' OR p2.email = 'business1@example.com';

-- Step 6: Show messages
SELECT '=== MESSAGES ===' as info;

SELECT 
    p.email as sender_email,
    p.role as sender_role,
    msg.content,
    msg.message_type,
    msg.is_read,
    msg.created_at
FROM messages msg
JOIN profiles p ON msg.sender_id = p.id
JOIN matches m ON msg.match_id = m.id
WHERE m.user1_id IN (SELECT id FROM profiles WHERE email = 'business1@example.com')
   OR m.user2_id IN (SELECT id FROM profiles WHERE email = 'business1@example.com')
ORDER BY msg.created_at ASC;
