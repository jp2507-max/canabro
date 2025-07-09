-- Migration: Fix UUID Type Inconsistencies in Deleted Tables
-- Description: Converts all *_deleted table id columns from TEXT to UUID for sync system compatibility

-- Start explicit transaction for atomicity
BEGIN;

-- ==========================================
-- BACKUP AND VALIDATION FUNCTIONS
-- ==========================================

-- Function to validate UUID format
CREATE OR REPLACE FUNCTION is_valid_uuid(uuid_text TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    -- Try to cast to UUID, return false if it fails
    PERFORM uuid_text::UUID;
    RETURN TRUE;
EXCEPTION WHEN invalid_text_representation THEN
    RETURN FALSE;
END;
$$;

-- ==========================================
-- DIARY_ENTRIES_DELETED TABLE
-- ==========================================

DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    -- Check if table exists and has TEXT id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'diary_entries_deleted' 
        AND column_name = 'id' 
        AND data_type = 'text'
    ) THEN
        -- Validate all existing UUIDs
        SELECT COUNT(*) INTO invalid_count
        FROM diary_entries_deleted 
        WHERE NOT is_valid_uuid(id);
        
        IF invalid_count > 0 THEN
            RAISE EXCEPTION 'Found % invalid UUIDs in diary_entries_deleted.id', invalid_count;
        END IF;
        
        -- Convert column type
        ALTER TABLE diary_entries_deleted 
        ALTER COLUMN id TYPE UUID USING id::UUID;
        
        RAISE NOTICE 'Successfully converted diary_entries_deleted.id to UUID';
    ELSE
        RAISE NOTICE 'diary_entries_deleted.id already UUID or table does not exist';
    END IF;
END $$;

-- ==========================================
-- PLANTS_DELETED TABLE
-- ==========================================

DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    -- Check if table exists and has TEXT id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'plants_deleted' 
        AND column_name = 'id' 
        AND data_type = 'text'
    ) THEN
        -- Validate all existing UUIDs
        SELECT COUNT(*) INTO invalid_count
        FROM plants_deleted 
        WHERE NOT is_valid_uuid(id);
        
        IF invalid_count > 0 THEN
            RAISE EXCEPTION 'Found % invalid UUIDs in plants_deleted.id', invalid_count;
        END IF;
        
        -- Convert column type
        ALTER TABLE plants_deleted 
        ALTER COLUMN id TYPE UUID USING id::UUID;
        
        RAISE NOTICE 'Successfully converted plants_deleted.id to UUID';
    ELSE
        RAISE NOTICE 'plants_deleted.id already UUID or table does not exist';
    END IF;
END $$;

-- ==========================================
-- TASKS_DELETED TABLE
-- ==========================================

DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    -- Check if table exists and has TEXT id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks_deleted' 
        AND column_name = 'id' 
        AND data_type = 'text'
    ) THEN
        -- Validate all existing UUIDs
        SELECT COUNT(*) INTO invalid_count
        FROM tasks_deleted 
        WHERE NOT is_valid_uuid(id);
        
        IF invalid_count > 0 THEN
            RAISE EXCEPTION 'Found % invalid UUIDs in tasks_deleted.id', invalid_count;
        END IF;
        
        -- Convert column type
        ALTER TABLE tasks_deleted 
        ALTER COLUMN id TYPE UUID USING id::UUID;
        
        RAISE NOTICE 'Successfully converted tasks_deleted.id to UUID';
    ELSE
        RAISE NOTICE 'tasks_deleted.id already UUID or table does not exist';
    END IF;
END $$;

-- ==========================================
-- NOTIFICATIONS_DELETED TABLE
-- ==========================================

DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    -- Check if table exists and has TEXT id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications_deleted' 
        AND column_name = 'id' 
        AND data_type = 'text'
    ) THEN
        -- Validate all existing UUIDs
        SELECT COUNT(*) INTO invalid_count
        FROM notifications_deleted 
        WHERE NOT is_valid_uuid(id);
        
        IF invalid_count > 0 THEN
            RAISE EXCEPTION 'Found % invalid UUIDs in notifications_deleted.id', invalid_count;
        END IF;
        
        -- Convert column type
        ALTER TABLE notifications_deleted 
        ALTER COLUMN id TYPE UUID USING id::UUID;
        
        RAISE NOTICE 'Successfully converted notifications_deleted.id to UUID';
    ELSE
        RAISE NOTICE 'notifications_deleted.id already UUID or table does not exist';
    END IF;
END $$;

-- ==========================================
-- LIKES_DELETED TABLE
-- ==========================================

DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    -- Check if table exists and has TEXT id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'likes_deleted' 
        AND column_name = 'id' 
        AND data_type = 'text'
    ) THEN
        -- Validate all existing UUIDs
        SELECT COUNT(*) INTO invalid_count
        FROM likes_deleted 
        WHERE NOT is_valid_uuid(id);
        
        IF invalid_count > 0 THEN
            RAISE EXCEPTION 'Found % invalid UUIDs in likes_deleted.id', invalid_count;
        END IF;
        
        -- Convert column type
        ALTER TABLE likes_deleted 
        ALTER COLUMN id TYPE UUID USING id::UUID;
        
        RAISE NOTICE 'Successfully converted likes_deleted.id to UUID';
    ELSE
        RAISE NOTICE 'likes_deleted.id already UUID or table does not exist';
    END IF;
END $$;

-- ==========================================
-- COMMENT_LIKES_DELETED TABLE
-- ==========================================

DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    -- Check if table exists and has TEXT id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comment_likes_deleted' 
        AND column_name = 'id' 
        AND data_type = 'text'
    ) THEN
        -- Validate all existing UUIDs
        SELECT COUNT(*) INTO invalid_count
        FROM comment_likes_deleted 
        WHERE NOT is_valid_uuid(id);
        
        IF invalid_count > 0 THEN
            RAISE EXCEPTION 'Found % invalid UUIDs in comment_likes_deleted.id', invalid_count;
        END IF;
        
        -- Convert column type
        ALTER TABLE comment_likes_deleted 
        ALTER COLUMN id TYPE UUID USING id::UUID;
        
        RAISE NOTICE 'Successfully converted comment_likes_deleted.id to UUID';
    ELSE
        RAISE NOTICE 'comment_likes_deleted.id already UUID or table does not exist';
    END IF;
END $$;

-- ==========================================
-- POST_MEDIA_DELETED TABLE
-- ==========================================

DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    -- Check if table exists and has TEXT id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'post_media_deleted' 
        AND column_name = 'id' 
        AND data_type = 'text'
    ) THEN
        -- Validate all existing UUIDs
        SELECT COUNT(*) INTO invalid_count
        FROM post_media_deleted 
        WHERE NOT is_valid_uuid(id);
        
        IF invalid_count > 0 THEN
            RAISE EXCEPTION 'Found % invalid UUIDs in post_media_deleted.id', invalid_count;
        END IF;
        
        -- Convert column type
        ALTER TABLE post_media_deleted 
        ALTER COLUMN id TYPE UUID USING id::UUID;
        
        RAISE NOTICE 'Successfully converted post_media_deleted.id to UUID';
    ELSE
        RAISE NOTICE 'post_media_deleted.id already UUID or table does not exist';
    END IF;
END $$;

-- ==========================================
-- COMMUNITY_QUESTIONS_DELETED TABLE
-- ==========================================

DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    -- Check if table exists and has TEXT id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_questions_deleted' 
        AND column_name = 'id' 
        AND data_type = 'text'
    ) THEN
        -- Validate all existing UUIDs
        SELECT COUNT(*) INTO invalid_count
        FROM community_questions_deleted 
        WHERE NOT is_valid_uuid(id);
        
        IF invalid_count > 0 THEN
            RAISE EXCEPTION 'Found % invalid UUIDs in community_questions_deleted.id', invalid_count;
        END IF;
        
        -- Convert column type
        ALTER TABLE community_questions_deleted 
        ALTER COLUMN id TYPE UUID USING id::UUID;
        
        RAISE NOTICE 'Successfully converted community_questions_deleted.id to UUID';
    ELSE
        RAISE NOTICE 'community_questions_deleted.id already UUID or table does not exist';
    END IF;
END $$;

-- ==========================================
-- COMMUNITY_PLANT_SHARES_DELETED TABLE
-- ==========================================

DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    -- Check if table exists and has TEXT id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_plant_shares_deleted' 
        AND column_name = 'id' 
        AND data_type = 'text'
    ) THEN
        -- Validate all existing UUIDs
        SELECT COUNT(*) INTO invalid_count
        FROM community_plant_shares_deleted 
        WHERE NOT is_valid_uuid(id);
        
        IF invalid_count > 0 THEN
            RAISE EXCEPTION 'Found % invalid UUIDs in community_plant_shares_deleted.id', invalid_count;
        END IF;
        
        -- Convert column type
        ALTER TABLE community_plant_shares_deleted 
        ALTER COLUMN id TYPE UUID USING id::UUID;
        
        RAISE NOTICE 'Successfully converted community_plant_shares_deleted.id to UUID';
    ELSE
        RAISE NOTICE 'community_plant_shares_deleted.id already UUID or table does not exist';
    END IF;
END $$;

-- ==========================================
-- CLEANUP AND VERIFICATION
-- ==========================================

-- Drop the helper function
DROP FUNCTION IF EXISTS is_valid_uuid(TEXT);

-- Verify all deleted tables now have UUID id columns
DO $$
DECLARE
    tbl_name TEXT;
    column_type TEXT;
    tables_to_check TEXT[] := ARRAY[
        'diary_entries_deleted',
        'plants_deleted', 
        'tasks_deleted',
        'notifications_deleted',
        'likes_deleted',
        'comment_likes_deleted',
        'post_media_deleted',
        'community_questions_deleted',
        'community_plant_shares_deleted'
    ];
BEGIN
    RAISE NOTICE 'Verifying UUID types in all deleted tables:';
    
    FOREACH tbl_name IN ARRAY tables_to_check
    LOOP
        SELECT data_type INTO column_type
        FROM information_schema.columns 
        WHERE table_name = tbl_name 
        AND column_name = 'id';
        
        IF column_type IS NOT NULL THEN
            RAISE NOTICE '  %: % (% )', 
                tbl_name, 
                column_type,
                CASE WHEN column_type = 'uuid' THEN '✓' ELSE '✗' END;
        ELSE
            RAISE NOTICE '  %: table does not exist', tbl_name;
        END IF;
    END LOOP;
END $$;

-- Log successful completion
DO $$
BEGIN
    RAISE NOTICE 'UUID type conversion completed successfully for all deleted tables';
END $$;

-- Commit the transaction
COMMIT;
