import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Heart, MessageCircle } from 'lucide-react-native';

import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/useAuth';
import InstagramStyleComments from '@/components/InstagramStyleComments';

const PostDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Fetch post details
  const { data: postData, isLoading, refetch } = trpc.community.getPostDetails.useQuery(
    { postId: id! },
    { enabled: !!id }
  );

  // Mutations
  const toggleLikeMutation = trpc.community.togglePostLike.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error: any) => {
      console.error('Error toggling like:', error);
    }
  });



  const post = postData?.post;


  const rankingItems = React.useMemo(() => {
    const items = Array.isArray(post?.user_rankings?.ranking_items) ? [...post!.user_rankings.ranking_items] : [];
    items.sort((a: any, b: any) => (a?.rank_position ?? 0) - (b?.rank_position ?? 0));
    return items;
  }, [post]);

  const handleLike = async () => {
    if (!user || !id) return;
    
    try {
      await toggleLikeMutation.mutateAsync({
        postId: id,
        reactionType: 'like'
      });
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };



  const handleUserPress = (userId: string) => {
    router.push(`/user/${userId}`);
  };

  const handleDramaPress = (dramaId: number) => {
    router.push(`/drama/${dramaId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Agora há pouco';
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    if (diffInHours < 48) return 'Ontem';
    return `${Math.floor(diffInHours / 24)}d atrás`;
  };

  const keyboardOffset = useMemo(() => insets.bottom, [insets.bottom]);



  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={keyboardOffset}
    >
      <Stack.Screen
        options={{
          title: 'Publicação',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
        }}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      ) : post ? (
        <InstagramStyleComments 
          postId={id!} 
          type="post" 
          renderContent={() => (
            <View style={styles.contentHeader}>
              {/* Post Content */}
              <View style={styles.postContainer}>
                <View style={styles.postHeader}>
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
                  <Text style={styles.postTime}>{formatDate(post.created_at)}</Text>
                </View>

                <Text style={styles.postContent}>{post.content}</Text>

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
                  <TouchableOpacity style={styles.statItem} onPress={handleLike}>
                    <Heart
                      size={20}
                      color={post.is_liked ? COLORS.accent : COLORS.textSecondary}
                      fill={post.is_liked ? COLORS.accent : 'transparent'}
                    />
                    <Text style={styles.statText}>{post.likes_count || 0}</Text>
                  </TouchableOpacity>
                  <View style={styles.statItem}>
                    <MessageCircle size={20} color={COLORS.textSecondary} />
                    <Text style={styles.statText}>{post.comments_count || 0}</Text>
                  </View>
                </View>
              </View>

              {/* Ranking preview inside post */}
              {post?.post_type === 'ranking' && Array.isArray(rankingItems) && rankingItems.length > 0 && (
                <View style={styles.rankingSection}>
                  <Text style={styles.rankingTitleInPost}>{post.user_rankings?.title}</Text>
                  {!!post.user_rankings?.description && (
                    <Text style={styles.rankingDescriptionInPost}>{post.user_rankings.description}</Text>
                  )}
                  <View style={styles.rankingList}>
                    {rankingItems.map((item: any) => (
                      <TouchableOpacity
                        key={`${item.drama_id}-${item.rank_position}`}
                        style={styles.rankingItem}
                        onPress={() => handleDramaPress(item.drama_id)}
                      >
                        <View style={styles.rankBadge}>
                          <Text style={styles.rankText}>{item.rank_position}</Text>
                        </View>
                        <Image
                          source={{ uri: item.poster_image || item.cover_image || 'https://via.placeholder.com/200x300/333/fff?text=Drama' }}
                          style={styles.rankingPoster}
                        />
                        <View style={styles.rankingInfo}>
                          <Text style={styles.rankingDramaTitle} numberOfLines={2}>{item.drama_title ?? `Drama #${item.rank_position}`}</Text>
                          <Text style={styles.rankingDramaMeta}>
                            {String(item.drama_year ?? item.release_year ?? 'N/A')}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        />
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Publicação não encontrada</Text>
        </View>
      )}


    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentHeader: {
    padding: 16,
    paddingBottom: 20,
  },
  postContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  postTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  postContent: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  mentionedDrama: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
    gap: 12,
  },
  mentionedPoster: {
    width: 50,
    height: 75,
    borderRadius: 8,
  },
  mentionedInfo: {
    flex: 1,
  },
  mentionedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  mentionedYear: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  engagementStats: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  // Ranking styles inside post
  rankingSection: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  rankingTitleInPost: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  rankingDescriptionInPost: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  rankingList: {
    gap: 8,
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
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 8,
    borderRadius: 8,
    gap: 8,
  },
  rankingPoster: {
    width: 40,
    height: 60,
    borderRadius: 6,
  },
  rankingInfo: {
    flex: 1,
  },
  rankingDramaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  rankingDramaMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});

export default PostDetailScreen;