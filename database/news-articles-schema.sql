-- News Articles Feature Schema
-- This schema supports custom news articles instead of Twitter feed integration

-- Table to store news articles
CREATE TABLE news_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft', 'published', 'archived'
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL UNIQUE,
    tags TEXT[] DEFAULT '{}', -- Array of tags
    cover_image_url TEXT, -- URL for the cover image
    html_content TEXT NOT NULL, -- Full HTML content of the article
    plain_text_content TEXT NOT NULL, -- Plain text version for search/preview
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name VARCHAR(100), -- Store author name for display
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- SEO and metadata
    meta_description TEXT,
    reading_time_minutes INTEGER, -- Estimated reading time
    
    -- Engagement metrics
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    
    -- Featured status
    is_featured BOOLEAN DEFAULT false,
    featured_order INTEGER DEFAULT 0,
    featured_until TIMESTAMP WITH TIME ZONE
);

-- Table to store article tags (normalized)
CREATE TABLE article_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7), -- Hex color for tag display
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table for article-tag relationships
CREATE TABLE article_tag_relations (
    article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES article_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);

-- Table to track user interactions with articles
CREATE TABLE article_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL, -- 'view', 'like', 'share', 'bookmark'
    interaction_data JSONB, -- Additional data about the interaction
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate interactions of same type
    UNIQUE(user_id, article_id, interaction_type)
);

-- Table to track article views for analytics
CREATE TABLE article_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Allow anonymous views
    ip_address INET, -- For anonymous tracking
    user_agent TEXT,
    referrer TEXT,
    reading_time_seconds INTEGER, -- How long user spent reading
    scroll_percentage INTEGER, -- How much of article was scrolled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for user bookmarks
CREATE TABLE article_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, article_id)
);

-- Table for article comments (optional feature)
CREATE TABLE article_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES article_comments(id) ON DELETE CASCADE, -- For nested comments
    content TEXT NOT NULL,
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_news_articles_status ON news_articles(status);
CREATE INDEX idx_news_articles_published_at ON news_articles(published_at DESC);
CREATE INDEX idx_news_articles_featured ON news_articles(is_featured, featured_order);
CREATE INDEX idx_news_articles_slug ON news_articles(slug);
CREATE INDEX idx_news_articles_tags ON news_articles USING GIN(tags);
CREATE INDEX idx_news_articles_author ON news_articles(author_id);

CREATE INDEX idx_article_interactions_user_id ON article_interactions(user_id);
CREATE INDEX idx_article_interactions_article_id ON article_interactions(article_id);
CREATE INDEX idx_article_interactions_type ON article_interactions(interaction_type);

CREATE INDEX idx_article_views_article_id ON article_views(article_id);
CREATE INDEX idx_article_views_created_at ON article_views(created_at DESC);

CREATE INDEX idx_article_bookmarks_user_id ON article_bookmarks(user_id);
CREATE INDEX idx_article_bookmarks_article_id ON article_bookmarks(article_id);

CREATE INDEX idx_article_comments_article_id ON article_comments(article_id);
CREATE INDEX idx_article_comments_user_id ON article_comments(user_id);
CREATE INDEX idx_article_comments_parent ON article_comments(parent_comment_id);

-- Full text search index
CREATE INDEX idx_news_articles_search ON news_articles USING GIN(
    to_tsvector('portuguese', title || ' ' || plain_text_content)
);

-- RLS Policies
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_tag_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_comments ENABLE ROW LEVEL SECURITY;

-- Published articles are readable by all authenticated users
CREATE POLICY "Published articles are readable by authenticated users" ON news_articles
    FOR SELECT TO authenticated USING (status = 'published');

-- Authors can manage their own articles
CREATE POLICY "Authors can manage their own articles" ON news_articles
    FOR ALL TO authenticated USING (auth.uid() = author_id);

-- Tags are readable by all authenticated users
CREATE POLICY "Tags are readable by authenticated users" ON article_tags
    FOR SELECT TO authenticated USING (true);

-- Tag relations follow article permissions
CREATE POLICY "Tag relations follow article permissions" ON article_tag_relations
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM news_articles 
            WHERE id = article_id AND status = 'published'
        )
    );

-- Users can manage their own interactions
CREATE POLICY "Users can view their own interactions" ON article_interactions
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interactions" ON article_interactions
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interactions" ON article_interactions
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interactions" ON article_interactions
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Article views can be inserted by anyone (for analytics)
CREATE POLICY "Anyone can insert article views" ON article_views
    FOR INSERT TO authenticated WITH CHECK (true);

-- Users can manage their own bookmarks
CREATE POLICY "Users can manage their own bookmarks" ON article_bookmarks
    FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Users can manage their own comments
CREATE POLICY "Users can manage their own comments" ON article_comments
    FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Comments are readable by all authenticated users
CREATE POLICY "Comments are readable by authenticated users" ON article_comments
    FOR SELECT TO authenticated USING (NOT is_deleted);

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update article view count
CREATE OR REPLACE FUNCTION increment_article_view_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE news_articles 
    SET view_count = view_count + 1 
    WHERE id = NEW.article_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update article like count
CREATE OR REPLACE FUNCTION update_article_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.interaction_type = 'like' THEN
        UPDATE news_articles 
        SET like_count = like_count + 1 
        WHERE id = NEW.article_id;
    ELSIF TG_OP = 'DELETE' AND OLD.interaction_type = 'like' THEN
        UPDATE news_articles 
        SET like_count = like_count - 1 
        WHERE id = OLD.article_id;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate reading time
CREATE OR REPLACE FUNCTION calculate_reading_time(content TEXT)
RETURNS INTEGER AS $$
BEGIN
    -- Estimate reading time based on average 200 words per minute
    RETURN GREATEST(1, (array_length(string_to_array(content, ' '), 1) / 200.0)::INTEGER);
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_news_articles_updated_at 
    BEFORE UPDATE ON news_articles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_article_comments_updated_at 
    BEFORE UPDATE ON article_comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER increment_view_count_trigger
    AFTER INSERT ON article_views
    FOR EACH ROW EXECUTE FUNCTION increment_article_view_count();

CREATE TRIGGER update_like_count_trigger
    AFTER INSERT OR DELETE ON article_interactions
    FOR EACH ROW EXECUTE FUNCTION update_article_like_count();

-- Trigger to auto-calculate reading time
CREATE OR REPLACE FUNCTION auto_calculate_reading_time()
RETURNS TRIGGER AS $$
BEGIN
    NEW.reading_time_minutes = calculate_reading_time(NEW.plain_text_content);
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER auto_reading_time_trigger
    BEFORE INSERT OR UPDATE ON news_articles
    FOR EACH ROW EXECUTE FUNCTION auto_calculate_reading_time();

-- Function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_article_data()
RETURNS void AS $$
BEGIN
    -- Delete old article views (keep last 6 months)
    DELETE FROM article_views 
    WHERE created_at < NOW() - INTERVAL '6 months';
    
    -- Delete old interactions (keep last 1 year)
    DELETE FROM article_interactions 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Archive old articles that are no longer featured
    UPDATE news_articles 
    SET status = 'archived' 
    WHERE status = 'published' 
    AND created_at < NOW() - INTERVAL '2 years'
    AND NOT is_featured;
END;
$$ language 'plpgsql';

-- Insert some default tags
INSERT INTO article_tags (name, slug, description, color) VALUES
('K-Drama', 'k-drama', 'Notícias sobre K-Dramas', '#FF6B9D'),
('Lançamentos', 'lancamentos', 'Novos lançamentos e estreias', '#4ECDC4'),
('Atores', 'atores', 'Notícias sobre atores e atrizes', '#45B7D1'),
('Bastidores', 'bastidores', 'Conteúdo dos bastidores', '#96CEB4'),
('Streaming', 'streaming', 'Plataformas de streaming', '#FFEAA7'),
('Entrevistas', 'entrevistas', 'Entrevistas exclusivas', '#DDA0DD'),
('Análises', 'analises', 'Análises e críticas', '#98D8C8'),
('Eventos', 'eventos', 'Eventos e premiações', '#F7DC6F');