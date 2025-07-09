-- Split Posts Table Migration (Draft)
-- -----------------------------------
-- Author: Migration sub-task 3.2 – 2025-07-08
-- Purpose: Move existing rows from legacy `posts` to
--          `community_questions` and `community_plant_shares`.
--          Uses a heuristic:
--            • rows with NULL plant_stage  → questions
--            • rows with NOT NULL plant_stage → plant shares
--          This script is idempotent – it skips already-migrated rows.
--
-- NOTE: After testing and verification we will update RLS, FKs, and
--       eventually DROP the `posts` table in a later migration.

BEGIN;

----------------------------------------------------
-- 1. Safety checks / temp columns (optional)
----------------------------------------------------
-- Ensure the new tables exist (they should). If not, abort.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'community_questions') THEN
    RAISE EXCEPTION 'Target table community_questions does not exist';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'community_plant_shares') THEN
    RAISE EXCEPTION 'Target table community_plant_shares does not exist';
  END IF;
END$$;

----------------------------------------------------
-- 2. Insert Questions
----------------------------------------------------
INSERT INTO public.community_questions (
    id,
    user_id,
    title,
    content,
    category,
    image_url,
    likes_count,
    answers_count,
    views_count,
    created_at,
    updated_at
)
SELECT
    p.id,
    p.user_id,
    LEFT(p.content, 100)                         AS title,
    p.content,
    'general'                                    AS category,
    p.image_url,
    p.likes_count,
    p.comments_count                             AS answers_count,
    0                                            AS views_count,
    p.created_at,
    p.updated_at
FROM public.posts p
LEFT JOIN public.community_questions cq ON cq.id = p.id
WHERE p.plant_stage IS NULL
  AND cq.id IS NULL
  AND length(p.content) >= 10; -- ensure content meets constraint

----------------------------------------------------
-- 3. Insert Plant Shares
----------------------------------------------------
INSERT INTO public.community_plant_shares (
    id,
    user_id,
    plant_id,
    plant_name,
    strain_name,
    growth_stage,
    content,
    images_urls,
    likes_count,
    comments_count,
    created_at,
    updated_at
)
SELECT
    p.id,
    p.user_id,
    NULL                                         AS plant_id, -- legacy posts lack plant FK
    NULL                                         AS plant_name,
    p.plant_strain                               AS strain_name,
    COALESCE(p.plant_stage, 'vegetative')        AS growth_stage,
    p.content,
    CASE WHEN p.image_url IS NULL THEN '{}'
         ELSE ARRAY[p.image_url] END             AS images_urls,
    p.likes_count,
    p.comments_count,
    p.created_at,
    p.updated_at
FROM public.posts p
LEFT JOIN public.community_plant_shares cps ON cps.id = p.id
WHERE p.plant_stage IS NOT NULL
  AND cps.id IS NULL
  AND length(p.content) >= 10; -- ensure content meets constraint

----------------------------------------------------
-- 4. (Optional) Flag migrated rows
----------------------------------------------------
-- ALTER TABLE public.posts
--   ADD COLUMN IF NOT EXISTS migrated boolean DEFAULT false;
--
-- UPDATE public.posts
--   SET migrated = true
--   WHERE id IN (
--     SELECT id FROM public.community_questions
--     UNION
--     SELECT id FROM public.community_plant_shares
--   );

COMMIT; 