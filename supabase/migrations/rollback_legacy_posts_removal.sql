-- EMERGENCY ROLLBACK MIGRATION: Recreate Legacy Posts Table
-- Author: Task 3.17 - Legacy Posts Cleanup Rollback
-- Date: 2025-01-15
-- 
-- ⚠️  **EMERGENCY USE ONLY** ⚠️ 
-- This migration recreates the legacy posts table that was removed in drop_legacy_posts_table_v2.
-- 
-- **When to use this rollback:**
-- - If the community_questions/community_plant_shares migration caused critical issues
-- - If urgent rollback is needed to restore service functionality
-- - If data loss was discovered after posts table removal
-- 
-- **WARNING:** 
-- - This does NOT restore any data that was in the original posts table
-- - This only recreates the table structure for emergency compatibility
-- - You will need to separately migrate data back if needed
-- - The new community tables (community_questions, community_plant_shares) will remain

BEGIN;

-- Recreate the posts table with the schema that existed before removal
CREATE TABLE IF NOT EXISTS posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content text NOT NULL,
    image_url text,
    plant_stage text,
    plant_strain text,
    likes_count integer DEFAULT 0,
    comments_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz,
    last_synced_at timestamptz
);

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_plant_stage ON posts(plant_stage);
CREATE INDEX IF NOT EXISTS idx_posts_plant_strain ON posts(plant_strain);

-- Recreate RLS policies
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view all posts" ON posts
    FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can create posts" ON posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own posts" ON posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own posts" ON posts
    FOR DELETE USING (auth.uid() = user_id);

-- Recreate updated_at trigger
CREATE OR REPLACE FUNCTION update_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_posts_updated_at();

-- Log the rollback
DO $$
BEGIN
    RAISE NOTICE '⚠️  EMERGENCY ROLLBACK COMPLETED ⚠️';
    RAISE NOTICE 'Legacy posts table has been recreated with empty data';
    RAISE NOTICE 'Community tables (community_questions, community_plant_shares) remain active';
    RAISE NOTICE 'You may need to manually migrate data back if required';
    RAISE NOTICE 'Consider using the new community tables instead of posts table';
END $$;

COMMIT; 