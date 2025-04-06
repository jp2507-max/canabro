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
  -- For each table, fetch records updated since last pull
  FOREACH current_table_name IN ARRAY tables -- Use renamed variable
  LOOP
    -- Determine column list based on current_table_name, excluding _status and _changed
    IF current_table_name = 'profiles' THEN
      column_list := 'id, user_id, username, full_name, avatar_url, birth_date, bio, created_at, updated_at, experience_level, preferred_grow_method, favorite_strains, growing_since, location, is_certified, certifications, auth_provider, email_verified, last_sign_in';
    ELSIF current_table_name = 'plants' THEN
        -- Removed plant_id from the list
        column_list := 'id, user_id, name, strain, stage, planted_date, location_id, journal_id, created_at, updated_at, growth_stage, height, image_url, strain_id, notes, last_synced_at, is_deleted, cannabis_type, grow_medium, light_condition, location_description';
    ELSIF current_table_name = 'grow_journals' THEN
        column_list := 'id, user_id, title, description, plant_strain, start_date, status, created_at, updated_at, journal_id';
    ELSIF current_table_name = 'journal_entries' THEN
        column_list := 'id, journal_id, content, image_url, plant_stage, plant_height, water_amount, nutrients, temperature, humidity, light_hours, created_at, updated_at, user_id';
    ELSIF current_table_name = 'grow_locations' THEN
        column_list := 'id, user_id, name, climate_zone, is_indoor, grow_medium, lighting_type, is_primary, created_at, updated_at, location_id';
    ELSIF current_table_name = 'diary_entries' THEN
        column_list := 'id, user_id, title, content, entry_type, entry_date, created_at, updated_at, plant_id';
    ELSIF current_table_name = 'plant_tasks' THEN
        -- This table doesn't have _status/_changed, select all relevant columns
        column_list := 'id, user_id, plant_id, task_type, title, description, due_date, status, completed_at, created_at, updated_at';
    ELSIF current_table_name = 'posts' THEN
        -- This table doesn't have _status/_changed, select all relevant columns
        column_list := 'id, user_id, content, image_url, plant_stage, plant_strain, likes_count, comments_count, created_at, updated_at';
      ELSE
        -- Fallback: Should not happen with the current tables array, but select * as a safety measure.
        -- Consider logging an error here in a real production scenario.
        column_list := '*';
      END IF;

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
      -- Use 'id = $1' for profiles table, 'user_id = $1' for others
      IF current_table_name = 'profiles' THEN -- Use renamed variable
        -- Compare the UUID PK 'id' with the UUID input parameter '$1'
        query := format(
          'SELECT %s FROM %I WHERE id = $1 AND ($2::TIMESTAMP IS NULL OR updated_at > $2)',
          column_list, current_table_name -- Use renamed variable
        );
      ELSE
        -- Compare the UUID 'user_id' column with the UUID input parameter '$1'
        query := format(
          'SELECT %s FROM %I WHERE user_id = $1 AND ($2::TIMESTAMP IS NULL OR updated_at > $2)',
          column_list, current_table_name -- Use renamed variable
        );
      END IF;

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
      SELECT 1 FROM information_schema.tables AS t -- Alias the table for clarity
      WHERE t.table_schema = 'public' AND
            t.table_name = format('%s_deleted', current_table_name) -- Use renamed variable in format
    ) THEN
      -- Query for deleted records - Assuming _deleted tables also use user_id (uuid) correctly
      -- If profiles_deleted uses a text user_id, this needs adjustment too.
      -- For now, assume user_id is uuid in _deleted tables.
      query := format(
        'SELECT id FROM %I_deleted WHERE user_id = $1 AND ($2::TIMESTAMP IS NULL OR deleted_at > $2)',
        current_table_name -- Use renamed variable
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
    changes := jsonb_set(changes, ARRAY[current_table_name], table_changes); -- Use renamed variable
    -- Removed nested END; here
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

    -- Set the primary key field name (consistently 'id' for these tables)
    id_field := 'id'; -- Assuming 'id' is the UUID primary key for all relevant tables

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
        -- Apply ::uuid cast to record_id for comparison with uuid primary key
        query := format(
          'UPDATE %I SET %s WHERE %s = %L::uuid',
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
        -- Apply ::uuid cast to record_id and user_id for comparison with uuid columns
        query := format(
          'DELETE FROM %I WHERE %s = %L::uuid AND user_id = %L::uuid',
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
