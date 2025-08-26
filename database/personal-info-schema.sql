-- =====================================================
-- PERSONAL INFO SCHEMA UPDATES
-- =====================================================
-- This file adds gender and birth date fields to the users table
-- Run this after the main supabase-schema.sql

-- Add new columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'non_binary', 'prefer_not_to_say')),
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS age INTEGER;

-- Create index for age-based queries (optional but recommended for performance)
CREATE INDEX IF NOT EXISTS idx_users_age ON public.users(age);
CREATE INDEX IF NOT EXISTS idx_users_birth_date ON public.users(birth_date);

-- Create a function to automatically calculate age from birth_date
CREATE OR REPLACE FUNCTION calculate_age_from_birth_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.birth_date IS NOT NULL THEN
        NEW.age = EXTRACT(YEAR FROM AGE(NEW.birth_date));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update age when birth_date changes
DROP TRIGGER IF EXISTS update_age_on_birth_date_change ON public.users;
CREATE TRIGGER update_age_on_birth_date_change
    BEFORE INSERT OR UPDATE OF birth_date ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION calculate_age_from_birth_date();

-- Update the handle_new_user function to include personal info from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $
DECLARE
    base_username TEXT;
    final_username TEXT;
    counter INTEGER := 0;
    user_gender VARCHAR(20);
    user_birth_date DATE;
    user_age INTEGER;
BEGIN
    -- Get base username from metadata or generate one
    base_username := COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8));
    final_username := lower(base_username);
    
    -- Ensure username is unique
    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = final_username) LOOP
        counter := counter + 1;
        final_username := lower(base_username) || '_' || counter::text;
    END LOOP;
    
    -- Extract personal info from metadata if available
    user_gender := NEW.raw_user_meta_data->>'gender';
    
    -- Parse birth_date if provided
    IF NEW.raw_user_meta_data->>'birth_date' IS NOT NULL THEN
        BEGIN
            user_birth_date := (NEW.raw_user_meta_data->>'birth_date')::DATE;
            user_age := EXTRACT(YEAR FROM AGE(user_birth_date));
        EXCEPTION WHEN OTHERS THEN
            user_birth_date := NULL;
            user_age := NULL;
        END;
    END IF;
    
    -- Insert user profile
    INSERT INTO public.users (id, username, display_name, gender, birth_date, age)
    VALUES (
        NEW.id,
        final_username,
        COALESCE(NEW.raw_user_meta_data->>'display_name', base_username),
        user_gender,
        user_birth_date,
        user_age
    );
    
    -- Insert user preferences
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);
    
    -- Insert user stats
    INSERT INTO public.user_stats (user_id)
    VALUES (NEW.id);
    
    -- Insert premium features
    INSERT INTO public.premium_features (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the auth process
        RAISE WARNING 'Error creating user profile: %', SQLERRM;
        RETURN NEW;
END;
$ language 'plpgsql' SECURITY DEFINER;

-- Update the user profiles view to include personal info
DROP VIEW IF EXISTS public.user_profiles_with_stats;
CREATE VIEW public.user_profiles_with_stats AS
SELECT 
    u.*,
    us.total_watch_time_minutes,
    us.dramas_completed,
    us.dramas_watching,
    us.dramas_in_watchlist,
    us.favorite_genres,
    CASE 
        WHEN ps.status = 'active' AND ps.expires_at > NOW() THEN true 
        ELSE false 
    END as is_premium
FROM public.users u
LEFT JOIN public.user_stats us ON u.id = us.user_id
LEFT JOIN public.premium_subscriptions ps ON u.id = ps.user_id;

-- Comments
-- This migration adds:
-- 1. gender field with enum constraint for data integrity
-- 2. birth_date field as DATE type for proper date handling
-- 3. age field that is automatically calculated from birth_date
-- 4. Indexes for performance on age and birth_date queries
-- 5. Trigger to automatically update age when birth_date changes
-- 6. Updated handle_new_user function to handle personal info from auth metadata
-- 7. Updated user profiles view to include new fields

-- Usage:
-- 1. Run this SQL in your Supabase SQL editor after the main schema
-- 2. The app will automatically save gender and birth_date during onboarding
-- 3. Age is calculated automatically and kept in sync with birth_date
-- 4. All existing users will have NULL values for these fields (which is fine)