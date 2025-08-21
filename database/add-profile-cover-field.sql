-- Add user_profile_cover field to users table
-- This script adds the profile cover functionality to existing users table

-- Add the user_profile_cover column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS user_profile_cover TEXT;

-- Set default cover image for existing users without a cover
UPDATE public.users 
SET user_profile_cover = 'https://tmbpgttvoabpmcanuqkm.supabase.co/storage/v1/object/public/profilecover/cover.jpg'
WHERE user_profile_cover IS NULL;

-- Update the view to include the new field
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
LEFT JOIN public.user_subscriptions ps ON u.id = ps.user_id;

-- Add comment for documentation
COMMENT ON COLUMN public.users.user_profile_cover IS 'URL da foto de capa do perfil do usuário';