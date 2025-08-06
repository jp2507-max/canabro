-- User Achievements and Gamification System Migration
-- This migration creates tables for user achievements, statistics, and leaderboards

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    points_earned INTEGER NOT NULL DEFAULT 0,
    is_unlocked BOOLEAN NOT NULL DEFAULT false,
    progress_percentage REAL NOT NULL DEFAULT 0,
    unlocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_achievement UNIQUE (user_id, achievement_id),
    CONSTRAINT valid_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    CONSTRAINT valid_points CHECK (points_earned >= 0)
);

-- Create user_stats table
CREATE TABLE IF NOT EXISTS user_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    total_points INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    experience_points INTEGER NOT NULL DEFAULT 0,
    points_to_next_level INTEGER NOT NULL DEFAULT 1000,
    achievements_unlocked INTEGER NOT NULL DEFAULT 0,
    leaderboard_rank INTEGER NOT NULL DEFAULT 0,
    stats_breakdown JSONB NOT NULL DEFAULT '{
        "growing": {"plantsGrown": 0, "harvestsCompleted": 0, "strainsGrown": 0, "daysActive": 0},
        "community": {"postsCreated": 0, "commentsPosted": 0, "likesReceived": 0, "helpfulAnswers": 0},
        "social": {"followersCount": 0, "followingCount": 0, "groupsJoined": 0, "eventsAttended": 0},
        "knowledge": {"strainsReviewed": 0, "questionsAnswered": 0, "guidesShared": 0, "expertRating": 0}
    }',
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_level CHECK (level >= 1),
    CONSTRAINT valid_total_points CHECK (total_points >= 0),
    CONSTRAINT valid_experience_points CHECK (experience_points >= 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON user_achievements(is_unlocked, unlocked_at);
CREATE INDEX IF NOT EXISTS idx_user_achievements_category ON user_achievements USING GIN ((metadata->>'category'));

CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_total_points ON user_stats(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_level ON user_stats(level DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_leaderboard_rank ON user_stats(leaderboard_rank);
CREATE INDEX IF NOT EXISTS idx_user_stats_last_activity ON user_stats(last_activity DESC);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_achievements_updated_at 
    BEFORE UPDATE ON user_achievements 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at 
    BEFORE UPDATE ON user_stats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- User achievements policies
CREATE POLICY "Users can view their own achievements" ON user_achievements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public achievements" ON user_achievements
    FOR SELECT USING (true); -- Allow viewing others' achievements for leaderboards

CREATE POLICY "System can insert achievements" ON user_achievements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update achievements" ON user_achievements
    FOR UPDATE USING (auth.uid() = user_id);

-- User stats policies
CREATE POLICY "Users can view their own stats" ON user_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public stats" ON user_stats
    FOR SELECT USING (true); -- Allow viewing others' stats for leaderboards

CREATE POLICY "System can insert stats" ON user_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update stats" ON user_stats
    FOR UPDATE USING (auth.uid() = user_id);

-- Function to initialize user stats when a user is created
CREATE OR REPLACE FUNCTION initialize_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to initialize user stats on user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION initialize_user_stats();

-- Function to update leaderboard ranks
CREATE OR REPLACE FUNCTION update_leaderboard_ranks()
RETURNS void AS $$
BEGIN
    WITH ranked_users AS (
        SELECT 
            user_id,
            ROW_NUMBER() OVER (ORDER BY total_points DESC, level DESC, achievements_unlocked DESC) as new_rank
        FROM user_stats
    )
    UPDATE user_stats 
    SET leaderboard_rank = ranked_users.new_rank
    FROM ranked_users
    WHERE user_stats.user_id = ranked_users.user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to award achievement points and update stats
CREATE OR REPLACE FUNCTION award_achievement_points(
    p_user_id UUID,
    p_achievement_id TEXT,
    p_points INTEGER
)
RETURNS void AS $$
BEGIN
    -- Update user stats
    UPDATE user_stats 
    SET 
        total_points = total_points + p_points,
        experience_points = experience_points + p_points,
        achievements_unlocked = achievements_unlocked + 1,
        level = CASE 
            WHEN (experience_points + p_points) >= (level * 1000) THEN level + 1
            ELSE level
        END,
        points_to_next_level = CASE 
            WHEN (experience_points + p_points) >= (level * 1000) THEN ((level + 1) * 1000) - (experience_points + p_points)
            ELSE (level * 1000) - (experience_points + p_points)
        END
    WHERE user_id = p_user_id;
    
    -- Update leaderboard ranks
    PERFORM update_leaderboard_ranks();
END;
$$ LANGUAGE plpgsql;

-- Insert default achievements
INSERT INTO user_achievements (user_id, achievement_id, title, description, metadata, points_earned, is_unlocked, progress_percentage)
SELECT 
    auth.uid(),
    'first_plant',
    'Green Thumb',
    'Add your first plant to the garden',
    '{"category": "growing", "difficulty": "bronze", "points": 100, "iconName": "leaf-outline"}',
    0,
    false,
    0
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- Add more default achievements
INSERT INTO user_achievements (user_id, achievement_id, title, description, metadata, points_earned, is_unlocked, progress_percentage)
SELECT 
    u.id,
    achievement.achievement_id,
    achievement.title,
    achievement.description,
    achievement.metadata::jsonb,
    0,
    false,
    0
FROM auth.users u
CROSS JOIN (
    VALUES 
        ('first_plant', 'Green Thumb', 'Add your first plant to the garden', '{"category": "growing", "difficulty": "bronze", "points": 100, "iconName": "leaf-outline"}'),
        ('first_harvest', 'Harvest Master', 'Complete your first harvest', '{"category": "growing", "difficulty": "silver", "points": 250, "iconName": "flower-outline"}'),
        ('community_helper', 'Community Helper', 'Help 10 community members', '{"category": "community", "difficulty": "bronze", "points": 150, "iconName": "people-outline"}'),
        ('strain_expert', 'Strain Expert', 'Review 5 different strains', '{"category": "knowledge", "difficulty": "silver", "points": 300, "iconName": "library-outline"}'),
        ('social_butterfly', 'Social Butterfly', 'Follow 25 other growers', '{"category": "social", "difficulty": "bronze", "points": 100, "iconName": "heart-outline"}'),
        ('master_grower', 'Master Grower', 'Successfully grow 10 plants', '{"category": "growing", "difficulty": "gold", "points": 500, "iconName": "trophy-outline"}'),
        ('knowledge_seeker', 'Knowledge Seeker', 'Answer 50 community questions', '{"category": "knowledge", "difficulty": "gold", "points": 750, "iconName": "school-outline"}'),
        ('community_leader', 'Community Leader', 'Receive 100 helpful votes', '{"category": "community", "difficulty": "platinum", "points": 1000, "iconName": "star-outline"}')
) AS achievement(achievement_id, title, description, metadata)
ON CONFLICT (user_id, achievement_id) DO NOTHING;

COMMENT ON TABLE user_achievements IS 'Stores user achievements and gamification progress';
COMMENT ON TABLE user_stats IS 'Stores user statistics and leaderboard data';