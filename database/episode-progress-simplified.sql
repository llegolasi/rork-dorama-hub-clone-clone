-- Simplified Episode Progress System
-- Uses only user_drama_lists table with episode tracking and watched time calculation

-- Add new columns to user_drama_lists for episode tracking
ALTER TABLE user_drama_lists 
ADD COLUMN IF NOT EXISTS current_episode INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_episodes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_runtime_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS watched_minutes INTEGER DEFAULT 0;

-- Update existing records with drama data
UPDATE user_drama_lists 
SET 
  total_episodes = COALESCE(
    (SELECT episodes FROM dramas WHERE dramas.id = user_drama_lists.drama_id), 
    16
  ),
  total_runtime_minutes = COALESCE(
    (SELECT runtime FROM dramas WHERE dramas.id = user_drama_lists.drama_id), 
    16 * 60
  )
WHERE total_episodes = 0 OR total_runtime_minutes = 0;

-- Set current_episode based on list_type for existing records
UPDATE user_drama_lists 
SET 
  current_episode = CASE 
    WHEN list_type = 'watchlist' THEN 0
    WHEN list_type = 'watching' THEN COALESCE(current_episode, 1)
    WHEN list_type = 'completed' THEN total_episodes
  END,
  watched_minutes = CASE 
    WHEN list_type = 'completed' THEN total_runtime_minutes
    WHEN list_type = 'watching' THEN 
      CASE 
        WHEN current_episode > 0 THEN 
          (total_runtime_minutes * current_episode / NULLIF(total_episodes, 0))
        ELSE 0
      END
    ELSE 0
  END
WHERE current_episode IS NULL OR watched_minutes IS NULL;

-- Create function to calculate watched minutes based on episodes
CREATE OR REPLACE FUNCTION calculate_watched_minutes(
  p_current_episode INTEGER,
  p_total_episodes INTEGER,
  p_total_runtime_minutes INTEGER
) RETURNS INTEGER AS $$
BEGIN
  -- If no episodes or runtime, return 0
  IF p_total_episodes = 0 OR p_total_runtime_minutes = 0 THEN
    RETURN 0;
  END IF;
  
  -- Calculate minutes per episode
  -- Return watched minutes based on current episode
  RETURN (p_total_runtime_minutes * p_current_episode / p_total_episodes);
END;
$$ LANGUAGE plpgsql;

-- Create function to update user statistics based on watched minutes
CREATE OR REPLACE FUNCTION update_user_stats_with_watched_time()
RETURNS TRIGGER AS $$
DECLARE
  old_watched_minutes INTEGER := 0;
  new_watched_minutes INTEGER := 0;
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    -- Update counters based on list type
    IF NEW.list_type = 'watching' THEN
      UPDATE user_stats 
      SET dramas_watching = dramas_watching + 1,
          total_watch_time_minutes = total_watch_time_minutes + COALESCE(NEW.watched_minutes, 0),
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
          total_watch_time_minutes = total_watch_time_minutes + COALESCE(NEW.watched_minutes, 0),
          updated_at = NOW()
      WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    old_watched_minutes := COALESCE(OLD.watched_minutes, 0);
    new_watched_minutes := COALESCE(NEW.watched_minutes, 0);
    
    -- If list type changed
    IF OLD.list_type != NEW.list_type THEN
      -- Remove from old list stats
      IF OLD.list_type = 'watching' THEN
        UPDATE user_stats 
        SET dramas_watching = GREATEST(dramas_watching - 1, 0),
            total_watch_time_minutes = GREATEST(total_watch_time_minutes - old_watched_minutes, 0)
        WHERE user_id = OLD.user_id;
      ELSIF OLD.list_type = 'watchlist' THEN
        UPDATE user_stats 
        SET dramas_in_watchlist = GREATEST(dramas_in_watchlist - 1, 0)
        WHERE user_id = OLD.user_id;
      ELSIF OLD.list_type = 'completed' THEN
        UPDATE user_stats 
        SET dramas_completed = GREATEST(dramas_completed - 1, 0),
            total_watch_time_minutes = GREATEST(total_watch_time_minutes - old_watched_minutes, 0)
        WHERE user_id = OLD.user_id;
      END IF;
      
      -- Add to new list stats
      IF NEW.list_type = 'watching' THEN
        UPDATE user_stats 
        SET dramas_watching = dramas_watching + 1,
            total_watch_time_minutes = total_watch_time_minutes + new_watched_minutes
        WHERE user_id = NEW.user_id;
      ELSIF NEW.list_type = 'watchlist' THEN
        UPDATE user_stats 
        SET dramas_in_watchlist = dramas_in_watchlist + 1
        WHERE user_id = NEW.user_id;
      ELSIF NEW.list_type = 'completed' THEN
        UPDATE user_stats 
        SET dramas_completed = dramas_completed + 1,
            total_watch_time_minutes = total_watch_time_minutes + new_watched_minutes
        WHERE user_id = NEW.user_id;
      END IF;
    ELSE
      -- Same list type, just update watched time if changed
      IF old_watched_minutes != new_watched_minutes THEN
        UPDATE user_stats 
        SET total_watch_time_minutes = total_watch_time_minutes - old_watched_minutes + new_watched_minutes,
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
    old_watched_minutes := COALESCE(OLD.watched_minutes, 0);
    
    -- Remove from stats based on list type
    IF OLD.list_type = 'watching' THEN
      UPDATE user_stats 
      SET dramas_watching = GREATEST(dramas_watching - 1, 0),
          total_watch_time_minutes = GREATEST(total_watch_time_minutes - old_watched_minutes, 0),
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
          total_watch_time_minutes = GREATEST(total_watch_time_minutes - old_watched_minutes, 0),
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
DROP TRIGGER IF EXISTS update_user_stats_on_list_change ON user_drama_lists;
DROP TRIGGER IF EXISTS episode_progress_trigger ON user_drama_lists;

-- Create new trigger for stats with watched time
CREATE TRIGGER user_drama_lists_watched_time_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_drama_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_with_watched_time();

-- Create trigger to auto-calculate watched_minutes when current_episode changes
CREATE OR REPLACE FUNCTION auto_calculate_watched_minutes()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-calculate watched_minutes based on current_episode
  NEW.watched_minutes := calculate_watched_minutes(
    NEW.current_episode,
    NEW.total_episodes,
    NEW.total_runtime_minutes
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_calculate_watched_minutes_trigger
  BEFORE INSERT OR UPDATE ON user_drama_lists
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_watched_minutes();

-- Function to recalculate all user stats with watched time
CREATE OR REPLACE FUNCTION recalculate_user_stats_with_watched_time(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  watching_count INTEGER;
  watchlist_count INTEGER;
  completed_count INTEGER;
  total_watched_minutes INTEGER;
BEGIN
  -- Count dramas and sum watched minutes
  SELECT COUNT(*) INTO watching_count
  FROM user_drama_lists
  WHERE user_id = p_user_id AND list_type = 'watching';
  
  SELECT COUNT(*) INTO watchlist_count
  FROM user_drama_lists
  WHERE user_id = p_user_id AND list_type = 'watchlist';
  
  SELECT COUNT(*) INTO completed_count
  FROM user_drama_lists
  WHERE user_id = p_user_id AND list_type = 'completed';
  
  -- Sum all watched minutes from all lists (watching + completed)
  SELECT COALESCE(SUM(watched_minutes), 0) INTO total_watched_minutes
  FROM user_drama_lists
  WHERE user_id = p_user_id AND list_type IN ('watching', 'completed');
  
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
    total_watched_minutes,
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

-- Recalculate stats for all users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT DISTINCT user_id FROM user_drama_lists LOOP
    PERFORM recalculate_user_stats_with_watched_time(user_record.user_id);
  END LOOP;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_drama_lists_episodes 
ON user_drama_lists(user_id, list_type, current_episode, total_episodes);

CREATE INDEX IF NOT EXISTS idx_user_drama_lists_watched_minutes 
ON user_drama_lists(user_id, list_type, watched_minutes);

-- Drop old episode_progress table if it exists
DROP TABLE IF EXISTS episode_progress CASCADE;

-- Verify the changes
SELECT 'Simplified episode progress system applied successfully.' as status;
SELECT 'All episode tracking now handled in user_drama_lists table.' as info;
SELECT 'Watched time calculated automatically based on current_episode.' as calculation_info;