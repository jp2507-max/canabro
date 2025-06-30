-- Migration: Ensure all local plant fields exist in Supabase with correct types
-- This migration checks and fixes type mismatches for numeric fields and adds any missing columns

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

-- Function to get column type
CREATE OR REPLACE FUNCTION column_type(tbl text, col text) RETURNS text AS $$
DECLARE
  typ text;
BEGIN
  SELECT data_type INTO typ
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = tbl AND column_name = col;
  RETURN typ;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  -- Ensure next_nutrient_days is numeric
  IF column_exists('plants', 'next_nutrient_days') THEN
    IF column_type('plants', 'next_nutrient_days') <> 'numeric' THEN
      ALTER TABLE public.plants ALTER COLUMN next_nutrient_days TYPE numeric USING next_nutrient_days::numeric;
      RAISE NOTICE 'Fixed type of next_nutrient_days to numeric';
    END IF;
  ELSE
    ALTER TABLE public.plants ADD COLUMN next_nutrient_days numeric;
    RAISE NOTICE 'Added next_nutrient_days as numeric';
  END IF;

  -- Ensure next_watering_days is numeric
  IF column_exists('plants', 'next_watering_days') THEN
    IF column_type('plants', 'next_watering_days') <> 'numeric' THEN
      ALTER TABLE public.plants ALTER COLUMN next_watering_days TYPE numeric USING next_watering_days::numeric;
      RAISE NOTICE 'Fixed type of next_watering_days to numeric';
    END IF;
  ELSE
    ALTER TABLE public.plants ADD COLUMN next_watering_days numeric;
    RAISE NOTICE 'Added next_watering_days as numeric';
  END IF;

  -- Ensure health_percentage is numeric
  IF column_exists('plants', 'health_percentage') THEN
    IF column_type('plants', 'health_percentage') <> 'numeric' THEN
      ALTER TABLE public.plants ALTER COLUMN health_percentage TYPE numeric USING health_percentage::numeric;
      RAISE NOTICE 'Fixed type of health_percentage to numeric';
    END IF;
  ELSE
    ALTER TABLE public.plants ADD COLUMN health_percentage numeric;
    RAISE NOTICE 'Added health_percentage as numeric';
  END IF;
END $$;
