import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { supabase } from "@/lib/supabase";
import { getApiBaseUrl } from "@/constants/config";

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getApiBaseUrl()}/api/trpc`,
      transformer: superjson,
      headers: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const headers = {
            authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
            'Content-Type': 'application/json',
          };
          console.log('tRPC headers:', headers);
          return headers;
        } catch (error) {
          console.error('Error getting session for tRPC headers:', error);
          return {
            'Content-Type': 'application/json',
          };
        }
      },
      fetch: async (url, options) => {
        console.log('tRPC request URL:', url);
        console.log('tRPC request options:', JSON.stringify(options, null, 2));
        try {
          const response = await fetch(url, options);
          console.log('tRPC response status:', response.status);
          console.log('tRPC response headers:', Object.fromEntries(response.headers.entries()));
          
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