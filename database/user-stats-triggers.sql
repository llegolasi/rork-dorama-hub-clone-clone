-- =====================================================
-- USER STATISTICS AUTOMATIC UPDATES
-- =====================================================
-- This file creates triggers and functions to automatically
-- update user statistics when drama lists change

-- Function to recalculate and update user statistics
CREATE OR REPLACE FUNCTION update_user_statistics(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    watching_count INTEGER;
    watchlist_count INTEGER;
    completed_count INTEGER;
    total_runtime INTEGER;
BEGIN
    -- Count dramas in each list
    SELECT COUNT(*) INTO watching_count
    FROM public.user_drama_lists
    WHERE user_id = p_user_id AND list_type = 'watching';
    
    SELECT COUNT(*) INTO watchlist_count
    FROM public.user_drama_lists
    WHERE user_id = p_user_id AND list_type = 'watchlist';
    
    SELECT COUNT(*) INTO completed_count
    FROM public.user_drama_lists
    WHERE user_id = p_user_id AND list_type = 'completed';
    
    -- Calculate total watch time from completions
    SELECT COALESCE(SUM(total_runtime_minutes), 0) INTO total_runtime
    FROM public.drama_completions
    WHERE user_id = p_user_id;
    
    -- Update or insert user stats
    INSERT INTO public.user_stats (
        user_id,
        dramas_watching,
        dramas_in_watchlist,
        dramas_completed,
        total_watch_time_minutes,
        updated_at
    ) VALUES (
        p_user_id,
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle drama list changes
CREATE OR REPLACE FUNCTION handle_drama_list_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT and UPDATE
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM update_user_statistics(NEW.user_id);
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        PERFORM update_user_statistics(OLD.user_id);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user_drama_lists changes
DROP TRIGGER IF EXISTS update_user_stats_on_list_change ON public.user_drama_lists;
CREATE TRIGGER update_user_stats_on_list_change
    AFTER INSERT OR UPDATE OR DELETE ON public.user_drama_lists
    FOR EACH ROW EXECUTE FUNCTION handle_drama_list_change();

-- Function to handle completion changes (update existing function)
CREATE OR REPLACE FUNCTION update_user_stats_on_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user statistics after completion
    PERFORM update_user_statistics(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the completion trigger
DROP TRIGGER IF EXISTS update_stats_on_drama_completion ON public.drama_completions;
CREATE TRIGGER update_stats_on_drama_completion
    AFTER INSERT OR UPDATE OR DELETE ON public.drama_completions
    FOR EACH ROW EXECUTE FUNCTION update_user_stats_on_completion();

-- Function to get comprehensive user statistics
CREATE OR REPLACE FUNCTION get_user_comprehensive_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    stats_record public.user_stats%ROWTYPE;
    completion_stats RECORD;
    genre_stats RECORD;
    monthly_stats RECORD;
    result JSON;
BEGIN
    -- Get basic user stats
    SELECT * INTO stats_record
    FROM public.user_stats
    WHERE user_id = p_user_id;
    
    -- If no stats exist, create them
    IF NOT FOUND THEN
        PERFORM update_user_statistics(p_user_id);
        SELECT * INTO stats_record
        FROM public.user_stats
        WHERE user_id = p_user_id;
    END IF;
    
    -- Get completion statistics
    SELECT 
        COUNT(*) as total_completions,
        AVG(total_runtime_minutes) as avg_runtime,
        MIN(completed_at) as first_completion,
        MAX(completed_at) as latest_completion
    INTO completion_stats
    FROM public.drama_completions
    WHERE user_id = p_user_id;
    
    -- Get monthly watch time for current year
    SELECT json_object_agg(
        EXTRACT(MONTH FROM completed_at)::text,
        SUM(total_runtime_minutes)
    ) INTO monthly_stats
    FROM public.drama_completions
    WHERE user_id = p_user_id 
    AND EXTRACT(YEAR FROM completed_at) = EXTRACT(YEAR FROM NOW())
    GROUP BY EXTRACT(MONTH FROM completed_at);
    
    -- Build comprehensive result
    result := json_build_object(
        'user_id', p_user_id,
        'total_watch_time_minutes', COALESCE(stats_record.total_watch_time_minutes, 0),
        'dramas_completed', COALESCE(stats_record.dramas_completed, 0),
        'dramas_watching', COALESCE(stats_record.dramas_watching, 0),
        'dramas_in_watchlist', COALESCE(stats_record.dramas_in_watchlist, 0),
        'average_drama_runtime', COALESCE(completion_stats.avg_runtime, 0),
        'first_completion_date', completion_stats.first_completion,
        'latest_completion_date', completion_stats.latest_completion,
        'monthly_watch_time', COALESCE(monthly_stats, '{}'::json),
        'favorite_genres', COALESCE(stats_record.favorite_genres, '{}'::jsonb),
        'yearly_watch_time', COALESCE(stats_record.yearly_watch_time, '{}'::jsonb),
        'favorite_actor_id', stats_record.favorite_actor_id,
        'favorite_actor_name', stats_record.favorite_actor_name,
        'favorite_actor_works_watched', COALESCE(stats_record.favorite_actor_works_watched, 0),
        'created_at', stats_record.created_at,
        'updated_at', stats_record.updated_at
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize user stats for existing users
CREATE OR REPLACE FUNCTION initialize_all_user_stats()
RETURNS INTEGER AS $$
DECLARE
    user_record RECORD;
    updated_count INTEGER := 0;
BEGIN
    -- Loop through all users and update their stats
    FOR user_record IN 
        SELECT DISTINCT id FROM public.users
    LOOP
        PERFORM update_user_statistics(user_record.id);
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize stats for all existing users
SELECT initialize_all_user_stats();

-- =====================================================
-- COMMENTS
-- =====================================================

-- This file provides:
-- 1. Automatic user statistics updates when drama lists change
-- 2. Comprehensive statistics calculation including watch time
-- 3. Triggers that maintain data consistency
-- 4. Functions to retrieve detailed user statistics
-- 5. Initialization of stats for existing users

-- The statistics are now automatically maintained and will always be accurate
-- whenever users add/remove dramas from their lists or complete dramas