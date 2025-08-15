# Dorama Hub - Database Schema Guide

This document provides a comprehensive guide to the Dorama Hub database schema and how to implement it in your Supabase project.

## 📋 Table of Contents

1. [Quick Setup](#quick-setup)
2. [Database Structure](#database-structure)
3. [Key Features](#key-features)
4. [Implementation Guide](#implementation-guide)
5. [API Examples](#api-examples)
6. [Security](#security)
7. [Performance](#performance)
8. [Troubleshooting](#troubleshooting)

## 🚀 Quick Setup

### 1. Deploy Schema to Supabase

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy and paste the entire content of `supabase-schema.sql`
4. Run the script
5. Verify all tables and policies were created successfully

### 2. Configure Authentication

```sql
-- Enable email authentication in Supabase Auth settings
-- Configure OAuth providers if needed (Google, Apple, etc.)
```

### 3. Test the Setup

```javascript
// Test user creation
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'password123',
  options: {
    data: {
      username: 'testuser',
      display_name: 'Test User'
    }
  }
})
```

## 🏗️ Database Structure

### Core Tables

#### Users & Authentication
- `users` - User profiles extending Supabase auth
- `user_preferences` - User settings and preferences
- `user_follows` - Follow relationships between users

#### Drama Management
- `user_drama_lists` - User's watching/watchlist/completed lists
- `user_drama_progress` - Episode progress tracking
- `drama_cache` - Cached drama data from TMDB

#### Social Features
- `user_rankings` - User-created drama rankings
- `ranking_items` - Individual dramas in rankings
- `ranking_likes` - Likes on rankings
- `ranking_comments` - Comments on rankings
- `community_posts` - Community discussion posts
- `post_likes` - Likes on community posts
- `post_comments` - Comments on community posts

#### Gamification
- `achievements` - Achievement definitions
- `user_achievements` - User's unlocked achievements
- `user_stats` - User statistics and analytics

#### Premium Features
- `premium_subscriptions` - Premium subscription management
- `premium_features` - Premium feature toggles per user

#### System
- `notifications` - In-app notifications
- Various indexes for performance optimization

## ✨ Key Features

### 1. User Management
- Complete user profiles with customization
- Follow/unfollow system with automatic count updates
- Privacy settings and preferences

### 2. Drama Tracking
- Three list types: watching, watchlist, completed
- Episode progress tracking with automatic completion
- Rating system for completed dramas

### 3. Social Rankings
- User-created top 10 rankings
- Public/private visibility settings
- Like and comment system with real-time counts

### 4. Community Features
- Discussion posts with drama mentions
- Nested comment system
- Multiple reaction types (like, love, laugh, etc.)

### 5. Gamification
- Achievement system with different rarities
- User statistics tracking
- Premium-only achievements

### 6. Premium System
- Subscription management
- Feature toggles
- Custom themes and borders

## 🛠️ Implementation Guide

### User Registration Flow

```javascript
// 1. Sign up user
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: email,
  password: password,
  options: {
    data: {
      username: username,
      display_name: displayName
    }
  }
})

// 2. User profile is automatically created via trigger
// 3. Set user preferences
const { error: prefError } = await supabase
  .from('user_preferences')
  .update({
    favorite_genres: selectedGenres,
    loved_dramas: lovedDramas
  })
  .eq('user_id', authData.user.id)
```

### Adding Drama to List

```javascript
const addToList = async (dramaId, listType, totalEpisodes = null) => {
  const { data, error } = await supabase
    .from('user_drama_lists')
    .insert({
      user_id: user.id,
      drama_id: dramaId,
      list_type: listType,
      total_episodes: totalEpisodes,
      current_episode: listType === 'watching' ? 0 : null
    })
  
  return { data, error }
}
```

### Creating a Ranking

```javascript
const createRanking = async (title, dramaIds) => {
  // 1. Create ranking
  const { data: ranking, error: rankingError } = await supabase
    .from('user_rankings')
    .insert({
      user_id: user.id,
      title: title,
      is_public: true
    })
    .select()
    .single()

  if (rankingError) return { error: rankingError }

  // 2. Add ranking items
  const rankingItems = dramaIds.map((dramaId, index) => ({
    ranking_id: ranking.id,
    drama_id: dramaId,
    rank_position: index + 1
  }))

  const { error: itemsError } = await supabase
    .from('ranking_items')
    .insert(rankingItems)

  return { data: ranking, error: itemsError }
}
```

### Community Post Creation

```javascript
const createPost = async (content, mentionedDramaId = null) => {
  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      user_id: user.id,
      post_type: 'discussion',
      content: content,
      mentioned_drama_id: mentionedDramaId
    })
    .select(`
      *,
      users:user_id (username, display_name, profile_image)
    `)
    .single()

  return { data, error }
}
```

### Following Users

```javascript
const followUser = async (targetUserId) => {
  const { data, error } = await supabase
    .from('user_follows')
    .insert({
      follower_id: user.id,
      following_id: targetUserId
    })

  // Counts are automatically updated via triggers
  return { data, error }
}
```

## 📊 API Examples

### Get User Profile with Stats

```javascript
const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('user_profiles_with_stats')
    .select('*')
    .eq('id', userId)
    .single()

  return { data, error }
}
```

### Get Community Feed

```javascript
const getCommunityFeed = async (limit = 20, offset = 0) => {
  const { data, error } = await supabase
    .from('community_feed')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return { data, error }
}
```

### Get User's Rankings

```javascript
const getUserRankings = async (userId) => {
  const { data, error } = await supabase
    .rpc('get_user_ranking', { user_uuid: userId })

  return { data, error }
}
```

### Get Drama Lists

```javascript
const getUserDramaList = async (userId, listType) => {
  const { data, error } = await supabase
    .rpc('get_user_drama_list', { 
      user_uuid: userId, 
      list_name: listType 
    })

  return { data, error }
}
```

## 🔒 Security

### Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:

- **Users can only modify their own data**
- **Public data is viewable by all authenticated users**
- **Private rankings/lists respect privacy settings**
- **Comments and likes are publicly viewable**

#### Ranking-specific Policies

Add or verify the following policies for ranking-related tables:

```sql
-- ===========================================
-- RANKING ITEMS
-- ===========================================
ALTER TABLE public.ranking_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read items of public or own rankings" ON public.ranking_items;
DROP POLICY IF EXISTS "Insert own ranking items" ON public.ranking_items;
DROP POLICY IF EXISTS "Update own ranking items" ON public.ranking_items;
DROP POLICY IF EXISTS "Delete own ranking items" ON public.ranking_items;

CREATE POLICY "Read items of public or own rankings"
ON public.ranking_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_rankings r
    WHERE r.id = ranking_items.ranking_id
      AND (r.is_public = true OR r.user_id = auth.uid())
  )
);

CREATE POLICY "Insert own ranking items"
ON public.ranking_items
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_rankings r
    WHERE r.id = ranking_items.ranking_id
      AND r.user_id = auth.uid()
  )
);

CREATE POLICY "Update own ranking items"
ON public.ranking_items
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_rankings r
    WHERE r.id = ranking_items.ranking_id
      AND r.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_rankings r
    WHERE r.id = ranking_items.ranking_id
      AND r.user_id = auth.uid()
  )
);

CREATE POLICY "Delete own ranking items"
ON public.ranking_items
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_rankings r
    WHERE r.id = ranking_items.ranking_id
      AND r.user_id = auth.uid()
  )
);

-- Index to speed up subqueries
CREATE INDEX IF NOT EXISTS idx_ranking_items_ranking_id
ON public.ranking_items(ranking_id);

-- ===========================================
-- RANKING LIKES
-- ===========================================
ALTER TABLE public.ranking_likes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ranking_likes
ALTER COLUMN user_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "Read likes of public or own rankings" ON public.ranking_likes;
DROP POLICY IF EXISTS "User can like" ON public.ranking_likes;
DROP POLICY IF EXISTS "User can remove own like" ON public.ranking_likes;

CREATE POLICY "Read likes of public or own rankings"
ON public.ranking_likes
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_rankings r
    WHERE r.id = ranking_likes.ranking_id
      AND (r.is_public = true OR r.user_id = auth.uid())
  )
);

CREATE POLICY "User can like"
ON public.ranking_likes
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "User can remove own like"
ON public.ranking_likes
FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_ranking_likes_ranking_id
ON public.ranking_likes(ranking_id);

-- ===========================================
-- RANKING COMMENTS
-- ===========================================
ALTER TABLE public.ranking_comments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ranking_comments
ALTER COLUMN user_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "Read comments of public or own rankings" ON public.ranking_comments;
DROP POLICY IF EXISTS "User can comment" ON public.ranking_comments;
DROP POLICY IF EXISTS "User can update own comment" ON public.ranking_comments;
DROP POLICY IF EXISTS "User can delete own comment" ON public.ranking_comments;

CREATE POLICY "Read comments of public or own rankings"
ON public.ranking_comments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_rankings r
    WHERE r.id = ranking_comments.ranking_id
      AND (r.is_public = true OR r.user_id = auth.uid())
  )
);

CREATE POLICY "User can comment"
ON public.ranking_comments
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "User can update own comment"
ON public.ranking_comments
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "User can delete own comment"
ON public.ranking_comments
FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_ranking_comments_ranking_id
ON public.ranking_comments(ranking_id);
```

### Key Security Features

1. **Authentication Required**: All operations require valid JWT
2. **User Isolation**: Users can only access/modify their own data
3. **Public/Private Controls**: Users control visibility of their content
4. **Automatic Cleanup**: Cascading deletes maintain data integrity

## ⚡ Performance

### Indexes

The schema includes comprehensive indexes for:
- User lookups by username
- Drama list queries by user and type
- Community feed ordering by date
- Follow relationship queries
- Notification queries

### Optimizations

1. **Materialized Counts**: Likes/comments counts are stored and updated via triggers
2. **Drama Cache**: Frequently accessed TMDB data is cached locally
3. **Efficient Queries**: Views provide optimized common query patterns
4. **Proper Indexing**: All foreign keys and common query patterns are indexed

## 🔧 Troubleshooting

### Common Issues

#### 1. User Profile Not Created
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Manually create profile if needed
INSERT INTO public.users (id, username, display_name)
VALUES ('user-uuid', 'username', 'Display Name');
```

#### 2. RLS Blocking Queries
```sql
-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'table_name';

-- Temporarily disable RLS for testing (NOT for production)
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

#### 3. Count Mismatches
```sql
-- Recalculate follower counts
UPDATE public.users SET 
  followers_count = (
    SELECT COUNT(*) FROM public.user_follows 
    WHERE following_id = users.id
  ),
  following_count = (
    SELECT COUNT(*) FROM public.user_follows 
    WHERE follower_id = users.id
  );
```

### Performance Issues

#### 1. Slow Queries
- Check if indexes are being used: `EXPLAIN ANALYZE query`
- Add missing indexes for common query patterns
- Consider query optimization

#### 2. High Database Load
- Implement caching for frequently accessed data
- Use pagination for large result sets
- Consider read replicas for heavy read workloads

## 📝 Migration Notes

### From Development to Production

1. **Backup existing data** before running schema updates
2. **Test migrations** on a staging environment first
3. **Monitor performance** after schema changes
4. **Update application code** to match schema changes

### Schema Updates

When updating the schema:

1. Create migration scripts for incremental changes
2. Use transactions for atomic updates
3. Test rollback procedures
4. Document all changes

## 🎯 Best Practices

### 1. Data Integrity
- Always use transactions for multi-table operations
- Validate data on both client and server side
- Use foreign key constraints to maintain relationships

### 2. Performance
- Use pagination for large datasets
- Implement proper caching strategies
- Monitor query performance regularly

### 3. Security
- Never expose sensitive data in public APIs
- Regularly audit RLS policies
- Use environment variables for sensitive configuration

### 4. Maintenance
- Regularly update statistics: `ANALYZE;`
- Monitor database size and performance
- Keep backups current and test restore procedures

## 📞 Support

For issues with this schema:

1. Check the troubleshooting section above
2. Review Supabase documentation
3. Check application logs for specific error messages
4. Test queries in the Supabase SQL editor

Remember to always test changes in a development environment before applying to production!