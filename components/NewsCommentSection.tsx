import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
  Image,
  ActionSheetIOS,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';

import { Heart, MessageCircle, Send, MoreVertical, X } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/useAuth';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  like_count: number;
  is_edited: boolean;
  user_id: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  replies_count: number;
  user_liked?: boolean;
  parent_comment_id?: string | null;
  replies?: Comment[];
}

interface NewsCommentSectionProps {
  articleId: string;
}

export default function NewsCommentSection({ articleId }: NewsCommentSectionProps) {
  const insets = useSafeAreaInsets();
  const [newComment, setNewComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const { user } = useAuth();

  const inputRef = useRef<TextInput | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  const bottomPadding = useMemo(() => (insets.bottom > 0 ? insets.bottom : 12), [insets.bottom]);
  const keyboardOffset = useMemo(() => insets.bottom, [insets.bottom]);

  // Queries
  const commentsQuery = trpc.news.getComments.useQuery({ articleId });
  const likesQuery = trpc.news.getArticleLikes.useQuery({ articleId });
  const userLikedQuery = trpc.news.getUserLikedArticle.useQuery({ articleId });

  // Mutations
  const addCommentMutation = trpc.news.addComment.useMutation({
    onSuccess: () => {
      console.log('[NewsCommentSection] addComment success');
      setNewComment('');
      setIsSubmitting(false);
      setReplyTo(null);
      commentsQuery.refetch();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    },
    onError: (error) => {
      setIsSubmitting(false);
      Alert.alert('Erro', 'Não foi possível adicionar o comentário. Tente novamente.');
      console.error('Error adding comment:', error);
    }
  });

  const toggleLikeMutation = trpc.news.toggleArticleLike.useMutation({
    onSuccess: () => {
      likesQuery.refetch();
      userLikedQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('Erro', 'Não foi possível curtir a notícia. Tente novamente.');
      console.error('Error toggling like:', error);
    }
  });

  const toggleCommentLikeMutation = trpc.news.toggleCommentLike.useMutation({
    onSuccess: () => {
      commentsQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('Erro', 'Não foi possível curtir o comentário. Tente novamente.');
      console.error('Error toggling comment like:', error);
    }
  });

  const deleteCommentMutation = trpc.news.deleteComment.useMutation({
    onSuccess: () => {
      commentsQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('Erro', 'Não foi possível deletar o comentário. Tente novamente.');
      console.error('Error deleting comment:', error);
    }
  });

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    if (!user?.id) {
      Alert.alert('Ops', 'Você precisa estar logado para comentar.');
      return;
    }

    setIsSubmitting(true);
    addCommentMutation.mutate({
      articleId,
      content: newComment.trim(),
      parentCommentId: replyTo?.id,
    });
  };

  const handleReply = (comment: Comment) => {
    console.log('[NewsCommentSection] reply to', comment.id);
    setReplyTo(comment);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleToggleArticleLike = () => {
    if (!toggleLikeMutation.isPending) {
      toggleLikeMutation.mutate({ articleId });
    }
  };

  const handleToggleCommentLike = (commentId: string) => {
    if (!toggleCommentLikeMutation.isPending) {
      toggleCommentLikeMutation.mutate({ commentId });
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancelar', 'Deletar comentário'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            deleteCommentMutation.mutate({ commentId });
          }
        }
      );
    } else {
      Alert.alert(
        'Deletar comentário',
        'Tem certeza que deseja deletar este comentário?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Deletar',
            style: 'destructive',
            onPress: () => deleteCommentMutation.mutate({ commentId })
          }
        ]
      );
    }
  };

  const handleCommentMenu = (comment: Comment) => {
    if (comment.user_id === user?.id) {
      handleDeleteComment(comment.id);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Agora mesmo';
    } else if (diffInHours < 24) {
      return `${diffInHours}h atrás`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays === 1) {
        return 'Ontem';
      } else if (diffInDays < 7) {
        return `${diffInDays} dias atrás`;
      } else {
        return date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
    }
  };

  const renderHeader = () => (
    <View style={styles.engagementSection}>
      <TouchableOpacity
        style={styles.likeButton}
        onPress={handleToggleArticleLike}
        disabled={toggleLikeMutation.isPending}
        testID="article-like"
      >
        <Heart 
          size={24} 
          color={userLikedQuery.data ? COLORS.accent : COLORS.textSecondary}
          fill={userLikedQuery.data ? COLORS.accent : 'transparent'}
        />
        <Text style={[
          styles.likeText,
          userLikedQuery.data ? styles.likeTextActive : null,
        ]}>
          {likesQuery.data?.count ?? 0} curtidas
        </Text>
      </TouchableOpacity>
      
      <View style={styles.commentsHeader}>
        <MessageCircle size={20} color={COLORS.text} />
        <Text style={styles.commentsTitle}>
          {commentsQuery.data?.length ?? 0} comentários
        </Text>
      </View>
    </View>
  );

  const renderEmptyComments = () => (
    <View style={styles.emptyContainer}>
      <MessageCircle size={48} color={COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>Nenhum comentário ainda</Text>
      <Text style={styles.emptyMessage}>
        Seja o primeiro a comentar sobre esta notícia!
      </Text>
    </View>
  );

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentItem} testID={`comment-${item.id}`}>
      <View style={styles.commentHeader}>
        <View style={styles.commentUserInfo}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.commentAvatar} />
          ) : (
            <View style={styles.commentAvatarPlaceholder}>
              <Text style={styles.commentAvatarText}>
                {(item.full_name || item.username || 'U')?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.commentMeta}>
            <Text style={styles.commentUsername}>
              {item.full_name || item.username || 'Usuário'}
            </Text>
            <Text style={styles.commentTime}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
        {item.user_id === user?.id && (
          <TouchableOpacity 
            style={styles.commentMenuButton}
            onPress={() => handleCommentMenu(item)}
            testID={`comment-menu-${item.id}`}
          >
            <MoreVertical size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.commentText}>{item.content}</Text>
      {item.is_edited && (
        <Text style={styles.editedLabel}>editado</Text>
      )}

      <View style={styles.commentActions}>
        <TouchableOpacity
          style={styles.commentActionButton}
          onPress={() => handleToggleCommentLike(item.id)}
          testID={`like-${item.id}`}
        >
          <Heart 
            size={16} 
            color={item.user_liked ? COLORS.accent : COLORS.textSecondary}
            fill={item.user_liked ? COLORS.accent : 'transparent'}
          />
          <Text style={[
            styles.commentActionText,
            item.user_liked ? styles.commentActionTextLiked : null,
          ]}>
            {item.like_count > 0 ? item.like_count : ''}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.commentActionButton} onPress={() => handleReply(item)} testID={`reply-${item.id}`}>
          <MessageCircle size={16} color={COLORS.textSecondary} />
          <Text style={styles.commentActionText}>Responder</Text>
        </TouchableOpacity>
      </View>

      {Array.isArray(item.replies) && item.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {item.replies.map((reply) => (
            <View key={reply.id} style={styles.replyItem} testID={`reply-${reply.id}`}>
              <View style={styles.commentHeader}>
                <View style={styles.commentUserInfo}>
                  {reply.avatar_url ? (
                    <Image source={{ uri: reply.avatar_url }} style={styles.commentAvatarSmall} />
                  ) : (
                    <View style={styles.commentAvatarPlaceholderSmall}>
                      <Text style={styles.commentAvatarText}>
                        {(reply.full_name || reply.username || 'U')?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.commentMeta}>
                    <Text style={styles.commentUsername}>
                      {reply.full_name || reply.username || 'Usuário'}
                    </Text>
                    <Text style={styles.commentTime}>{formatDate(reply.created_at)}</Text>
                  </View>
                </View>
                {reply.user_id === user?.id && (
                  <TouchableOpacity 
                    style={styles.commentMenuButton}
                    onPress={() => handleCommentMenu(reply)}
                    testID={`comment-menu-${reply.id}`}
                  >
                    <MoreVertical size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.commentText}>{reply.content}</Text>
              <View style={styles.commentActions}>
                <TouchableOpacity
                  style={styles.commentActionButton}
                  onPress={() => handleToggleCommentLike(reply.id)}
                  testID={`like-${reply.id}`}
                >
                  <Heart 
                    size={16} 
                    color={reply.user_liked ? COLORS.accent : COLORS.textSecondary}
                    fill={reply.user_liked ? COLORS.accent : 'transparent'}
                  />
                  <Text style={[
                    styles.commentActionText,
                    reply.user_liked ? styles.commentActionTextLiked : null,
                  ]}>
                    {reply.like_count > 0 ? reply.like_count : ''}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.commentActionButton} onPress={() => handleReply(item)} testID={`reply-to-${item.id}`}>
                  <MessageCircle size={16} color={COLORS.textSecondary} />
                  <Text style={styles.commentActionText}>Responder</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );



  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={keyboardOffset}
    >
      <ScrollView 
        ref={scrollRef}
        style={styles.scrollContainer}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: bottomPadding + 84 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {renderHeader()}
        
        {commentsQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Carregando comentários...</Text>
          </View>
        ) : commentsQuery.error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Erro ao carregar comentários</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => commentsQuery.refetch()}
            >
              <Text style={styles.retryText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : commentsQuery.data && commentsQuery.data.length > 0 ? (
          commentsQuery.data.map((item) => (
            <View key={item.id}>
              {renderComment({ item })}
            </View>
          ))
        ) : (
          renderEmptyComments()
        )}
      </ScrollView>
      
      <View style={[styles.inputContainer, { paddingBottom: bottomPadding + (Platform.OS === 'android' ? 24 : 0) }]}> 
        {replyTo && (
          <View style={styles.replyBanner} testID="reply-banner">
            <Text style={styles.replyText} numberOfLines={1}>Respondendo a {replyTo.full_name || replyTo.username || 'Usuário'}</Text>
            <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.replyCancel} testID="cancel-reply">
              <X size={14} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            textAlignVertical="top"
            placeholder={replyTo ? `Respondendo a ${replyTo.full_name || replyTo.username || 'usuário'}...` : 'Adicione um comentário...'}
            placeholderTextColor={COLORS.textSecondary}
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={1000}
            testID="comment-input"
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={() => handleSubmitComment()}
          />
          
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!newComment.trim() || isSubmitting) ? styles.submitButtonDisabled : null,
            ]}
            onPress={handleSubmitComment}
            disabled={!newComment.trim() || isSubmitting}
            activeOpacity={0.7}
            testID="submit-comment"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={COLORS.text} />
            ) : (
              <Send size={18} color={COLORS.text} />
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
    marginTop: 32,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  engagementSection: {
    paddingVertical: 20,
    paddingHorizontal: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 20,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  likeText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginLeft: 8,
    fontWeight: '500',
  },
  likeTextActive: {
    color: COLORS.accent,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 8,
  },
  inputContainer: {
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 16,
    maxHeight: 100,
  },
  submitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },

  commentItem: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  commentUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  commentAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  commentMeta: {
    flex: 1,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  commentTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  commentMenuButton: {
    padding: 4,
  },
  commentText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  editedLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    paddingVertical: 4,
  },
  commentActionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
  },
  commentActionTextLiked: {
    color: COLORS.accent,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  repliesContainer: {
    marginTop: 8,
    paddingLeft: 44,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.border,
  },
  replyItem: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  commentAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
  },
  commentAvatarPlaceholderSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  replyBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.card,
  },
  replyText: {
    flex: 1,
    color: COLORS.textSecondary,
    marginRight: 12,
  },
  replyCancel: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: COLORS.card,
  },
});