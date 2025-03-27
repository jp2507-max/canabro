/**
 * WatermelonDB Schema Definition
 * 
 * Defines the database schema for local offline storage
 */
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 2,
  tables: [
    // PROFILES
    tableSchema({
      name: 'profiles',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'username', type: 'string', isIndexed: true },
        { name: 'avatar_url', type: 'string', isOptional: true },
        { name: 'bio', type: 'string', isOptional: true },
        { name: 'experience_level', type: 'string', isOptional: true },
        { name: 'preferred_grow_method', type: 'string', isOptional: true },
        { name: 'favorite_strains', type: 'string', isOptional: true }, // Serialized JSON
        { name: 'growing_since', type: 'string', isOptional: true },
        { name: 'location', type: 'string', isOptional: true },
        { name: 'is_certified', type: 'boolean', isOptional: true },
        { name: 'certifications', type: 'string', isOptional: true }, // Serialized JSON
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'is_deleted', type: 'boolean', isOptional: true }
      ]
    }),

    // PLANTS
    tableSchema({
      name: 'plants',
      columns: [
        { name: 'plant_id', type: 'string', isIndexed: true },
        { name: 'journal_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'strain', type: 'string', isOptional: true },
        { name: 'planted_date', type: 'string' },
        { name: 'growth_stage', type: 'string', isOptional: true },
        { name: 'height', type: 'number', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'image_url', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'location_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'is_deleted', type: 'boolean', isOptional: true }
      ]
    }),

    // GROW JOURNALS
    tableSchema({
      name: 'grow_journals',
      columns: [
        { name: 'journal_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'plant_strain', type: 'string' },
        { name: 'start_date', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'is_deleted', type: 'boolean', isOptional: true }
      ]
    }),

    // JOURNAL ENTRIES
    tableSchema({
      name: 'journal_entries',
      columns: [
        { name: 'entry_id', type: 'string', isIndexed: true },
        { name: 'journal_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'entry_date', type: 'string' },
        { name: 'entry_type', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'content', type: 'string', isOptional: true },
        { name: 'media', type: 'string', isOptional: true }, // Serialized JSON array
        { name: 'metrics', type: 'string', isOptional: true }, // Serialized JSON
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'is_deleted', type: 'boolean', isOptional: true }
      ]
    }),

    // GROW LOCATIONS
    tableSchema({
      name: 'grow_locations',
      columns: [
        { name: 'location_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'environment', type: 'string', isOptional: true },
        { name: 'conditions', type: 'string', isOptional: true }, // Serialized JSON
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'is_deleted', type: 'boolean', isOptional: true }
      ]
    }),

    // DIARY ENTRIES
    tableSchema({
      name: 'diary_entries',
      columns: [
        { name: 'entry_id', type: 'string', isIndexed: true },
        { name: 'plant_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'entry_date', type: 'string' },
        { name: 'entry_type', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'images', type: 'string', isOptional: true }, // Serialized JSON array
        { name: 'metrics', type: 'string', isOptional: true }, // Serialized JSON
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'is_deleted', type: 'boolean', isOptional: true }
      ]
    }),
    tableSchema({
      name: 'plant_tasks',
      columns: [
        { name: 'task_id', type: 'string', isIndexed: true },
        { name: 'plant_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'task_type', type: 'string' },
        { name: 'due_date', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'notification_id', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'is_deleted', type: 'boolean', isOptional: true }
      ]
    }),
    // POSTS
    tableSchema({
      name: 'posts',
      columns: [
        { name: 'post_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'content', type: 'string' },
        { name: 'image_url', type: 'string', isOptional: true },
        { name: 'plant_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'likes_count', type: 'number', isOptional: true },
        { name: 'comments_count', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'is_deleted', type: 'boolean', isOptional: true }
      ]
    })
  ]
});
