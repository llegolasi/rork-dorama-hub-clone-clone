// API Configuration
export const getApiBaseUrl = (): string => {
  const vercelUrl = 'https://backend-murex-three-38.vercel.app';

  const envCandidate = (process.env.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_RORK_API_BASE_URL ?? '').replace(/\/$/, '');

  if (envCandidate) {
    try {
      const url = new URL(envCandidate);
      const host = url.host;
      const isAllowed = host.includes('backend-murex-three-38.vercel.app');
      if (isAllowed) {
        console.log('Using environment API base URL:', envCandidate);
        return envCandidate;
      }
      console.warn('Ignoring non-approved API URL from env:', envCandidate, '— falling back to Vercel');
    } catch {
      console.warn('Invalid API URL in env:', envCandidate, '— falling back to Vercel');
    }
  }

  console.log('Using Vercel API base URL:', vercelUrl);
  return vercelUrl;
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