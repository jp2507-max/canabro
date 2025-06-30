-- Add image_url column to the comments table
ALTER TABLE public.comments
ADD COLUMN image_url TEXT NULL;

-- Optional: Add RLS policy if needed for selecting/updating this specific column,
-- although existing policies might cover it. Assuming existing policies are sufficient for now.
-- Example (if needed):
-- CREATE POLICY "Users can update their own comment image" ON comments
-- FOR UPDATE USING (auth.uid() = user_id);

-- Grant usage if necessary (though ALTER TABLE is usually done by admin/migration role)
-- GRANT UPDATE (image_url) ON public.comments TO authenticated;
