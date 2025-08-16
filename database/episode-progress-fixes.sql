-- Episode Progress System - Enhanced Version
-- This file contains the database schema and functions for managing episode progress
-- with proper statistics tracking and runtime calculations

-- Add episode tracking fields to user_drama_lists if they don't exist
ALTER TABLE user_drama_lists 
ADD COLUMN IF NOT EXISTS watched_episodes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total_runtime_minutes INTEGER DEFAULT 0;

-- Create index for better performance on watched_episodes queries
CREATE INDEX IF NOT EXISTS idx_user_drama_lists_watched_episodes 
ON user_drama_lists USING GIN (watched_episodes);

-- Create index for better performance on user_id and list_type queries
CREATE INDEX IF NOT EXISTS idx_user_drama_lists_user_list_type 
ON user_drama_lists (user_id, list_type);

-- Update existing records to have proper default values
UPDATE user_drama_lists 
SET watched_episodes = '[]'::jsonb 
WHERE watched_episodes IS NULL;

UPDATE user_drama_lists 
SET total_runtime_minutes = 0 
WHERE total_runtime_minutes IS NULL;

-- Update completed dramas to have proper runtime calculations
UPDATE user_drama_lists 
SET total_runtime_minutes = COALESCE(total_episodes, 16) * 60
WHERE list_type = 'completed' AND (total_runtime_minutes = 0 OR total_runtime_minutes IS NULL);

-- Function to update user statistics when episode progress changes
CREATE OR REPLACE FUNCTION update_user_stats_on_episode_progress()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Determine which user_id to update
    IF TG_OP = 'DELETE' THEN
        target_user_id := OLD.user_id;
    ELSE
        target_user_id := NEW.user_id;
    END IF;
    
    -- Update user stats when drama list changes
    INSERT INTO user_stats (user_id, dramas_watching, dramas_completed, dramas_in_watchlist, total_watch_time_minutes, updated_at)
    VALUES (
        target_user_id,
        (SELECT COUNT(*) FROM user_drama_lists WHERE user_id = target_user_id AND list_type = 'watching'),
        (SELECT COUNT(*) FROM user_drama_lists WHERE user_id = target_user_id AND list_type = 'completed'),
        (SELECT COUNT(*) FROM user_drama_lists WHERE user_id = target_user_id AND list_type = 'watchlist'),
        (SELECT COALESCE(SUM(total_runtime_minutes), 0) FROM user_drama_lists WHERE user_id = target_user_id AND list_type = 'completed'),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        dramas_watching = (SELECT COUNT(*) FROM user_drama_lists WHERE user_id = target_user_id AND list_type = 'watching'),
        dramas_completed = (SELECT COUNT(*) FROM user_drama_lists WHERE user_id = target_user_id AND list_type = 'completed'),
        dramas_in_watchlist = (SELECT COUNT(*) FROM user_drama_lists WHERE user_id = target_user_id AND list_type = 'watchlist'),
        total_watch_time_minutes = (SELECT COALESCE(SUM(total_runtime_minutes), 0) FROM user_drama_lists WHERE user_id = target_user_id AND list_type = 'completed'),
        updated_at = NOW();
    
    -- Return appropriate record based on operation
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for episode progress updates
DROP TRIGGER IF EXISTS trigger_update_user_stats_on_episode_progress ON user_drama_lists;
CREATE TRIGGER trigger_update_user_stats_on_episode_progress
    AFTER INSERT OR UPDATE OR DELETE ON user_drama_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats_on_episode_progress();

-- Function to calculate total runtime for completed dramas
CREATE OR REPLACE FUNCTION calculate_drama_runtime(drama_id INTEGER, total_episodes INTEGER DEFAULT 16)
RETURNS INTEGER AS $$
BEGIN
    -- For now, estimate 60 minutes per episode for K-dramas
    -- This can be enhanced later with actual episode runtime data
    RETURN COALESCE(total_episodes, 16) * 60;
END;
$$ LANGUAGE plpgsql;

-- Function to get comprehensive user statistics
CREATE OR REPLACE FUNCTION get_user_comprehensive_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
    watching_count INTEGER;
    completed_count INTEGER;
    watchlist_count INTEGER;
    total_watch_time INTEGER;
    avg_runtime NUMERIC;
BEGIN
    -- Get counts and totals
    SELECT 
        COUNT(CASE WHEN list_type = 'watching' THEN 1 END),
        COUNT(CASE WHEN list_type = 'completed' THEN 1 END),
        COUNT(CASE WHEN list_type = 'watchlist' THEN 1 END),
        COALESCE(SUM(CASE WHEN list_type = 'completed' THEN total_runtime_minutes ELSE 0 END), 0)
    INTO watching_count, completed_count, watchlist_count, total_watch_time
    FROM user_drama_lists
    WHERE user_id = p_user_id;
    
    -- Calculate average runtime
    IF completed_count > 0 THEN
        avg_runtime := total_watch_time::NUMERIC / completed_count;
    ELSE
        avg_runtime := 0;
    END IF;
    
    -- Build result JSON
    SELECT json_build_object(
        'user_id', p_user_id,
        'total_watch_time_minutes', total_watch_time,
        'dramas_completed', completed_count,
        'dramas_watching', watching_count,
        'dramas_in_watchlist', watchlist_count,
        'average_drama_runtime', avg_runtime,
        'first_completion_date', (
            SELECT MIN(updated_at) 
            FROM user_drama_lists 
            WHERE user_id = p_user_id AND list_type = 'completed'
        ),
        'latest_completion_date', (
            SELECT MAX(updated_at) 
            FROM user_drama_lists 
            WHERE user_id = p_user_id AND list_type = 'completed'
        ),
        'monthly_watch_time', '{}',
        'favorite_genres', '{}',
        'yearly_watch_time', '{}',
        'favorite_actor_id', NULL,
        'favorite_actor_name', NULL,
        'favorite_actor_works_watched', 0,
        'created_at', NOW(),
        'updated_at', NOW()
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to update user statistics manually
CREATE OR REPLACE FUNCTION update_user_statistics(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    watching_count INTEGER;
    completed_count INTEGER;
    watchlist_count INTEGER;
    total_watch_time INTEGER;
BEGIN
    -- Get current counts and totals
    SELECT 
        COUNT(CASE WHEN list_type = 'watching' THEN 1 END),
        COUNT(CASE WHEN list_type = 'completed' THEN 1 END),
        COUNT(CASE WHEN list_type = 'watchlist' THEN 1 END),
        COALESCE(SUM(CASE WHEN list_type = 'completed' THEN total_runtime_minutes ELSE 0 END), 0)
    INTO watching_count, completed_count, watchlist_count, total_watch_time
    FROM user_drama_lists
    WHERE user_id = p_user_id;
    
    -- Insert or update user stats
    INSERT INTO user_stats (user_id, dramas_watching, dramas_completed, dramas_in_watchlist, total_watch_time_minutes, updated_at)
    VALUES (p_user_id, watching_count, completed_count, watchlist_count, total_watch_time, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        dramas_watching = watching_count,
        dramas_completed = completed_count,
        dramas_in_watchlist = watchlist_count,
        total_watch_time_minutes = total_watch_time,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to handle drama completion with proper statistics update
CREATE OR REPLACE FUNCTION complete_drama_with_stats(
    p_user_id UUID,
    p_drama_id INTEGER,
    p_drama_name TEXT,
    p_total_runtime_minutes INTEGER,
    p_episodes_watched INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Update the drama list entry to completed
    UPDATE user_drama_lists 
    SET 
        list_type = 'completed',
        total_runtime_minutes = p_total_runtime_minutes,
        current_episode = COALESCE(total_episodes, p_episodes_watched, 16),
        updated_at = NOW()
    WHERE user_id = p_user_id AND drama_id = p_drama_id;
    
    -- Insert or update completion record
    INSERT INTO drama_completions (
        user_id, 
        drama_id, 
        drama_name, 
        total_runtime_minutes, 
        episodes_watched,
        completed_at
    )
    VALUES (
        p_user_id, 
        p_drama_id, 
        p_drama_name, 
        p_total_runtime_minutes, 
        COALESCE(p_episodes_watched, 16),
        NOW()
    )
    ON CONFLICT (user_id, drama_id) DO UPDATE SET
        total_runtime_minutes = p_total_runtime_minutes,
        episodes_watched = COALESCE(p_episodes_watched, 16),
        completed_at = NOW();
    
    -- Update user statistics
    PERFORM update_user_statistics(p_user_id);
END;
$$ LANGUAGE plpgsql;

-- Function to remove drama from completed list and update stats
CREATE OR REPLACE FUNCTION remove_completed_drama(
    p_user_id UUID,
    p_drama_id INTEGER
)
RETURNS VOID AS $$
BEGIN
    -- Remove from drama_completions
    DELETE FROM drama_completions 
    WHERE user_id = p_user_id AND drama_id = p_drama_id;
    
    -- Remove from user_drama_lists
    DELETE FROM user_drama_lists 
    WHERE user_id = p_user_id AND drama_id = p_drama_id AND list_type = 'completed';
    
    -- Update user statistics
    PERFORM update_user_statistics(p_user_id);
END;
$$ LANGUAGE plpgsql;

-- Refresh all user statistics (run this once to fix existing data)
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT DISTINCT user_id FROM user_drama_lists LOOP
        PERFORM update_user_statistics(user_record.user_id);
    END LOOP;
END
$$;

-- Add comments for documentation
COMMENT ON FUNCTION update_user_stats_on_episode_progress() IS 'Trigger function to automatically update user statistics when drama lists change';
COMMENT ON FUNCTION get_user_comprehensive_stats(UUID) IS 'Returns comprehensive user statistics including watch time and drama counts';
COMMENT ON FUNCTION update_user_statistics(UUID) IS 'Manually updates user statistics for a specific user';
COMMENT ON FUNCTION complete_drama_with_stats(UUID, INTEGER, TEXT, INTEGER, INTEGER) IS 'Completes a drama and updates all related statistics';
COMMENT ON FUNCTION remove_completed_drama(UUID, INTEGER) IS 'Removes a drama from completed list and updates statistics';

-- Verify the setup
SELECT 'Episode Progress System setup completed successfully!' as status;