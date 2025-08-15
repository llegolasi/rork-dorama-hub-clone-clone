import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Admin client (service role) only for verifying tokens and privileged reads, not for RLS-bypassed writes
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

// Context creation function
export const createContext = async (opts: FetchCreateContextFnOptions) => {
  const authHeader = opts.req.headers.get('authorization');
  let user: {
    id: string;
    username: string | null;
    email: string;
    displayName: string | null;
    profileImage: string | null;
    isOnboardingComplete: boolean | null;
  } | null = null;
  let requestClient: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    try {
      const { data: { user: authUser }, error } = await adminClient.auth.getUser(token);

      if (!error && authUser) {
        // Create a per-request client that carries the user's JWT so RLS policies see auth.uid()
        requestClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });

        const { data: profile } = await requestClient
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profile) {
          user = {
            id: profile.id,
            username: profile.username ?? null,
            email: authUser.email ?? '',
            displayName: profile.display_name ?? null,
            profileImage: profile.profile_image ?? null,
            isOnboardingComplete: profile.is_onboarding_complete ?? null,
          };
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
    }
  }

  return {
    req: opts.req,
    user,
    supabase: requestClient,
    admin: adminClient,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// Protected procedure that requires authentication
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource'
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    }
  });
});