export type ListType = "watching" | "watchlist" | "completed";

export interface UserList {
  dramaId: number;
  addedAt: string;
  current_episode?: number;
  total_episodes?: number;
  total_runtime_minutes?: number;
  watched_minutes?: number;
  episodes_watched?: number;
  // Database fields
  drama_name?: string;
  drama_year?: number;
  poster_image?: string;
  poster_path?: string;
  // Legacy support for old progress structure
  progress?: {
    currentEpisode: number;
    totalEpisodes: number;
    watchedEpisodes: number[];
    totalWatchTimeMinutes: number;
    episodesWatched?: number; // Add this field to progress as well
  };
}

export interface UserRanking {
  dramaId: number;
  rank: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'legendary';
  isPremium: boolean;
  unlockedAt?: string;
}

export interface UserStats {
  totalWatchTime: number; // in minutes
  genreBreakdown: { [genre: string]: number };
  favoriteActor?: {
    id: number;
    name: string;
    worksWatched: number;
  };
  monthlyWatchTime: { [month: string]: number };
}

export type UserType = 'normal' | 'premium' | 'official' | 'founder';
export type VerificationType = 'official' | 'premium' | 'special';
export type BadgeType = 'vip' | 'verified' | 'special';
export type BorderRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'exclusive';

export interface AvatarBorder {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  rarity: BorderRarity;
  isPremiumOnly: boolean;
  isOfficialOnly: boolean;
  unlockRequirement?: any;
  isUnlocked?: boolean;
  isCurrent?: boolean;
  unlockedAt?: string;
  unlockMethod?: string;
}

export interface UserBadge {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  type: BadgeType;
  isPremiumOnly: boolean;
  isOfficialOnly: boolean;
  isUnlocked?: boolean;
  isCurrent?: boolean;
  unlockedAt?: string;
  unlockMethod?: string;
}

export interface PremiumFeatures {
  isSubscribed: boolean;
  subscriptionType?: 'monthly' | 'yearly';
  subscriptionEndDate?: string;
  profileTheme?: string;
  profileBorder?: string;
  customReactions: boolean;
  advancedFilters: boolean;
  multipleRankings: boolean;
  detailedStats: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  profileImage?: string;
  userProfileCover?: string;
  isFollowing?: boolean;
  followersCount: number;
  followingCount: number;
  // Novos campos do sistema de tipos
  userType: UserType;
  isVerified: boolean;
  verificationType?: VerificationType;
  premiumExpiresAt?: string;
  dailySwipeLimit: number;
  currentBadge?: UserBadge;
  currentAvatarBorder?: AvatarBorder;
  isPremiumActive: boolean;
  // Dados existentes
  lists: {
    watching: UserList[];
    watchlist: UserList[];
    completed: UserList[];
  };
  rankings: UserRanking[];
  achievements: Achievement[];
  stats: UserStats;
  premium: PremiumFeatures;
  createdAt: string;
}

export interface RankingWithDetails {
  id: string;
  title: string;
  userId: string;
  user: {
    username: string;
    displayName: string;
    profileImage?: string;
  };
  dramas: {
    drama: {
      id: number;
      name: string;
      poster_path: string | null;
      first_air_date: string;
    };
    rank: number;
  }[];
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RankingComment {
  id: string;
  content: string;
  userId: string;
  user: {
    username: string;
    displayName: string;
    profileImage?: string;
  };
  rankingId: string;
  createdAt: string;
  replies?: RankingComment[];
}

export interface CommunityPost {
  id: string;
  type: 'discussion' | 'ranking';
  userId: string;
  user: {
    username: string;
    displayName: string;
    profileImage?: string;
  };
  content: string;
  mentionedDrama?: {
    id: number;
    name: string;
    poster_path: string | null;
    first_air_date: string;
  };
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  createdAt: string;
}

export interface CommunityFeedItem {
  type: 'ranking' | 'recommendation';
  id: string;
  user: {
    username: string;
    displayName: string;
    profileImage?: string;
  };
  content: RankingWithDetails;
  engagement: {
    likes: number;
    comments: number;
  };
  createdAt: string;
}

export interface OnboardingData {
  username: string;
  email: string;
  password?: string;
  displayName?: string;
  bio?: string;
  profileImage?: string;
  favoriteGenres: string[];
  lovedDramas: number[];
  authProvider?: 'email' | 'google' | 'apple';
  gender?: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';
  birthDate?: string;
  age?: number;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  bio?: string;
  profileImage?: string;
  userProfileCover?: string;
  followersCount?: number;
  followingCount?: number;
  isOnboardingComplete: boolean;
  // Novos campos do sistema de tipos
  userType: UserType;
  isVerified: boolean;
  verificationType?: VerificationType;
  premiumExpiresAt?: string;
  dailySwipeLimit: number;
  currentBadge?: UserBadge;
  currentAvatarBorder?: AvatarBorder;
  isPremiumActive: boolean;
  createdAt: string;
}

export interface UserTypeInfo {
  type: UserType;
  displayName: string;
  description: string;
  features: {
    rankingLimit: number;
    dailySwipes: number;
    hasAdvancedStats: boolean;
    hasCustomBorders: boolean;
    hasBadges: boolean;
    hasVerification: boolean;
  };
  badge?: UserBadge;
  availableBorders: AvatarBorder[];
}

export interface UserCustomization {
  availableBorders: AvatarBorder[];
  availableBadges: UserBadge[];
  currentBorder?: AvatarBorder;
  currentBadge?: UserBadge;
  canChangeBorder: boolean;
  canChangeBadge: boolean;
}