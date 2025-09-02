-- Sample data for custom collections
-- This script adds sample dramas to the collections created in the main schema

-- Insert sample dramas into 'Trending Now' collection
INSERT INTO custom_collection_dramas (collection_id, drama_id, drama_title, drama_poster_url, drama_year, display_order)
VALUES 
(
    (SELECT id FROM custom_collections WHERE title = 'Trending Now'),
    1001, 'Squid Game', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=450&fit=crop', 2021, 1
),
(
    (SELECT id FROM custom_collections WHERE title = 'Trending Now'),
    1002, 'Crash Landing on You', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=450&fit=crop', 2019, 2
),
(
    (SELECT id FROM custom_collections WHERE title = 'Trending Now'),
    1003, 'Kingdom', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=450&fit=crop', 2019, 3
),
(
    (SELECT id FROM custom_collections WHERE title = 'Trending Now'),
    1004, 'Vincenzo', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=450&fit=crop', 2021, 4
),
(
    (SELECT id FROM custom_collections WHERE title = 'Trending Now'),
    1005, 'Hospital Playlist', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=450&fit=crop', 2020, 5
);

-- Insert sample dramas into 'Editor''s Choice' collection
INSERT INTO custom_collection_dramas (collection_id, drama_id, drama_title, drama_poster_url, drama_year, display_order)
VALUES 
(
    (SELECT id FROM custom_collections WHERE title = 'Editor''s Choice'),
    2001, 'My Mister', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=450&fit=crop', 2018, 1
),
(
    (SELECT id FROM custom_collections WHERE title = 'Editor''s Choice'),
    2002, 'Signal', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=450&fit=crop', 2016, 2
),
(
    (SELECT id FROM custom_collections WHERE title = 'Editor''s Choice'),
    2003, 'Reply 1988', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=450&fit=crop', 2015, 3
),
(
    (SELECT id FROM custom_collections WHERE title = 'Editor''s Choice'),
    2004, 'Prison Playbook', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=450&fit=crop', 2017, 4
);

-- Insert sample dramas into 'Hidden Gems' collection
INSERT INTO custom_collection_dramas (collection_id, drama_id, drama_title, drama_poster_url, drama_year, display_order)
VALUES 
(
    (SELECT id FROM custom_collections WHERE title = 'Hidden Gems'),
    3001, 'Move to Heaven', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=450&fit=crop', 2021, 1
),
(
    (SELECT id FROM custom_collections WHERE title = 'Hidden Gems'),
    3002, 'Navillera', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=450&fit=crop', 2021, 2
),
(
    (SELECT id FROM custom_collections WHERE title = 'Hidden Gems'),
    3003, 'Beyond Evil', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=450&fit=crop', 2021, 3
);

-- Insert sample dramas into 'Romance Classics' collection
INSERT INTO custom_collection_dramas (collection_id, drama_id, drama_title, drama_poster_url, drama_year, display_order)
VALUES 
(
    (SELECT id FROM custom_collections WHERE title = 'Romance Classics'),
    4001, 'Goblin', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=450&fit=crop', 2016, 1
),
(
    (SELECT id FROM custom_collections WHERE title = 'Romance Classics'),
    4002, 'Descendants of the Sun', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=450&fit=crop', 2016, 2
),
(
    (SELECT id FROM custom_collections WHERE title = 'Romance Classics'),
    4003, 'What''s Wrong with Secretary Kim', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=450&fit=crop', 2018, 3
),
(
    (SELECT id FROM custom_collections WHERE title = 'Romance Classics'),
    4004, 'Strong Woman Do Bong Soon', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=450&fit=crop', 2017, 4
);

-- Insert sample dramas into 'Action & Thriller' collection
INSERT INTO custom_collection_dramas (collection_id, drama_id, drama_title, drama_poster_url, drama_year, display_order)
VALUES 
(
    (SELECT id FROM custom_collections WHERE title = 'Action & Thriller'),
    5001, 'Stranger', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=450&fit=crop', 2017, 1
),
(
    (SELECT id FROM custom_collections WHERE title = 'Action & Thriller'),
    5002, 'Taxi Driver', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=450&fit=crop', 2021, 2
),
(
    (SELECT id FROM custom_collections WHERE title = 'Action & Thriller'),
    5003, 'The Penthouse', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=450&fit=crop', 2020, 3
),
(
    (SELECT id FROM custom_collections WHERE title = 'Action & Thriller'),
    5004, 'Mouse', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=450&fit=crop', 2021, 4
);

-- Verify the data was inserted correctly
SELECT 
    c.title as collection_title,
    cd.drama_title,
    cd.drama_year,
    cd.display_order
FROM custom_collections c
JOIN custom_collection_dramas cd ON c.id = cd.collection_id
ORDER BY c.display_order, cd.display_order;