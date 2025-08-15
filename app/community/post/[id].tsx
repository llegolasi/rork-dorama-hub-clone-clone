import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Heart, MessageCircle, Send } from 'lucide-react-native';

import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/useAuth';

const PostDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const addCommentMutation = trpc.community.addPostComment.useMutation({
    onSuccess: () => {
      setNewComment('');
      refetch();
      Alert.alert('Sucesso', 'Comentário adicionado!');
    },
    onError: (error: any) => {
      console.error('Error adding comment:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o comentário.');
    }
  });

  const post = postData?.post;
  const comments = postData?.comments || [];

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

  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      Alert.alert('Erro', 'Por favor, escreva um comentário.');
      return;
    }

    if (!user || !id) {
      Alert.alert('Erro', 'Você precisa estar logado para comentar.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await addCommentMutation.mutateAsync({
        postId: id,
        content: newComment.trim()
      });
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
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
  const bottomPadding = useMemo(() => (insets.bottom > 0 ? insets.bottom : 12), [insets.bottom]);

  const renderComment = (comment: any) => (
    <View key={comment.id} style={styles.commentItem}>
      <View style={styles.commentHeader}>
        <TouchableOpacity onPress={() => handleUserPress(comment.user_id)}>
          <Image
            source={{
              uri: comment.users?.profile_image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face',
            }}
            style={styles.commentAvatar}
          />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.commentContent}
          onPress={() => handleUserPress(comment.user_id)}
        >
          <Text style={styles.commentUserName}>{comment.users?.display_name}</Text>
        </TouchableOpacity>
        <Text style={styles.commentTime}>{formatDate(comment.created_at)}</Text>
      </View>
      <Text style={styles.commentText}>{comment.content}</Text>
    </View>
  );

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
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 84 }]}
        >
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

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Comentários ({comments.length})</Text>
            
            {comments.map(renderComment)}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Publicação não encontrada</Text>
        </View>
      )}

      {/* Comment Input */}
      <View style={[styles.commentInputContainer, { paddingBottom: bottomPadding + (Platform.OS === 'android' ? 8 : 0) }]}>
        <TextInput
          style={styles.commentInput}
          placeholder="Escreva um comentário..."
          placeholderTextColor={COLORS.textSecondary}
          value={newComment}
          onChangeText={setNewComment}
          multiline
          maxLength={300}
          testID="comment-input"
          returnKeyType="send"
          blurOnSubmit={false}
          textAlignVertical="top"
        />
        <TouchableOpacity
          style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
          onPress={handleSubmitComment}
          disabled={!newComment.trim() || isSubmitting}
          testID="send-comment"
          accessibilityRole="button"
          accessibilityLabel="Enviar comentário"
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={COLORS.accent} />
          ) : (
            <Send 
              size={20} 
              color={newComment.trim() ? COLORS.accent : COLORS.textSecondary} 
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
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
  commentsSection: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  commentItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  commentTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  commentText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 16,
    gap: 12,
  },
  commentInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
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