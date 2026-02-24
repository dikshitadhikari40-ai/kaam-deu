-- ============================================
-- BUSINESS FEED TABLES
-- SQL Migration for Business Posts Feature
-- ============================================

-- Business Posts Table
CREATE TABLE IF NOT EXISTS business_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Content
    post_type VARCHAR(50) NOT NULL DEFAULT 'update',
    title VARCHAR(200),
    content TEXT NOT NULL,
    media_urls TEXT[],

    -- Engagement counters
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,

    -- Visibility
    is_pinned BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_post_type CHECK (post_type IN ('update', 'job_highlight', 'company_news', 'hiring_event', 'achievement'))
);

-- Post Likes Table
CREATE TABLE IF NOT EXISTS post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES business_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint to prevent duplicate likes
    UNIQUE(post_id, user_id)
);

-- Post Comments Table
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES business_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_business_posts_business_id ON business_posts(business_id);
CREATE INDEX IF NOT EXISTS idx_business_posts_created_at ON business_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_posts_active ON business_posts(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE business_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- Business Posts Policies
CREATE POLICY "Anyone can view active posts"
    ON business_posts FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "Business owners can create posts"
    ON business_posts FOR INSERT
    WITH CHECK (
        author_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM business_profiles
            WHERE id = business_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Business owners can update their posts"
    ON business_posts FOR UPDATE
    USING (author_id = auth.uid());

CREATE POLICY "Business owners can delete their posts"
    ON business_posts FOR DELETE
    USING (author_id = auth.uid());

-- Post Likes Policies
CREATE POLICY "Anyone can view likes"
    ON post_likes FOR SELECT
    USING (TRUE);

CREATE POLICY "Authenticated users can like posts"
    ON post_likes FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike their own likes"
    ON post_likes FOR DELETE
    USING (user_id = auth.uid());

-- Post Comments Policies
CREATE POLICY "Anyone can view comments"
    ON post_comments FOR SELECT
    USING (TRUE);

CREATE POLICY "Authenticated users can comment"
    ON post_comments FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own comments"
    ON post_comments FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
    ON post_comments FOR DELETE
    USING (user_id = auth.uid());

-- ============================================
-- HELPER FUNCTIONS FOR ENGAGEMENT COUNTERS
-- ============================================

-- Increment likes count
CREATE OR REPLACE FUNCTION increment_likes(post_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE business_posts
    SET likes_count = likes_count + 1,
        updated_at = NOW()
    WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement likes count
CREATE OR REPLACE FUNCTION decrement_likes(post_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE business_posts
    SET likes_count = GREATEST(0, likes_count - 1),
        updated_at = NOW()
    WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment comments count
CREATE OR REPLACE FUNCTION increment_comments(post_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE business_posts
    SET comments_count = comments_count + 1,
        updated_at = NOW()
    WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement comments count
CREATE OR REPLACE FUNCTION decrement_comments(post_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE business_posts
    SET comments_count = GREATEST(0, comments_count - 1),
        updated_at = NOW()
    WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_business_posts_updated_at
    BEFORE UPDATE ON business_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_comments_updated_at
    BEFORE UPDATE ON post_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
