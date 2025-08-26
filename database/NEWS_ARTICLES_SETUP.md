# News Articles Setup Guide

This guide explains how to set up and manage the custom news articles feature in the Dorama Hub app.

## Overview

The news articles system allows you to create, manage, and display custom news content instead of relying on external Twitter feeds. This provides better control over content quality and user experience.

## Database Schema

The system uses the following main tables:

### Core Tables
- `news_articles` - Stores the main article content
- `article_tags` - Normalized tag system
- `article_tag_relations` - Many-to-many relationship between articles and tags

### Analytics Tables
- `article_interactions` - User interactions (likes, shares, bookmarks)
- `article_views` - Detailed view tracking for analytics
- `article_bookmarks` - User bookmarks
- `article_comments` - Optional commenting system

## Setup Instructions

### 1. Run the Migration

Execute the migration script to replace the old Twitter-based system:

```sql
-- Run this in your Supabase SQL editor
\i database/migrate-to-custom-news.sql
```

Or manually run the contents of `database/news-articles-schema.sql`.

### 2. Configure Row Level Security (RLS)

The schema includes comprehensive RLS policies:
- Published articles are readable by all authenticated users
- Authors can manage their own articles
- Users can manage their own interactions, bookmarks, and comments

### 3. Set Up Storage (Optional)

If you want to upload images directly to Supabase instead of using external URLs:

```sql
-- Create a bucket for article images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('article-images', 'article-images', true);

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload article images" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'article-images');

-- Allow public read access to article images
CREATE POLICY "Public read access to article images" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'article-images');
```

## Content Management

### Creating Articles

Articles can be created through:
1. Admin interface (to be built)
2. Direct database insertion
3. API endpoints (tRPC procedures)

### Article Structure

Each article includes:
- **Basic Info**: title, slug, status (draft/published/archived)
- **Content**: HTML content, plain text version
- **Metadata**: tags, cover image, author info
- **SEO**: meta description, reading time
- **Analytics**: view count, like count, share count
- **Featured**: can be marked as featured for homepage carousel

### Sample Article Creation

```sql
INSERT INTO news_articles (
    status,
    title,
    slug,
    tags,
    cover_image_url,
    html_content,
    plain_text_content,
    author_name,
    published_at,
    is_featured,
    meta_description
) VALUES (
    'published',
    'Your Article Title',
    'your-article-slug',
    ARRAY['K-Drama', 'Lançamentos'],
    'https://example.com/cover-image.jpg',
    '<p>Your HTML content here...</p>',
    'Your plain text content here...',
    'Author Name',
    NOW(),
    true,
    'Article meta description for SEO'
);
```

## Features

### 1. Tagging System
- Predefined tags with colors for consistent categorization
- Easy filtering and organization
- Visual tag display in the UI

### 2. Analytics
- Detailed view tracking (reading time, scroll percentage)
- User interaction tracking (likes, shares, bookmarks)
- Anonymous view support with IP tracking

### 3. Search
- Full-text search in Portuguese
- Search across titles and content
- Tag-based filtering

### 4. User Engagement
- Like/unlike articles
- Bookmark articles for later reading
- Optional commenting system
- Share tracking

### 5. Featured Content
- Mark articles as featured for homepage carousel
- Set featured order and expiration dates
- Automatic cleanup of expired featured content

## API Integration

The system integrates with tRPC for:
- Fetching articles (published only)
- User interactions (like, bookmark, share)
- View tracking
- Search functionality

## Maintenance

### Automated Cleanup
The system includes a cleanup function that should be run periodically:

```sql
SELECT cleanup_old_article_data();
```

This function:
- Removes old view data (6+ months)
- Removes old interaction data (1+ year)
- Archives old articles (2+ years, non-featured)

### Performance Optimization
- Indexes on commonly queried fields
- Full-text search index for Portuguese content
- Efficient RLS policies
- View count updates via triggers

## Content Guidelines

### Article Structure
1. **Title**: Clear, engaging, SEO-friendly
2. **Cover Image**: High-quality, relevant image (16:9 ratio recommended)
3. **Content**: Well-formatted HTML with proper structure
4. **Tags**: 2-5 relevant tags from predefined list
5. **Meta Description**: 150-160 characters for SEO

### HTML Content Best Practices
- Use semantic HTML tags
- Include alt text for images
- Responsive image sizing
- Proper heading hierarchy (h2, h3, etc.)
- Embedded videos should be responsive

### Plain Text Content
- Auto-generated from HTML for search indexing
- Used for reading time calculation
- Should be clean, readable text without HTML tags

## Monitoring

Track these metrics for content performance:
- View counts and reading time
- User engagement (likes, bookmarks, shares)
- Popular tags and topics
- Search queries and results

## Future Enhancements

Potential features to add:
- Rich text editor for content creation
- Image upload and management
- Newsletter integration
- Social media auto-posting
- Content scheduling
- A/B testing for headlines
- Related articles suggestions