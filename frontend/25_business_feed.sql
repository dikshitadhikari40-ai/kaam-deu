-- Business Posts (Updates, News, etc.)
CREATE TABLE IF NOT EXISTS public.business_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL CHECK (post_type IN ('update', 'job_highlight', 'company_news', 'hiring_event', 'achievement')),
  title TEXT NOT NULL,
  content TEXT,
  media_urls TEXT[],
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.business_posts ENABLE ROW LEVEL SECURITY;

-- Post Likes
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.business_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Post Comments
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.business_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on related tables
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- Policies for business_posts
DROP POLICY IF EXISTS "Anyone can view active business posts" ON public.business_posts;
CREATE POLICY "Anyone can view active business posts" 
  ON public.business_posts FOR SELECT 
  USING (is_active = true);

DROP POLICY IF EXISTS "Businesses can create posts" ON public.business_posts;
CREATE POLICY "Businesses can create posts" 
  ON public.business_posts FOR INSERT 
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Businesses can update own posts" ON public.business_posts;
CREATE POLICY "Businesses can update own posts" 
  ON public.business_posts FOR UPDATE 
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Businesses can delete own posts" ON public.business_posts;
CREATE POLICY "Businesses can delete own posts" 
  ON public.business_posts FOR DELETE 
  USING (auth.uid() = author_id);


-- Policies for post_likes
DROP POLICY IF EXISTS "Anyone can view likes" ON public.post_likes;
CREATE POLICY "Anyone can view likes" 
  ON public.post_likes FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can toggle likes" ON public.post_likes;
CREATE POLICY "Users can toggle likes" 
  ON public.post_likes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove likes" ON public.post_likes;
CREATE POLICY "Users can remove likes" 
  ON public.post_likes FOR DELETE 
  USING (auth.uid() = user_id);

-- Policies for post_comments
DROP POLICY IF EXISTS "Anyone can view comments" ON public.post_comments;
CREATE POLICY "Anyone can view comments" 
  ON public.post_comments FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can create comments" ON public.post_comments;
CREATE POLICY "Users can create comments" 
  ON public.post_comments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.post_comments;
CREATE POLICY "Users can delete own comments" 
  ON public.post_comments FOR DELETE 
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_posts_business ON public.business_posts(business_id);
CREATE INDEX IF NOT EXISTS idx_business_posts_created ON public.business_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id);
