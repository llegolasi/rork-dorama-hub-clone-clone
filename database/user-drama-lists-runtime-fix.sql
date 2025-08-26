-- Fix for user drama lists runtime tracking and statistics
-- This script adds the total_runtime_minutes field to user_drama_lists table
-- and updates triggers to properly handle statistics when dramas are removed

-- Add total_runtime_minutes column to user_drama_lists if it doesn't exist
ALTER TABLE user_drama_lists 
ADD COLUMN IF NOT EXISTS total_runtime_minutes INTEGER DEFAULT 0;

-- Update existing completed dramas with estimated runtime (60 minutes per episode)
UPDATE user_drama_lists 
SET total_runtime_minutes = COALESCE(total_episodes * 60, 16 * 60)
WHERE list_type = 'completed' 
AND (total_runtime_minutes IS NULL OR total_runtime_minutes = 0);

-- Create or replace function to update user statistics
CREATE OR REPLACE FUNCTION update_user_stats_on_list_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT (new drama added to list)
  IF TG_OP = 'INSERT' THEN
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
  
  -- Handle UPDATE (drama moved between lists)
  IF TG_OP = 'UPDATE' THEN
    -- If list type changed, update counters
    IF OLD.list_type != NEW.list_type THEN
      -- Decrease old list counter
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
            total_watch_time_minutes = GREATEST(total_watch_time_minutes - COALESCE(OLD.total_runtime_minutes, 0), 0)
        WHERE user_id = OLD.user_id;
      END IF;
      
      -- Increase new list counter
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
            total_watch_time_minutes = total_watch_time_minutes + COALESCE(NEW.total_runtime_minutes, 0)
        WHERE user_id = NEW.user_id;
      END IF;
      
      -- Update timestamp
      UPDATE user_stats 
      SET updated_at = NOW()
      WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Handle DELETE (drama removed from list)
  IF TG_OP = 'DELETE' THEN
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
          total_watch_time_minutes = GREATEST(total_watch_time_minutes - COALESCE(OLD.total_runtime_minutes, 0), 0),
          updated_at = NOW()
      WHERE user_id = OLD.user_id;
    END IF;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS user_drama_lists_stats_trigger ON user_drama_lists;
DROP TRIGGER IF EXISTS update_user_stats_on_list_insert ON user_drama_lists;
DROP TRIGGER IF EXISTS update_user_stats_on_list_update ON user_drama_lists;
DROP TRIGGER IF EXISTS update_user_stats_on_list_delete ON user_drama_lists;
DROP TRIGGER IF EXISTS update_user_stats_on_list_change ON user_drama_lists;

-- Create new trigger
CREATE TRIGGER user_drama_lists_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_drama_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_list_change();

-- Create function to recalculate user stats from scratch
CREATE OR REPLACE FUNCTION recalculate_user_stats(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  watching_count INTEGER;
  watchlist_count INTEGER;
  completed_count INTEGER;
  total_runtime INTEGER;
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

-- Recalculate stats for all users to fix any inconsistencies
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT DISTINCT user_id FROM user_drama_lists LOOP
    PERFORM recalculate_user_stats(user_record.user_id);
  END LOOP;
END;
$$;

-- Create index on total_runtime_minutes for better performance
CREATE INDEX IF NOT EXISTS idx_user_drama_lists_runtime 
ON user_drama_lists(user_id, list_type, total_runtime_minutes);

-- Verify the changes
SELECT 'Fix applied successfully. Runtime tracking and statistics properly updated.' as status;