/**
 * WatermelonDB Schema Migrations
 *
 * Defines migrations for schema changes in WatermelonDB
 */
import { schemaMigrations, addColumns, createTable } from '@nozbe/watermelondb/Schema/migrations';

// Initial schema is version 1 (defined in schema.ts)
// When making schema changes:
// 1. Increment the version number in schema.ts
// 2. Add a migration here that transforms from the previous version to the new version

const migrations = schemaMigrations({
  migrations: [
    // Migration to version 2: Add is_deleted tracking to all tables
    {
      toVersion: 2,
      steps: [
        // Create the posts table (deprecated in v26, replaced by community_questions and community_plant_shares)
        createTable({
          name: 'posts',
          columns: [
            { name: 'post_id', type: 'string' },
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'content', type: 'string' },
            { name: 'image_url', type: 'string', isOptional: true },
            { name: 'plant_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'likes_count', type: 'number', isOptional: true },
            { name: 'comments_count', type: 'number', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'last_synced_at', type: 'number', isOptional: true },
          ],
        }),
        // Add is_deleted column to profiles
        addColumns({
          table: 'profiles',
          columns: [{ name: 'is_deleted', type: 'boolean', isOptional: true }],
        }),
        // Add is_deleted column to plants
        addColumns({
          table: 'plants',
          columns: [{ name: 'is_deleted', type: 'boolean', isOptional: true }],
        }),
        // Add is_deleted column to grow_journals
        addColumns({
          table: 'grow_journals',
          columns: [{ name: 'is_deleted', type: 'boolean', isOptional: true }],
        }),
        // Add is_deleted column to journal_entries
        addColumns({
          table: 'journal_entries',
          columns: [{ name: 'is_deleted', type: 'boolean', isOptional: true }],
        }),
        // Add is_deleted column to grow_locations
        addColumns({
          table: 'grow_locations',
          columns: [{ name: 'is_deleted', type: 'boolean', isOptional: true }],
        }),
        // Add is_deleted column to diary_entries
        addColumns({
          table: 'diary_entries',
          columns: [{ name: 'is_deleted', type: 'boolean', isOptional: true }],
        }),
        // Add is_deleted column to plant_tasks
        addColumns({
          table: 'plant_tasks',
          columns: [{ name: 'is_deleted', type: 'boolean', isOptional: true }],
        }),
        // Add is_deleted column to posts (deprecated table, removed in v26)
        addColumns({
          table: 'posts',
          columns: [{ name: 'is_deleted', type: 'boolean', isOptional: true }],
        }),
      ],
    },
    // Migration to version 3: Add all required columns for the Plant model
    {
      toVersion: 3,
      steps: [
        // Ensure is_deleted column exists in plants table
        addColumns({
          table: 'plants',
          columns: [{ name: 'is_deleted', type: 'boolean', isOptional: true }],
        }),
        // Add next_water_date and next_feed_date columns to plants
        addColumns({
          table: 'plants',
          columns: [
            { name: 'next_water_date', type: 'number', isOptional: true },
            { name: 'next_feed_date', type: 'number', isOptional: true },
            { name: 'strain_id', type: 'string', isOptional: true, isIndexed: true },
          ],
        }),
        // Add all the missing columns needed by the Plant model
        addColumns({
          table: 'plants',
          columns: [
            { name: 'plant_id', type: 'string', isOptional: true },
            { name: 'journal_id', type: 'string', isOptional: true },
            { name: 'strain', type: 'string', isOptional: true },
            { name: 'planted_date', type: 'string', isOptional: true },
            { name: 'cannabis_type', type: 'string', isOptional: true },
            { name: 'grow_medium', type: 'string', isOptional: true },
            { name: 'light_condition', type: 'string', isOptional: true },
            { name: 'location_description', type: 'string', isOptional: true },
            { name: 'last_synced_at', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    // Migration to version 4: Remove the redundant plant_id column from the plants table schema
    // Note: We are not actually dropping the column from the SQLite table to avoid complex migration steps.
    // The column is removed from the schema definition (schema.ts) and will no longer be used or synced.
    {
      toVersion: 4,
      steps: [
        // No explicit steps needed here as the column is removed from the schema definition.
        // WatermelonDB will handle the schema update based on the new definition in schema.ts.
      ],
    },
    // Migration to version 5: Make updated_at columns non-optional in the schema
    // Note: This change affects WatermelonDB's schema validation but doesn't require
    // altering the underlying SQLite table structure, as the columns already exist.
    {
      toVersion: 5,
      steps: [
        // No explicit steps needed here.
      ],
    },
    // Migration to version 6: Add the notifications table
    {
      toVersion: 6,
      steps: [
        createTable({
          name: 'notifications',
          columns: [
            // WatermelonDB automatically handles 'id' as the primary key
            { name: 'notification_id', type: 'string' }, // Keep original ID if needed for relations, but 'id' is the WDB key
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'sender_id', type: 'string', isOptional: true },
            { name: 'type', type: 'string' },
            { name: 'content', type: 'string', isOptional: true },
            { name: 'related_post_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'related_comment_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'is_read', type: 'boolean' },
            { name: 'created_at', type: 'number' },
          ],
        }),
      ],
    },
    // Migration to version 7: Add the strains table
    {
      toVersion: 7,
      steps: [
        createTable({
          name: 'strains',
          columns: [
            // WatermelonDB automatically handles 'id' as the primary key
            // { name: 'strain_id', type: 'string' }, // REMOVED: Incorrect column definition from original migration
            { name: 'name', type: 'string', isIndexed: true },
            { name: 'type', type: 'string' },
            { name: 'description', type: 'string', isOptional: true },
            { name: 'image_url', type: 'string', isOptional: true },
            { name: 'thc_content', type: 'number', isOptional: true },
            { name: 'cbd_content', type: 'number', isOptional: true },
            { name: 'flowering_time', type: 'number', isOptional: true },
            { name: 'difficulty', type: 'number', isOptional: true },
            { name: 'effects', type: 'string', isOptional: true }, // Stored as JSON string
            { name: 'flavors', type: 'string', isOptional: true }, // Stored as JSON string
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    // Migration to version 8: Add the plant_tasks table
    {
      toVersion: 8,
      steps: [
        createTable({
          name: 'plant_tasks',
          columns: [
            // WatermelonDB automatically handles 'id' as the primary key
            { name: 'task_id', type: 'string' }, // Keep original ID if needed for relations, but 'id' is the WDB key
            { name: 'plant_id', type: 'string', isIndexed: true },
            { name: 'title', type: 'string' },
            { name: 'description', type: 'string', isOptional: true },
            { name: 'task_type', type: 'string' },
            { name: 'due_date', type: 'string' }, // Storing date as string based on model
            { name: 'status', type: 'string' },
            { name: 'notification_id', type: 'string', isOptional: true },
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    // Migration to version 9: Add the posts table (deprecated in v26)
    {
      toVersion: 9,
      steps: [
        createTable({
          name: 'posts',
          columns: [
            // WatermelonDB automatically handles 'id' as the primary key
            { name: 'post_id', type: 'string' }, // Keep original ID if needed for relations, but 'id' is the WDB key
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'content', type: 'string' },
            { name: 'image_url', type: 'string', isOptional: true },
            { name: 'plant_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'likes_count', type: 'number', isOptional: true },
            { name: 'comments_count', type: 'number', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'last_synced_at', type: 'number', isOptional: true },
            { name: 'is_deleted', type: 'boolean', isOptional: true },
          ],
        }),
      ],
    },
    // Migration to version 10: Add genetics and harvest date columns to plants
    {
      toVersion: 10,
      steps: [
        addColumns({
          table: 'plants',
          columns: [
            { name: 'is_auto_flower', type: 'boolean', isOptional: true },
            { name: 'is_feminized', type: 'boolean', isOptional: true },
            { name: 'thc_content', type: 'number', isOptional: true },
            { name: 'cbd_content', type: 'number', isOptional: true },
            { name: 'expected_harvest_date', type: 'string', isOptional: true }, // Using string for date
          ],
        }),
      ],
    },
    // Migration to version 11: Add entry_date column to diary_entries
    {
      toVersion: 11,
      steps: [
        addColumns({
          table: 'diary_entries',
          columns: [
            { name: 'entry_date', type: 'string' }, // Add the missing entry_date column
          ],
        }),
      ],
    },
    // Migration to version 12: Fix relationships between plants and strains
    {
      toVersion: 12,
      steps: [
        // No explicit schema changes needed, just forcing a reload of the models
        // with the proper relationship definitions
      ],
    },
    // Migration to version 13: Correct schema definition for strains table (removed extra strain_id)
    {
      toVersion: 13,
      steps: [
        // No explicit database changes needed, as the incorrect column likely never
        // existed physically due to previous errors. This migration just satisfies
        // WatermelonDB's versioning requirement.
      ],
    },
    // Migration to version 14: Add last_synced_at column to profiles table
    {
      toVersion: 14,
      steps: [
        addColumns({
          table: 'profiles',
          columns: [{ name: 'last_synced_at', type: 'number', isOptional: true }],
        }),
      ],
    },
    // Migration to version 15: Add missing profile columns to match schema v15
    {
      toVersion: 15,
      steps: [
        addColumns({
          table: 'profiles',
          columns: [
            { name: 'location', type: 'string', isOptional: true },
            { name: 'growing_since', type: 'string', isOptional: true },
            { name: 'favorite_strains', type: 'string', isOptional: true }, // Stores JSON string
            { name: 'is_certified', type: 'boolean', isOptional: true },
            { name: 'certifications', type: 'string', isOptional: true }, // Stores JSON string
            // Note: is_deleted was added in migration to version 2, but let's ensure it's here
            // If it already exists, addColumns should handle it gracefully.
            { name: 'is_deleted', type: 'boolean', isOptional: true },
          ],
        }),
      ],
    },
    // Migration to version 16: Remove favorite_strains column definition from profiles schema
    // No database steps needed as the column was only removed from the schema definition.
    {
      toVersion: 16,
      steps: [
        // No explicit steps needed here. WatermelonDB handles schema updates based on schema.ts.
      ],
    },
    // Migration to version 17: Add favorite_strains table
    {
      toVersion: 17,
      steps: [
        createTable({
          name: 'favorite_strains',
          columns: [
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'strain_id', type: 'string', isIndexed: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    // Migration to version 18: Add strain_object_id column to favorite_strains table
    {
      toVersion: 18,
      steps: [
        addColumns({
          table: 'favorite_strains',
          columns: [{ name: 'strain_object_id', type: 'string', isOptional: true }],
        }),
      ],
    },
    // Migration to version 19: Add new plant status fields
    {
      toVersion: 19,
      steps: [
        addColumns({
          table: 'plants',
          columns: [
            { name: 'health_percentage', type: 'number', isOptional: true },
            { name: 'next_watering_days', type: 'number', isOptional: true },
            { name: 'next_nutrient_days', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    // Migration to version 20: Add api_id to strains table
    {
      toVersion: 20,
      steps: [
        addColumns({
          table: 'strains',
          columns: [
            {
              name: 'api_id',
              type: 'string',
              isOptional: true,
              isIndexed: true,
            },
          ],
        }),
      ],
    },
    // Migration to version 21: This is a dummy migration to ensure WatermelonDB properly processes all migrations
    {
      toVersion: 21,
      steps: [],
    },
    // Migration to version 22: Schema version sync to match schema.ts
    {
      toVersion: 22,
      steps: [],
    },
    // Migration to version 23: Add title column to diary_entries
    {
      toVersion: 23,
      steps: [
        addColumns({
          table: 'diary_entries',
          columns: [{ name: 'title', type: 'string', isOptional: true }],
        }),
      ],
    },
    // Migration to version 24: Fix posts table schema to match Supabase (deprecated in v26)
    // Remove plant_id column and add plant_stage and plant_strain columns
    {
      toVersion: 24,
      steps: [
        addColumns({
          table: 'posts',
          columns: [
            { name: 'plant_stage', type: 'string', isOptional: true },
            { name: 'plant_strain', type: 'string', isOptional: true },
          ],
        }),
        // Note: We don't explicitly remove the plant_id column to avoid complex migration
        // The column is removed from the schema definition and won't be used in new code
      ],
    },
    // Migration to version 25: Add community_questions and community_plant_shares tables
    // Replace the legacy posts table with split community tables
    {
      toVersion: 25,
      steps: [
        // Create community_questions table for Q&A posts
        createTable({
          name: 'community_questions',
          columns: [
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'title', type: 'string' },
            { name: 'content', type: 'string' },
            { name: 'category', type: 'string', isOptional: true },
            { name: 'tags', type: 'string', isOptional: true }, // JSON string array
            { name: 'image_url', type: 'string', isOptional: true },
            { name: 'is_solved', type: 'boolean', isOptional: true },
            { name: 'priority_level', type: 'number', isOptional: true },
            { name: 'likes_count', type: 'number', isOptional: true },
            { name: 'answers_count', type: 'number', isOptional: true },
            { name: 'views_count', type: 'number', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'deleted_at', type: 'number', isOptional: true },
            { name: 'last_synced_at', type: 'number', isOptional: true },
          ],
        }),
        // Create community_plant_shares table for sharing plant progress
        createTable({
          name: 'community_plant_shares',
          columns: [
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'plant_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'plant_name', type: 'string' },
            { name: 'strain_name', type: 'string', isOptional: true },
            { name: 'growth_stage', type: 'string', isOptional: true },
            { name: 'content', type: 'string' },
            { name: 'care_tips', type: 'string', isOptional: true },
            { name: 'growing_medium', type: 'string', isOptional: true },
            { name: 'environment', type: 'string', isOptional: true },
            { name: 'images_urls', type: 'string', isOptional: true }, // JSON string array
            { name: 'is_featured', type: 'boolean', isOptional: true },
            { name: 'likes_count', type: 'number', isOptional: true },
            { name: 'comments_count', type: 'number', isOptional: true },
            { name: 'shares_count', type: 'number', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'deleted_at', type: 'number', isOptional: true },
            { name: 'last_synced_at', type: 'number', isOptional: true },
          ],
        }),
        // Note: The legacy posts table is kept for backward compatibility during transition.
        // It will be removed in a future migration after all data is migrated to the new tables.
      ],
    },
    // Migration to version 26: Remove legacy posts table
    // The posts table has been successfully migrated to community_questions and community_plant_shares
    // and dropped from Supabase. Now we remove it from WatermelonDB schema as well.
    {
      toVersion: 26,
      steps: [
        // Drop the legacy posts table from WatermelonDB
        // Note: WatermelonDB doesn't have a direct "dropTable" method, so we rely on schema.ts
        // to no longer include the posts table. This migration step serves as documentation
        // that the table was intentionally removed in this version.
        // 
        // The posts table has been:
        // 1. Migrated to community_questions and community_plant_shares in Supabase
        // 2. Dropped from Supabase database
        // 3. Removed from WatermelonDB schema.ts (version 26)
        // 4. Post model deleted from codebase
      ],
    },
    {
      toVersion: 27,
      steps: [
        // This migration removes tables related to community and notification features
        // by removing them from the schema.ts file.
        // WatermelonDB migrations do not support dropping tables or deleting all data
        // from a table in a safe, cross-platform way.
        // By removing them from the schema, the app will no longer recognize or use them.
        // Existing data will remain on user devices but will be ignored.
      ],
    },
    // Migration to version 28: Re-introduce favorite_strains table that was removed in v27
    // We use createTable which is idempotent on iOS (uses IF NOT EXISTS) and Android (will no-op if the table exists)
    // so it will safely run for devices that still have the table from older versions.
    {
      toVersion: 28,
      steps: [
        createTable({
          name: 'favorite_strains',
          columns: [
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'strain_id', type: 'string', isIndexed: true },
            { name: 'strain_object_id', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    // Migration to version 29: Clean up orphaned local posts data
    // This migration ensures any remaining local posts table data is properly handled
    // The posts table was removed from schema in v26 and the community tables in v27
    {
      toVersion: 29,
      steps: [
        // This migration triggers the data integrity service to clean up any orphaned local posts
        // No schema changes needed as the table is already removed from schema.ts
        // The cleanup will be handled by the data integrity service when it detects the version bump
      ],
    },
    // Migration to version 30: Add new plant management tables and fields
    {
      toVersion: 30,
      steps: [
        // Add new fields to plants table
        addColumns({
          table: 'plants',
          columns: [
            { name: 'node_count', type: 'number', isOptional: true },
            { name: 'stem_diameter', type: 'number', isOptional: true },
            { name: 'ph_level', type: 'number', isOptional: true },
            { name: 'ec_ppm', type: 'number', isOptional: true },
            { name: 'temperature', type: 'number', isOptional: true },
            { name: 'humidity', type: 'number', isOptional: true },
            { name: 'vpd', type: 'number', isOptional: true },
            { name: 'trichome_status', type: 'string', isOptional: true },
            { name: 'pistil_brown_percentage', type: 'number', isOptional: true },
            { name: 'bud_density', type: 'number', isOptional: true },
            { name: 'wet_weight', type: 'number', isOptional: true },
            { name: 'dry_weight', type: 'number', isOptional: true },
            { name: 'trim_weight', type: 'number', isOptional: true },
            { name: 'harvest_date', type: 'number', isOptional: true },
          ],
        }),
        // Create plant_photos table
        createTable({
          name: 'plant_photos',
          columns: [
            { name: 'plant_id', type: 'string', isIndexed: true },
            { name: 'image_url', type: 'string' },
            { name: 'thumbnail_url', type: 'string', isOptional: true },
            { name: 'caption', type: 'string', isOptional: true },
            { name: 'growth_stage', type: 'string' },
            { name: 'file_size', type: 'number', isOptional: true },
            { name: 'width', type: 'number', isOptional: true },
            { name: 'height', type: 'number', isOptional: true },
            { name: 'taken_at', type: 'number' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'last_synced_at', type: 'number', isOptional: true },
            { name: 'is_deleted', type: 'boolean', isOptional: true },
          ],
        }),
        // Create plant_metrics table
        createTable({
          name: 'plant_metrics',
          columns: [
            { name: 'plant_id', type: 'string', isIndexed: true },
            // Basic Health Metrics
            { name: 'health_percentage', type: 'number', isOptional: true },
            { name: 'next_watering_days', type: 'number', isOptional: true },
            { name: 'next_nutrient_days', type: 'number', isOptional: true },
            // Growth Measurements
            { name: 'height', type: 'number', isOptional: true },
            { name: 'height_unit', type: 'string', isOptional: true },
            { name: 'node_count', type: 'number', isOptional: true },
            { name: 'stem_diameter', type: 'number', isOptional: true },
            // Environmental Metrics
            { name: 'ph_level', type: 'number', isOptional: true },
            { name: 'ec_ppm', type: 'number', isOptional: true },
            { name: 'temperature', type: 'number', isOptional: true },
            { name: 'temperature_unit', type: 'string', isOptional: true },
            { name: 'humidity', type: 'number', isOptional: true },
            { name: 'vpd', type: 'number', isOptional: true },
            // Flowering Metrics
            { name: 'trichome_status', type: 'string', isOptional: true },
            { name: 'pistil_brown_percentage', type: 'number', isOptional: true },
            { name: 'bud_density', type: 'number', isOptional: true },
            { name: 'notes', type: 'string', isOptional: true },
            { name: 'recorded_at', type: 'number' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'last_synced_at', type: 'number', isOptional: true },
            { name: 'is_deleted', type: 'boolean', isOptional: true },
          ],
        }),
        // Create care_reminders table
        createTable({
          name: 'care_reminders',
          columns: [
            { name: 'plant_id', type: 'string', isIndexed: true },
            { name: 'type', type: 'string' },
            { name: 'title', type: 'string' },
            { name: 'description', type: 'string', isOptional: true },
            { name: 'scheduled_for', type: 'number' },
            { name: 'is_completed', type: 'boolean' },
            { name: 'repeat_interval', type: 'number', isOptional: true },
            { name: 'completed_at', type: 'number', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'last_synced_at', type: 'number', isOptional: true },
            { name: 'is_deleted', type: 'boolean', isOptional: true },
          ],
        }),
      ],
    },
    // Migration to version 31: Add is_primary column to plant_photos table
    {
      toVersion: 31,
      steps: [
        addColumns({
          table: 'plant_photos',
          columns: [
            { name: 'is_primary', type: 'boolean', isOptional: true },
          ],
        }),
      ],
    },
    // Migration to version 32: Add schedule_templates table and extend plant_tasks for advanced calendar system
    {
      toVersion: 32,
      steps: [
        // Create schedule_templates table
        createTable({
          name: 'schedule_templates',
          columns: [
            { name: 'name', type: 'string' },
            { name: 'description', type: 'string', isOptional: true },
            { name: 'category', type: 'string' },
            { name: 'strain_type', type: 'string', isOptional: true },
            { name: 'duration_weeks', type: 'number' },
            { name: 'created_by', type: 'string' },
            { name: 'is_public', type: 'boolean' },
            { name: 'usage_count', type: 'number' },
            { name: 'template_data', type: 'string' }, // JSON string
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'last_synced_at', type: 'number', isOptional: true },
            { name: 'is_deleted', type: 'boolean', isOptional: true },
          ],
        }),
        // Add new task management fields to plant_tasks table
        addColumns({
          table: 'plant_tasks',
          columns: [
            { name: 'priority', type: 'string', isOptional: true },
            { name: 'estimated_duration', type: 'number', isOptional: true },
            { name: 'template_id', type: 'string', isOptional: true },
            { name: 'week_number', type: 'number', isOptional: true },
            { name: 'completion_data', type: 'string', isOptional: true }, // JSON string
            { name: 'auto_generated', type: 'boolean', isOptional: true },
            { name: 'parent_task_id', type: 'string', isOptional: true },
            { name: 'sequence_number', type: 'number', isOptional: true },
            { name: 'environmental_conditions', type: 'string', isOptional: true }, // JSON string
            { name: 'escalation_start_time', type: 'string', isOptional: true }, // ISO string for escalation tracking
          ],
        }),
      ],
    },
  ],
});

export default migrations;
