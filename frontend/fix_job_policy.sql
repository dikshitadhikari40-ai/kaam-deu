-- Fix RLS policy for job_posts to explicitly allow INSERT
DROP POLICY IF EXISTS "Businesses can manage own job posts" ON public.job_posts;

CREATE POLICY "Businesses can manage own job posts"
  ON public.job_posts FOR ALL
  USING (business_id = auth.uid())
  WITH CHECK (business_id = auth.uid());
