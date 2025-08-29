import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

// Enable CORS for all routes
app.use("*", cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Add request logging middleware
app.use("*", async (c, next) => {
  console.log(`${c.req.method} ${c.req.url}`);
  const headers = c.req.header();
  console.log('Headers:', headers);
  await next();
});

// Health checks on both / and /api (since Vercel keeps the /api prefix)
app.get("/", (c) => {
  console.log('Health check hit on /');
  return c.json({ status: "ok", message: "API is running", timestamp: new Date().toISOString() });
});

app.get("/api", (c) => {
  console.log('Health check hit on /api');
  return c.json({ status: "ok", message: "API is running", timestamp: new Date().toISOString() });
});

// Mount tRPC under /api/trpc to match vercel.json rewrite
// Ensure both "/api/trpc" and "/api/trpc/*" are handled to avoid 404 on the base endpoint
app.use(
  "/api/trpc",
  trpcServer({
    router: appRouter,
    createContext,
    endpoint: "/api/trpc",
    onError: ({ error, path }) => {
      console.error(`tRPC Error on ${path}:`, error);
    },
  })
);

app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
    endpoint: "/api/trpc",
    onError: ({ error, path }) => {
      console.error(`tRPC Error on ${path}:`, error);
    },
  })
);

// Debug route to list all available tRPC procedures
app.get("/api/debug/routes", (c) => {
  const routes = {
    example: ['hi'],
    community: ['getPosts', 'createPost', 'getPostDetails', 'togglePostLike', 'addPostComment', 'deletePostComment', 'togglePostCommentLike', 'deletePost'],
    news: ['getPosts', 'getPostById', 'getComments', 'addComment', 'toggleCommentLike', 'getArticleLikes', 'getUserLikedArticle', 'toggleArticleLike', 'deleteComment'],
    rankings: ['getUserRankings', 'getRankingDetails', 'saveRanking', 'toggleRankingLike', 'addRankingComment', 'deleteRankingComment', 'toggleRankingCommentLike', 'deleteRanking'],
    users: ['getUserProfile', 'updateUserProfile', 'toggleFollowUser', 'getUserFollowers', 'getUserFollowing', 'getUserCompletedDramas', 'getFollowersWithDetails', 'getFollowingWithDetails', 'getStats', 'updateStats', 'markEpisodeWatched', 'completeDramaWithDateRange', 'updateProfileCover', 'checkPremiumStatus', 'getProfileAvatars'],
    discover: ['getDramas', 'skipDrama', 'getDailySwipesStatus', 'incrementDailySwipes', 'cleanExpiredSkippedDramas'],
    subscription: ['getPlans', 'getUserSubscription', 'createSubscription', 'cancelSubscription', 'hasActiveSubscription'],
    completions: ['completeDrama', 'getHistory', 'getStats', 'checkCompletion'],
    dramas: ['backfillCategories', 'getCategoryStats', 'getById', 'search', 'getPopular', 'getTrending', 'syncCache', 'cleanupCache', 'getProviders'],
    comments: {
      reports: ['create', 'getAll', 'checkUserReported', 'getCount']
    }
  };
  
  return c.json({ 
    message: "Available tRPC routes", 
    routes,
    baseUrl: "/api/trpc",
    timestamp: new Date().toISOString()
  });
});

// Catch-all route for debugging
app.all("*", (c) => {
  console.log(`404 - Route not found: ${c.req.method} ${c.req.url}`);
  return c.json({ 
    error: "Route not found", 
    method: c.req.method,
    url: c.req.url,
    availableRoutes: [
      "GET /",
      "GET /api",
      "POST /api/trpc/*",
      "GET /api/debug/routes"
    ],
    timestamp: new Date().toISOString()
  }, 404);
});

export default app;