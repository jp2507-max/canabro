-- Enable RLS on deleted tables and add owner policies
-- Applied on: 2025-07-09T12:00:00Z
-- Migration: 20250709_enable_rls_deleted_tables_v2

ALTER TABLE public.comments_deleted ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_questions_deleted ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_plant_shares_deleted ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comments_deleted_owner ON public.comments_deleted;
CREATE POLICY comments_deleted_owner ON public.comments_deleted USING (auth.uid() = user_id);

DROP POLICY IF EXISTS cq_deleted_owner ON public.community_questions_deleted;
CREATE POLICY cq_deleted_owner ON public.community_questions_deleted USING (auth.uid() = user_id);

DROP POLICY IF EXISTS cps_deleted_owner ON public.community_plant_shares_deleted;
CREATE POLICY cps_deleted_owner ON public.community_plant_shares_deleted USING (auth.uid() = user_id); 