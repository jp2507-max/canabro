-- Add normalized strain-based fields, constraints, and indexes to plants
-- Safe/idempotent migration. Leaves existing rows null (no defaults/backfill).

BEGIN;

-- Add columns if not exists
ALTER TABLE public.plants
  ADD COLUMN IF NOT EXISTS plant_type text,
  ADD COLUMN IF NOT EXISTS baseline_kind text,
  ADD COLUMN IF NOT EXISTS baseline_date timestamptz,
  ADD COLUMN IF NOT EXISTS environment text,
  ADD COLUMN IF NOT EXISTS hemisphere text,
  ADD COLUMN IF NOT EXISTS predicted_flower_min_days integer,
  ADD COLUMN IF NOT EXISTS predicted_flower_max_days integer,
  ADD COLUMN IF NOT EXISTS predicted_harvest_start timestamptz,
  ADD COLUMN IF NOT EXISTS predicted_harvest_end timestamptz,
  ADD COLUMN IF NOT EXISTS schedule_confidence numeric(3,2),
  ADD COLUMN IF NOT EXISTS yield_unit text,
  ADD COLUMN IF NOT EXISTS yield_min numeric(10,2),
  ADD COLUMN IF NOT EXISTS yield_max numeric(10,2),
  ADD COLUMN IF NOT EXISTS yield_category text;

-- Ensure fixed precision for numeric fields even if columns pre-existed (idempotent-safe)
ALTER TABLE public.plants
  ALTER COLUMN schedule_confidence TYPE numeric(3,2) USING schedule_confidence::numeric(3,2),
  ALTER COLUMN yield_min TYPE numeric(10,2) USING yield_min::numeric(10,2),
  ALTER COLUMN yield_max TYPE numeric(10,2) USING yield_max::numeric(10,2);

-- Enumerated value constraints (idempotent)
DO $$ BEGIN
  ALTER TABLE public.plants
    ADD CONSTRAINT chk_plants_plant_type CHECK (plant_type IN ('photoperiod','autoflower','unknown'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.plants
    ADD CONSTRAINT chk_plants_baseline_kind CHECK (baseline_kind IN ('flip','germination'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.plants
    ADD CONSTRAINT chk_plants_environment CHECK (environment IN ('indoor','outdoor','greenhouse'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.plants
    ADD CONSTRAINT chk_plants_hemisphere CHECK (hemisphere IN ('N','S'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.plants
    ADD CONSTRAINT chk_plants_yield_unit CHECK (yield_unit IS NULL OR yield_unit IN ('g_per_plant','g_per_m2'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.plants
    ADD CONSTRAINT chk_plants_yield_category CHECK (yield_category IS NULL OR yield_category IN ('low','medium','high','unknown'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Require yield_unit when either yield_min or yield_max is set (idempotent)
DO $$ BEGIN
  ALTER TABLE public.plants
    ADD CONSTRAINT chk_plants_yield_requires_unit CHECK (
      (yield_min IS NULL AND yield_max IS NULL) OR yield_unit IS NOT NULL
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Numeric bounds & ranges (idempotent)
DO $$ BEGIN
  ALTER TABLE public.plants
    ADD CONSTRAINT chk_plants_schedule_confidence CHECK (
      schedule_confidence IS NULL OR (schedule_confidence >= 0 AND schedule_confidence <= 1)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.plants
    ADD CONSTRAINT chk_plants_predicted_flower_nonneg CHECK (
      (predicted_flower_min_days IS NULL OR predicted_flower_min_days >= 0) AND
      (predicted_flower_max_days IS NULL OR predicted_flower_max_days >= 0)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.plants
    ADD CONSTRAINT chk_plants_predicted_flower_range CHECK (
      predicted_flower_min_days IS NULL OR predicted_flower_max_days IS NULL OR predicted_flower_min_days <= predicted_flower_max_days
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.plants
    ADD CONSTRAINT chk_plants_yield_nonneg CHECK (
      (yield_min IS NULL OR yield_min >= 0) AND
      (yield_max IS NULL OR yield_max >= 0)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.plants
    ADD CONSTRAINT chk_plants_yield_range CHECK (
      yield_min IS NULL OR yield_max IS NULL OR yield_min <= yield_max
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.plants
    ADD CONSTRAINT chk_plants_predicted_harvest_range CHECK (
      predicted_harvest_start IS NULL OR predicted_harvest_end IS NULL OR predicted_harvest_start <= predicted_harvest_end
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes for common filters (idempotent)
CREATE INDEX IF NOT EXISTS idx_plants_plant_type ON public.plants(plant_type);
CREATE INDEX IF NOT EXISTS idx_plants_environment ON public.plants(environment);

COMMIT;


