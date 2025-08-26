-- =====================================================
-- DRAMA REVIEWS SYSTEM
-- =====================================================
-- This file contains the database schema for the drama review system
-- Users can only review dramas they have completed

-- Drama reviews table
CREATE TABLE public.drama_reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    drama_id INTEGER NOT NULL,
    recommendation_type VARCHAR(20) NOT NULL CHECK (recommendation_type IN ('recommend', 'not_recommend')),
    review_text TEXT,
    rating DECIMAL(3,1) CHECK (rating >= 0 AND rating <= 10),
    is_spoiler BOOLEAN DEFAULT FALSE,
    likes_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, drama_id)
);

-- Review likes table
CREATE TABLE public.review_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    review_id UUID REFERENCES public.drama_reviews(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    like_type VARCHAR(20) DEFAULT 'like' CHECK (like_type IN ('like', 'helpful')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(review_id, user_id, like_type)
);

-- Review comments table
CREATE TABLE public.review_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    review_id UUID REFERENCES public.drama_reviews(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES public.review_comments(id) ON DELETE CASCADE,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_drama_reviews_drama_id ON public.drama_reviews(drama_id);
CREATE INDEX idx_drama_reviews_user_id ON public.drama_reviews(user_id);
CREATE INDEX idx_drama_reviews_created_at ON public.drama_reviews(created_at);
CREATE INDEX idx_drama_reviews_recommendation ON public.drama_reviews(recommendation_type);
CREATE INDEX idx_review_likes_review_id ON public.review_likes(review_id);
CREATE INDEX idx_review_comments_review_id ON public.review_comments(review_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.drama_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;

-- Drama reviews policies
CREATE POLICY "Anyone can view drama reviews" ON public.drama_reviews
    FOR SELECT USING (true);

CREATE POLICY "Users can create reviews for completed dramas" ON public.drama_reviews
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.user_drama_lists 
            WHERE user_id = auth.uid() 
            AND drama_id = NEW.drama_id 
            AND list_type = 'completed'
        )
    );

CREATE POLICY "Users can update own reviews" ON public.drama_reviews
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews" ON public.drama_reviews
    FOR DELETE USING (auth.uid() = user_id);

-- Review likes policies
CREATE POLICY "Anyone can view review likes" ON public.review_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own review likes" ON public.review_likes
    FOR ALL USING (auth.uid() = user_id);

-- Review comments policies
CREATE POLICY "Anyone can view review comments" ON public.review_comments
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own review comments" ON public.review_comments
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to update review likes count
CREATE OR REPLACE FUNCTION update_review_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.like_type = 'like' THEN
            UPDATE public.drama_reviews 
            SET likes_count = likes_count + 1 
            WHERE id = NEW.review_id;
        ELSIF NEW.like_type = 'helpful' THEN
            UPDATE public.drama_reviews 
            SET helpful_count = helpful_count + 1 
            WHERE id = NEW.review_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.like_type = 'like' THEN
            UPDATE public.drama_reviews 
            SET likes_count = likes_count - 1 
            WHERE id = OLD.review_id;
        ELSIF OLD.like_type = 'helpful' THEN
            UPDATE public.drama_reviews 
            SET helpful_count = helpful_count - 1 
            WHERE id = OLD.review_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_review_likes_count_trigger
    AFTER INSERT OR DELETE ON public.review_likes
    FOR EACH ROW EXECUTE FUNCTION update_review_likes_count();

-- Apply updated_at trigger to review tables
CREATE TRIGGER update_drama_reviews_updated_at BEFORE UPDATE ON public.drama_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_comments_updated_at BEFORE UPDATE ON public.review_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically mark drama as completed when reviewed
CREATE OR REPLACE FUNCTION auto_complete_drama_on_review()
RETURNS TRIGGER AS $$
BEGIN
    -- Move drama to completed list if not already there
    INSERT INTO public.user_drama_lists (user_id, drama_id, list_type, total_episodes)
    VALUES (NEW.user_id, NEW.drama_id, 'completed', 
        COALESCE(
            (SELECT total_episodes FROM public.user_drama_lists 
             WHERE user_id = NEW.user_id AND drama_id = NEW.drama_id LIMIT 1),
            0
        )
    )
    ON CONFLICT (user_id, drama_id, list_type) DO NOTHING;
    
    -- Remove from watching and watchlist
    DELETE FROM public.user_drama_lists 
    WHERE user_id = NEW.user_id 
    AND drama_id = NEW.drama_id 
    AND list_type IN ('watching', 'watchlist');
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER auto_complete_drama_on_review_trigger
    AFTER INSERT ON public.drama_reviews
    FOR EACH ROW EXECUTE FUNCTION auto_complete_drama_on_review();

-- =====================================================
-- VIEWS FOR REVIEWS
-- =====================================================

-- View for drama reviews with user info
CREATE VIEW public.drama_reviews_with_user AS
SELECT 
    dr.*,
    u.username,
    u.display_name,
    u.profile_image,
    CASE 
        WHEN ps.status = 'active' AND ps.expires_at > NOW() THEN true 
        ELSE false 
    END as is_premium_user
FROM public.drama_reviews dr
JOIN public.users u ON dr.user_id = u.id
LEFT JOIN public.premium_subscriptions ps ON u.id = ps.user_id
ORDER BY dr.created_at DESC;

-- View for drama review statistics
CREATE VIEW public.drama_review_stats AS
SELECT 
    drama_id,
    COUNT(*) as total_reviews,
    COUNT(CASE WHEN recommendation_type = 'recommend' THEN 1 END) as recommend_count,
    COUNT(CASE WHEN recommendation_type = 'not_recommend' THEN 1 END) as not_recommend_count,
    ROUND(
        (COUNT(CASE WHEN recommendation_type = 'recommend' THEN 1 END)::DECIMAL / COUNT(*)) * 100, 
        1
    ) as recommend_percentage,
    AVG(rating) as average_rating,
    SUM(likes_count) as total_likes,
    SUM(helpful_count) as total_helpful
FROM public.drama_reviews
GROUP BY drama_id;

-- =====================================================
-- HELPER FUNCTIONS FOR REVIEWS
-- =====================================================

-- Function to check if user can review a drama
CREATE OR REPLACE FUNCTION can_user_review_drama(user_uuid UUID, drama_id_param INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user has completed the drama
    RETURN EXISTS (
        SELECT 1 FROM public.user_drama_lists 
        WHERE user_id = user_uuid 
        AND drama_id = drama_id_param 
        AND list_type = 'completed'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get drama reviews with pagination
CREATE OR REPLACE FUNCTION get_drama_reviews(
    drama_id_param INTEGER,
    page_offset INTEGER DEFAULT 0,
    page_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    review_id UUID,
    user_id UUID,
    username VARCHAR(50),
    display_name VARCHAR(100),
    profile_image TEXT,
    recommendation_type VARCHAR(20),
    review_text TEXT,
    rating DECIMAL(3,1),
    likes_count INTEGER,
    helpful_count INTEGER,
    is_premium_user BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dr.id as review_id,
        dr.user_id,
        u.username,
        u.display_name,
        u.profile_image,
        dr.recommendation_type,
        dr.review_text,
        dr.rating,
        dr.likes_count,
        dr.helpful_count,
        CASE 
            WHEN ps.status = 'active' AND ps.expires_at > NOW() THEN true 
            ELSE false 
        END as is_premium_user,
        dr.created_at
    FROM public.drama_reviews dr
    JOIN public.users u ON dr.user_id = u.id
    LEFT JOIN public.premium_subscriptions ps ON u.id = ps.user_id
    WHERE dr.drama_id = drama_id_param
    ORDER BY dr.helpful_count DESC, dr.likes_count DESC, dr.created_at DESC
    LIMIT page_limit OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;