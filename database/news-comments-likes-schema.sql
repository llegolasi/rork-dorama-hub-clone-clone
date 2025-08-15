-- News Comments and Likes System
-- This schema adds comments and likes functionality to news articles

-- Table for news article likes
CREATE TABLE news_article_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    article_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL, -- Using posts table as it stores news
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate likes
    UNIQUE(user_id, article_id)
);

-- Table for news article comments
CREATE TABLE news_article_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL, -- Using posts table as it stores news
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    parent_comment_id UUID REFERENCES news_article_comments(id) ON DELETE CASCADE, -- For nested comments/replies
    content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 1000),
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for comment likes
CREATE TABLE news_comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    comment_id UUID REFERENCES news_article_comments(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate likes
    UNIQUE(user_id, comment_id)
);

-- Indexes for better performance
CREATE INDEX idx_news_article_likes_user_id ON news_article_likes(user_id);
CREATE INDEX idx_news_article_likes_article_id ON news_article_likes(article_id);
CREATE INDEX idx_news_article_likes_created_at ON news_article_likes(created_at DESC);

CREATE INDEX idx_news_article_comments_article_id ON news_article_comments(article_id);
CREATE INDEX idx_news_article_comments_user_id ON news_article_comments(user_id);
CREATE INDEX idx_news_article_comments_parent ON news_article_comments(parent_comment_id);
CREATE INDEX idx_news_article_comments_created_at ON news_article_comments(created_at DESC);

CREATE INDEX idx_news_comment_likes_user_id ON news_comment_likes(user_id);
CREATE INDEX idx_news_comment_likes_comment_id ON news_comment_likes(comment_id);

-- RLS Policies
ALTER TABLE news_article_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_article_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_comment_likes ENABLE ROW LEVEL SECURITY;

-- Article likes policies
CREATE POLICY "Users can view all article likes" ON news_article_likes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage their own article likes" ON news_article_likes
    FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Article comments policies
CREATE POLICY "Users can view non-deleted comments" ON news_article_comments
    FOR SELECT TO authenticated USING (NOT is_deleted);

CREATE POLICY "Users can insert their own comments" ON news_article_comments
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON news_article_comments
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON news_article_comments
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Comment likes policies
CREATE POLICY "Users can view all comment likes" ON news_comment_likes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage their own comment likes" ON news_comment_likes
    FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Functions to update counters
CREATE OR REPLACE FUNCTION update_article_like_count_news()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment like count
        UPDATE posts 
        SET updated_at = NOW()
        WHERE id = NEW.article_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement like count
        UPDATE posts 
        SET updated_at = NOW()
        WHERE id = OLD.article_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_comment_like_count_news()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment comment like count
        UPDATE news_article_comments 
        SET like_count = like_count + 1,
            updated_at = NOW()
        WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement comment like count
        UPDATE news_article_comments 
        SET like_count = like_count - 1,
            updated_at = NOW()
        WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Function to update comment updated_at
CREATE OR REPLACE FUNCTION update_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_article_like_count_trigger
    AFTER INSERT OR DELETE ON news_article_likes
    FOR EACH ROW EXECUTE FUNCTION update_article_like_count_news();

CREATE TRIGGER update_comment_like_count_trigger
    AFTER INSERT OR DELETE ON news_comment_likes
    FOR EACH ROW EXECUTE FUNCTION update_comment_like_count_news();

CREATE TRIGGER update_news_comments_updated_at 
    BEFORE UPDATE ON news_article_comments 
    FOR EACH ROW EXECUTE FUNCTION update_comment_updated_at();

-- Function to get article stats (likes and comments count)
CREATE OR REPLACE FUNCTION get_article_stats(article_uuid UUID)
RETURNS TABLE(
    likes_count BIGINT,
    comments_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE((SELECT COUNT(*) FROM news_article_likes WHERE article_id = article_uuid), 0) as likes_count,
        COALESCE((SELECT COUNT(*) FROM news_article_comments WHERE article_id = article_uuid AND NOT is_deleted), 0) as comments_count;
END;
$$ language 'plpgsql';

-- Function to check if user liked an article
CREATE OR REPLACE FUNCTION user_liked_article(article_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM news_article_likes 
        WHERE article_id = article_uuid AND user_id = user_uuid
    );
END;
$$ language 'plpgsql';

-- Function to check if user liked a comment
CREATE OR REPLACE FUNCTION user_liked_comment(comment_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM news_comment_likes 
        WHERE comment_id = comment_uuid AND user_id = user_uuid
    );
END;
$$ language 'plpgsql';

-- View for comments with user info and like status
CREATE OR REPLACE VIEW news_comments_with_user AS
SELECT 
    c.id,
    c.article_id,
    c.user_id,
    c.parent_comment_id,
    c.content,
    c.is_edited,
    c.is_deleted,
    c.like_count,
    c.created_at,
    c.updated_at,
    COALESCE(u.username, 'user_' || SUBSTRING(c.user_id::text, 1, 8)) as username,
    COALESCE(u.display_name, 'Usuário') as full_name,
    u.profile_image as avatar_url,
    -- Count replies
    (SELECT COUNT(*) FROM news_article_comments replies 
     WHERE replies.parent_comment_id = c.id AND NOT replies.is_deleted) as replies_count
FROM news_article_comments c
LEFT JOIN public.users u ON c.user_id = u.id
WHERE NOT c.is_deleted;

-- Grant permissions on the view
GRANT SELECT ON news_comments_with_user TO authenticated;
GRANT SELECT ON news_comments_with_user TO anon;