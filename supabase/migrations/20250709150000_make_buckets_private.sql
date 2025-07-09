-- Make storage buckets private (except avatars)
-- Migration: 20250709150000_make_buckets_private

-- Make buckets private (except avatars which stays public for all authenticated users)
UPDATE storage.buckets SET public = false 
WHERE id IN ('plants', 'community-questions', 'community-plant-shares', 'journals', 'posts');

-- Verify the bucket status after update
-- SELECT id, name, public FROM storage.buckets ORDER BY name; 