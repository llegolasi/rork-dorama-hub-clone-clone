import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { supabase } from "@/lib/supabase";
import { getApiBaseUrl, testApiConnection } from "@/constants/config";

export const trpc = createTRPCReact<AppRouter>();

// Test API connection on startup
testApiConnection().then(isConnected => {
  if (!isConnected) {
    console.warn('⚠️ API connection test failed. tRPC calls may not work properly.');
  } else {
    console.log('✅ API connection test successful.');
  }
});

export const trpcClient = trpc.createClient({
  links: [
    // Use httpLink instead of httpBatchLink to avoid batching issues
    httpLink({
      url: `${getApiBaseUrl()}/api/trpc`,
      transformer: superjson,
      headers: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const headers = {
            authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
            'Content-Type': 'application/json',
          } as Record<string, string>;
          console.log('tRPC headers:', headers);
          return headers;
        } catch (error) {
          console.error('Error getting session for tRPC headers:', error);
          return {
            'Content-Type': 'application/json',
          } as Record<string, string>;
        }
      },
      fetch: async (url, options) => {
        console.log('🔄 tRPC request URL:', url);
        console.log('🔄 tRPC request options:', JSON.stringify(options ?? {}, null, 2));
        
        try {
          const response = await fetch(url, options);
          console.log('📡 tRPC response status:', response.status);
          console.log('📡 tRPC response headers:', Object.fromEntries(response.headers.entries()));
          
          if (!response.ok) {
            const text = await response.text();
            console.error('❌ tRPC error response:', text);
            
            // Provide more specific error messages
            if (response.status === 404) {
              console.error('❌ 404 Error: The tRPC endpoint was not found. Check if the backend is deployed and the route exists.');
              console.error('❌ Expected URL format: ${baseUrl}/api/trpc/{procedure}');
              console.error('❌ Current URL:', url);
            } else if (response.status === 500) {
              console.error('❌ 500 Error: Internal server error. Check backend logs.');
            } else if (response.status === 403) {
              console.error('❌ 403 Error: Forbidden. Check authentication.');
            }
            
            throw new Error(`HTTP ${response.status}: ${text}`);
          }
          
          return response;
        } catch (error) {
          console.error('❌ tRPC fetch error:', error);
          
          // Additional debugging for network errors
          if (error instanceof TypeError && error.message.includes('fetch')) {
            console.error('❌ Network error: Unable to reach the API server.');
            console.error('❌ Check if the API URL is correct:', getApiBaseUrl());
            console.error('❌ Check if the backend is running and accessible.');
          }
          
          throw error;
        }
      },
    }),
  ],
});