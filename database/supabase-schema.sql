-- =====================================================
-- DORAMA HUB - COMPLETE SUPABASE DATABASE SCHEMA
-- =====================================================
-- This file contains the complete database schema for the Dorama Hub application
-- including all tables, policies, functions, and triggers needed for full functionality

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- USERS AND AUTHENTICATION
-- =====================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    bio TEXT,
    profile_image TEXT,
    user_profile_cover TEXT,
    is_onboarding_complete BOOLEAN DEFAULT FALSE,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences
CREATE TABLE public.user_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    favorite_genres TEXT[] DEFAULT '{}',
    loved_dramas INTEGER[] DEFAULT '{}',
    notification_settings JSONB DEFAULT '{"likes": true, "comments": true, "follows": true, "rankings": true}',
    privacy_settings JSONB DEFAULT '{"profile_public": true, "lists_public": true, "rankings_public": true}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User follows
CREATE TABLE public.user_follows (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    following_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- =====================================================
-- DRAMA LISTS AND TRACKING
-- =====================================================

-- User drama lists (watching, watchlist, completed)
CREATE TABLE public.user_drama_lists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    drama_id INTEGER NOT NULL,
    list_type VARCHAR(20) NOT NULL CHECK (list_type IN ('watching', 'watchlist', 'completed')),
    current_episode INTEGER DEFAULT 0,
    total_episodes INTEGER,
    total_runtime_minutes INTEGER DEFAULT 0,
    rating DECIMAL(3,1) CHECK (rating >= 0 AND rating <= 10),
    notes TEXT,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, drama_id, list_type)
);

-- User drama progress tracking
CREATE TABLE public.user_drama_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    drama_id INTEGER NOT NULL,
    current_episode INTEGER DEFAULT 0,
    total_episodes INTEGER NOT NULL,
    watch_time_minutes INTEGER DEFAULT 0,
    last_watched TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, drama_id)
);

-- =====================================================
-- RANKINGS SYSTEM
-- =====================================================

-- User rankings
CREATE TABLE public.user_rankings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ranking items (dramas in rankings)
CREATE TABLE public.ranking_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ranking_id UUID REFERENCES public.user_rankings(id) ON DELETE CASCADE NOT NULL,
    drama_id INTEGER NOT NULL,
    rank_position INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(ranking_id, drama_id),
    UNIQUE(ranking_id, rank_position)
);

-- Ranking likes
CREATE TABLE public.ranking_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ranking_id UUID REFERENCES public.user_rankings(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(ranking_id, user_id)
);

-- Ranking comments
CREATE TABLE public.ranking_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ranking_id UUID REFERENCES public.user_rankings(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES public.ranking_comments(id) ON DELETE CASCADE,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- COMMUNITY SYSTEM
-- =====================================================

-- Community posts
CREATE TABLE public.community_posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    post_type VARCHAR(20) NOT NULL CHECK (post_type IN ('discussion', 'ranking')),
    content TEXT NOT NULL,
    mentioned_drama_id INTEGER,
    poster_image TEXT,
    drama_name VARCHAR(200),
    drama_year INTEGER,
    ranking_id UUID REFERENCES public.user_rankings(id) ON DELETE CASCADE,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Post likes
CREATE TABLE public.post_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    reaction_type VARCHAR(20) DEFAULT 'like' CHECK (reaction_type IN ('like', 'love', 'laugh', 'cry', 'angry', 'wow')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Post comments
CREATE TABLE public.post_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ACHIEVEMENTS AND GAMIFICATION
-- =====================================================

-- Achievements definitions
CREATE TABLE public.achievements (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(10) NOT NULL,
    rarity VARCHAR(20) NOT NULL CHECK (rarity IN ('common', 'rare', 'legendary')),
    is_premium BOOLEAN DEFAULT FALSE,
    requirements JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User achievements
CREATE TABLE public.user_achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    achievement_id VARCHAR(50) REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress JSONB DEFAULT '{}',
    UNIQUE(user_id, achievement_id)
);

-- User statistics
CREATE TABLE public.user_stats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    total_watch_time_minutes INTEGER DEFAULT 0,
    dramas_completed INTEGER DEFAULT 0,
    dramas_watching INTEGER DEFAULT 0,
    dramas_in_watchlist INTEGER DEFAULT 0,
    favorite_genres JSONB DEFAULT '{}',
    monthly_watch_time JSONB DEFAULT '{}',
    yearly_watch_time JSONB DEFAULT '{}',
    favorite_actor_id INTEGER,
    favorite_actor_name VARCHAR(100),
    favorite_actor_works_watched INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =====================================================
-- PREMIUM FEATURES
-- =====================================================

-- Premium subscriptions
CREATE TABLE public.premium_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    subscription_type VARCHAR(20) NOT NULL CHECK (subscription_type IN ('monthly', 'yearly')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    auto_renew BOOLEAN DEFAULT TRUE,
    payment_provider VARCHAR(50),
    payment_provider_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Premium features usage
CREATE TABLE public.premium_features (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    profile_theme VARCHAR(50) DEFAULT 'default',
    profile_border VARCHAR(50) DEFAULT 'default',
    custom_reactions BOOLEAN DEFAULT FALSE,
    advanced_filters BOOLEAN DEFAULT FALSE,
    multiple_rankings BOOLEAN DEFAULT FALSE,
    detailed_stats BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =====================================================
-- NOTIFICATIONS SYSTEM
-- =====================================================

-- Notifications
CREATE TABLE public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- DISCOVER SYSTEM
-- =====================================================

-- User skipped dramas (temporary skip for discover)
CREATE TABLE public.user_skipped_dramas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    drama_id INTEGER NOT NULL,
    skipped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, drama_id)
);

-- User daily swipes tracking
CREATE TABLE public.user_daily_swipes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    swipe_date DATE NOT NULL,
    swipes_used INTEGER DEFAULT 0,
    daily_limit INTEGER DEFAULT 20,
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, swipe_date)
);

-- =====================================================
-- DRAMA CACHE (for performance)
-- =====================================================

-- Drama cache for frequently accessed data
CREATE TABLE public.drama_cache (
    id INTEGER PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    original_name VARCHAR(200),
    poster_path TEXT,
    backdrop_path TEXT,
    overview TEXT,
    first_air_date DATE,
    vote_average DECIMAL(3,1),
    vote_count INTEGER,
    popularity DECIMAL(8,3),
    genre_ids INTEGER[],
    origin_country VARCHAR(10)[],
    number_of_episodes INTEGER,
    number_of_seasons INTEGER,
    status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User indexes
CREATE INDEX idx_users_username ON public.users(username);
CREATE INDEX idx_users_created_at ON public.users(created_at);

-- User follows indexes
CREATE INDEX idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON public.user_follows(following_id);

-- Drama lists indexes
CREATE INDEX idx_user_drama_lists_user_id ON public.user_drama_lists(user_id);
CREATE INDEX idx_user_drama_lists_drama_id ON public.user_drama_lists(drama_id);
CREATE INDEX idx_user_drama_lists_type ON public.user_drama_lists(list_type);
CREATE INDEX idx_user_drama_lists_added_at ON public.user_drama_lists(added_at);

-- Rankings indexes
CREATE INDEX idx_user_rankings_user_id ON public.user_rankings(user_id);
CREATE INDEX idx_user_rankings_public ON public.user_rankings(is_public);
CREATE INDEX idx_user_rankings_created_at ON public.user_rankings(created_at);
CREATE INDEX idx_ranking_items_ranking_id ON public.ranking_items(ranking_id);
CREATE INDEX idx_ranking_likes_ranking_id ON public.ranking_likes(ranking_id);
CREATE INDEX idx_ranking_comments_ranking_id ON public.ranking_comments(ranking_id);

-- Community posts indexes
CREATE INDEX idx_community_posts_user_id ON public.community_posts(user_id);
CREATE INDEX idx_community_posts_type ON public.community_posts(post_type);
CREATE INDEX idx_community_posts_created_at ON public.community_posts(created_at);
CREATE INDEX idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX idx_post_comments_post_id ON public.post_comments(post_id);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

-- Discover system indexes
CREATE INDEX idx_user_skipped_dramas_user_id ON public.user_skipped_dramas(user_id);
CREATE INDEX idx_user_skipped_dramas_expires_at ON public.user_skipped_dramas(expires_at);
CREATE INDEX idx_user_daily_swipes_user_date ON public.user_daily_swipes(user_id, swipe_date);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_drama_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_drama_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skipped_dramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all public profiles" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- User preferences policies
CREATE POLICY "Users can manage own preferences" ON public.user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- User follows policies
CREATE POLICY "Users can view all follows" ON public.user_follows
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own follows" ON public.user_follows
    FOR ALL USING (auth.uid() = follower_id);

-- User drama lists policies
CREATE POLICY "Users can view public lists" ON public.user_drama_lists
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM public.users 
            WHERE id = user_id
        )
    );

CREATE POLICY "Users can manage own lists" ON public.user_drama_lists
    FOR ALL USING (auth.uid() = user_id);

-- User drama progress policies
CREATE POLICY "Users can manage own progress" ON public.user_drama_progress
    FOR ALL USING (auth.uid() = user_id);

-- User skipped dramas policies
CREATE POLICY "Users can manage own skipped dramas" ON public.user_skipped_dramas
    FOR ALL USING (auth.uid() = user_id);

-- User daily swipes policies
CREATE POLICY "Users can manage own daily swipes" ON public.user_daily_swipes
    FOR ALL USING (auth.uid() = user_id);

-- User rankings policies
CREATE POLICY "Users can view public rankings" ON public.user_rankings
    FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can manage own rankings" ON public.user_rankings
    FOR ALL USING (auth.uid() = user_id);

-- Ranking items policies
CREATE POLICY "Users can view ranking items for public rankings" ON public.ranking_items
    FOR SELECT USING (
        ranking_id IN (
            SELECT id FROM public.user_rankings 
            WHERE is_public = true OR user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own ranking items" ON public.ranking_items
    FOR ALL USING (
        ranking_id IN (
            SELECT id FROM public.user_rankings 
            WHERE user_id = auth.uid()
        )
    );

-- Ranking likes policies
CREATE POLICY "Users can view all ranking likes" ON public.ranking_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own ranking likes" ON public.ranking_likes
    FOR ALL USING (auth.uid() = user_id);

-- Ranking comments policies
CREATE POLICY "Users can view comments on public rankings" ON public.ranking_comments
    FOR SELECT USING (
        ranking_id IN (
            SELECT id FROM public.user_rankings 
            WHERE is_public = true
        )
    );

CREATE POLICY "Users can manage own comments" ON public.ranking_comments
    FOR ALL USING (auth.uid() = user_id);

-- Community posts policies
CREATE POLICY "Users can view all community posts" ON public.community_posts
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own posts" ON public.community_posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON public.community_posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON public.community_posts
    FOR DELETE USING (auth.uid() = user_id);

-- Post likes policies
CREATE POLICY "Users can view all post likes" ON public.post_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own post likes" ON public.post_likes
    FOR ALL USING (auth.uid() = user_id);

-- Post comments policies
CREATE POLICY "Users can view all post comments" ON public.post_comments
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own post comments" ON public.post_comments
    FOR ALL USING (auth.uid() = user_id);

-- User achievements policies
CREATE POLICY "Users can view own achievements" ON public.user_achievements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage user achievements" ON public.user_achievements
    FOR ALL USING (auth.uid() = user_id);

-- User stats policies
CREATE POLICY "Users can view own stats" ON public.user_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON public.user_stats
    FOR ALL USING (auth.uid() = user_id);

-- Premium subscriptions policies
CREATE POLICY "Users can view own subscription" ON public.premium_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own subscription" ON public.premium_subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Premium features policies
CREATE POLICY "Users can manage own premium features" ON public.premium_features
    FOR ALL USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can manage own notifications" ON public.notifications
    FOR ALL USING (auth.uid() = user_id);

-- Public read access for achievements and drama cache
CREATE POLICY "Anyone can view achievements" ON public.achievements
    FOR SELECT USING (true);

CREATE POLICY "Anyone can view drama cache" ON public.drama_cache
    FOR SELECT USING (true);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_drama_lists_updated_at BEFORE UPDATE ON public.user_drama_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_drama_progress_updated_at BEFORE UPDATE ON public.user_drama_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_rankings_updated_at BEFORE UPDATE ON public.user_rankings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ranking_comments_updated_at BEFORE UPDATE ON public.ranking_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_posts_updated_at BEFORE UPDATE ON public.community_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_comments_updated_at BEFORE UPDATE ON public.post_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON public.user_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_premium_subscriptions_updated_at BEFORE UPDATE ON public.premium_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_premium_features_updated_at BEFORE UPDATE ON public.premium_features
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drama_cache_updated_at BEFORE UPDATE ON public.drama_cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_daily_swipes_updated_at BEFORE UPDATE ON public.user_daily_swipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update follower/following counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment following count for follower
        UPDATE public.users 
        SET following_count = following_count + 1 
        WHERE id = NEW.follower_id;
        
        -- Increment followers count for followed user
        UPDATE public.users 
        SET followers_count = followers_count + 1 
        WHERE id = NEW.following_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement following count for follower
        UPDATE public.users 
        SET following_count = following_count - 1 
        WHERE id = OLD.follower_id;
        
        -- Decrement followers count for followed user
        UPDATE public.users 
        SET followers_count = followers_count - 1 
        WHERE id = OLD.following_id;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_follow_counts_trigger
    AFTER INSERT OR DELETE ON public.user_follows
    FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- Function to update ranking likes count
CREATE OR REPLACE FUNCTION update_ranking_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.user_rankings 
        SET likes_count = likes_count + 1 
        WHERE id = NEW.ranking_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.user_rankings 
        SET likes_count = likes_count - 1 
        WHERE id = OLD.ranking_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ranking_likes_count_trigger
    AFTER INSERT OR DELETE ON public.ranking_likes
    FOR EACH ROW EXECUTE FUNCTION update_ranking_likes_count();

-- Function to update ranking comments count
CREATE OR REPLACE FUNCTION update_ranking_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.user_rankings 
        SET comments_count = comments_count + 1 
        WHERE id = NEW.ranking_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.user_rankings 
        SET comments_count = comments_count - 1 
        WHERE id = OLD.ranking_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ranking_comments_count_trigger
    AFTER INSERT OR DELETE ON public.ranking_comments
    FOR EACH ROW EXECUTE FUNCTION update_ranking_comments_count();

-- Function to update post likes count
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.community_posts 
        SET likes_count = likes_count + 1 
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.community_posts 
        SET likes_count = likes_count - 1 
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_post_likes_count_trigger
    AFTER INSERT OR DELETE ON public.post_likes
    FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- Function to update post comments count
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.community_posts 
        SET comments_count = comments_count + 1 
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.community_posts 
        SET comments_count = comments_count - 1 
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_post_comments_count_trigger
    AFTER INSERT OR DELETE ON public.post_comments
    FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- Function to create user profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $
DECLARE
    base_username TEXT;
    final_username TEXT;
    counter INTEGER := 0;
BEGIN
    -- Get base username from metadata or generate one
    base_username := COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8));
    final_username := lower(base_username);
    
    -- Ensure username is unique
    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = final_username) LOOP
        counter := counter + 1;
        final_username := lower(base_username) || '_' || counter::text;
    END LOOP;
    
    -- Insert user profile
    INSERT INTO public.users (id, username, display_name)
    VALUES (
        NEW.id,
        final_username,
        COALESCE(NEW.raw_user_meta_data->>'display_name', base_username)
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

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default achievements
INSERT INTO public.achievements (id, name, description, icon, rarity, is_premium, requirements) VALUES
('first-drama', 'Primeiro Passo', 'Adicione seu primeiro K-drama à lista', '🎬', 'common', false, '{"type": "list_add", "count": 1}'),
('marathoner-beginner', 'Maratonista Iniciante', 'Complete seu primeiro K-drama', '🏃‍♀️', 'common', false, '{"type": "complete", "count": 1}'),
('critic', 'Crítico de Sofá', 'Faça 10 comentários', '💬', 'common', false, '{"type": "comments", "count": 10}'),
('opinion-maker', 'Formador de Opinião', 'Crie seu primeiro ranking', '📝', 'common', false, '{"type": "ranking", "count": 1}'),
('social-butterfly', 'Borboleta Social', 'Siga 10 usuários', '🦋', 'common', false, '{"type": "follows", "count": 10}'),
('collector', 'Colecionador', 'Tenha 50 dramas na sua lista "Quero Ver"', '📚', 'common', false, '{"type": "watchlist", "count": 50}'),
('romance-expert', 'Especialista em Romance', 'Assista a 20 K-dramas de romance', '💕', 'rare', true, '{"type": "genre_complete", "genre": "romance", "count": 20}'),
('thriller-master', 'Mestre do Suspense', 'Complete 15 K-dramas de thriller', '🔍', 'rare', true, '{"type": "genre_complete", "genre": "thriller", "count": 15}'),
('time-traveler', 'Viajante do Tempo', 'Assista a 10 K-dramas históricos', '⏰', 'rare', true, '{"type": "genre_complete", "genre": "historical", "count": 10}'),
('community-legend', 'Lenda da Comunidade', 'Receba 100 curtidas em um ranking', '👑', 'legendary', true, '{"type": "ranking_likes", "count": 100}'),
('marathon-king', 'Rei da Maratona', 'Assista a mais de 100 horas em um mês', '🏆', 'legendary', true, '{"type": "monthly_watch_time", "hours": 100}'),
('trendsetter', 'Formador de Tendências', 'Tenha um ranking em destaque na comunidade', '🌟', 'legendary', true, '{"type": "featured_ranking", "count": 1}');

-- =====================================================
-- USEFUL VIEWS
-- =====================================================

-- View for user profiles with stats
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

-- View for rankings with user info
CREATE VIEW public.rankings_with_details AS
SELECT 
    r.*,
    u.username,
    u.display_name,
    u.profile_image,
    COALESCE(
        json_agg(
            json_build_object(
                'drama_id', ri.drama_id,
                'rank_position', ri.rank_position
            ) ORDER BY ri.rank_position
        ) FILTER (WHERE ri.id IS NOT NULL),
        '[]'::json
    ) as ranking_items
FROM public.user_rankings r
JOIN public.users u ON r.user_id = u.id
LEFT JOIN public.ranking_items ri ON r.id = ri.ranking_id
WHERE r.is_public = true
GROUP BY r.id, u.username, u.display_name, u.profile_image;

-- View for community feed
CREATE VIEW public.community_feed AS
SELECT 
    cp.*,
    u.username,
    u.display_name,
    u.profile_image,
    CASE 
        WHEN cp.post_type = 'ranking' THEN r.title
        ELSE NULL
    END as ranking_title
FROM public.community_posts cp
JOIN public.users u ON cp.user_id = u.id
LEFT JOIN public.user_rankings r ON cp.ranking_id = r.id
ORDER BY cp.created_at DESC;

-- Function to clean expired skipped dramas
CREATE OR REPLACE FUNCTION clean_expired_skipped_dramas()
RETURNS INTEGER AS $
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.user_skipped_dramas 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get user's drama list
CREATE OR REPLACE FUNCTION get_user_drama_list(user_uuid UUID, list_name TEXT)
RETURNS TABLE (
    drama_id INTEGER,
    current_episode INTEGER,
    total_episodes INTEGER,
    rating DECIMAL(3,1),
    added_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        udl.drama_id,
        udl.current_episode,
        udl.total_episodes,
        udl.rating,
        udl.added_at
    FROM public.user_drama_lists udl
    WHERE udl.user_id = user_uuid AND udl.list_type = list_name
    ORDER BY udl.added_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's ranking
CREATE OR REPLACE FUNCTION get_user_ranking(user_uuid UUID)
RETURNS TABLE (
    ranking_id UUID,
    title VARCHAR(100),
    drama_id INTEGER,
    rank_position INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id as ranking_id,
        r.title,
        ri.drama_id,
        ri.rank_position
    FROM public.user_rankings r
    LEFT JOIN public.ranking_items ri ON r.id = ri.ranking_id
    WHERE r.user_id = user_uuid AND r.is_public = true
    ORDER BY ri.rank_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user follows another user
CREATE OR REPLACE FUNCTION is_following(follower_uuid UUID, following_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_follows 
        WHERE follower_id = follower_uuid AND following_id = following_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

-- This schema provides:
-- 1. Complete user management with profiles, preferences, and follows
-- 2. Drama tracking with lists (watching, watchlist, completed) and progress
-- 3. Ranking system with likes and comments
-- 4. Community features with posts, likes, and comments
-- 5. Achievement system with gamification
-- 6. Premium subscription management
-- 7. Notification system
-- 8. Performance optimizations with indexes
-- 9. Row Level Security for data protection
-- 10. Triggers for automatic count updates
-- 11. Helper functions and views for common queries

-- To use this schema:
-- 1. Run this SQL in your Supabase SQL editor
-- 2. Configure your app to use the Supabase client
-- 3. Implement the frontend logic to interact with these tables
-- 4. Set up authentication flows
-- 5. Configure real-time subscriptions as needed