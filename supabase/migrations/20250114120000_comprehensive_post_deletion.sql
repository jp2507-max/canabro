-- Migration: Comprehensive Post Deletion System
-- Description: Creates cascading deletion triggers and functions to ensure ALL related data is deleted when posts are deleted

-- ==========================================
-- COMPREHENSIVE POST DELETION FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION handle_post_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_comment_record RECORD;
    current_user_id UUID;
BEGIN
    -- Security check: Ensure we're only deleting posts owned by the current user
    -- Get the current user ID from the session
    current_user_id := auth.uid();
    
    -- Verify the post belongs to the current user or user has admin privileges
    IF OLD.user_id != current_user_id THEN
        -- Allow admin roles to delete any post
        IF current_setting('role') NOT IN ('service_role', 'postgres') THEN
            RAISE EXCEPTION 'Access denied: Cannot delete posts owned by other users. Post owner: %, Current user: %',
                OLD.user_id, current_user_id;
        END IF;
    END IF;
    
    -- Log the deletion for debugging
    RAISE NOTICE 'Handling deletion of post: % by user: %', OLD.post_id, current_user_id;
    
    -- 1. Delete all comment likes for comments on this post
    DELETE FROM comment_likes 
    WHERE comment_id IN (
        SELECT id FROM comments WHERE post_id = OLD.post_id
    );
    
    -- 2. Delete all notifications related to this post
    DELETE FROM notifications 
    WHERE related_post_id = OLD.post_id 
       OR related_comment_id IN (
            SELECT id FROM comments WHERE post_id = OLD.post_id
        );
    
    -- 3. Delete all post media/attachments
    DELETE FROM post_media 
    WHERE post_id = OLD.post_id;
    
    -- 4. Delete community question data if this is a question post
    DELETE FROM community_questions 
    WHERE post_id = OLD.post_id;
    
    -- 5. Delete community plant share data if this is a plant share post
    DELETE FROM community_plant_shares 
    WHERE post_id = OLD.post_id;
    
    -- 6. Delete all comments on this post (and track them in comments_deleted)
    -- Track all deleted comments in bulk
    INSERT INTO comments_deleted (id, user_id, deleted_at)
    SELECT id, user_id, NOW()
    FROM comments 
    WHERE post_id = OLD.post_id
    ON CONFLICT (id) DO NOTHING;
    
    -- Delete all comments on this post in bulk
    DELETE FROM comments 
    WHERE post_id = OLD.post_id;
    
    -- 7. Delete all direct likes on this post
    DELETE FROM likes 
    WHERE post_id = OLD.post_id;
    
    -- 8. Track the deleted post in posts_deleted table
    INSERT INTO posts_deleted (id, user_id, deleted_at)
    VALUES (OLD.post_id, OLD.user_id, NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- Log completion
    RAISE NOTICE 'Completed deletion cascade for post: %', OLD.post_id;
    
    RETURN OLD;
END;
$$;

-- ==========================================
-- CONFLICT RESOLUTION FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION handle_delete_modify_conflict(
    table_name TEXT,
    record_id UUID,
    last_pulled_at TIMESTAMP WITH TIME ZONE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    conflict_record RECORD;
    deleted_record RECORD;
    resolution_action TEXT;
    result JSONB;
    current_user_id UUID;
    allowed_tables TEXT[] := ARRAY['posts', 'comments', 'likes', 'notifications', 'comment_likes', 'post_media', 'community_questions', 'community_plant_shares'];
BEGIN
    -- Security check: Get current user ID
    current_user_id := auth.uid();
    
    -- Ensure user is authenticated
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Access denied: User must be authenticated to resolve conflicts';
    END IF;
    
    -- Validate table_name parameter against whitelist to prevent SQL injection
    IF table_name IS NULL OR table_name = '' THEN
        RAISE EXCEPTION 'table_name parameter cannot be null or empty';
    END IF;
    
    IF NOT (table_name = ANY(allowed_tables)) THEN
        RAISE EXCEPTION 'Invalid table name: %. Allowed tables are: %', table_name, array_to_string(allowed_tables, ', ');
    END IF;
    
    -- Additional validation: ensure table_name contains only valid identifier characters
    IF table_name !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' THEN
        RAISE EXCEPTION 'Invalid table name format: %. Table name must be a valid SQL identifier.', table_name;
    END IF;
    
    -- Check if record exists in main table
    EXECUTE format('SELECT updated_at FROM %I WHERE id = $1', table_name) 
    INTO conflict_record 
    USING record_id;
    
    -- Check if record exists in deleted table
    EXECUTE format('SELECT deleted_at FROM %I_deleted WHERE id = $1', table_name) 
    INTO deleted_record 
    USING record_id;
    
    -- If both exist, resolve based on timestamps
    IF conflict_record IS NOT NULL AND deleted_record IS NOT NULL THEN
        IF conflict_record.updated_at > deleted_record.deleted_at THEN
            -- Modification is newer, keep the record and remove from deleted
            EXECUTE format('DELETE FROM %I_deleted WHERE id = $1', table_name) 
            USING record_id;
            resolution_action := 'keep_modified';
        ELSE
            -- Deletion is newer, delete the record
            EXECUTE format('DELETE FROM %I WHERE id = $1', table_name) 
            USING record_id;
            resolution_action := 'confirm_deletion';
        END IF;
    ELSIF conflict_record IS NOT NULL THEN
        -- Only modified record exists
        resolution_action := 'no_conflict';
    ELSIF deleted_record IS NOT NULL THEN
        -- Only deleted record exists
        resolution_action := 'already_deleted';
    ELSE
        -- Neither exists
        resolution_action := 'not_found';
    END IF;
    
    result := jsonb_build_object(
        'table_name', table_name,
        'record_id', record_id,
        'resolution_action', resolution_action,
        'resolved_at', extract(epoch from now()) * 1000
    );
    
    RETURN result;
END;
$$;

-- ==========================================
-- ENHANCED SYNC PULL WITH CONFLICT RESOLUTION
-- ==========================================

CREATE OR REPLACE FUNCTION sync_pull_with_conflict_resolution(
    last_pulled_at TIMESTAMP WITH TIME ZONE,
    user_id UUID,
    tables_to_sync TEXT[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    conflicts JSONB := '[]'::jsonb;
    table_name TEXT;
    conflict_resolution JSONB;
    current_user_id UUID;
BEGIN
    -- Security check: Get current user ID
    current_user_id := auth.uid();
    
    -- Ensure user is authenticated
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Access denied: User must be authenticated to sync data';
    END IF;
    
    -- Ensure users can only sync their own data
    IF user_id != current_user_id THEN
        -- Allow service_role to sync for any user (for admin operations)
        IF current_setting('role') != 'service_role' THEN
            RAISE EXCEPTION 'Access denied: Users can only sync their own data. Requested: %, Current: %', 
                user_id, current_user_id;
        END IF;
    END IF;
    
    -- First, handle any delete-modify conflicts
    IF tables_to_sync IS NULL THEN
        tables_to_sync := ARRAY['posts', 'comments', 'likes', 'notifications'];
    END IF;
    
    FOREACH table_name IN ARRAY tables_to_sync
    LOOP
        -- Find potential conflicts (records that exist in both main and deleted tables)
        FOR conflict_resolution IN
            EXECUTE format('
                SELECT handle_delete_modify_conflict(%L, main.id, %L)
                FROM %I main
                INNER JOIN %I_deleted deleted ON main.id = deleted.id
                WHERE main.user_id = %L
            ', table_name, last_pulled_at, table_name, table_name, user_id)
        LOOP
            conflicts := conflicts || conflict_resolution;
        END LOOP;
    END LOOP;
    
    -- Call normal sync_pull
    SELECT sync_pull(last_pulled_at, 1, user_id, NULL, false, NULL, tables_to_sync, true) INTO result;
    
    -- Add conflict resolution metadata
    result := result || jsonb_build_object('conflicts_resolved', conflicts);
    
    RETURN result;
END;
$$;

-- ==========================================
-- CREATE MISSING TABLES IF THEY DON'T EXIST
-- ==========================================

-- Create comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Create comments_deleted table if it doesn't exist
CREATE TABLE IF NOT EXISTS comments_deleted (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Create posts_deleted table if it doesn't exist
CREATE TABLE IF NOT EXISTS posts_deleted (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comment_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Create post_media table if it doesn't exist
CREATE TABLE IF NOT EXISTS post_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create community tables if they don't exist
CREATE TABLE IF NOT EXISTS community_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    title TEXT NOT NULL,
    tags TEXT[],
    is_solved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_plant_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    plant_stage TEXT,
    strain_name TEXT,
    grow_details JSONB,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ADD FOREIGN KEY CONSTRAINTS
-- ==========================================

-- Add foreign key constraints for comments table
ALTER TABLE comments 
    ADD CONSTRAINT IF NOT EXISTS fk_comments_post_id 
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

ALTER TABLE comments 
    ADD CONSTRAINT IF NOT EXISTS fk_comments_user_id 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add foreign key constraints for likes table
ALTER TABLE likes 
    ADD CONSTRAINT IF NOT EXISTS fk_likes_post_id 
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

ALTER TABLE likes 
    ADD CONSTRAINT IF NOT EXISTS fk_likes_user_id 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add foreign key constraints for comment_likes table
ALTER TABLE comment_likes 
    ADD CONSTRAINT IF NOT EXISTS fk_comment_likes_comment_id 
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE;

ALTER TABLE comment_likes 
    ADD CONSTRAINT IF NOT EXISTS fk_comment_likes_user_id 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add foreign key constraints for post_media table
ALTER TABLE post_media 
    ADD CONSTRAINT IF NOT EXISTS fk_post_media_post_id 
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

-- Add foreign key constraints for community_questions table
ALTER TABLE community_questions 
    ADD CONSTRAINT IF NOT EXISTS fk_community_questions_post_id 
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

-- Add foreign key constraints for community_plant_shares table
ALTER TABLE community_plant_shares 
    ADD CONSTRAINT IF NOT EXISTS fk_community_plant_shares_post_id 
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

-- Add foreign key constraints for deleted tables (referential integrity for tracking)
ALTER TABLE posts_deleted 
    ADD CONSTRAINT IF NOT EXISTS fk_posts_deleted_user_id 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE comments_deleted 
    ADD CONSTRAINT IF NOT EXISTS fk_comments_deleted_user_id 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- ==========================================
-- CREATE TRIGGER FOR POST DELETION
-- ==========================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_post_cascading_deletion ON posts;

-- Create the trigger
CREATE TRIGGER trigger_post_cascading_deletion
    BEFORE DELETE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION handle_post_deletion();

-- ==========================================
-- CREATE INDEXES FOR PERFORMANCE
-- ==========================================

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- Likes indexes
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

-- Comment likes indexes
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- Post media indexes
CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON post_media(post_id);

-- Community tables indexes
CREATE INDEX IF NOT EXISTS idx_community_questions_post_id ON community_questions(post_id);
CREATE INDEX IF NOT EXISTS idx_community_plant_shares_post_id ON community_plant_shares(post_id);

-- ==========================================
-- GRANT PERMISSIONS
-- ==========================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION handle_post_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_delete_modify_conflict(TEXT, UUID, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_pull_with_conflict_resolution(TIMESTAMP WITH TIME ZONE, UUID, TEXT[]) TO authenticated;

-- Grant access to new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON comment_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON post_media TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_plant_shares TO authenticated;

-- Log successful completion
DO $$
BEGIN
    RAISE NOTICE 'Comprehensive post deletion system created successfully';
END $$;

