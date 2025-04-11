-- supabase/migrations/20250411073900_add_missing_profile_columns.sql

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS growing_since TEXT,
ADD COLUMN IF NOT EXISTS favorite_strains TEXT, -- For storing JSON array
ADD COLUMN IF NOT EXISTS is_certified BOOLEAN,
ADD COLUMN IF NOT EXISTS certifications TEXT, -- For storing JSON array
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN;
