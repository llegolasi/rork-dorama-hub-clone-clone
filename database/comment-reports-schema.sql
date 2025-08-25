-- Comment Reports System
-- This table stores reports made by users against comments
-- Works with existing comment tables: ranking_comments, post_comments, news_comments

CREATE TABLE IF NOT EXISTS public.comment_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    comment_id UUID NOT NULL,
    comment_type TEXT NOT NULL CHECK (comment_type IN ('ranking', 'post', 'news', 'review')),
    reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Prevent duplicate reports from same user for same comment
    UNIQUE(comment_id, reporter_id, comment_type)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_comment_reports_comment_id ON public.comment_reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_reporter_id ON public.comment_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_status ON public.comment_reports(status);
CREATE INDEX IF NOT EXISTS idx_comment_reports_created_at ON public.comment_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_reports_comment_type ON public.comment_reports(comment_type);

-- RLS Policies
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create comment reports" ON public.comment_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports" ON public.comment_reports
    FOR SELECT USING (auth.uid() = reporter_id);

-- Admins can view and manage all reports (assuming user_type = 'admin')
CREATE POLICY "Admins can manage all reports" ON public.comment_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
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
    BEFORE UPDATE ON public.comment_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_reports_updated_at();

-- Function to get comment report count
CREATE OR REPLACE FUNCTION get_comment_report_count(comment_uuid UUID, comment_type_param TEXT)
RETURNS INTEGER AS $
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.comment_reports
        WHERE comment_id = comment_uuid
        AND comment_type = comment_type_param
        AND status = 'pending'
    );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has already reported a comment
CREATE OR REPLACE FUNCTION has_user_reported_comment(comment_uuid UUID, comment_type_param TEXT, user_uuid UUID)
RETURNS BOOLEAN AS $
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.comment_reports
        WHERE comment_id = comment_uuid
        AND comment_type = comment_type_param
        AND reporter_id = user_uuid
    );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.comment_reports TO authenticated;
GRANT EXECUTE ON FUNCTION get_comment_report_count(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION has_user_reported_comment(UUID, TEXT, UUID) TO authenticated, anon;