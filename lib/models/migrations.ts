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
        // First, create the posts table if it doesn't exist
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
        // Add is_deleted column to posts
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
    // Migration to version 9: Add the posts table
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
  ],
});

export default migrations;
