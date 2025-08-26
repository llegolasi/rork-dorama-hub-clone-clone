-- Fix for user drama lists fields and statistics
-- This script ensures proper handling of total_runtime_minutes and current_episode fields

-- First, let's make sure the columns exist with proper defaults
ALTER TABLE user_drama_lists 
ADD COLUMN IF NOT EXISTS total_runtime_minutes INTEGER DEFAULT 0;

ALTER TABLE user_drama_lists 
ADD COLUMN IF NOT EXISTS current_episode INTEGER DEFAULT 0;

ALTER TABLE user_drama_lists 
ADD COLUMN IF NOT EXISTS watched_episodes JSONB DEFAULT '[]';

ALTER TABLE user_drama_lists 
ADD COLUMN IF NOT EXISTS episodes_watched INTEGER DEFAULT 0;

ALTER TABLE user_drama_lists 
ADD COLUMN IF NOT EXISTS watched_minutes INTEGER DEFAULT 0;

-- Update existing records to have proper default values
UPDATE user_drama_lists 
SET current_episode = 0 
WHERE current_episode IS NULL;

UPDATE user_drama_lists 
SET total_runtime_minutes = COALESCE(total_episodes * 60, 16 * 60)
WHERE total_runtime_minutes IS NULL OR total_runtime_minutes = 0;

UPDATE user_drama_lists 
SET watched_episodes = '[]'
WHERE watched_episodes IS NULL;

UPDATE user_drama_lists 
SET episodes_watched = 0
WHERE episodes_watched IS NULL;

UPDATE user_drama_lists 
SET watched_minutes = 0
WHERE watched_minutes IS NULL;

-- Create or replace function to calculate episode runtime
CREATE OR REPLACE FUNCTION calculate_episode_runtime(p_total_runtime INTEGER, p_total_episodes INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- If we have both values, calculate per episode
  IF p_total_runtime > 0 AND p_total_episodes > 0 THEN
    RETURN p_total_runtime / p_total_episodes;
  END IF;
  
  -- Default to 60 minutes per episode for K-dramas
  RETURN 60;
END;
$$ LANGUAGE plpgsql;

-- Create or replace function to update watched minutes based on episodes
CREATE OR REPLACE FUNCTION update_watched_minutes()
RETURNS TRIGGER AS $$
DECLARE
  episode_runtime INTEGER;
  watched_eps_array JSONB;
  episodes_count INTEGER;
BEGIN
  -- Calculate runtime per episode
  episode_runtime := calculate_episode_runtime(NEW.total_runtime_minutes, NEW.total_episodes);
  
  -- Parse watched episodes
  watched_eps_array := COALESCE(NEW.watched_episodes, '[]'::jsonb);
  episodes_count := jsonb_array_length(watched_eps_array);
  
  -- Update watched minutes based on episodes watched
  NEW.watched_minutes := episodes_count * episode_runtime;
  NEW.episodes_watched := episodes_count;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update watched minutes
DROP TRIGGER IF EXISTS update_watched_minutes_trigger ON user_drama_lists;
CREATE TRIGGER update_watched_minutes_trigger
  BEFORE INSERT OR UPDATE ON user_drama_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_watched_minutes();

-- Create or replace function to update user statistics with episode progress
CREATE OR REPLACE FUNCTION update_user_stats_comprehensive()
RETURNS TRIGGER AS $$
DECLARE
  watching_count INTEGER;
  watchlist_count INTEGER;
  completed_count INTEGER;
  total_watch_time INTEGER;
  episode_watch_time INTEGER;
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    -- Update counters
    IF NEW.list_type = 'watching' THEN
      UPDATE user_stats 
      SET dramas_watching = dramas_watching + 1,
          updated_at = NOW()
      WHERE user_id = NEW.user_id;
    ELSIF NEW.list_type = 'watchlist' THEN
      UPDATE user_stats 
      SET dramas_in_watchlist = dramas_in_watchlist + 1,
          updated_at = NOW()
      WHERE user_id = NEW.user_id;
    ELSIF NEW.list_type = 'completed' THEN
      UPDATE user_stats 
      SET dramas_completed = dramas_completed + 1,
          total_watch_time_minutes = total_watch_time_minutes + COALESCE(NEW.total_runtime_minutes, 0),
          updated_at = NOW()
      WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- If list type changed
    IF OLD.list_type != NEW.list_type THEN
      -- Decrease old list counter and watch time
      IF OLD.list_type = 'watching' THEN
        UPDATE user_stats 
        SET dramas_watching = GREATEST(dramas_watching - 1, 0),
            total_watch_time_minutes = GREATEST(total_watch_time_minutes - COALESCE(OLD.watched_minutes, 0), 0)
        WHERE user_id = OLD.user_id;
      ELSIF OLD.list_type = 'watchlist' THEN
        UPDATE user_stats 
        SET dramas_in_watchlist = GREATEST(dramas_in_watchlist - 1, 0)
        WHERE user_id = OLD.user_id;
      ELSIF OLD.list_type = 'completed' THEN
        UPDATE user_stats 
        SET dramas_completed = GREATEST(dramas_completed - 1, 0),
            total_watch_time_minutes = GREATEST(total_watch_time_minutes - COALESCE(OLD.total_runtime_minutes, 0), 0)
        WHERE user_id = OLD.user_id;
      END IF;
      
      -- Increase new list counter and watch time
      IF NEW.list_type = 'watching' THEN
        UPDATE user_stats 
        SET dramas_watching = dramas_watching + 1,
            total_watch_time_minutes = total_watch_time_minutes + COALESCE(NEW.watched_minutes, 0)
        WHERE user_id = NEW.user_id;
      ELSIF NEW.list_type = 'watchlist' THEN
        UPDATE user_stats 
        SET dramas_in_watchlist = dramas_in_watchlist + 1
        WHERE user_id = NEW.user_id;
      ELSIF NEW.list_type = 'completed' THEN
        UPDATE user_stats 
        SET dramas_completed = dramas_completed + 1,
            total_watch_time_minutes = total_watch_time_minutes + COALESCE(NEW.total_runtime_minutes, 0)
        WHERE user_id = NEW.user_id;
      END IF;
    ELSE
      -- Same list type, but episode progress might have changed
      IF OLD.watched_minutes != NEW.watched_minutes THEN
        UPDATE user_stats 
        SET total_watch_time_minutes = total_watch_time_minutes - COALESCE(OLD.watched_minutes, 0) + COALESCE(NEW.watched_minutes, 0),
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
      END IF;
    END IF;
    
    -- Always update timestamp
    UPDATE user_stats 
    SET updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    -- Decrease counter and watch time based on list type
    IF OLD.list_type = 'watching' THEN
      UPDATE user_stats 
      SET dramas_watching = GREATEST(dramas_watching - 1, 0),
          total_watch_time_minutes = GREATEST(total_watch_time_minutes - COALESCE(OLD.watched_minutes, 0), 0),
          updated_at = NOW()
      WHERE user_id = OLD.user_id;
    ELSIF OLD.list_type = 'watchlist' THEN
      UPDATE user_stats 
      SET dramas_in_watchlist = GREATEST(dramas_in_watchlist - 1, 0),
          updated_at = NOW()
      WHERE user_id = OLD.user_id;
    ELSIF OLD.list_type = 'completed' THEN
      UPDATE user_stats 
      SET dramas_completed = GREATEST(dramas_completed - 1, 0),
          total_watch_time_minutes = GREATEST(total_watch_time_minutes - COALESCE(OLD.total_runtime_minutes, 0), 0),
          updated_at = NOW()
      WHERE user_id = OLD.user_id;
    END IF;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop old triggers and create new comprehensive one
DROP TRIGGER IF EXISTS user_drama_lists_stats_trigger ON user_drama_lists;
DROP TRIGGER IF EXISTS update_user_stats_on_list_change ON user_drama_lists;

CREATE TRIGGER user_drama_lists_comprehensive_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_drama_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_comprehensive();

-- Create function to recalculate all user stats from scratch
CREATE OR REPLACE FUNCTION recalculate_all_user_stats(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  watching_count INTEGER;
  watchlist_count INTEGER;
  completed_count INTEGER;
  total_runtime INTEGER;
  episode_watch_time INTEGER;
  total_watch_time INTEGER;
BEGIN
  -- Count dramas in each list
  SELECT COUNT(*) INTO watching_count
  FROM user_drama_lists
  WHERE user_id = p_user_id AND list_type = 'watching';
  
  SELECT COUNT(*) INTO watchlist_count
  FROM user_drama_lists
  WHERE user_id = p_user_id AND list_type = 'watchlist';
  
  SELECT COUNT(*), COALESCE(SUM(total_runtime_minutes), 0) 
  INTO completed_count, total_runtime
  FROM user_drama_lists
  WHERE user_id = p_user_id AND list_type = 'completed';
  
  -- Calculate watch time from episodes watched in watching dramas
  SELECT COALESCE(SUM(watched_minutes), 0) INTO episode_watch_time
  FROM user_drama_lists
  WHERE user_id = p_user_id AND list_type = 'watching';
  
  -- Total watch time is completed dramas + episode progress
  total_watch_time := total_runtime + episode_watch_time;
  
  -- Update or insert user stats
  INSERT INTO user_stats (
    user_id,
    dramas_watching,
    dramas_in_watchlist,
    dramas_completed,
    total_watch_time_minutes,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    watching_count,
    watchlist_count,
    completed_count,
    total_watch_time,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    dramas_watching = EXCLUDED.dramas_watching,
    dramas_in_watchlist = EXCLUDED.dramas_in_watchlist,
    dramas_completed = EXCLUDED.dramas_completed,
    total_watch_time_minutes = EXCLUDED.total_watch_time_minutes,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create comprehensive stats function for tRPC
CREATE OR REPLACE FUNCTION get_user_comprehensive_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  watching_count INTEGER;
  watchlist_count INTEGER;
  completed_count INTEGER;
  total_watch_time INTEGER;
  episode_watch_time INTEGER;
  completion_watch_time INTEGER;
BEGIN
  -- Get current counts
  SELECT COUNT(*) INTO watching_count
  FROM user_drama_lists
  WHERE user_id = p_user_id AND list_type = 'watching';
  
  SELECT COUNT(*) INTO watchlist_count
  FROM user_drama_lists
  WHERE user_id = p_user_id AND list_type = 'watchlist';
  
  SELECT COUNT(*) INTO completed_count
  FROM user_drama_lists
  WHERE user_id = p_user_id AND list_type = 'completed';
  
  -- Calculate watch times
  SELECT COALESCE(SUM(watched_minutes), 0) INTO episode_watch_time
  FROM user_drama_lists
  WHERE user_id = p_user_id AND list_type = 'watching';
  
  SELECT COALESCE(SUM(total_runtime_minutes), 0) INTO completion_watch_time
  FROM user_drama_lists
  WHERE user_id = p_user_id AND list_type = 'completed';
  
  total_watch_time := episode_watch_time + completion_watch_time;
  
  -- Build result JSON
  result := json_build_object(
    'user_id', p_user_id,
    'total_watch_time_minutes', total_watch_time,
    'dramas_completed', completed_count,
    'dramas_watching', watching_count,
    'dramas_in_watchlist', watchlist_count,
    'average_drama_runtime', CASE WHEN completed_count > 0 THEN completion_watch_time / completed_count ELSE 0 END,
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

-- Recalculate stats for all users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT DISTINCT user_id FROM user_drama_lists LOOP
    PERFORM recalculate_all_user_stats(user_record.user_id);
  END LOOP;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_drama_lists_user_list_type 
ON user_drama_lists(user_id, list_type);

CREATE INDEX IF NOT EXISTS idx_user_drama_lists_watched_minutes 
ON user_drama_lists(user_id, watched_minutes);

CREATE INDEX IF NOT EXISTS idx_user_drama_lists_runtime 
ON user_drama_lists(user_id, total_runtime_minutes);

-- Verify the changes
SELECT 'User drama lists fields and statistics fix applied successfully.' as status;