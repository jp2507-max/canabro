/**
 * WatermelonDB Schema Definition
 *
 * Defines the database schema for WatermelonDB
 */

import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 29, // Bumped to 29 to trigger cleanup of orphaned local posts data
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
        { name: 'location', type: 'string', isOptional: true }, // Added
        { name: 'growing_since', type: 'number', isOptional: true }, // Changed to store dates as numbers
        // { name: 'favorite_strains', type: 'string', isOptional: true }, // REMOVED
        { name: 'is_certified', type: 'boolean', isOptional: true }, // Added
        { name: 'certifications', type: 'string', isOptional: true }, // Added (stores JSON string)
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' }, // Removed isOptional: true
        { name: 'last_synced_at', type: 'number', isOptional: true }, // Added for migration 14
        { name: 'is_deleted', type: 'boolean', isOptional: true }, // Added
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
        { name: 'health_percentage', type: 'number', isOptional: true }, // NEW
        { name: 'next_watering_days', type: 'number', isOptional: true }, // NEW
        { name: 'next_nutrient_days', type: 'number', isOptional: true }, // NEW
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
        { name: 'title', type: 'string', isOptional: true }, // Added missing title column
        { name: 'entry_date', type: 'string' }, // Added entry_date to match model
        { name: 'entry_type', type: 'string' },
        { name: 'content', type: 'string' },
        { name: 'image_url', type: 'string', isOptional: true },
        { name: 'metrics', type: 'string', isOptional: true }, // JSON string for metrics
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    // Add missing notifications table - REMOVED FOR OFFLINE-FIRST FOCUS
    // tableSchema({
    //   name: 'notifications',
    //   columns: [
    //     { name: 'notification_id', type: 'string' },
    //     { name: 'user_id', type: 'string', isIndexed: true },
    //     { name: 'sender_id', type: 'string', isOptional: true },
    //     { name: 'type', type: 'string' },
    //     { name: 'content', type: 'string', isOptional: true },
    //     { name: 'related_post_id', type: 'string', isOptional: true, isIndexed: true },
    //     { name: 'related_comment_id', type: 'string', isOptional: true, isIndexed: true },
    //     { name: 'is_read', type: 'boolean' },
    //     { name: 'created_at', type: 'number' },
    //   ],
    // }),
    // Add missing strains table
    tableSchema({
      name: 'strains',
      columns: [
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'type', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'thc_percentage', type: 'number', isOptional: true },
        { name: 'cbd_percentage', type: 'number', isOptional: true },
        { name: 'flowering_time', type: 'number', isOptional: true }, // Matches model
        { name: 'grow_difficulty', type: 'string', isOptional: true },
        { name: 'effects', type: 'string', isOptional: true },
        { name: 'flavors', type: 'string', isOptional: true },
        { name: 'terpenes', type: 'string', isOptional: true }, // Added to match model
        { name: 'parents', type: 'string', isOptional: true }, // Added to match model
        { name: 'origin', type: 'string', isOptional: true }, // Added to match model
        { name: 'api_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'genetics', type: 'string', isOptional: true },
        { name: 'flowering_type', type: 'string', isOptional: true },
        { name: 'height_indoor', type: 'string', isOptional: true }, // Matches model (text)
        { name: 'height_outdoor', type: 'string', isOptional: true }, // Matches model (text)
        { name: 'average_yield', type: 'string', isOptional: true }, // Matches model (text)
        { name: 'yield_indoor', type: 'string', isOptional: true }, // Added to match model (text)
        { name: 'yield_outdoor', type: 'string', isOptional: true }, // Added to match model (text)
        { name: 'harvest_time_outdoor', type: 'string', isOptional: true },
        { name: 'breeder', type: 'string', isOptional: true }, // Added to match model
        { name: 'link', type: 'string', isOptional: true }, // Added to match model
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    // Add missing plant_tasks table
    tableSchema({
      name: 'plant_tasks',
      columns: [
        { name: 'task_id', type: 'string' }, // Assuming this is the primary key handled by WatermelonDB's \`id\`
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
    // Community Questions table for Q&A posts - REMOVED FOR OFFLINE-FIRST FOCUS
    // tableSchema({
    //   name: 'community_questions',
    //   columns: [
    //     { name: 'user_id', type: 'string', isIndexed: true },
    //     { name: 'title', type: 'string' },
    //     { name: 'content', type: 'string' },
    //     { name: 'category', type: 'string', isOptional: true },
    //     { name: 'tags', type: 'string', isOptional: true }, // JSON string array
    //     { name: 'image_url', type: 'string', isOptional: true },
    //     { name: 'is_solved', type: 'boolean', isOptional: true },
    //     { name: 'priority_level', type: 'number', isOptional: true },
    //     { name: 'likes_count', type: 'number', isOptional: true },
    //     { name: 'answers_count', type: 'number', isOptional: true },
    //     { name: 'views_count', type: 'number', isOptional: true },
    //     { name: 'created_at', type: 'number' },
    //     { name: 'updated_at', type: 'number' },
    //     { name: 'deleted_at', type: 'number', isOptional: true },
    //     { name: 'last_synced_at', type: 'number', isOptional: true },
    //   ],
    // }),
    // Community Plant Shares table for sharing plant progress - REMOVED FOR OFFLINE-FIRST FOCUS
    // tableSchema({
    //   name: 'community_plant_shares',
    //   columns: [
    //     { name: 'user_id', type: 'string', isIndexed: true },
    //     { name: 'plant_id', type: 'string', isOptional: true, isIndexed: true },
    //     { name: 'plant_name', type: 'string' },
    //     { name: 'strain_name', type: 'string', isOptional: true },
    //     { name: 'growth_stage', type: 'string', isOptional: true },
    //     { name: 'content', type: 'string' },
    //     { name: 'care_tips', type: 'string', isOptional: true },
    //     { name: 'growing_medium', type: 'string', isOptional: true },
    //     { name: 'environment', type: 'string', isOptional: true },
    //     { name: 'images_urls', type: 'string', isOptional: true }, // JSON string array
    //     { name: 'is_featured', type: 'boolean', isOptional: true },
    //     { name: 'likes_count', type: 'number', isOptional: true },
    //     { name: 'comments_count', type: 'number', isOptional: true },
    //     { name: 'shares_count', type: 'number', isOptional: true },
    //     { name: 'created_at', type: 'number' },
    //     { name: 'updated_at', type: 'number' },
    //     { name: 'deleted_at', type: 'number', isOptional: true },
    //     { name: 'last_synced_at', type: 'number', isOptional: true },
    //   ],
    // }),
    // Restored favorite_strains table so the FavoriteStrain model aligns with the schema again
    tableSchema({
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
});
