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
  type?: 'news';
  disableKeyboardAvoidingView?: boolean;
}

interface PostCommentSectionProps {
  postId: string;
  type: 'post';
  disableKeyboardAvoidingView?: boolean;
}

interface RankingCommentSectionProps {
  rankingId: string;
  type: 'ranking';
  disableKeyboardAvoidingView?: boolean;
}

type CommentSectionProps = NewsCommentSectionProps | PostCommentSectionProps | RankingCommentSectionProps;

export default function NewsCommentSection(props: CommentSectionProps) {
  const { type = 'news', disableKeyboardAvoidingView = false } = props;
  const insets = useSafeAreaInsets();
  const [newComment, setNewComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [isKeyboardVisible] = useState<boolean>(false);
  const { user } = useAuth();

  const inputRef = useRef<TextInput | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const inputContainerRef = useRef<View | null>(null);

  const bottomPadding = useMemo(() => (insets.bottom > 0 ? insets.bottom : 12), [insets.bottom]);
  const keyboardBehavior = Platform.OS === 'ios' ? 'padding' : 'height';
  const keyboardOffset = Platform.OS === 'ios' ? insets.top + 56 : 0;



  // Get the ID based on type
  const id = type === 'news' ? (props as NewsCommentSectionProps).articleId 
    : type === 'post' ? (props as PostCommentSectionProps).postId 
    : (props as RankingCommentSectionProps).rankingId;

  // Queries based on type
  const commentsQuery = type === 'news' 
    ? trpc.news.getComments.useQuery({ articleId: id })
    : type === 'post'
    ? trpc.community.getPostDetails.useQuery({ postId: id })
    : trpc.rankings.getRankingDetails.useQuery({ rankingId: id });

  const likesQuery = type === 'news' 
    ? trpc.news.getArticleLikes.useQuery({ articleId: id })
    : null;

  const userLikedQuery = type === 'news' 
    ? trpc.news.getUserLikedArticle.useQuery({ articleId: id })
    : null;

  // Extract comments from the query result
  const comments = type === 'news' 
    ? (commentsQuery.data as Comment[] | undefined) || []
    : (commentsQuery.data as { comments: Comment[] } | undefined)?.comments || [];

  // Mutations based on type
  const addCommentMutation = type === 'news'
    ? trpc.news.addComment.useMutation({
        onSuccess: () => {
          console.log('[CommentSection] addComment success');
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
      })
    : type === 'post'
    ? trpc.community.addPostComment.useMutation({
        onSuccess: () => {
          console.log('[CommentSection] addComment success');
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
      })
    : trpc.rankings.addRankingComment.useMutation({
        onSuccess: () => {
          console.log('[CommentSection] addComment success');
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

  const toggleLikeMutation = type === 'news'
    ? trpc.news.toggleArticleLike.useMutation({
        onSuccess: () => {
          likesQuery?.refetch();
          userLikedQuery?.refetch();
        },
        onError: (error) => {
          Alert.alert('Erro', 'Não foi possível curtir a notícia. Tente novamente.');
          console.error('Error toggling like:', error);
        }
      })
    : null;

  const toggleCommentLikeMutation = type === 'news'
    ? trpc.news.toggleCommentLike.useMutation({
        onSuccess: () => {
          commentsQuery.refetch();
        },
        onError: (error) => {
          Alert.alert('Erro', 'Não foi possível curtir o comentário. Tente novamente.');
          console.error('Error toggling comment like:', error);
        }
      })
    : type === 'post'
    ? trpc.community.togglePostCommentLike.useMutation({
        onSuccess: () => {
          commentsQuery.refetch();
        },
        onError: (error) => {
          Alert.alert('Erro', 'Não foi possível curtir o comentário. Tente novamente.');
          console.error('Error toggling comment like:', error);
        }
      })
    : trpc.rankings.toggleRankingCommentLike.useMutation({
        onSuccess: () => {
          commentsQuery.refetch();
        },
        onError: (error) => {
          Alert.alert('Erro', 'Não foi possível curtir o comentário. Tente novamente.');
          console.error('Error toggling comment like:', error);
        }
      });

  const deleteCommentMutation = type === 'news'
    ? trpc.news.deleteComment.useMutation({
        onSuccess: () => {
          commentsQuery.refetch();
        },
        onError: (error) => {
          Alert.alert('Erro', 'Não foi possível deletar o comentário. Tente novamente.');
          console.error('Error deleting comment:', error);
        }
      })
    : type === 'post'
    ? trpc.community.deletePostComment.useMutation({
        onSuccess: () => {
          commentsQuery.refetch();
        },
        onError: (error) => {
          Alert.alert('Erro', 'Não foi possível deletar o comentário. Tente novamente.');
          console.error('Error deleting comment:', error);
        }
      })
    : trpc.rankings.deleteRankingComment.useMutation({
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
    if (type === 'news') {
      (addCommentMutation as any).mutate({
        articleId: id,
        content: newComment.trim(),
        parentCommentId: replyTo?.id,
      });
    } else if (type === 'post') {
      (addCommentMutation as any).mutate({
        postId: id,
        content: newComment.trim(),
        parentCommentId: replyTo?.id,
      });
    } else {
      (addCommentMutation as any).mutate({
        rankingId: id,
        content: newComment.trim(),
        parentCommentId: replyTo?.id,
      });
    }
  };

  const handleReply = (comment: Comment) => {
    console.log('[NewsCommentSection] reply to', comment.id);
    setReplyTo(comment);
    setTimeout(() => {
      inputRef.current?.focus();
      // Scroll to bottom to ensure input is visible
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, Platform.OS === 'ios' ? 300 : 500);
    }, 100);
  };

  const handleToggleArticleLike = () => {
    if (type === 'news' && toggleLikeMutation && !toggleLikeMutation.isPending) {
      toggleLikeMutation.mutate({ articleId: id });
    }
  };

  const handleToggleCommentLike = (commentId: string) => {
    if (toggleCommentLikeMutation && !toggleCommentLikeMutation.isPending) {
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
            (deleteCommentMutation as any).mutate({ commentId });
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

  const renderHeader = () => {
    if (type !== 'news') return null;
    
    return (
      <View style={styles.engagementSection}>
        <TouchableOpacity
          style={styles.likeButton}
          onPress={handleToggleArticleLike}
          disabled={toggleLikeMutation?.isPending}
          testID="article-like"
        >
          <Heart 
            size={24} 
            color={userLikedQuery?.data ? COLORS.accent : COLORS.textSecondary}
            fill={userLikedQuery?.data ? COLORS.accent : 'transparent'}
          />
          <Text style={[
            styles.likeText,
            userLikedQuery?.data ? styles.likeTextActive : null,
          ]}>
            {likesQuery?.data?.count ?? 0} curtidas
          </Text>
        </TouchableOpacity>
        
        <View style={styles.commentsHeader}>
          <MessageCircle size={20} color={COLORS.text} />
          <Text style={styles.commentsTitle}>
            {comments.length} comentários
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyComments = () => (
    <View style={styles.emptyContainer}>
      <MessageCircle size={48} color={COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>Nenhum comentário ainda</Text>
      <Text style={styles.emptyMessage}>
        Seja o primeiro a comentar sobre esta notícia!
      </Text>
    </View>
  );

  const renderComment = ({ item }: { item: any }) => {
    // Normalize comment data based on type
    const comment = {
      id: item.id,
      content: item.content,
      created_at: item.created_at,
      updated_at: item.updated_at,
      like_count: item.like_count || 0,
      is_edited: item.is_edited || false,
      user_id: item.user_id,
      username: type === 'news' ? item.username : item.users?.username,
      full_name: type === 'news' ? item.full_name : item.users?.display_name,
      avatar_url: type === 'news' ? item.avatar_url : item.users?.profile_image,
      replies_count: item.replies_count || 0,
      user_liked: item.user_liked || false,
      parent_comment_id: item.parent_comment_id,
      replies: item.replies || []
    };

    return (
      <View style={styles.commentItem} testID={`comment-${comment.id}`}>
        <View style={styles.commentHeader}>
          <View style={styles.commentUserInfo}>
            {comment.avatar_url ? (
              <Image source={{ uri: comment.avatar_url }} style={styles.commentAvatar} />
            ) : (
              <View style={styles.commentAvatarPlaceholder}>
                <Text style={styles.commentAvatarText}>
                  {(comment.full_name || comment.username || 'U')?.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.commentMeta}>
              <Text style={styles.commentUsername}>
                {comment.full_name || comment.username || 'Usuário'}
              </Text>
              <Text style={styles.commentTime}>{formatDate(comment.created_at)}</Text>
            </View>
          </View>
          {comment.user_id === user?.id && (
            <TouchableOpacity 
              style={styles.commentMenuButton}
              onPress={() => handleCommentMenu(comment)}
              testID={`comment-menu-${comment.id}`}
            >
              <MoreVertical size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.commentText}>{comment.content}</Text>
        {comment.is_edited && (
          <Text style={styles.editedLabel}>editado</Text>
        )}

        <View style={styles.commentActions}>
          <TouchableOpacity
            style={styles.commentActionButton}
            onPress={() => handleToggleCommentLike(comment.id)}
            testID={`like-${comment.id}`}
          >
            <Heart 
              size={16} 
              color={comment.user_liked ? COLORS.accent : COLORS.textSecondary}
              fill={comment.user_liked ? COLORS.accent : 'transparent'}
            />
            <Text style={[
              styles.commentActionText,
              comment.user_liked ? styles.commentActionTextLiked : null,
            ]}>
              {comment.like_count > 0 ? comment.like_count : ''}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.commentActionButton} onPress={() => handleReply(comment)} testID={`reply-${comment.id}`}>
            <MessageCircle size={16} color={COLORS.textSecondary} />
            <Text style={styles.commentActionText}>Responder</Text>
          </TouchableOpacity>
        </View>

        {Array.isArray(comment.replies) && comment.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {comment.replies.map((replyItem: any) => {
              const reply = {
                id: replyItem.id,
                content: replyItem.content,
                created_at: replyItem.created_at,
                updated_at: replyItem.updated_at,
                like_count: replyItem.like_count || 0,
                is_edited: replyItem.is_edited || false,
                user_id: replyItem.user_id,
                username: type === 'news' ? replyItem.username : replyItem.users?.username,
                full_name: type === 'news' ? replyItem.full_name : replyItem.users?.display_name,
                avatar_url: type === 'news' ? replyItem.avatar_url : replyItem.users?.profile_image,
                user_liked: replyItem.user_liked || false,
              };

              return (
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
                        onPress={() => handleCommentMenu({ ...reply, replies_count: 0, parent_comment_id: null, replies: [] })}
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
                    <TouchableOpacity style={styles.commentActionButton} onPress={() => handleReply(comment)} testID={`reply-to-${comment.id}`}>
                      <MessageCircle size={16} color={COLORS.textSecondary} />
                      <Text style={styles.commentActionText}>Responder</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };



  const renderContent = () => (
    <>
      <ScrollView 
        ref={scrollRef}
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.contentContainer, 
          { paddingBottom: bottomPadding + 120 }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        nestedScrollEnabled
        automaticallyAdjustKeyboardInsets
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
        ) : comments && comments.length > 0 ? (
          comments.map((item: any) => (
            <View key={item.id}>
              {renderComment({ item })}
            </View>
          ))
        ) : (
          renderEmptyComments()
        )}
      </ScrollView>
      
      <KeyboardAvoidingView 
        behavior={keyboardBehavior}
        keyboardVerticalOffset={keyboardOffset}
        style={styles.inputAvoider}
      >
      <View 
        ref={inputContainerRef}
        style={[
          styles.inputContainer,
          { paddingBottom: bottomPadding }
        ]}
      > 
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
            onFocus={() => {
              // Ensure input is visible when focused
              setTimeout(() => {
                scrollRef.current?.scrollToEnd({ animated: true });
              }, Platform.OS === 'ios' ? 300 : 500);
            }}
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
    </>
  );

  if (disableKeyboardAvoidingView) {
    return (
      <View style={styles.container}>
        {renderContent()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  inputAvoider: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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