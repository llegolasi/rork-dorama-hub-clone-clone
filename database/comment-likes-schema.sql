-- Comment likes tables for posts and rankings
-- This file creates the necessary tables for liking comments in posts and rankings

-- Post comment likes table
CREATE TABLE IF NOT EXISTS post_comment_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- Ranking comment likes table
CREATE TABLE IF NOT EXISTS ranking_comment_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES ranking_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_post_comment_likes_comment_id ON post_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_post_comment_likes_user_id ON post_comment_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_ranking_comment_likes_comment_id ON ranking_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_ranking_comment_likes_user_id ON ranking_comment_likes(user_id);

-- RLS policies for post comment likes
ALTER TABLE post_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all post comment likes" ON post_comment_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own post comment likes" ON post_comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own post comment likes" ON post_comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for ranking comment likes
ALTER TABLE ranking_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all ranking comment likes" ON ranking_comment_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own ranking comment likes" ON ranking_comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ranking comment likes" ON ranking_comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Functions to update like counts
CREATE OR REPLACE FUNCTION update_post_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE post_comments 
    SET like_count = COALESCE(like_count, 0) + 1
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE post_comments 
    SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_ranking_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE ranking_comments 
    SET like_count = COALESCE(like_count, 0) + 1
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE ranking_comments 
    SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update like counts
DROP TRIGGER IF EXISTS post_comment_like_count_trigger ON post_comment_likes;
CREATE TRIGGER post_comment_like_count_trigger
  AFTER INSERT OR DELETE ON post_comment_likes
  FOR EACH ROW EXECUTE FUNCTION update_post_comment_like_count();

DROP TRIGGER IF EXISTS ranking_comment_like_count_trigger ON ranking_comment_likes;
CREATE TRIGGER ranking_comment_like_count_trigger
  AFTER INSERT OR DELETE ON ranking_comment_likes
  FOR EACH ROW EXECUTE FUNCTION update_ranking_comment_like_count();

-- Add like_count column to comment tables if not exists
ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
ALTER TABLE ranking_comments ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Update existing like counts
UPDATE post_comments 
SET like_count = (
  SELECT COUNT(*) 
  FROM post_comment_likes 
  WHERE comment_id = post_comments.id
)
WHERE like_count IS NULL OR like_count = 0;

UPDATE ranking_comments 
SET like_count = (
  SELECT COUNT(*) 
  FROM ranking_comment_likes 
  WHERE comment_id = ranking_comments.id
)
WHERE like_count IS NULL OR like_count = 0;