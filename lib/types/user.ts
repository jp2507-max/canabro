/**
 * User-related interfaces for the Canabro app
 */

import { User as SupabaseUser } from '@supabase/supabase-js';

/**
 * Extended user interface that includes Supabase user properties
 * and additional application-specific properties
 */
export interface User extends SupabaseUser {
  // Additional properties can be added here if needed
}

/**
 * Profile interface for user profile data
 */
export interface Profile {
  id: string;
  user_id: string;
  username: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  experience_level?: ExperienceLevel;
  preferred_grow_method?: GrowMethod;
  favorite_strains?: string[];
  growing_since?: string;
  location?: string;
  is_certified?: boolean;
  certifications?: string[];
  plants_count?: number;
  posts_count?: number;
  followers_count?: number;
  following_count?: number;
  created_at: string;
  updated_at?: string;
}

/**
 * User experience levels for growing cannabis
 */
export enum ExperienceLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

/**
 * Growing methods for cannabis
 */
export enum GrowMethod {
  SOIL = 'soil',
  HYDROPONICS = 'hydroponics',
  AEROPONICS = 'aeroponics',
  COCO = 'coco',
  AQUAPONICS = 'aquaponics',
  DWC = 'deep_water_culture',
  OTHER = 'other'
}

/**
 * User settings interface
 */
export interface UserSettings {
  id: string;
  user_id: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  dark_mode: boolean;
  language: string;
  measurement_system: 'metric' | 'imperial';
  privacy_level: 'public' | 'private' | 'friends';
  created_at: string;
  updated_at?: string;
}

/**
 * User authentication credentials
 */
export interface AuthCredentials {
  email: string;
  password: string;
}

/**
 * User registration data
 */
export interface RegistrationData extends AuthCredentials {
  username: string;
}
