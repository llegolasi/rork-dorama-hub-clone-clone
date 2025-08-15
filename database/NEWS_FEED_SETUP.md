# News Feed Feature Setup Guide

## Overview
This guide explains how to set up the News Feed feature that displays curated K-drama news from Twitter/X in your app.

## Database Setup

1. **Run the schema file:**
   ```sql
   -- Execute the news-feed-schema.sql file in your Supabase SQL editor
   ```

2. **The schema creates:**
   - `news_feed_config`: Stores Twitter feed configuration
   - `news_interactions`: Tracks user interactions for analytics
   - `featured_news`: Optional manual curation for home carousel
   - `news_feed_views`: Tracks engagement metrics

## Twitter/X Integration Setup

### Step 1: Create Official Dorama Hub Twitter Account
1. Create a new Twitter account: `@doramahub_official` (or similar)
2. Set up the profile with your app branding
3. This account will retweet and curate K-drama news from reliable sources

### Step 2: Generate Twitter Widget
1. Go to [publish.twitter.com](https://publish.twitter.com)
2. Enter your Twitter account URL: `https://twitter.com/doramahub_official`
3. Choose "Embedded Timeline"
4. Customize the widget:
   - Set theme to "Dark" to match your app
   - Set height (recommended: 600px for full feed, 400px for carousel)
   - Set width to match your app's design
5. Copy the generated embed code

### Step 3: Update Database Configuration
```sql
UPDATE news_feed_config 
SET 
    twitter_username = 'doramahub_official',
    widget_id = 'YOUR_WIDGET_ID',
    embed_code = 'YOUR_FULL_EMBED_CODE'
WHERE feed_name = 'Dorama Hub Official';
```

## Implementation Notes

### Home Carousel
- Display 3-5 most recent tweets in a horizontal scroll
- Use the Twitter embed with limited height
- Include "Ver Todas" button to navigate to full feed

### Full Feed Screen
- Display complete Twitter timeline embed
- Enable native Twitter interactions (like, retweet, reply)
- Track user engagement for analytics

### Analytics Tracking
The schema includes tables to track:
- User interactions with news content
- Time spent viewing feeds
- Most popular news items
- User engagement patterns

### Content Curation Strategy
1. **Automated**: The Twitter account retweets from trusted sources
2. **Manual**: Use `featured_news` table for special announcements
3. **Sources to follow/retweet:**
   - Official drama production companies
   - Korean broadcasting networks (SBS, KBS, MBC)
   - Entertainment news outlets
   - Actor/actress official accounts
   - Streaming platform announcements

## Security Considerations

- All tables have RLS (Row Level Security) enabled
- Users can only access their own interaction data
- News content is read-only for regular users
- Admin functions require elevated permissions

## Maintenance

### Regular Tasks
1. **Content Curation**: Regularly retweet relevant news on the official account
2. **Data Cleanup**: Run the `cleanup_old_news_data()` function monthly
3. **Analytics Review**: Monitor engagement metrics to improve content strategy

### Optional Enhancements
1. **Push Notifications**: Notify users of breaking K-drama news
2. **Personalization**: Filter news based on user's favorite actors/dramas
3. **Offline Support**: Cache recent news for offline viewing

## Testing

1. **Verify Twitter embed loads correctly**
2. **Test interactions tracking**
3. **Ensure proper navigation between carousel and full feed**
4. **Validate analytics data collection**

## Troubleshooting

### Common Issues
1. **Twitter embed not loading**: Check widget ID and embed code
2. **Dark theme not applied**: Verify theme setting in Twitter widget configuration
3. **Analytics not tracking**: Ensure user authentication is working
4. **Performance issues**: Consider implementing pagination or lazy loading for large feeds