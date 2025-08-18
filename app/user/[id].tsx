import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { 
  BookOpen, 
  Check, 
  Eye, 
  Heart, 
  MessageCircle, 
  UserPlus, 
  UserMinus,
  ArrowLeft 
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import UserStatsDisplay from '@/components/UserStatsDisplay';
import type { RankingWithDetails, UserProfile } from '@/types/user';

type TabType = 'posts' | 'dramas';

const UserProfileScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch user profile from database
  const { data: userProfileData, isLoading: profileLoading, refetch } = trpc.users.getUserProfile.useQuery({
    userId: id || ''
  }, {
    enabled: !!id
  });
  
  // Fetch user's community posts
  const { data: userPosts = [], isLoading: postsLoading } = trpc.community.getPosts.useQuery({
    type: 'all',
    limit: 20,
    offset: 0
  });
  
  // Filter posts by this user
  const currentUserPosts = userPosts.filter(post => post.user_id === id);
  
  // Follow/unfollow mutation
  const followMutation = trpc.users.toggleFollowUser.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      console.error('Error toggling follow:', error);
    }
  });
  
  const isFollowing = userProfileData?.user?.isFollowing || false;

  // Fetch completed dramas from database
  const { data: completedDramas = [], isLoading: completedLoading } = trpc.users.getUserCompletedDramas.useQuery({
    userId: id || '',
    limit: 10,
    offset: 0
  }, {
    enabled: !!id
  });
  
  const userProfile = userProfileData?.user;
  const userLists = userProfileData?.lists || [];
  
  if (profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }
  
  if (!userProfile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Usuário não encontrado</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }



  const handleFollowToggle = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      await followMutation.mutateAsync({ userId: id });
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setIsLoading(false);
    }
  };



  const handleFollowersPress = () => {
    router.push(`/followers?userId=${id}`);
  };

  const handleFollowingPress = () => {
    router.push(`/following?userId=${id}`);
  };
  
  const handlePostPress = (postId: string) => {
    router.push(`/community/post/${postId}`);
  };
  
  const handleDramaPress = (dramaId: number) => {
    router.push(`/drama/${dramaId}`);
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
  
  const renderPostItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.postCard}
      onPress={() => handlePostPress(item.id)}
    >
      <View style={styles.postHeader}>
        <Text style={styles.postType}>
          {item.post_type === 'ranking' ? '📊 Ranking' : '💬 Discussão'}
        </Text>
        <Text style={styles.postDate}>
          {new Date(item.created_at).toLocaleDateString('pt-BR')}
        </Text>
      </View>
      
      <Text style={styles.postContent} numberOfLines={3}>
        {item.content}
      </Text>
      
      {item.drama_name && (
        <View style={styles.mentionedDrama}>
          <Text style={styles.mentionedDramaText}>📺 {item.drama_name}</Text>
          {item.drama_year && (
            <Text style={styles.mentionedDramaYear}>({item.drama_year})</Text>
          )}
        </View>
      )}
      
      <View style={styles.postStats}>
        <View style={styles.postStat}>
          <Heart size={16} color={COLORS.textSecondary} />
          <Text style={styles.postStatText}>{item.likes_count}</Text>
        </View>
        <View style={styles.postStat}>
          <MessageCircle size={16} color={COLORS.textSecondary} />
          <Text style={styles.postStatText}>{item.comments_count}</Text>
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



  return (
    <>
      <Stack.Screen
        options={{
          title: userProfile.display_name || 'Perfil',
          headerStyle: {
            backgroundColor: COLORS.background,
          },
          headerTitleStyle: {
            fontSize: 28,
            fontWeight: "700",
            color: COLORS.text,
          },
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <View style={styles.profileImageContainer}>
              <Image
                source={{ uri: userProfile.profile_image || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face' }}
                style={styles.profileImage}
                contentFit="cover"
              />
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.displayName}>{userProfile.display_name}</Text>
              <Text style={styles.username}>@{userProfile.username}</Text>
              
              <View style={styles.socialStats}>
                <TouchableOpacity style={styles.socialStat} onPress={handleFollowersPress}>
                  <Text style={styles.socialStatNumber}>{userProfile.followers_count || 0}</Text>
                  <Text style={styles.socialStatLabel}>seguidores</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialStat} onPress={handleFollowingPress}>
                  <Text style={styles.socialStatNumber}>{userProfile.following_count || 0}</Text>
                  <Text style={styles.socialStatLabel}>seguindo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          <Text style={styles.bio}>{userProfile.bio || 'Apaixonado por K-dramas!'}</Text>
          
          <TouchableOpacity 
            style={[styles.followButton, isFollowing && styles.followingButton]} 
            onPress={handleFollowToggle}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={isFollowing ? COLORS.text : COLORS.background} />
            ) : (
              <>
                {isFollowing ? (
                  <UserMinus size={16} color={COLORS.text} />
                ) : (
                  <UserPlus size={16} color={COLORS.background} />
                )}
                <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                  {isFollowing ? 'Seguindo' : 'Seguir'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, styles.watchingIcon]}>
              <Eye size={18} color={COLORS.background} />
            </View>
            <Text style={styles.statCount}>{userLists.filter(item => item.list_type === 'watching').length}</Text>
            <Text style={styles.statLabel}>Assistindo</Text>
          </View>
          
          <View style={styles.statItem}>
            <View style={[styles.statIcon, styles.watchlistIcon]}>
              <BookOpen size={18} color={COLORS.background} />
            </View>
            <Text style={styles.statCount}>{userLists.filter(item => item.list_type === 'watchlist').length}</Text>
            <Text style={styles.statLabel}>Quero Ver</Text>
          </View>
          
          <View style={styles.statItem}>
            <View style={[styles.statIcon, styles.completedIcon]}>
              <Check size={18} color={COLORS.background} />
            </View>
            <Text style={styles.statCount}>{userLists.filter(item => item.list_type === 'completed').length}</Text>
            <Text style={styles.statLabel}>Concluídos</Text>
          </View>
        </View>

        {/* Componente de estatísticas detalhadas */}
        {userProfile?.id && (
          <UserStatsDisplay userId={userProfile.id} isOwnProfile={false} />
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
                  {userProfile.display_name} ainda não fez nenhuma postagem na comunidade.
                </Text>
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
                  {userProfile?.display_name} ainda não concluiu nenhum dorama.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
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
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.accent,
    marginRight: 16,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
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
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  followingButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
  followingButtonText: {
    color: COLORS.text,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  watchingIcon: {
    backgroundColor: COLORS.accent,
  },
  watchlistIcon: {
    backgroundColor: '#4CD964',
  },
  completedIcon: {
    backgroundColor: '#5856D6',
  },
  statCount: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
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
  rankingHeader: {
    marginBottom: 16,
  },
  rankingTitleContainer: {
    marginBottom: 12,
  },
  rankingMainTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
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
  rankingActions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  likedText: {
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
  rankingTitle: {
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
  postsSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  postCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  postType: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
  postDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  postContent: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  mentionedDrama: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    gap: 4,
  },
  mentionedDramaText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  mentionedDramaYear: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  postStats: {
    flexDirection: 'row',
    gap: 16,
  },
  postStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postStatText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
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
  },
});

export default UserProfileScreen;