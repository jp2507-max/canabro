-- Migration to fix the "syntax error at or near strain" issue in sync_push function

-- First, drop the existing function to recreate it with the fix
DROP FUNCTION IF EXISTS sync_push(JSONB, TIMESTAMP WITH TIME ZONE, UUID, TEXT);

-- Recreate the sync_push function with special handling for strain-related fields
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
  j INTEGER;
  cols_data RECORD;
  reserved_keywords TEXT[] := ARRAY['strain', 'user', 'group', 'order', 'limit', 'offset', 'select', 'update', 'delete', 'where', 'from', 'join'];
  debug_payload JSONB;
BEGIN
  -- Get the names of all tables with changes
  SELECT array_agg(key) INTO table_names FROM jsonb_object_keys(changes) AS key;
  
  -- Debug: Log the tables being processed
  RAISE NOTICE 'Processing tables: %', table_names;

  -- Process each table
  IF table_names IS NOT NULL THEN
    FOR i IN 1..array_length(table_names, 1) LOOP
      table_name := table_names[i];
      table_changes := changes->table_name;

      -- Process created records
      created_records := table_changes->'created';
      IF created_records IS NOT NULL AND jsonb_array_length(created_records) > 0 THEN
        FOR j IN 0..jsonb_array_length(created_records)-1 LOOP
          record_data := created_records->j;
          
          -- Build column list for insert
          WITH cols AS (
            SELECT 
              string_agg(format('%I', key), ', ') AS cols, -- Always quote column names
              string_agg(
                CASE 
                  WHEN key = 'user_id' THEN format('($1->>''%s'')::uuid', key)
                  WHEN key = ANY(ARRAY['created_at', 'updated_at', 'deleted_at', 'started_at', 'finished_at', 'date', 'timestamp']) THEN format('($1->>''%s'')::timestamp with time zone', key)
                  WHEN key = 'next_nutrient_days' THEN format('(NULLIF($1->>''%s'', ''''))::numeric', key)
                  WHEN key = 'strain' THEN format('($1->>''%s'')::text', key) -- Special handling for strain
                  WHEN key = 'strain_id' THEN format('($1->>''%s'')::uuid', key) -- Special handling for strain_id
                  WHEN key = ANY(ARRAY['height', 'width', 'weight', 'length', 'temperature', 'humidity', 'ph', 'ec', 'tds', 'lux', 'ppfd', 'vpd', 'water_intake', 'rating', 'yield_amount', 'pot_size', 'distance_from_light', 'training_hours_spent']) THEN format('(NULLIF($1->>''%s'', ''''))::numeric', key)
                  ELSE format('($1->>''%s'')::text', key) -- Cast all other fields to text explicitly
                END, ', ') AS vals,
              string_agg(format('%I = EXCLUDED.%I', key, key), ', ') AS updates -- Always quote column names for ON CONFLICT
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
          
          -- Debug: Log the generated query
          RAISE NOTICE 'Generated INSERT query: %', query;
          
          EXECUTE query USING record_data;
        END LOOP;
      END IF;
      
      -- Process updated records
      updated_records := table_changes->'updated';
      IF updated_records IS NOT NULL AND jsonb_array_length(updated_records) > 0 THEN
        FOR j IN 0..jsonb_array_length(updated_records)-1 LOOP
          record_data := updated_records->j;
          record_id := record_data->>'id';
          
          -- Build column list for update
          WITH cols AS (
            SELECT 
              string_agg(
                CASE 
                  WHEN key = 'user_id' THEN format('%I = ($1->>''%s'')::uuid', key, key)
                  WHEN key = ANY(ARRAY['created_at', 'updated_at', 'deleted_at', 'started_at', 'finished_at', 'date', 'timestamp']) THEN format('%I = ($1->>''%s'')::timestamp with time zone', key, key)
                  WHEN key = 'next_nutrient_days' THEN format('%I = (NULLIF($1->>''%s'', ''''))::numeric', key, key)
                  WHEN key = 'strain' THEN format('%I = ($1->>''%s'')::text', key, key) -- Special handling for strain
                  WHEN key = 'strain_id' THEN format('%I = ($1->>''%s'')::uuid', key, key) -- Special handling for strain_id
                  WHEN key = ANY(ARRAY['height', 'width', 'weight', 'length', 'temperature', 'humidity', 'ph', 'ec', 'tds', 'lux', 'ppfd', 'vpd', 'water_intake', 'rating', 'yield_amount', 'pot_size', 'distance_from_light', 'training_hours_spent']) THEN format('%I = (NULLIF($1->>''%s'', ''''))::numeric', key, key)
                  ELSE format('%I = ($1->>''%s'')::text', key, key) -- Cast all other fields to text explicitly
                END, ', ') AS updates
            FROM jsonb_object_keys(record_data) AS key
            WHERE key != 'id' -- Exclude id field from updates
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

          -- Debug: Log the generated query
          RAISE NOTICE 'Generated UPDATE query: %', query;
          
          EXECUTE query USING record_data, record_id::uuid, user_id;
        END LOOP;
      END IF;
      
      -- Process deleted records
      deleted_ids := table_changes->'deleted';
      IF deleted_ids IS NOT NULL AND jsonb_array_length(deleted_ids) > 0 THEN
        FOR j IN 0..jsonb_array_length(deleted_ids)-1 LOOP
          record_id := deleted_ids->j->>'id';
          
          -- Remove quotes if present
          record_id := trim(both '"' from record_id);
          
          -- First, insert into the _deleted tracking table if it exists
          BEGIN
            IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name || '_deleted') THEN
              query := format(
                'INSERT INTO %I (id, user_id, deleted_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO NOTHING',
                table_name || '_deleted' -- Concatenate _deleted before applying %I
              );
              
              -- Debug: Log the generated query
              RAISE NOTICE 'Generated DELETE tracking insertion: %', query;
              
              EXECUTE query USING record_id::uuid, user_id;
            END IF;
          
            -- Then delete from the main table
            query := format(
              'DELETE FROM %I WHERE id = $1 AND user_id = $2',
              table_name
            );
            
            -- Check for conflict with last_pulled_at timestamp
            IF last_pulled_at IS NOT NULL THEN
              query := query || format(' AND (updated_at IS NULL OR updated_at <= %L)', last_pulled_at);
            END IF;
            
            -- Debug: Log the generated query
            RAISE NOTICE 'Generated DELETE query: %', query;
            
            EXECUTE query USING record_id::uuid, user_id;
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
EXCEPTION
  WHEN others THEN
    -- Log detailed error information
    GET DIAGNOSTICS debug_payload = PG_EXCEPTION_CONTEXT;
    RAISE NOTICE 'Error in sync_push: %, SQLSTATE: %, Context: %', 
      SQLERRM, 
      SQLSTATE,
      debug_payload;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'timestamp', extract(epoch from now()) * 1000
    );
END
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION sync_push(JSONB, TIMESTAMP WITH TIME ZONE, UUID, TEXT) TO authenticated;

-- Update ensure_deleted_tables function to include 'strains' table
CREATE OR REPLACE FUNCTION ensure_deleted_tables()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Add 'strains' to the list of tables
  tables TEXT[] := ARRAY['profiles', 'plants', 'grow_journals', 'journal_entries', 'grow_locations', 'diary_entries', 'plant_tasks', 'posts', 'strains'];
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
      current_table_name_var || '_deleted'
    );
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%s_deleted_user_id_deleted_at ON %I (user_id, deleted_at)',
        replace(current_table_name_var, '-', '_'), current_table_name_var || '_deleted'
    );
  END LOOP;
END
$$;
