-- Remove legacy posts bucket and remaining files
-- Migration: 20250709160000_remove_legacy_posts_bucket

-- First, remove any remaining files in the posts bucket
DELETE FROM storage.objects WHERE bucket_id = 'posts';

-- Drop all storage policies related to posts bucket
DROP POLICY IF EXISTS "Allow authenticated uploads to posts bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to posts bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own files in posts bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own files in posts bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own post images" ON storage.objects;

-- Finally, remove the posts bucket itself
DELETE FROM storage.buckets WHERE id = 'posts';

-- Verify cleanup
-- SELECT id, name, public FROM storage.buckets ORDER BY name;
-- SELECT COUNT(*) as remaining_files FROM storage.objects WHERE bucket_id = 'posts'; 