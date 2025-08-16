-- Fix for user_drama_lists table: Add runtime tracking and update triggers
-- This file adds the total_runtime_minutes field and updates existing triggers

-- 1. Add total_runtime_minutes column to user_drama_lists table
ALTER TABLE user_drama_lists 
ADD COLUMN IF NOT EXISTS total_runtime_minutes INTEGER DEFAULT 0;

-- 2. Update existing completed dramas with their runtime
UPDATE user_drama_lists 
SET total_runtime_minutes = (
  SELECT COALESCE(d.total_runtime_minutes, 0)
  FROM dramas d 
  WHERE d.id = user_drama_lists.drama_id
)
WHERE list_type = 'completed' AND total_runtime_minutes = 0;

-- 3. Drop existing triggers to recreate them with runtime support
DROP TRIGGER IF EXISTS update_user_stats_on_list_change ON user_drama_lists;
DROP TRIGGER IF EXISTS update_user_stats_on_list_insert ON user_drama_lists;
DROP TRIGGER IF EXISTS update_user_stats_on_list_delete ON user_drama_lists;

-- 4. Drop existing function to recreate it
DROP FUNCTION IF EXISTS update_user_stats_from_lists();

-- 5. Create updated function that handles runtime tracking
CREATE OR REPLACE FUNCTION update_user_stats_from_lists()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
    drama_runtime INTEGER;
BEGIN
    -- Determine which user_id to update based on operation
    IF TG_OP = 'DELETE' THEN
        target_user_id := OLD.user_id;
        drama_runtime := OLD.total_runtime_minutes;
    ELSE
        target_user_id := NEW.user_id;
        -- Get drama runtime if not already set
        IF NEW.total_runtime_minutes = 0 OR NEW.total_runtime_minutes IS NULL THEN
            SELECT COALESCE(d.total_runtime_minutes, 0) INTO drama_runtime
            FROM dramas d WHERE d.id = NEW.drama_id;
            
            -- Update the record with the runtime
            IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
                NEW.total_runtime_minutes := drama_runtime;
            END IF;
        ELSE
            drama_runtime := NEW.total_runtime_minutes;
        END IF;
    END IF;

    -- Update user stats
    INSERT INTO user_stats (user_id, dramas_completed, dramas_watching, dramas_in_watchlist, total_watch_time_minutes)
    SELECT 
        target_user_id,
        COUNT(CASE WHEN list_type = 'completed' THEN 1 END),
        COUNT(CASE WHEN list_type = 'watching' THEN 1 END),
        COUNT(CASE WHEN list_type = 'watchlist' THEN 1 END),
        COALESCE(SUM(CASE WHEN list_type = 'completed' THEN total_runtime_minutes ELSE 0 END), 0)
    FROM user_drama_lists 
    WHERE user_id = target_user_id
    ON CONFLICT (user_id) 
    DO UPDATE SET
        dramas_completed = EXCLUDED.dramas_completed,
        dramas_watching = EXCLUDED.dramas_watching,
        dramas_in_watchlist = EXCLUDED.dramas_in_watchlist,
        total_watch_time_minutes = EXCLUDED.total_watch_time_minutes,
        updated_at = NOW();

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Create triggers for all operations
CREATE TRIGGER update_user_stats_on_list_insert
    BEFORE INSERT ON user_drama_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats_from_lists();

CREATE TRIGGER update_user_stats_on_list_update
    AFTER UPDATE ON user_drama_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats_from_lists();

CREATE TRIGGER update_user_stats_on_list_delete
    AFTER DELETE ON user_drama_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats_from_lists();

-- 7. Recalculate all user stats to ensure consistency
INSERT INTO user_stats (user_id, dramas_completed, dramas_watching, dramas_in_watchlist, total_watch_time_minutes)
SELECT 
    udl.user_id,
    COUNT(CASE WHEN udl.list_type = 'completed' THEN 1 END) as dramas_completed,
    COUNT(CASE WHEN udl.list_type = 'watching' THEN 1 END) as dramas_watching,
    COUNT(CASE WHEN udl.list_type = 'watchlist' THEN 1 END) as dramas_in_watchlist,
    COALESCE(SUM(CASE WHEN udl.list_type = 'completed' THEN udl.total_runtime_minutes ELSE 0 END), 0) as total_watch_time_minutes
FROM user_drama_lists udl
GROUP BY udl.user_id
ON CONFLICT (user_id) 
DO UPDATE SET
    dramas_completed = EXCLUDED.dramas_completed,
    dramas_watching = EXCLUDED.dramas_watching,
    dramas_in_watchlist = EXCLUDED.dramas_in_watchlist,
    total_watch_time_minutes = EXCLUDED.total_watch_time_minutes,
    updated_at = NOW();

-- 8. Create index for better performance on runtime queries
CREATE INDEX IF NOT EXISTS idx_user_drama_lists_runtime 
ON user_drama_lists(user_id, list_type, total_runtime_minutes);

-- 9. Verify the changes
SELECT 'Fix applied successfully. Runtime tracking enabled for user drama lists.' as status;