-- Fix: Auto-remove episode watch history when drama is removed from user list
-- This ensures data consistency and prevents orphaned episode records

-- Create function to clean up episode watch history
CREATE OR REPLACE FUNCTION cleanup_episode_watch_history()
RETURNS TRIGGER AS $$
BEGIN
    -- When a drama is deleted from user_drama_lists, remove all episode watch history for that user/drama combination
    IF TG_OP = 'DELETE' THEN
        DELETE FROM episode_watch_history 
        WHERE user_id = OLD.user_id 
        AND drama_id = OLD.drama_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically cleanup episode watch history when drama is removed from list
DROP TRIGGER IF EXISTS cleanup_episode_history_on_drama_removal ON user_drama_lists;

CREATE TRIGGER cleanup_episode_history_on_drama_removal
    AFTER DELETE ON user_drama_lists
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_episode_watch_history();

-- Add comment for documentation
COMMENT ON FUNCTION cleanup_episode_watch_history() IS 'Automatically removes episode watch history when a drama is deleted from user lists to maintain data consistency';
COMMENT ON TRIGGER cleanup_episode_history_on_drama_removal ON user_drama_lists IS 'Triggers cleanup of episode watch history when drama is removed from user list';