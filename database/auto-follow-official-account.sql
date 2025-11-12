-- Auto-follow official account for all existing users
-- This script adds the official account follow relationship for all existing users

-- First, let's make sure the official account exists (this should already exist)
-- If it doesn't exist, you'll need to create it manually in your admin panel

-- Add follow relationship for all existing users who don't already follow the official account
INSERT INTO user_follows (follower_id, following_id, created_at)
SELECT 
    u.id as follower_id,
    'd3a81a4e-3919-457e-a4e4-e3b9dbdf97d6' as following_id,
    NOW() as created_at
FROM users u
WHERE u.id != 'd3a81a4e-3919-457e-a4e4-e3b9dbdf97d6' -- Don't make the official account follow itself
AND NOT EXISTS (
    SELECT 1 
    FROM user_follows uf 
    WHERE uf.follower_id = u.id 
    AND uf.following_id = 'd3a81a4e-3919-457e-a4e4-e3b9dbdf97d6'
);

-- Verify the results
SELECT 
    COUNT(*) as total_users_following_official
FROM user_follows 
WHERE following_id = 'd3a81a4e-3919-457e-a4e4-e3b9dbdf97d6';