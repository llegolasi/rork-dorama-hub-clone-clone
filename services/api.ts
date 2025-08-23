import { TMDB_API_KEY, TMDB_BASE_URL } from "@/constants/config";
import { ActorCredits, ActorDetails } from "@/types/actor";
import { Drama, DramaCredits, DramaDetails, DramaResponse, DramaImages, DramaVideos, SeasonDetails } from "@/types/drama";

// Mock data for fallback when API fails
const mockDramas: Drama[] = [
  {
    id: 1,
    name: "Squid Game",
    original_name: "오징어 게임",
    overview: "Hundreds of cash-strapped players accept a strange invitation to compete in children's games.",
    poster_path: "/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg",
    backdrop_path: "/qw3J9cNeLioOLoR68WX7z79aCdK.jpg",
    first_air_date: "2021-09-17",
    vote_average: 7.8,
    vote_count: 8234,
    popularity: 2847.253,
    genre_ids: [18, 9648, 10759],
    origin_country: ["KR"]
  },
  {
    id: 2,
    name: "Crash Landing on You",
    original_name: "사랑의 불시착",
    overview: "A paragliding mishap drops a South Korean heiress in North Korea -- and into the life of an army officer.",
    poster_path: "/pynhNjPknvKoP2AHHgWNzTgdKW8.jpg",
    backdrop_path: "/6rCz8rCxQW20UKbWOQyAkKTgfbr.jpg",
    first_air_date: "2019-12-14",
    vote_average: 8.2,
    vote_count: 1234,
    popularity: 1234.567,
    genre_ids: [35, 18],
    origin_country: ["KR"]
  },
  {
    id: 3,
    name: "Kingdom",
    original_name: "킹덤",
    overview: "In this zombie thriller set in Korea's medieval Joseon dynasty, a crown prince is sent on a suicide mission.",
    poster_path: "/tAJvlbgUtLJoTfUrCXpJNI7Uo3J.jpg",
    backdrop_path: "/9OE62lhp5FP2tz6QoxjnUBOUNsy.jpg",
    first_air_date: "2019-01-25",
    vote_average: 8.0,
    vote_count: 987,
    popularity: 876.543,
    genre_ids: [18, 27, 10759],
    origin_country: ["KR"]
  }
];

// Helper to filter Korean dramas only
const filterKoreanDramas = (dramas: Drama[]): Drama[] => {
  if (!dramas || !Array.isArray(dramas)) {
    console.warn('Invalid dramas array received:', dramas);
    return [];
  }
  
  return dramas.filter(drama => {
    if (!drama) return false;
    
    // Check if origin_country exists and includes KR
    const hasKoreanOrigin = drama.origin_country && Array.isArray(drama.origin_country) && drama.origin_country.includes("KR");
    
    // Check if original_name contains Korean characters
    const hasKoreanText = drama.original_name && drama.original_name.match(/[가-힣]/);
    
    // For safety, also check if it's empty origin_country but has Korean text
    const isEmptyOriginWithKorean = (!drama.origin_country || drama.origin_country.length === 0) && hasKoreanText;
    
    return hasKoreanOrigin || hasKoreanText || isEmptyOriginWithKorean;
  });
};

// Get trending K-dramas
export const getTrendingDramas = async (): Promise<Drama[]> => {
  try {
    console.log('Fetching trending dramas (primary: trending/day)...');

    const trendingRes = await fetch(
      `${TMDB_BASE_URL}/trending/tv/day?language=pt-BR`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let trendingResults: Drama[] = [];
    if (trendingRes.ok) {
      const data = await trendingRes.json() as DramaResponse;
      console.log(`TMDB returned ${data.results?.length || 0} trending/day results`);
      trendingResults = filterKoreanDramas(data.results || []);
      console.log(`After KR filter: ${trendingResults.length}`);
    } else {
      console.error(`TMDB trending error: ${trendingRes.status} ${trendingRes.statusText}`);
    }

    // If too few items, backfill with discover endpoints scoped to KR and KO
    let backfillResults: Drama[] = [];
    if (!trendingResults || trendingResults.length < 10) {
      console.log('Backfilling trending with discover endpoints...');

      const [discoverOriginRes, discoverLangRes] = await Promise.all([
        fetch(`${TMDB_BASE_URL}/discover/tv?language=pt-BR&with_origin_country=KR&sort_by=popularity.desc&page=1`, {
          headers: {
            'Authorization': `Bearer ${TMDB_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${TMDB_BASE_URL}/discover/tv?language=pt-BR&with_original_language=ko&sort_by=popularity.desc&page=1`, {
          headers: {
            'Authorization': `Bearer ${TMDB_API_KEY}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (discoverOriginRes.ok) {
        const d = await discoverOriginRes.json() as DramaResponse;
        backfillResults = backfillResults.concat(filterKoreanDramas(d.results || []));
      } else {
        console.error(`Discover (origin KR) error: ${discoverOriginRes.status} ${discoverOriginRes.statusText}`);
      }

      if (discoverLangRes.ok) {
        const d2 = await discoverLangRes.json() as DramaResponse;
        backfillResults = backfillResults.concat(filterKoreanDramas(d2.results || []));
      } else {
        console.error(`Discover (lang ko) error: ${discoverLangRes.status} ${discoverLangRes.statusText}`);
      }
    }

    // Deduplicate and limit
    const byId: Record<number, Drama> = {};
    [...(trendingResults || []), ...(backfillResults || [])].forEach((item) => {
      if (item && typeof item.id === 'number') byId[item.id] = item;
    });
    const merged = Object.values(byId).slice(0, 20);

    if (merged.length === 0) {
      console.log('No results after merge, using mock data');
      return mockDramas;
    }

    console.log(`Trending final count: ${merged.length}`);
    return merged;
  } catch (error) {
    console.error('Error fetching trending dramas:', error);
    console.log('Using mock data as fallback due to error');
    return mockDramas;
  }
};

// Get popular K-dramas
export const getPopularDramas = async (): Promise<Drama[]> => {
  try {
    console.log('Fetching popular dramas...');
    const response = await fetch(
      `${TMDB_BASE_URL}/discover/tv?language=pt-BR&with_origin_country=KR&sort_by=popularity.desc`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      console.error(`TMDB API error: ${response.status} ${response.statusText}`);
      console.log('Using mock data as fallback for popular dramas');
      return mockDramas;
    }
    
    const data = await response.json() as DramaResponse;
    console.log(`TMDB returned ${data.results?.length || 0} popular results`);
    
    const filteredResults = filterKoreanDramas(data.results || []);
    console.log(`Filtered to ${filteredResults.length} Korean dramas`);
    
    // If no Korean dramas found, use mock data
    if (filteredResults.length === 0) {
      console.log('No Korean dramas found, using mock data');
      return mockDramas;
    }
    
    return filteredResults;
  } catch (error) {
    console.error("Error fetching popular dramas:", error);
    console.log('Using mock data as fallback due to error');
    return mockDramas;
  }
};

// Get drama details by ID with retry logic
export const getDramaDetails = async (id: number, retryCount: number = 0): Promise<DramaDetails> => {
  const maxRetries = 2;
  
  try {
    console.log(`getDramaDetails called with ID: ${id} (attempt ${retryCount + 1})`);
    
    // Create AbortController with generous timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${id}?language=pt-BR`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`TMDB API error for drama ${id}: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch drama details: ${response.status}`);
    }
    
    const data = await response.json() as DramaDetails;
    console.log(`getDramaDetails success for ID ${id}:`, {
      id: data.id,
      name: data.name,
      original_name: data.original_name
    });
    
    return data;
  } catch (error) {
    // Handle AbortError specifically
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`Request timeout for drama ${id} (attempt ${retryCount + 1})`);
      
      // Retry without timeout if we haven't exceeded max retries
      if (retryCount < maxRetries) {
        console.log(`Retrying drama ${id} without timeout...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Progressive delay
        return getDramaDetails(id, retryCount + 1);
      }
    }
    
    console.error(`Error fetching drama details for ID ${id} (attempt ${retryCount + 1}):`, error);
    throw error;
  }
};

// Get drama credits (cast & crew)
export const getDramaCredits = async (id: number): Promise<DramaCredits> => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${id}/credits?language=pt-BR`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch drama credits");
    }
    
    return await response.json() as DramaCredits;
  } catch (error) {
    console.error(`Error fetching drama credits for ID ${id}:`, error);
    throw error;
  }
};

// Get actor details
export const getActorDetails = async (id: number): Promise<ActorDetails> => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/person/${id}?language=pt-BR`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch actor details");
    }
    
    return await response.json() as ActorDetails;
  } catch (error) {
    console.error(`Error fetching actor details for ID ${id}:`, error);
    throw error;
  }
};

// Get actor credits (only TV shows)
export const getActorCredits = async (id: number): Promise<ActorCredits> => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/person/${id}/tv_credits?language=pt-BR`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch actor credits");
    }
    
    const data = await response.json() as ActorCredits;
    
    // Filter to only include Korean dramas
    data.cast = data.cast.filter(show => 
      show.origin_country?.includes("KR") || 
      (show.original_name && show.original_name.match(/[가-힣]/))
    );
    
    return data;
  } catch (error) {
    console.error(`Error fetching actor credits for ID ${id}:`, error);
    throw error;
  }
};

// Search for K-dramas
export const searchDramas = async (query: string): Promise<Drama[]> => {
  try {
    console.log(`Searching for dramas with query: "${query}"`);
    
    const response = await fetch(
      `${TMDB_BASE_URL}/search/tv?language=pt-BR&query=${encodeURIComponent(query)}`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      console.error(`TMDB API error: ${response.status} ${response.statusText}`);
      throw new Error("Failed to search dramas");
    }
    
    const data = await response.json() as DramaResponse;
    console.log(`TMDB returned ${data.results.length} total results`);
    
    // For search, be more lenient with filtering to include more results
    const filteredResults = data.results.filter(drama => {
      const hasKoreanOrigin = drama.origin_country.includes("KR");
      const hasKoreanText = drama.original_name && drama.original_name.match(/[가-힣]/);
      const isAsianContent = drama.origin_country.some(country => ['KR', 'JP', 'CN', 'TW', 'TH'].includes(country));
      
      return hasKoreanOrigin || hasKoreanText || (isAsianContent && query.length > 2);
    });
    
    console.log(`Filtered to ${filteredResults.length} Korean/Asian dramas`);
    return filteredResults;
  } catch (error) {
    console.error(`Error searching dramas with query "${query}":`, error);
    throw error;
  }
};

// Get dramas by genre
export const getDramasByGenre = async (genreId: number, page: number = 1): Promise<DramaResponse> => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/discover/tv?language=pt-BR&with_genres=${genreId}&with_origin_country=KR&page=${page}`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch dramas by genre");
    }
    
    const data = await response.json() as DramaResponse;
    data.results = filterKoreanDramas(data.results);
    return data;
  } catch (error) {
    console.error(`Error fetching dramas for genre ID ${genreId}:`, error);
    throw error;
  }
};

// Get top rated K-dramas
export const getTopRatedDramas = async (page: number = 1): Promise<DramaResponse> => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/discover/tv?language=pt-BR&with_origin_country=KR&sort_by=vote_average.desc&vote_count.gte=100&page=${page}`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch top rated dramas");
    }
    
    const data = await response.json() as DramaResponse;
    data.results = filterKoreanDramas(data.results);
    return data;
  } catch (error) {
    console.error("Error fetching top rated dramas:", error);
    throw error;
  }
};

// Get latest K-dramas
export const getLatestDramas = async (page: number = 1): Promise<DramaResponse> => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/discover/tv?language=pt-BR&with_origin_country=KR&sort_by=first_air_date.desc&page=${page}`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch latest dramas");
    }
    
    const data = await response.json() as DramaResponse;
    data.results = filterKoreanDramas(data.results);
    return data;
  } catch (error) {
    console.error("Error fetching latest dramas:", error);
    throw error;
  }
};

// Get trending K-dramas with pagination
export const getTrendingDramasWithPagination = async (page: number = 1): Promise<DramaResponse> => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/trending/tv/week?language=pt-BR&page=${page}`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch trending dramas");
    }
    
    const data = await response.json() as DramaResponse;
    data.results = filterKoreanDramas(data.results);
    return data;
  } catch (error) {
    console.error("Error fetching trending dramas:", error);
    throw error;
  }
};

// Get streaming providers for a drama
export const getDramaProviders = async (id: number): Promise<any> => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${id}/watch/providers`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch drama providers");
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching drama providers for ID ${id}:`, error);
    throw error;
  }
};

// Get drama images
export const getDramaImages = async (id: number): Promise<DramaImages> => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${id}/images`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch drama images");
    }
    
    return await response.json() as DramaImages;
  } catch (error) {
    console.error(`Error fetching drama images for ID ${id}:`, error);
    throw error;
  }
};

// Get drama videos
export const getDramaVideos = async (id: number): Promise<DramaVideos> => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${id}/videos?language=pt-BR`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch drama videos");
    }
    
    return await response.json() as DramaVideos;
  } catch (error) {
    console.error(`Error fetching drama videos for ID ${id}:`, error);
    throw error;
  }
};

// Get season details with episodes
export const getSeasonDetails = async (seriesId: number, seasonNumber: number): Promise<SeasonDetails> => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${seriesId}/season/${seasonNumber}?language=pt-BR`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch season details");
    }
    
    return await response.json() as SeasonDetails;
  } catch (error) {
    console.error(`Error fetching season ${seasonNumber} details for series ID ${seriesId}:`, error);
    throw error;
  }
};

// Get a random K-drama recommendation
export const getRandomDrama = async (): Promise<Drama> => {
  try {
    // First get a list of popular dramas
    const dramas = await getPopularDramas();
    
    // Select a random drama from the list
    const randomIndex = Math.floor(Math.random() * dramas.length);
    return dramas[randomIndex];
  } catch (error) {
    console.error("Error getting random drama:", error);
    throw error;
  }
};

// Get random dramas for swipe feature with timeout handling
export const getRandomDramas = async (count: number = 10): Promise<Drama[]> => {
  try {
    // Create fetch function with timeout
    const fetchWithTimeout = async (url: string) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout
      
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${TMDB_API_KEY}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          return await response.json();
        }
        return { results: [] };
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn(`Request timeout for URL: ${url}`);
        } else {
          console.error(`Error fetching ${url}:`, error);
        }
        return { results: [] };
      }
    };
    
    // Get multiple pages of different drama types to create variety
    const [popularPage1, popularPage2, trendingPage1, topRatedPage1] = await Promise.all([
      fetchWithTimeout(`${TMDB_BASE_URL}/discover/tv?language=pt-BR&with_origin_country=KR&sort_by=popularity.desc&page=1`),
      fetchWithTimeout(`${TMDB_BASE_URL}/discover/tv?language=pt-BR&with_origin_country=KR&sort_by=popularity.desc&page=2`),
      fetchWithTimeout(`${TMDB_BASE_URL}/trending/tv/week?language=pt-BR&page=1`),
      fetchWithTimeout(`${TMDB_BASE_URL}/discover/tv?language=pt-BR&with_origin_country=KR&sort_by=vote_average.desc&vote_count.gte=100&page=1`)
    ]);
    
    // Combine all results and filter Korean dramas
    const allDramas = [
      ...filterKoreanDramas(popularPage1?.results || []),
      ...filterKoreanDramas(popularPage2?.results || []),
      ...filterKoreanDramas(trendingPage1?.results || []),
      ...filterKoreanDramas(topRatedPage1?.results || [])
    ];
    
    // Remove duplicates based on ID
    const uniqueDramas = allDramas.filter((drama, index, self) => 
      index === self.findIndex(d => d.id === drama.id)
    );
    
    // Shuffle the array and return requested count
    const shuffled = uniqueDramas.sort(() => 0.5 - Math.random());
    const result = shuffled.slice(0, count);
    
    // If we don't have enough dramas, use mock data to fill
    if (result.length < count) {
      console.log(`Only got ${result.length} dramas, padding with mock data`);
      const mockToAdd = mockDramas.slice(0, count - result.length);
      result.push(...mockToAdd);
    }
    
    return result;
  } catch (error) {
    console.error("Error getting random dramas:", error);
    // Return mock data as fallback
    return mockDramas.slice(0, count);
  }
};

// Get upcoming K-dramas (releases calendar)
export const getUpcomingDramas = async (page: number = 1): Promise<DramaResponse> => {
  try {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setMonth(today.getMonth() + 6); // Next 6 months
    
    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    const response = await fetch(
      `${TMDB_BASE_URL}/discover/tv?language=pt-BR&with_origin_country=KR&first_air_date.gte=${todayStr}&first_air_date.lte=${futureDateStr}&sort_by=first_air_date.asc&page=${page}`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch upcoming dramas");
    }
    
    const data = await response.json() as DramaResponse;
    data.results = filterKoreanDramas(data.results);
    return data;
  } catch (error) {
    console.error("Error fetching upcoming dramas:", error);
    throw error;
  }
};

// Get upcoming K-dramas (simple list for preview)
export const getUpcomingDramasPreview = async (): Promise<Drama[]> => {
  try {
    const response = await getUpcomingDramas(1);
    return response.results.slice(0, 6); // Return first 6 for preview
  } catch (error) {
    console.error("Error fetching upcoming dramas preview:", error);
    throw error;
  }
};

// Get top Netflix K-dramas sorted by rating
export const getNetflixDramas = async (): Promise<Drama[]> => {
  try {
    console.log('Fetching top Netflix K-dramas...');
    
    // Netflix provider ID is 8
    const response = await fetch(
      `${TMDB_BASE_URL}/discover/tv?language=pt-BR&with_origin_country=KR&with_watch_providers=8&watch_region=BR&sort_by=vote_average.desc&vote_count.gte=50`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      console.error(`TMDB API error for Netflix dramas: ${response.status} ${response.statusText}`);
      // Fallback to general Korean dramas with high ratings
      return getTopRatedDramas().then(data => data.results.slice(0, 10));
    }
    
    const data = await response.json() as DramaResponse;
    console.log(`TMDB returned ${data.results?.length || 0} Netflix results`);
    
    const filteredResults = filterKoreanDramas(data.results || []);
    console.log(`Filtered to ${filteredResults.length} Netflix Korean dramas`);
    
    // If no results, use fallback
    if (filteredResults.length === 0) {
      console.log('No Netflix Korean dramas found, using top rated as fallback');
      const fallback = await getTopRatedDramas();
      return fallback.results.slice(0, 10);
    }
    
    return filteredResults.slice(0, 10);
  } catch (error) {
    console.error('Error fetching Netflix dramas:', error);
    // Fallback to top rated dramas
    try {
      const fallback = await getTopRatedDramas();
      return fallback.results.slice(0, 10);
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      return mockDramas.slice(0, 3);
    }
  }
};

// Get top Viki K-dramas sorted by rating
export const getVikiDramas = async (): Promise<Drama[]> => {
  try {
    console.log('Fetching top Viki K-dramas...');
    
    // Since Viki might not be in TMDB providers, we'll get highly rated Korean dramas
    // and filter by those that are likely on Viki (recent, popular Korean content)
    const response = await fetch(
      `${TMDB_BASE_URL}/discover/tv?language=pt-BR&with_origin_country=KR&sort_by=vote_average.desc&vote_count.gte=30&first_air_date.gte=2018-01-01`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      console.error(`TMDB API error for Viki dramas: ${response.status} ${response.statusText}`);
      // Fallback to general Korean dramas with high ratings
      return getTopRatedDramas().then(data => data.results.slice(0, 10));
    }
    
    const data = await response.json() as DramaResponse;
    console.log(`TMDB returned ${data.results?.length || 0} Viki-style results`);
    
    const filteredResults = filterKoreanDramas(data.results || []);
    console.log(`Filtered to ${filteredResults.length} Viki-style Korean dramas`);
    
    // If no results, use fallback
    if (filteredResults.length === 0) {
      console.log('No Viki-style Korean dramas found, using top rated as fallback');
      const fallback = await getTopRatedDramas();
      return fallback.results.slice(0, 10);
    }
    
    return filteredResults.slice(0, 10);
  } catch (error) {
    console.error('Error fetching Viki dramas:', error);
    // Fallback to top rated dramas
    try {
      const fallback = await getTopRatedDramas();
      return fallback.results.slice(0, 10);
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      return mockDramas.slice(0, 3);
    }
  }
};

// Calculate total runtime for a drama (all seasons and episodes)
export const calculateDramaTotalRuntime = async (seriesId: number): Promise<number> => {
  try {
    console.log(`Calculating total runtime for series ID: ${seriesId}`);
    
    // First get the series details to know how many seasons and episodes
    const seriesDetails = await getDramaDetails(seriesId);
    const numberOfSeasons = seriesDetails.number_of_seasons || 1;
    const totalEpisodes = seriesDetails.number_of_episodes || 16;
    
    console.log(`Series has ${numberOfSeasons} seasons and ${totalEpisodes} episodes`);
    
    // For most K-dramas, we can use a simple calculation
    // If episode_run_time is available, use it
    if (seriesDetails.episode_run_time && Array.isArray(seriesDetails.episode_run_time) && seriesDetails.episode_run_time.length > 0) {
      const avgEpisodeRuntime = seriesDetails.episode_run_time[0]; // Use first runtime value
      const totalRuntime = avgEpisodeRuntime * totalEpisodes;
      console.log(`Using episode_run_time: ${avgEpisodeRuntime} minutes per episode, total: ${totalRuntime} minutes`);
      return totalRuntime;
    }
    
    let totalRuntimeMinutes = 0;
    let successfulSeasons = 0;
    
    // Try to get detailed season information (but don't fail if it doesn't work)
    for (let seasonNumber = 1; seasonNumber <= Math.min(numberOfSeasons, 3); seasonNumber++) {
      try {
        const seasonDetails = await getSeasonDetails(seriesId, seasonNumber);
        
        // Sum up runtime for all episodes in this season
        if (seasonDetails.episodes && Array.isArray(seasonDetails.episodes)) {
          const seasonRuntime = seasonDetails.episodes.reduce((sum, episode) => {
            return sum + (episode.runtime || 60); // Default to 60 minutes if no runtime
          }, 0);
          
          totalRuntimeMinutes += seasonRuntime;
          successfulSeasons++;
          console.log(`Season ${seasonNumber}: ${seasonRuntime} minutes (${seasonDetails.episodes.length} episodes)`);
        }
      } catch (seasonError) {
        console.warn(`Error fetching season ${seasonNumber} for series ${seriesId}:`, seasonError);
        // Continue to next season or use fallback
        break;
      }
    }
    
    // If we got some season data, extrapolate for remaining seasons
    if (successfulSeasons > 0 && successfulSeasons < numberOfSeasons) {
      const avgSeasonRuntime = totalRuntimeMinutes / successfulSeasons;
      const remainingSeasons = numberOfSeasons - successfulSeasons;
      totalRuntimeMinutes += avgSeasonRuntime * remainingSeasons;
      console.log(`Extrapolated ${remainingSeasons} remaining seasons based on average`);
    }
    
    // If we have a reasonable total, return it
    if (totalRuntimeMinutes > 0) {
      console.log(`Total runtime for series ${seriesId}: ${totalRuntimeMinutes} minutes`);
      return totalRuntimeMinutes;
    }
    
    // Fallback to estimation
    throw new Error('No detailed runtime data available, using estimation');
    
  } catch (error) {
    console.error(`Error calculating detailed runtime for series ${seriesId}:`, error);
    
    // Fallback: estimate based on series details or defaults
    try {
      const seriesDetails = await getDramaDetails(seriesId);
      const totalEpisodes = seriesDetails.number_of_episodes || 16;
      
      // Use episode_run_time if available
      if (seriesDetails.episode_run_time && Array.isArray(seriesDetails.episode_run_time) && seriesDetails.episode_run_time.length > 0) {
        const avgRuntime = seriesDetails.episode_run_time[0];
        const estimatedRuntime = avgRuntime * totalEpisodes;
        console.log(`Using fallback with episode_run_time: ${estimatedRuntime} minutes`);
        return estimatedRuntime;
      }
      
      // Default estimation for K-dramas
      const avgRuntime = 60; // Default runtime for K-dramas
      const estimatedRuntime = avgRuntime * totalEpisodes;
      console.log(`Using default estimation: ${estimatedRuntime} minutes (${totalEpisodes} episodes × ${avgRuntime} minutes)`);
      return estimatedRuntime;
    } catch (fallbackError) {
      console.error('Fallback estimation also failed:', fallbackError);
    }
    
    // Last resort: return a default estimate for typical K-drama
    const defaultRuntime = 16 * 60; // 16 episodes * 60 minutes
    console.log(`Using last resort default: ${defaultRuntime} minutes`);
    return defaultRuntime;
  }
};