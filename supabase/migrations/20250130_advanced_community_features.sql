-- Advanced Community Features Migration
-- This migration creates all the necessary tables and RLS policies for real-time community features

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create conversation_threads table for direct messaging and group conversations
CREATE TABLE IF NOT EXISTS conversation_threads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    thread_type TEXT NOT NULL CHECK (thread_type IN ('direct', 'group')),
    participants JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_message_id UUID,
    unread_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT, -- For group conversations
    description TEXT, -- For group conversations
    avatar_url TEXT, -- For group conversations
    settings JSONB DEFAULT '{}'::jsonb, -- Group settings
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table for chat messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    thread_id UUID REFERENCES conversation_threads(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'plant_share', 'location')),
    attachments JSONB DEFAULT '[]'::jsonb,
    reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
    reactions JSONB DEFAULT '[]'::jsonb,
    is_edited BOOLEAN DEFAULT false,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create live_notifications table for real-time community alerts
CREATE TABLE IF NOT EXISTS live_notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT false,
    is_actionable BOOLEAN DEFAULT false,
    actions JSONB DEFAULT '[]'::jsonb,
    expires_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_presence table for online status tracking
CREATE TABLE IF NOT EXISTS user_presence (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    is_online BOOLEAN DEFAULT false,
    presence_data JSONB DEFAULT '{}'::jsonb,
    connection_id TEXT,
    heartbeat_interval INTEGER DEFAULT 30,
    last_heartbeat TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create follow_relationships table for user following
CREATE TABLE IF NOT EXISTS follow_relationships (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_settings JSONB NOT NULL DEFAULT '{"newPosts": true, "plantUpdates": true, "achievements": true, "liveEvents": true, "directMessages": true}'::jsonb,
    relationship_type TEXT NOT NULL DEFAULT 'follow' CHECK (relationship_type IN ('follow', 'mutual', 'blocked')),
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMPTZ,
    followed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- Create social_groups table for interest-based communities
CREATE TABLE IF NOT EXISTS social_groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    tags JSONB DEFAULT '[]'::jsonb,
    avatar TEXT,
    cover_image TEXT,
    settings JSONB NOT NULL DEFAULT '{"isPublic": true, "allowInvites": true, "requireApproval": false, "maxMembers": 1000, "allowFileSharing": true, "moderationLevel": "medium"}'::jsonb,
    stats JSONB NOT NULL DEFAULT '{"memberCount": 0, "postCount": 0, "activeMembers": 0, "engagementRate": 0, "growthRate": 0}'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create group_members table for social group membership
CREATE TABLE IF NOT EXISTS group_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    group_id UUID REFERENCES social_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
    permissions JSONB NOT NULL DEFAULT '{"canPost": true, "canComment": true, "canInvite": false, "canModerate": false, "canManageMembers": false, "canEditGroup": false}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Create live_events table for community events
CREATE TABLE IF NOT EXISTS live_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    event_type TEXT NOT NULL,
    host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    co_hosts JSONB DEFAULT '[]'::jsonb,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled', 'recorded')),
    settings JSONB NOT NULL DEFAULT '{"requiresApproval": false, "allowQuestions": true, "allowScreenSharing": false, "recordEvent": false, "isPublic": true, "tags": []}'::jsonb,
    recording JSONB,
    is_deleted BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create event_participants table for live event participation
CREATE TABLE IF NOT EXISTS event_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES live_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('host', 'co_host', 'speaker', 'participant')),
    permissions JSONB NOT NULL DEFAULT '{"canSpeak": false, "canShareScreen": false, "canModerate": false, "canInviteOthers": false, "canRecord": false}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    is_deleted BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Create community_polls table for live polling
CREATE TABLE IF NOT EXISTS community_polls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    question TEXT NOT NULL,
    description TEXT,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    settings JSONB NOT NULL DEFAULT '{"allowMultipleChoices": false, "requiresAuthentication": true, "showResultsBeforeVoting": false, "allowAddOptions": false, "isAnonymous": false}'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ends_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),
    results JSONB NOT NULL DEFAULT '{"totalVotes": 0, "participantCount": 0, "demographics": {"experienceLevels": {}, "growingMethods": {}, "locations": {}}, "trends": []}'::jsonb,
    is_deleted BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversation_threads_participants ON conversation_threads USING GIN (participants);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_created_by ON conversation_threads (created_by);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_updated_at ON conversation_threads (updated_at);

CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages (thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages (sent_at);
CREATE INDEX IF NOT EXISTS idx_messages_thread_sent ON messages (thread_id, sent_at);

CREATE INDEX IF NOT EXISTS idx_live_notifications_user_id ON live_notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_live_notifications_created_at ON live_notifications (created_at);
CREATE INDEX IF NOT EXISTS idx_live_notifications_priority ON live_notifications (priority);
CREATE INDEX IF NOT EXISTS idx_live_notifications_user_unread ON live_notifications (user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence (user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence (status);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence (last_seen);

CREATE INDEX IF NOT EXISTS idx_follow_relationships_follower ON follow_relationships (follower_id);
CREATE INDEX IF NOT EXISTS idx_follow_relationships_following ON follow_relationships (following_id);
CREATE INDEX IF NOT EXISTS idx_follow_relationships_active ON follow_relationships (is_active);

CREATE INDEX IF NOT EXISTS idx_social_groups_category ON social_groups (category);
CREATE INDEX IF NOT EXISTS idx_social_groups_created_by ON social_groups (created_by);
CREATE INDEX IF NOT EXISTS idx_social_groups_tags ON social_groups USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members (role);

CREATE INDEX IF NOT EXISTS idx_live_events_host_id ON live_events (host_id);
CREATE INDEX IF NOT EXISTS idx_live_events_status ON live_events (status);
CREATE INDEX IF NOT EXISTS idx_live_events_scheduled_start ON live_events (scheduled_start);

CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants (event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants (user_id);

CREATE INDEX IF NOT EXISTS idx_community_polls_created_by ON community_polls (created_by);
CREATE INDEX IF NOT EXISTS idx_community_polls_status ON community_polls (status);
CREATE INDEX IF NOT EXISTS idx_community_polls_ends_at ON community_polls (ends_at);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_polls ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversation_threads
CREATE POLICY "Users can view conversations they participate in" ON conversation_threads
    FOR SELECT USING (
        auth.uid()::text = ANY(SELECT jsonb_array_elements_text(participants))
    );

CREATE POLICY "Users can create conversations" ON conversation_threads
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Participants can update conversations" ON conversation_threads
    FOR UPDATE USING (
        auth.uid()::text = ANY(SELECT jsonb_array_elements_text(participants))
    );

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_threads ct 
            WHERE ct.id = messages.thread_id 
            AND auth.uid()::text = ANY(SELECT jsonb_array_elements_text(ct.participants))
        )
    );

CREATE POLICY "Users can send messages to their conversations" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM conversation_threads ct 
            WHERE ct.id = messages.thread_id 
            AND auth.uid()::text = ANY(SELECT jsonb_array_elements_text(ct.participants))
        )
    );

CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (auth.uid() = sender_id);

-- RLS Policies for live_notifications
CREATE POLICY "Users can view their own notifications" ON live_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON live_notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_presence
CREATE POLICY "Users can view all presence data" ON user_presence
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own presence" ON user_presence
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for follow_relationships
CREATE POLICY "Users can view their follow relationships" ON follow_relationships
    FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can create follow relationships" ON follow_relationships
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can update their own follow relationships" ON follow_relationships
    FOR UPDATE USING (auth.uid() = follower_id);

-- RLS Policies for social_groups
CREATE POLICY "Users can view public groups" ON social_groups
    FOR SELECT USING (
        (settings->>'isPublic')::boolean = true OR
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM group_members gm 
            WHERE gm.group_id = social_groups.id 
            AND gm.user_id = auth.uid() 
            AND gm.is_active = true
        )
    );

CREATE POLICY "Users can create groups" ON social_groups
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators and admins can update groups" ON social_groups
    FOR UPDATE USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM group_members gm 
            WHERE gm.group_id = social_groups.id 
            AND gm.user_id = auth.uid() 
            AND gm.role = 'admin'
            AND gm.is_active = true
        )
    );

-- RLS Policies for group_members
CREATE POLICY "Users can view group members" ON group_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM social_groups sg 
            WHERE sg.id = group_members.group_id 
            AND (
                (sg.settings->>'isPublic')::boolean = true OR
                auth.uid() = sg.created_by OR
                EXISTS (
                    SELECT 1 FROM group_members gm2 
                    WHERE gm2.group_id = sg.id 
                    AND gm2.user_id = auth.uid() 
                    AND gm2.is_active = true
                )
            )
        )
    );

CREATE POLICY "Users can join groups" ON group_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own membership" ON group_members
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM group_members gm 
            WHERE gm.group_id = group_members.group_id 
            AND gm.user_id = auth.uid() 
            AND gm.role IN ('admin', 'moderator')
            AND gm.is_active = true
        )
    );

-- RLS Policies for live_events
CREATE POLICY "Users can view public events" ON live_events
    FOR SELECT USING (
        (settings->>'isPublic')::boolean = true OR
        auth.uid() = host_id OR
        auth.uid()::text = ANY(SELECT jsonb_array_elements_text(co_hosts)) OR
        EXISTS (
            SELECT 1 FROM event_participants ep 
            WHERE ep.event_id = live_events.id 
            AND ep.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create events" ON live_events
    FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts and co-hosts can update events" ON live_events
    FOR UPDATE USING (
        auth.uid() = host_id OR
        auth.uid()::text = ANY(SELECT jsonb_array_elements_text(co_hosts))
    );

-- RLS Policies for event_participants
CREATE POLICY "Users can view event participants" ON event_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM live_events le 
            WHERE le.id = event_participants.event_id 
            AND (
                (le.settings->>'isPublic')::boolean = true OR
                auth.uid() = le.host_id OR
                auth.uid()::text = ANY(SELECT jsonb_array_elements_text(le.co_hosts)) OR
                auth.uid() = event_participants.user_id
            )
        )
    );

CREATE POLICY "Users can join events" ON event_participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" ON event_participants
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM live_events le 
            WHERE le.id = event_participants.event_id 
            AND (
                auth.uid() = le.host_id OR
                auth.uid()::text = ANY(SELECT jsonb_array_elements_text(le.co_hosts))
            )
        )
    );

-- RLS Policies for community_polls
CREATE POLICY "Users can view polls" ON community_polls
    FOR SELECT USING (true);

CREATE POLICY "Users can create polls" ON community_polls
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Poll creators can update polls" ON community_polls
    FOR UPDATE USING (auth.uid() = created_by);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE live_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE follow_relationships;
ALTER PUBLICATION supabase_realtime ADD TABLE social_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE live_events;
ALTER PUBLICATION supabase_realtime ADD TABLE event_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE community_polls;

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_conversation_threads_updated_at BEFORE UPDATE ON conversation_threads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_live_notifications_updated_at BEFORE UPDATE ON live_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_presence_updated_at BEFORE UPDATE ON user_presence FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_follow_relationships_updated_at BEFORE UPDATE ON follow_relationships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_social_groups_updated_at BEFORE UPDATE ON social_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_group_members_updated_at BEFORE UPDATE ON group_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_live_events_updated_at BEFORE UPDATE ON live_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_participants_updated_at BEFORE UPDATE ON event_participants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_community_polls_updated_at BEFORE UPDATE ON community_polls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();