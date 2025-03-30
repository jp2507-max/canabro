-- Migration: Add missing columns to plants table for WatermelonDB sync
-- This migration adds the notes and strain_id columns to the plants table

-- Function to check if a column exists
CREATE OR REPLACE FUNCTION column_exists(tbl text, col text) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = tbl
      AND column_name = col
  );
END;
$$ LANGUAGE plpgsql;

-- Add missing columns to plants table
DO $$
BEGIN
  -- Add notes column if it doesn't exist
  IF NOT column_exists('plants', 'notes') THEN
    ALTER TABLE public.plants ADD COLUMN notes TEXT;
    RAISE NOTICE 'Added notes column to plants table';
  END IF;

  -- Add strain_id column if it doesn't exist
  IF NOT column_exists('plants', 'strain_id') THEN
    ALTER TABLE public.plants ADD COLUMN strain_id TEXT;
    RAISE NOTICE 'Added strain_id column to plants table';
  END IF;

  -- Add strain column if it doesn't exist
  IF NOT column_exists('plants', 'strain') THEN
    ALTER TABLE public.plants ADD COLUMN strain TEXT;
    RAISE NOTICE 'Added strain column to plants table';
  END IF;

  -- Add planted_date column if it doesn't exist
  IF NOT column_exists('plants', 'planted_date') THEN
    ALTER TABLE public.plants ADD COLUMN planted_date TEXT;
    RAISE NOTICE 'Added planted_date column to plants table';
  END IF;

  -- Add image_url column if it doesn't exist
  IF NOT column_exists('plants', 'image_url') THEN
    ALTER TABLE public.plants ADD COLUMN image_url TEXT;
    RAISE NOTICE 'Added image_url column to plants table';
  END IF;

  -- Add last_synced_at column if it doesn't exist
  IF NOT column_exists('plants', 'last_synced_at') THEN
    ALTER TABLE public.plants ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added last_synced_at column to plants table';
  END IF;

  -- Add is_deleted column if it doesn't exist
  IF NOT column_exists('plants', 'is_deleted') THEN
    ALTER TABLE public.plants ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added is_deleted column to plants table';
  END IF;
  
  -- Modify user_id column to accept text if it's currently UUID
  -- This helps with the synchronization between WatermelonDB and Supabase
  IF column_exists('plants', 'user_id') THEN
    -- First check the current type
    IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'plants' 
        AND column_name = 'user_id'
        AND data_type = 'uuid'
    ) THEN
      -- Create a temporary column
      ALTER TABLE public.plants ADD COLUMN user_id_temp TEXT;
      
      -- Copy data, converting UUID to text
      UPDATE public.plants SET user_id_temp = user_id::TEXT;
      
      -- Drop the old column
      ALTER TABLE public.plants DROP COLUMN user_id;
      
      -- Rename the temp column to user_id
      ALTER TABLE public.plants RENAME COLUMN user_id_temp TO user_id;
      
      -- Create an index for better query performance
      CREATE INDEX IF NOT EXISTS plants_user_id_idx ON public.plants(user_id);
      
      RAISE NOTICE 'Modified user_id column in plants table to accept text values';
    END IF;
  END IF;
END
$$;
