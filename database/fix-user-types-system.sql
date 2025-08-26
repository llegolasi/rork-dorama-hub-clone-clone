-- Fix User Types System
-- This script creates and updates the user types system with proper badges and avatar borders

-- First, ensure we have the user_subscriptions table for premium users
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add user type fields to users table if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'normal' CHECK (user_type IN ('normal', 'premium', 'official')),
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_type TEXT CHECK (verification_type IN ('official', 'premium', 'special')),
ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS daily_swipe_limit INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS current_badge_id UUID,
ADD COLUMN IF NOT EXISTS current_avatar_border_id UUID;

-- Create avatar_borders table
CREATE TABLE IF NOT EXISTS avatar_borders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'exclusive')),
  is_premium_only BOOLEAN DEFAULT FALSE,
  is_official_only BOOLEAN DEFAULT FALSE,
  unlock_requirement JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_badges table
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('vip', 'verified', 'special')),
  is_premium_only BOOLEAN DEFAULT FALSE,
  is_official_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_avatar_borders junction table
CREATE TABLE IF NOT EXISTS user_avatar_borders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  border_id UUID NOT NULL REFERENCES avatar_borders(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unlock_method TEXT,
  is_current BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, border_id)
);

-- Create user_user_badges junction table
CREATE TABLE IF NOT EXISTS user_user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES user_badges(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unlock_method TEXT,
  is_current BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, badge_id)
);

-- Insert default badges
INSERT INTO user_badges (id, name, description, icon, color, type, is_premium_only, is_official_only) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'VIP', 'Premium subscriber badge', '👑', '#FFD700', 'vip', TRUE, FALSE),
('550e8400-e29b-41d4-a716-446655440002', 'Verified', 'Official account verification', '✓', '#FFD700', 'verified', FALSE, TRUE),
('550e8400-e29b-41d4-a716-446655440003', 'Special', 'Special recognition badge', '⭐', '#8B5CF6', 'special', FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Insert default avatar borders
INSERT INTO avatar_borders (id, name, description, image_url, rarity, is_premium_only, is_official_only) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'Golden Frame', 'Premium golden border', 'https://example.com/borders/golden.png', 'legendary', TRUE, FALSE),
('660e8400-e29b-41d4-a716-446655440002', 'Official Frame', 'Official account border', 'https://example.com/borders/official.png', 'exclusive', FALSE, TRUE),
('660e8400-e29b-41d4-a716-446655440003', 'Silver Frame', 'Premium silver border', 'https://example.com/borders/silver.png', 'epic', TRUE, FALSE),
('660e8400-e29b-41d4-a716-446655440004', 'Bronze Frame', 'Achievement border', 'https://example.com/borders/bronze.png', 'rare', FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Function to update user type based on subscription
CREATE OR REPLACE FUNCTION update_user_type_from_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user type based on subscription status
  IF NEW.status = 'active' AND NEW.expires_at > NOW() THEN
    UPDATE users 
    SET 
      user_type = 'premium',
      premium_expires_at = NEW.expires_at,
      daily_swipe_limit = 50,
      current_badge_id = '550e8400-e29b-41d4-a716-446655440001' -- VIP badge
    WHERE id = NEW.user_id;
    
    -- Grant VIP badge if not already granted
    INSERT INTO user_user_badges (user_id, badge_id, unlock_method, is_current)
    VALUES (NEW.user_id, '550e8400-e29b-41d4-a716-446655440001', 'subscription', TRUE)
    ON CONFLICT (user_id, badge_id) DO UPDATE SET is_current = TRUE;
    
    -- Grant premium avatar borders
    INSERT INTO user_avatar_borders (user_id, border_id, unlock_method)
    VALUES 
      (NEW.user_id, '660e8400-e29b-41d4-a716-446655440001', 'subscription'),
      (NEW.user_id, '660e8400-e29b-41d4-a716-446655440003', 'subscription')
    ON CONFLICT (user_id, border_id) DO NOTHING;
    
  ELSE
    -- Subscription expired or cancelled
    UPDATE users 
    SET 
      user_type = CASE 
        WHEN user_type = 'official' THEN 'official'
        ELSE 'normal'
      END,
      premium_expires_at = NULL,
      daily_swipe_limit = 20,
      current_badge_id = CASE 
        WHEN user_type = 'official' THEN current_badge_id
        ELSE NULL
      END
    WHERE id = NEW.user_id AND user_type != 'official';
    
    -- Remove VIP badge if not official
    UPDATE user_user_badges 
    SET is_current = FALSE 
    WHERE user_id = NEW.user_id 
      AND badge_id = '550e8400-e29b-41d4-a716-446655440001'
      AND EXISTS (SELECT 1 FROM users WHERE id = NEW.user_id AND user_type != 'official');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subscription updates
DROP TRIGGER IF EXISTS update_user_type_trigger ON user_subscriptions;
CREATE TRIGGER update_user_type_trigger
  AFTER INSERT OR UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_type_from_subscription();

-- Function to set official user type
CREATE OR REPLACE FUNCTION set_official_user(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Update user to official type
  UPDATE users 
  SET 
    user_type = 'official',
    is_verified = TRUE,
    verification_type = 'official',
    daily_swipe_limit = 999999, -- Unlimited for official accounts
    current_badge_id = '550e8400-e29b-41d4-a716-446655440002' -- Verified badge
  WHERE id = user_uuid;
  
  -- Grant verified badge
  INSERT INTO user_user_badges (user_id, badge_id, unlock_method, is_current)
  VALUES (user_uuid, '550e8400-e29b-41d4-a716-446655440002', 'official_verification', TRUE)
  ON CONFLICT (user_id, badge_id) DO UPDATE SET is_current = TRUE;
  
  -- Grant official avatar border
  INSERT INTO user_avatar_borders (user_id, border_id, unlock_method, is_current)
  VALUES (user_uuid, '660e8400-e29b-41d4-a716-446655440002', 'official_verification', TRUE)
  ON CONFLICT (user_id, border_id) DO UPDATE SET is_current = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Set the official account
SELECT set_official_user('d3a81a4e-3919-457e-a4e4-e3b9dbdf97d6');

-- Update existing premium users based on active subscriptions
UPDATE users 
SET 
  user_type = 'premium',
  daily_swipe_limit = 50,
  current_badge_id = '550e8400-e29b-41d4-a716-446655440001'
WHERE id IN (
  SELECT user_id 
  FROM user_subscriptions 
  WHERE status = 'active' AND expires_at > NOW()
) AND user_type != 'official';

-- Grant VIP badges to existing premium users
INSERT INTO user_user_badges (user_id, badge_id, unlock_method, is_current)
SELECT user_id, '550e8400-e29b-41d4-a716-446655440001', 'existing_subscription', TRUE
FROM user_subscriptions 
WHERE status = 'active' AND expires_at > NOW()
ON CONFLICT (user_id, badge_id) DO UPDATE SET is_current = TRUE;

-- Grant premium borders to existing premium users
INSERT INTO user_avatar_borders (user_id, border_id, unlock_method)
SELECT us.user_id, ab.id, 'existing_subscription'
FROM user_subscriptions us
CROSS JOIN avatar_borders ab
WHERE us.status = 'active' 
  AND us.expires_at > NOW()
  AND ab.is_premium_only = TRUE
ON CONFLICT (user_id, border_id) DO NOTHING;

-- Add foreign key constraints
ALTER TABLE users 
ADD CONSTRAINT fk_users_current_badge 
FOREIGN KEY (current_badge_id) REFERENCES user_badges(id) ON DELETE SET NULL;

ALTER TABLE users 
ADD CONSTRAINT fk_users_current_avatar_border 
FOREIGN KEY (current_avatar_border_id) REFERENCES avatar_borders(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_avatar_borders_user_id ON user_avatar_borders(user_id);
CREATE INDEX IF NOT EXISTS idx_user_user_badges_user_id ON user_user_badges(user_id);

-- Enable RLS on new tables
ALTER TABLE avatar_borders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_avatar_borders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for avatar_borders (public read)
CREATE POLICY "Avatar borders are viewable by everyone" ON avatar_borders
  FOR SELECT USING (true);

-- RLS policies for user_badges (public read)
CREATE POLICY "User badges are viewable by everyone" ON user_badges
  FOR SELECT USING (true);

-- RLS policies for user_avatar_borders
CREATE POLICY "Users can view their own avatar borders" ON user_avatar_borders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own avatar borders" ON user_avatar_borders
  FOR ALL USING (auth.uid() = user_id);

-- RLS policies for user_user_badges
CREATE POLICY "Users can view their own badges" ON user_user_badges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own badges" ON user_user_badges
  FOR ALL USING (auth.uid() = user_id);

-- RLS policies for user_subscriptions
CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own subscriptions" ON user_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Function to check if user is premium
CREATE OR REPLACE FUNCTION is_user_premium(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_subscriptions 
    WHERE user_id = user_uuid 
      AND status = 'active' 
      AND expires_at > NOW()
  ) OR EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_uuid 
      AND user_type IN ('premium', 'official')
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get user's current badge and border info
CREATE OR REPLACE FUNCTION get_user_display_info(user_uuid UUID)
RETURNS TABLE(
  user_type TEXT,
  is_verified BOOLEAN,
  current_badge JSONB,
  current_avatar_border JSONB,
  daily_swipe_limit INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.user_type,
    u.is_verified,
    CASE 
      WHEN ub.id IS NOT NULL THEN 
        jsonb_build_object(
          'id', ub.id,
          'name', ub.name,
          'icon', ub.icon,
          'color', ub.color,
          'type', ub.type
        )
      ELSE NULL
    END as current_badge,
    CASE 
      WHEN ab.id IS NOT NULL THEN 
        jsonb_build_object(
          'id', ab.id,
          'name', ab.name,
          'imageUrl', ab.image_url,
          'rarity', ab.rarity
        )
      ELSE NULL
    END as current_avatar_border,
    u.daily_swipe_limit
  FROM users u
  LEFT JOIN user_badges ub ON u.current_badge_id = ub.id
  LEFT JOIN avatar_borders ab ON u.current_avatar_border_id = ab.id
  WHERE u.id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Update community posts query to include user type info
-- This will be handled in the backend route

COMMIT;