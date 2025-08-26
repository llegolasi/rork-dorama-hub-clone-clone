import React, { useState, useCallback } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, ScrollView, Alert, FlatList, RefreshControl } from "react-native";
import { Image } from "expo-image";
import { BookOpen, Check, Eye, Heart, MessageCircle, Edit3, Award, Crown, BarChart3, Settings, Menu, LogOut, Trophy, Camera, Plus } from "lucide-react-native";
import { router, Stack, useFocusEffect } from "expo-router";

import { COLORS } from "@/constants/colors";

import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import AchievementsGrid from "@/components/AchievementsGrid";
import PremiumSubscription from "@/components/PremiumSubscription";
import UserStatsComponent from "@/components/UserStatsComponent";
import ProfileCustomization from "@/components/ProfileCustomization";
import UserStatsDisplay from "@/components/UserStatsDisplay";
import CoverPhotoModal from "@/components/CoverPhotoModal";
import PremiumCoverModal from "@/components/PremiumCoverModal";
import { ProfileSkeleton } from "@/components/SkeletonLoader";
import { ACHIEVEMENTS } from "@/constants/achievements";
import { UserDisplayName } from "@/components/UserTypeComponents";

import type { RankingWithDetails, Achievement, UserStats, PremiumFeatures, UserType } from "@/types/user";

type TabType = 'posts' | 'dramas';

export default function ProfileScreen() {
  const { user: userProfile, isLoading } = useAuth();
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [showMenu, setShowMenu] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  
  // Fetch user's community posts
  const { data: userPosts = [], isLoading: postsLoading, refetch: refetchPosts } = trpc.community.getPosts.useQuery({
    type: 'all',
    limit: 20,
    offset: 0
  });
  
  // Fetch completed dramas from database
  const { data: completedDramas = [], isLoading: completedLoading, refetch: refetchCompletedDramas } = trpc.users.getUserCompletedDramas.useQuery({
    userId: userProfile?.id || '',
    limit: 10,
    offset: 0
  }, {
    enabled: !!userProfile?.id && userProfile.id !== '' && userProfile.id.length > 0
  });
  
  // Fetch user stats for counts - only if user is authenticated
  const { data: userStats, refetch: refetchStats } = trpc.users.getStats.useQuery({
    userId: userProfile?.id
  }, {
    enabled: !!userProfile?.id && userProfile.id !== '' && userProfile.id.length > 0
  });
  
  // Check premium status - only if user is authenticated
  const { data: premiumStatus } = trpc.users.checkPremiumStatus.useQuery(undefined, {
    enabled: !!userProfile?.id && userProfile.id !== '' && userProfile.id.length > 0
  });
  
  // Get followers count
  const { data: followers = [], refetch: refetchFollowers } = trpc.users.getUserFollowers.useQuery({
    userId: userProfile?.id || '',
    limit: 1,
    offset: 0
  }, {
    enabled: !!userProfile?.id && userProfile.id !== '' && userProfile.id.length > 0
  });
  
  // Get following count
  const { data: following = [], refetch: refetchFollowing } = trpc.users.getUserFollowing.useQuery({
    userId: userProfile?.id || '',
    limit: 1,
    offset: 0
  }, {
    enabled: !!userProfile?.id && userProfile.id !== '' && userProfile.id.length > 0
  });
  
  // Get actual counts from database
  const { data: followersData = [], refetch: refetchFollowersData } = trpc.users.getUserFollowers.useQuery({
    userId: userProfile?.id || '',
    limit: 50,
    offset: 0
  }, {
    enabled: !!userProfile?.id && userProfile.id !== '' && userProfile.id.length > 0
  });
  
  const { data: followingData = [], refetch: refetchFollowingData } = trpc.users.getUserFollowing.useQuery({
    userId: userProfile?.id || '',
    limit: 50,
    offset: 0
  }, {
    enabled: !!userProfile?.id && userProfile.id !== '' && userProfile.id.length > 0
  });
  
  // Update profile cover mutation
  const updateCoverMutation = trpc.users.updateProfileCover.useMutation({
    onSuccess: () => {
      console.log('Profile cover updated successfully');
      // Refresh user data if needed
    },
    onError: (error) => {
      Alert.alert('Erro', error.message);
    }
  });
  
  // Auto-refresh user profile when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('Profile screen focused - refreshing data');
      refetchPosts();
      refetchCompletedDramas();
      refetchStats();
      refetchFollowersData();
      refetchFollowingData();
    }, [refetchPosts, refetchCompletedDramas, refetchStats, refetchFollowersData, refetchFollowingData])
  );
  
  // Update followers and following counts when data changes
  React.useEffect(() => {
    setFollowersCount(followersData?.length || 0);
  }, [followersData]);
  
  React.useEffect(() => {
    setFollowingCount(followingData?.length || 0);
  }, [followingData]);
  
  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchPosts(),
        refetchCompletedDramas(),
        refetchStats(),
        refetchFollowersData(),
        refetchFollowingData()
      ]);
    } catch (error) {
      console.error('Error refreshing profile data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchPosts, refetchCompletedDramas, refetchStats, refetchFollowersData, refetchFollowingData]);
  
  // Filter posts by current user
  const currentUserPosts = userPosts.filter(post => post.user_id === userProfile?.id);
  
  // Mock premium features and achievements data
  const mockPremiumFeatures: PremiumFeatures = {
    isSubscribed: false,
    customReactions: false,
    advancedFilters: false,
    multipleRankings: false,
    detailedStats: false,
  };
  
  const mockUserStats: UserStats = {
    totalWatchTime: 2340, // minutes
    genreBreakdown: {
      'Romance': 15,
      'Thriller': 8,
      'Comédia': 6,
      'Drama': 12,
      'Histórico': 4,
    },
    favoriteActor: {
      id: 1,
      name: 'Lee Min-ho',
      worksWatched: 5,
    },
    monthlyWatchTime: {
      '2024-01': 180,
      '2024-02': 220,
      '2024-03': 160,
      '2024-04': 280,
      '2024-05': 320,
      '2024-06': 240,
    },
  };
  
  const mockAchievements = ACHIEVEMENTS.map(achievement => ({
    ...achievement,
    unlockedAt: Math.random() > 0.6 ? '2024-01-15T10:20:00Z' : undefined,
  }));
  
  const [currentTheme, setCurrentTheme] = useState('default');
  const [currentBorder, setCurrentBorder] = useState('default');
  
  if (isLoading) {
    return <ProfileSkeleton />;
  }



  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  const handleEditRanking = () => {
    router.push('/ranking/edit');
  };

  const handleRankingPress = (ranking: RankingWithDetails) => {
    router.push(`/ranking/comments/${ranking.id}`);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sair da Conta',
      'Tem certeza que deseja sair da sua conta?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  const handleFollowersPress = () => {
    router.push('/profile/followers');
  };

  const handleFollowingPress = () => {
    router.push('/profile/following');
  };
  
  const handlePostPress = (postId: string) => {
    router.push(`/community/post/${postId}`);
  };
  
  const handleDramaPress = (dramaId: number) => {
    router.push(`/drama/${dramaId}`);
  };
  
  const handleSubscribe = (plan: 'monthly' | 'yearly') => {
    console.log('Subscribe to plan:', plan);
    // Handle subscription logic
  };
  
  const handleThemeChange = (themeId: string) => {
    setCurrentTheme(themeId);
    console.log('Theme changed to:', themeId);
  };
  
  const handleBorderChange = (borderId: string) => {
    setCurrentBorder(borderId);
    console.log('Border changed to:', borderId);
  };
  
  const handleCoverPhotoPress = () => {
    if (premiumStatus?.isPremium) {
      setShowCoverModal(true);
    } else {
      setShowPremiumModal(true);
    }
  };
  
  const handleSelectCover = async (imageUrl: string) => {
    try {
      await updateCoverMutation.mutateAsync({ coverImageUrl: imageUrl });
      // Update local state immediately for better UX
      if (userProfile) {
        userProfile.userProfileCover = imageUrl;
      }
      setShowCoverModal(false);
      Alert.alert('Sucesso', 'Foto de capa atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating cover:', error);
    }
  };

  const renderTabButton = (tab: TabType, title: string, icon: React.ReactNode) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      {icon}
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
  
  const renderPostItem = ({ item }: { item: any }) => {
    if (item.post_type === 'ranking') {
      return renderRankingCard(item);
    } else {
      return renderPublicationCard(item);
    }
  };
  
  const renderRankingCard = (post: any) => {
    if (!post.user_rankings) return null;

    const items = Array.isArray(post.user_rankings?.ranking_items) ? [...post.user_rankings.ranking_items] : [];
    items.sort((a: any, b: any) => (a?.rank_position ?? 0) - (b?.rank_position ?? 0));
    const topItems = items.slice(0, 3);

    return (
      <TouchableOpacity
        key={post.id}
        style={styles.rankingCard}
        onPress={() => handlePostPress(post.id)}
      >
        <View style={styles.rankingBannerProfile}>
          {topItems.length > 0 ? (
            <View style={styles.bannerRow}>
              {topItems.map((it: any, idx: number) => (
                <View key={idx} style={styles.bannerCol}>
                  <Image
                    source={{ uri: it.cover_image || it.poster_image || 'https://via.placeholder.com/200x300/333/fff?text=Drama' }}
                    style={styles.bannerImage}
                    contentFit="cover"
                  />
                </View>
              ))}
            </View>
          ) : (
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1527137342181-19aab11a8ee8?w=1200&auto=format&fit=crop&q=60' }}
              style={styles.bannerImage}
              contentFit="cover"
            />
          )}
          <View style={styles.bannerOverlay}>
            <View style={styles.topBadge}>
              <Text style={styles.topBadgeText}>Ranking</Text>
            </View>
          </View>
        </View>

        <View style={styles.rankingContent}>
          <View style={styles.rankingHeaderProfile}>
            <View style={styles.userInfo}>
              <Image
                source={{
                  uri: userProfile?.profileImage || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
                }}
                style={styles.userAvatar}
                contentFit="cover"
              />
              <View style={styles.userDetails}>
                <UserDisplayName
                  displayName={userProfile?.displayName || userProfile?.username || 'Usuário'}
                  username={userProfile?.username || undefined}
                  userType={(userProfile?.userType as UserType) || 'normal'}
                  size="medium"
                />
              </View>
            </View>
          </View>

          <Text style={styles.rankingTitleProfile}>{post.user_rankings?.title || 'Ranking'}</Text>
          {!!post.user_rankings?.description && (
            <Text style={styles.rankingDescription} numberOfLines={3}>
              {post.user_rankings.description}
            </Text>
          )}

          <View style={styles.engagementStats}>
            <View style={styles.statItemProfile}>
              <Trophy size={16} color={COLORS.accent} />
              <Text style={styles.statText}>{items.length > 0 ? `${items.length} itens` : 'Novo'}</Text>
            </View>
          </View>

          <View style={styles.actionButtonProfile}>
            <Text style={styles.actionButtonTextProfile}>Ver Ranking e Comentar</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderPublicationCard = (post: any) => (
    <TouchableOpacity
      key={post.id}
      style={styles.publicationCard}
      onPress={() => handlePostPress(post.id)}
    >
      <View style={styles.publicationHeader}>
        <View style={styles.userInfo}>
          <Image
            source={{
              uri: userProfile?.profileImage || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
            }}
            style={styles.userAvatar}
            contentFit="cover"
          />
          <View style={styles.userDetails}>
            <UserDisplayName
              displayName={userProfile?.displayName || userProfile?.username || 'Usuário'}
              username={userProfile?.username || undefined}
              userType={(userProfile?.userType as UserType) || 'normal'}
              size="medium"
            />
          </View>
        </View>
      </View>

      <Text style={styles.publicationContent}>{post.content}</Text>

      {post.mentioned_drama_id && (
        <TouchableOpacity 
          style={styles.mentionedDrama}
          onPress={() => handleDramaPress(post.mentioned_drama_id)}
        >
          <Image
            source={{
              uri: post.poster_image || 'https://via.placeholder.com/200x300/333/fff?text=Drama',
            }}
            style={styles.mentionedPoster}
            contentFit="cover"
          />
          <View style={styles.mentionedInfo}>
            <Text style={styles.mentionedTitle}>{post.drama_name || 'Drama Mencionado'}</Text>
            <Text style={styles.mentionedYear}>{post.drama_year || 'N/A'}</Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.engagementStats}>
        <View style={styles.statItemProfile}>
          <Heart
            size={16}
            color={post.is_liked ? COLORS.accent : COLORS.textSecondary}
            fill={post.is_liked ? COLORS.accent : 'transparent'}
          />
          <Text style={styles.statText}>{post.likes_count || 0}</Text>
        </View>
        <View style={styles.statItemProfile}>
          <MessageCircle size={16} color={COLORS.textSecondary} />
          <Text style={styles.statText}>{post.comments_count || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
  
  const renderDramaItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.dramaCard}
      onPress={() => handleDramaPress(item.id)}
    >
      <Image
        source={{
          uri: item.poster_path
            ? `https://image.tmdb.org/t/p/w200${item.poster_path}`
            : 'https://via.placeholder.com/200x300/333/fff?text=No+Image',
        }}
        style={styles.dramaPoster}
        contentFit="cover"
      />
      <Text style={styles.dramaTitle} numberOfLines={2}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderRankingItem = (item: { drama: any; rank: number }) => (
    <TouchableOpacity
      key={item.drama.id}
      style={styles.rankingItem}
      onPress={() => router.push(`/drama/${item.drama.id}`)}
    >
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>{item.rank}</Text>
      </View>
      <Image
        source={{
          uri: item.drama.poster_path
            ? `https://image.tmdb.org/t/p/w200${item.drama.poster_path}`
            : 'https://via.placeholder.com/200x300/333/fff?text=No+Image',
        }}
        style={styles.rankingPoster}
        contentFit="cover"
      />
      <View style={styles.rankingInfo}>
        <Text style={styles.rankingItemTitle} numberOfLines={2}>
          {item.drama.name}
        </Text>
        <Text style={styles.rankingYear}>
          {new Date(item.drama.first_air_date).getFullYear()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
          />
        }
      >
        {/* Cover Photo Section */}
        <TouchableOpacity 
          style={styles.coverSection}
          onPress={handleCoverPhotoPress}
          activeOpacity={0.8}
        >
          <Image
            source={{
              uri: (userProfile?.userProfileCover && premiumStatus?.isPremium) 
                ? userProfile.userProfileCover 
                : 'https://tmbpgttvoabpmcanuqkm.supabase.co/storage/v1/object/public/profilecover/cover.jpg'
            }}
            style={styles.coverImage}
            contentFit="cover"
          />
          
          {/* Gradient overlay */}
          <View style={styles.coverGradient}>
            <View style={[styles.gradientLayer, { backgroundColor: COLORS.background, opacity: 0 }]} />
            <View style={[styles.gradientLayer, { backgroundColor: COLORS.background, opacity: 0.02 }]} />
            <View style={[styles.gradientLayer, { backgroundColor: COLORS.background, opacity: 0.05 }]} />
            <View style={[styles.gradientLayer, { backgroundColor: COLORS.background, opacity: 0.08 }]} />
            <View style={[styles.gradientLayer, { backgroundColor: COLORS.background, opacity: 0.12 }]} />
            <View style={[styles.gradientLayer, { backgroundColor: COLORS.background, opacity: 0.18 }]} />
            <View style={[styles.gradientLayer, { backgroundColor: COLORS.background, opacity: 0.25 }]} />
            <View style={[styles.gradientLayer, { backgroundColor: COLORS.background, opacity: 0.35 }]} />
            <View style={[styles.gradientLayer, { backgroundColor: COLORS.background, opacity: 0.45 }]} />
            <View style={[styles.gradientLayer, { backgroundColor: COLORS.background, opacity: 0.58 }]} />
            <View style={[styles.gradientLayer, { backgroundColor: COLORS.background, opacity: 0.72 }]} />
            <View style={[styles.gradientLayer, { backgroundColor: COLORS.background, opacity: 0.85 }]} />
            <View style={[styles.gradientLayer, { backgroundColor: COLORS.background, opacity: 0.95 }]} />
            <View style={[styles.gradientLayer, { backgroundColor: COLORS.background, opacity: 1 }]} />
          </View>
          
          {/* Camera icon - only show for own profile */}
          <View style={styles.cameraIconContainer}>
            <View style={styles.cameraIcon}>
              <Camera size={20} color="white" />
            </View>
          </View>
          
          {/* Empty overlay for non-premium users - no text shown */}
          {!premiumStatus?.isPremium && (
            <View style={styles.emptyCoverOverlayBlank} />
          )}
          
          {/* Show add message for premium users without cover */}
          {!userProfile?.userProfileCover && premiumStatus?.isPremium && (
            <View style={styles.emptyCoverOverlay}>
              <Camera size={32} color={COLORS.background} />
              <Text style={styles.emptyCoverTitle}>
                Adicionar Foto de Capa
              </Text>
              <Text style={styles.emptyCoverSubtitle}>
                Toque para escolher uma imagem
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <View style={styles.profileImageContainer}>
              <Image
                source={{ uri: userProfile?.profileImage || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face' }}
                style={styles.profileImage}
                contentFit="cover"
              />
            </View>
            
            <View style={styles.profileInfo}>
              <UserDisplayName
                displayName={userProfile?.displayName || userProfile?.username || 'Usuário'}
                username={userProfile?.username || undefined}
                userType={(userProfile?.userType as UserType) || 'normal'}
                size="large"
              />
              
              <View style={styles.socialStats}>
                <TouchableOpacity style={styles.socialStat} onPress={handleFollowersPress}>
                  <Text style={styles.socialStatNumber}>{followersCount}</Text>
                  <Text style={styles.socialStatLabel}>seguidores</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialStat} onPress={handleFollowingPress}>
                  <Text style={styles.socialStatNumber}>{followingCount}</Text>
                  <Text style={styles.socialStatLabel}>seguindo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          <Text style={styles.bio}>{userProfile?.bio || 'Apaixonado por K-dramas!'}</Text>
        
          <View style={styles.profileActions}>
            <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
              <Edit3 size={16} color={COLORS.text} />
              <Text style={styles.editProfileText}>Editar Perfil</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuButton} onPress={() => setShowMenu(!showMenu)}>
              <Menu size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          {showMenu && (
            <View style={styles.menuDropdown}>
              <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                <LogOut size={16} color={COLORS.error} />
                <Text style={[styles.menuItemText, { color: COLORS.error }]}>Sair da Conta</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Componente de estatísticas detalhadas */}
        {userProfile?.id && userProfile.id !== '' && (
          <UserStatsDisplay userId={userProfile.id} isOwnProfile={true} />
        )}

        <View style={styles.tabContainer}>
          {renderTabButton(
            'posts',
            'Postagens',
            <MessageCircle size={16} color={activeTab === 'posts' ? COLORS.accent : COLORS.textSecondary} />
          )}
          {renderTabButton(
            'dramas',
            'Doramas Assistidos',
            <Eye size={16} color={activeTab === 'dramas' ? COLORS.accent : COLORS.textSecondary} />
          )}
        </View>

        {activeTab === 'posts' && (
          <View style={styles.postsSection}>
            {postsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.accent} />
              </View>
            ) : currentUserPosts.length > 0 ? (
              <FlatList
                data={currentUserPosts}
                renderItem={renderPostItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <MessageCircle size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyStateTitle}>Nenhuma postagem ainda</Text>
                <Text style={styles.emptyStateText}>
                  Compartilhe suas opiniões sobre K-dramas na comunidade!
                </Text>
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={() => router.push('/community/create')}
                >
                  <Text style={styles.emptyStateButtonText}>Criar Postagem</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        
        {activeTab === 'dramas' && (
          <View style={styles.dramasSection}>
            <Text style={styles.sectionTitle}>Doramas Concluídos</Text>
            {completedLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.accent} />
              </View>
            ) : completedDramas.length > 0 ? (
              <FlatList
                data={completedDramas}
                renderItem={renderDramaItem}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dramasList}
              />
            ) : (
              <View style={styles.emptyState}>
                <Eye size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyStateTitle}>Nenhum dorama concluído</Text>
                <Text style={styles.emptyStateText}>
                  Comece a assistir e marque como concluído!
                </Text>
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={() => router.push('/')}
                >
                  <Text style={styles.emptyStateButtonText}>Explorar Doramas</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
      
      <CoverPhotoModal
        visible={showCoverModal}
        onClose={() => setShowCoverModal(false)}
        onSelectCover={handleSelectCover}
        isPremium={premiumStatus?.isPremium || false}
      />
      
      <PremiumCoverModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  coverSection: {
    height: 280,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
    flexDirection: 'column',
  },
  gradientLayer: {
    flex: 1,
    width: '100%',
  },
  emptyCoverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 40,
  },
  emptyCoverTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.background,
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyCoverSubtitle: {
    fontSize: 14,
    color: COLORS.background,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.9,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    padding: 20,
    marginTop: -80,
    position: 'relative',
    zIndex: 10,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  profileInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  username: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  socialStats: {
    flexDirection: 'row',
    gap: 20,
  },
  socialStat: {
    alignItems: 'center',
  },
  socialStatNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  socialStatLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  bio: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editProfileButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  menuButton: {
    backgroundColor: COLORS.card,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuDropdown: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  editProfileText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  statItemProfile: {
    alignItems: "center",
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    gap: 6,
  },
  activeTabButton: {
    backgroundColor: COLORS.accent + '20',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.accent,
  },
  rankingSection: {
    paddingHorizontal: 16,
  },
  rankingCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  rankingBannerProfile: {
    height: 140,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 12,
  },
  topBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  topBadgeText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  rankingContent: {
    padding: 16,
  },
  rankingHeaderProfile: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  userHandle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  rankingTitleProfile: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  rankingDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  engagementStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  bannerRow: {
    flexDirection: 'row',
    width: '100%',
    height: '100%',
  },
  bannerCol: {
    flex: 1,
    height: '100%',
  },
  publicationCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  publicationHeader: {
    marginBottom: 12,
  },
  publicationContent: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  mentionedDrama: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    gap: 12,
  },
  mentionedPoster: {
    width: 40,
    height: 60,
    borderRadius: 6,
  },
  mentionedInfo: {
    flex: 1,
  },
  mentionedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  mentionedYear: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  actionButtonProfile: {
    backgroundColor: COLORS.accent + '20',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  actionButtonTextProfile: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  rankingTitleContainer: {
    flex: 1,
    marginRight: 16,
  },

  rankingEngagement: {
    flexDirection: 'row',
    gap: 16,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  engagementText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  editRankingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  editRankingText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  rankingList: {
    gap: 12,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.background,
  },
  rankingPoster: {
    width: 60,
    height: 90,
    borderRadius: 8,
  },
  rankingInfo: {
    flex: 1,
  },
  rankingItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  rankingYear: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  listsSection: {
    paddingHorizontal: 16,
    paddingVertical: 40,
    alignItems: 'center',
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  postsSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  dramasSection: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  dramasList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  dramaCard: {
    width: 120,
    alignItems: 'center',
  },
  dramaPoster: {
    width: 120,
    height: 180,
    borderRadius: 12,
    marginBottom: 8,
  },
  dramaTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
  emptyCoverOverlayBlank: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  cameraIconContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  cameraIcon: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});