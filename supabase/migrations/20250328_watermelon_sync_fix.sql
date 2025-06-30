-- Migration: Fix WatermelonDB synchronization issues
-- Add missing columns and sync structures for WatermelonDB

-- Add the user_id column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN user_id text;
    -- Populate user_id with the UUID value from id
    UPDATE public.profiles SET user_id = id::text;
    -- Create an index for better query performance
    CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles(user_id);
    RAISE NOTICE 'Added user_id column to profiles table';
  END IF;
END
$$;

-- Create journal_entries table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'journal_entries'
  ) THEN
    CREATE TABLE public.journal_entries (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      entry_id TEXT UNIQUE NOT NULL,
      journal_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      entry_date TEXT NOT NULL,
      entry_type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      media JSONB,
      metrics JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS journal_entries_entry_id_idx ON public.journal_entries(entry_id);
    CREATE INDEX IF NOT EXISTS journal_entries_journal_id_idx ON public.journal_entries(journal_id);
    CREATE INDEX IF NOT EXISTS journal_entries_user_id_idx ON public.journal_entries(user_id);
    
    -- Enable RLS
    ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policies
    CREATE POLICY "Users can view their own journal entries" ON public.journal_entries
      FOR SELECT USING (auth.uid()::text = user_id);
      
    CREATE POLICY "Users can create their own journal entries" ON public.journal_entries
      FOR INSERT WITH CHECK (auth.uid()::text = user_id);
      
    CREATE POLICY "Users can update their own journal entries" ON public.journal_entries
      FOR UPDATE USING (auth.uid()::text = user_id);
      
    CREATE POLICY "Users can delete their own journal entries" ON public.journal_entries
      FOR DELETE USING (auth.uid()::text = user_id);
    
    RAISE NOTICE 'Created journal_entries table with proper structure';
  END IF;
END
$$;

-- Create posts table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'posts'
  ) THEN
    CREATE TABLE public.posts (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      post_id TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      plant_id TEXT,
      likes_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS posts_post_id_idx ON public.posts(post_id);
    CREATE INDEX IF NOT EXISTS posts_user_id_idx ON public.posts(user_id);
    CREATE INDEX IF NOT EXISTS posts_plant_id_idx ON public.posts(plant_id);
    
    -- Enable RLS
    ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policies
    CREATE POLICY "Everyone can view posts" ON public.posts
      FOR SELECT USING (true);
      
    CREATE POLICY "Users can create their own posts" ON public.posts
      FOR INSERT WITH CHECK (auth.uid()::text = user_id);
      
    CREATE POLICY "Users can update their own posts" ON public.posts
      FOR UPDATE USING (auth.uid()::text = user_id);
      
    CREATE POLICY "Users can delete their own posts" ON public.posts
      FOR DELETE USING (auth.uid()::text = user_id);
    
    RAISE NOTICE 'Created posts table with proper structure';
  END IF;
END
$$;

-- Add sync mechanism support: Add _changed column to all tables
DO $$
DECLARE
  table_names TEXT[] := ARRAY['profiles', 'plants', 'journal_entries', 'posts', 'grow_journals', 'grow_locations', 'plant_tasks']; -- Corrected missing commas
  tbl_name TEXT; -- Renamed variable to avoid confusion
BEGIN
  FOREACH tbl_name IN ARRAY table_names -- Use renamed variable
  LOOP
    -- Check if table exists and _changed column doesn't
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = tbl_name -- Corrected comparison
    ) AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = tbl_name -- Corrected comparison
        AND column_name = '_changed'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN _changed TIMESTAMP WITH TIME ZONE DEFAULT NOW()', table_name);
      RAISE NOTICE 'Added _changed column to % table', table_name;
      
      -- Create trigger to update _changed on row update
      EXECUTE format('
        CREATE OR REPLACE FUNCTION public.%I_update_changed()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW._changed = NOW(); -- Added missing semicolon
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      ', table_name);
      
      EXECUTE format('
        DROP TRIGGER IF EXISTS %I_update_changed_trigger ON public.%I;
        CREATE TRIGGER %I_update_changed_trigger
        BEFORE UPDATE ON public.%I
        FOR EACH ROW
        EXECUTE FUNCTION public.%I_update_changed();
      ', table_name, table_name, table_name, table_name, table_name);
      
      RAISE NOTICE 'Created trigger for updating _changed column on % table', table_name;
    END IF;
  END LOOP;
END
$$;
