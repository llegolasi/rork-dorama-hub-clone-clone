-- Fix basic issues with user_drama_lists table
-- This script addresses the core problems:
-- 1. total_runtime_minutes being 0 when adding dramas to lists
-- 2. watched_minutes not being updated when marking as completed
-- 3. current_episode not being updated when watching episodes

-- First, let's ensure the columns exist and have proper defaults
ALTER TABLE user_drama_lists 
ALTER COLUMN current_episode SET DEFAULT 0;

ALTER TABLE user_drama_lists 
ALTER COLUMN episodes_watched SET DEFAULT 0;

ALTER TABLE user_drama_lists 
ALTER COLUMN watched_minutes SET DEFAULT 0;

ALTER TABLE user_drama_lists 
ALTER COLUMN total_runtime_minutes SET DEFAULT 0;

-- Update existing records where current_episode is null to 0 for watchlist
UPDATE user_drama_lists 
SET current_episode = 0 
WHERE current_episode IS NULL AND list_type = 'watchlist';

-- Update existing records where current_episode is null to 0 for watching (if they haven't started)
UPDATE user_drama_lists 
SET current_episode = 0 
WHERE current_episode IS NULL AND list_type = 'watching';

-- For completed dramas, set current_episode to total_episodes if it's null
UPDATE user_drama_lists 
SET current_episode = COALESCE(total_episodes, 16)
WHERE current_episode IS NULL AND list_type = 'completed';

-- For completed dramas, set watched_minutes to total_runtime_minutes if watched_minutes is 0
UPDATE user_drama_lists 
SET watched_minutes = COALESCE(total_runtime_minutes, total_episodes * 60, 16 * 60)
WHERE list_type = 'completed' AND (watched_minutes = 0 OR watched_minutes IS NULL);

-- For completed dramas, set episodes_watched to total_episodes if it's 0
UPDATE user_drama_lists 
SET episodes_watched = COALESCE(total_episodes, 16)
WHERE list_type = 'completed' AND (episodes_watched = 0 OR episodes_watched IS NULL);

-- Create a function to calculate runtime based on episodes (fallback)
CREATE OR REPLACE FUNCTION calculate_fallback_runtime(episodes INTEGER)
RETURNS INTEGER AS $$
BEGIN
    -- Estimate 60 minutes per episode for K-dramas
    RETURN COALESCE(episodes, 16) * 60;
END;
$$ LANGUAGE plpgsql;

-- Update records where total_runtime_minutes is 0 or null with a fallback calculation
UPDATE user_drama_lists 
SET total_runtime_minutes = calculate_fallback_runtime(total_episodes)
WHERE (total_runtime_minutes = 0 OR total_runtime_minutes IS NULL);

-- Create a trigger function to ensure data consistency on insert/update
CREATE OR REPLACE FUNCTION ensure_drama_list_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure current_episode has proper defaults
    IF NEW.list_type = 'watchlist' THEN
        NEW.current_episode = 0;
        NEW.episodes_watched = 0;
        NEW.watched_minutes = 0;
    ELSIF NEW.list_type = 'watching' THEN
        -- Keep existing progress or start at 0
        NEW.current_episode = COALESCE(NEW.current_episode, 0);
        NEW.episodes_watched = COALESCE(NEW.episodes_watched, NEW.current_episode, 0);
        -- Calculate watched_minutes based on progress
        IF NEW.total_runtime_minutes > 0 AND NEW.total_episodes > 0 THEN
            NEW.watched_minutes = ROUND((NEW.current_episode::FLOAT / NEW.total_episodes) * NEW.total_runtime_minutes);
        ELSE
            NEW.watched_minutes = COALESCE(NEW.watched_minutes, 0);
        END IF;
    ELSIF NEW.list_type = 'completed' THEN
        -- For completed dramas, set to full values
        NEW.current_episode = COALESCE(NEW.total_episodes, 16);
        NEW.episodes_watched = COALESCE(NEW.total_episodes, 16);
        NEW.watched_minutes = COALESCE(NEW.total_runtime_minutes, NEW.total_episodes * 60, 16 * 60);
    END IF;
    
    -- Ensure total_runtime_minutes has a fallback value
    IF NEW.total_runtime_minutes = 0 OR NEW.total_runtime_minutes IS NULL THEN
        NEW.total_runtime_minutes = calculate_fallback_runtime(NEW.total_episodes);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS ensure_drama_list_consistency_trigger ON user_drama_lists;

-- Create the trigger
CREATE TRIGGER ensure_drama_list_consistency_trigger
    BEFORE INSERT OR UPDATE ON user_drama_lists
    FOR EACH ROW
    EXECUTE FUNCTION ensure_drama_list_consistency();

-- Update user_stats to reflect the corrected data
-- This will be handled by the existing triggers, but we can force an update
CREATE OR REPLACE FUNCTION refresh_all_user_stats()
RETURNS void AS $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT DISTINCT user_id FROM user_drama_lists LOOP
        -- Update user stats for each user
        INSERT INTO user_stats (
            user_id,
            total_watch_time_minutes,
            dramas_completed,
            dramas_watching,
            dramas_in_watchlist,
            updated_at
        )
        SELECT 
            user_record.user_id,
            COALESCE(SUM(
                CASE 
                    WHEN list_type = 'completed' THEN total_runtime_minutes
                    WHEN list_type = 'watching' THEN watched_minutes
                    ELSE 0
                END
            ), 0) as total_watch_time,
            COUNT(CASE WHEN list_type = 'completed' THEN 1 END) as completed_count,
            COUNT(CASE WHEN list_type = 'watching' THEN 1 END) as watching_count,
            COUNT(CASE WHEN list_type = 'watchlist' THEN 1 END) as watchlist_count,
            NOW()
        FROM user_drama_lists 
        WHERE user_id = user_record.user_id
        ON CONFLICT (user_id) DO UPDATE SET
            total_watch_time_minutes = EXCLUDED.total_watch_time_minutes,
            dramas_completed = EXCLUDED.dramas_completed,
            dramas_watching = EXCLUDED.dramas_watching,
            dramas_in_watchlist = EXCLUDED.dramas_in_watchlist,
            updated_at = EXCLUDED.updated_at;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the stats refresh
SELECT refresh_all_user_stats();

-- Clean up the temporary function
DROP FUNCTION refresh_all_user_stats();

COMMIT;