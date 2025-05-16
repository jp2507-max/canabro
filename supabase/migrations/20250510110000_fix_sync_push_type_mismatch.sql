-- Migration to fix type mismatch for next_nutrient_days in sync_push function

-- First, drop the existing function to recreate it with the fix
DROP FUNCTION IF EXISTS sync_push(JSONB, TIMESTAMP WITH TIME ZONE, UUID, TEXT);

-- Recreate the sync_push function with the corrected type casting
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
  cols_data RECORD;
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
          
          -- Build column list for insert
          WITH cols AS (
            SELECT 
              string_agg(format('%I', key), ', ') AS cols, -- Changed: Quote column names
              string_agg(
                CASE 
                  WHEN key = 'user_id' THEN format('($1->>''%s'')::uuid', key)
                  WHEN key = ANY(ARRAY['created_at', 'updated_at', 'deleted_at', 'started_at', 'finished_at', 'date', 'timestamp']) THEN format('($1->>''%s'')::timestamp with time zone', key)
                  WHEN key = 'next_nutrient_days' THEN format('(NULLIF($1->>''%s'', ''''''))::numeric', key) -- Explicit cast for next_nutrient_days
                  WHEN key = ANY(ARRAY['height', 'width', 'weight', 'length', 'temperature', 'humidity', 'ph', 'ec', 'tds', 'lux', 'ppfd', 'vpd', 'water_intake', 'rating', 'yield_amount', 'pot_size', 'distance_from_light', 'training_hours_spent']) THEN format('(NULLIF($1->>''%s'', ''''''))::numeric', key)
                  ELSE format('$1->>''%s''', key)
                END, ', ') AS vals,
              string_agg(format('%I = EXCLUDED.%I', key, key), ', ') AS updates -- Changed: Quote column names for ON CONFLICT
            FROM jsonb_object_keys(record_data) AS key
          )
          SELECT cols, vals, updates INTO cols_data FROM cols;

          query := format(
            'INSERT INTO %I (id, %s) VALUES (($1->>''id'')::uuid, %s) ON CONFLICT (id) DO UPDATE SET %s',
            table_name,
            cols_data.cols,
            cols_data.vals,
            cols_data.updates
          );
          
          EXECUTE query USING record_data;
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
              string_agg(
                CASE 
                  WHEN key = 'user_id' THEN format('%I = ($1->>''%s'')::uuid', key, key) -- Changed: Quote target column
                  WHEN key = ANY(ARRAY['created_at', 'updated_at', 'deleted_at', 'started_at', 'finished_at', 'date', 'timestamp']) THEN format('%I = ($1->>''%s'')::timestamp with time zone', key, key) -- Changed: Quote target column
                  WHEN key = 'next_nutrient_days' THEN format('%I = (NULLIF($1->>''%s'', ''''''))::numeric', key, key) -- Changed: Quote target column
                  WHEN key = ANY(ARRAY['height', 'width', 'weight', 'length', 'temperature', 'humidity', 'ph', 'ec', 'tds', 'lux', 'ppfd', 'vpd', 'water_intake', 'rating', 'yield_amount', 'pot_size', 'distance_from_light', 'training_hours_spent']) THEN format('%I = (NULLIF($1->>''%s'', ''''''))::numeric', key, key) -- Changed: Quote target column
                  ELSE format('%I = ($1->>''%s'')', key, key) -- Changed: Quote target column
                END, ', ') AS updates
            FROM jsonb_object_keys(record_data) AS key
          )
          SELECT updates INTO cols_data FROM cols;

          query := format(
            'UPDATE %I SET %s WHERE id = ($2)::uuid AND user_id = $3',
            table_name,
            cols_data.updates
          );
          
          IF last_pulled_at IS NOT NULL THEN
            query := query || format(' AND (updated_at IS NULL OR updated_at <= %L)', last_pulled_at);
          END IF;
          
          EXECUTE query USING record_data, record_id::uuid, user_id;
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
                'INSERT INTO %I (id, user_id, deleted_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO NOTHING', -- Use $1, $2 for parameters
                table_name || '_deleted' -- Corrected: Concatenate _deleted before applying %I
              );
              
              EXECUTE query USING record_id::uuid, user_id; -- Cast record_id to UUID
            END IF;
          
            -- Then delete from the main table
            query := format(
              'DELETE FROM %I WHERE id = $1 AND user_id = $2', -- Use $1, $2 for parameters
              table_name
            );
            
            -- Check for conflict with last_pulled_at timestamp
            IF last_pulled_at IS NOT NULL THEN
              query := query || format(' AND (updated_at IS NULL OR updated_at <= %L)', last_pulled_at);
            END IF;
            
            EXECUTE query USING record_id::uuid, user_id; -- Cast record_id to UUID
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

-- Recreate other functions from the original migration if they were dropped or need to be ensured.
-- It's crucial to ensure that sync_pull, cleanup_sync_data, and ensure_deleted_tables are still defined
-- with their correct permissions after this migration.

-- ==========================================
-- SYNC PULL FUNCTION (ensure it exists)
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
SET statement_timeout = '30s' 
AS $$
DECLARE
  result JSONB;
  tables TEXT[];
  current_table_name TEXT; 
  query TEXT;
  changes JSONB := jsonb_build_object();
  table_changes JSONB;
  current_timestamp TIMESTAMP WITH TIME ZONE := now();
  created_records JSONB;
  updated_records JSONB;
  deleted_ids JSONB;
  record_row RECORD;
  i INTEGER;
  column_list TEXT; 
BEGIN
  IF tables_to_sync IS NULL OR array_length(tables_to_sync, 1) = 0 THEN
    tables := ARRAY['profiles', 'plants', 'grow_journals', 'journal_entries', 'grow_locations', 'diary_entries', 'plant_tasks', 'posts'];
  ELSE
    tables := tables_to_sync;
  END IF;
  
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
  
  IF use_turbo = TRUE AND last_pulled_at IS NULL THEN
    RAISE NOTICE 'Running turbo sync for user %', user_id;
    FOR i IN 1..array_length(tables, 1) LOOP
      current_table_name := tables[i];
      IF NOT include_media AND (current_table_name = 'posts' OR current_table_name = 'journal_entries') THEN
        CONTINUE;
      END IF;
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = current_table_name) THEN
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
        IF NOT include_media THEN
          query := REPLACE(
            query, 
            'content,', 
            'CASE WHEN length(content) > 500 THEN substring(content, 1, 500) || ''''... '''' ELSE content END as content,'
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
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = current_table_name || '_deleted') THEN
          query := format(
            'SELECT jsonb_agg(id) FROM %I WHERE user_id = %L', -- Corrected: Concatenate _deleted before applying %I
            current_table_name || '_deleted',
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
    return jsonb_build_object(
      'changes', changes,
      'timestamp', extract(epoch from current_timestamp) * 1000
    );
  ELSE
    FOR i IN 1..array_length(tables, 1) LOOP
      current_table_name := tables[i];
      IF NOT include_media AND (current_table_name = 'posts' OR current_table_name = 'journal_entries') THEN
        CONTINUE;
      END IF;
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = current_table_name) THEN
        SELECT string_agg(column_name, ', ') INTO column_list
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = current_table_name
          AND (include_media OR NOT column_name = ANY(ARRAY['image', 'image_url', 'avatar', 'avatar_url', 'thumbnail', 'images', 'media']));
        IF last_pulled_at IS NULL THEN
          query := format(
            'SELECT jsonb_agg(t) FROM (SELECT %s FROM %I WHERE user_id = %L) t',
            column_list,
            current_table_name,
            user_id
          );
          IF NOT include_media THEN
            query := REPLACE(
              query, 
              'content,', 
              'CASE WHEN length(content) > 500 THEN substring(content, 1, 500) || ''''... '''' ELSE content END as content,'
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
        ELSE
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
          IF NOT include_media THEN
            query := REPLACE(
              query, 
              'content,', 
              'CASE WHEN length(content) > 500 THEN substring(content, 1, 500) || ''''... '''' ELSE content END as content,'
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
          IF NOT include_media THEN
            query := REPLACE(
              query, 
              'content,', 
              'CASE WHEN length(content) > 500 THEN substring(content, 1, 500) || ''''... '''' ELSE content END as content,'
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
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = current_table_name || '_deleted') THEN
          IF last_pulled_at IS NULL THEN
            query := format(
              'SELECT jsonb_agg(id) FROM %I WHERE user_id = %L', -- Corrected: Concatenate _deleted before applying %I
              current_table_name || '_deleted',
              user_id
            );
          ELSE
            query := format(
              'SELECT jsonb_agg(id) FROM %I WHERE user_id = %L AND deleted_at > %L', -- Corrected: Concatenate _deleted before applying %I
              current_table_name || '_deleted',
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
    RETURN jsonb_build_object(
      'changes', changes,
      'timestamp', extract(epoch from current_timestamp) * 1000
    );
  END IF;
END
$$;
GRANT EXECUTE ON FUNCTION sync_pull(TIMESTAMP WITH TIME ZONE, INTEGER, UUID, JSONB, BOOLEAN, TEXT, TEXT[], BOOLEAN) TO authenticated;

-- ==========================================
-- CLEANUP SYNC DATA FUNCTION (ensure it exists)
-- ==========================================
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
  SELECT array_agg(table_name) INTO table_names
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name LIKE '%_deleted';
  
  IF table_names IS NOT NULL THEN
    FOR i IN 1..array_length(table_names, 1) LOOP
      EXECUTE format(
        'DELETE FROM %I WHERE deleted_at < NOW() - INTERVAL ''''%s days''''',
        table_names[i],
        days_to_keep
      ) INTO affected_rows;
      
      cleaned_count := cleaned_count + affected_rows;
    END LOOP;
  END IF;
  
  RETURN cleaned_count;
END
$$;

-- ==========================================
-- ENSURE DELETED TABLES FUNCTION (ensure it exists)
-- ==========================================
CREATE OR REPLACE FUNCTION ensure_deleted_tables()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tables TEXT[] := ARRAY['profiles', 'plants', 'grow_journals', 'journal_entries', 'grow_locations', 'diary_entries', 'plant_tasks', 'posts'];
  current_table_name_var TEXT;
BEGIN
  FOR i IN 1..array_length(tables, 1) LOOP
    current_table_name_var := tables[i];
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )',
      current_table_name_var || '_deleted' -- Corrected: Concatenate _deleted before applying %I
    );
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%s_deleted_user_id_deleted_at ON %I (user_id, deleted_at)',
        replace(current_table_name_var, '-', '_'), current_table_name_var || '_deleted'  -- Corrected: Concatenate _deleted before applying %I
    );
  END LOOP;
END
$$;
