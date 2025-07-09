-- Secure storage buckets with private access and owner-based policies
-- Migration: 20250709140000_secure_storage_buckets

-- Make buckets private (except avatars which stays public for all authenticated users)
UPDATE storage.buckets SET public = false 
WHERE id IN ('plants', 'community-questions', 'community-plant-shares', 'journals', 'posts');

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can upload plant images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view plant images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete plant images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload journal images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view journal images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete journal images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload question images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view question images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete question images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload plant share images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view plant share images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete plant share images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete post images" ON storage.objects;

-- Plants bucket policies (owner-based access)
CREATE POLICY "Users can upload own plant images" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'plants' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own plant images" ON storage.objects FOR SELECT 
  USING (bucket_id = 'plants' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own plant images" ON storage.objects FOR DELETE 
  USING (bucket_id = 'plants' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Community Questions bucket policies (owner-based access)
CREATE POLICY "Users can upload own question images" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'community-questions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own question images" ON storage.objects FOR SELECT 
  USING (bucket_id = 'community-questions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own question images" ON storage.objects FOR DELETE 
  USING (bucket_id = 'community-questions' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Community Plant Shares bucket policies (owner-based access)
CREATE POLICY "Users can upload own plant share images" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'community-plant-shares' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own plant share images" ON storage.objects FOR SELECT 
  USING (bucket_id = 'community-plant-shares' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own plant share images" ON storage.objects FOR DELETE 
  USING (bucket_id = 'community-plant-shares' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Journals bucket policies (owner-based access)
CREATE POLICY "Users can upload own journal images" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'journals' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own journal images" ON storage.objects FOR SELECT 
  USING (bucket_id = 'journals' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own journal images" ON storage.objects FOR DELETE 
  USING (bucket_id = 'journals' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Legacy Posts bucket policies (will be removed later)
CREATE POLICY "Users can upload own post images" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own post images" ON storage.objects FOR SELECT 
  USING (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own post images" ON storage.objects FOR DELETE 
  USING (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]); 