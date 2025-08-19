import { z } from 'zod';
import { publicProcedure, protectedProcedure, type Context } from '../../../create-context';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase configuration missing. Community features will not work properly.');
}

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Helper function to get authenticated supabase client
const getAuthenticatedSupabase = (ctx: Context) => {
  if (!supabaseUrl) {
    throw new Error('Supabase URL not configured');
  }
  
  // Extract token from request headers
  const authHeader = ctx.req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('No valid authorization header found');
  }
  
  const token = authHeader.substring(7);
  
  // Create client with user's token for RLS
  return createClient(supabaseUrl, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
};

// Get community posts
export const getCommunityPostsProcedure = publicProcedure
  .input(z.object({
    type: z.enum(['all', 'rankings', 'discussions']).optional(),
    limit: z.number().min(1).max(50).default(20),
    offset: z.number().min(0).default(0)
  }))
  .query(async ({ input, ctx }: { input: { type?: 'all' | 'rankings' | 'discussions'; limit: number; offset: number }; ctx: Context }) => {
    const isAuthed = Boolean(ctx?.user?.id);
    const client = isAuthed ? (ctx.supabase ?? supabase) : ctx.admin;
    if (!client) {
      throw new Error('Supabase not configured');
    }
    
    try {
      console.log('Fetching community posts with input:', input);

      // Specialized query when requesting rankings
      if (input.type === 'rankings') {
        const { data: posts, error } = await client
          .from('community_posts')
          .select(`
            *,
            users!inner (
              username,
              display_name,
              profile_image
            ),
            user_rankings (
              id,
              title,
              description,
              ranking_items (
                drama_id,
                rank_position,
                drama_title,
                poster_image,
                cover_image
              )
            )
          `)
          .eq('post_type', 'ranking')
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (error) {
          console.error('Supabase error (rankings):', error);
          throw error;
        }

        console.log('Fetched ranking posts count:', posts?.length ?? 0);
        return posts || [];
      }
      
      // Generic query for other types
      let query = client
        .from('community_posts')
        .select(`
          *,
          users!inner (
            username,
            display_name,
            profile_image
          ),
          user_rankings (
            id,
            title,
            description,
            ranking_items (
              drama_id,
              rank_position,
              drama_title,
              poster_image,
              cover_image
            )
          )
        `)
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (input.type === 'discussions') {
        query = query.eq('post_type', 'discussion');
      }

      const { data: posts, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      return posts || [];
    } catch (error) {
      console.error('Error fetching community posts:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to fetch community posts: ${error.message}`);
      }
      throw new Error('Failed to fetch community posts');
    }
  });

// Create community post
export const createCommunityPostProcedure = protectedProcedure
  .input(z.object({
    content: z.string().min(1).max(1000),
    postType: z.enum(['discussion', 'ranking']),
    mentionedDramaId: z.number().optional(),
    posterImage: z.string().optional(),
    dramaName: z.string().optional(),
    dramaYear: z.number().optional(),
    rankingId: z.string().uuid().optional()
  }))
  .mutation(async ({ input, ctx }: { input: { content: string; postType: 'discussion' | 'ranking'; mentionedDramaId?: number; posterImage?: string; dramaName?: string; dramaYear?: number; rankingId?: string }; ctx: Context }) => {
    try {
      console.log('Creating post with input:', input);
      console.log('User context:', ctx.user);
      
      if (!ctx.user?.id) {
        throw new Error('User ID is required');
      }
      
      // Use authenticated supabase client for RLS
      const authSupabase = getAuthenticatedSupabase(ctx);
      
      const insertData: any = {
        user_id: ctx.user.id,
        post_type: input.postType,
        content: input.content,
      };
      
      if (input.mentionedDramaId) {
        insertData.mentioned_drama_id = input.mentionedDramaId;
      }
      
      if (input.posterImage) {
        insertData.poster_image = input.posterImage;
      }
      
      if (input.dramaName) {
        insertData.drama_name = input.dramaName;
      }
      
      if (input.dramaYear) {
        insertData.drama_year = input.dramaYear;
      }
      
      if (input.rankingId) {
        insertData.ranking_id = input.rankingId;
      }
      
      const { data: post, error } = await authSupabase
        .from('community_posts')
        .insert(insertData)
        .select(`
          *,
          users (
            username,
            display_name,
            profile_image
          )
        `)
        .single();

      if (error) {
        console.error('Supabase error creating post:', error);
        console.error('Insert data was:', insertData);
        throw new Error(`Database error: ${error.message}`);
      }
      
      if (!post) {
        throw new Error('Post was not created - no data returned');
      }
      
      console.log('Post created successfully:', post);

      return post;
    } catch (error) {
      console.error('Error creating community post:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to create post: ${error.message}`);
      }
      throw new Error('Failed to create post');
    }
  });

// Get post details with comments
export const getPostDetailsProcedure = publicProcedure
  .input(z.object({
    postId: z.string().uuid()
  }))
  .query(async ({ input, ctx }: { input: { postId: string }; ctx: Context }) => {
    const isAuthed = Boolean(ctx?.user?.id);
    const client = isAuthed ? (ctx.supabase ?? supabase) : ctx.admin;
    if (!client) {
      throw new Error('Supabase not configured');
    }
    
    try {
      const { data: post, error: postError } = await client
        .from('community_posts')
        .select(`
          *,
          users!inner (
            username,
            display_name,
            profile_image
          ),
          user_rankings (
            title,
            description,
            ranking_items (
              drama_id,
              rank_position,
              drama_title,
              poster_image,
              cover_image
            )
          )
        `)
        .eq('id', input.postId)
        .single();

      if (postError) throw postError;

      const { data: comments, error: commentsError } = await client
        .from('post_comments')
        .select(`
          *,
          users!inner (
            username,
            display_name,
            profile_image
          )
        `)
        .eq('post_id', input.postId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      const commentIds = (comments ?? []).map((c: any) => c.id);
      let repliesByParent: Record<string, any[]> = {};
      if (commentIds.length > 0) {
        const { data: replies, error: repliesError } = await client
          .from('post_comments')
          .select(`
            *,
            users!inner (
              username,
              display_name,
              profile_image
            )
          `)
          .in('parent_comment_id', commentIds)
          .order('created_at', { ascending: true });
        if (repliesError) throw repliesError;
        repliesByParent = (replies || []).reduce((acc: Record<string, any[]>, r: any) => {
          const key = r.parent_comment_id as string;
          if (!acc[key]) acc[key] = [];
          acc[key].push(r);
          return acc;
        }, {});
      }

      // Get like information for current user if authenticated
      let userLikedComments = new Set<string>();
      if (isAuthed && ctx.user?.id) {
        const allCommentIds = [
          ...(comments || []).map((c: any) => c.id),
          ...Object.values(repliesByParent).flat().map((r: any) => r.id)
        ];
        
        if (allCommentIds.length > 0) {
          const { data: likedComments } = await client
            .from('post_comment_likes')
            .select('comment_id')
            .eq('user_id', ctx.user.id)
            .in('comment_id', allCommentIds);
          
          userLikedComments = new Set((likedComments || []).map((l: any) => l.comment_id));
        }
      }

      const commentsWithReplies = (comments || []).map((c: any) => ({
        ...c,
        user_liked: userLikedComments.has(c.id),
        replies: (repliesByParent[c.id] ?? []).map((r: any) => ({
          ...r,
          user_liked: userLikedComments.has(r.id)
        }))
      }));

      return {
        post,
        comments: commentsWithReplies
      };
    } catch (error) {
      console.error('Error fetching post details:', error);
      throw new Error('Failed to fetch post details');
    }
  });

// Like/unlike post
export const togglePostLikeProcedure = protectedProcedure
  .input(z.object({
    postId: z.string().uuid(),
    reactionType: z.string().default('like')
  }))
  .mutation(async ({ input, ctx }: { input: { postId: string; reactionType: string }; ctx: Context }) => {
    try {
      if (!ctx.user?.id) {
        throw new Error('User ID is required');
      }
      
      console.log('Toggling like for post:', input.postId, 'by user:', ctx.user.id);
      
      // Use authenticated supabase client for RLS
      const authSupabase = getAuthenticatedSupabase(ctx);
      
      // Check if user already liked this post
      const { data: existingLike, error: checkError } = await authSupabase
        .from('post_likes')
        .select('id')
        .eq('post_id', input.postId)
        .eq('user_id', ctx.user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingLike) {
        // Unlike the post
        const { error: deleteError } = await authSupabase
          .from('post_likes')
          .delete()
          .eq('post_id', input.postId)
          .eq('user_id', ctx.user.id);

        if (deleteError) throw deleteError;
        return { liked: false };
      } else {
        // Like the post
        const { error: insertError } = await authSupabase
          .from('post_likes')
          .insert({
            post_id: input.postId,
            user_id: ctx.user.id,
            reaction_type: input.reactionType
          });

        if (insertError) throw insertError;
        return { liked: true };
      }
    } catch (error) {
      console.error('Error toggling post like:', error);
      throw new Error('Failed to toggle like');
    }
  });

// Add comment to post
export const addPostCommentProcedure = protectedProcedure
  .input(z.object({
    postId: z.string().uuid(),
    content: z.string().min(1).max(500),
    parentCommentId: z.string().uuid().optional()
  }))
  .mutation(async ({ input, ctx }: { input: { postId: string; content: string; parentCommentId?: string }; ctx: Context }) => {
    try {
      if (!ctx.user?.id) {
        throw new Error('User ID is required');
      }
      
      // Use authenticated supabase client for RLS
      const authSupabase = getAuthenticatedSupabase(ctx);
      
      const { data, error } = await authSupabase
        .from('post_comments')
        .insert({
          post_id: input.postId,
          user_id: ctx.user.id,
          content: input.content,
          parent_comment_id: input.parentCommentId
        })
        .select(`
          *,
          users!inner (
            username,
            display_name,
            profile_image
          )
        `)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw new Error('Failed to add comment');
    }
  });

// Delete post comment
export const deletePostCommentProcedure = protectedProcedure
  .input(z.object({
    commentId: z.string().uuid()
  }))
  .mutation(async ({ input, ctx }: { input: { commentId: string }; ctx: Context }) => {
    try {
      if (!ctx.user?.id) {
        throw new Error('User ID is required');
      }
      
      // Use authenticated supabase client for RLS
      const authSupabase = getAuthenticatedSupabase(ctx);
      
      // Check if comment exists and belongs to user
      const { data: comment, error: fetchError } = await authSupabase
        .from('post_comments')
        .select('user_id')
        .eq('id', input.commentId)
        .single();

      if (fetchError) {
        console.error('Error fetching comment:', fetchError);
        if ((fetchError as any)?.code === 'PGRST116') {
          throw new Error('Comment not found');
        }
        throw new Error('Failed to fetch comment');
      }

      if (!comment) {
        throw new Error('Comment not found');
      }

      if (comment.user_id !== ctx.user.id) {
        throw new Error('You can only delete your own comments');
      }

      // Delete the comment
      const { error: deleteError } = await authSupabase
        .from('post_comments')
        .delete()
        .eq('id', input.commentId)
        .eq('user_id', ctx.user.id);

      if (deleteError) {
        console.error('Error deleting comment:', deleteError);
        throw new Error('Failed to delete comment');
      }

      return { success: true };
    } catch (error) {
      console.error('Delete post comment procedure error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to delete comment');
    }
  });

// Toggle post comment like
export const togglePostCommentLikeProcedure = protectedProcedure
  .input(z.object({
    commentId: z.string().uuid()
  }))
  .mutation(async ({ input, ctx }: { input: { commentId: string }; ctx: Context }) => {
    try {
      if (!ctx.user?.id) {
        throw new Error('User ID is required');
      }
      
      // Use authenticated supabase client for RLS
      const authSupabase = getAuthenticatedSupabase(ctx);
      
      // Check if user already liked this comment
      const { data: existingLike, error: checkError } = await authSupabase
        .from('post_comment_likes')
        .select('id')
        .eq('comment_id', input.commentId)
        .eq('user_id', ctx.user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingLike) {
        // Unlike the comment
        const { error: deleteError } = await authSupabase
          .from('post_comment_likes')
          .delete()
          .eq('comment_id', input.commentId)
          .eq('user_id', ctx.user.id);

        if (deleteError) throw deleteError;
        return { liked: false };
      } else {
        // Like the comment
        const { error: insertError } = await authSupabase
          .from('post_comment_likes')
          .insert({
            comment_id: input.commentId,
            user_id: ctx.user.id
          });

        if (insertError) throw insertError;
        return { liked: true };
      }
    } catch (error) {
      console.error('Error toggling post comment like:', error);
      throw new Error('Failed to toggle comment like');
    }
  });

// Get news posts from posts table
export const getNewsPostsProcedure = publicProcedure
  .input(z.object({
    limit: z.number().min(1).max(50).default(20),
    offset: z.number().min(0).default(0)
  }))
  .query(async ({ input, ctx }: { input: { limit: number; offset: number }; ctx: Context }) => {
    const client = ctx.admin || supabase;
    if (!client) {
      throw new Error('Supabase not configured');
    }
    
    try {
      console.log('Fetching news posts with input:', input);

      const { data: posts, error } = await client
        .from('posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (error) {
        console.error('Supabase error fetching news:', error);
        throw error;
      }

      console.log('Fetched news posts count:', posts?.length ?? 0);
      return posts || [];
    } catch (error) {
      console.error('Error fetching news posts:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to fetch news posts: ${error.message}`);
      }
      throw new Error('Failed to fetch news posts');
    }
  });

// Get single news post by ID
export const getNewsPostByIdProcedure = publicProcedure
  .input(z.object({
    postId: z.string().uuid()
  }))
  .query(async ({ input, ctx }: { input: { postId: string }; ctx: Context }) => {
    const client = ctx.admin || supabase;
    if (!client) {
      throw new Error('Supabase not configured');
    }
    
    try {
      const { data: post, error } = await client
        .from('posts')
        .select('*')
        .eq('id', input.postId)
        .eq('status', 'published')
        .single();

      if (error) {
        console.error('Supabase error fetching news post:', error);
        throw error;
      }

      return post;
    } catch (error) {
      console.error('Error fetching news post:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to fetch news post: ${error.message}`);
      }
      throw new Error('Failed to fetch news post');
    }
  });
