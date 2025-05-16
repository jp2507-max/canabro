-- Migration to refactor plants.strain_id from TEXT to UUID and add foreign key to strains.id
-- Also updates the sync_push function to handle plants.strain_id as UUID.

BEGIN;

-- Step 1: Add a temporary UUID column to public.plants
ALTER TABLE public.plants ADD COLUMN strain_id_uuid_temp UUID;

-- Step 2: Populate the temporary column
RAISE NOTICE 'Attempting to map plants.strain_id (TEXT) to strains.id (UUID)...';
UPDATE public.plants p
SET strain_id_uuid_temp = (
    SELECT s.id 
    FROM public.strains s 
    WHERE s.name = p.strain_id -- Assuming p.strain_id (TEXT) stores the strain name
)
WHERE EXISTS (
    SELECT 1
    FROM public.strains s
    WHERE s.name = p.strain_id
);

-- Step 3: Log any plants whose strain_id could not be mapped
DO $$
DECLARE
    unmapped_plant RECORD;
BEGIN
    FOR unmapped_plant IN
        SELECT id, strain_id FROM public.plants WHERE strain_id_uuid_temp IS NULL AND strain_id IS NOT NULL AND strain_id <> ''
    LOOP
        RAISE WARNING 'Plant ID % has existing strain_id "%" (TEXT) which could not be mapped to a strains.id (UUID). Its new strain_id (UUID) will be NULL.', unmapped_plant.id, unmapped_plant.strain_id;
    END LOOP;
END $$;

-- Step 4: Drop the old TEXT strain_id column
ALTER TABLE public.plants DROP COLUMN strain_id;

-- Step 5: Rename the temporary UUID column to strain_id
ALTER TABLE public.plants RENAME COLUMN strain_id_uuid_temp TO strain_id;

-- Step 6: Add the foreign key constraint
ALTER TABLE public.plants 
ADD CONSTRAINT fk_plants_strain_id 
FOREIGN KEY (strain_id) 
REFERENCES public.strains(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

RAISE NOTICE 'plants.strain_id successfully refactored to UUID and foreign key added.';

-- Step 7: Update the sync_push function
-- First, drop the existing function to recreate it with the fix
DROP FUNCTION IF EXISTS sync_push(JSONB, TIMESTAMP WITH TIME ZONE, UUID, TEXT);

-- Recreate the sync_push function with updated handling for plants.strain_id
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
SET statement_timeout = '30s'
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
BEGIN
  SELECT array_agg(key) INTO table_names FROM jsonb_object_keys(changes) AS key;
  RAISE NOTICE 'Processing tables: %', table_names;

  IF table_names IS NOT NULL THEN
    FOR i IN 1..array_length(table_names, 1) LOOP
      table_name := table_names[i];
      table_changes := changes->table_name;

      created_records := table_changes->'created';
      IF created_records IS NOT NULL AND jsonb_array_length(created_records) > 0 THEN
        FOR j IN 0..jsonb_array_length(created_records)-1 LOOP
          record_data := created_records->j;
          
          WITH cols AS (
            SELECT 
              string_agg(
                CASE 
                  WHEN key = 'strain' THEN '"strain"'
                  ELSE format('%I', key) 
                END, ', '
              ) AS cols,
              string_agg(
                CASE 
                  WHEN key = 'user_id' THEN format('($1->>''%s'')::uuid', key)
                  WHEN table_name = 'plants' AND key = 'strain_id' THEN format('($1->>''%s'')::uuid', key) -- Plants.strain_id is UUID
                  WHEN key = 'strain_id' THEN format('($1->>''%s'')::text', key) -- Default for other strain_id if any
                  WHEN key = ANY(ARRAY['created_at', 'updated_at', 'deleted_at', 'started_at', 'finished_at', 'date', 'timestamp']) THEN format('($1->>''%s'')::timestamp with time zone', key)
                  WHEN key = 'next_nutrient_days' THEN format('(NULLIF($1->>''%s'', ''''))::numeric', key)
                  WHEN key = 'strain' THEN format('($1->>''%s'')::text', key)
                  WHEN key = ANY(ARRAY['height', 'width', 'weight', 'length', 'temperature', 'humidity', 'ph', 'ec', 'tds', 'lux', 'ppfd', 'vpd', 'water_intake', 'rating', 'yield_amount', 'pot_size', 'distance_from_light', 'training_hours_spent']) THEN format('(NULLIF($1->>''%s'', ''''))::numeric', key)
                  ELSE format('($1->>''%s'')::text', key)
                END, ', ') AS vals,
              string_agg(
                CASE 
                  WHEN key = 'strain' THEN '"strain" = EXCLUDED."strain"'
                  ELSE format('%I = EXCLUDED.%I', key, key) 
                END, ', '
              ) AS updates
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
          RAISE NOTICE 'Generated INSERT query: %', query;
          EXECUTE query USING record_data;
        END LOOP;
      END IF;
      
      updated_records := table_changes->'updated';
      IF updated_records IS NOT NULL AND jsonb_array_length(updated_records) > 0 THEN
        FOR j IN 0..jsonb_array_length(updated_records)-1 LOOP
          record_data := updated_records->j;
          record_id := record_data->>'id';
          
          WITH cols AS (
            SELECT 
              string_agg(
                CASE 
                  WHEN key = 'user_id' THEN format('%I = ($1->>''%s'')::uuid', key, key)
                  WHEN table_name = 'plants' AND key = 'strain_id' THEN format('%I = ($1->>''%s'')::uuid', key, key) -- Plants.strain_id is UUID
                  WHEN key = 'strain_id' THEN format('%I = ($1->>''%s'')::text', key, key) -- Default for other strain_id if any
                  WHEN key = ANY(ARRAY['created_at', 'updated_at', 'deleted_at', 'started_at', 'finished_at', 'date', 'timestamp']) THEN format('%I = ($1->>''%s'')::timestamp with time zone', key, key)
                  WHEN key = 'next_nutrient_days' THEN format('%I = (NULLIF($1->>''%s'', ''''))::numeric', key, key)
                  WHEN key = 'strain' THEN format('"strain" = ($1->>''%s'')::text', key, key)
                  WHEN key = ANY(ARRAY['height', 'width', 'weight', 'length', 'temperature', 'humidity', 'ph', 'ec', 'tds', 'lux', 'ppfd', 'vpd', 'water_intake', 'rating', 'yield_amount', 'pot_size', 'distance_from_light', 'training_hours_spent']) THEN format('%I = (NULLIF($1->>''%s'', ''''))::numeric', key, key)
                  ELSE format('%I = ($1->>''%s'')::text', key, key)
                END, ', ') AS updates
            FROM jsonb_object_keys(record_data) AS key
            WHERE key != 'id'
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
          RAISE NOTICE 'Generated UPDATE query: %', query;
          EXECUTE query USING record_data, record_id::uuid, user_id;
        END LOOP;
      END IF;
      
      deleted_ids := table_changes->'deleted';
      IF deleted_ids IS NOT NULL AND jsonb_array_length(deleted_ids) > 0 THEN
        FOR j IN 0..jsonb_array_length(deleted_ids)-1 LOOP
          record_id := deleted_ids->j->>'id';
          record_id := trim(both '"' from record_id);
          
          BEGIN
            IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name || '_deleted') THEN
              query := format(
                'INSERT INTO %I (id, user_id, deleted_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO NOTHING',
                table_name || '_deleted'
              );
              RAISE NOTICE 'Generated DELETE tracking insertion: %', query;
              EXECUTE query USING record_id::uuid, user_id;
            END IF;
          
            query := format(
              'DELETE FROM %I WHERE id = $1 AND user_id = $2',
              table_name
            );
            
            IF last_pulled_at IS NOT NULL THEN
              query := query || format(' AND (updated_at IS NULL OR updated_at <= %L)', last_pulled_at);
            END IF;
            RAISE NOTICE 'Generated DELETE query: %', query;
            EXECUTE query USING record_id::uuid, user_id;
          EXCEPTION
            WHEN others THEN
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
    RAISE NOTICE 'Error in sync_push: %, SQLSTATE: %', SQLERRM, SQLSTATE;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'timestamp', extract(epoch from now()) * 1000
    );
END
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION sync_push(JSONB, TIMESTAMP WITH TIME ZONE, UUID, TEXT) TO authenticated;

RAISE NOTICE 'sync_push function updated successfully.';

COMMIT;
