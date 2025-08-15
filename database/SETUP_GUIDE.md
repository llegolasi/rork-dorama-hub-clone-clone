# Dorama Hub - Database Setup Guide

## Overview
This guide will help you set up the complete database infrastructure for the Dorama Hub application using Supabase.

## Prerequisites
- Supabase account (https://supabase.com)
- Node.js and npm/yarn installed
- Expo CLI installed

## Step 1: Create Supabase Project

1. Go to https://supabase.com and create a new account or sign in
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - Name: `dorama-hub`
   - Database Password: (generate a strong password)
   - Region: Choose closest to your users
5. Click "Create new project"
6. Wait for the project to be created (usually takes 2-3 minutes)

## Step 2: Get Project Credentials

1. In your Supabase dashboard, go to Settings > API
2. Copy the following values:
   - Project URL
   - Project API keys > anon public key

## Step 3: Configure Environment Variables

1. Create a `.env` file in your project root (copy from `.env.example`)
2. Add your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_TMDB_API_KEY=your_tmdb_api_key
EXPO_PUBLIC_RORK_API_BASE_URL=your_api_base_url
```

## Step 4: Run Database Schema

1. In your Supabase dashboard, go to SQL Editor
2. Copy the entire content from `database/supabase-schema.sql`
3. Paste it into the SQL Editor
4. Click "Run" to execute the schema

This will create:
- All necessary tables (users, rankings, community posts, etc.)
- Row Level Security policies
- Indexes for performance
- Triggers for automatic updates
- Helper functions and views

## Step 5: Enable Authentication

1. In Supabase dashboard, go to Authentication > Settings
2. Configure the following:
   - Site URL: Your app's URL
   - Redirect URLs: Add your app's redirect URLs
   - Enable email confirmations if desired
   - Configure social providers (Google, Apple) if needed

## Step 6: Test Database Connection

1. Start your development server:
```bash
npm start
# or
yarn start
```

2. Test the authentication flow:
   - Try creating a new account
   - Check if user profile is created in the database
   - Test login/logout functionality

## Step 7: Verify Database Setup

In Supabase dashboard, go to Table Editor and verify:

1. **users** table has entries after user registration
2. **user_preferences** table is populated for new users
3. **user_stats** table is created for new users
4. **premium_features** table has default entries

## Features Enabled

With this database setup, your app now supports:

### Authentication & User Management
- Email/password authentication
- User profiles with customizable display names and bios
- Profile images
- Onboarding flow with preferences

### Drama Lists & Tracking
- Personal drama lists (Watching, Watchlist, Completed)
- Episode progress tracking
- Automatic completion when episodes are finished
- Rating system

### Rankings System
- Personal drama rankings
- Public/private ranking visibility
- Drag-and-drop ranking management
- Community ranking sharing

### Community Features
- Community posts (discussions and ranking shares)
- Post likes and reactions
- Threaded comments system
- User following/followers

### Social Features
- Follow/unfollow users
- View other users' profiles and public lists
- Community feed with rankings and discussions

### Gamification
- Achievement system
- User statistics tracking
- Premium features support

## Troubleshooting

### Common Issues

1. **"relation does not exist" errors**
   - Make sure you ran the complete schema from `database/supabase-schema.sql`
   - Check that all tables were created successfully

2. **Authentication errors**
   - Verify your Supabase URL and anon key are correct
   - Check that RLS policies are enabled

3. **Permission denied errors**
   - Ensure RLS policies are properly configured
   - Check that user is authenticated before accessing protected resources

### Database Reset

If you need to reset the database:

1. Go to Supabase dashboard > SQL Editor
2. Run: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
3. Re-run the complete schema from `database/supabase-schema.sql`

## Performance Optimization

The schema includes several optimizations:

1. **Indexes** on frequently queried columns
2. **Triggers** for automatic count updates
3. **Views** for complex queries
4. **Functions** for common operations

## Security

The database implements:

1. **Row Level Security (RLS)** on all tables
2. **Proper authentication** checks
3. **Data validation** through constraints
4. **Secure defaults** for user privacy

## Next Steps

After setting up the database:

1. Test all app features thoroughly
2. Monitor performance in Supabase dashboard
3. Set up database backups
4. Configure monitoring and alerts
5. Plan for scaling as user base grows

## Support

If you encounter issues:

1. Check Supabase logs in the dashboard
2. Review the schema file for any missing pieces
3. Ensure all environment variables are set correctly
4. Test database connections manually

The database is now fully configured and ready to support all features of the Dorama Hub application!