# TMDB API Setup Guide

The app is currently showing 400 errors because the TMDB API key is expired or invalid. Here's how to fix it:

## Getting a New TMDB API Key

1. **Create a TMDB Account**
   - Go to [https://www.themoviedb.org/](https://www.themoviedb.org/)
   - Sign up for a free account

2. **Request API Access**
   - Go to [https://www.themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
   - Click "Create" to request a new API key
   - Choose "Developer" option
   - Fill out the application form (you can use placeholder information for personal projects)

3. **Get Your API Read Access Token**
   - Once approved, you'll see your API details
   - Copy the **"API Read Access Token"** (this is the Bearer token, not the API Key v3)
   - It should look like: `eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJ...` (a long JWT token)

4. **Update Your Environment Variables**
   - Open your `.env` file
   - Replace the `EXPO_PUBLIC_TMDB_API_KEY` value with your new token:
   ```
   EXPO_PUBLIC_TMDB_API_KEY=your_new_bearer_token_here
   ```

5. **Restart Your Development Server**
   - Stop your current development server
   - Run `npm start` or `yarn start` again

## Fallback Behavior

The app includes fallback mock data, so even without a valid API key, you'll see:
- Sample K-dramas (Squid Game, Crash Landing on You, Kingdom, etc.)
- Basic functionality for testing the UI

## Troubleshooting

If you're still seeing errors:

1. **Check the Console Logs**
   - Look for "API key test failed" or "Using mock data" messages
   - This will tell you if the API key is working

2. **Verify the Token Format**
   - Make sure you're using the "API Read Access Token" (Bearer token)
   - NOT the "API Key (v3 auth)" 

3. **Check Rate Limits**
   - TMDB has rate limits (40 requests per 10 seconds)
   - The app includes retry logic and fallbacks

## API Endpoints Used

The app uses these TMDB endpoints:
- `/trending/tv/day` - Trending TV shows
- `/discover/tv` - Discover TV shows with filters
- `/tv/{id}` - TV show details
- `/tv/{id}/credits` - Cast and crew
- `/person/{id}` - Actor details

All requests include Korean content filtering to show only K-dramas.