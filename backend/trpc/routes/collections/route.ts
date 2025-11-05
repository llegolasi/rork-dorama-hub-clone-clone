import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { supabase } from '@/lib/supabase';

export const getHomepageCollections = publicProcedure
  .query(async () => {
    try {
      console.log('[Collections] Fetching homepage collections');
      
      const { data, error } = await supabase
        .rpc('get_homepage_collections');

      if (error) {
        console.error('[Collections] Supabase RPC error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('[Collections] Found', data?.length || 0, 'homepage collections');
      return data || [];
    } catch (error) {
      console.error('[Collections] Homepage collections error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch homepage collections');
    }
  });

export const getCollectionDramas = publicProcedure
  .input(z.object({
    collectionId: z.string().uuid(),
    limit: z.number().min(1).max(50).optional().default(20),
  }))
  .query(async ({ input }) => {
    try {
      console.log('[Collections] Fetching dramas for collection:', input.collectionId);
      
      const { data, error } = await supabase
        .rpc('get_collection_dramas', { 
          collection_uuid: input.collectionId 
        });

      if (error) {
        console.error('[Collections] Supabase RPC error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const limitedData = data?.slice(0, input.limit) || [];
      console.log('[Collections] Found', limitedData.length, 'dramas (limit:', input.limit, ')');
      
      return limitedData;
    } catch (error) {
      console.error('[Collections] Collection dramas error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch collection dramas');
    }
  });

export const getCollectionById = publicProcedure
  .input(z.object({
    collectionId: z.string().uuid(),
  }))
  .query(async ({ input }) => {
    try {
      console.log('[Collections] Fetching collection by ID:', input.collectionId);
      
      const { data, error } = await supabase
        .from('custom_collections')
        .select('*')
        .eq('id', input.collectionId)
        .eq('is_visible', true)
        .maybeSingle();

      if (error) {
        console.error('[Collections] Supabase error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) {
        console.error('[Collections] Collection not found:', input.collectionId);
        throw new Error('Collection not found or is not visible');
      }

      console.log('[Collections] Successfully fetched collection:', data.title);
      return data;
    } catch (error) {
      console.error('[Collections] Collection fetch error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch collection');
    }
  });