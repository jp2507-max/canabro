-- Rename plants.stage column to growth_stage for consistency
-- Migration: 20250709130000_rename_plants_stage_column



-- Wrap all statements in a transaction for atomicity
BEGIN;

-- The 'stage' column does not exist, so data copy and validation are skipped

-- Drop the old check constraint
ALTER TABLE plants DROP CONSTRAINT IF EXISTS plants_stage_check;

-- Do NOT drop the old stage column yet; retain for manual verification and rollback if needed
-- To drop the column after verification, run:
-- ALTER TABLE plants DROP COLUMN IF EXISTS stage;

-- Add check constraint to growth_stage column (only if it doesn't exist)
ALTER TABLE plants DROP CONSTRAINT IF EXISTS plants_growth_stage_check;
ALTER TABLE plants ADD CONSTRAINT plants_growth_stage_check 
  CHECK (growth_stage = ANY (ARRAY['seedling'::text, 'vegetative'::text, 'flowering'::text, 'drying'::text, 'curing'::text]));

-- Add index on growth_stage for performance
CREATE INDEX IF NOT EXISTS idx_plants_growth_stage ON plants(growth_stage) WHERE growth_stage IS NOT NULL;

COMMIT;