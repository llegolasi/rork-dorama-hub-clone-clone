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
  }))
  .query(async ({ input, ctx }) => {
    try {
      const targetUserId = input.userId || ctx.user.id;
      
      const { data, error } = await ctx.supabase.rpc('get_user_comprehensive_stats', {
        p_user_id: targetUserId
      });

      if (error) {
        console.error('Error fetching user stats:', error);
        throw new Error('Failed to fetch user statistics');
      }

      return data || {
        user_id: targetUserId,
        total_watch_time_minutes: 0,
        dramas_completed: 0,
        dramas_watching: 0,
        dramas_in_watchlist: 0,
        average_drama_runtime: 0,
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
    } catch (error) {
      console.error('Error in getUserStatsProcedure:', error);
      throw new Error('Failed to fetch user statistics');
    }
  });

// Update user statistics manually (for debugging)
export const updateUserStatsProcedure = protectedProcedure
  .mutation(async ({ ctx }) => {
    try {
      const { error } = await ctx.supabase.rpc('update_user_statistics', {
        p_user_id: ctx.user.id
      });

      if (error) {
        console.error('Error updating user stats:', error);
        throw new Error('Failed to update user statistics');
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