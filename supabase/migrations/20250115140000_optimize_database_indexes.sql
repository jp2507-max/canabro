-- Migration: Database Index Optimization
-- Date: 2025-01-15 14:00:00
-- Purpose: Remove duplicate indexes and add composite indexes for better performance
-- Audit Report: docs/canabro-backend-audit-report.md

-- =============================================
-- PRIORITY 1: Remove Duplicate Indexes
-- =============================================
-- Estimated savings: 20-30% reduction in index storage

-- Community Plant Shares
DROP INDEX IF EXISTS idx_community_plant_shares_user_id;
DROP INDEX IF EXISTS idx_community_plant_shares_journal_id;

-- Community Questions  
DROP INDEX IF EXISTS idx_community_questions_user_id;

-- Plants
DROP INDEX IF EXISTS idx_plants_user_id;
DROP INDEX IF EXISTS idx_plants_location_id;

-- Diary Entries
DROP INDEX IF EXISTS idx_diary_entries_user_id;
DROP INDEX IF EXISTS idx_diary_entries_entry_id;

-- Grow Journals
DROP INDEX IF EXISTS idx_grow_journals_user_id;

-- Journal Entries
DROP INDEX IF EXISTS idx_journal_entries_journal_id;

-- Plant Tasks and Strains
DROP INDEX IF EXISTS idx_plant_tasks_user_id;
DROP INDEX IF EXISTS idx_strains_api_id;

-- Community Comments
DROP INDEX IF EXISTS idx_community_comments_user_id;

-- =============================================
-- PRIORITY 2: Add Composite Indexes
-- =============================================
-- Optimize common query patterns

-- Plants: User's plants by growth stage and date
CREATE INDEX IF NOT EXISTS idx_plants_user_growth_stage_created 
ON plants (user_id, growth_stage, created_at DESC);

-- Community Questions: User's questions by date  
CREATE INDEX IF NOT EXISTS idx_community_questions_user_created
ON community_questions (user_id, created_at DESC);

-- Diary Entries: User's entries by date
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_created
ON diary_entries (user_id, created_at DESC);

-- Community Plant Shares: User's shares by date
CREATE INDEX IF NOT EXISTS idx_community_plant_shares_user_created
ON community_plant_shares (user_id, created_at DESC);

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Check for remaining duplicate patterns
-- SELECT schemaname, tablename, indexname
-- FROM pg_indexes 
-- WHERE schemaname = 'public'
--   AND (indexname LIKE 'idx_%_user_id' OR indexname LIKE '%_user_id_idx')
-- ORDER BY tablename;

-- Check index count per table
-- SELECT tablename, COUNT(*) as index_count
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
--   AND indexname NOT LIKE '%_pkey'
-- GROUP BY tablename
-- ORDER BY COUNT(*) DESC; 