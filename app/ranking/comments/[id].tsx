import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Send, Heart, MessageCircle } from 'lucide-react-native';
import { Image } from 'expo-image';
import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RankingComment } from '@/types/user';
import type { RankingWithDetails } from '@/types/user';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/useAuth';

interface CommentItemProps {
  comment: RankingComment;
  onReply: (commentId: string, userName?: string) => void;
  onLike: (commentId: string) => void;
}

function CommentItem({ comment, onReply, onLike }: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(false);

  return (
    <View style={styles.commentContainer}>
      <View style={styles.commentHeader}>
        <Image
          source={{
            uri: comment.user.profileImage || 'https://via.placeholder.com/40x40/333/fff?text=U'
          }}
          style={styles.userAvatar}
        />
        <View style={styles.commentInfo}>
          <Text style={styles.username}>{comment.user.displayName}</Text>
          <Text style={styles.commentTime}>
            {new Date(comment.createdAt).toLocaleDateString('pt-BR')}
          </Text>
        </View>
      </View>
      
      <Text style={styles.commentText}>{comment.content}</Text>
      
      <View style={styles.commentActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onLike(comment.id)}
        >
          <Heart size={16} color={COLORS.textSecondary} />
          <Text style={styles.actionText}>Curtir</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onReply(comment.id, comment.user.displayName)}
        >
          <MessageCircle size={16} color={COLORS.textSecondary} />
          <Text style={styles.actionText}>Responder</Text>
        </TouchableOpacity>
      </View>
      
      {comment.replies && comment.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          <TouchableOpacity 
            onPress={() => setShowReplies(!showReplies)}
            style={styles.showRepliesButton}
          >
            <Text style={styles.showRepliesText}>
              {showReplies ? 'Ocultar' : 'Ver'} {comment.replies.length} resposta(s)
            </Text>
          </TouchableOpacity>
          
          {showReplies && (
            <View style={styles.repliesList}>
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  onLike={onLike}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function RankingCommentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Fetch ranking details
  const { data: rankingData, isLoading, refetch } = trpc.rankings.getRankingDetails.useQuery(
    { rankingId: id! },
    { enabled: !!id }
  );

  // Mutations
  const toggleLikeMutation = trpc.rankings.toggleRankingLike.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      console.error('Error toggling like:', error);
    }
  });

  const addCommentMutation = trpc.rankings.addRankingComment.useMutation({
    onSuccess: () => {
      setNewComment('');
      setReplyingTo(null);
      refetch();
    },
    onError: (error) => {
      console.error('Error adding comment:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o comentário.');
    }
  });
  
  const ranking = rankingData?.ranking;
  const comments = rankingData?.comments || [];
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; userName?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendComment = async () => {
    if (!newComment.trim()) return;

    if (!user || !id) {
      Alert.alert('Erro', 'Você precisa estar logado para comentar.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await addCommentMutation.mutateAsync({
        rankingId: id,
        content: newComment.trim(),
        parentCommentId: replyingTo?.id || undefined
      });
      setNewComment('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = (commentId: string, userName?: string) => {
    setReplyingTo({ id: commentId, userName });
  };

  const handleLike = async (commentId: string) => {
    if (!user || !id) return;
    
    try {
      await toggleLikeMutation.mutateAsync({
        rankingId: id
      });
    } catch (error) {
      console.error('Error liking ranking:', error);
    }
  };

  const keyboardOffset = useMemo(() => insets.bottom, [insets.bottom]);
  const bottomPadding = useMemo(() => (insets.bottom > 0 ? insets.bottom : 12), [insets.bottom]);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={keyboardOffset}
    >
      <Stack.Screen
        options={{
          title: 'Comentários',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft color={COLORS.text} size={24} />
            </TouchableOpacity>
          ),
        }}
      />
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      ) : ranking ? (
        <ScrollView style={styles.commentsContainer} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
          {/* Ranking Section */}
          <View style={styles.rankingSection}>
            <View style={styles.rankingHeader}>
              <Image
                source={{ uri: ranking.users?.profile_image || 'https://via.placeholder.com/40x40/333/fff?text=U' }}
                style={styles.userAvatar}
                contentFit="cover"
              />
              <View style={styles.rankingHeaderInfo}>
                <Text style={styles.rankingTitle}>{ranking.title}</Text>
                <Text style={styles.rankingAuthor}>por @{ranking.users?.username}</Text>
                <View style={styles.rankingStats}>
                  <TouchableOpacity 
                    style={styles.statItem}
                    onPress={() => handleLike('')}
                  >
                    <Heart 
                      size={16} 
                      color={ranking.is_liked ? COLORS.accent : COLORS.textSecondary}
                      fill={ranking.is_liked ? COLORS.accent : 'transparent'}
                    />
                    <Text style={styles.statText}>{ranking.likes_count || 0}</Text>
                  </TouchableOpacity>
                  <View style={styles.statItem}>
                    <MessageCircle size={16} color={COLORS.textSecondary} />
                    <Text style={styles.statText}>{comments.length}</Text>
                  </View>
                </View>
              </View>
            </View>
            
            <View style={styles.rankingList}>
              {ranking.ranking_items?.map((item: any, index: number) => (
                <TouchableOpacity
                  key={item.drama_id}
                  style={styles.rankingItem}
                  onPress={() => router.push(`/drama/${item.drama_id}`)}
                >
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>{item.rank_position}</Text>
                  </View>
                  <Image
                    source={{
                      uri: item.poster_image || item.cover_image || 'https://via.placeholder.com/200x300/333/fff?text=Drama',
                    }}
                    style={styles.rankingPoster}
                    contentFit="cover"
                  />
                  <View style={styles.rankingInfo}>
                    <Text style={styles.rankingDramaTitle} numberOfLines={2}>
                      {item.drama_title ?? `Drama #${item.rank_position}`}
                    </Text>
                    {!!item.drama_year && (
                      <Text style={styles.rankingYear}>{item.drama_year}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Comments Section */}
          <View style={styles.commentsHeader}>
            <Text style={styles.commentsTitle}>Comentários ({comments.length})</Text>
          </View>
          
          {comments.map((comment: any) => (
            <View key={comment.id} style={styles.commentContainer}>
              <View style={styles.commentHeader}>
                <Image
                  source={{
                    uri: comment.users?.profile_image || 'https://via.placeholder.com/40x40/333/fff?text=U'
                  }}
                  style={styles.userAvatar}
                />
                <View style={styles.commentInfo}>
                  <Text style={styles.username}>{comment.users?.display_name}</Text>
                  <Text style={styles.commentTime}>
                    {new Date(comment.created_at).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.commentText}>{comment.content}</Text>
              
              <View style={styles.commentActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleLike(comment.id)}
                >
                  <Heart size={16} color={COLORS.textSecondary} />
                  <Text style={styles.actionText}>Curtir</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleReply(comment.id, comment.users?.display_name)}
                >
                  <MessageCircle size={16} color={COLORS.textSecondary} />
                  <Text style={styles.actionText}>Responder</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Ranking não encontrado</Text>
        </View>
      )}
      
      <View style={[styles.inputContainer, { paddingBottom: bottomPadding + (Platform.OS === 'android' ? 8 : 0) }]}>
        {replyingTo && (
          <View style={styles.replyIndicator}>
            <Text style={styles.replyText} numberOfLines={1}>Respondendo a {replyingTo.userName ?? 'usuário'}</Text>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Text style={styles.cancelReply}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={[styles.inputRow]}>
          <TextInput
            style={styles.textInput}
            placeholder="Escreva um comentário..."
            placeholderTextColor={COLORS.textSecondary}
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <TouchableOpacity 
            style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
            onPress={handleSendComment}
            disabled={!newComment.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={COLORS.accent} />
            ) : (
              <Send size={20} color={newComment.trim() ? COLORS.accent : COLORS.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  commentsContainer: {
    flex: 1,
    padding: 16,
  },
  commentContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  commentInfo: {
    flex: 1,
  },
  username: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  commentTime: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  commentText: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 12,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  repliesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  showRepliesButton: {
    marginBottom: 8,
  },
  showRepliesText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '500',
  },
  repliesList: {
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.border,
  },
  inputContainer: {
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  replyIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.card,
  },
  replyText: {
    color: COLORS.text,
    fontSize: 14,
  },
  cancelReply: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    gap: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.card,
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
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  // Ranking Section Styles
  rankingSection: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  rankingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rankingHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  rankingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  rankingAuthor: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  rankingStats: {
    flexDirection: 'row',
    gap: 16,
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
  rankingList: {
    gap: 8,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 8,
    borderRadius: 8,
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
  rankingYear: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  commentsHeader: {
    marginBottom: 16,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
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