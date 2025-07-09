-- Migration: Fix Community Deletion System After Post Table Migration
-- Description: Fixes deletion logic to work with community_questions and community_plant_shares tables

-- ==========================================
-- DROP OLD INVALID FUNCTIONS AND TRIGGERS
-- ==========================================

-- Drop the old post deletion trigger (references non-existent posts table)
-- Only drop if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
        DROP TRIGGER IF EXISTS trigger_post_cascading_deletion ON posts;
    END IF;
END $$;

-- Drop old functions that are no longer valid
DROP FUNCTION IF EXISTS handle_post_deletion();

-- ==========================================
-- CREATE MISSING DELETED TABLES
-- ==========================================

-- Create community_questions_deleted table
CREATE TABLE IF NOT EXISTS community_questions_deleted (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Create community_plant_shares_deleted table
CREATE TABLE IF NOT EXISTS community_plant_shares_deleted (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- ==========================================
-- COMMUNITY QUESTION DELETION FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION handle_community_question_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Security check: Ensure we're only deleting questions owned by the current user
    current_user_id := auth.uid();
    
    -- Verify the question belongs to the current user or user has admin privileges
    IF OLD.user_id != current_user_id THEN
        -- Allow admin roles to delete any question
        IF current_setting('role') NOT IN ('service_role', 'postgres') THEN
            RAISE EXCEPTION 'Access denied: Cannot delete questions owned by other users. Question owner: %, Current user: %',
                OLD.user_id, current_user_id;
        END IF;
    END IF;
    
    -- Log the deletion for debugging
    RAISE NOTICE 'Handling deletion of community question: % by user: %', OLD.id, current_user_id;
    
    -- 1. Delete all comment likes for comments on this question
    DELETE FROM comment_likes 
    WHERE comment_id IN (
        SELECT id FROM comments WHERE question_id = OLD.id
    );
    
    -- 2. Delete all notifications related to this question
    DELETE FROM notifications 
    WHERE related_question_id = OLD.id 
       OR related_comment_id IN (
            SELECT id FROM comments WHERE question_id = OLD.id
        );
    
    -- 3. Delete all comments on this question (and track them in comments_deleted)
    INSERT INTO comments_deleted (id, user_id, deleted_at)
    SELECT id, user_id, NOW()
    FROM comments 
    WHERE question_id = OLD.id
    ON CONFLICT (id) DO NOTHING;
    
    -- Delete all comments on this question
    DELETE FROM comments 
    WHERE question_id = OLD.id;
    
    -- 4. Delete all direct likes on this question
    DELETE FROM likes 
    WHERE question_id = OLD.id;
    
    -- 5. Delete question-specific likes
    DELETE FROM community_question_likes 
    WHERE question_id = OLD.id;
    
    -- 6. Delete question-specific answers
    DELETE FROM community_question_answers 
    WHERE question_id = OLD.id;
    
    -- 7. Track the deleted question in community_questions_deleted table
    INSERT INTO community_questions_deleted (id, user_id, deleted_at)
    VALUES (OLD.id, OLD.user_id, NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- Log completion
    RAISE NOTICE 'Completed deletion cascade for community question: %', OLD.id;
    
    RETURN OLD;
END;
$$;

-- ==========================================
-- COMMUNITY PLANT SHARE DELETION FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION handle_community_plant_share_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Security check: Ensure we're only deleting plant shares owned by the current user
    current_user_id := auth.uid();
    
    -- Verify the plant share belongs to the current user or user has admin privileges
    IF OLD.user_id != current_user_id THEN
        -- Allow admin roles to delete any plant share
        IF current_setting('role') NOT IN ('service_role', 'postgres') THEN
            RAISE EXCEPTION 'Access denied: Cannot delete plant shares owned by other users. Plant share owner: %, Current user: %',
                OLD.user_id, current_user_id;
        END IF;
    END IF;
    
    -- Log the deletion for debugging
    RAISE NOTICE 'Handling deletion of community plant share: % by user: %', OLD.id, current_user_id;
    
    -- 1. Delete all comment likes for comments on this plant share
    DELETE FROM comment_likes 
    WHERE comment_id IN (
        SELECT id FROM comments WHERE plant_share_id = OLD.id
    );
    
    -- 2. Delete all notifications related to this plant share
    DELETE FROM notifications 
    WHERE related_plant_share_id = OLD.id 
       OR related_comment_id IN (
            SELECT id FROM comments WHERE plant_share_id = OLD.id
        );
    
    -- 3. Delete all comments on this plant share (and track them in comments_deleted)
    INSERT INTO comments_deleted (id, user_id, deleted_at)
    SELECT id, user_id, NOW()
    FROM comments 
    WHERE plant_share_id = OLD.id
    ON CONFLICT (id) DO NOTHING;
    
    -- Delete all comments on this plant share
    DELETE FROM comments 
    WHERE plant_share_id = OLD.id;
    
    -- 4. Delete all direct likes on this plant share
    DELETE FROM likes 
    WHERE plant_share_id = OLD.id;
    
    -- 5. Delete plant share-specific likes
    DELETE FROM community_plant_share_likes 
    WHERE plant_share_id = OLD.id;
    
    -- 6. Delete plant share-specific comments
    DELETE FROM community_plant_share_comments 
    WHERE plant_share_id = OLD.id;
    
    -- 7. Track the deleted plant share in community_plant_shares_deleted table
    INSERT INTO community_plant_shares_deleted (id, user_id, deleted_at)
    VALUES (OLD.id, OLD.user_id, NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- Log completion
    RAISE NOTICE 'Completed deletion cascade for community plant share: %', OLD.id;
    
    RETURN OLD;
END;
$$;

-- ==========================================
-- UPDATED CONFLICT RESOLUTION FUNCTION
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
    allowed_tables TEXT[] := ARRAY[
        'community_questions', 'community_plant_shares', 'comments', 'likes', 
        'notifications', 'comment_likes', 'community_question_likes', 
        'community_plant_share_likes', 'community_question_answers', 
        'community_plant_share_comments'
    ];
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
-- UPDATED SYNC PULL FUNCTION
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
    
    -- Updated tables to sync for new community structure
    IF tables_to_sync IS NULL THEN
        tables_to_sync := ARRAY['community_questions', 'community_plant_shares', 'comments', 'likes', 'notifications'];
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
    
    -- Call normal sync_pull (assuming it exists)
    SELECT sync_pull(last_pulled_at, 1, user_id, NULL, false, NULL, tables_to_sync, true) INTO result;
    
    -- Add conflict resolution metadata
    result := result || jsonb_build_object('conflicts_resolved', conflicts);
    
    RETURN result;
END;
$$;

-- ==========================================
-- CREATE DELETION TRIGGERS
-- ==========================================

-- Create trigger for community questions
DROP TRIGGER IF EXISTS trigger_community_question_cascading_deletion ON community_questions;
CREATE TRIGGER trigger_community_question_cascading_deletion
    BEFORE DELETE ON community_questions
    FOR EACH ROW
    EXECUTE FUNCTION handle_community_question_deletion();

-- Create trigger for community plant shares
DROP TRIGGER IF EXISTS trigger_community_plant_share_cascading_deletion ON community_plant_shares;
CREATE TRIGGER trigger_community_plant_share_cascading_deletion
    BEFORE DELETE ON community_plant_shares
    FOR EACH ROW
    EXECUTE FUNCTION handle_community_plant_share_deletion();

-- ==========================================
-- CREATE INDEXES FOR PERFORMANCE
-- ==========================================

-- Indexes for new deleted tables
CREATE INDEX IF NOT EXISTS idx_community_questions_deleted_user_id ON community_questions_deleted(user_id);
CREATE INDEX IF NOT EXISTS idx_community_questions_deleted_deleted_at ON community_questions_deleted(deleted_at);
CREATE INDEX IF NOT EXISTS idx_community_plant_shares_deleted_user_id ON community_plant_shares_deleted(user_id);
CREATE INDEX IF NOT EXISTS idx_community_plant_shares_deleted_deleted_at ON community_plant_shares_deleted(deleted_at);

-- Indexes for comment foreign keys
CREATE INDEX IF NOT EXISTS idx_comments_question_id ON comments(question_id);
CREATE INDEX IF NOT EXISTS idx_comments_plant_share_id ON comments(plant_share_id);

-- Indexes for likes foreign keys
CREATE INDEX IF NOT EXISTS idx_likes_question_id ON likes(question_id);
CREATE INDEX IF NOT EXISTS idx_likes_plant_share_id ON likes(plant_share_id);

-- Indexes for notifications foreign keys
CREATE INDEX IF NOT EXISTS idx_notifications_related_question_id ON notifications(related_question_id);
CREATE INDEX IF NOT EXISTS idx_notifications_related_plant_share_id ON notifications(related_plant_share_id);

-- ==========================================
-- GRANT PERMISSIONS
-- ==========================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION handle_community_question_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_community_plant_share_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_delete_modify_conflict(TEXT, UUID, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_pull_with_conflict_resolution(TIMESTAMP WITH TIME ZONE, UUID, TEXT[]) TO authenticated;

-- Grant access to new deleted tables
GRANT SELECT, INSERT, UPDATE, DELETE ON community_questions_deleted TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_plant_shares_deleted TO authenticated;

-- ==========================================
-- CLEANUP OLD REFERENCES
-- ==========================================

-- Drop old posts_deleted table if it exists (no longer needed)
DROP TABLE IF EXISTS posts_deleted;
DROP TABLE IF EXISTS post_media_deleted;

-- Log successful completion
DO $$
BEGIN
    RAISE NOTICE 'Community deletion system fixed successfully';
END $$;
