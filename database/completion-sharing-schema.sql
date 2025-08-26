-- =====================================================
-- COMPLETION SHARING FEATURE - DATABASE UPDATES
-- =====================================================
-- This file adds support for tracking drama completion times
-- and updating user statistics when dramas are completed

-- Check if the total_watch_time_minutes field exists in user_stats
-- (It should already exist based on the schema, but this is a safety check)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_stats' 
        AND column_name = 'total_watch_time_minutes'
    ) THEN
        ALTER TABLE public.user_stats 
        ADD COLUMN total_watch_time_minutes INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add a new table to track individual drama completion times
CREATE TABLE IF NOT EXISTS public.drama_completions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    drama_id INTEGER NOT NULL,
    drama_name VARCHAR(200) NOT NULL,
    total_runtime_minutes INTEGER NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, drama_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_drama_completions_user_id ON public.drama_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_drama_completions_completed_at ON public.drama_completions(completed_at);

-- Enable RLS on the new table
ALTER TABLE public.drama_completions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for drama_completions
CREATE POLICY IF NOT EXISTS "Users can view own completions" ON public.drama_completions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own completions" ON public.drama_completions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own completions" ON public.drama_completions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own completions" ON public.drama_completions
    FOR DELETE USING (auth.uid() = user_id);

-- Note: User stats triggers are now handled by user-stats-triggers.sql
-- This ensures consistency and avoids conflicts between different trigger systems

-- Function to handle drama completion and sharing
CREATE OR REPLACE FUNCTION complete_drama_with_sharing(
    p_user_id UUID,
    p_drama_id INTEGER,
    p_drama_name VARCHAR(200),
    p_total_runtime_minutes INTEGER
)
RETURNS JSON AS $$
DECLARE
    completion_record public.drama_completions%ROWTYPE;
    user_stats_record public.user_stats%ROWTYPE;
    result JSON;
BEGIN
    -- Insert or update drama completion
    INSERT INTO public.drama_completions (
        user_id,
        drama_id,
        drama_name,
        total_runtime_minutes
    ) VALUES (
        p_user_id,
        p_drama_id,
        p_drama_name,
        p_total_runtime_minutes
    )
    ON CONFLICT (user_id, drama_id) 
    DO UPDATE SET 
        completed_at = NOW(),
        total_runtime_minutes = EXCLUDED.total_runtime_minutes
    RETURNING * INTO completion_record;
    
    -- Get updated user stats
    SELECT * INTO user_stats_record
    FROM public.user_stats
    WHERE user_id = p_user_id;
    
    -- Build result JSON
    result := json_build_object(
        'completion', json_build_object(
            'id', completion_record.id,
            'drama_id', completion_record.drama_id,
            'drama_name', completion_record.drama_name,
            'total_runtime_minutes', completion_record.total_runtime_minutes,
            'completed_at', completion_record.completed_at
        ),
        'user_stats', json_build_object(
            'total_watch_time_minutes', user_stats_record.total_watch_time_minutes,
            'dramas_completed', user_stats_record.dramas_completed
        )
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's completion history
CREATE OR REPLACE FUNCTION get_user_completion_history(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    drama_id INTEGER,
    drama_name VARCHAR(200),
    total_runtime_minutes INTEGER,
    completed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.drama_id,
        dc.drama_name,
        dc.total_runtime_minutes,
        dc.completed_at
    FROM public.drama_completions dc
    WHERE dc.user_id = p_user_id
    ORDER BY dc.completed_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get completion stats for a user
CREATE OR REPLACE FUNCTION get_user_completion_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    stats_record RECORD;
    result JSON;
BEGIN
    SELECT 
        COUNT(*) as total_completions,
        SUM(total_runtime_minutes) as total_watch_time,
        AVG(total_runtime_minutes) as avg_drama_length,
        MIN(completed_at) as first_completion,
        MAX(completed_at) as latest_completion
    INTO stats_record
    FROM public.drama_completions
    WHERE user_id = p_user_id;
    
    result := json_build_object(
        'total_completions', COALESCE(stats_record.total_completions, 0),
        'total_watch_time_minutes', COALESCE(stats_record.total_watch_time, 0),
        'average_drama_length_minutes', COALESCE(stats_record.avg_drama_length, 0),
        'first_completion_date', stats_record.first_completion,
        'latest_completion_date', stats_record.latest_completion
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

-- This schema extension provides:
-- 1. Drama completion tracking with runtime information
-- 2. Automatic user statistics updates when dramas are completed
-- 3. Functions to handle completion workflow and retrieve stats
-- 4. Proper RLS policies for data security
-- 5. Triggers for automatic stat updates

-- Usage:
-- 1. When a user completes a drama, call complete_drama_with_sharing()
-- 2. Use get_user_completion_history() to show recent completions
-- 3. Use get_user_completion_stats() for detailed completion analytics
-- 4. The completion sharing modal will use this data to generate certificates