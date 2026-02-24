-- ============================================
-- KAAM DEU - TEST DATA SEEDING
-- ============================================
-- This script creates 5 workers and 5 businesses
-- to ensure the swipe feed is populated and functional.
-- ============================================

-- 1. Create Test Users in auth.users (This is usually done via API, but for dev we use triggers/inserts if possible)
-- However, we can just insert into public.profiles directly if we don't need real sign-in for these mock profiles.
-- The FeedScreen pulls from public.profiles.

-- Clear existing test data if needed
DELETE FROM profiles WHERE email LIKE '%@test.com';

-- WORKERS (5)
INSERT INTO profiles (
    id, email, role, name, phone, 
    is_profile_complete, verified, verification_score,
    job_title, bio, skills, experience_years,
    expected_salary_min, expected_salary_max,
    current_location, photos, is_active
) VALUES 
(
    '00000000-0000-0000-0000-000000000001', 'ram@test.com', 'worker', 'Ram Bahadur', '9841000001',
    TRUE, TRUE, 95,
    'Plumber', 'Experienced plumber with 10 years in residential work. Available for quick fixes and large contracts.', 
    ARRAY['Plumbing', 'Pipe fitting', 'Water heater repair'], 10,
    15000, 45000,
    'Kathmandu, Nepal', ARRAY['https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800'], TRUE
),
(
    '00000000-0000-0000-0000-000000000002', 'sita@test.com', 'worker', 'Sita Kumari', '9841000002',
    TRUE, TRUE, 88,
    'Content Writer', 'Creative content writer specialized in tech and lifestyle. Passionate about storytelling.', 
    ARRAY['Copywriting', 'SEO', 'Blog writing'], 4,
    30000, 60000,
    'Lalitpur, Nepal', ARRAY['https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=800'], TRUE
),
(
    '00000000-0000-0000-0000-000000000003', 'hari@test.com', 'worker', 'Hari Prasad', '9841000003',
    TRUE, FALSE, 40,
    'Delivery Rider', 'Reliable rider with own bike. Familiar with all routes in Kathmandu Valley.', 
    ARRAY['Driving', 'Navigation', 'Punctuality'], 2,
    12000, 25000,
    'Bhaktapur, Nepal', ARRAY['https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=800'], TRUE
),
(
    '00000000-0000-0000-0000-000000000004', 'anisha@test.com', 'worker', 'Anisha Thapa', '9841000004',
    TRUE, TRUE, 92,
    'Graphic Designer', 'UI/UX enthusiast. I create high-converting social media ads and website designs.', 
    ARRAY['Figma', 'Photoshop', 'Branding'], 6,
    40000, 85000,
    'Pokhara, Nepal', ARRAY['https://images.unsplash.com/photo-1534528741775-53994a428c40?q=80&w=800'], TRUE
),
(
    '00000000-0000-0000-0000-000000000005', 'binod@test.com', 'worker', 'Binod Chaudhary', '9841000005',
    TRUE, TRUE, 99,
    'Senior Developer', 'Full stack engineer with a heavy focus on React and Node.js. Looking for long-term projects.', 
    ARRAY['React', 'Node.js', 'Typescript', 'PostgreSQL'], 8,
    150000, 300000,
    'Kathmandu, Nepal', ARRAY['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800'], TRUE
);

-- BUSINESSES (5)
INSERT INTO profiles (
    id, email, role, company_name, industry,
    is_profile_complete, is_verified_business,
    description, website, logo_url, is_active
) VALUES 
(
    '00000000-0000-0000-0000-000000000006', 'hr@techhub.com', 'business', 'TechHub Nepal', 'IT Services',
    TRUE, TRUE,
    'Leading software dev house in Kathmandu. We are always hiring talented engineers.', 
    'https://techhub.com.np', 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?q=80&w=400', TRUE
),
(
    '00000000-0000-0000-0000-000000000007', 'jobs@hamro-hotel.com', 'business', 'Hamro Hotel', 'Hospitality',
    TRUE, TRUE,
    '5-star luxury hotel in the heart of the city. Looking for skilled staff and management.', 
    'https://hamrohotel.com', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400', TRUE
),
(
    '00000000-0000-0000-0000-000000000008', 'info@nepal-builders.com', 'business', 'Nepal Builders', 'Construction',
    TRUE, FALSE,
    'Involved in major infrastructure projects across Nepal. Reliable workforce needed.', 
    'https://nepalbuilders.com', 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=400', TRUE
),
(
    '00000000-0000-0000-0000-000000000009', 'creative@ads.com', 'business', 'Creative Ads', 'Marketing',
    TRUE, TRUE,
    'Full-service marketing agency. We need designers and copywriters for upcoming campaigns.', 
    'https://creativeads.com', 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=400', TRUE
),
(
    '00000000-0000-0000-0000-000000000010', 'admin@mart.com', 'business', 'Super Mart', 'Retail',
    TRUE, TRUE,
    'Fast-growing retail chain. Hiring cashiers, stockers, and managers.', 
    'https://supermart.com', 'https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?q=80&w=400', TRUE
);
