-- Migration: 20250326_sync_watermelon_supabase.sql
-- Synchronize Supabase schema with WatermelonDB model requirements

-- Function to check if a column exists
CREATE OR REPLACE FUNCTION column_exists(tbl text, col text) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = tbl
      AND column_name = col
  );
END;
$$ LANGUAGE plpgsql;

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

-- Function to check if a view exists
CREATE OR REPLACE FUNCTION view_exists(v text) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM information_schema.views 
    WHERE table_schema = 'public' 
      AND table_name = v
  );
END;
$$ LANGUAGE plpgsql;

-- Clean up any existing views that conflict with our tables
DO $$
BEGIN
  -- Check for plant_diary_entries view and drop it if exists
  IF view_exists('plant_diary_entries') THEN
    EXECUTE 'DROP VIEW public.plant_diary_entries CASCADE';
    RAISE NOTICE 'Dropped plant_diary_entries view that was conflicting with table creation';
  END IF;
  
  -- Check for journal_entries view and drop it if exists
  IF view_exists('journal_entries') THEN
    EXECUTE 'DROP VIEW public.journal_entries CASCADE';
    RAISE NOTICE 'Dropped journal_entries view that was conflicting with table creation';
  END IF;
  
  -- Check for grow_journals view and drop it if exists
  IF view_exists('grow_journals') THEN
    EXECUTE 'DROP VIEW public.grow_journals CASCADE';
    RAISE NOTICE 'Dropped grow_journals view that was conflicting with table creation';
  END IF;
  
  -- Check for grow_locations view and drop it if exists
  IF view_exists('grow_locations') THEN
    EXECUTE 'DROP VIEW public.grow_locations CASCADE';
    RAISE NOTICE 'Dropped grow_locations view that was conflicting with table creation';
  END IF;
END
$$;

-- ==========================================
-- GROW_JOURNALS TABLE
-- ==========================================
DO $$
BEGIN
  IF NOT table_exists('grow_journals') THEN
    CREATE TABLE public.grow_journals (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      journal_id TEXT UNIQUE NOT NULL,
      user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      plant_strain TEXT NOT NULL,
      start_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE 'Created grow_journals table';
  ELSE
    -- Make sure journal_id exists
    IF NOT column_exists('grow_journals', 'journal_id') THEN
      ALTER TABLE public.grow_journals ADD COLUMN journal_id TEXT UNIQUE;
      RAISE NOTICE 'Added journal_id to grow_journals table';
    END IF;
  END IF;
END
$$;

-- ==========================================
-- GROW_LOCATIONS TABLE
-- ==========================================
DO $$
BEGIN
  IF NOT table_exists('grow_locations') THEN
    CREATE TABLE public.grow_locations (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      location_id TEXT UNIQUE NOT NULL,
      user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      environment TEXT,
      conditions JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE 'Created grow_locations table';
  ELSE
    -- Make sure location_id exists
    IF NOT column_exists('grow_locations', 'location_id') THEN
      ALTER TABLE public.grow_locations ADD COLUMN location_id TEXT UNIQUE;
      RAISE NOTICE 'Added location_id to grow_locations table';
    END IF;
  END IF;
END
$$;

-- ==========================================
-- PLANTS TABLE ADJUSTMENTS
-- ==========================================
DO $$
BEGIN
  -- Ensure the plants table exists
  IF NOT table_exists('plants') THEN
    CREATE TABLE public.plants (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      plant_id TEXT UNIQUE NOT NULL,
      user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE 'Created plants table';
  END IF;

  -- Add plant_id if it doesn't exist
  IF NOT column_exists('plants', 'plant_id') THEN
    ALTER TABLE public.plants ADD COLUMN plant_id TEXT UNIQUE;
    RAISE NOTICE 'Added plant_id to plants table';
  END IF;

  -- Add journal_id after verifying grow_journals exists
  IF table_exists('grow_journals') AND column_exists('grow_journals', 'journal_id') THEN
    IF NOT column_exists('plants', 'journal_id') THEN
      ALTER TABLE public.plants ADD COLUMN journal_id TEXT;
      RAISE NOTICE 'Added journal_id to plants table';
      
      -- Add foreign key separately to avoid errors
      ALTER TABLE public.plants ADD CONSTRAINT plants_journal_id_fkey 
        FOREIGN KEY (journal_id) REFERENCES public.grow_journals(journal_id) ON DELETE SET NULL;
      RAISE NOTICE 'Added foreign key constraint for journal_id to plants table';
    END IF;
  END IF;

  -- Add other plant fields
  IF NOT column_exists('plants', 'growth_stage') THEN
    ALTER TABLE public.plants ADD COLUMN growth_stage TEXT;
    RAISE NOTICE 'Added growth_stage to plants table';
  END IF;

  IF NOT column_exists('plants', 'height') THEN
    ALTER TABLE public.plants ADD COLUMN height NUMERIC;
    RAISE NOTICE 'Added height to plants table';
  END IF;

  -- Add location_id after verifying grow_locations exists
  IF table_exists('grow_locations') AND column_exists('grow_locations', 'location_id') THEN
    IF NOT column_exists('plants', 'location_id') THEN
      ALTER TABLE public.plants ADD COLUMN location_id TEXT;
      RAISE NOTICE 'Added location_id to plants table';
      
      -- Add foreign key separately to avoid errors
      ALTER TABLE public.plants ADD CONSTRAINT plants_location_id_fkey 
        FOREIGN KEY (location_id) REFERENCES public.grow_locations(location_id) ON DELETE SET NULL;
      RAISE NOTICE 'Added foreign key constraint for location_id to plants table';
    END IF;
  END IF;
END
$$;

-- ==========================================
-- PROFILES TABLE ADJUSTMENTS
-- ==========================================
DO $$
BEGIN
  -- Add profile fields
  IF NOT column_exists('profiles', 'experience_level') THEN
    ALTER TABLE public.profiles ADD COLUMN experience_level TEXT;
    RAISE NOTICE 'Added experience_level to profiles table';
  END IF;

  IF NOT column_exists('profiles', 'preferred_grow_method') THEN
    ALTER TABLE public.profiles ADD COLUMN preferred_grow_method TEXT;
    RAISE NOTICE 'Added preferred_grow_method to profiles table';
  END IF;

  IF NOT column_exists('profiles', 'favorite_strains') THEN
    ALTER TABLE public.profiles ADD COLUMN favorite_strains TEXT;
    RAISE NOTICE 'Added favorite_strains to profiles table';
  END IF;

  IF NOT column_exists('profiles', 'growing_since') THEN
    ALTER TABLE public.profiles ADD COLUMN growing_since TEXT;
    RAISE NOTICE 'Added growing_since to profiles table';
  END IF;

  IF NOT column_exists('profiles', 'is_certified') THEN
    ALTER TABLE public.profiles ADD COLUMN is_certified BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added is_certified to profiles table';
  END IF;

  IF NOT column_exists('profiles', 'certifications') THEN
    ALTER TABLE public.profiles ADD COLUMN certifications TEXT;
    RAISE NOTICE 'Added certifications to profiles table';
  END IF;
END
$$;

-- ==========================================
-- JOURNAL_ENTRIES TABLE
-- ==========================================
DO $$
BEGIN
  IF NOT table_exists('journal_entries') THEN
    CREATE TABLE public.journal_entries (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      entry_id TEXT UNIQUE NOT NULL,
      journal_id TEXT NOT NULL,
      user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      entry_date TEXT NOT NULL,
      entry_type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      media TEXT[],
      metrics JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE 'Created journal_entries table';
    
    -- Add the journal_id foreign key only if grow_journals exists
    IF table_exists('grow_journals') AND column_exists('grow_journals', 'journal_id') THEN
      ALTER TABLE public.journal_entries 
        ADD CONSTRAINT journal_entries_journal_id_fkey 
        FOREIGN KEY (journal_id) REFERENCES public.grow_journals(journal_id) ON DELETE CASCADE;
      RAISE NOTICE 'Added foreign key constraint for journal_id to journal_entries table';
    END IF;
  END IF;
END
$$;

-- ==========================================
-- PLANT_DIARY_ENTRIES TABLE (FOR DIRECT PLANT ENTRIES)
-- ==========================================
DO $$
BEGIN
  IF NOT table_exists('plant_diary_entries') THEN
    CREATE TABLE public.plant_diary_entries (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      entry_id TEXT UNIQUE NOT NULL,
      plant_id TEXT NOT NULL,
      user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      entry_date TEXT NOT NULL,
      entry_type TEXT NOT NULL,
      notes TEXT,
      images TEXT[],
      metrics JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE 'Created plant_diary_entries table';
    
    -- Add the plant_id foreign key only if plants table has plant_id
    IF table_exists('plants') AND column_exists('plants', 'plant_id') THEN
      ALTER TABLE public.plant_diary_entries 
        ADD CONSTRAINT plant_diary_entries_plant_id_fkey 
        FOREIGN KEY (plant_id) REFERENCES public.plants(plant_id) ON DELETE CASCADE;
      RAISE NOTICE 'Added foreign key constraint for plant_id to plant_diary_entries table';
    END IF;
  END IF;
END
$$;

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- Create each index in its own transaction to avoid errors
-- ==========================================

-- Plants indexes
DO $$
BEGIN
  IF table_exists('plants') AND column_exists('plants', 'plant_id') THEN
    CREATE INDEX IF NOT EXISTS plants_plant_id_idx ON public.plants(plant_id);
    RAISE NOTICE 'Created index plants_plant_id_idx';
  END IF;
END $$;

DO $$
BEGIN
  IF table_exists('plants') AND column_exists('plants', 'journal_id') THEN
    CREATE INDEX IF NOT EXISTS plants_journal_id_idx ON public.plants(journal_id);
    RAISE NOTICE 'Created index plants_journal_id_idx';
  END IF;
END $$;

DO $$
BEGIN
  IF table_exists('plants') AND column_exists('plants', 'user_id') THEN
    CREATE INDEX IF NOT EXISTS plants_user_id_idx ON public.plants(user_id);
    RAISE NOTICE 'Created index plants_user_id_idx';
  END IF;
END $$;

-- Grow journals indexes
DO $$
BEGIN
  IF table_exists('grow_journals') AND column_exists('grow_journals', 'journal_id') THEN
    CREATE INDEX IF NOT EXISTS grow_journals_journal_id_idx ON public.grow_journals(journal_id);
    RAISE NOTICE 'Created index grow_journals_journal_id_idx';
  END IF;
END $$;

DO $$
BEGIN
  IF table_exists('grow_journals') AND column_exists('grow_journals', 'user_id') THEN
    CREATE INDEX IF NOT EXISTS grow_journals_user_id_idx ON public.grow_journals(user_id);
    RAISE NOTICE 'Created index grow_journals_user_id_idx';
  END IF;
END $$;

-- Journal entries indexes
DO $$
BEGIN
  IF table_exists('journal_entries') AND column_exists('journal_entries', 'entry_id') THEN
    CREATE INDEX IF NOT EXISTS journal_entries_entry_id_idx ON public.journal_entries(entry_id);
    RAISE NOTICE 'Created index journal_entries_entry_id_idx';
  END IF;
END $$;

DO $$
BEGIN
  IF table_exists('journal_entries') AND column_exists('journal_entries', 'journal_id') THEN
    CREATE INDEX IF NOT EXISTS journal_entries_journal_id_idx ON public.journal_entries(journal_id);
    RAISE NOTICE 'Created index journal_entries_journal_id_idx';
  END IF;
END $$;

DO $$
BEGIN
  IF table_exists('journal_entries') AND column_exists('journal_entries', 'user_id') THEN
    CREATE INDEX IF NOT EXISTS journal_entries_user_id_idx ON public.journal_entries(user_id);
    RAISE NOTICE 'Created index journal_entries_user_id_idx';
  END IF;
END $$;

-- Grow locations indexes
DO $$
BEGIN
  IF table_exists('grow_locations') AND column_exists('grow_locations', 'location_id') THEN
    CREATE INDEX IF NOT EXISTS grow_locations_location_id_idx ON public.grow_locations(location_id);
    RAISE NOTICE 'Created index grow_locations_location_id_idx';
  END IF;
END $$;

DO $$
BEGIN
  IF table_exists('grow_locations') AND column_exists('grow_locations', 'user_id') THEN
    CREATE INDEX IF NOT EXISTS grow_locations_user_id_idx ON public.grow_locations(user_id);
    RAISE NOTICE 'Created index grow_locations_user_id_idx';
  END IF;
END $$;

-- Plant diary entries indexes
DO $$
BEGIN
  IF table_exists('plant_diary_entries') AND column_exists('plant_diary_entries', 'entry_id') THEN
    CREATE INDEX IF NOT EXISTS plant_diary_entries_entry_id_idx ON public.plant_diary_entries(entry_id);
    RAISE NOTICE 'Created index plant_diary_entries_entry_id_idx';
  END IF;
END $$;

DO $$
BEGIN
  IF table_exists('plant_diary_entries') AND column_exists('plant_diary_entries', 'plant_id') THEN
    CREATE INDEX IF NOT EXISTS plant_diary_entries_plant_id_idx ON public.plant_diary_entries(plant_id);
    RAISE NOTICE 'Created index plant_diary_entries_plant_id_idx';
  END IF;
END $$;

DO $$
BEGIN
  IF table_exists('plant_diary_entries') AND column_exists('plant_diary_entries', 'user_id') THEN
    CREATE INDEX IF NOT EXISTS plant_diary_entries_user_id_idx ON public.plant_diary_entries(user_id);
    RAISE NOTICE 'Created index plant_diary_entries_user_id_idx';
  END IF;
END $$;

-- ==========================================
-- RLS POLICIES
-- ==========================================
DO $$
BEGIN
  -- Enable RLS on tables
  IF table_exists('grow_journals') THEN
    ALTER TABLE public.grow_journals ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on grow_journals table';
    
    -- Grow Journals policies
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'grow_journals' AND policyname = 'Users can view their own grow journals'
    ) AND column_exists('grow_journals', 'user_id') THEN
      CREATE POLICY "Users can view their own grow journals" 
      ON public.grow_journals FOR SELECT 
      TO authenticated 
      USING (auth.uid() = user_id);
      RAISE NOTICE 'Created policy: Users can view their own grow journals';
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'grow_journals' AND policyname = 'Users can create their own grow journals'
    ) AND column_exists('grow_journals', 'user_id') THEN
      CREATE POLICY "Users can create their own grow journals" 
      ON public.grow_journals FOR INSERT 
      TO authenticated 
      WITH CHECK (auth.uid() = user_id);
      RAISE NOTICE 'Created policy: Users can create their own grow journals';
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'grow_journals' AND policyname = 'Users can update their own grow journals'
    ) AND column_exists('grow_journals', 'user_id') THEN
      CREATE POLICY "Users can update their own grow journals" 
      ON public.grow_journals FOR UPDATE 
      TO authenticated 
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
      RAISE NOTICE 'Created policy: Users can update their own grow journals';
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'grow_journals' AND policyname = 'Users can delete their own grow journals'
    ) AND column_exists('grow_journals', 'user_id') THEN
      CREATE POLICY "Users can delete their own grow journals" 
      ON public.grow_journals FOR DELETE 
      TO authenticated 
      USING (auth.uid() = user_id);
      RAISE NOTICE 'Created policy: Users can delete their own grow journals';
    END IF;
  END IF;
  
  -- Journal Entries policies
  IF table_exists('journal_entries') THEN
    ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on journal_entries table';
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'journal_entries' AND policyname = 'Users can view their own journal entries'
    ) AND column_exists('journal_entries', 'user_id') THEN
      CREATE POLICY "Users can view their own journal entries" 
      ON public.journal_entries FOR SELECT 
      TO authenticated 
      USING (auth.uid() = user_id);
      RAISE NOTICE 'Created policy: Users can view their own journal entries';
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'journal_entries' AND policyname = 'Users can create their own journal entries'
    ) AND column_exists('journal_entries', 'user_id') THEN
      CREATE POLICY "Users can create their own journal entries" 
      ON public.journal_entries FOR INSERT 
      TO authenticated 
      WITH CHECK (auth.uid() = user_id);
      RAISE NOTICE 'Created policy: Users can create their own journal entries';
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'journal_entries' AND policyname = 'Users can update their own journal entries'
    ) AND column_exists('journal_entries', 'user_id') THEN
      CREATE POLICY "Users can update their own journal entries" 
      ON public.journal_entries FOR UPDATE 
      TO authenticated 
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
      RAISE NOTICE 'Created policy: Users can update their own journal entries';
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'journal_entries' AND policyname = 'Users can delete their own journal entries'
    ) AND column_exists('journal_entries', 'user_id') THEN
      CREATE POLICY "Users can delete their own journal entries" 
      ON public.journal_entries FOR DELETE 
      TO authenticated 
      USING (auth.uid() = user_id);
      RAISE NOTICE 'Created policy: Users can delete their own journal entries';
    END IF;
  END IF;
  
  -- Grow Locations policies
  IF table_exists('grow_locations') THEN
    ALTER TABLE public.grow_locations ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on grow_locations table';
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'grow_locations' AND policyname = 'Users can view their own grow locations'
    ) AND column_exists('grow_locations', 'user_id') THEN
      CREATE POLICY "Users can view their own grow locations" 
      ON public.grow_locations FOR SELECT 
      TO authenticated 
      USING (auth.uid() = user_id);
      RAISE NOTICE 'Created policy: Users can view their own grow locations';
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'grow_locations' AND policyname = 'Users can create their own grow locations'
    ) AND column_exists('grow_locations', 'user_id') THEN
      CREATE POLICY "Users can create their own grow locations" 
      ON public.grow_locations FOR INSERT 
      TO authenticated 
      WITH CHECK (auth.uid() = user_id);
      RAISE NOTICE 'Created policy: Users can create their own grow locations';
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'grow_locations' AND policyname = 'Users can update their own grow locations'
    ) AND column_exists('grow_locations', 'user_id') THEN
      CREATE POLICY "Users can update their own grow locations" 
      ON public.grow_locations FOR UPDATE 
      TO authenticated 
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
      RAISE NOTICE 'Created policy: Users can update their own grow locations';
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'grow_locations' AND policyname = 'Users can delete their own grow locations'
    ) AND column_exists('grow_locations', 'user_id') THEN
      CREATE POLICY "Users can delete their own grow locations" 
      ON public.grow_locations FOR DELETE 
      TO authenticated 
      USING (auth.uid() = user_id);
      RAISE NOTICE 'Created policy: Users can delete their own grow locations';
    END IF;
  END IF;
  
  -- Plant Diary Entries policies
  IF table_exists('plant_diary_entries') THEN
    ALTER TABLE public.plant_diary_entries ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on plant_diary_entries table';
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'plant_diary_entries' AND policyname = 'Users can view their own plant diary entries'
    ) AND column_exists('plant_diary_entries', 'user_id') THEN
      CREATE POLICY "Users can view their own plant diary entries" 
      ON public.plant_diary_entries FOR SELECT 
      TO authenticated 
      USING (auth.uid() = user_id);
      RAISE NOTICE 'Created policy: Users can view their own plant diary entries';
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'plant_diary_entries' AND policyname = 'Users can create their own plant diary entries'
    ) AND column_exists('plant_diary_entries', 'user_id') THEN
      CREATE POLICY "Users can create their own plant diary entries" 
      ON public.plant_diary_entries FOR INSERT 
      TO authenticated 
      WITH CHECK (auth.uid() = user_id);
      RAISE NOTICE 'Created policy: Users can create their own plant diary entries';
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'plant_diary_entries' AND policyname = 'Users can update their own plant diary entries'
    ) AND column_exists('plant_diary_entries', 'user_id') THEN
      CREATE POLICY "Users can update their own plant diary entries" 
      ON public.plant_diary_entries FOR UPDATE 
      TO authenticated 
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
      RAISE NOTICE 'Created policy: Users can update their own plant diary entries';
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'plant_diary_entries' AND policyname = 'Users can delete their own plant diary entries'
    ) AND column_exists('plant_diary_entries', 'user_id') THEN
      CREATE POLICY "Users can delete their own plant diary entries" 
      ON public.plant_diary_entries FOR DELETE 
      TO authenticated 
      USING (auth.uid() = user_id);
      RAISE NOTICE 'Created policy: Users can delete their own plant diary entries';
    END IF;
  END IF;
END
$$;
