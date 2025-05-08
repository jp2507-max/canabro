-- Migration: 20250328_sync_functions.sql
-- Create Supabase server-side functions for WatermelonDB sync with performance optimizations

-- ==========================================
-- SYNC PULL FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION sync_pull(
  last_pulled_at TIMESTAMP WITH TIME ZONE,
  schema_version INTEGER,
  user_id UUID,
  migration JSONB DEFAULT NULL,
  use_turbo BOOLEAN DEFAULT FALSE,
  network_type TEXT DEFAULT NULL,
  tables_to_sync TEXT[] DEFAULT NULL,
  include_media BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '30s' -- Add timeout to prevent long-running queries
AS $$
DECLARE
  result JSONB;
  tables TEXT[];
  current_table_name TEXT; -- Renamed variable
  query TEXT;
  changes JSONB := jsonb_build_object();
  table_changes JSONB;
  current_timestamp TIMESTAMP WITH TIME ZONE := now();
  created_records JSONB;
  updated_records JSONB;
  deleted_ids JSONB;
  record_row RECORD;
  i INTEGER;
  column_list TEXT; -- Moved declaration here
BEGIN
  -- If tables_to_sync is provided, use it, otherwise default to all tables
  IF tables_to_sync IS NULL OR array_length(tables_to_sync, 1) = 0 THEN
    tables := ARRAY['profiles', 'plants', 'grow_journals', 'journal_entries', 'grow_locations', 'diary_entries', 'plant_tasks', 'posts'];
  ELSE
    tables := tables_to_sync;
  END IF;
  
  -- Start with empty changes structure
  FOR i IN 1..array_length(tables, 1) LOOP
    current_table_name := tables[i];
    changes := changes || jsonb_build_object(
      current_table_name,
      jsonb_build_object(
        'created', '[]'::jsonb,
        'updated', '[]'::jsonb,
        'deleted', '[]'::jsonb
      )
    );
  END LOOP;
  
  -- Prepare for a FAST first sync with turbo mode (full data dump)
  IF use_turbo = TRUE AND last_pulled_at IS NULL THEN
    RAISE NOTICE 'Running turbo sync for user %', user_id;
    
    -- Fetch all tables with all user data in one go for turbo sync
    FOR i IN 1..array_length(tables, 1) LOOP
      current_table_name := tables[i];
      
      -- Skip media-heavy tables if requested (when on metered connections)
      IF NOT include_media AND (current_table_name = 'posts' OR current_table_name = 'journal_entries') THEN
        CONTINUE;
      END IF;
      
      -- First check if table exists
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = current_table_name) THEN
        -- Build column list dynamically to exclude large media columns based on include_media flag
        SELECT string_agg(column_name, ', ') INTO column_list
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = current_table_name
          AND (include_media OR NOT column_name = ANY(ARRAY['image', 'image_url', 'avatar', 'avatar_url', 'thumbnail', 'images', 'media']));
          
        query := format(
          'SELECT jsonb_agg(t) FROM (SELECT %s FROM %I WHERE user_id = %L) t',
          column_list,
          current_table_name,
          user_id
        );
        
        -- Add conditions to trim large text if on metered connections
        IF NOT include_media THEN
          query := REPLACE(
            query, 
            'content,', 
            'CASE WHEN length(content) > 500 THEN substring(content, 1, 500) || ''...'' ELSE content END as content,'
          );
        END IF;
        
        EXECUTE query INTO created_records;
        
        IF created_records IS NOT NULL AND jsonb_array_length(created_records) > 0 THEN
          changes := jsonb_set(
            changes,
            ARRAY[current_table_name, 'created'],
            created_records
          );
        END IF;
        
        -- Also fetch deleted records for each table if the _deleted table exists
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = current_table_name || '_deleted') THEN
          query := format(
            'SELECT jsonb_agg(id) FROM %I_deleted WHERE user_id = %L',
            current_table_name,
            user_id
          );
          
          EXECUTE query INTO deleted_ids;
          
          IF deleted_ids IS NOT NULL AND jsonb_array_length(deleted_ids) > 0 THEN
            changes := jsonb_set(
              changes,
              ARRAY[current_table_name, 'deleted'],
              deleted_ids
            );
          END IF;
        END IF;
      END IF;
    END LOOP;
    
    -- Return the result with all tables for turbo sync
    return jsonb_build_object(
      'changes', changes,
      'timestamp', extract(epoch from current_timestamp) * 1000
    );
  ELSE
    -- Normal incremental sync path
    FOR i IN 1..array_length(tables, 1) LOOP
      current_table_name := tables[i];
      
      -- Skip media-heavy tables if requested (when on metered connections)
      IF NOT include_media AND (current_table_name = 'posts' OR current_table_name = 'journal_entries') THEN
        CONTINUE;
      END IF;
      
      -- Check if table exists before trying to query it
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = current_table_name) THEN
        -- Build column list dynamically
        SELECT string_agg(column_name, ', ') INTO column_list
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = current_table_name
          AND (include_media OR NOT column_name = ANY(ARRAY['image', 'image_url', 'avatar', 'avatar_url', 'thumbnail', 'images', 'media']));
        
        -- Fetch created and updated records
        IF last_pulled_at IS NULL THEN
          -- First sync pulls all records
          query := format(
            'SELECT jsonb_agg(t) FROM (SELECT %s FROM %I WHERE user_id = %L) t',
            column_list,
            current_table_name,
            user_id
          );
          
          -- Add conditions to trim large text if on metered connections
          IF NOT include_media THEN
            query := REPLACE(
              query, 
              'content,', 
              'CASE WHEN length(content) > 500 THEN substring(content, 1, 500) || ''...'' ELSE content END as content,'
            );
          END IF;
          
          EXECUTE query INTO created_records;
          
          -- All records go in "created" since it's first sync
          IF created_records IS NOT NULL AND jsonb_array_length(created_records) > 0 THEN
            changes := jsonb_set(
              changes,
              ARRAY[current_table_name, 'created'],
              created_records
            );
          END IF;
        ELSE
          -- Normal incremental sync for created records (created after last_pulled_at)
          query := format(
            'SELECT jsonb_agg(t) FROM (
              SELECT %s FROM %I 
              WHERE user_id = %L 
                AND created_at > %L
            ) t',
            column_list,
            current_table_name,
            user_id,
            last_pulled_at
          );
          
          -- Add conditions to trim large text if on metered connections
          IF NOT include_media THEN
            query := REPLACE(
              query, 
              'content,', 
              'CASE WHEN length(content) > 500 THEN substring(content, 1, 500) || ''...'' ELSE content END as content,'
            );
          END IF;
          
          EXECUTE query INTO created_records;
          
          IF created_records IS NOT NULL AND jsonb_array_length(created_records) > 0 THEN
            changes := jsonb_set(
              changes,
              ARRAY[current_table_name, 'created'],
              created_records
            );
          END IF;
          
          -- Get records updated after last pull
          query := format(
            'SELECT jsonb_agg(t) FROM (
              SELECT %s FROM %I 
              WHERE user_id = %L 
                AND updated_at > %L
                AND created_at <= %L
            ) t',
            column_list,
            current_table_name,
            user_id,
            last_pulled_at,
            last_pulled_at
          );
          
          -- Add conditions to trim large text if on metered connections
          IF NOT include_media THEN
            query := REPLACE(
              query, 
              'content,', 
              'CASE WHEN length(content) > 500 THEN substring(content, 1, 500) || ''...'' ELSE content END as content,'
            );
          END IF;
          
          EXECUTE query INTO updated_records;
          
          IF updated_records IS NOT NULL AND jsonb_array_length(updated_records) > 0 THEN
            changes := jsonb_set(
              changes,
              ARRAY[current_table_name, 'updated'],
              updated_records
            );
          END IF;
        END IF;
        
        -- Check for deleted records if the _deleted table exists
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = current_table_name || '_deleted') THEN
          -- Get deleted records since last pull
          IF last_pulled_at IS NULL THEN
            -- First sync gets all deleted (shouldn't be many)
            query := format(
              'SELECT jsonb_agg(id) FROM %I_deleted WHERE user_id = %L',
              current_table_name,
              user_id
            );
          ELSE
            -- Incremental gets only new deletes
            query := format(
              'SELECT jsonb_agg(id) FROM %I_deleted WHERE user_id = %L AND deleted_at > %L',
              current_table_name,
              user_id,
              last_pulled_at
            );
          END IF;
          
          EXECUTE query INTO deleted_ids;
          
          IF deleted_ids IS NOT NULL AND jsonb_array_length(deleted_ids) > 0 THEN
            changes := jsonb_set(
              changes,
              ARRAY[current_table_name, 'deleted'],
              deleted_ids
            );
          END IF;
        END IF;
      END IF;
    END LOOP;
    
    -- Return the final result
    RETURN jsonb_build_object(
      'changes', changes,
      'timestamp', extract(epoch from current_timestamp) * 1000
    );
  END IF;
END
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION sync_pull(TIMESTAMP WITH TIME ZONE, INTEGER, UUID, JSONB, BOOLEAN, TEXT, TEXT[], BOOLEAN) TO authenticated;

-- ==========================================
-- SYNC PUSH FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION sync_push(
  changes JSONB,
  last_pulled_at TIMESTAMP WITH TIME ZONE,
  user_id UUID,
  network_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '30s' -- Add timeout to prevent long-running queries
AS $$
DECLARE
  table_names TEXT[];
  table_name TEXT;
  table_changes JSONB;
  created_records JSONB;
  updated_records JSONB;
  deleted_ids JSONB;
  record_data JSONB;
  record_id TEXT;
  query TEXT;
  i INTEGER;
BEGIN
  -- Get the names of all tables with changes
  SELECT array_agg(key) INTO table_names FROM jsonb_object_keys(changes) AS key;

  -- Process each table
  IF table_names IS NOT NULL THEN
    FOR i IN 1..array_length(table_names, 1) LOOP
      table_name := table_names[i];
      table_changes := changes->table_name;

      -- Process created records
      created_records := table_changes->'created';
      IF created_records IS NOT NULL AND jsonb_array_length(created_records) > 0 THEN
        FOR i IN 0..jsonb_array_length(created_records)-1 LOOP
          record_data := created_records->i;
          
          -- Always use "ON CONFLICT (id) DO UPDATE" to handle potential race conditions
          -- or when records were deleted and re-created
          
          -- Build column list for insert
          WITH cols AS (
            SELECT 
              string_agg(key, ', ') AS cols,
              string_agg(format('$1->''%s''', key), ', ') AS vals,
              string_agg(format('%s = EXCLUDED.%s', key, key), ', ') AS updates
            FROM jsonb_object_keys(record_data) AS key
            WHERE key != 'id'
          )
          
          SELECT 
            format(
              'INSERT INTO %I (id, %s) VALUES ($2, %s) ON CONFLICT (id) DO UPDATE SET %s',
              table_name,
              cols,
              vals,
              updates
            ) 
          INTO query 
          FROM cols;
          
          -- Execute with parameters for better security
          EXECUTE query USING record_data, (record_data->>'id')::text;
        END LOOP;
      END IF;
      
      -- Process updated records
      updated_records := table_changes->'updated';
      IF updated_records IS NOT NULL AND jsonb_array_length(updated_records) > 0 THEN
        FOR i IN 0..jsonb_array_length(updated_records)-1 LOOP
          record_data := updated_records->i;
          record_id := record_data->>'id';
          
          -- Build column list for update
          WITH cols AS (
            SELECT 
              string_agg(format('%s = $1->''%s''', key, key), ', ') AS updates
            FROM jsonb_object_keys(record_data) AS key
            WHERE key != 'id'
          )
          
          SELECT 
            format(
              'UPDATE %I SET %s WHERE id = $2 AND user_id = $3',
              table_name,
              updates
            ) 
          INTO query 
          FROM cols;
          
          -- Check for conflict with last_pulled_at timestamp
          IF last_pulled_at IS NOT NULL THEN
            query := query || format(' AND (updated_at IS NULL OR updated_at <= %L)', last_pulled_at);
          END IF;
          
          -- Execute with parameters for better security
          EXECUTE query USING record_data, record_id, user_id;
        END LOOP;
      END IF;
      
      -- Process deleted records
      deleted_ids := table_changes->'deleted';
      IF deleted_ids IS NOT NULL AND jsonb_array_length(deleted_ids) > 0 THEN
        FOR i IN 0..jsonb_array_length(deleted_ids)-1 LOOP
          record_id := deleted_ids->i->>'id';
          
          -- Remove quotes if present
          record_id := trim(both '"' from record_id);
          
          -- First, insert into the _deleted tracking table if it exists
          BEGIN
            IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name || '_deleted') THEN
              query := format(
                'INSERT INTO %I_deleted (id, user_id, deleted_at) VALUES (%L, %L, NOW()) ON CONFLICT (id) DO NOTHING',
                table_name,
                record_id,
                user_id
              );
              
              EXECUTE query;
            END IF;
          
            -- Then delete from the main table
            query := format(
              'DELETE FROM %I WHERE id = %L AND user_id = %L',
              table_name,
              record_id,
              user_id
            );
            
            -- Check for conflict with last_pulled_at timestamp
            IF last_pulled_at IS NOT NULL THEN
              query := query || format(' AND (updated_at IS NULL OR updated_at <= %L)', last_pulled_at);
            END IF;
            
            EXECUTE query;
          EXCEPTION
            WHEN others THEN
              -- Log errors but continue processing other records
              RAISE NOTICE 'Error deleting record % from table %: %', record_id, table_name, SQLERRM;
          END;
        END LOOP;
      END IF;
    END LOOP;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'timestamp', extract(epoch from now()) * 1000
  );
END
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION sync_push(JSONB, TIMESTAMP WITH TIME ZONE, UUID, TEXT) TO authenticated;

-- Create a maintenance function to clean up old sync data
CREATE OR REPLACE FUNCTION cleanup_sync_data(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  table_names TEXT[];
  cleaned_count INTEGER := 0;
  affected_rows INTEGER;
BEGIN
  -- Get all tables with _deleted suffix
  SELECT array_agg(table_name) INTO table_names
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name LIKE '%_deleted';
  
  -- Clean up each _deleted table
  IF table_names IS NOT NULL THEN
    FOR i IN 1..array_length(table_names, 1) LOOP
      EXECUTE format(
        'DELETE FROM %I WHERE deleted_at < NOW() - INTERVAL ''%s days''',
        table_names[i],
        days_to_keep
      ) INTO affected_rows;
      
      cleaned_count := cleaned_count + affected_rows;
    END LOOP;
  END IF;
  
  RETURN cleaned_count;
END
$$;

-- Create a function to create or ensure _deleted tables exist for all tracked tables
CREATE OR REPLACE FUNCTION ensure_deleted_tables()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tables TEXT[] := ARRAY['profiles', 'plants', 'grow_journals', 'journal_entries', 'grow_locations', 'diary_entries', 'plant_tasks', 'posts'];
  table_name TEXT;
BEGIN
  FOR i IN 1..array_length(tables, 1) LOOP
    table_name := tables[i];
    
    -- Check if main table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name) THEN
      -- Check if _deleted table exists, create if not
      IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name || '_deleted') THEN
        EXECUTE format(
          'CREATE TABLE %I_deleted (
            id TEXT PRIMARY KEY,
            user_id UUID NOT NULL,
            deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )',
          table_name
        );
        
        -- Add index on user_id for better performance
        EXECUTE format(
          'CREATE INDEX %I_deleted_user_id_idx ON %I_deleted(user_id)',
          table_name,
          table_name
        );
        
        -- Add index on deleted_at for cleanup function
        EXECUTE format(
          'CREATE INDEX %I_deleted_deleted_at_idx ON %I_deleted(deleted_at)',
          table_name,
          table_name
        );
        
        -- Add RLS policies
        EXECUTE format(
          'ALTER TABLE %I_deleted ENABLE ROW LEVEL SECURITY',
          table_name
        );
        
        EXECUTE format(
          'CREATE POLICY "%1$I_deleted_select_policy" ON %1$I_deleted FOR SELECT TO authenticated USING (user_id::text = auth.uid()::text)',
          table_name
        );
        
        EXECUTE format(
          'CREATE POLICY "%1$I_deleted_insert_policy" ON %1$I_deleted FOR INSERT TO authenticated WITH CHECK (user_id::text = auth.uid()::text)',
          table_name
        );
        
        RAISE NOTICE 'Created deleted records table for %', table_name;
      END IF;
    END IF;
  END LOOP;
END
$$;

-- Run the function to ensure all _deleted tables exist
SELECT ensure_deleted_tables();

-- Create a cron job to clean up old sync data (requires pg_cron extension)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if it exists
    PERFORM cron.unschedule('cleanup_old_sync_data');
    
    -- Schedule daily cleanup at 3:00 AM
    PERFORM cron.schedule(
      'cleanup_old_sync_data',
      '0 3 * * *',
      $$SELECT cleanup_sync_data(30)$$
    );
    
    RAISE NOTICE 'Scheduled daily sync cleanup job with pg_cron';
  ELSE
    RAISE NOTICE 'pg_cron extension not available, skipping automatic cleanup scheduling';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error scheduling cleanup job: %', SQLERRM;
END
$$;
