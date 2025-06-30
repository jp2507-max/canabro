-- Migration: create_posts_table
-- Description: Creates the posts table and related deletion tracking table, RLS policies, and indexes.

-- ==========================================
-- POSTS TABLE
-- ==========================================
CREATE TABLE public.posts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    post_id TEXT UNIQUE NOT NULL, -- WatermelonDB ID
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    plant_id TEXT REFERENCES public.plants(plant_id) ON DELETE SET NULL, -- Optional link to a plant
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    last_synced_at TIMESTAMP WITH TIME ZONE, -- WatermelonDB sync field
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL -- WatermelonDB sync field
);

COMMENT ON TABLE public.posts IS 'Stores user-generated posts, potentially linked to plants.';
COMMENT ON COLUMN public.posts.post_id IS 'Unique identifier from WatermelonDB.';
COMMENT ON COLUMN public.posts.plant_id IS 'Optional foreign key linking the post to a specific plant.';

-- ==========================================
-- POSTS_DELETED TABLE (For WatermelonDB Sync)
-- ==========================================
CREATE TABLE public.posts_deleted (
    id TEXT PRIMARY KEY, -- Matches the post_id from the posts table
    user_id UUID NOT NULL, -- Store user_id for potential cleanup or filtering
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.posts_deleted IS 'Tracks deleted post IDs for WatermelonDB synchronization.';

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS posts_post_id_idx ON public.posts(post_id);
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS posts_plant_id_idx ON public.posts(plant_id);
CREATE INDEX IF NOT EXISTS posts_deleted_user_id_idx ON public.posts_deleted(user_id);

-- ==========================================
-- RLS POLICIES
-- ==========================================
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all non-deleted posts
CREATE POLICY "Allow authenticated read access"
ON public.posts FOR SELECT
TO authenticated
USING (true); -- Adjust if posts should be private initially

-- Allow users to create posts
CREATE POLICY "Allow individual insert access"
ON public.posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own posts
CREATE POLICY "Allow individual update access"
ON public.posts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete (soft delete) their own posts
-- Note: Actual deletion is handled by sync_push function moving to _deleted table
CREATE POLICY "Allow individual delete access"
ON public.posts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- RLS for posts_deleted (usually only backend functions need access)
ALTER TABLE public.posts_deleted ENABLE ROW LEVEL SECURITY;

-- Example: Allow service_role or specific functions to access deleted records if needed
-- CREATE POLICY "Allow service role access" ON public.posts_deleted FOR SELECT USING (true);

RAISE NOTICE 'Created posts table, posts_deleted table, indexes, and RLS policies.';
