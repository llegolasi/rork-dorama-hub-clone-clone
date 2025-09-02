# Custom Collections Setup Guide

## Overview
This system allows creating curated collections of dramas that will be displayed on the homepage. Collections are manually managed through the database and provide full control over visibility and ordering.

## Database Schema

### Tables Created:
1. **custom_collections** - Stores collection metadata
2. **custom_collection_dramas** - Links dramas to collections (many-to-many)

### Key Features:
- **Visibility Control**: Collections can be hidden/shown with `is_visible` flag
- **Custom Ordering**: Both collections and dramas within collections can be ordered
- **Admin Management**: Only specific admin users can manage collections
- **Performance Optimized**: Includes indexes and cached drama data
- **RLS Security**: Row Level Security policies for data protection

## Setup Instructions

### 1. Run the SQL Schema
Execute the `custom-collections-schema.sql` file in your Supabase database:

```sql
-- Run this in your Supabase SQL editor
\i database/custom-collections-schema.sql
```

### 2. Configure Admin Users
Update the admin email addresses in the RLS policies:

```sql
-- Replace with your actual admin emails
UPDATE custom_collections SET created_by = auth.uid() 
WHERE auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE email IN ('your-admin@email.com', 'curator@yourdomain.com')
);
```

### 3. Add Sample Data
The schema includes 5 example collections. You can modify or add more:

```sql
-- Add a new collection
INSERT INTO custom_collections (title, description, cover_image_url, is_visible, display_order) 
VALUES ('New Collection', 'Description here', 'https://image-url.com', true, 6);

-- Add dramas to a collection
INSERT INTO custom_collection_dramas (collection_id, drama_id, drama_title, drama_poster_url, drama_year, display_order)
VALUES (
    (SELECT id FROM custom_collections WHERE title = 'Trending Now'),
    12345, -- Drama ID from your API
    'Drama Title',
    'https://poster-url.com',
    2024,
    1
);
```

## Usage

### Get Homepage Collections
```sql
SELECT * FROM get_homepage_collections();
```

### Get Dramas in a Collection
```sql
SELECT * FROM get_collection_dramas('collection-uuid-here');
```

## Management

### Show/Hide Collections
```sql
UPDATE custom_collections SET is_visible = false WHERE title = 'Collection Name';
```

### Reorder Collections
```sql
UPDATE custom_collections SET display_order = 1 WHERE title = 'Most Important';
UPDATE custom_collections SET display_order = 2 WHERE title = 'Second Most Important';
```

### Add Drama to Collection
```sql
INSERT INTO custom_collection_dramas (collection_id, drama_id, drama_title, drama_poster_url, drama_year)
VALUES (
    (SELECT id FROM custom_collections WHERE title = 'Collection Name'),
    drama_id,
    'Drama Title',
    'poster_url',
    year
);
```

### Remove Drama from Collection
```sql
DELETE FROM custom_collection_dramas 
WHERE collection_id = (SELECT id FROM custom_collections WHERE title = 'Collection Name')
AND drama_id = 12345;
```

## Security Notes

- Only users with admin emails can create/edit collections
- All users can view visible collections
- RLS policies protect against unauthorized access
- Functions use SECURITY DEFINER for controlled access

## Performance Considerations

- Drama data is cached in `custom_collection_dramas` for faster loading
- Indexes are created for optimal query performance
- Use the provided functions for best performance