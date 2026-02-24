-- ============================================
-- CREATE TEST MATCHES AND MESSAGES
-- Run this in Supabase SQL Editor
-- ============================================

-- First, let's see what users we have
SELECT 'EXISTING USERS:' as info;
SELECT id, email, role, name, is_profile_complete FROM profiles ORDER BY created_at;

-- Get user IDs into variables and create matches
DO $$
DECLARE
    w1 UUID; w2 UUID; w3 UUID; w4 UUID; w5 UUID;
    b1 UUID; b2 UUID; b3 UUID; b4 UUID; b5 UUID;
    m1 UUID; m2 UUID; m3 UUID;
    id1 UUID; id2 UUID;
BEGIN
    -- Get worker IDs
    SELECT id INTO w1 FROM profiles WHERE email = 'worker1@example.com';
    SELECT id INTO w2 FROM profiles WHERE email = 'worker2@example.com';
    SELECT id INTO w3 FROM profiles WHERE email = 'worker3@example.com';
    SELECT id INTO w4 FROM profiles WHERE email = 'worker4@example.com';
    SELECT id INTO w5 FROM profiles WHERE email = 'worker5@example.com';

    -- Get business IDs
    SELECT id INTO b1 FROM profiles WHERE email = 'business1@example.com';
    SELECT id INTO b2 FROM profiles WHERE email = 'business2@example.com';
    SELECT id INTO b3 FROM profiles WHERE email = 'business3@example.com';
    SELECT id INTO b4 FROM profiles WHERE email = 'business4@example.com';
    SELECT id INTO b5 FROM profiles WHERE email = 'business5@example.com';

    RAISE NOTICE 'Workers: %, %, %, %, %', w1, w2, w3, w4, w5;
    RAISE NOTICE 'Businesses: %, %, %, %, %', b1, b2, b3, b4, b5;

    IF w1 IS NULL OR b1 IS NULL THEN
        RAISE NOTICE 'Test users not found! Please create them first.';
        RETURN;
    END IF;

    -- Create swipes (both directions = match)
    -- worker1 <-> business1
    INSERT INTO swipes (swiper_id, swiped_id, direction) VALUES (w1, b1, 'right') ON CONFLICT DO NOTHING;
    INSERT INTO swipes (swiper_id, swiped_id, direction) VALUES (b1, w1, 'right') ON CONFLICT DO NOTHING;

    -- worker1 <-> business2
    INSERT INTO swipes (swiper_id, swiped_id, direction) VALUES (w1, b2, 'right') ON CONFLICT DO NOTHING;
    INSERT INTO swipes (swiper_id, swiped_id, direction) VALUES (b2, w1, 'right') ON CONFLICT DO NOTHING;

    -- worker2 <-> business1
    INSERT INTO swipes (swiper_id, swiped_id, direction) VALUES (w2, b1, 'right') ON CONFLICT DO NOTHING;
    INSERT INTO swipes (swiper_id, swiped_id, direction) VALUES (b1, w2, 'right') ON CONFLICT DO NOTHING;

    -- worker3 <-> business3
    INSERT INTO swipes (swiper_id, swiped_id, direction) VALUES (w3, b3, 'right') ON CONFLICT DO NOTHING;
    INSERT INTO swipes (swiper_id, swiped_id, direction) VALUES (b3, w3, 'right') ON CONFLICT DO NOTHING;

    -- worker4 <-> business4
    INSERT INTO swipes (swiper_id, swiped_id, direction) VALUES (w4, b4, 'right') ON CONFLICT DO NOTHING;
    INSERT INTO swipes (swiper_id, swiped_id, direction) VALUES (b4, w4, 'right') ON CONFLICT DO NOTHING;

    -- worker5 <-> business5
    INSERT INTO swipes (swiper_id, swiped_id, direction) VALUES (w5, b5, 'right') ON CONFLICT DO NOTHING;
    INSERT INTO swipes (swiper_id, swiped_id, direction) VALUES (b5, w5, 'right') ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created swipes';

    -- Create matches (sorted IDs)
    -- Match 1: worker1 <-> business1
    SELECT LEAST(w1, b1), GREATEST(w1, b1) INTO id1, id2;
    INSERT INTO matches (user1_id, user2_id, is_active) VALUES (id1, id2, true) ON CONFLICT DO NOTHING RETURNING id INTO m1;
    IF m1 IS NULL THEN SELECT id INTO m1 FROM matches WHERE user1_id = id1 AND user2_id = id2; END IF;

    -- Match 2: worker1 <-> business2
    SELECT LEAST(w1, b2), GREATEST(w1, b2) INTO id1, id2;
    INSERT INTO matches (user1_id, user2_id, is_active) VALUES (id1, id2, true) ON CONFLICT DO NOTHING RETURNING id INTO m2;
    IF m2 IS NULL THEN SELECT id INTO m2 FROM matches WHERE user1_id = id1 AND user2_id = id2; END IF;

    -- Match 3: worker2 <-> business1
    SELECT LEAST(w2, b1), GREATEST(w2, b1) INTO id1, id2;
    INSERT INTO matches (user1_id, user2_id, is_active) VALUES (id1, id2, true) ON CONFLICT DO NOTHING RETURNING id INTO m3;
    IF m3 IS NULL THEN SELECT id INTO m3 FROM matches WHERE user1_id = id1 AND user2_id = id2; END IF;

    -- Match 4: worker3 <-> business3
    SELECT LEAST(w3, b3), GREATEST(w3, b3) INTO id1, id2;
    INSERT INTO matches (user1_id, user2_id, is_active) VALUES (id1, id2, true) ON CONFLICT DO NOTHING;

    -- Match 5: worker4 <-> business4
    SELECT LEAST(w4, b4), GREATEST(w4, b4) INTO id1, id2;
    INSERT INTO matches (user1_id, user2_id, is_active) VALUES (id1, id2, true) ON CONFLICT DO NOTHING;

    -- Match 6: worker5 <-> business5
    SELECT LEAST(w5, b5), GREATEST(w5, b5) INTO id1, id2;
    INSERT INTO matches (user1_id, user2_id, is_active) VALUES (id1, id2, true) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created matches';

    -- Add messages to first 3 matches
    IF m1 IS NOT NULL THEN
        INSERT INTO messages (match_id, sender_id, content, message_type, is_read, created_at) VALUES
        (m1, w1, 'Hi! I saw your company and I am interested.', 'text', true, NOW() - INTERVAL '2 hours'),
        (m1, b1, 'Hello! Thanks for connecting. What position interests you?', 'text', true, NOW() - INTERVAL '1 hour'),
        (m1, w1, 'I am looking for full-time work in customer service.', 'text', false, NOW() - INTERVAL '30 minutes');
        RAISE NOTICE 'Added messages to match 1';
    END IF;

    IF m2 IS NOT NULL THEN
        INSERT INTO messages (match_id, sender_id, content, message_type, is_read, created_at) VALUES
        (m2, b2, 'Hi! We have openings. Are you available?', 'text', true, NOW() - INTERVAL '1 day'),
        (m2, w1, 'Yes, I can start immediately!', 'text', false, NOW() - INTERVAL '12 hours');
        RAISE NOTICE 'Added messages to match 2';
    END IF;

    IF m3 IS NOT NULL THEN
        INSERT INTO messages (match_id, sender_id, content, message_type, is_read, created_at) VALUES
        (m3, w2, 'Hello! I would love to work with your company.', 'text', false, NOW() - INTERVAL '3 hours');
        RAISE NOTICE 'Added messages to match 3';
    END IF;

    RAISE NOTICE 'DONE! Test data created successfully.';
END $$;

-- Show results
SELECT '--- FINAL COUNTS ---' as info;
SELECT 'Swipes: ' || COUNT(*)::text FROM swipes;
SELECT 'Matches: ' || COUNT(*)::text FROM matches;
SELECT 'Messages: ' || COUNT(*)::text FROM messages;

-- Show matches
SELECT '--- MATCHES ---' as info;
SELECT
    m.id,
    p1.email as user1,
    p2.email as user2,
    m.created_at
FROM matches m
JOIN profiles p1 ON m.user1_id = p1.id
JOIN profiles p2 ON m.user2_id = p2.id;

-- Show messages
SELECT '--- MESSAGES ---' as info;
SELECT
    p.email as sender,
    LEFT(msg.content, 40) as message,
    msg.is_read,
    msg.created_at
FROM messages msg
JOIN profiles p ON msg.sender_id = p.id
ORDER BY msg.created_at DESC
LIMIT 10;
