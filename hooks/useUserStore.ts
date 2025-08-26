import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useEffect, useState, useCallback } from "react";
import { ListType, UserList, UserProfile, UserRanking } from "@/types/user";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getDramaDetails, calculateDramaTotalRuntime } from "@/services/api";
import { TMDB_IMAGE_BASE_URL, POSTER_SIZE } from "@/constants/config";

// Initial empty user profile
const initialUserProfile: UserProfile = {
  id: '',
  username: '',
  displayName: '',
  bio: '',
  profileImage: '',
  followersCount: 0,
  followingCount: 0,
  userType: 'normal',
  isVerified: false,
  dailySwipeLimit: 20,
  isPremiumActive: false,
  lists: {
    watching: [],
    watchlist: [],
    completed: []
  },
  rankings: [],
  achievements: [],
  stats: {
    totalWatchTime: 0,
    genreBreakdown: {},
    monthlyWatchTime: {}
  },
  premium: {
    isSubscribed: false,
    customReactions: false,
    advancedFilters: false,
    multipleRankings: false,
    detailedStats: false
  },
  createdAt: new Date().toISOString()
};

export const [UserContext, useUserStore] = createContextHook(() => {
  const [userProfile, setUserProfile] = useState<UserProfile>(initialUserProfile);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { user } = useAuth();

  // Load user data from database on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadUserData = async () => {
      if (!user) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }
      
      try {
        // Load user profile data
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (userError) {
          console.error('Error loading user profile:', userError);
          if (isMounted) {
            setIsLoading(false);
          }
          return;
        }
        
        // Load user drama lists
        const { data: listsData } = await supabase
          .from('user_drama_lists')
          .select('*')
          .eq('user_id', user.id);
          
        // Load user rankings (don't use .single() to avoid errors when no rankings exist)
        const { data: rankingsData } = await supabase
          .from('user_rankings')
          .select(`
            *,
            ranking_items (
              drama_id,
              rank_position
            )
          `)
          .eq('user_id', user.id)
          .eq('is_public', true);
        
        if (!isMounted) return;
        
        // Transform data to match UserProfile structure
        const lists = {
          watching: [],
          watchlist: [],
          completed: []
        } as { [K in ListType]: UserList[] };
        
        if (listsData) {
          listsData.forEach(item => {
            const userListItem: UserList = {
              dramaId: item.drama_id,
              addedAt: item.added_at,
              current_episode: item.current_episode,
              total_episodes: item.total_episodes,
              total_runtime_minutes: item.total_runtime_minutes,
              watched_minutes: item.watched_minutes,
              episodes_watched: item.episodes_watched,
              drama_name: item.drama_name,
              drama_year: item.drama_year,
              poster_image: item.poster_image,
              poster_path: item.poster_path
            };
            
            if (item.list_type === 'watching' && item.total_episodes) {
              let watchedEpisodes: number[] = [];
              try {
                if (item.watched_episodes && typeof item.watched_episodes === 'string' && item.watched_episodes.trim() !== '') {
                  watchedEpisodes = JSON.parse(item.watched_episodes);
                } else if (Array.isArray(item.watched_episodes)) {
                  watchedEpisodes = item.watched_episodes;
                }
              } catch (e) {
                console.warn('Failed to parse watched_episodes in initial load:', item.watched_episodes, e);
                watchedEpisodes = [];
              }
              
              userListItem.progress = {
                currentEpisode: item.current_episode || 0,
                totalEpisodes: item.total_episodes,
                watchedEpisodes,
                totalWatchTimeMinutes: item.watched_minutes || 0,
                episodesWatched: item.episodes_watched || 0
              };
            }
            
            lists[item.list_type as ListType].push(userListItem);
          });
        }
        
        const rankings: UserRanking[] = [];
        if (rankingsData && rankingsData.length > 0 && rankingsData[0]?.ranking_items) {
          rankings.push(...rankingsData[0].ranking_items.map((item: any) => ({
            dramaId: item.drama_id,
            rank: item.rank_position
          })));
        }
        
        setUserProfile({
          id: userData.id,
          username: userData.username,
          displayName: userData.display_name,
          bio: userData.bio,
          profileImage: userData.profile_image,
          userProfileCover: userData.user_profile_cover,
          followersCount: userData.followers_count || 0,
          followingCount: userData.following_count || 0,
          userType: userData.user_type || 'normal',
          isVerified: userData.is_verified || false,
          verificationType: userData.verification_type,
          dailySwipeLimit: userData.user_type === 'premium' ? 50 : 20,
          isPremiumActive: userData.user_type === 'premium',
          lists,
          rankings,
          achievements: [],
          stats: {
            totalWatchTime: 0,
            genreBreakdown: {},
            monthlyWatchTime: {}
          },
          premium: {
            isSubscribed: userData.user_type === 'premium',
            customReactions: false,
            advancedFilters: false,
            multipleRankings: false,
            detailedStats: false
          },
          createdAt: userData.created_at || new Date().toISOString()
        });
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading user data:", error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadUserData();
    
    return () => {
      isMounted = false;
    };
  }, [user?.id]); // Only depend on user.id to avoid infinite loops

  // Save user data to AsyncStorage for offline access
  useEffect(() => {
    const saveUserData = async () => {
      try {
        const dataToSave = JSON.stringify(userProfile);
        if (dataToSave && dataToSave !== '{}') {
          await AsyncStorage.setItem("userProfile", dataToSave);
        }
      } catch (error) {
        console.error("Error saving user data:", error);
      }
    };

    if (!isLoading && user && userProfile.id) {
      saveUserData();
    }
  }, [userProfile, isLoading, user]);

  // Add drama to a list and persist basic metadata
  const addToList = async (
    dramaId: number,
    listType: ListType,
    totalEpisodes?: number,
    meta?: { name?: string; poster_path?: string | null; first_air_date?: string | null; number_of_episodes?: number | null }
  ) => {
    if (!user) return;

    try {
      // Prefill metadata from params
      let drama_name: string | null = meta?.name ?? null;
      let poster_path: string | null = meta?.poster_path ?? null;
      let drama_year: number | null = meta?.first_air_date ? new Date(meta.first_air_date).getFullYear() : null;
      let total_episodes: number | null = (typeof totalEpisodes === 'number' ? totalEpisodes : null) ?? (meta?.number_of_episodes ?? null);
      let poster_image: string | null = poster_path ? `${TMDB_IMAGE_BASE_URL}/${POSTER_SIZE}${poster_path}` : null;
      let total_runtime_minutes: number = 0;

      // Fetch details if required metadata missing or to get genre information
      let drama_category: string | null = null;
      if (!drama_name || !poster_path || !drama_year || !total_episodes || !drama_category) {
        try {
          const details = await getDramaDetails(dramaId);
          drama_name = drama_name ?? details.name;
          poster_path = poster_path ?? details.poster_path;
          drama_year = drama_year ?? (details.first_air_date ? new Date(details.first_air_date).getFullYear() : null);
          total_episodes = total_episodes ?? (details.number_of_episodes ?? null);
          if (!poster_image && details.poster_path) {
            poster_image = `${TMDB_IMAGE_BASE_URL}/${POSTER_SIZE}${details.poster_path}`;
          }
          // Extract primary genre as drama category
          if (details.genres && details.genres.length > 0) {
            drama_category = details.genres[0].name; // Use the first genre as primary category
          }
        } catch (e) {
          console.log('getDramaDetails failed, continuing with partial meta', e);
        }
      }

      // Calculate total runtime for all list types
      try {
        total_runtime_minutes = await calculateDramaTotalRuntime(dramaId);
        console.log(`Calculated runtime for drama ${dramaId}: ${total_runtime_minutes} minutes`);
      } catch (e) {
        console.log('Failed to calculate runtime, using default estimate', e);
        // Fallback: estimate 60 minutes per episode for K-dramas
        total_runtime_minutes = (total_episodes || 16) * 60;
      }
      
      // Ensure we have a valid runtime
      if (!total_runtime_minutes || total_runtime_minutes <= 0) {
        total_runtime_minutes = (total_episodes || 16) * 60;
      }
      
      console.log(`Final runtime for drama ${dramaId}: ${total_runtime_minutes} minutes, episodes: ${total_episodes}`);

      // First, check if drama exists in ANY list for this user
      const { data: existing } = await supabase
        .from('user_drama_lists')
        .select('*')
        .eq('user_id', user.id)
        .eq('drama_id', dramaId)
        .limit(1)
        .single();

      if (existing) {
        // Update existing record - change list type
        const finalTotalEpisodes = total_episodes || existing.total_episodes || 16;
        const currentEpisode = listType === 'watchlist' ? 0 : (listType === 'watching' ? (existing.current_episode || 0) : (listType === 'completed' ? finalTotalEpisodes : existing.current_episode));
        const episodesWatched = currentEpisode;
        const watchedMinutes = listType === 'completed' ? total_runtime_minutes : (listType === 'watchlist' ? 0 : Math.round((currentEpisode / finalTotalEpisodes) * total_runtime_minutes));
        
        console.log(`Updating existing drama ${dramaId}: listType=${listType}, currentEpisode=${currentEpisode}, totalEpisodes=${finalTotalEpisodes}, watchedMinutes=${watchedMinutes}, totalRuntime=${total_runtime_minutes}`);
        
        const updateData: any = {
          list_type: listType,
          current_episode: currentEpisode,
          total_episodes: finalTotalEpisodes,
          drama_name: drama_name ?? existing.drama_name ?? null,
          poster_path: poster_path ?? existing.poster_path ?? null,
          drama_year: drama_year ?? existing.drama_year ?? null,
          poster_image: poster_image ?? existing.poster_image ?? null,
          total_runtime_minutes: total_runtime_minutes,
          watched_minutes: watchedMinutes,
          episodes_watched: episodesWatched,
          drama_category: drama_category ?? existing.drama_category ?? null,
          updated_at: new Date().toISOString()
        };
        
        const { error } = await supabase
          .from('user_drama_lists')
          .update(updateData)
          .eq('id', existing.id);
          
        if (error) {
          console.error('Error updating existing record:', error);
          throw error;
        }
      } else {
        // Insert new record
        const finalTotalEpisodes = total_episodes || 16;
        const currentEpisode = listType === 'watchlist' ? 0 : (listType === 'watching' ? 0 : (listType === 'completed' ? finalTotalEpisodes : 0));
        const episodesWatched = currentEpisode;
        const watchedMinutes = listType === 'completed' ? total_runtime_minutes : 0;
        
        console.log(`Inserting new drama ${dramaId}: listType=${listType}, currentEpisode=${currentEpisode}, totalEpisodes=${finalTotalEpisodes}, watchedMinutes=${watchedMinutes}, totalRuntime=${total_runtime_minutes}`);
        
        const insertData: any = {
          user_id: user.id,
          drama_id: dramaId,
          list_type: listType,
          current_episode: currentEpisode,
          total_episodes: finalTotalEpisodes,
          drama_name: drama_name ?? null,
          poster_path: poster_path ?? null,
          drama_year: drama_year ?? null,
          poster_image: poster_image ?? null,
          total_runtime_minutes: total_runtime_minutes,
          watched_minutes: watchedMinutes,
          episodes_watched: episodesWatched,
          drama_category: drama_category ?? null,
        };
        
        const { error } = await supabase
          .from('user_drama_lists')
          .insert(insertData);
          
        if (error) {
          console.error('Error inserting new record:', error);
          throw error;
        }
      }

      // Update local state - remove from all lists first, then add to target list
      setUserProfile(prev => {
        const newLists = { ...prev.lists } as { [K in ListType]: UserList[] };
        
        // Remove from all lists to avoid duplicates
        Object.keys(newLists).forEach(key => {
          newLists[key as ListType] = newLists[key as ListType].filter(item => item.dramaId !== dramaId);
        });
        
        // Add to target list
        const newItem: UserList = {
          dramaId,
          addedAt: new Date().toISOString(),
          drama_name: drama_name || undefined,
          drama_year: drama_year || undefined,
          poster_image: poster_image || undefined,
          poster_path: poster_path || undefined,
          total_episodes: total_episodes || undefined,
          total_runtime_minutes: total_runtime_minutes || undefined
        };
        
        if (listType === "watching" && total_episodes) {
          newItem.progress = {
            currentEpisode: 0,
            totalEpisodes: total_episodes,
            watchedEpisodes: [],
            totalWatchTimeMinutes: 0
          };
        }
        
        newLists[listType].push(newItem);
        
        console.log(`addToList - Added dramaId ${dramaId} to ${listType} list`);
        console.log(`addToList - New ${listType} list:`, newLists[listType].map(item => item.dramaId));
        
        return { ...prev, lists: newLists };
      });
    } catch (error) {
      console.error('Error adding to list:', error);
    }
  };

  // Remove drama from a list
  const removeFromList = async (dramaId: number, listType: ListType) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('user_drama_lists')
        .delete()
        .eq('user_id', user.id)
        .eq('drama_id', dramaId)
        .eq('list_type', listType);
        
      if (error) throw error;
      
      // Update local state
      setUserProfile(prev => {
        const newList = prev.lists[listType].filter(item => item.dramaId !== dramaId);
        
        return {
          ...prev,
          lists: {
            ...prev.lists,
            [listType]: newList
          }
        };
      });
    } catch (error) {
      console.error('Error removing from list:', error);
    }
  };

  // Delete current user's review for a drama
  const deleteUserReview = async (dramaId: number) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('drama_reviews' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('drama_id', dramaId);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting user review:', error);
    }
  };

  // Update episode progress
  const updateProgress = async (dramaId: number, currentEpisode: number) => {
    if (!user) return;
    
    try {
      const { data: dramaData } = await supabase
        .from('user_drama_lists')
        .select('*')
        .eq('user_id', user.id)
        .eq('drama_id', dramaId)
        .eq('list_type', 'watching')
        .single();
        
      if (!dramaData) return;
      
      let currentWatchedEpisodes: number[] = [];
      try {
        if (dramaData.watched_episodes && typeof dramaData.watched_episodes === 'string' && dramaData.watched_episodes.trim() !== '') {
          currentWatchedEpisodes = JSON.parse(dramaData.watched_episodes);
        } else if (Array.isArray(dramaData.watched_episodes)) {
          currentWatchedEpisodes = dramaData.watched_episodes;
        }
      } catch (e) {
        console.warn('Failed to parse watched_episodes in updateProgress:', dramaData.watched_episodes, e);
        currentWatchedEpisodes = [];
      }
      
      const newWatchedEpisodes = [...currentWatchedEpisodes];
      for (let ep = (dramaData.current_episode || 0) + 1; ep <= currentEpisode; ep++) {
        if (!newWatchedEpisodes.includes(ep)) {
          newWatchedEpisodes.push(ep);
        }
      }
      
      let ensuredTotalEpisodes = dramaData.total_episodes || 0;
      let ensuredTotalRuntime = dramaData.total_runtime_minutes || 0;
      let ensuredDramaCategory = dramaData.drama_category || null;
      
      // Fetch details if missing essential data or category
      if (!ensuredTotalEpisodes || ensuredTotalEpisodes <= 0 || !ensuredDramaCategory) {
        try {
          const details = await getDramaDetails(dramaId);
          if (!ensuredTotalEpisodes || ensuredTotalEpisodes <= 0) {
            ensuredTotalEpisodes = details.number_of_episodes || 16;
            console.log(`updateProgress: filled total_episodes from TMDB = ${ensuredTotalEpisodes}`);
          }
          if (!ensuredDramaCategory && details.genres && details.genres.length > 0) {
            ensuredDramaCategory = details.genres[0].name;
            console.log(`updateProgress: filled drama_category from TMDB = ${ensuredDramaCategory}`);
          }
        } catch (e) {
          if (!ensuredTotalEpisodes || ensuredTotalEpisodes <= 0) {
            ensuredTotalEpisodes = 16;
            console.log('updateProgress: failed to fetch total_episodes, using 16');
          }
        }
      }
      
      if (!ensuredTotalRuntime || ensuredTotalRuntime <= 0) {
        try {
          ensuredTotalRuntime = await calculateDramaTotalRuntime(dramaId);
          console.log(`updateProgress: calculated total_runtime_minutes = ${ensuredTotalRuntime}`);
        } catch (e) {
          ensuredTotalRuntime = ensuredTotalEpisodes * 60;
          console.log('updateProgress: failed to calculate runtime, using default');
        }
      }
      
      const averageEpisodeLength = ensuredTotalRuntime / ensuredTotalEpisodes;
      const watchedMinutes = Math.round(currentEpisode * averageEpisodeLength);
      
      console.log(`updateProgress: drama ${dramaId}, currentEpisode: ${currentEpisode}, totalEpisodes: ${ensuredTotalEpisodes}, watchedMinutes: ${watchedMinutes}`);
      
      const isCompleted = currentEpisode >= ensuredTotalEpisodes;
      
      const updateData: any = {
        current_episode: Math.min(currentEpisode, ensuredTotalEpisodes),
        episodes_watched: Math.min(currentEpisode, ensuredTotalEpisodes),
        watched_minutes: isCompleted ? ensuredTotalRuntime : watchedMinutes,
        total_episodes: ensuredTotalEpisodes,
        total_runtime_minutes: ensuredTotalRuntime,
        drama_category: ensuredDramaCategory,
        updated_at: new Date().toISOString()
      };
      
      if (isCompleted) {
        updateData.list_type = 'completed';
        updateData.current_episode = ensuredTotalEpisodes;
        updateData.episodes_watched = ensuredTotalEpisodes;
        updateData.watched_minutes = ensuredTotalRuntime;
        console.log(`updateProgress: Marking as completed with ${ensuredTotalRuntime} minutes`);
      }
      
      const { error: updateError } = await supabase
        .from('user_drama_lists')
        .update(updateData)
        .eq('id', dramaData.id);
        
      if (updateError) {
        console.error('Error updating drama progress:', updateError);
        throw updateError;
      }
      
      console.log(`updateProgress: Successfully updated drama ${dramaId} with data:`, updateData);
      
      setUserProfile(prev => {
        const watchingList = [...prev.lists.watching];
        const dramaIndex = watchingList.findIndex(item => item.dramaId === dramaId);
        
        if (dramaIndex < 0 || !watchingList[dramaIndex].progress) {
          return prev;
        }
        
        if (isCompleted) {
          const completedList = [...prev.lists.completed];
          const currentItem = watchingList[dramaIndex];
          completedList.push({
            dramaId,
            addedAt: new Date().toISOString(),
            drama_name: currentItem.drama_name,
            drama_year: currentItem.drama_year,
            poster_image: currentItem.poster_image,
            poster_path: currentItem.poster_path,
            total_episodes: ensuredTotalEpisodes,
            total_runtime_minutes: ensuredTotalRuntime,
            watched_minutes: ensuredTotalRuntime,
            episodes_watched: ensuredTotalEpisodes,
            current_episode: ensuredTotalEpisodes
          });
          
          const newWatchingList = watchingList.filter(item => item.dramaId !== dramaId);
          
          return {
            ...prev,
            lists: {
              ...prev.lists,
              watching: newWatchingList,
              completed: completedList
            }
          };
        } else {
          const updatedItem = {
            ...watchingList[dramaIndex],
            episodes_watched: Math.min(currentEpisode, ensuredTotalEpisodes),
            watched_minutes: watchedMinutes,
            current_episode: Math.min(currentEpisode, ensuredTotalEpisodes),
            progress: {
              ...watchingList[dramaIndex].progress!,
              currentEpisode: Math.min(currentEpisode, ensuredTotalEpisodes),
              watchedEpisodes: newWatchedEpisodes,
              totalWatchTimeMinutes: watchedMinutes,
              episodesWatched: Math.min(currentEpisode, ensuredTotalEpisodes)
            }
          };
          
          watchingList[dramaIndex] = updatedItem;
          
          return {
            ...prev,
            lists: {
              ...prev.lists,
              watching: watchingList
            }
          };
        }
      });
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  // Check if drama is in a specific list
  const isInList = (dramaId: number, listType: ListType): boolean => {
    if (!userProfile?.lists?.[listType]) {
      return false;
    }
    const result = userProfile.lists[listType].some(item => item.dramaId === dramaId);
    console.log(`isInList - dramaId: ${dramaId}, listType: ${listType}, result: ${result}`);
    console.log(`isInList - ${listType} list:`, userProfile.lists[listType].map(item => item.dramaId));
    return result;
  };

  // Get drama's current list (if any)
  const getCurrentList = (dramaId: number): ListType | null => {
    if (!userProfile?.lists) {
      return null;
    }
    if (isInList(dramaId, "watching")) return "watching";
    if (isInList(dramaId, "watchlist")) return "watchlist";
    if (isInList(dramaId, "completed")) return "completed";
    return null;
  };

  // Update drama ranking
  const updateRanking = async (dramaId: number, rank: number) => {
    if (!user) return;
    
    try {
      // Get or create user ranking
      let { data: ranking } = await supabase
        .from('user_rankings')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (!ranking) {
        // Create new ranking
        const { data: newRanking, error: createError } = await supabase
          .from('user_rankings')
          .insert({
            user_id: user.id,
            title: 'Meu Ranking de K-Dramas',
            is_public: true
          })
          .select()
          .single();
          
        if (createError) throw createError;
        ranking = newRanking;
      }
      
      // Update or insert ranking item
      const { data: existingItem } = await supabase
        .from('ranking_items')
        .select('*')
        .eq('ranking_id', ranking.id)
        .eq('drama_id', dramaId)
        .single();
        
      if (existingItem) {
        // Update existing
        await supabase
          .from('ranking_items')
          .update({ rank_position: rank })
          .eq('id', existingItem.id);
      } else {
        // Insert new
        await supabase
          .from('ranking_items')
          .insert({
            ranking_id: ranking.id,
            drama_id: dramaId,
            rank_position: rank
          });
      }
      
      // Update local state
      setUserProfile(prev => {
        const newRankings = [...prev.rankings];
        const existingIndex = newRankings.findIndex(item => item.dramaId === dramaId);
        
        if (existingIndex >= 0) {
          newRankings[existingIndex] = { dramaId, rank };
        } else {
          newRankings.push({ dramaId, rank });
        }
        
        newRankings.sort((a, b) => a.rank - b.rank);
        
        return {
          ...prev,
          rankings: newRankings
        };
      });
    } catch (error) {
      console.error('Error updating ranking:', error);
    }
  };

  // Remove drama from rankings
  const removeFromRankings = async (dramaId: number) => {
    if (!user) return;
    
    try {
      // Get user ranking
      const { data: ranking } = await supabase
        .from('user_rankings')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      if (ranking) {
        await supabase
          .from('ranking_items')
          .delete()
          .eq('ranking_id', ranking.id)
          .eq('drama_id', dramaId);
      }
      
      // Update local state
      setUserProfile(prev => {
        const newRankings = prev.rankings.filter(item => item.dramaId !== dramaId);
        return {
          ...prev,
          rankings: newRankings
        };
      });
    } catch (error) {
      console.error('Error removing from rankings:', error);
    }
  };

  // Refresh user profile data
  const refreshUserProfile = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Load user profile data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (userError) {
        console.error('Error refreshing user profile:', userError);
        return;
      }
      
      // Load user drama lists
      const { data: listsData } = await supabase
        .from('user_drama_lists')
        .select('*')
        .eq('user_id', user.id);
        
      // Load user rankings (don't use .single() to avoid errors when no rankings exist)
      const { data: rankingsData } = await supabase
        .from('user_rankings')
        .select(`
          *,
          ranking_items (
            drama_id,
            rank_position
          )
        `)
        .eq('user_id', user.id)
        .eq('is_public', true);
      
      // Transform data to match UserProfile structure
      const lists = {
        watching: [],
        watchlist: [],
        completed: []
      } as { [K in ListType]: UserList[] };
      
      if (listsData) {
        listsData.forEach(item => {
          const userListItem: UserList = {
            dramaId: item.drama_id,
            addedAt: item.added_at,
            current_episode: item.current_episode,
            total_episodes: item.total_episodes,
            total_runtime_minutes: item.total_runtime_minutes,
            watched_minutes: item.watched_minutes,
            episodes_watched: item.episodes_watched,
            drama_name: item.drama_name,
            drama_year: item.drama_year,
            poster_image: item.poster_image,
            poster_path: item.poster_path
          };
          
          if (item.list_type === 'watching' && item.total_episodes) {
            let watchedEpisodes: number[] = [];
            try {
              if (item.watched_episodes && typeof item.watched_episodes === 'string' && item.watched_episodes.trim() !== '') {
                watchedEpisodes = JSON.parse(item.watched_episodes);
              } else if (Array.isArray(item.watched_episodes)) {
                watchedEpisodes = item.watched_episodes;
              }
            } catch (e) {
              console.warn('Failed to parse watched_episodes:', item.watched_episodes, e);
              watchedEpisodes = [];
            }
            
            userListItem.progress = {
              currentEpisode: item.current_episode || 0,
              totalEpisodes: item.total_episodes,
              watchedEpisodes,
              totalWatchTimeMinutes: item.watched_minutes || 0,
              episodesWatched: item.episodes_watched || 0
            };
          }
          
          lists[item.list_type as ListType].push(userListItem);
        });
      }
      
      const rankings: UserRanking[] = [];
      if (rankingsData && rankingsData.length > 0 && rankingsData[0]?.ranking_items) {
        rankings.push(...rankingsData[0].ranking_items.map((item: any) => ({
          dramaId: item.drama_id,
          rank: item.rank_position
        })));
      }
      
      setUserProfile({
        id: userData.id,
        username: userData.username,
        displayName: userData.display_name,
        bio: userData.bio,
        profileImage: userData.profile_image,
        userProfileCover: userData.user_profile_cover,
        followersCount: userData.followers_count || 0,
        followingCount: userData.following_count || 0,
        userType: userData.user_type || 'normal',
        isVerified: userData.is_verified || false,
        verificationType: userData.verification_type,
        dailySwipeLimit: userData.user_type === 'premium' ? 50 : 20,
        isPremiumActive: userData.user_type === 'premium',
        lists,
        rankings,
        achievements: [],
        stats: {
          totalWatchTime: 0,
          genreBreakdown: {},
          monthlyWatchTime: {}
        },
        premium: {
          isSubscribed: userData.user_type === 'premium',
          customReactions: false,
          advancedFilters: false,
          multipleRankings: false,
          detailedStats: false
        },
        createdAt: userData.created_at || new Date().toISOString()
      });
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  }, [user?.id]);

  return {
    userProfile,
    isLoading,
    addToList,
    removeFromList,
    updateProgress,
    isInList,
    getCurrentList,
    updateRanking,
    removeFromRankings,
    refreshUserProfile,
    deleteUserReview,
  };
});

// Custom hooks for specific functionality
export function useUserLists() {
  const { userProfile, addToList, removeFromList, updateProgress, isInList, getCurrentList, deleteUserReview, refreshUserProfile } = useUserStore();
  return {
    lists: userProfile?.lists || { watching: [], watchlist: [], completed: [] },
    addToList,
    removeFromList,
    updateProgress,
    isInList,
    getCurrentList,
    deleteUserReview,
    refreshUserProfile,
  };
}

export function useUserRankings() {
  const { userProfile, updateRanking, removeFromRankings } = useUserStore();
  return {
    rankings: userProfile?.rankings || [],
    updateRanking,
    removeFromRankings
  };
}