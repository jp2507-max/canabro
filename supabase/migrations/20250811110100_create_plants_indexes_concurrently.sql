-- Non-transactional index creation to avoid locking public.plants
-- This file intentionally has NO BEGIN/COMMIT so that CONCURRENTLY can run

-- Basic B-Tree indexes for common filters
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_plants_plant_type ON public.plants(plant_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_plants_environment ON public.plants(environment);

-- Optional: GiST index for harvest window range queries (overlaps/contains)
-- Enables efficient queries like:
--   WHERE tstzrange(predicted_harvest_start, predicted_harvest_end, '[)') && tstzrange($1, $2, '[)')
-- Uncomment if your workload needs range queries on the harvest window.
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_plants_predicted_harvest_gist
--   ON public.plants
--   USING gist (tstzrange(predicted_harvest_start, predicted_harvest_end, '[)'));
