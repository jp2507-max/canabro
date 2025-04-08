/**
 * WatermelonDB Schema Definition
 *
 * Defines the database schema for WatermelonDB
 */

import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 11, // Increment schema version for diary_entries changes
  tables: [
    tableSchema({
      name: 'profiles',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'username', type: 'string' },
        { name: 'display_name', type: 'string', isOptional: true },
        { name: 'avatar_url', type: 'string', isOptional: true },
        { name: 'experience_level', type: 'string', isOptional: true },
        { name: 'preferred_grow_method', type: 'string', isOptional: true },
        { name: 'bio', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' }, // Removed isOptional: true
      ],
    }),
    tableSchema({
      name: 'plants',
      columns: [
        // { name: 'plant_id', type: 'string', isOptional: true }, // Removed redundant plant_id column
        { name: 'journal_id', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'strain', type: 'string' },
        { name: 'strain_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'planted_date', type: 'string' },
        { name: 'growth_stage', type: 'string' },
        { name: 'height', type: 'number', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'image_url', type: 'string', isOptional: true },
        { name: 'location_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'cannabis_type', type: 'string', isOptional: true },
        { name: 'grow_medium', type: 'string', isOptional: true },
        { name: 'light_condition', type: 'string', isOptional: true },
        { name: 'location_description', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'is_auto_flower', type: 'boolean', isOptional: true }, // Added
        { name: 'is_feminized', type: 'boolean', isOptional: true }, // Added
        { name: 'thc_content', type: 'number', isOptional: true }, // Added
        { name: 'cbd_content', type: 'number', isOptional: true }, // Added
        { name: 'expected_harvest_date', type: 'string', isOptional: true }, // Added (using string for date)
        { name: 'is_deleted', type: 'boolean', isOptional: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' }, // Removed isOptional: true
      ],
    }),
    tableSchema({
      name: 'grow_journals',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'plant_id', type: 'string', isIndexed: true },
        { name: 'is_public', type: 'boolean', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' }, // Removed isOptional: true
      ],
    }),
    tableSchema({
      name: 'journal_entries',
      columns: [
        { name: 'journal_id', type: 'string', isIndexed: true },
        { name: 'entry_type', type: 'string' },
        { name: 'content', type: 'string' },
        { name: 'image_url', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' }, // Removed isOptional: true
      ],
    }),
    tableSchema({
      name: 'grow_locations',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'environment', type: 'string', isOptional: true },
        { name: 'light_source', type: 'string', isOptional: true },
        { name: 'growing_medium', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' }, // Removed isOptional: true
      ],
    }),
    tableSchema({
      name: 'diary_entries',
      columns: [
        { name: 'plant_id', type: 'string', isIndexed: true },
        { name: 'entry_date', type: 'string' }, // Added entry_date to match model
        { name: 'entry_type', type: 'string' },
        { name: 'content', type: 'string' },
        { name: 'image_url', type: 'string', isOptional: true },
        { name: 'metrics', type: 'string', isOptional: true }, // JSON string for metrics
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    // Add missing notifications table
    tableSchema({
      name: 'notifications',
      columns: [
        { name: 'notification_id', type: 'string' }, // Assuming this is the primary key handled by WatermelonDB's `id`
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'sender_id', type: 'string', isOptional: true },
        { name: 'type', type: 'string' },
        { name: 'content', type: 'string', isOptional: true },
        { name: 'related_post_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'related_comment_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'is_read', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        // Note: No updated_at in the model, so not adding here.
      ],
    }),
    // Add missing strains table
    tableSchema({
      name: 'strains',
      columns: [
        { name: 'strain_id', type: 'string' }, // Assuming this is the primary key handled by WatermelonDB's `id`
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
    // Add missing plant_tasks table
    tableSchema({
      name: 'plant_tasks',
      columns: [
        { name: 'task_id', type: 'string' }, // Assuming this is the primary key handled by WatermelonDB's `id`
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
    // Add missing posts table
    tableSchema({
      name: 'posts',
      columns: [
        { name: 'post_id', type: 'string' }, // Assuming this is the primary key handled by WatermelonDB's `id`
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
});
