-- User blocks system
-- This table stores blocked users relationships

CREATE TABLE IF NOT EXISTS user_blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id ON user_blocks(blocked_id);

-- RLS policies
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own blocks
CREATE POLICY "Users can view their own blocks" ON user_blocks
    FOR SELECT USING (blocker_id = auth.uid());

-- Users can only create their own blocks
CREATE POLICY "Users can create their own blocks" ON user_blocks
    FOR INSERT WITH CHECK (blocker_id = auth.uid());

-- Users can only delete their own blocks
CREATE POLICY "Users can delete their own blocks" ON user_blocks
    FOR DELETE USING (blocker_id = auth.uid());

-- Function to check if user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(blocker_uuid UUID, blocked_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_blocks 
        WHERE blocker_id = blocker_uuid AND blocked_id = blocked_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to block user
CREATE OR REPLACE FUNCTION block_user(blocked_uuid UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_blocks (blocker_id, blocked_id)
    VALUES (auth.uid(), blocked_uuid)
    ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unblock user
CREATE OR REPLACE FUNCTION unblock_user(blocked_uuid UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM user_blocks 
    WHERE blocker_id = auth.uid() AND blocked_id = blocked_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;