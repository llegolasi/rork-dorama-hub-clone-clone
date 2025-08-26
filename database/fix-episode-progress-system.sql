-- Fix Episode Progress System
-- This script ensures all user_drama_lists records have proper episode tracking fields

-- First, let's ensure all required columns exist with proper defaults
ALTER TABLE user_drama_lists 
ADD COLUMN IF NOT EXISTS current_episode INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS episodes_watched INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS watched_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS watched_episodes JSONB DEFAULT '[]'::jsonb;

-- Update existing records to have proper default values
UPDATE user_drama_lists 
SET 
  current_episode = COALESCE(current_episode, 0),
  episodes_watched = COALESCE(episodes_watched, 0),
  watched_minutes = COALESCE(watched_minutes, 0),
  watched_episodes = COALESCE(watched_episodes, '[]'::jsonb)
WHERE current_episode IS NULL 
   OR episodes_watched IS NULL 
   OR watched_minutes IS NULL 
   OR watched_episodes IS NULL;

-- For watchlist items, ensure current_episode is 0
UPDATE user_drama_lists 
SET 
  current_episode = 0,
  episodes_watched = 0,
  watched_minutes = 0,
  watched_episodes = '[]'::jsonb
WHERE list_type = 'watchlist';

-- For watching items, ensure current_episode is at least 0
UPDATE user_drama_lists 
SET current_episode = 0
WHERE list_type = 'watching' AND current_episode IS NULL;

-- For completed items, ensure current_episode equals total_episodes and watched_minutes equals total_runtime_minutes
UPDATE user_drama_lists 
SET 
  current_episode = COALESCE(total_episodes, 16),
  episodes_watched = COALESCE(total_episodes, 16),
  watched_minutes = COALESCE(total_runtime_minutes, (COALESCE(total_episodes, 16) * 60))
WHERE list_type = 'completed';

-- Create or replace function to update user statistics
CREATE OR REPLACE FUNCTION update_user_statistics(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Update user_stats table with current data from user_drama_lists
  INSERT INTO user_stats (
    user_id,
    total_watch_time_minutes,
    dramas_completed,
    dramas_watching,
    dramas_in_watchlist,
    updated_at
  )
  SELECT 
    p_user_id,
    -- Calculate total watch time from both completed and watching dramas
    COALESCE(SUM(
      CASE 
        WHEN list_type = 'completed' THEN COALESCE(total_runtime_minutes, 0)
        WHEN list_type = 'watching' THEN COALESCE(watched_minutes, 0)
        ELSE 0
      END
    ), 0) as total_watch_time,
    COUNT(CASE WHEN list_type = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN list_type = 'watching' THEN 1 END) as watching_count,
    COUNT(CASE WHEN list_type = 'watchlist' THEN 1 END) as watchlist_count,
    NOW()
  FROM user_drama_lists 
  WHERE user_id = p_user_id
  ON CONFLICT (user_id) 
  DO UPDATE SET
    total_watch_time_minutes = EXCLUDED.total_watch_time_minutes,
    dramas_completed = EXCLUDED.dramas_completed,
    dramas_watching = EXCLUDED.dramas_watching,
    dramas_in_watchlist = EXCLUDED.dramas_in_watchlist,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Create or replace function to get comprehensive user stats
CREATE OR REPLACE FUNCTION get_user_comprehensive_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- First ensure stats are up to date
  PERFORM update_user_statistics(p_user_id);
  
  -- Return comprehensive stats
  SELECT json_build_object(
    'user_id', p_user_id,
    'total_watch_time_minutes', COALESCE(us.total_watch_time_minutes, 0),
    'dramas_completed', COALESCE(us.dramas_completed, 0),
    'dramas_watching', COALESCE(us.dramas_watching, 0),
    'dramas_in_watchlist', COALESCE(us.dramas_in_watchlist, 0),
    'average_drama_runtime', 
      CASE 
        WHEN COALESCE(us.dramas_completed, 0) > 0 
        THEN COALESCE(us.total_watch_time_minutes, 0)::float / us.dramas_completed
        ELSE 0
      END,
    'first_completion_date', NULL,
    'latest_completion_date', NULL,
    'monthly_watch_time', COALESCE(us.monthly_watch_time, '{}'::jsonb),
    'favorite_genres', COALESCE(us.favorite_genres, '{}'::jsonb),
    'yearly_watch_time', COALESCE(us.yearly_watch_time, '{}'::jsonb),
    'favorite_actor_id', us.favorite_actor_id,
    'favorite_actor_name', us.favorite_actor_name,
    'favorite_actor_works_watched', COALESCE(us.favorite_actor_works_watched, 0),
    'created_at', COALESCE(us.created_at, NOW()),
    'updated_at', COALESCE(us.updated_at, NOW())
  ) INTO result
  FROM user_stats us
  WHERE us.user_id = p_user_id;
  
  -- If no stats found, return default values
  IF result IS NULL THEN
    result := json_build_object(
      'user_id', p_user_id,
      'total_watch_time_minutes', 0,
      'dramas_completed', 0,
      'dramas_watching', 0,
      'dramas_in_watchlist', 0,
      'average_drama_runtime', 0,
      'first_completion_date', NULL,
      'latest_completion_date', NULL,
      'monthly_watch_time', '{}',
      'favorite_genres', '{}',
      'yearly_watch_time', '{}',
      'favorite_actor_id', NULL,
      'favorite_actor_name', NULL,
      'favorite_actor_works_watched', 0,
      'created_at', NOW(),
      'updated_at', NOW()
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update user stats when user_drama_lists changes
CREATE OR REPLACE FUNCTION trigger_update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stats for the affected user
  IF TG_OP = 'DELETE' THEN
    PERFORM update_user_statistics(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM update_user_statistics(NEW.user_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS user_drama_lists_stats_trigger ON user_drama_lists;

-- Create the trigger
CREATE TRIGGER user_drama_lists_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_drama_lists
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_user_stats();

-- Update all existing user stats
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT DISTINCT user_id FROM user_drama_lists LOOP
    PERFORM update_user_statistics(user_record.user_id);
  END LOOP;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_drama_lists_user_list_type ON user_drama_lists(user_id, list_type);
CREATE INDEX IF NOT EXISTS idx_user_drama_lists_drama_id ON user_drama_lists(drama_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);

COMMIT;