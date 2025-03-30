/**
 * WatermelonDB Schema Migrations
 * 
 * Defines migrations for schema changes in WatermelonDB
 */
import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';
import { addColumns, createTable } from '@nozbe/watermelondb/Schema/migrations';

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
            { name: 'last_synced_at', type: 'number', isOptional: true }
          ]
        }),
        // Add is_deleted column to profiles
        addColumns({
          table: 'profiles',
          columns: [
            { name: 'is_deleted', type: 'boolean', isOptional: true }
          ]
        }),
        // Add is_deleted column to plants
        addColumns({
          table: 'plants',
          columns: [
            { name: 'is_deleted', type: 'boolean', isOptional: true }
          ]
        }),
        // Add is_deleted column to grow_journals
        addColumns({
          table: 'grow_journals',
          columns: [
            { name: 'is_deleted', type: 'boolean', isOptional: true }
          ]
        }),
        // Add is_deleted column to journal_entries
        addColumns({
          table: 'journal_entries',
          columns: [
            { name: 'is_deleted', type: 'boolean', isOptional: true }
          ]
        }),
        // Add is_deleted column to grow_locations
        addColumns({
          table: 'grow_locations',
          columns: [
            { name: 'is_deleted', type: 'boolean', isOptional: true }
          ]
        }),
        // Add is_deleted column to diary_entries
        addColumns({
          table: 'diary_entries',
          columns: [
            { name: 'is_deleted', type: 'boolean', isOptional: true }
          ]
        }),
        // Add is_deleted column to plant_tasks
        addColumns({
          table: 'plant_tasks',
          columns: [
            { name: 'is_deleted', type: 'boolean', isOptional: true }
          ]
        }),
        // Add is_deleted column to posts
        addColumns({
          table: 'posts',
          columns: [
            { name: 'is_deleted', type: 'boolean', isOptional: true }
          ]
        })
      ]
    },
    // Migration to version 3: Ensure is_deleted column exists in plants table
    {
      toVersion: 3,
      steps: [
        // Ensure is_deleted column exists in plants table
        // This is necessary because the column may not have been created in version 2
        addColumns({
          table: 'plants',
          columns: [
            { name: 'is_deleted', type: 'boolean', isOptional: true }
          ]
        }),
        // Add next_water_date and next_feed_date columns to plants
        addColumns({
          table: 'plants',
          columns: [
            { name: 'next_water_date', type: 'number', isOptional: true },
            { name: 'next_feed_date', type: 'number', isOptional: true },
            { name: 'strain_id', type: 'string', isOptional: true, isIndexed: true }
          ]
        })
      ]
    }
  ]
});

export default migrations;
