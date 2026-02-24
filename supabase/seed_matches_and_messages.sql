-- ============================================
-- SEED MATCHES AND MESSAGES
-- Run this in Supabase SQL Editor to create test data
-- ============================================

-- First, let's get the user IDs
DO $$
DECLARE
    worker1_id UUID;
    worker2_id UUID;
    worker3_id UUID;
    worker4_id UUID;
    worker5_id UUID;
    business1_id UUID;
    business2_id UUID;
    business3_id UUID;
    business4_id UUID;
    business5_id UUID;
    match1_id UUID;
    match2_id UUID;
    match3_id UUID;
    match4_id UUID;
    match5_id UUID;
    match6_id UUID;
    sorted_id1 UUID;
    sorted_id2 UUID;
BEGIN
    -- Get worker IDs
    SELECT id INTO worker1_id FROM profiles WHERE email = 'worker1@example.com';
    SELECT id INTO worker2_id FROM profiles WHERE email = 'worker2@example.com';
    SELECT id INTO worker3_id FROM profiles WHERE email = 'worker3@example.com';
    SELECT id INTO worker4_id FROM profiles WHERE email = 'worker4@example.com';
    SELECT id INTO worker5_id FROM profiles WHERE email = 'worker5@example.com';

    -- Get business IDs
    SELECT id INTO business1_id FROM profiles WHERE email = 'business1@example.com';
    SELECT id INTO business2_id FROM profiles WHERE email = 'business2@example.com';
    SELECT id INTO business3_id FROM profiles WHERE email = 'business3@example.com';
    SELECT id INTO business4_id FROM profiles WHERE email = 'business4@example.com';
    SELECT id INTO business5_id FROM profiles WHERE email = 'business5@example.com';

    RAISE NOTICE 'Found workers: %, %, %, %, %', worker1_id, worker2_id, worker3_id, worker4_id, worker5_id;
    RAISE NOTICE 'Found businesses: %, %, %, %, %', business1_id, business2_id, business3_id, business4_id, business5_id;

    -- Only proceed if we have users
    IF worker1_id IS NOT NULL AND business1_id IS NOT NULL THEN

        -- ============================================
        -- CREATE SWIPES (both directions for matches)
        -- ============================================

        -- Match 1: worker1 <-> business1
        INSERT INTO swipes (swiper_id, swiped_id, direction)
        VALUES (worker1_id, business1_id, 'right') ON CONFLICT DO NOTHING;
        INSERT INTO swipes (swiper_id, swiped_id, direction)
        VALUES (business1_id, worker1_id, 'right') ON CONFLICT DO NOTHING;

        -- Match 2: worker1 <-> business2
        INSERT INTO swipes (swiper_id, swiped_id, direction)
        VALUES (worker1_id, business2_id, 'right') ON CONFLICT DO NOTHING;
        INSERT INTO swipes (swiper_id, swiped_id, direction)
        VALUES (business2_id, worker1_id, 'right') ON CONFLICT DO NOTHING;

        -- Match 3: worker2 <-> business1
        INSERT INTO swipes (swiper_id, swiped_id, direction)
        VALUES (worker2_id, business1_id, 'right') ON CONFLICT DO NOTHING;
        INSERT INTO swipes (swiper_id, swiped_id, direction)
        VALUES (business1_id, worker2_id, 'right') ON CONFLICT DO NOTHING;

        -- Match 4: worker3 <-> business3
        INSERT INTO swipes (swiper_id, swiped_id, direction)
        VALUES (worker3_id, business3_id, 'right') ON CONFLICT DO NOTHING;
        INSERT INTO swipes (swiper_id, swiped_id, direction)
        VALUES (business3_id, worker3_id, 'right') ON CONFLICT DO NOTHING;

        -- Match 5: worker4 <-> business4
        INSERT INTO swipes (swiper_id, swiped_id, direction)
        VALUES (worker4_id, business4_id, 'right') ON CONFLICT DO NOTHING;
        INSERT INTO swipes (swiper_id, swiped_id, direction)
        VALUES (business4_id, worker4_id, 'right') ON CONFLICT DO NOTHING;

        -- Match 6: worker5 <-> business5
        INSERT INTO swipes (swiper_id, swiped_id, direction)
        VALUES (worker5_id, business5_id, 'right') ON CONFLICT DO NOTHING;
        INSERT INTO swipes (swiper_id, swiped_id, direction)
        VALUES (business5_id, worker5_id, 'right') ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Created swipes';

        -- ============================================
        -- CREATE MATCHES (sorted user IDs)
        -- ============================================

        -- Match 1: worker1 <-> business1
        SELECT LEAST(worker1_id, business1_id), GREATEST(worker1_id, business1_id) INTO sorted_id1, sorted_id2;
        INSERT INTO matches (user1_id, user2_id, is_active)
        VALUES (sorted_id1, sorted_id2, true)
        ON CONFLICT DO NOTHING
        RETURNING id INTO match1_id;

        -- Match 2: worker1 <-> business2
        SELECT LEAST(worker1_id, business2_id), GREATEST(worker1_id, business2_id) INTO sorted_id1, sorted_id2;
        INSERT INTO matches (user1_id, user2_id, is_active)
        VALUES (sorted_id1, sorted_id2, true)
        ON CONFLICT DO NOTHING
        RETURNING id INTO match2_id;

        -- Match 3: worker2 <-> business1
        SELECT LEAST(worker2_id, business1_id), GREATEST(worker2_id, business1_id) INTO sorted_id1, sorted_id2;
        INSERT INTO matches (user1_id, user2_id, is_active)
        VALUES (sorted_id1, sorted_id2, true)
        ON CONFLICT DO NOTHING
        RETURNING id INTO match3_id;

        -- Match 4: worker3 <-> business3
        SELECT LEAST(worker3_id, business3_id), GREATEST(worker3_id, business3_id) INTO sorted_id1, sorted_id2;
        INSERT INTO matches (user1_id, user2_id, is_active)
        VALUES (sorted_id1, sorted_id2, true)
        ON CONFLICT DO NOTHING
        RETURNING id INTO match4_id;

        -- Match 5: worker4 <-> business4
        SELECT LEAST(worker4_id, business4_id), GREATEST(worker4_id, business4_id) INTO sorted_id1, sorted_id2;
        INSERT INTO matches (user1_id, user2_id, is_active)
        VALUES (sorted_id1, sorted_id2, true)
        ON CONFLICT DO NOTHING
        RETURNING id INTO match5_id;

        -- Match 6: worker5 <-> business5
        SELECT LEAST(worker5_id, business5_id), GREATEST(worker5_id, business5_id) INTO sorted_id1, sorted_id2;
        INSERT INTO matches (user1_id, user2_id, is_active)
        VALUES (sorted_id1, sorted_id2, true)
        ON CONFLICT DO NOTHING
        RETURNING id INTO match6_id;

        RAISE NOTICE 'Created matches';

        -- ============================================
        -- ADD SAMPLE MESSAGES
        -- ============================================

        -- Get match IDs if they weren't returned (already existed)
        IF match1_id IS NULL THEN
            SELECT LEAST(worker1_id, business1_id), GREATEST(worker1_id, business1_id) INTO sorted_id1, sorted_id2;
            SELECT id INTO match1_id FROM matches WHERE user1_id = sorted_id1 AND user2_id = sorted_id2;
        END IF;

        IF match2_id IS NULL THEN
            SELECT LEAST(worker1_id, business2_id), GREATEST(worker1_id, business2_id) INTO sorted_id1, sorted_id2;
            SELECT id INTO match2_id FROM matches WHERE user1_id = sorted_id1 AND user2_id = sorted_id2;
        END IF;

        IF match3_id IS NULL THEN
            SELECT LEAST(worker2_id, business1_id), GREATEST(worker2_id, business1_id) INTO sorted_id1, sorted_id2;
            SELECT id INTO match3_id FROM matches WHERE user1_id = sorted_id1 AND user2_id = sorted_id2;
        END IF;

        -- Messages for Match 1 (worker1 <-> business1)
        IF match1_id IS NOT NULL THEN
            INSERT INTO messages (match_id, sender_id, content, message_type, is_read, created_at) VALUES
            (match1_id, worker1_id, 'Hi! I saw your company profile and I am very interested in working with you.', 'text', true, NOW() - INTERVAL '2 hours'),
            (match1_id, business1_id, 'Hello! Thanks for reaching out. We have several positions available. What role interests you?', 'text', true, NOW() - INTERVAL '1 hour 50 minutes'),
            (match1_id, worker1_id, 'I am looking for a full-time position. I have experience in customer service and sales.', 'text', true, NOW() - INTERVAL '1 hour 30 minutes'),
            (match1_id, business1_id, 'That sounds great! When would you be available for an interview?', 'text', false, NOW() - INTERVAL '30 minutes')
            ON CONFLICT DO NOTHING;
            RAISE NOTICE 'Added messages to match 1';
        END IF;

        -- Messages for Match 2 (worker1 <-> business2)
        IF match2_id IS NOT NULL THEN
            INSERT INTO messages (match_id, sender_id, content, message_type, is_read, created_at) VALUES
            (match2_id, business2_id, 'Hi! We noticed your profile. Are you currently looking for opportunities?', 'text', true, NOW() - INTERVAL '1 day'),
            (match2_id, worker1_id, 'Yes, I am actively looking. What positions do you have?', 'text', true, NOW() - INTERVAL '23 hours'),
            (match2_id, business2_id, 'We need someone for our marketing team. Are you interested?', 'text', false, NOW() - INTERVAL '20 hours')
            ON CONFLICT DO NOTHING;
            RAISE NOTICE 'Added messages to match 2';
        END IF;

        -- Messages for Match 3 (worker2 <-> business1)
        IF match3_id IS NOT NULL THEN
            INSERT INTO messages (match_id, sender_id, content, message_type, is_read, created_at) VALUES
            (match3_id, worker2_id, 'Hello! I would love to learn more about opportunities at your company.', 'text', true, NOW() - INTERVAL '3 hours'),
            (match3_id, business1_id, 'Hi there! Thanks for connecting. Can you tell me about your experience?', 'text', false, NOW() - INTERVAL '2 hours')
            ON CONFLICT DO NOTHING;
            RAISE NOTICE 'Added messages to match 3';
        END IF;

        RAISE NOTICE 'Seeding complete!';

    ELSE
        RAISE NOTICE 'Could not find test users. Please run the seed_users script first.';
    END IF;
END $$;

-- ============================================
-- VERIFY THE DATA
-- ============================================

SELECT 'SWIPES' as table_name, COUNT(*) as count FROM swipes
UNION ALL
SELECT 'MATCHES', COUNT(*) FROM matches
UNION ALL
SELECT 'MESSAGES', COUNT(*) FROM messages;

-- Show matches with user emails
SELECT
    m.id as match_id,
    p1.email as user1_email,
    p2.email as user2_email,
    m.is_active,
    m.created_at
FROM matches m
JOIN profiles p1 ON m.user1_id = p1.id
JOIN profiles p2 ON m.user2_id = p2.id
ORDER BY m.created_at DESC;

-- Show messages
SELECT
    msg.id,
    p.email as sender,
    LEFT(msg.content, 50) as message_preview,
    msg.is_read,
    msg.created_at
FROM messages msg
JOIN profiles p ON msg.sender_id = p.id
ORDER BY msg.created_at DESC
LIMIT 10;
