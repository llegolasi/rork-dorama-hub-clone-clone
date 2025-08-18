import { z } from 'zod';
import { publicProcedure, protectedProcedure } from '../../create-context';

// Get user profile
export const getUserProfileProcedure = protectedProcedure
  .input(z.object({
    userId: z.string().uuid()
  }))
  .query(async ({ input, ctx }) => {
    try {
      const { data: user, error: userError } = await ctx.supabase
        .from('users')
        .select('*')
        .eq('id', input.userId)
        .single();

      if (userError) throw userError;

      // Check if current user is following this user
      let isFollowing = false;
      if (ctx.user?.id && ctx.user.id !== input.userId) {
        const { data: followData } = await ctx.supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', ctx.user.id)
          .eq('following_id', input.userId)
          .single();
        
        isFollowing = !!followData;
      }

      // Get user's drama lists
      const { data: lists } = await ctx.supabase
        .from('user_drama_lists')
        .select('*')
        .eq('user_id', input.userId);

      // Get user's rankings
      const { data: rankings } = await ctx.supabase
        .from('user_rankings')
        .select(`
          *,
          ranking_items (
            drama_id,
            rank_position
          )
        `)
        .eq('user_id', input.userId)
        .eq('is_public', true);

      return {
        user: {
          ...user,
          isFollowing
        },
        lists: lists || [],
        rankings: rankings || []
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to fetch user profile');
    }
  });

// Update user profile
export const updateUserProfileProcedure = protectedProcedure
  .input(z.object({
    displayName: z.string().min(1).max(100).optional(),
    bio: z.string().max(500).optional(),
    profileImage: z.string().url().optional()
  }))
  .mutation(async ({ input, ctx }) => {
    try {
      const { data, error } = await ctx.supabase
        .from('users')
        .update({
          display_name: input.displayName,
          bio: input.bio,
          profile_image: input.profileImage
        })
        .eq('id', ctx.user.id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update profile');
    }
  });

// Follow/unfollow user
export const toggleFollowUserProcedure = protectedProcedure
  .input(z.object({
    userId: z.string().uuid()
  }))
  .mutation(async ({ input, ctx }) => {
    try {
      if (input.userId === ctx.user.id) {
        throw new Error('Cannot follow yourself');
      }

      // Check if already following
      const { data: existingFollow } = await ctx.supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', ctx.user.id)
        .eq('following_id', input.userId)
        .single();

      if (existingFollow) {
        // Unfollow
        const { error } = await ctx.supabase
          .from('user_follows')
          .delete()
          .eq('id', existingFollow.id);

        if (error) throw error;
        return { following: false };
      } else {
        // Follow
        const { error } = await ctx.supabase
          .from('user_follows')
          .insert({
            follower_id: ctx.user.id,
            following_id: input.userId
          });

        if (error) throw error;
        return { following: true };
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      throw new Error('Failed to toggle follow');
    }
  });

// Get user followers
export const getUserFollowersProcedure = publicProcedure
  .input(z.object({
    userId: z.string().uuid(),
    limit: z.number().min(1).max(50).default(20),
    offset: z.number().min(0).default(0)
  }))
  .query(async ({ input, ctx }) => {
    try {
      const { data, error } = await ctx.supabase
        .from('user_follows')
        .select(`
          follower_id,
          users!user_follows_follower_id_fkey (
            id,
            username,
            display_name,
            profile_image
          )
        `)
        .eq('following_id', input.userId)
        .range(input.offset, input.offset + input.limit - 1);

      if (error) throw error;

      return data?.map(item => item.users) || [];
    } catch (error) {
      console.error('Error fetching followers:', error);
      throw new Error('Failed to fetch followers');
    }
  });

// Get user following
export const getUserFollowingProcedure = publicProcedure
  .input(z.object({
    userId: z.string().uuid(),
    limit: z.number().min(1).max(50).default(20),
    offset: z.number().min(0).default(0)
  }))
  .query(async ({ input, ctx }) => {
    try {
      const { data, error } = await ctx.supabase
        .from('user_follows')
        .select(`
          following_id,
          users!user_follows_following_id_fkey (
            id,
            username,
            display_name,
            profile_image
          )
        `)
        .eq('follower_id', input.userId)
        .range(input.offset, input.offset + input.limit - 1);

      if (error) throw error;

      return data?.map(item => item.users) || [];
    } catch (error) {
      console.error('Error fetching following:', error);
      throw new Error('Failed to fetch following');
    }
  });

// Get followers with enhanced data for followers screen
export const getFollowersWithDetailsProcedure = protectedProcedure
  .input(z.object({
    userId: z.string().uuid().optional(),
    search: z.string().optional(),
    limit: z.number().min(1).max(50).default(20),
    offset: z.number().min(0).default(0)
  }))
  .query(async ({ input, ctx }) => {
    try {
      const targetUserId = input.userId || ctx.user.id;
      
      let query = ctx.supabase
        .from('user_follows')
        .select(`
          follower_id,
          created_at,
          users!user_follows_follower_id_fkey (
            id,
            username,
            display_name,
            profile_image,
            followers_count
          )
        `)
        .eq('following_id', targetUserId);

      if (input.search) {
        query = query.or(`users.display_name.ilike.%${input.search}%,users.username.ilike.%${input.search}%`);
      }

      const { data, error } = await query
        .range(input.offset, input.offset + input.limit - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        return [];
      }

      // Check if current user is following each follower
      const followersWithStatus = await Promise.all(
        data.map(async (item: any) => {
          const follower = item.users;
          if (!follower) return null;

          // Check if current user follows this follower (mutual follow)
          const { data: isFollowingData } = await ctx.supabase
            .from('user_follows')
            .select('id')
            .eq('follower_id', ctx.user.id)
            .eq('following_id', follower.id)
            .single();

          return {
            id: follower.id,
            username: follower.username,
            displayName: follower.display_name,
            profileImage: follower.profile_image,
            followersCount: follower.followers_count || 0,
            isFollowing: !!isFollowingData,
            isFollowingYou: true, // They are following the target user
            followedAt: item.created_at
          };
        })
      );

      return followersWithStatus.filter(Boolean);
    } catch (error) {
      console.error('Error fetching followers with details:', error);
      throw new Error('Failed to fetch followers');
    }
  });

// Get following with enhanced data for following screen
export const getFollowingWithDetailsProcedure = protectedProcedure
  .input(z.object({
    userId: z.string().uuid().optional(),
    search: z.string().optional(),
    limit: z.number().min(1).max(50).default(20),
    offset: z.number().min(0).default(0)
  }))
  .query(async ({ input, ctx }) => {
    try {
      const targetUserId = input.userId || ctx.user.id;
      
      let query = ctx.supabase
        .from('user_follows')
        .select(`
          following_id,
          created_at,
          users!user_follows_following_id_fkey (
            id,
            username,
            display_name,
            profile_image,
            followers_count
          )
        `)
        .eq('follower_id', targetUserId);

      if (input.search) {
        query = query.or(`users.display_name.ilike.%${input.search}%,users.username.ilike.%${input.search}%`);
      }

      const { data, error } = await query
        .range(input.offset, input.offset + input.limit - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        return [];
      }

      // Check if each followed user follows back
      const followingWithStatus = await Promise.all(
        data.map(async (item: any) => {
          const followedUser = item.users;
          if (!followedUser) return null;

          // Check if this user follows back
          const { data: isFollowingBackData } = await ctx.supabase
            .from('user_follows')
            .select('id')
            .eq('follower_id', followedUser.id)
            .eq('following_id', targetUserId)
            .single();

          return {
            id: followedUser.id,
            username: followedUser.username,
            displayName: followedUser.display_name,
            profileImage: followedUser.profile_image,
            followersCount: followedUser.followers_count || 0,
            isFollowingYou: !!isFollowingBackData,
            followedAt: item.created_at
          };
        })
      );

      return followingWithStatus.filter(Boolean);
    } catch (error) {
      console.error('Error fetching following with details:', error);
      throw new Error('Failed to fetch following');
    }
  });

// Get user statistics
export const getUserStatsProcedure = protectedProcedure
  .input(z.object({
    userId: z.string().uuid().optional()
  }).transform((data) => {
    if (!data.userId || data.userId.trim() === '' || data.userId === 'undefined') {
      return { userId: undefined };
    }
    return { userId: data.userId };
  }))
  .query(async ({ input, ctx }) => {
    try {
      const targetUserId = input.userId || ctx.user.id;
      
      // First try to get detailed stats from the new RPC function
      const { data: detailedStats, error: detailedError } = await ctx.supabase.rpc('get_user_detailed_stats', {
        p_user_id: targetUserId
      });

      if (!detailedError && detailedStats && Array.isArray(detailedStats) && detailedStats.length > 0) {
        const stats = detailedStats[0];
        
        // Get total episodes watched from episode_watch_history
        const { data: episodeHistory } = await ctx.supabase
          .from('episode_watch_history')
          .select('episode_number')
          .eq('user_id', targetUserId);
        
        const totalEpisodesWatched = episodeHistory?.length || 0;
        
        return {
          user_id: targetUserId,
          total_watch_time_minutes: stats.total_watch_time_minutes || 0,
          total_episodes_watched: totalEpisodesWatched,
          dramas_completed: stats.dramas_completed || 0,
          dramas_watching: stats.dramas_watching || 0,
          dramas_in_watchlist: stats.dramas_in_watchlist || 0,
          average_drama_runtime: stats.dramas_completed > 0 ? 
            (stats.total_watch_time_minutes / stats.dramas_completed) : 0,
          favorite_genres: stats.favorite_genres || {},
          weekly_watch_time: stats.weekly_watch_time || {},
          monthly_watch_time: stats.monthly_watch_time || {},
          yearly_watch_time: stats.yearly_watch_time || {},
          average_episodes_per_day: stats.average_episodes_per_day || 0,
          most_active_hour: stats.most_active_hour || 20,
          completion_rate: stats.completion_rate || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      console.log('Detailed stats RPC failed, trying legacy function:', detailedError);
      
      // Fallback to legacy RPC function
      const { data: rpcData, error: rpcError } = await ctx.supabase.rpc('get_user_comprehensive_stats', {
        p_user_id: targetUserId
      });

      if (!rpcError && rpcData && typeof rpcData === 'object') {
        return rpcData;
      }

      console.log('Legacy RPC function failed, falling back to manual calculation:', rpcError, rpcData);
      
      // Fallback: manually calculate stats
      const { data: userStats, error: statsError } = await ctx.supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      // If no user stats exist, create them
      if (statsError || !userStats) {
        // Count dramas in each list
        const { data: watchingDramas } = await ctx.supabase
          .from('user_drama_lists')
          .select('id')
          .eq('user_id', targetUserId)
          .eq('list_type', 'watching');

        const { data: watchlistDramas } = await ctx.supabase
          .from('user_drama_lists')
          .select('id')
          .eq('user_id', targetUserId)
          .eq('list_type', 'watchlist');

        const { data: completedDramas } = await ctx.supabase
          .from('user_drama_lists')
          .select('id')
          .eq('user_id', targetUserId)
          .eq('list_type', 'completed');

        // Get total watch time from user_drama_lists only
        const { data: allDramas } = await ctx.supabase
          .from('user_drama_lists')
          .select('watched_minutes, total_runtime_minutes, list_type')
          .eq('user_id', targetUserId);

        const totalWatchTime = allDramas?.reduce((sum, drama) => {
          // For completed dramas, use total_runtime_minutes
          // For watching dramas, use watched_minutes (partial progress)
          if (drama.list_type === 'completed') {
            return sum + (drama.total_runtime_minutes || 0);
          } else if (drama.list_type === 'watching') {
            return sum + (drama.watched_minutes || 0);
          }
          return sum;
        }, 0) || 0;

        // Get total episodes watched from episode_watch_history
        const { data: episodeHistory } = await ctx.supabase
          .from('episode_watch_history')
          .select('episode_number')
          .eq('user_id', targetUserId);
        
        const totalEpisodesWatched = episodeHistory?.length || 0;
        
        const fallbackStats = {
          user_id: targetUserId,
          total_watch_time_minutes: totalWatchTime,
          total_episodes_watched: totalEpisodesWatched,
          dramas_completed: completedDramas?.length || 0,
          dramas_watching: watchingDramas?.length || 0,
          dramas_in_watchlist: watchlistDramas?.length || 0,
          average_drama_runtime: completedDramas?.length ? totalWatchTime / completedDramas.length : 0,
          first_completion_date: null,
          latest_completion_date: null,
          monthly_watch_time: {},
          favorite_genres: {},
          yearly_watch_time: {},
          favorite_actor_id: null,
          favorite_actor_name: null,
          favorite_actor_works_watched: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Try to insert/update user stats
        await ctx.supabase
          .from('user_stats')
          .upsert({
            user_id: targetUserId,
            total_watch_time_minutes: totalWatchTime,
            dramas_completed: completedDramas?.length || 0,
            dramas_watching: watchingDramas?.length || 0,
            dramas_in_watchlist: watchlistDramas?.length || 0,
            updated_at: new Date().toISOString()
          });

        return fallbackStats;
      }

      // Get total episodes watched from episode_watch_history
      const { data: episodeHistory } = await ctx.supabase
        .from('episode_watch_history')
        .select('episode_number')
        .eq('user_id', targetUserId);
      
      const totalEpisodesWatched = episodeHistory?.length || 0;
      
      // Return existing user stats with additional calculated fields
      return {
        user_id: userStats.user_id,
        total_watch_time_minutes: userStats.total_watch_time_minutes || 0,
        total_episodes_watched: totalEpisodesWatched,
        dramas_completed: userStats.dramas_completed || 0,
        dramas_watching: userStats.dramas_watching || 0,
        dramas_in_watchlist: userStats.dramas_in_watchlist || 0,
        average_drama_runtime: userStats.dramas_completed > 0 ? 
          (userStats.total_watch_time_minutes / userStats.dramas_completed) : 0,
        first_completion_date: null,
        latest_completion_date: null,
        monthly_watch_time: userStats.monthly_watch_time || {},
        favorite_genres: userStats.favorite_genres || {},
        yearly_watch_time: userStats.yearly_watch_time || {},
        favorite_actor_id: userStats.favorite_actor_id,
        favorite_actor_name: userStats.favorite_actor_name,
        favorite_actor_works_watched: userStats.favorite_actor_works_watched || 0,
        created_at: userStats.created_at,
        updated_at: userStats.updated_at
      };
    } catch (error) {
      console.error('Error in getUserStatsProcedure:', error);
      throw new Error('Failed to fetch user statistics');
    }
  });

// Mark episode as watched
export const markEpisodeWatchedProcedure = protectedProcedure
  .input(z.object({
    dramaId: z.number(),
    episodeNumber: z.number().min(1),
    episodeDurationMinutes: z.number().min(1).default(60),
    startedAt: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional()
  }))
  .mutation(async ({ input, ctx }) => {
    try {
      console.log('markEpisodeWatchedProcedure called with:', {
        userId: ctx.user.id,
        dramaId: input.dramaId,
        episodeNumber: input.episodeNumber,
        episodeDurationMinutes: input.episodeDurationMinutes
      });

      const completedAt = input.completedAt ? new Date(input.completedAt).toISOString() : new Date().toISOString();
      const startedAt = input.startedAt ? new Date(input.startedAt).toISOString() : new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // First, check if episode_watch_history table exists
      const { error: tableCheckError } = await ctx.supabase
        .from('episode_watch_history')
        .select('id')
        .limit(1);

      if (tableCheckError) {
        console.error('episode_watch_history table does not exist or is not accessible:', tableCheckError);
        
        // Fallback: directly update user_drama_lists without using episode_watch_history
        const { data: currentDrama, error: getDramaError } = await ctx.supabase
          .from('user_drama_lists')
          .select('episodes_watched, watched_minutes, total_episodes, total_runtime_minutes')
          .eq('user_id', ctx.user.id)
          .eq('drama_id', input.dramaId)
          .single();

        if (getDramaError) {
          console.error('Error getting current drama data:', getDramaError);
          throw new Error(`Failed to get drama data: ${getDramaError.message}`);
        }

        const newEpisodesWatched = Math.max(currentDrama.episodes_watched || 0, input.episodeNumber);
        const newWatchedMinutes = (currentDrama.watched_minutes || 0) + input.episodeDurationMinutes;

        const { error: updateError } = await ctx.supabase
          .from('user_drama_lists')
          .update({
            episodes_watched: newEpisodesWatched,
            current_episode: newEpisodesWatched,
            watched_minutes: newWatchedMinutes,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', ctx.user.id)
          .eq('drama_id', input.dramaId);

        if (updateError) {
          console.error('Error updating drama list (fallback):', updateError);
          throw new Error(`Failed to update drama progress: ${updateError.message}`);
        }

        return { success: true, message: 'Episode marked as watched successfully (fallback mode)' };
      }

      // Insert or update episode watch history
      const { error: historyError } = await ctx.supabase
        .from('episode_watch_history')
        .upsert({
          user_id: ctx.user.id,
          drama_id: input.dramaId,
          episode_number: input.episodeNumber,
          episode_duration_minutes: input.episodeDurationMinutes,
          watch_started_at: startedAt,
          watch_completed_at: completedAt,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,drama_id,episode_number'
        });

      if (historyError) {
        console.error('Error inserting episode history:', historyError);
        throw new Error(`Failed to record episode history: ${historyError.message}`);
      }

      // Get the count of watched episodes for this drama
      const { data: watchedEpisodes, error: countError } = await ctx.supabase
        .from('episode_watch_history')
        .select('episode_number, episode_duration_minutes')
        .eq('user_id', ctx.user.id)
        .eq('drama_id', input.dramaId);

      if (countError) {
        console.error('Error counting watched episodes:', countError);
        throw new Error(`Failed to count watched episodes: ${countError.message}`);
      }

      const episodesWatched = watchedEpisodes?.length || 0;
      const totalWatchTime = watchedEpisodes?.reduce((sum, ep) => sum + (ep.episode_duration_minutes || 60), 0) || 0;

      // Update user_drama_lists with the new episode count and watch time
      const { error: updateError } = await ctx.supabase
        .from('user_drama_lists')
        .update({
          episodes_watched: episodesWatched,
          current_episode: episodesWatched,
          watched_minutes: totalWatchTime,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', ctx.user.id)
        .eq('drama_id', input.dramaId);

      if (updateError) {
        console.error('Error updating drama list:', updateError);
        throw new Error(`Failed to update drama progress: ${updateError.message}`);
      }

      console.log('Episode marked as watched successfully:', {
        episodesWatched,
        totalWatchTime
      });

      return { success: true, message: 'Episode marked as watched successfully' };
    } catch (error) {
      console.error('Error in markEpisodeWatchedProcedure:', error);
      throw new Error(`Failed to mark episode as watched: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

// Complete drama with date range
export const completeDramaWithDateRangeProcedure = protectedProcedure
  .input(z.object({
    dramaId: z.number(),
    totalEpisodes: z.number().min(1),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    episodeDurationMinutes: z.number().min(1).default(60),
    dramaCategory: z.string().optional(),
    dramaName: z.string().optional(),
    posterPath: z.string().optional(),
    posterImage: z.string().optional(),
    dramaYear: z.number().optional(),
    totalRuntimeMinutes: z.number().optional()
  }))
  .mutation(async ({ input, ctx }) => {
    try {
      console.log('completeDramaWithDateRangeProcedure called with:', {
        userId: ctx.user.id,
        dramaId: input.dramaId,
        totalEpisodes: input.totalEpisodes,
        startDate: input.startDate,
        endDate: input.endDate,
        episodeDurationMinutes: input.episodeDurationMinutes,
        dramaCategory: input.dramaCategory
      });

      // Use the database function to complete drama with date range
      const { data, error } = await ctx.supabase.rpc('complete_drama_with_date_range', {
        p_user_id: ctx.user.id,
        p_drama_id: input.dramaId,
        p_total_episodes: input.totalEpisodes,
        p_start_date: input.startDate,
        p_end_date: input.endDate,
        p_episode_duration_minutes: input.episodeDurationMinutes,
        p_drama_category: input.dramaCategory,
        p_drama_name: input.dramaName,
        p_poster_path: input.posterPath,
        p_poster_image: input.posterImage,
        p_drama_year: input.dramaYear,
        p_total_runtime_minutes: input.totalRuntimeMinutes
      });
      
      if (error) {
        console.error('Error calling complete_drama_with_date_range RPC:', error);
        throw new Error(`Failed to complete drama with date range: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('RPC function returned no data');
      }
      
      console.log('Drama completed with date range successfully:', data);
      return { success: true, message: 'Drama completed with date range successfully' };
    } catch (error) {
      console.error('Error in completeDramaWithDateRangeProcedure:', error);
      throw new Error(`Failed to complete drama with date range: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

// Update user statistics manually (for debugging)
export const updateUserStatsProcedure = protectedProcedure
  .mutation(async ({ ctx }) => {
    try {
      // First try the RPC function
      const { error: rpcError } = await ctx.supabase.rpc('update_user_statistics', {
        p_user_id: ctx.user.id
      });

      if (rpcError) {
        console.log('RPC function failed, updating manually:', rpcError);
        
        // Fallback: manually update stats
        // Count dramas in each list
        const { data: watchingDramas } = await ctx.supabase
          .from('user_drama_lists')
          .select('id')
          .eq('user_id', ctx.user.id)
          .eq('list_type', 'watching');

        const { data: watchlistDramas } = await ctx.supabase
          .from('user_drama_lists')
          .select('id')
          .eq('user_id', ctx.user.id)
          .eq('list_type', 'watchlist');

        const { data: completedDramas } = await ctx.supabase
          .from('user_drama_lists')
          .select('id')
          .eq('user_id', ctx.user.id)
          .eq('list_type', 'completed');

        // Get total watch time from user_drama_lists only
        const { data: allDramas } = await ctx.supabase
          .from('user_drama_lists')
          .select('watched_minutes, total_runtime_minutes, list_type')
          .eq('user_id', ctx.user.id);

        const totalWatchTime = allDramas?.reduce((sum, drama) => {
          // For completed dramas, use total_runtime_minutes
          // For watching dramas, use watched_minutes (partial progress)
          if (drama.list_type === 'completed') {
            return sum + (drama.total_runtime_minutes || 0);
          } else if (drama.list_type === 'watching') {
            return sum + (drama.watched_minutes || 0);
          }
          return sum;
        }, 0) || 0;

        // Update user stats
        const { error: updateError } = await ctx.supabase
          .from('user_stats')
          .upsert({
            user_id: ctx.user.id,
            total_watch_time_minutes: totalWatchTime,
            dramas_completed: completedDramas?.length || 0,
            dramas_watching: watchingDramas?.length || 0,
            dramas_in_watchlist: watchlistDramas?.length || 0,
            updated_at: new Date().toISOString()
          });

        if (updateError) {
          console.error('Error manually updating user stats:', updateError);
          throw new Error('Failed to update user statistics');
        }
      }

      return { success: true, message: 'User statistics updated successfully' };
    } catch (error) {
      console.error('Error in updateUserStatsProcedure:', error);
      throw new Error('Failed to update user statistics');
    }
  });

// Get user's completed dramas with details
export const getUserCompletedDramasProcedure = publicProcedure
  .input(z.object({
    userId: z.string().uuid(),
    limit: z.number().min(1).max(50).default(20),
    offset: z.number().min(0).default(0)
  }))
  .query(async ({ input, ctx }) => {
    try {
      const { data: completedDramas, error } = await ctx.supabase
        .from('user_drama_lists')
        .select(`*`)
        .eq('user_id', input.userId)
        .eq('list_type', 'completed')
        .order('updated_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (error) throw error;

      if (!completedDramas || completedDramas.length === 0) {
        return [];
      }

      const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
      const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

      const results = await Promise.all(
        completedDramas.map(async (item: any) => {
          const name: string | undefined = item.drama_name ?? item.name;
          const posterPath: string | null = item.poster_path ?? null;
          const posterImage: string | null = item.poster_image ?? null;
          const year: number | null = item.drama_year ?? null;

          if (name && (posterPath || posterImage)) {
            return {
              id: item.drama_id,
              name,
              poster_path: posterPath ?? posterImage,
              first_air_date: year ? `${year}-01-01` : '',
              rating: item.rating ?? null,
              completed_at: item.updated_at,
            };
          }

          if (!TMDB_API_KEY) {
            return {
              id: item.drama_id,
              name: name ?? '—',
              poster_path: posterPath ?? null,
              first_air_date: year ? `${year}-01-01` : '',
              rating: item.rating ?? null,
              completed_at: item.updated_at,
            };
          }

          try {
            const response = await fetch(
              `${TMDB_BASE_URL}/tv/${item.drama_id}?language=pt-BR`,
              {
                headers: {
                  Authorization: `Bearer ${TMDB_API_KEY}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (!response.ok) {
              console.error(`Failed to fetch drama ${item.drama_id}: ${response.status}`);
              return {
                id: item.drama_id,
                name: name ?? '—',
                poster_path: posterPath ?? null,
                first_air_date: year ? `${year}-01-01` : '',
                rating: item.rating ?? null,
                completed_at: item.updated_at,
              };
            }

            const dramaData = await response.json();
            return {
              id: dramaData.id,
              name: dramaData.name,
              poster_path: dramaData.poster_path,
              first_air_date: dramaData.first_air_date ?? (year ? `${year}-01-01` : ''),
              rating: item.rating ?? null,
              completed_at: item.updated_at,
            };
          } catch (e) {
            console.error(`Error fetching drama ${item.drama_id}:`, e);
            return {
              id: item.drama_id,
              name: name ?? '—',
              poster_path: posterPath ?? null,
              first_air_date: year ? `${year}-01-01` : '',
              rating: item.rating ?? null,
              completed_at: item.updated_at,
            };
          }
        })
      );

      return results.filter((d: any) => d && d.id);
    } catch (error) {
      console.error('Error fetching completed dramas:', error);
      throw new Error('Failed to fetch completed dramas');
    }
  });