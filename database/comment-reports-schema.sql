-- Comment Reports System
-- This table stores reports made by users against comments

CREATE TABLE IF NOT EXISTS comment_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (reason IN (
        'spam',
        'harassment',
        'hate_speech',
        'inappropriate_content',
        'misinformation',
        'other'
    )),
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Prevent duplicate reports from same user for same comment
    UNIQUE(comment_id, reporter_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_comment_reports_comment_id ON comment_reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_reporter_id ON comment_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_status ON comment_reports(status);
CREATE INDEX IF NOT EXISTS idx_comment_reports_created_at ON comment_reports(created_at DESC);

-- RLS Policies
ALTER TABLE comment_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create comment reports" ON comment_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports" ON comment_reports
    FOR SELECT USING (auth.uid() = reporter_id);

-- Admins can view and manage all reports (assuming user_type = 'admin')
CREATE POLICY "Admins can manage all reports" ON comment_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'admin'
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_comment_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_comment_reports_updated_at_trigger
    BEFORE UPDATE ON comment_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_reports_updated_at();

-- Function to get comment report count
CREATE OR REPLACE FUNCTION get_comment_report_count(comment_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM comment_reports
        WHERE comment_id = comment_uuid
        AND status = 'pending'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON comment_reports TO authenticated;
GRANT EXECUTE ON FUNCTION get_comment_report_count(UUID) TO authenticated, anon;