-- Advanced Community Features Migration
-- This migration adds tables and functionality for real-time messaging, 
-- notifications, social features, and live events

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Drop existing tables to ensure a clean slate
-- DO $$
-- DECLARE
--     dependency_record RECORD;
--     table_name TEXT;
--     has_dependencies BOOLEAN := FALSE;
-- BEGIN
--     FOR table_name IN
--         SELECT unnest(ARRAY['community_polls', 'event_participants', 'live_events', 'group_members', 'social_groups', 'follow_relationships', 'user_presence', 'messages', 'conversation_threads', 'live_notifications'])
--     LOOP
--         FOR dependency_record IN 
--             SELECT pg_describe_object(classid, objid, objsubid) AS dependency
--             FROM pg_depend
--             WHERE refobjid = ('public.' || table_name)::regclass
--               AND deptype = 'n' -- Normal dependency
--               AND objid <> refobjid
--         LOOP
--             RAISE WARNING 'Dependency found for table %: %', table_name, dependency_record.dependency;
--             has_dependencies := TRUE;
--         END LOOP;
--     END LOOP;
-- 
--     IF has_dependencies THEN
--         RAISE EXCEPTION 'Cannot drop tables due to existing dependencies. Please resolve them first.';
--     END IF;
-- END;
-- $$;

-- DROP TABLE IF EXISTS community_polls, event_participants, live_events, group_members, social_groups, follow_relationships, user_presence, messages, conversation_threads, live_notifications;

-- Create live_notifications table
CREATE TABLE IF NOT EXISTS live_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'post_like', 'post_comment', 'comment_reply', 'mention',
        'new_follower', 'follow_post', 'group_invite', 'event_reminder',
        'message_received', 'plant_milestone', 'expert_response'
    )),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_actionable BOOLEAN NOT NULL DEFAULT FALSE,
    actions JSONB DEFAULT NULL,
    expires_at TIMESTAMPTZ DEFAULT NULL,
    last_message_id UUID DEFAULT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    last_synced_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create conversation_threads table
CREATE TABLE IF NOT EXISTS conversation_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_type TEXT NOT NULL CHECK (thread_type IN ('direct', 'group')),
    participants JSONB NOT NULL DEFAULT '[]',
    last_message_id UUID DEFAULT NULL,
    unread_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT DEFAULT NULL,
    description TEXT DEFAULT NULL,
    avatar_url TEXT DEFAULT NULL,
    settings JSONB DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    last_synced_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'plant_share', 'location')),
    attachments JSONB DEFAULT NULL,
    reply_to UUID DEFAULT NULL REFERENCES messages(id) ON DELETE SET NULL,
    reactions JSONB DEFAULT NULL,
    is_edited BOOLEAN NOT NULL DEFAULT FALSE,
    delivered_at TIMESTAMPTZ DEFAULT NULL,
    read_at TIMESTAMPTZ DEFAULT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    last_synced_at TIMESTAMPTZ DEFAULT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key constraint for live_notifications.last_message_id
ALTER TABLE live_notifications 
ADD CONSTRAINT fk_live_notifications_last_message 
FOREIGN KEY (last_message_id) REFERENCES messages(id) ON DELETE SET NULL;

-- Create user_presence table
CREATE TABLE IF NOT EXISTS user_presence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    presence_data JSONB DEFAULT NULL,
    connection_id TEXT DEFAULT NULL,
    heartbeat_interval INTEGER DEFAULT 30,
    last_heartbeat TIMESTAMPTZ DEFAULT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    last_synced_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create follow_relationships table
CREATE TABLE IF NOT EXISTS follow_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_settings JSONB NOT NULL DEFAULT '{
        "newPosts": true,
        "plantUpdates": true,
        "achievements": true,
        "liveEvents": true,
        "directMessages": true
    }',
    relationship_type TEXT NOT NULL DEFAULT 'follow' CHECK (relationship_type IN ('follow', 'mutual', 'blocked')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    last_synced_at TIMESTAMPTZ DEFAULT NULL,
    followed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- Create social_groups table
CREATE TABLE IF NOT EXISTS social_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'strain_specific', 'growing_method', 'experience_level', 'location_based',
        'problem_solving', 'equipment', 'nutrients', 'harvest_techniques'
    )),
    tags JSONB NOT NULL DEFAULT '[]',
    avatar TEXT DEFAULT NULL,
    cover_image TEXT DEFAULT NULL,
    settings JSONB NOT NULL DEFAULT '{
        "isPublic": true,
        "allowInvites": true,
        "requireApproval": false,
        "maxMembers": 1000,
        "allowFileSharing": true,
        "moderationLevel": "medium"
    }',
    stats JSONB NOT NULL DEFAULT '{
        "memberCount": 0,
        "postCount": 0,
        "activeMembers": 0,
        "engagementRate": 0,
        "growthRate": 0
    }',
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    last_synced_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES social_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
    permissions JSONB NOT NULL DEFAULT '{
        "canPost": true,
        "canComment": true,
        "canInvite": false,
        "canModerate": false,
        "canManageMembers": false,
        "canEditGroup": false
    }',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    last_synced_at TIMESTAMPTZ DEFAULT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Create live_events table
CREATE TABLE IF NOT EXISTS live_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'q_and_a', 'grow_along', 'strain_review', 'technique_demo',
        'harvest_party', 'problem_solving', 'expert_session'
    )),
    host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    co_hosts JSONB DEFAULT NULL,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    actual_start TIMESTAMPTZ DEFAULT NULL,
    actual_end TIMESTAMPTZ DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled', 'recorded')),
    settings JSONB NOT NULL DEFAULT '{
        "requiresApproval": false,
        "allowQuestions": true,
        "allowScreenSharing": false,
        "recordEvent": false,
        "isPublic": true,
        "tags": []
    }',
    recording JSONB DEFAULT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    last_synced_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create event_participants table
CREATE TABLE IF NOT EXISTS event_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES live_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('host', 'co_host', 'speaker', 'participant')),
    permissions JSONB NOT NULL DEFAULT '{
        "canSpeak": false,
        "canShareScreen": false,
        "canModerate": false,
        "canInviteOthers": false,
        "canRecord": false
    }',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    joined_at TIMESTAMPTZ DEFAULT NULL,
    left_at TIMESTAMPTZ DEFAULT NULL,
    duration_minutes INTEGER DEFAULT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    last_synced_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Create community_polls table
CREATE TABLE IF NOT EXISTS community_polls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL,
    description TEXT DEFAULT NULL,
    options JSONB NOT NULL DEFAULT '[]',
    settings JSONB NOT NULL DEFAULT '{
        "allowMultipleChoices": false,
        "requiresAuthentication": true,
        "showResultsBeforeVoting": false,
        "allowAddOptions": false,
        "isAnonymous": false
    }',
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ends_at TIMESTAMPTZ DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),
    results JSONB NOT NULL DEFAULT '{
        "totalVotes": 0,
        "participantCount": 0,
        "demographics": {
            "experienceLevels": {},
            "growingMethods": {},
            "locations": {}
        },
        "trends": []
    }',
    is_deleted BOOLEAN DEFAULT FALSE,
    last_synced_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_live_notifications_user_id ON live_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_live_notifications_type ON live_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_live_notifications_created_at ON live_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_notifications_is_read ON live_notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_threads_participants ON conversation_threads USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_created_by ON conversation_threads(created_by);

CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen DESC);

CREATE INDEX IF NOT EXISTS idx_follow_relationships_follower ON follow_relationships(follower_id);
CREATE INDEX IF NOT EXISTS idx_follow_relationships_following ON follow_relationships(following_id);
CREATE INDEX IF NOT EXISTS idx_follow_relationships_type ON follow_relationships(relationship_type);

CREATE INDEX IF NOT EXISTS idx_social_groups_category ON social_groups(category);
CREATE INDEX IF NOT EXISTS idx_social_groups_created_by ON social_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_social_groups_tags ON social_groups USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members(role);

CREATE INDEX IF NOT EXISTS idx_live_events_host_id ON live_events(host_id);
CREATE INDEX IF NOT EXISTS idx_live_events_event_type ON live_events(event_type);

CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_role ON event_participants(role);

CREATE INDEX IF NOT EXISTS idx_community_polls_created_by ON community_polls(created_by);
CREATE INDEX IF NOT EXISTS idx_community_polls_ends_at ON community_polls(ends_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_events_scheduled_start ON live_events(scheduled_start DESC);
CREATE INDEX IF NOT EXISTS idx_live_events_scheduled_end ON live_events(scheduled_end DESC);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_live_notifications_updated_at BEFORE UPDATE ON live_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversation_threads_updated_at BEFORE UPDATE ON conversation_threads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_presence_updated_at BEFORE UPDATE ON user_presence FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_follow_relationships_updated_at BEFORE UPDATE ON follow_relationships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_social_groups_updated_at BEFORE UPDATE ON social_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_group_members_updated_at BEFORE UPDATE ON group_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_live_events_updated_at BEFORE UPDATE ON live_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_participants_updated_at BEFORE UPDATE ON event_participants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_community_polls_updated_at BEFORE UPDATE ON community_polls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE live_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_polls ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Live notifications policies
CREATE POLICY "Users can view their own notifications" ON live_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON live_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Authorized users can insert notifications" ON live_notifications
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', '') IN ('service_role', 'admin')
);

-- Conversation threads policies
CREATE POLICY "Users can view threads they participate in" ON conversation_threads FOR SELECT USING (
    participants @> to_jsonb(auth.uid()::text)
);
CREATE POLICY "Users can update threads they created" ON conversation_threads FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can create threads" ON conversation_threads FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Messages policies
CREATE POLICY "Users can view messages in their threads" ON messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM conversation_threads 
        WHERE id = thread_id 
        AND participants @> to_jsonb(auth.uid()::text)
    )
);
CREATE POLICY "Users can send messages to their threads" ON messages FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM conversation_threads 
        WHERE id = thread_id 
        AND participants @> to_jsonb(auth.uid()::text)
    )
);
CREATE POLICY "Users can update their own messages" ON messages FOR UPDATE USING (auth.uid() = sender_id);

-- User presence policies
CREATE POLICY "Users can view all presence data" ON user_presence FOR SELECT USING (true);
CREATE POLICY "Users can update their own presence" ON user_presence FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own presence" ON user_presence FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Follow relationships policies
CREATE POLICY "Users can view their follow relationships" ON follow_relationships FOR SELECT USING (
    auth.uid() = follower_id OR auth.uid() = following_id
);
CREATE POLICY "Users can create follow relationships" ON follow_relationships FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can update their follow relationships" ON follow_relationships FOR UPDATE USING (auth.uid() = follower_id);

-- Social groups policies
CREATE POLICY "Users can view public groups" ON social_groups FOR SELECT USING (
    (settings->>'isPublic')::boolean = true OR 
    EXISTS (SELECT 1 FROM group_members WHERE group_id = id AND user_id = auth.uid())
);
CREATE POLICY "Users can create groups" ON social_groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Group creators and admins can update groups" ON social_groups FOR UPDATE USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM group_members WHERE group_id = id AND user_id = auth.uid() AND role = 'admin')
);

-- Group members policies
CREATE POLICY "Users can view group members" ON group_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM social_groups WHERE id = group_id AND (
        (settings->>'isPublic')::boolean = true OR 
        EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid())
    ))
);
CREATE POLICY "Users can join groups" ON group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own membership" ON group_members FOR UPDATE USING (auth.uid() = user_id);

-- Live events policies
CREATE POLICY "Users can view public events" ON live_events FOR SELECT USING (
    (settings->>'isPublic')::boolean = true OR 
    auth.uid() = host_id OR
    EXISTS (SELECT 1 FROM event_participants WHERE event_id = id AND user_id = auth.uid())
);
CREATE POLICY "Users can create events" ON live_events FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Event hosts can update events" ON live_events FOR UPDATE USING (auth.uid() = host_id);

-- Event participants policies
CREATE POLICY "Users can view event participants" ON event_participants FOR SELECT USING (
    EXISTS (SELECT 1 FROM live_events WHERE id = event_id AND (
        (settings->>'isPublic')::boolean = true OR 
        auth.uid() = host_id OR
        EXISTS (SELECT 1 FROM event_participants ep WHERE ep.event_id = event_id AND ep.user_id = auth.uid())
    ))
);
CREATE POLICY "Users can join events" ON event_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own participation" ON event_participants FOR UPDATE USING (auth.uid() = user_id);

-- Community polls policies
CREATE POLICY "Users can view polls" ON community_polls FOR SELECT USING (true);
CREATE POLICY "Users can create polls" ON community_polls FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Poll creators can update polls" ON community_polls FOR UPDATE USING (auth.uid() = created_by);
