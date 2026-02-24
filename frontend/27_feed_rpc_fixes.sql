-- RPC for atomic increments (Likes)
CREATE OR REPLACE FUNCTION increment_likes(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.business_posts
  SET likes_count = COALESCE(likes_count, 0) + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- RPC for atomic decrements (Likes)
CREATE OR REPLACE FUNCTION decrement_likes(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.business_posts
  SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1)
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- RPC for atomic increments (Comments)
CREATE OR REPLACE FUNCTION increment_comments(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.business_posts
  SET comments_count = COALESCE(comments_count, 0) + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- RPC for atomic decrements (Comments)
CREATE OR REPLACE FUNCTION decrement_comments(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.business_posts
  SET comments_count = GREATEST(0, COALESCE(comments_count, 0) - 1)
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;
