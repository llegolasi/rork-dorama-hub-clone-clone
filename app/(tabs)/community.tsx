import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, MessageCircle, Trophy, Users, Plus } from 'lucide-react-native';
import { router } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/useAuth';

type TabType = 'rankings' | 'publications';

const CommunityScreen = () => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('rankings');
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  // Fetch community posts
  const { data: communityPosts, isLoading: postsLoading, refetch: refetchPosts } = trpc.community.getPosts.useQuery({
    type: activeTab === 'rankings' ? 'rankings' : 'discussions',
    limit: 20,
    offset: 0
  });

  // Mutations
  const togglePostLikeMutation = trpc.community.togglePostLike.useMutation({
    onSuccess: () => {
      refetchPosts();
    },
    onError: (error: any) => {
      console.error('Error toggling post like:', error);
    }
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchPosts();
    } catch (error) {
      console.error('Error refreshing posts:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRankingPress = (post: any) => {
    const rankingId = post?.user_rankings?.id || post?.ranking_id || post?.id;
    router.push(`/ranking/comments/${rankingId}`);
  };

  const handlePublicationPress = (post: any) => {
    router.push(`/community/post/${post.id}`);
  };

  const handleLikePost = async (postId: string) => {
    if (!user) return;
    
    try {
      await togglePostLikeMutation.mutateAsync({
        postId,
        reactionType: 'like'
      });
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleCreatePost = () => {
    router.push('/community/create');
  };

  const handleUserPress = (userId: string) => {
    router.push(`/user/${userId}`);
  };

  const handleDramaPress = (dramaId: number) => {
    router.push(`/drama/${dramaId}`);
  };

  const renderTabButton = (tab: TabType, title: string, icon: React.ReactNode) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
      testID={`tab-${tab}`}
    >
      <View style={styles.tabIcon} accessibilityElementsHidden>{icon}</View>
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderRankingCard = (post: any) => {
    if (!post.user_rankings) return null;

    const items = Array.isArray(post.user_rankings?.ranking_items) ? [...post.user_rankings.ranking_items] : [];
    items.sort((a: any, b: any) => (a?.rank_position ?? 0) - (b?.rank_position ?? 0));
    const topItems = items.slice(0, 3);

    return (
      <TouchableOpacity
        key={post.id}
        style={styles.rankingCard}
        onPress={() => handleRankingPress(post)}
        testID={`ranking-card-${post.id}`}
      >
        <View style={styles.rankingBanner}>
          {topItems.length > 0 ? (
            <View style={styles.bannerRow}>
              {topItems.map((it: any, idx: number) => (
                <View key={idx} style={styles.bannerCol}>
                  <Image
                    source={{ uri: it.cover_image || it.poster_image || 'https://via.placeholder.com/200x300/333/fff?text=Drama' }}
                    style={styles.bannerImage}
                  />
                </View>
              ))}
            </View>
          ) : (
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1527137342181-19aab11a8ee8?w=1200&auto=format&fit=crop&q=60' }}
              style={styles.bannerImage}
            />
          )}
          <View style={styles.bannerOverlay}>
            <View style={styles.topBadge}>
              <Text style={styles.topBadgeText}>Ranking</Text>
            </View>
          </View>
        </View>

        <View style={styles.rankingContent}>
          <View style={styles.rankingHeader}>
            <TouchableOpacity 
              style={styles.userInfo}
              onPress={() => handleUserPress(post.user_id)}
            >
              <Image
                source={{
                  uri: post.users?.profile_image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face',
                }}
                style={styles.userAvatar}
              />
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{post.users?.display_name}</Text>
                <Text style={styles.userHandle}>@{post.users?.username}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.rankingTitle}>{post.user_rankings?.title || 'Ranking'}</Text>
          {!!post.user_rankings?.description && (
            <Text style={styles.rankingDescription} numberOfLines={3}>
              {post.user_rankings.description}
            </Text>
          )}

          <View style={styles.engagementStats}>
            <View style={styles.statItem}>
              <Trophy size={16} color={COLORS.accent} />
              <Text style={styles.statText}>{items.length > 0 ? `${items.length} itens` : 'Novo'}</Text>
            </View>
          </View>

          <View style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Ver Ranking e Comentar</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPublicationCard = (post: any) => (
    <TouchableOpacity
      key={post.id}
      style={styles.publicationCard}
      onPress={() => handlePublicationPress(post)}
    >
      <View style={styles.publicationHeader}>
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => handleUserPress(post.user_id)}
        >
          <Image
            source={{
              uri: post.users?.profile_image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face',
            }}
            style={styles.userAvatar}
          />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{post.users?.display_name}</Text>
            <Text style={styles.userHandle}>@{post.users?.username}</Text>
          </View>
        </TouchableOpacity>
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
          />
          <View style={styles.mentionedInfo}>
            <Text style={styles.mentionedTitle}>{post.drama_name || 'Drama Mencionado'}</Text>
            <Text style={styles.mentionedYear}>{post.drama_year || 'N/A'}</Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.engagementStats}>
        <TouchableOpacity 
          style={styles.statItem}
          onPress={() => handleLikePost(post.id)}
        >
          <Heart
            size={16}
            color={post.is_liked ? COLORS.accent : COLORS.textSecondary}
            fill={post.is_liked ? COLORS.accent : 'transparent'}
          />
          <Text style={styles.statText}>{post.likes_count || 0}</Text>
        </TouchableOpacity>
        <View style={styles.statItem}>
          <MessageCircle size={16} color={COLORS.textSecondary} />
          <Text style={styles.statText}>{post.comments_count || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? insets.top + 16 : 16 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Comunidade</Text>
      </View>
      
      <View style={styles.tabContainer}>
        {renderTabButton(
          'rankings',
          'Rankings',
          <Trophy size={18} color={activeTab === 'rankings' ? COLORS.accent : COLORS.textSecondary} />
        )}
        {renderTabButton(
          'publications',
          'Publicações',
          <Users size={18} color={activeTab === 'publications' ? COLORS.accent : COLORS.textSecondary} />
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {postsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Carregando...</Text>
          </View>
        ) : (
          <>
            {activeTab === 'rankings' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Rankings da Comunidade</Text>
                <Text style={styles.sectionSubtitle}>
                  Descubra os melhores K-dramas através dos rankings dos usuários
                </Text>
                {communityPosts?.filter((post: any) => post.post_type === 'ranking').map((post: any) => renderRankingCard(post))}
                {(!communityPosts || communityPosts.filter((post: any) => post.post_type === 'ranking').length === 0) && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Nenhum ranking encontrado</Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'publications' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Discussões da Comunidade</Text>
                <Text style={styles.sectionSubtitle}>
                  Participe das conversas sobre seus doramas favoritos
                </Text>
                {communityPosts?.filter((post: any) => post.post_type === 'discussion').map((post: any) => renderPublicationCard(post))}
                {(!communityPosts || communityPosts.filter((post: any) => post.post_type === 'discussion').length === 0) && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Nenhuma discussão encontrada</Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
      
      {(activeTab === 'publications') ? (
        <TouchableOpacity style={styles.fab} onPress={handleCreatePost}>
          <Plus size={24} color={COLORS.background} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.fab} onPress={() => router.push({ pathname: '/ranking/create' } as any)} testID="fab-create-ranking">
          <Plus size={24} color={COLORS.background} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.text,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  tabIcon: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTabText: {
    color: COLORS.accent,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  rankingCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  rankingBanner: {
    height: 140,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
  actionButton: {
    backgroundColor: COLORS.accent + '20',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  actionButtonText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: COLORS.card,
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
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  rankingHeader: {
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
  rankingTitle: {
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
  dramaPreview: {
    gap: 12,
  },
  dramaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.background,
  },
  dramaPoster: {
    width: 50,
    height: 75,
    borderRadius: 8,
  },
  dramaInfo: {
    flex: 1,
  },
  dramaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  dramaYear: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  moreText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 12,
  },
  comingSoon: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  comingSoonText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  comingSoonSubtext: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default CommunityScreen;