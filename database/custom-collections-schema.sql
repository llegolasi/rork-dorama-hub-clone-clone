-- Custom Collections System for Homepage
-- This system allows creating curated collections of dramas for the homepage

-- Table for storing custom collections
CREATE TABLE IF NOT EXISTS custom_collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    is_visible BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing dramas in collections (many-to-many relationship)
CREATE TABLE IF NOT EXISTS custom_collection_dramas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    collection_id UUID REFERENCES custom_collections(id) ON DELETE CASCADE,
    drama_id INTEGER NOT NULL, -- References external drama API ID
    drama_title VARCHAR(255) NOT NULL, -- Cache drama title for performance
    drama_poster_url TEXT, -- Cache poster URL for performance
    drama_year INTEGER, -- Cache year for performance
    display_order INTEGER DEFAULT 0,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(collection_id, drama_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_custom_collections_visible_order ON custom_collections(is_visible, display_order);
CREATE INDEX IF NOT EXISTS idx_custom_collection_dramas_collection ON custom_collection_dramas(collection_id, display_order);
CREATE INDEX IF NOT EXISTS idx_custom_collections_created_at ON custom_collections(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_custom_collections_updated_at
    BEFORE UPDATE ON custom_collections
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_collections_updated_at();

-- RLS (Row Level Security) policies
ALTER TABLE custom_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_collection_dramas ENABLE ROW LEVEL SECURITY;

-- Policy for reading visible collections (public access)
CREATE POLICY "Allow reading visible collections" ON custom_collections
    FOR SELECT USING (is_visible = true);

-- Policy for reading collection dramas (public access)
CREATE POLICY "Allow reading collection dramas" ON custom_collection_dramas
    FOR SELECT USING (true);

-- Admin policies (for users who can manage collections)
-- Note: You'll need to create an admin role or use specific user IDs
CREATE POLICY "Allow admin full access to collections" ON custom_collections
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE email IN ('admin@doramahub.com', 'curator@doramahub.com')
        )
    );

CREATE POLICY "Allow admin full access to collection dramas" ON custom_collection_dramas
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE email IN ('admin@doramahub.com', 'curator@doramahub.com')
        )
    );

-- Insert some example collections
INSERT INTO custom_collections (title, description, cover_image_url, is_visible, display_order) VALUES
('Trending Now', 'The most popular dramas everyone is talking about', 'https://images.unsplash.com/photo-1489599162163-3fb4b4b5b0b3?w=800&h=400&fit=crop', true, 1),
('Editor''s Choice', 'Hand-picked favorites from our editorial team', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&h=400&fit=crop', true, 2),
('Hidden Gems', 'Underrated dramas that deserve more attention', 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=800&h=400&fit=crop', true, 3),
('Romance Classics', 'Timeless romantic dramas that never get old', 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&h=400&fit=crop', true, 4),
('Action & Thriller', 'Heart-pounding dramas full of suspense', 'https://images.unsplash.com/photo-1489599162163-3fb4b4b5b0b3?w=800&h=400&fit=crop', true, 5);

-- Function to get visible collections with drama count
CREATE OR REPLACE FUNCTION get_homepage_collections()
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    description TEXT,
    cover_image_url TEXT,
    display_order INTEGER,
    drama_count BIGINT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.title,
        c.description,
        c.cover_image_url,
        c.display_order,
        COUNT(cd.drama_id) as drama_count,
        c.created_at
    FROM custom_collections c
    LEFT JOIN custom_collection_dramas cd ON c.id = cd.collection_id
    WHERE c.is_visible = true
    GROUP BY c.id, c.title, c.description, c.cover_image_url, c.display_order, c.created_at
    ORDER BY c.display_order ASC, c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get dramas in a specific collection
CREATE OR REPLACE FUNCTION get_collection_dramas(collection_uuid UUID)
RETURNS TABLE (
    drama_id INTEGER,
    drama_title VARCHAR(255),
    drama_poster_url TEXT,
    drama_year INTEGER,
    display_order INTEGER,
    added_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cd.drama_id,
        cd.drama_title,
        cd.drama_poster_url,
        cd.drama_year,
        cd.display_order,
        cd.added_at
    FROM custom_collection_dramas cd
    JOIN custom_collections c ON cd.collection_id = c.id
    WHERE c.id = collection_uuid AND c.is_visible = true
    ORDER BY cd.display_order ASC, cd.added_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON custom_collections TO anon, authenticated;
GRANT SELECT ON custom_collection_dramas TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_homepage_collections() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_collection_dramas(UUID) TO anon, authenticated;