-- ============================================
-- CREATE MATCH FOR BUSINESS1 TO TEST MESSAGING & CALLS
-- Copy and paste this entire script into Supabase SQL Editor
-- ============================================

DO $$
DECLARE
    business1_id UUID;
    worker1_id UUID;
    match_id UUID;
    id1 UUID;
    id2 UUID;
BEGIN
    -- Get business1 ID
    SELECT id INTO business1_id 
    FROM profiles 
    WHERE email = 'business1@example.com' AND role = 'business';
    
    -- Get worker1 ID (or first available worker)
    SELECT id INTO worker1_id 
    FROM profiles 
    WHERE email = 'worker1@example.com' AND role = 'worker';
    
    -- If worker1 doesn't exist, get any worker
    IF worker1_id IS NULL THEN
        SELECT id INTO worker1_id 
        FROM profiles 
        WHERE role = 'worker' 
        LIMIT 1;
    END IF;
    
    -- Check if users exist
    IF business1_id IS NULL THEN
        RAISE NOTICE 'ERROR: business1@example.com not found!';
        RETURN;
    END IF;
    
    IF worker1_id IS NULL THEN
        RAISE NOTICE 'ERROR: No worker accounts found!';
        RETURN;
    END IF;
    
    -- Create swipes (both swipe right = match)
    INSERT INTO swipes (swiper_id, swiped_id, direction) 
    VALUES (business1_id, worker1_id, 'right') 
    ON CONFLICT (swiper_id, swiped_id) DO NOTHING;
    
    INSERT INTO swipes (swiper_id, swiped_id, direction) 
    VALUES (worker1_id, business1_id, 'right') 
    ON CONFLICT (swiper_id, swiped_id) DO NOTHING;
    
    -- Create match (sorted IDs to avoid duplicates)
    SELECT LEAST(business1_id, worker1_id), GREATEST(business1_id, worker1_id) INTO id1, id2;
    
    INSERT INTO matches (user1_id, user2_id, is_active, matched_at) 
    VALUES (id1, id2, true, NOW()) 
    ON CONFLICT (user1_id, user2_id) DO UPDATE SET is_active = true
    RETURNING id INTO match_id;
    
    -- If match already existed, get its ID
    IF match_id IS NULL THEN
        SELECT id INTO match_id 
        FROM matches 
        WHERE user1_id = id1 AND user2_id = id2;
    END IF;
    
    -- Add sample messages
    INSERT INTO messages (match_id, sender_id, content, message_type, is_read, created_at) VALUES
    (match_id, worker1_id, 'Hi! I saw your job posting and I am very interested. I have 5 years of experience in this field.', 'text', true, NOW() - INTERVAL '2 hours'),
    (match_id, business1_id, 'Hello! Thanks for reaching out. Can you tell me more about your availability?', 'text', true, NOW() - INTERVAL '1 hour'),
    (match_id, worker1_id, 'I am available full-time and can start immediately. Would you like to schedule a call?', 'text', false, NOW() - INTERVAL '30 minutes'),
    (match_id, business1_id, 'That sounds great! Yes, let''s schedule a video call to discuss further.', 'text', false, NOW() - INTERVAL '10 minutes')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'SUCCESS! Match created between business1 and worker1';
    
END $$;

-- Show the match
SELECT 
    m.id as match_id,
    p1.email as user1_email,
    p1.role as user1_role,
    p2.email as user2_email,
    p2.role as user2_role,
    m.matched_at,
    m.is_active
FROM matches m
JOIN profiles p1 ON m.user1_id = p1.id
JOIN profiles p2 ON m.user2_id = p2.id
WHERE p1.email = 'business1@example.com' OR p2.email = 'business1@example.com';

-- Show messages
SELECT 
    p.email as sender_email,
    p.role as sender_role,
    LEFT(msg.content, 60) as message_preview,
    msg.message_type,
    msg.is_read,
    msg.created_at
FROM messages msg
JOIN profiles p ON msg.sender_id = p.id
JOIN matches m ON msg.match_id = m.id
WHERE m.user1_id IN (SELECT id FROM profiles WHERE email = 'business1@example.com')
   OR m.user2_id IN (SELECT id FROM profiles WHERE email = 'business1@example.com')
ORDER BY msg.created_at ASC;
