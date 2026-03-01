-- ============================================
-- LEARNING RESOURCES - SUPABASE MIGRATION
-- Course tracking, click analytics, and affiliate management
-- ============================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- COURSES TABLE - Course catalog
-- ============================================
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail TEXT,
    platform TEXT NOT NULL CHECK (platform IN ('coursera', 'youtube', 'linkedin', 'edx', 'udemy', 'skillshare', 'khan_academy', 'pluralsight')),
    category TEXT NOT NULL CHECK (category IN ('technology', 'business', 'design', 'marketing', 'data_science', 'development', 'languages', 'soft_skills', 'entrepreneurship', 'finance')),
    level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced', 'all')) DEFAULT 'all',
    duration TEXT,
    rating DECIMAL(2,1),
    enrollments INTEGER DEFAULT 0,
    instructor TEXT,
    is_free BOOLEAN DEFAULT true,
    original_url TEXT NOT NULL,
    affiliate_url TEXT,
    tags TEXT[] DEFAULT '{}',
    affiliate_commission DECIMAL(5,2),
    tracking_id TEXT,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USER COURSES TABLE - Enrolled/Saved courses
-- ============================================
CREATE TABLE IF NOT EXISTS user_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    certificate_url TEXT,
    notes TEXT,

    UNIQUE(user_id, course_id)
);

-- ============================================
-- COURSE CLICKS TABLE - Affiliate tracking
-- ============================================
CREATE TABLE IF NOT EXISTS course_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    converted BOOLEAN DEFAULT false,
    commission_earned DECIMAL(10,2) DEFAULT 0
);

-- ============================================
-- AFFILIATE STATS TABLE - Partner earnings
-- ============================================
CREATE TABLE IF NOT EXISTS affiliate_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform TEXT NOT NULL,
    total_clicks INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    total_commission DECIMAL(10,2) DEFAULT 0,
    period_start DATE DEFAULT CURRENT_DATE,
    period_end DATE DEFAULT CURRENT_DATE + INTERVAL '30 days',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- User courses indexes
CREATE INDEX IF NOT EXISTS idx_user_courses_user_id ON user_courses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_courses_course_id ON user_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_user_courses_enrolled_at ON user_courses(enrolled_at DESC);

-- Course clicks indexes
CREATE INDEX IF NOT EXISTS idx_course_clicks_user_id ON course_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_course_clicks_course_id ON course_clicks(course_id);
CREATE INDEX IF NOT EXISTS idx_course_clicks_platform ON course_clicks(platform);
CREATE INDEX IF NOT EXISTS idx_course_clicks_clicked_at ON course_clicks(clicked_at DESC);

-- Courses indexes
CREATE INDEX IF NOT EXISTS idx_courses_platform ON courses(platform);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_featured ON courses(featured) WHERE featured = true;

-- Affiliate stats indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_stats_platform ON affiliate_stats(platform);
CREATE INDEX IF NOT EXISTS idx_affiliate_stats_period ON affiliate_stats(period_start, period_end);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE user_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_clicks ENABLE ROW LEVEL SECURITY;

-- User courses policies
CREATE POLICY "Users can view own courses"
    ON user_courses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own courses"
    ON user_courses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own courses"
    ON user_courses FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own courses"
    ON user_courses FOR DELETE
    USING (auth.uid() = user_id);

-- Course clicks policies
CREATE POLICY "Users can view own clicks"
    ON course_clicks FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert clicks"
    ON course_clicks FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Courses are public read
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view courses"
    ON courses FOR SELECT
    USING (true);

-- ============================================
-- FUNCTIONS FOR AUTOMATIC UPDATES
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to courses table
CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

-- Course popularity view
CREATE OR REPLACE VIEW course_popularity AS
SELECT
    c.id,
    c.title,
    c.platform,
    c.category,
    COUNT(DISTINCT uc.user_id) as total_enrollments,
    AVG(uc.progress_percentage) as avg_progress,
    COUNT(DISTINCT cc.id) as total_clicks,
    SUM(cc.commission_earned) as total_commission
FROM courses c
LEFT JOIN user_courses uc ON c.id = uc.course_id
LEFT JOIN course_clicks cc ON c.id = cc.course_id
GROUP BY c.id, c.title, c.platform, c.category
ORDER BY total_enrollments DESC;

-- User learning progress view
CREATE OR REPLACE VIEW user_learning_progress AS
SELECT
    u.id as user_id,
    u.email,
    COUNT(DISTINCT uc.course_id) as total_courses,
    SUM(CASE WHEN uc.progress_percentage = 100 THEN 1 ELSE 0 END) as completed_courses,
    AVG(uc.progress_percentage) as avg_progress,
    MAX(uc.last_accessed_at) as last_activity
FROM auth.users u
LEFT JOIN user_courses uc ON u.id = uc.user_id
GROUP BY u.id, u.email;

-- ============================================
-- SAMPLE COURSE DATA INSERTION
-- ============================================

INSERT INTO courses (id, title, description, thumbnail, platform, category, level, duration, rating, enrollments, instructor, is_free, original_url, tags, featured) VALUES
('coursera-python-google', 'Python for Everybody', 'Learn to Program and Analyze Data with Python. Specialization from University of Michigan.', 'https://images.coursera.org/api/courseCardImages/course-card-v3.jpg', 'coursera', 'development', 'beginner', '3 months', 4.8, 2500000, 'Charles Severance', true, 'https://www.coursera.org/specializations/python', ARRAY['python', 'programming', 'data science'], true),
('coursera-google-it', 'Google IT Automation with Python', 'Professional Certificate in IT Automation using Python.', 'https://d3njjcbhbojbot.cloudfront.net/api/utilities/v1/imageproxy/https://s3.amazonaws.com/coursera-course-assets/google-it-automation.jpg', 'coursera', 'technology', 'beginner', '6 months', 4.7, 500000, 'Google', true, 'https://www.coursera.org/professional-certificates/google-it-automation', ARRAY['python', 'it', 'google', 'automation'], true),
('youtube-js-crash', 'JavaScript Crash Course for Beginners', 'Learn JavaScript programming from scratch. Free full course.', 'https://img.youtube.com/vi/hdI2bqOjy3c/maxresdefault.jpg', 'youtube', 'development', 'beginner', '3.5 hours', 4.9, NULL, 'Web Dev Simplified', true, 'https://www.youtube.com/watch?v=hdI2bqOjy3c', ARRAY['javascript', 'web development', 'programming'], false),
('coursera-dsIBM', 'Data Science Professional Certificate', 'Launch your career in Data Science. IBM Professional Certificate.', 'https://d3njjcbhbojbot.cloudfront.net/api/utilities/v1/imageproxy/https://s3.amazonaws.com/coursera-course-assets/professional-certificate.png', 'coursera', 'data_science', 'beginner', '11 months', 4.6, 800000, 'IBM', true, 'https://www.coursera.org/professional-certificates/ibm-data-science', ARRAY['data science', 'python', 'machine learning', 'ibm'], true),
('coursera-entrepreneurship', 'Entrepreneurship: Launching an Innovative Business', 'Specialization by University of Maryland. Learn to start your business.', 'https://d3njjcbhbojbot.cloudfront.net/api/utilities/v1/imageproxy/https://s3.amazonaws.com/coursera-course-assets/umd-entrepreneurship.jpg', 'coursera', 'entrepreneurship', 'beginner', '4 months', 4.7, 150000, 'University of Maryland', true, 'https://www.coursera.org/specializations/entrepreneurship', ARRAY['business', 'startup', 'innovation'], false),
('coursera-ui-ux', 'UI/UX Design Specialization', 'Complete UI/UX Design course by CalArts.', 'https://d3njjcbhbojbot.cloudfront.net/api/utilities/v1/imageproxy/https://s3.amazonaws.com/coursera-course-assets/calarts-ux-design.jpg', 'coursera', 'design', 'beginner', '4 months', 4.8, 300000, 'California Institute of the Arts', true, 'https://www.coursera.org/specializations/ui-ux-design', ARRAY['ui', 'ux', 'design', 'figma'], true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to enroll user in a course
CREATE OR REPLACE FUNCTION enroll_user_in_course(
    p_user_id UUID,
    p_course_id TEXT
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    INSERT INTO user_courses (user_id, course_id, enrolled_at, progress_percentage)
    VALUES (p_user_id, p_course_id, NOW(), 0)
    ON CONFLICT (user_id, course_id) DO NOTHING;

    v_result := jsonb_build_object(
        'success', true,
        'message', 'Successfully enrolled in course',
        'course_id', p_course_id
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track course click
CREATE OR REPLACE FUNCTION track_course_click(
    p_user_id UUID,
    p_course_id TEXT,
    p_platform TEXT,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_click_id UUID;
BEGIN
    INSERT INTO course_clicks (user_id, course_id, platform, ip_address, user_agent)
    VALUES (p_user_id, p_course_id, p_platform, p_ip_address, p_user_agent)
    RETURNING id INTO v_click_id;

    RETURN v_click_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update course progress
CREATE OR REPLACE FUNCTION update_course_progress(
    p_user_id UUID,
    p_course_id TEXT,
    p_progress INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    UPDATE user_courses
    SET
        progress_percentage = LEAST(p_progress, 100),
        last_accessed_at = NOW(),
        completed_at = CASE WHEN p_progress >= 100 THEN NOW() ELSE completed_at END
    WHERE user_id = p_user_id AND course_id = p_course_id;

    v_result := jsonb_build_object(
        'success', true,
        'message', 'Progress updated',
        'progress', LEAST(p_progress, 100)
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_courses TO authenticated;
GRANT SELECT, INSERT ON TABLE course_clicks TO authenticated;
GRANT SELECT ON TABLE courses TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION enroll_user_in_course TO authenticated;
GRANT EXECUTE ON FUNCTION track_course_click TO authenticated;
GRANT EXECUTE ON FUNCTION update_course_progress TO authenticated;
