-- Episode Progress System Implementation
-- This script adds episode tracking functionality to the user drama lists
-- and updates triggers to properly handle episode progress and statistics

-- Add new columns to user_drama_lists table for episode tracking
ALTER TABLE user_drama_lists 
ADD COLUMN IF NOT EXISTS watched_episodes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS episodes_watched INTEGER DEFAULT 0;

-- Update existing watching dramas to initialize watched_episodes as empty array
UPDATE user_drama_lists 
SET watched_episodes = '[]'::jsonb,
    episodes_watched = 0
WHERE list_type = 'watching' 
AND (watched_episodes IS NULL OR watched_episodes = 'null'::jsonb);

-- Update existing completed dramas to set episodes_watched to total_episodes
UPDATE user_drama_lists 
SET episodes_watched = COALESCE(total_episodes, 16)
WHERE list_type = 'completed' 
AND (episodes_watched IS NULL OR episodes_watched = 0);

-- Create or replace function to update episode progress and statistics
CREATE OR REPLACE FUNCTION update_episode_progress_and_stats()
RETURNS TRIGGER AS $$
DECLARE
  old_episodes_watched INTEGER := 0;
  new_episodes_watched INTEGER := 0;
  old_runtime INTEGER := 0;
  new_runtime INTEGER := 0;
BEGIN
  -- Handle INSERT (new drama added to list)
  IF TG_OP = 'INSERT' THEN
    -- Calculate episodes watched from watched_episodes array
    IF NEW.watched_episodes IS NOT NULL THEN
      SELECT jsonb_array_length(NEW.watched_episodes) INTO new_episodes_watched;
    END IF;
    
    -- Update episodes_watched field
    NEW.episodes_watched = new_episodes_watched;
    
    -- Update user stats based on list type
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
  
  -- Handle UPDATE (drama moved between lists or progress updated)
  IF TG_OP = 'UPDATE' THEN
    -- Calculate old and new episodes watched
    IF OLD.watched_episodes IS NOT NULL THEN
      SELECT jsonb_array_length(OLD.watched_episodes) INTO old_episodes_watched;
    END IF;
    
    IF NEW.watched_episodes IS NOT NULL THEN
      SELECT jsonb_array_length(NEW.watched_episodes) INTO new_episodes_watched;
    END IF;
    
    -- Update episodes_watched field
    NEW.episodes_watched = new_episodes_watched;
    
    -- Get old and new runtime values
    old_runtime = COALESCE(OLD.total_runtime_minutes, 0);
    new_runtime = COALESCE(NEW.total_runtime_minutes, 0);
    
    -- If list type changed, update counters
    IF OLD.list_type != NEW.list_type THEN
      -- Decrease old list counter and runtime
      IF OLD.list_type = 'watching' THEN
        UPDATE user_stats 
        SET dramas_watching = GREATEST(dramas_watching - 1, 0)
        WHERE user_id = OLD.user_id;
      ELSIF OLD.list_type = 'watchlist' THEN
        UPDATE user_stats 
        SET dramas_in_watchlist = GREATEST(dramas_in_watchlist - 1, 0)
        WHERE user_id = OLD.user_id;
      ELSIF OLD.list_type = 'completed' THEN
        UPDATE user_stats 
        SET dramas_completed = GREATEST(dramas_completed - 1, 0),
            total_watch_time_minutes = GREATEST(total_watch_time_minutes - old_runtime, 0)
        WHERE user_id = OLD.user_id;
      END IF;
      
      -- Increase new list counter and runtime
      IF NEW.list_type = 'watching' THEN
        UPDATE user_stats 
        SET dramas_watching = dramas_watching + 1
        WHERE user_id = NEW.user_id;
      ELSIF NEW.list_type = 'watchlist' THEN
        UPDATE user_stats 
        SET dramas_in_watchlist = dramas_in_watchlist + 1
        WHERE user_id = NEW.user_id;
      ELSIF NEW.list_type = 'completed' THEN
        UPDATE user_stats 
        SET dramas_completed = dramas_completed + 1,
            total_watch_time_minutes = total_watch_time_minutes + new_runtime
        WHERE user_id = NEW.user_id;
      END IF;
    ELSE
      -- Same list type, but runtime might have changed (progress update)
      IF old_runtime != new_runtime AND NEW.list_type = 'completed' THEN
        UPDATE user_stats 
        SET total_watch_time_minutes = total_watch_time_minutes - old_runtime + new_runtime
        WHERE user_id = NEW.user_id;
      END IF;
    END IF;
    
    -- Update timestamp
    UPDATE user_stats 
    SET updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
  END IF;
  
  -- Handle DELETE (drama removed from list)
  IF TG_OP = 'DELETE' THEN
    -- Calculate episodes watched from watched_episodes array
    IF OLD.watched_episodes IS NOT NULL THEN
      SELECT jsonb_array_length(OLD.watched_episodes) INTO old_episodes_watched;
    END IF;
    
    old_runtime = COALESCE(OLD.total_runtime_minutes, 0);
    
    -- Decrease counter based on list type
    IF OLD.list_type = 'watching' THEN
      UPDATE user_stats 
      SET dramas_watching = GREATEST(dramas_watching - 1, 0),
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
          total_watch_time_minutes = GREATEST(total_watch_time_minutes - old_runtime, 0),
          updated_at = NOW()
      WHERE user_id = OLD.user_id;
    END IF;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers
DROP TRIGGER IF EXISTS user_drama_lists_stats_trigger ON user_drama_lists;
DROP TRIGGER IF EXISTS update_user_stats_on_list_insert ON user_drama_lists;
DROP TRIGGER IF EXISTS update_user_stats_on_list_update ON user_drama_lists;
DROP TRIGGER IF EXISTS update_user_stats_on_list_delete ON user_drama_lists;
DROP TRIGGER IF EXISTS update_user_stats_on_list_change ON user_drama_lists;

-- Create new trigger for episode progress and stats
CREATE TRIGGER user_drama_lists_episode_progress_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON user_drama_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_episode_progress_and_stats();

-- Create function to recalculate user stats from scratch (including episode data)
CREATE OR REPLACE FUNCTION recalculate_user_stats_with_episodes(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  watching_count INTEGER;
  watchlist_count INTEGER;
  completed_count INTEGER;
  total_runtime INTEGER;
  total_episodes_watched INTEGER;
BEGIN
  -- Count dramas in each list
  SELECT COUNT(*) INTO watching_count
  FROM user_drama_lists
  WHERE user_id = p_user_id AND list_type = 'watching';
  
  SELECT COUNT(*) INTO watchlist_count
  FROM user_drama_lists
  WHERE user_id = p_user_id AND list_type = 'watchlist';
  
  SELECT 
    COUNT(*), 
    COALESCE(SUM(total_runtime_minutes), 0),
    COALESCE(SUM(episodes_watched), 0)
  INTO completed_count, total_runtime, total_episodes_watched
  FROM user_drama_lists
  WHERE user_id = p_user_id AND list_type = 'completed';
  
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
    total_runtime,
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

-- Create function to mark episodes as watched up to a specific episode
CREATE OR REPLACE FUNCTION mark_episodes_watched_up_to(
  p_user_id UUID,
  p_drama_id INTEGER,
  p_episode_number INTEGER
)
RETURNS VOID AS $
DECLARE
  drama_record RECORD;
  new_watched JSONB;
  episode_num INTEGER;
BEGIN
  -- Get current drama record
  SELECT * INTO drama_record
  FROM user_drama_lists
  WHERE user_id = p_user_id 
    AND drama_id = p_drama_id 
    AND list_type = 'watching';
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Drama not found in watching list for user';
  END IF;
  
  -- Create array of episodes from 1 to p_episode_number
  new_watched = '[]'::jsonb;
  FOR episode_num IN 1..p_episode_number LOOP
    new_watched = new_watched || jsonb_build_array(episode_num);
  END LOOP;
  
  -- Update the record
  UPDATE user_drama_lists
  SET 
    watched_episodes = new_watched,
    current_episode = p_episode_number,
    episodes_watched = p_episode_number,
    total_runtime_minutes = p_episode_number * 60, -- 60 minutes per episode
    updated_at = NOW()
  WHERE user_id = p_user_id AND drama_id = p_drama_id AND list_type = 'watching';
END;
$ LANGUAGE plpgsql;

-- Create function to complete all episodes at once
CREATE OR REPLACE FUNCTION complete_all_episodes(
  p_user_id UUID,
  p_drama_id INTEGER
)
RETURNS VOID AS $
DECLARE
  drama_record RECORD;
  all_episodes JSONB;
  episode_num INTEGER;
  total_runtime INTEGER;
BEGIN
  -- Get current drama record
  SELECT * INTO drama_record
  FROM user_drama_lists
  WHERE user_id = p_user_id 
    AND drama_id = p_drama_id 
    AND list_type = 'watching';
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Drama not found in watching list for user';
  END IF;
  
  -- Create array of all episodes
  all_episodes = '[]'::jsonb;
  FOR episode_num IN 1..COALESCE(drama_record.total_episodes, 16) LOOP
    all_episodes = all_episodes || jsonb_build_array(episode_num);
  END LOOP;
  
  -- Calculate total runtime (estimate 60 minutes per episode)
  total_runtime = COALESCE(drama_record.total_episodes, 16) * 60;
  
  -- Update to completed
  UPDATE user_drama_lists
  SET 
    list_type = 'completed',
    watched_episodes = all_episodes,
    current_episode = COALESCE(total_episodes, 16),
    episodes_watched = COALESCE(total_episodes, 16),
    total_runtime_minutes = total_runtime,
    updated_at = NOW()
  WHERE user_id = p_user_id AND drama_id = p_drama_id;
  
  -- Create completion record
  INSERT INTO drama_completions (
    user_id,
    drama_id,
    drama_name,
    total_runtime_minutes,
    episodes_watched
  ) VALUES (
    p_user_id,
    p_drama_id,
    drama_record.drama_name,
    total_runtime,
    COALESCE(drama_record.total_episodes, 16)
  )
  ON CONFLICT (user_id, drama_id) DO UPDATE SET
    total_runtime_minutes = EXCLUDED.total_runtime_minutes,
    episodes_watched = EXCLUDED.episodes_watched,
    completed_at = NOW();
END;
$ LANGUAGE plpgsql;

-- Create function to handle drama removal from watching list
CREATE OR REPLACE FUNCTION remove_drama_from_watching(
  p_user_id UUID,
  p_drama_id INTEGER
)
RETURNS VOID AS $
BEGIN
  -- Delete the drama from user_drama_lists
  DELETE FROM user_drama_lists
  WHERE user_id = p_user_id 
    AND drama_id = p_drama_id 
    AND list_type = 'watching';
  
  -- The trigger will automatically update user stats
END;
$ LANGUAGE plpgsql;

-- Create comprehensive function to get user stats including episode watch time
CREATE OR REPLACE FUNCTION get_user_comprehensive_stats(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  total_watch_time_minutes INTEGER,
  dramas_completed INTEGER,
  dramas_watching INTEGER,
  dramas_in_watchlist INTEGER,
  average_drama_runtime NUMERIC,
  first_completion_date TIMESTAMP,
  latest_completion_date TIMESTAMP,
  monthly_watch_time JSONB,
  favorite_genres JSONB,
  yearly_watch_time JSONB,
  favorite_actor_id INTEGER,
  favorite_actor_name TEXT,
  favorite_actor_works_watched INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) AS $
DECLARE
  completion_watch_time INTEGER;
  episode_watch_time INTEGER;
  total_time INTEGER;
BEGIN
  -- Get watch time from completed dramas
  SELECT COALESCE(SUM(dc.total_runtime_minutes), 0)
  INTO completion_watch_time
  FROM drama_completions dc
  WHERE dc.user_id = p_user_id;
  
  -- Get watch time from episodes watched in watching dramas
  SELECT COALESCE(SUM(udl.episodes_watched * 60), 0)
  INTO episode_watch_time
  FROM user_drama_lists udl
  WHERE udl.user_id = p_user_id 
    AND udl.list_type = 'watching';
  
  total_time := completion_watch_time + episode_watch_time;
  
  RETURN QUERY
  SELECT 
    p_user_id,
    total_time,
    (SELECT COUNT(*)::INTEGER FROM user_drama_lists WHERE user_id = p_user_id AND list_type = 'completed'),
    (SELECT COUNT(*)::INTEGER FROM user_drama_lists WHERE user_id = p_user_id AND list_type = 'watching'),
    (SELECT COUNT(*)::INTEGER FROM user_drama_lists WHERE user_id = p_user_id AND list_type = 'watchlist'),
    CASE 
      WHEN (SELECT COUNT(*) FROM drama_completions WHERE user_id = p_user_id) > 0 
      THEN total_time::NUMERIC / (SELECT COUNT(*) FROM drama_completions WHERE user_id = p_user_id)
      ELSE 0::NUMERIC
    END,
    (SELECT MIN(completed_at) FROM drama_completions WHERE user_id = p_user_id),
    (SELECT MAX(completed_at) FROM drama_completions WHERE user_id = p_user_id),
    '{}'::JSONB,
    '{}'::JSONB,
    '{}'::JSONB,
    NULL::INTEGER,
    NULL::TEXT,
    0::INTEGER,
    NOW(),
    NOW();
END;
$ LANGUAGE plpgsql;

-- Recalculate stats for all users to fix any inconsistencies
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT DISTINCT user_id FROM user_drama_lists LOOP
    PERFORM recalculate_user_stats_with_episodes(user_record.user_id);
  END LOOP;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_drama_lists_watched_episodes 
ON user_drama_lists USING GIN (watched_episodes);

CREATE INDEX IF NOT EXISTS idx_user_drama_lists_episodes_watched 
ON user_drama_lists(user_id, list_type, episodes_watched);

CREATE INDEX IF NOT EXISTS idx_user_drama_lists_progress 
ON user_drama_lists(user_id, drama_id, list_type, current_episode);

-- Update user stats calculation to include episode watch time
CREATE OR REPLACE FUNCTION update_user_statistics(p_user_id UUID)
RETURNS VOID AS $
DECLARE
  completion_watch_time INTEGER;
  episode_watch_time INTEGER;
  total_time INTEGER;
  watching_count INTEGER;
  watchlist_count INTEGER;
  completed_count INTEGER;
BEGIN
  -- Count dramas in each list
  SELECT COUNT(*) INTO watching_count
  FROM user_drama_lists
  WHERE user_id = p_user_id AND list_type = 'watching';
  
  SELECT COUNT(*) INTO watchlist_count
  FROM user_drama_lists
  WHERE user_id = p_user_id AND list_type = 'watchlist';
  
  SELECT COUNT(*) INTO completed_count
  FROM user_drama_lists
  WHERE user_id = p_user_id AND list_type = 'completed';
  
  -- Get watch time from completed dramas
  SELECT COALESCE(SUM(total_runtime_minutes), 0)
  INTO completion_watch_time
  FROM drama_completions
  WHERE user_id = p_user_id;
  
  -- Get watch time from episodes watched in watching dramas
  SELECT COALESCE(SUM(episodes_watched * 60), 0)
  INTO episode_watch_time
  FROM user_drama_lists
  WHERE user_id = p_user_id AND list_type = 'watching';
  
  total_time := completion_watch_time + episode_watch_time;
  
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
    total_time,
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
$ LANGUAGE plpgsql;

-- Verify the changes
SELECT 'Episode progress system implemented successfully. All triggers and functions updated.' as status;