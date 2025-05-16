-- Migration to acknowledge schema version 20
-- No actual data changes, as per user confirmation of data loss acceptability.
-- This migration primarily serves to update the schema version tracked by WatermelonDB.

ALTER TABLE "strains" ADD COLUMN "api_id" TEXT;
