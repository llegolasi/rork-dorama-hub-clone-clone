import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";

// Community routes
import {
  getCommunityPostsProcedure,
  createCommunityPostProcedure,
  getPostDetailsProcedure,
  togglePostLikeProcedure,
  addPostCommentProcedure,
  getNewsPostsProcedure,
  getNewsPostByIdProcedure
} from "./routes/community/posts/route";

// News comments routes
import {
  getCommentsProcedure,
  addCommentProcedure,
  toggleCommentLikeProcedure,
  getArticleLikesProcedure,
  getUserLikedArticleProcedure,
  toggleArticleLikeProcedure,
  deleteCommentProcedure
} from "./routes/news/comments/route";

// Rankings routes
import {
  getUserRankingsProcedure,
  getRankingDetailsProcedure,
  saveRankingProcedure,
  toggleRankingLikeProcedure,
  addRankingCommentProcedure
} from "./routes/rankings/route";

// Users routes
import {
  getUserProfileProcedure,
  updateUserProfileProcedure,
  toggleFollowUserProcedure,
  getUserFollowersProcedure,
  getUserFollowingProcedure,
  getUserCompletedDramasProcedure,
  getFollowersWithDetailsProcedure,
  getFollowingWithDetailsProcedure,
  getUserStatsProcedure,
  updateUserStatsProcedure
} from "./routes/users/route";

// Discover routes
import {
  getDiscoverDramasProcedure,
  skipDramaProcedure,
  getDailySwipesStatusProcedure,
  incrementDailySwipesProcedure,
  cleanExpiredSkippedDramasProcedure
} from "./routes/discover/route";

// Subscription routes
import { subscriptionProcedures } from "./routes/subscription/route";

// Completion routes
import {
  completeDramaProcedure,
  getCompletionHistoryProcedure,
  getCompletionStatsProcedure,
  checkDramaCompletionProcedure
} from "./routes/completions/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  
  community: createTRPCRouter({
    getPosts: getCommunityPostsProcedure,
    createPost: createCommunityPostProcedure,
    getPostDetails: getPostDetailsProcedure,
    togglePostLike: togglePostLikeProcedure,
    addPostComment: addPostCommentProcedure,
  }),
  
  news: createTRPCRouter({
    getPosts: getNewsPostsProcedure,
    getPostById: getNewsPostByIdProcedure,
    getComments: getCommentsProcedure,
    addComment: addCommentProcedure,
    toggleCommentLike: toggleCommentLikeProcedure,
    getArticleLikes: getArticleLikesProcedure,
    getUserLikedArticle: getUserLikedArticleProcedure,
    toggleArticleLike: toggleArticleLikeProcedure,
    deleteComment: deleteCommentProcedure,
  }),
  
  rankings: createTRPCRouter({
    getUserRankings: getUserRankingsProcedure,
    getRankingDetails: getRankingDetailsProcedure,
    saveRanking: saveRankingProcedure,
    toggleRankingLike: toggleRankingLikeProcedure,
    addRankingComment: addRankingCommentProcedure,
  }),
  
  users: createTRPCRouter({
    getUserProfile: getUserProfileProcedure,
    updateUserProfile: updateUserProfileProcedure,
    toggleFollowUser: toggleFollowUserProcedure,
    getUserFollowers: getUserFollowersProcedure,
    getUserFollowing: getUserFollowingProcedure,
    getUserCompletedDramas: getUserCompletedDramasProcedure,
    getFollowersWithDetails: getFollowersWithDetailsProcedure,
    getFollowingWithDetails: getFollowingWithDetailsProcedure,
    getStats: getUserStatsProcedure,
    updateStats: updateUserStatsProcedure,
  }),
  
  discover: createTRPCRouter({
    getDramas: getDiscoverDramasProcedure,
    skipDrama: skipDramaProcedure,
    getDailySwipesStatus: getDailySwipesStatusProcedure,
    incrementDailySwipes: incrementDailySwipesProcedure,
    cleanExpiredSkippedDramas: cleanExpiredSkippedDramasProcedure,
  }),
  
  subscription: createTRPCRouter({
    getPlans: subscriptionProcedures.getPlans,
    getUserSubscription: subscriptionProcedures.getUserSubscription,
    createSubscription: subscriptionProcedures.createSubscription,
    cancelSubscription: subscriptionProcedures.cancelSubscription,
    hasActiveSubscription: subscriptionProcedures.hasActiveSubscription,
  }),
  
  completions: createTRPCRouter({
    completeDrama: completeDramaProcedure,
    getHistory: getCompletionHistoryProcedure,
    getStats: getCompletionStatsProcedure,
    checkCompletion: checkDramaCompletionProcedure,
  }),
});

export type AppRouter = typeof appRouter;