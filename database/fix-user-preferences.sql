-- =====================================================
-- FIX USER PREFERENCES TABLE
-- =====================================================
-- This file fixes the user_preferences table to support proper upsert operations

-- 1. Add unique constraint on user_id if it doesn't exist
-- This is required for ON CONFLICT to work properly
DO $$
BEGIN
    -- Check if the unique constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_preferences_user_id_key'
    ) THEN
        -- Add unique constraint on user_id
        ALTER TABLE user_preferences 
        ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- 2. Alternative: Create a unique index if constraint doesn't work
-- Uncomment the line below if the constraint approach doesn't work
-- CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_user_preferences_user_id ON user_preferences (user_id);

-- 3. Test the upsert functionality
-- This query should work after the constraint is added
-- INSERT INTO user_preferences (user_id, favorite_genres, loved_dramas)
-- VALUES ('test-user-id', ARRAY['Romance', 'Comedy'], ARRAY[1, 2, 3])
-- ON CONFLICT (user_id) 
-- DO UPDATE SET 
--   favorite_genres = EXCLUDED.favorite_genres,
--   loved_dramas = EXCLUDED.loved_dramas,
--   updated_at = NOW();

-- =====================================================
-- NOTES
-- =====================================================
-- 1. The unique constraint on user_id is required for ON CONFLICT to work
-- 2. After running this, the upsert operations in the app should work correctly
-- 3. If you get errors about existing data, you may need to clean up duplicates first