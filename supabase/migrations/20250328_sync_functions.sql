-- Migration: 20250328_sync_functions.sql
-- Create Supabase server-side functions for WatermelonDB sync

-- ==========================================
-- SYNC PULL FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION sync_pull(
  last_pulled_at TIMESTAMP WITH TIME ZONE,
  schema_version INTEGER,
  user_id UUID,
  migration JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  tables TEXT[] := ARRAY['profiles', 'plants', 'grow_journals', 'journal_entries', 'grow_locations', 'diary_entries', 'plant_tasks', 'posts'];
  table_name TEXT;
  query TEXT;
  changes JSONB := jsonb_build_object();
  table_changes JSONB;
  current_timestamp TIMESTAMP WITH TIME ZONE := now();
  created_records JSONB;
  updated_records JSONB;
  deleted_ids JSONB;
  record_row RECORD;
  i INTEGER;
BEGIN
  -- For each table, fetch records updated since last pull
  FOREACH table_name IN ARRAY tables
  LOOP
    -- Initialize the table changes object with empty arrays
    table_changes := jsonb_build_object(
      'created', jsonb_build_array(),
      'updated', jsonb_build_array(),
      'deleted', jsonb_build_array()
    );
    
    -- Get created and updated records
    created_records := table_changes->'created';
    updated_records := table_changes->'updated';
    
    -- Construct query for records created/updated since last_pulled_at
    query := format(
      'SELECT * FROM %I WHERE user_id = $1 AND ($2::TIMESTAMP IS NULL OR updated_at > $2)',
      table_name
    );
    
    -- Execute query and build the created/updated arrays
    FOR record_row IN EXECUTE query USING user_id, last_pulled_at
    LOOP
      -- Convert row to JSON
      IF last_pulled_at IS NULL OR 
         (record_row.created_at = record_row.updated_at) OR
         (last_pulled_at IS NOT NULL AND record_row.created_at > last_pulled_at) THEN
        -- This is a new record
        created_records := created_records || to_jsonb(record_row);
      ELSE
        -- This is an updated record
        updated_records := updated_records || to_jsonb(record_row);
      END IF;
    END LOOP;
    
    -- Update table changes with new arrays
    table_changes := jsonb_set(table_changes, ARRAY['created'], created_records);
    table_changes := jsonb_set(table_changes, ARRAY['updated'], updated_records);
    
    -- Handle deleted records
    deleted_ids := table_changes->'deleted';
    
    -- Query for deleted records
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND 
            table_name = format('%s_deleted', table_name)
    ) THEN
      query := format(
        'SELECT id FROM %I_deleted WHERE user_id = $1 AND ($2::TIMESTAMP IS NULL OR deleted_at > $2)',
        table_name
      );
      
      -- Execute query to get deleted record IDs
      FOR record_row IN EXECUTE query USING user_id, last_pulled_at
      LOOP
        deleted_ids := deleted_ids || to_jsonb(record_row.id);
      END LOOP;
      
      -- Update table changes with deleted IDs
      table_changes := jsonb_set(table_changes, ARRAY['deleted'], deleted_ids);
    END IF;
    
    -- Add this table's changes to the overall changes object
    changes := jsonb_set(changes, ARRAY[table_name], table_changes);
  END LOOP;
  
  -- Build the final result with changes and timestamp
  result := jsonb_build_object(
    'changes', changes,
    'timestamp', extract(epoch from current_timestamp) * 1000, -- milliseconds since epoch
    'lastPulledAt', extract(epoch from current_timestamp) * 1000, -- milliseconds since epoch
    'schemaVersion', schema_version
  );
  
  -- Handle migration if provided
  IF migration IS NOT NULL THEN
    result := jsonb_set(result, ARRAY['migration'], migration);
  END IF;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION sync_pull(TIMESTAMP WITH TIME ZONE, INTEGER, UUID, JSONB) TO authenticated;

-- ==========================================
-- SYNC PUSH FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION sync_push(
  changes JSONB,
  last_pulled_at TIMESTAMP WITH TIME ZONE,
  user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tables TEXT[] := ARRAY['profiles', 'plants', 'grow_journals', 'journal_entries', 'grow_locations', 'diary_entries', 'plant_tasks', 'posts'];
  table_name TEXT;
  table_changes JSONB;
  record_json JSONB;
  record_id TEXT;
  id_field TEXT;
  query TEXT;
  columns TEXT[];
  column_values TEXT[];
  column_placeholders TEXT[];
  set_clause TEXT;
  col_names TEXT := '';
  col_values TEXT := '';
  set_statements TEXT := '';
  i INTEGER;
  created_records JSONB;
  updated_records JSONB;
  deleted_ids JSONB;
  column_name TEXT;
  column_value TEXT;
  json_key_rec RECORD;
BEGIN
  -- Process each table's changes
  FOREACH table_name IN ARRAY tables
  LOOP
    -- Get the changes for this table
    table_changes := changes->table_name;
    
    -- Skip if no changes for this table
    IF table_changes IS NULL OR 
       (jsonb_array_length(table_changes->'created') = 0 AND 
        jsonb_array_length(table_changes->'updated') = 0 AND 
        jsonb_array_length(table_changes->'deleted') = 0) THEN
      CONTINUE;
    END IF;
    
    -- Map the ID field for the current table
    IF table_name = 'profiles' THEN
      id_field := 'user_id';
    ELSIF table_name = 'plants' THEN
      id_field := 'plant_id';
    ELSIF table_name = 'grow_journals' THEN
      id_field := 'journal_id';
    ELSIF table_name = 'journal_entries' THEN
      id_field := 'entry_id';
    ELSIF table_name = 'grow_locations' THEN
      id_field := 'location_id';
    ELSIF table_name = 'diary_entries' THEN
      id_field := 'entry_id';
    ELSIF table_name = 'plant_tasks' THEN
      id_field := 'task_id';
    ELSIF table_name = 'posts' THEN
      id_field := 'post_id';
    ELSE
      id_field := 'id';
    END IF;
    
    -- Process created records
    created_records := table_changes->'created';
    IF jsonb_array_length(created_records) > 0 THEN
      FOR i IN 0..jsonb_array_length(created_records)-1 LOOP
        record_json := created_records->i;
        
        -- Ensure user_id is set to the authenticated user
        record_json := jsonb_set(record_json, '{user_id}', to_jsonb(user_id::text));
        
        -- Set created_at and updated_at
        record_json := jsonb_set(record_json, '{created_at}', to_jsonb(now()));
        record_json := jsonb_set(record_json, '{updated_at}', to_jsonb(now()));
        
        -- Get the record ID and set the appropriate ID field
        record_id := record_json->>'id';
        record_json := jsonb_set(record_json, format('{%s}', id_field)::text[], to_jsonb(record_id));
        
        -- Build SQL parts for the insert
        col_names := '';
        col_values := '';
        
        -- Loop through record fields to build the column and values lists
        FOR json_key_rec IN SELECT * FROM jsonb_each_text(record_json)
        LOOP
          column_name := json_key_rec.key;
          column_value := json_key_rec.value;
          
          -- Skip id field as it's handled with the specific ID field
          IF column_name != 'id' THEN
            col_names := col_names || format('%I, ', column_name);
            
            -- Handle different value types
            IF column_value IS NULL THEN
              col_values := col_values || 'NULL, ';
            ELSIF jsonb_typeof(record_json->column_name) = 'boolean' THEN
              col_values := col_values || format('%L, ', column_value);
            ELSIF jsonb_typeof(record_json->column_name) = 'number' THEN
              col_values := col_values || format('%s, ', column_value);
            ELSE
              col_values := col_values || format('%L, ', column_value);
            END IF;
          END IF;
        END LOOP;
        
        -- Remove trailing commas
        col_names := LEFT(col_names, LENGTH(col_names) - 2);
        col_values := LEFT(col_values, LENGTH(col_values) - 2);
        
        -- Build and execute insert query
        query := format(
          'INSERT INTO %I (%s) VALUES (%s) ON CONFLICT (%s) DO UPDATE SET updated_at = NOW()',
          table_name,
          col_names,
          col_values,
          id_field
        );
        
        EXECUTE query;
      END LOOP;
    END IF;
    
    -- Process updated records
    updated_records := table_changes->'updated';
    IF jsonb_array_length(updated_records) > 0 THEN
      FOR i IN 0..jsonb_array_length(updated_records)-1 LOOP
        record_json := updated_records->i;
        
        -- Ensure user_id is set to the authenticated user
        record_json := jsonb_set(record_json, '{user_id}', to_jsonb(user_id::text));
        
        -- Set updated_at
        record_json := jsonb_set(record_json, '{updated_at}', to_jsonb(now()));
        
        -- Get the record ID 
        record_id := record_json->>'id';
        
        -- Build the SET clause for the update
        set_statements := '';
        
        -- Loop through record fields to build the SET clause
        FOR json_key_rec IN SELECT * FROM jsonb_each_text(record_json)
        LOOP
          column_name := json_key_rec.key;
          column_value := json_key_rec.value;
          
          -- Skip id field as it's used in the WHERE clause
          IF column_name != 'id' THEN
            -- Handle different value types
            IF column_value IS NULL THEN
              set_statements := set_statements || format('%I = NULL, ', column_name);
            ELSIF jsonb_typeof(record_json->column_name) = 'boolean' THEN
              set_statements := set_statements || format('%I = %L, ', column_name, column_value);
            ELSIF jsonb_typeof(record_json->column_name) = 'number' THEN
              set_statements := set_statements || format('%I = %s, ', column_name, column_value);
            ELSE
              set_statements := set_statements || format('%I = %L, ', column_name, column_value);
            END IF;
          END IF;
        END LOOP;
        
        -- Remove trailing comma
        set_statements := LEFT(set_statements, LENGTH(set_statements) - 2);
        
        -- Build and execute update query
        query := format(
          'UPDATE %I SET %s WHERE %s = %L',
          table_name,
          set_statements,
          id_field,
          record_id
        );
        
        -- Check for conflict with last_pulled_at timestamp
        IF last_pulled_at IS NOT NULL THEN
          query := query || format(' AND (updated_at IS NULL OR updated_at <= %L)', last_pulled_at);
        END IF;
        
        EXECUTE query;
      END LOOP;
    END IF;
    
    -- Process deleted records
    deleted_ids := table_changes->'deleted';
    IF jsonb_array_length(deleted_ids) > 0 THEN
      FOR i IN 0..jsonb_array_length(deleted_ids)-1 LOOP
        record_id := deleted_ids->i::text;
        
        -- Remove quotes if present
        record_id := trim(both '"' from record_id);
        
        -- First, insert into the _deleted tracking table
        query := format(
          'INSERT INTO %I_deleted (id, user_id, deleted_at) VALUES (%L, %L, NOW()) ON CONFLICT (id) DO NOTHING',
          table_name,
          record_id,
          user_id
        );
        
        BEGIN
          EXECUTE query;
        EXCEPTION WHEN OTHERS THEN
          -- Ignore errors for missing deleted tables
          NULL;
        END;
        
        -- Then delete from the main table
        query := format(
          'DELETE FROM %I WHERE %s = %L AND user_id = %L',
          table_name,
          id_field,
          record_id,
          user_id
        );
        
        -- Check for conflict with last_pulled_at timestamp
        IF last_pulled_at IS NOT NULL THEN
          query := query || format(' AND (updated_at IS NULL OR updated_at <= %L)', last_pulled_at);
        END IF;
        
        EXECUTE query;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION sync_push(JSONB, TIMESTAMP WITH TIME ZONE, UUID) TO authenticated;
