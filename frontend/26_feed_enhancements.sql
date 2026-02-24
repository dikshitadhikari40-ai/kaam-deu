-- Add dislikes_count to business_posts
ALTER TABLE public.business_posts ADD COLUMN IF NOT EXISTS dislikes_count INTEGER DEFAULT 0;

-- Create Post Dislikes table
CREATE TABLE IF NOT EXISTS public.post_dislikes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.business_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.post_dislikes ENABLE ROW LEVEL SECURITY;

-- Policies for post_dislikes
DROP POLICY IF EXISTS "Anyone can view dislikes" ON public.post_dislikes;
CREATE POLICY "Anyone can view dislikes" 
  ON public.post_dislikes FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can toggle dislikes" ON public.post_dislikes;
CREATE POLICY "Users can toggle dislikes" 
  ON public.post_dislikes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove dislikes" ON public.post_dislikes;
CREATE POLICY "Users can remove dislikes" 
  ON public.post_dislikes FOR DELETE 
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_post_dislikes_post ON public.post_dislikes(post_id);

-- RPC for atomic increments (Dislikes)
CREATE OR REPLACE FUNCTION increment_dislikes(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.business_posts
  SET dislikes_count = dislikes_count + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_dislikes(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.business_posts
  SET dislikes_count = GREATEST(0, dislikes_count - 1)
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;
