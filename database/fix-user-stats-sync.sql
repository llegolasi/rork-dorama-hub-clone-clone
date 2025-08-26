-- =====================================================
-- FIX USER STATISTICS - SYNC AND REPAIR
-- =====================================================
-- This file fixes the user statistics system and ensures
-- all data is properly synchronized

-- First, let's clean up any conflicting triggers
DROP TRIGGER IF EXISTS update_stats_on_drama_completion ON public.drama_completions;
DROP FUNCTION IF EXISTS update_user_stats_on_completion();

-- Ensure the user_stats table has all required columns
ALTER TABLE public.user_stats 
ADD COLUMN IF NOT EXISTS total_watch_time_minutes INTEGER DEFAULT 0;

-- Update all existing user statistics to ensure they are accurate
DO $$
DECLARE
    user_record RECORD;
    watching_count INTEGER;
    watchlist_count INTEGER;
    completed_count INTEGER;
    total_runtime INTEGER;
BEGIN
    -- Loop through all users and recalculate their stats
    FOR user_record IN 
        SELECT DISTINCT id FROM public.users
    LOOP
        -- Count dramas in each list for this user
        SELECT COUNT(*) INTO watching_count
        FROM public.user_drama_lists
        WHERE user_id = user_record.id AND list_type = 'watching';
        
        SELECT COUNT(*) INTO watchlist_count
        FROM public.user_drama_lists
        WHERE user_id = user_record.id AND list_type = 'watchlist';
        
        SELECT COUNT(*) INTO completed_count
        FROM public.user_drama_lists
        WHERE user_id = user_record.id AND list_type = 'completed';
        
        -- Calculate total watch time from completions
        SELECT COALESCE(SUM(total_runtime_minutes), 0) INTO total_runtime
        FROM public.drama_completions
        WHERE user_id = user_record.id;
        
        -- Update or insert user stats
        INSERT INTO public.user_stats (
            user_id,
            dramas_watching,
            dramas_in_watchlist,
            dramas_completed,
            total_watch_time_minutes,
            updated_at
        ) VALUES (
            user_record.id,
            watching_count,
            watchlist_count,
            completed_count,
            total_runtime,
            NOW()
        )
        ON CONFLICT (user_id)
        DO UPDATE SET
            dramas_watching = EXCLUDED.dramas_watching,
            dramas_in_watchlist = EXCLUDED.dramas_in_watchlist,
            dramas_completed = EXCLUDED.dramas_completed,
            total_watch_time_minutes = EXCLUDED.total_watch_time_minutes,
            updated_at = NOW();
            
        RAISE NOTICE 'Updated stats for user %: watching=%, watchlist=%, completed=%, watch_time=%', 
            user_record.id, watching_count, watchlist_count, completed_count, total_runtime;
    END LOOP;
END $$;

-- Verify the statistics are working
SELECT 
    u.username,
    us.dramas_watching,
    us.dramas_in_watchlist,
    us.dramas_completed,
    us.total_watch_time_minutes,
    us.updated_at
FROM public.users u
LEFT JOIN public.user_stats us ON u.id = us.user_id
ORDER BY us.updated_at DESC NULLS LAST
LIMIT 10;

-- Show completion data to verify it exists
SELECT 
    u.username,
    dc.drama_name,
    dc.total_runtime_minutes,
    dc.completed_at
FROM public.users u
JOIN public.drama_completions dc ON u.id = dc.user_id
ORDER BY dc.completed_at DESC
LIMIT 10;

-- =====================================================
-- COMMENTS
-- =====================================================

-- This repair script:
-- 1. Removes conflicting triggers that might cause issues
-- 2. Ensures the user_stats table has the correct structure
-- 3. Recalculates all user statistics from scratch
-- 4. Provides verification queries to check the results

-- After running this script, the user statistics should be accurate
-- and the triggers from user-stats-triggers.sql will handle future updates