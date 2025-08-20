import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { supabase } from "@/lib/supabase";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }
  if (typeof window !== 'undefined') {
    return '';
  }
  return 'http://localhost:3000';
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      headers: async () => {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Session error:', error);
            return {
              'Content-Type': 'application/json',
            };
          }
          
          if (!session?.access_token) {
            console.log('No valid session found for tRPC request. Session:', session);
            return {
              'Content-Type': 'application/json',
            };
          }
          
          console.log('Using session token for tRPC request:', session.access_token.substring(0, 20) + '...')
          
          return {
            authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          };
        } catch (error) {
          console.error('Error getting session for tRPC headers:', error);
          return {
            'Content-Type': 'application/json',
          };
        }
      },
      fetch: async (url, options) => {
        console.log('tRPC request:', url, options);
        try {
          const response = await fetch(url, options);
          console.log('tRPC response status:', response.status);
          
          if (!response.ok) {
            const text = await response.text();
            console.error('tRPC error response:', text);
            throw new Error(`HTTP ${response.status}: ${text}`);
          }
          
          return response;
        } catch (error) {
          console.error('tRPC fetch error:', error);
          throw error;
        }
      },
    }),
  ],
});