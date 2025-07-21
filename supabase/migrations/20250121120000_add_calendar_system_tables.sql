-- Advanced Calendar System Migration
-- Adds new tables and extends existing tables for calendar functionality

-- Create schedule_templates table
CREATE TABLE IF NOT EXISTS public.schedule_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    strain_type TEXT,
    duration_weeks INTEGER NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    template_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_synced_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false,
    _status TEXT,
    _changed TEXT
);

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    event_type TEXT NOT NULL CHECK (event_type IN ('task', 'milestone', 'reminder')),
    plant_id UUID REFERENCES public.plants(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.plant_tasks(id) ON DELETE CASCADE,
    is_all_day BOOLEAN DEFAULT false,
    recurrence_rule TEXT, -- RRULE format
    metadata JSONB DEFAULT '{}'::jsonb,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_synced_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false,
    _status TEXT,
    _changed TEXT
);

-- Create notification_schedules table
CREATE TABLE IF NOT EXISTS public.notification_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL,
    next_notification TIMESTAMPTZ NOT NULL,
    interval_hours INTEGER NOT NULL,
    max_notifications INTEGER,
    sent_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    notification_settings JSONB DEFAULT '{}'::jsonb,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_synced_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false,
    _status TEXT,
    _changed TEXT
);

-- Extend plant_tasks table with calendar-specific fields
ALTER TABLE public.plant_tasks 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.schedule_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS week_number INTEGER,
ADD COLUMN IF NOT EXISTS estimated_duration INTEGER, -- minutes
ADD COLUMN IF NOT EXISTS completion_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.plant_tasks(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS sequence_number INTEGER,
ADD COLUMN IF NOT EXISTS environmental_conditions JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_schedule_templates_created_by ON public.schedule_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_category ON public.schedule_templates(category);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_is_public ON public.schedule_templates(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_plant_id ON public.calendar_events(plant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_task_id ON public.calendar_events(task_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON public.calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type ON public.calendar_events(event_type);

CREATE INDEX IF NOT EXISTS idx_notification_schedules_plant_id ON public.notification_schedules(plant_id);
CREATE INDEX IF NOT EXISTS idx_notification_schedules_user_id ON public.notification_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_schedules_next_notification ON public.notification_schedules(next_notification);
CREATE INDEX IF NOT EXISTS idx_notification_schedules_is_active ON public.notification_schedules(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_plant_tasks_template_id ON public.plant_tasks(template_id);
CREATE INDEX IF NOT EXISTS idx_plant_tasks_scheduled_date ON public.plant_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_plant_tasks_priority ON public.plant_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_plant_tasks_auto_generated ON public.plant_tasks(auto_generated) WHERE auto_generated = true;
CREATE INDEX IF NOT EXISTS idx_plant_tasks_parent_task_id ON public.plant_tasks(parent_task_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for schedule_templates
CREATE POLICY "Users can view public templates and their own templates" ON public.schedule_templates
    FOR SELECT USING (
        is_public = true OR 
        created_by = auth.uid()
    );

CREATE POLICY "Users can create their own templates" ON public.schedule_templates
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own templates" ON public.schedule_templates
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own templates" ON public.schedule_templates
    FOR DELETE USING (created_by = auth.uid());

-- Create RLS policies for calendar_events
CREATE POLICY "Users can view their own calendar events" ON public.calendar_events
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own calendar events" ON public.calendar_events
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own calendar events" ON public.calendar_events
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own calendar events" ON public.calendar_events
    FOR DELETE USING (user_id = auth.uid());

-- Create RLS policies for notification_schedules
CREATE POLICY "Users can view their own notification schedules" ON public.notification_schedules
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own notification schedules" ON public.notification_schedules
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notification schedules" ON public.notification_schedules
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notification schedules" ON public.notification_schedules
    FOR DELETE USING (user_id = auth.uid());

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_schedule_templates_updated_at 
    BEFORE UPDATE ON public.schedule_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at 
    BEFORE UPDATE ON public.calendar_events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_schedules_updated_at 
    BEFORE UPDATE ON public.notification_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.schedule_templates IS 'Templates for automated plant care scheduling';
COMMENT ON TABLE public.calendar_events IS 'Calendar events for plant care tasks and milestones';
COMMENT ON TABLE public.notification_schedules IS 'Automated notification schedules for plant care';

COMMENT ON COLUMN public.schedule_templates.template_data IS 'JSON array of template task definitions';
COMMENT ON COLUMN public.calendar_events.recurrence_rule IS 'RRULE format for recurring events';
COMMENT ON COLUMN public.notification_schedules.notification_settings IS 'JSON object with notification preferences';
COMMENT ON COLUMN public.plant_tasks.completion_data IS 'JSON object with task completion details';
COMMENT ON COLUMN public.plant_tasks.environmental_conditions IS 'JSON object with environmental data at task time';