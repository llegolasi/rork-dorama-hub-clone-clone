# TMDB API Setup Guide

🚨 **URGENT: The app is currently showing 400 errors because the TMDB API key is expired or invalid.**

## Quick Fix Steps

### Step 1: Get a New TMDB API Key

1. **Create a TMDB Account**
   - Go to [https://www.themoviedb.org/](https://www.themoviedb.org/)
   - Sign up for a free account (it's completely free)

2. **Request API Access**
   - Go to [https://www.themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
   - Click "Create" to request a new API key
   - Choose "Developer" option
   - Fill out the application form:
     - **Application Name**: "K-Drama App" (or any name)
     - **Application URL**: "http://localhost:3000" (for development)
     - **Application Summary**: "Personal K-Drama tracking app"

3. **Get Your API Read Access Token**
   - Once approved (usually instant), you'll see your API details
   - **IMPORTANT**: Copy the **"API Read Access Token"** (NOT the API Key v3)
   - It should look like: `eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJ...` (a long JWT token)

### Step 2: Update Your Environment Variables

1. **Open your `.env` file**
2. **Replace BOTH lines** with your new token:
   ```env
   EXPO_PUBLIC_TMDB_API_KEY=your_new_bearer_token_here
   TMDB_API_KEY=your_new_bearer_token_here
   ```

### Step 3: Restart Your Development Server

1. **Stop your current development server** (Ctrl+C)
2. **Run `npm start` or `yarn start` again**
3. **Check the console** - you should see "API key test successful" instead of errors

## Current Status

✅ **With Valid API Key**: Real K-drama data from TMDB  
❌ **Without Valid API Key**: Mock data only (Squid Game, Crash Landing on You, Kingdom, etc.)

## Troubleshooting

### If you're still seeing 400 errors:

1. **Check the Console Logs**
   ```
   ✅ Good: "API key test successful"
   ❌ Bad: "API key test failed" or "TMDB API error: 400"
   ```

2. **Verify the Token Format**
   - ✅ **Correct**: "API Read Access Token" (Bearer token) - starts with `eyJ`
   - ❌ **Wrong**: "API Key (v3 auth)" - shorter alphanumeric string

3. **Common Issues**
   - **Expired Token**: Get a new one from TMDB
   - **Wrong Token Type**: Use Bearer token, not v3 API key
   - **Missing Token**: Check your `.env` file
   - **Rate Limits**: TMDB allows 40 requests per 10 seconds

### Testing Your API Key

Open your browser and test this URL with your token:
```
https://api.themoviedb.org/3/configuration
```
Add header: `Authorization: Bearer YOUR_TOKEN_HERE`

If it returns JSON data, your token works!

## API Endpoints Used

The app uses these TMDB endpoints:
- `/configuration` - API key validation
- `/trending/tv/day` - Trending TV shows
- `/discover/tv` - Discover TV shows with filters (Korean content)
- `/tv/{id}` - TV show details
- `/tv/{id}/credits` - Cast and crew
- `/tv/{id}/images` - Show images
- `/tv/{id}/videos` - Trailers and videos
- `/person/{id}` - Actor details
- `/search/tv` - Search functionality

**All requests include Korean content filtering to show only K-dramas.**

## Need Help?

If you're still having issues:
1. Check that your token starts with `eyJ`
2. Make sure you copied the entire token
3. Restart your development server after updating `.env`
4. Check the browser console for detailed error messages