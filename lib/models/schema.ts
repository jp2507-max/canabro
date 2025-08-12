/**
 * WatermelonDB Schema Definition
 *
 * Defines the database schema for WatermelonDB
 */

import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 36, // Bumped to 36 to add idempotency & strain metadata fields on plant_tasks
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
        // ADDITIONAL METRICS FIELDS
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
        // Normalized strain-based scheduling fields
        { name: 'plant_type', type: 'string', isOptional: true, isIndexed: true }, // 'photoperiod' | 'autoflower' | 'unknown'
        { name: 'baseline_kind', type: 'string', isOptional: true }, // 'flip' | 'germination'
        { name: 'baseline_date', type: 'number', isOptional: true }, // date as timestamp
        { name: 'environment', type: 'string', isOptional: true, isIndexed: true }, // 'indoor' | 'outdoor' | 'greenhouse'
        { name: 'hemisphere', type: 'string', isOptional: true }, // 'N' | 'S'
        { name: 'predicted_flower_min_days', type: 'number', isOptional: true },
        { name: 'predicted_flower_max_days', type: 'number', isOptional: true },
        { name: 'predicted_harvest_start', type: 'number', isOptional: true }, // date as timestamp
        { name: 'predicted_harvest_end', type: 'number', isOptional: true },   // date as timestamp
        { name: 'schedule_confidence', type: 'number', isOptional: true },
        { name: 'yield_unit', type: 'string', isOptional: true }, // 'g_per_plant' | 'g_per_m2'
        { name: 'yield_min', type: 'number', isOptional: true },
        { name: 'yield_max', type: 'number', isOptional: true },
        { name: 'yield_category', type: 'string', isOptional: true }, // 'low' | 'medium' | 'high' | 'unknown'
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
        { name: 'due_date', type: 'string', isIndexed: true }, // Added index for performance optimization
        { name: 'status', type: 'string' },
        { name: 'notification_id', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        // New task management fields for advanced calendar system
        { name: 'priority', type: 'string', isOptional: true, isIndexed: true }, // Added index for performance optimization
        { name: 'estimated_duration', type: 'number', isOptional: true },
        { name: 'template_id', type: 'string', isOptional: true },
        { name: 'week_number', type: 'number', isOptional: true },
        { name: 'completion_data', type: 'string', isOptional: true }, // JSON string
        { name: 'auto_generated', type: 'boolean', isOptional: true },
        { name: 'parent_task_id', type: 'string', isOptional: true },
        { name: 'sequence_number', type: 'number', isOptional: true },
        { name: 'environmental_conditions', type: 'string', isOptional: true }, // JSON string
        // Idempotency & strain metadata
        { name: 'source', type: 'string', isOptional: true, isIndexed: true }, // 'auto' | 'manual'
        { name: 'locked', type: 'boolean', isOptional: true },
        { name: 'template_version', type: 'number', isOptional: true },
        { name: 'strain_metadata', type: 'string', isOptional: true }, // JSON: { difficulty, harvestWindow, strainId }
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
    // New plant management tables
    tableSchema({
      name: 'plant_photos',
      columns: [
        { name: 'plant_id', type: 'string', isIndexed: true },
        { name: 'image_url', type: 'string' },
        { name: 'thumbnail_url', type: 'string', isOptional: true },
        { name: 'caption', type: 'string', isOptional: true },
        { name: 'growth_stage', type: 'string' },
        { name: 'is_primary', type: 'boolean', isOptional: true },
        { name: 'is_deleted', type: 'boolean', isOptional: true },
        { name: 'file_size', type: 'number', isOptional: true },
        { name: 'width', type: 'number', isOptional: true },
        { name: 'height', type: 'number', isOptional: true },
        { name: 'taken_at', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'last_synced_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
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
    tableSchema({
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
    // Schedule templates table for advanced calendar system
    tableSchema({
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
    // Advanced Community Features Tables
    tableSchema({
      name: 'conversation_threads',
      columns: [
        { name: 'thread_type', type: 'string' }, // 'direct' | 'group'
        { name: 'participants', type: 'string' }, // JSON array of user IDs
        { name: 'last_message_id', type: 'string', isOptional: true },
        { name: 'unread_count', type: 'number' },
        { name: 'created_by', type: 'string' },
        { name: 'name', type: 'string', isOptional: true }, // For group conversations
        { name: 'description', type: 'string', isOptional: true }, // For group conversations
        { name: 'avatar_url', type: 'string', isOptional: true }, // For group conversations
        { name: 'settings', type: 'string', isOptional: true }, // JSON group settings
        { name: 'is_active', type: 'boolean' },
        { name: 'is_deleted', type: 'boolean', isOptional: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'messages',
      columns: [
        { name: 'thread_id', type: 'string', isIndexed: true },
        { name: 'sender_id', type: 'string', isIndexed: true },
        { name: 'content', type: 'string' },
        { name: 'message_type', type: 'string' }, // 'text' | 'image' | 'file' | 'plant_share' | 'location'
        { name: 'attachments', type: 'string', isOptional: true }, // JSON array
        { name: 'reply_to', type: 'string', isOptional: true }, // Message ID being replied to
        { name: 'reactions', type: 'string', isOptional: true }, // JSON array
        { name: 'is_edited', type: 'boolean' },
        { name: 'delivered_at', type: 'number', isOptional: true },
        { name: 'read_at', type: 'number', isOptional: true },
        { name: 'is_deleted', type: 'boolean', isOptional: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'sent_at', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'live_notifications',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'notification_type', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'message', type: 'string' },
        { name: 'data', type: 'string' }, // JSON notification data
        { name: 'priority', type: 'string' }, // 'low' | 'normal' | 'high' | 'urgent'
        { name: 'is_read', type: 'boolean' },
        { name: 'is_actionable', type: 'boolean' },
        { name: 'actions', type: 'string', isOptional: true }, // JSON array
        { name: 'expires_at', type: 'number', isOptional: true },
        { name: 'is_deleted', type: 'boolean', isOptional: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'user_presence',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'status', type: 'string' }, // 'online' | 'away' | 'busy' | 'offline'
        { name: 'last_seen', type: 'number' },
        { name: 'is_online', type: 'boolean' },
        { name: 'presence_data', type: 'string', isOptional: true }, // JSON presence data
        { name: 'connection_id', type: 'string', isOptional: true }, // WebSocket connection ID
        { name: 'heartbeat_interval', type: 'number', isOptional: true }, // Seconds
        { name: 'last_heartbeat', type: 'number', isOptional: true },
        { name: 'is_deleted', type: 'boolean', isOptional: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'follow_relationships',
      columns: [
        { name: 'follower_id', type: 'string', isIndexed: true },
        { name: 'following_id', type: 'string', isIndexed: true },
        { name: 'notification_settings', type: 'string' }, // JSON notification settings
        { name: 'relationship_type', type: 'string' }, // 'follow' | 'mutual' | 'blocked'
        { name: 'is_active', type: 'boolean' },
        { name: 'is_deleted', type: 'boolean', isOptional: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'followed_at', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'social_groups',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'tags', type: 'string' }, // JSON array
        { name: 'avatar', type: 'string', isOptional: true },
        { name: 'cover_image', type: 'string', isOptional: true },
        { name: 'settings', type: 'string' }, // JSON group settings
        { name: 'stats', type: 'string' }, // JSON group stats
        { name: 'created_by', type: 'string' },
        { name: 'is_active', type: 'boolean' },
        { name: 'is_deleted', type: 'boolean', isOptional: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'group_members',
      columns: [
        { name: 'group_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'role', type: 'string' }, // 'member' | 'moderator' | 'admin'
        { name: 'permissions', type: 'string' }, // JSON permissions
        { name: 'is_active', type: 'boolean' },
        { name: 'is_deleted', type: 'boolean', isOptional: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'joined_at', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'live_events',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'event_type', type: 'string' },
        { name: 'host_id', type: 'string' },
        { name: 'co_hosts', type: 'string', isOptional: true }, // JSON array
        { name: 'scheduled_start', type: 'number' },
        { name: 'scheduled_end', type: 'number' },
        { name: 'actual_start', type: 'number', isOptional: true },
        { name: 'actual_end', type: 'number', isOptional: true },
        { name: 'status', type: 'string' }, // 'scheduled' | 'live' | 'ended' | 'cancelled' | 'recorded'
        { name: 'settings', type: 'string' }, // JSON event settings
        { name: 'recording', type: 'string', isOptional: true }, // JSON recording data
        { name: 'is_deleted', type: 'boolean', isOptional: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'event_participants',
      columns: [
        { name: 'event_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'role', type: 'string' }, // 'host' | 'co_host' | 'speaker' | 'participant'
        { name: 'permissions', type: 'string' }, // JSON permissions
        { name: 'is_active', type: 'boolean' },
        { name: 'joined_at', type: 'number', isOptional: true },
        { name: 'left_at', type: 'number', isOptional: true },
        { name: 'duration_minutes', type: 'number', isOptional: true },
        { name: 'is_deleted', type: 'boolean', isOptional: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'community_polls',
      columns: [
        { name: 'question', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'options', type: 'string' }, // JSON array of poll options
        { name: 'settings', type: 'string' }, // JSON poll settings
        { name: 'created_by', type: 'string' },
        { name: 'ends_at', type: 'number', isOptional: true },
        { name: 'status', type: 'string' }, // 'active' | 'ended' | 'cancelled'
        { name: 'results', type: 'string' }, // JSON poll results
        { name: 'is_deleted', type: 'boolean', isOptional: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
