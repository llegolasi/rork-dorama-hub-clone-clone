-- Fix total runtime calculation for user drama lists
-- This script updates existing records and creates a trigger to ensure proper runtime calculation

-- First, let's update existing records that have 0 total_runtime_minutes
-- We'll use a reasonable estimate based on total episodes
UPDATE user_drama_lists 
SET total_runtime_minutes = CASE 
  WHEN total_episodes IS NOT NULL AND total_episodes > 0 THEN total_episodes * 60
  ELSE 16 * 60  -- Default estimate for K-dramas (16 episodes * 60 minutes)
END
WHERE total_runtime_minutes = 0 OR total_runtime_minutes IS NULL;

-- Update current_episode to 0 for watchlist items that have NULL
UPDATE user_drama_lists 
SET current_episode = 0
WHERE list_type = 'watchlist' AND current_episode IS NULL;

-- Update current_episode to 0 for watching items that have NULL
UPDATE user_drama_lists 
SET current_episode = 0
WHERE list_type = 'watching' AND current_episode IS NULL;

-- Add watched_minutes column if it doesn't exist (calculated field)
ALTER TABLE user_drama_lists 
ADD COLUMN IF NOT EXISTS watched_minutes INTEGER DEFAULT 0;

-- Create a function to calculate watched minutes based on current episode
CREATE OR REPLACE FUNCTION calculate_watched_minutes()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate watched minutes based on current episode and average episode runtime
  IF NEW.current_episode IS NOT NULL AND NEW.total_episodes IS NOT NULL AND NEW.total_episodes > 0 THEN
    -- Calculate average runtime per episode
    DECLARE avg_episode_runtime INTEGER;
    BEGIN
      avg_episode_runtime := CASE 
        WHEN NEW.total_runtime_minutes > 0 THEN NEW.total_runtime_minutes / NEW.total_episodes
        ELSE 60  -- Default 60 minutes per episode for K-dramas
      END;
      
      -- Calculate watched minutes based on current episode
      NEW.watched_minutes := NEW.current_episode * avg_episode_runtime;
    END;
  ELSE
    NEW.watched_minutes := 0;
  END IF;
  
  -- Ensure current_episode is not null for watchlist and watching
  IF NEW.list_type IN ('watchlist', 'watching') AND NEW.current_episode IS NULL THEN
    NEW.current_episode := 0;
  END IF;
  
  -- Ensure total_runtime_minutes is calculated if missing
  IF NEW.total_runtime_minutes = 0 OR NEW.total_runtime_minutes IS NULL THEN
    NEW.total_runtime_minutes := CASE 
      WHEN NEW.total_episodes IS NOT NULL AND NEW.total_episodes > 0 THEN NEW.total_episodes * 60
      ELSE 16 * 60  -- Default estimate
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate watched_minutes on insert/update
DROP TRIGGER IF EXISTS trigger_calculate_watched_minutes ON user_drama_lists;
CREATE TRIGGER trigger_calculate_watched_minutes
  BEFORE INSERT OR UPDATE ON user_drama_lists
  FOR EACH ROW
  EXECUTE FUNCTION calculate_watched_minutes();

-- Update existing records to calculate watched_minutes
UPDATE user_drama_lists 
SET watched_minutes = CASE 
  WHEN current_episode IS NOT NULL AND total_episodes IS NOT NULL AND total_episodes > 0 THEN 
    current_episode * (total_runtime_minutes / total_episodes)
  ELSE 0
END
WHERE watched_minutes = 0 OR watched_minutes IS NULL;

-- Create or update the comprehensive stats function to include watched_minutes
CREATE OR REPLACE FUNCTION get_user_comprehensive_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  total_watch_time INTEGER := 0;
  completed_count INTEGER := 0;
  watching_count INTEGER := 0;
  watchlist_count INTEGER := 0;
BEGIN
  -- Count dramas in each list
  SELECT COUNT(*) INTO completed_count FROM user_drama_lists WHERE user_id = p_user_id AND list_type = 'completed';
  SELECT COUNT(*) INTO watching_count FROM user_drama_lists WHERE user_id = p_user_id AND list_type = 'watching';
  SELECT COUNT(*) INTO watchlist_count FROM user_drama_lists WHERE user_id = p_user_id AND list_type = 'watchlist';
  
  -- Calculate total watch time from completed dramas (full runtime) + watched episodes from watching dramas
  SELECT 
    COALESCE(SUM(CASE 
      WHEN list_type = 'completed' THEN total_runtime_minutes
      WHEN list_type = 'watching' THEN watched_minutes
      ELSE 0
    END), 0) INTO total_watch_time
  FROM user_drama_lists 
  WHERE user_id = p_user_id AND list_type IN ('completed', 'watching');
  
  -- Build result JSON
  result := json_build_object(
    'user_id', p_user_id,
    'total_watch_time_minutes', total_watch_time,
    'dramas_completed', completed_count,
    'dramas_watching', watching_count,
    'dramas_in_watchlist', watchlist_count,
    'average_drama_runtime', CASE WHEN completed_count > 0 THEN total_watch_time / completed_count ELSE 0 END,
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
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update user_stats table with correct data
CREATE OR REPLACE FUNCTION update_user_statistics(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  total_watch_time INTEGER := 0;
  completed_count INTEGER := 0;
  watching_count INTEGER := 0;
  watchlist_count INTEGER := 0;
BEGIN
  -- Count dramas in each list
  SELECT COUNT(*) INTO completed_count FROM user_drama_lists WHERE user_id = p_user_id AND list_type = 'completed';
  SELECT COUNT(*) INTO watching_count FROM user_drama_lists WHERE user_id = p_user_id AND list_type = 'watching';
  SELECT COUNT(*) INTO watchlist_count FROM user_drama_lists WHERE user_id = p_user_id AND list_type = 'watchlist';
  
  -- Calculate total watch time from completed dramas + watched episodes from watching dramas
  SELECT 
    COALESCE(SUM(CASE 
      WHEN list_type = 'completed' THEN total_runtime_minutes
      WHEN list_type = 'watching' THEN watched_minutes
      ELSE 0
    END), 0) INTO total_watch_time
  FROM user_drama_lists 
  WHERE user_id = p_user_id AND list_type IN ('completed', 'watching');
  
  -- Update or insert user stats
  INSERT INTO user_stats (
    user_id,
    total_watch_time_minutes,
    dramas_completed,
    dramas_watching,
    dramas_in_watchlist,
    updated_at
  ) VALUES (
    p_user_id,
    total_watch_time,
    completed_count,
    watching_count,
    watchlist_count,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_watch_time_minutes = EXCLUDED.total_watch_time_minutes,
    dramas_completed = EXCLUDED.dramas_completed,
    dramas_watching = EXCLUDED.dramas_watching,
    dramas_in_watchlist = EXCLUDED.dramas_in_watchlist,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update user stats when drama lists change
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
DROP TRIGGER IF EXISTS trigger_user_drama_lists_stats ON user_drama_lists;

-- Create trigger on user_drama_lists to automatically update user_stats
CREATE TRIGGER trigger_user_drama_lists_stats
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
END;
$$;