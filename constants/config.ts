// API Configuration
export const getApiBaseUrl = (): string => {
  const prefer = process.env.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_RORK_API_BASE_URL ?? '';
  if (prefer) {
    const trimmed = prefer.replace(/\/$/, '');
    console.log('Using API base URL:', trimmed);
    console.log('Environment variables:', {
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
      EXPO_PUBLIC_RORK_API_BASE_URL: process.env.EXPO_PUBLIC_RORK_API_BASE_URL
    });
    return trimmed;
  }
  if (typeof window !== 'undefined') {
    console.log('Using empty base URL for web');
    return '';
  }
  console.log('Using localhost fallback');
  return 'http://localhost:3000';
};

// Test API connectivity
export const testApiConnection = async (): Promise<boolean> => {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('API connection test successful:', data);
      return true;
    } else {
      console.error('API connection test failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('API connection test error:', error);
    return false;
  }
};

// TMDB Configuration
export const TMDB_API_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1YWI5YzU2NzJjOGRjMDRjMzAyZDcxNzE1Y2VmZTRiYyIsIm5iZiI6MTY1ODYzODE2MS4xNTIsInN1YiI6IjYyZGNjZjUxZGMxY2I0MDA0ZmFiYWIxNiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.KZIhYnGp8CP2AI7obhY8mAJ9KJeqhKmfg2hq7iE7Vz8";
export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
export const POSTER_SIZE = "w342";
export const BACKDROP_SIZE = "w780";
export const PROFILE_SIZE = "w185";

// Korean content origin ID from TMDB
export const KOREAN_ORIGIN_ID = 190; // South Korea