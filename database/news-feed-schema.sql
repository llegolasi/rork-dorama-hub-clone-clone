-- News Feed Feature Schema
-- This schema supports the news functionality with Twitter/X feed integration

-- Table to store news feed configuration
CREATE TABLE news_feed_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feed_name VARCHAR(100) NOT NULL,
    twitter_username VARCHAR(50) NOT NULL, -- The official Dorama Hub Twitter account
    widget_id VARCHAR(100), -- Twitter widget ID from publish.twitter.com
    embed_code TEXT, -- Full embed code from Twitter
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track user interactions with news (for analytics)
CREATE TABLE news_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL, -- 'view', 'click_twitter', 'view_media', 'share'
    tweet_id VARCHAR(100), -- Twitter tweet ID if available
    tweet_url TEXT, -- Full URL of the tweet
    interaction_data JSONB, -- Additional data about the interaction
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store featured news for the home carousel (optional - for manual curation)
CREATE TABLE featured_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    image_url TEXT,
    tweet_url TEXT,
    tweet_id VARCHAR(100),
    is_featured BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE, -- When to stop featuring this news
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track news feed views (for engagement analytics)
CREATE TABLE news_feed_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    view_type VARCHAR(50) NOT NULL, -- 'home_carousel', 'full_feed'
    session_duration INTEGER, -- How long user spent viewing (in seconds)
    tweets_viewed INTEGER DEFAULT 0, -- Number of tweets scrolled through
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_news_interactions_user_id ON news_interactions(user_id);
CREATE INDEX idx_news_interactions_type ON news_interactions(interaction_type);
CREATE INDEX idx_news_interactions_created_at ON news_interactions(created_at DESC);
CREATE INDEX idx_featured_news_featured ON featured_news(is_featured, display_order);
CREATE INDEX idx_featured_news_expires ON featured_news(expires_at);
CREATE INDEX idx_news_feed_views_user_id ON news_feed_views(user_id);
CREATE INDEX idx_news_feed_views_created_at ON news_feed_views(created_at DESC);

-- RLS Policies
ALTER TABLE news_feed_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_feed_views ENABLE ROW LEVEL SECURITY;

-- News feed config is readable by all authenticated users
CREATE POLICY "News feed config is readable by authenticated users" ON news_feed_config
    FOR SELECT TO authenticated USING (true);

-- Users can only see their own interactions
CREATE POLICY "Users can view their own news interactions" ON news_interactions
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own news interactions" ON news_interactions
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Featured news is readable by all authenticated users
CREATE POLICY "Featured news is readable by authenticated users" ON featured_news
    FOR SELECT TO authenticated USING (true);

-- Users can only see their own feed views
CREATE POLICY "Users can view their own news feed views" ON news_feed_views
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own news feed views" ON news_feed_views
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Insert default configuration for Dorama Hub Twitter feed
INSERT INTO news_feed_config (feed_name, twitter_username, is_active, display_order) 
VALUES ('Dorama Hub Official', 'doramahub_official', true, 1);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_news_feed_config_updated_at 
    BEFORE UPDATE ON news_feed_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_featured_news_updated_at 
    BEFORE UPDATE ON featured_news 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old interaction data (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_news_data()
RETURNS void AS $$
BEGIN
    -- Delete interactions older than 6 months
    DELETE FROM news_interactions 
    WHERE created_at < NOW() - INTERVAL '6 months';
    
    -- Delete feed views older than 3 months
    DELETE FROM news_feed_views 
    WHERE created_at < NOW() - INTERVAL '3 months';
    
    -- Delete expired featured news
    DELETE FROM featured_news 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ language 'plpgsql';