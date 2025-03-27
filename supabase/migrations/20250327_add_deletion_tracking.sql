-- Migration: 20250327_add_deletion_tracking.sql
-- Add deletion tracking tables for Supabase-WatermelonDB sync

-- Function to check if a table exists
CREATE OR REPLACE FUNCTION table_exists(tbl text) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = tbl
      AND table_type = 'BASE TABLE'
  );
END;
$$ LANGUAGE plpgsql;

-- Create deletion tracking tables for each synced table
DO $$
BEGIN
  -- PROFILES_DELETED
  IF NOT table_exists('profiles_deleted') THEN
    CREATE TABLE public.profiles_deleted (
      id TEXT PRIMARY KEY,
      user_id UUID NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE 'Created profiles_deleted table';
    
    -- Add RLS policies
    ALTER TABLE public.profiles_deleted ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can manage their own deleted profiles"
    ON public.profiles_deleted
    USING (auth.uid() = user_id);
  END IF;

  -- PLANTS_DELETED
  IF NOT table_exists('plants_deleted') THEN
    CREATE TABLE public.plants_deleted (
      id TEXT PRIMARY KEY,
      user_id UUID NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE 'Created plants_deleted table';
    
    -- Add RLS policies
    ALTER TABLE public.plants_deleted ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can manage their own deleted plants"
    ON public.plants_deleted
    USING (auth.uid() = user_id);
  END IF;

  -- GROW_JOURNALS_DELETED
  IF NOT table_exists('grow_journals_deleted') THEN
    CREATE TABLE public.grow_journals_deleted (
      id TEXT PRIMARY KEY,
      user_id UUID NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE 'Created grow_journals_deleted table';
    
    -- Add RLS policies
    ALTER TABLE public.grow_journals_deleted ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can manage their own deleted grow journals"
    ON public.grow_journals_deleted
    USING (auth.uid() = user_id);
  END IF;

  -- JOURNAL_ENTRIES_DELETED
  IF NOT table_exists('journal_entries_deleted') THEN
    CREATE TABLE public.journal_entries_deleted (
      id TEXT PRIMARY KEY,
      user_id UUID NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE 'Created journal_entries_deleted table';
    
    -- Add RLS policies
    ALTER TABLE public.journal_entries_deleted ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can manage their own deleted journal entries"
    ON public.journal_entries_deleted
    USING (auth.uid() = user_id);
  END IF;

  -- GROW_LOCATIONS_DELETED
  IF NOT table_exists('grow_locations_deleted') THEN
    CREATE TABLE public.grow_locations_deleted (
      id TEXT PRIMARY KEY,
      user_id UUID NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE 'Created grow_locations_deleted table';
    
    -- Add RLS policies
    ALTER TABLE public.grow_locations_deleted ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can manage their own deleted grow locations"
    ON public.grow_locations_deleted
    USING (auth.uid() = user_id);
  END IF;

  -- DIARY_ENTRIES_DELETED
  IF NOT table_exists('diary_entries_deleted') THEN
    CREATE TABLE public.diary_entries_deleted (
      id TEXT PRIMARY KEY,
      user_id UUID NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE 'Created diary_entries_deleted table';
    
    -- Add RLS policies
    ALTER TABLE public.diary_entries_deleted ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can manage their own deleted diary entries"
    ON public.diary_entries_deleted
    USING (auth.uid() = user_id);
  END IF;

  -- PLANT_TASKS_DELETED
  IF NOT table_exists('plant_tasks_deleted') THEN
    CREATE TABLE public.plant_tasks_deleted (
      id TEXT PRIMARY KEY,
      user_id UUID NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE 'Created plant_tasks_deleted table';
    
    -- Add RLS policies
    ALTER TABLE public.plant_tasks_deleted ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can manage their own deleted plant tasks"
    ON public.plant_tasks_deleted
    USING (auth.uid() = user_id);
  END IF;
END
$$;
