import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
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
  FlatList,
  Keyboard,
} from 'react-native';

import { Heart, MessageCircle, MoreVertical, X, Send, Flag } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/useAuth';
import { UserDisplayName } from '@/components/UserTypeComponents';
import { UserType } from '@/types/user';
import ReportCommentModal from '@/components/ReportCommentModal';



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
  user_type?: string | null;
  replies_count: number;
  user_liked?: boolean;
  parent_comment_id?: string | null;
  replies?: Comment[];
}

interface NewsCommentSectionProps {
  articleId: string;
  type?: 'news';
  renderContent?: () => React.ReactNode;
}

interface PostCommentSectionProps {
  postId: string;
  type: 'post';
  renderContent?: () => React.ReactNode;
}

interface RankingCommentSectionProps {
  rankingId: string;
  type: 'ranking';
  renderContent?: () => React.ReactNode;
}

type CommentSectionProps = NewsCommentSectionProps | PostCommentSectionProps | RankingCommentSectionProps;

export default function InstagramStyleComments(props: CommentSectionProps) {
  const { type = 'news', renderContent } = props;
  const insets = useSafeAreaInsets();
  const [newComment, setNewComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMoreComments, setHasMoreComments] = useState<boolean>(true);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [reportModalVisible, setReportModalVisible] = useState<boolean>(false);
  const [commentToReport, setCommentToReport] = useState<Comment | null>(null);
  const { user } = useAuth();

  const inputRef = useRef<TextInput | null>(null);
  const flatListRef = useRef<FlatList | null>(null);

  // Get the ID based on type
  const id = type === 'news' ? (props as NewsCommentSectionProps).articleId 
    : type === 'post' ? (props as PostCommentSectionProps).postId 
    : (props as RankingCommentSectionProps).rankingId;

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShow = (event: any) => {
      if (Platform.OS === 'android') {
        // On Android, set keyboard height to position input above keyboard
        setKeyboardHeight(event.endCoordinates.height);
      } else {
        // iOS behavior remains the same
        setKeyboardHeight(event.endCoordinates.height);
      }
    };

    const keyboardWillHide = () => {
      setKeyboardHeight(0);
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showListener = Keyboard.addListener(showEvent, keyboardWillShow);
    const hideListener = Keyboard.addListener(hideEvent, keyboardWillHide);

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

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

  // Update local comments when query data changes
  useEffect(() => {
    const queryComments = type === 'news' 
      ? (commentsQuery.data as Comment[] | undefined) || []
      : (commentsQuery.data as { comments: Comment[] } | undefined)?.comments || [];
      
    if (queryComments.length > 0) {
      setComments(queryComments);
      setHasMoreComments(queryComments.length >= 10); // Assuming 10 is the page size
    }
  }, [commentsQuery.data, type]);

  // Mutations based on type
  const addCommentMutation = type === 'news'
    ? trpc.news.addComment.useMutation({
        onSuccess: () => {
          console.log('[InstagramComments] addComment success');
          setNewComment('');
          setIsSubmitting(false);
          setReplyTo(null);
          commentsQuery.refetch();
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
          console.log('[InstagramComments] addComment success');
          setNewComment('');
          setIsSubmitting(false);
          setReplyTo(null);
          commentsQuery.refetch();
        },
        onError: (error) => {
          setIsSubmitting(false);
          Alert.alert('Erro', 'Não foi possível adicionar o comentário. Tente novamente.');
          console.error('Error adding comment:', error);
        }
      })
    : trpc.rankings.addRankingComment.useMutation({
        onSuccess: () => {
          console.log('[InstagramComments] addComment success');
          setNewComment('');
          setIsSubmitting(false);
          setReplyTo(null);
          commentsQuery.refetch();
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
    console.log('[InstagramComments] reply to', comment.id);
    setReplyTo(comment);
    setTimeout(() => {
      inputRef.current?.focus();
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
    const isOwnComment = comment.user_id === user?.id;
    
    if (Platform.OS === 'ios') {
      const options = isOwnComment 
        ? ['Cancelar', 'Deletar comentário', 'Denunciar']
        : ['Cancelar', 'Denunciar'];
      const destructiveButtonIndex = isOwnComment ? 1 : -1;
      const cancelButtonIndex = 0;
      
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex,
          cancelButtonIndex,
        },
        (buttonIndex) => {
          if (isOwnComment) {
            if (buttonIndex === 1) {
              handleDeleteComment(comment.id);
            } else if (buttonIndex === 2) {
              handleReportComment(comment);
            }
          } else {
            if (buttonIndex === 1) {
              handleReportComment(comment);
            }
          }
        }
      );
    } else {
      if (isOwnComment) {
        Alert.alert(
          'Opções do comentário',
          'O que você gostaria de fazer?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Deletar',
              style: 'destructive',
              onPress: () => handleDeleteComment(comment.id)
            },
            {
              text: 'Denunciar',
              onPress: () => handleReportComment(comment)
            }
          ]
        );
      } else {
        Alert.alert(
          'Denunciar comentário',
          'Você gostaria de denunciar este comentário?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Denunciar',
              onPress: () => handleReportComment(comment)
            }
          ]
        );
      }
    }
  };
  
  const handleReportComment = (comment: Comment) => {
    setCommentToReport(comment);
    setReportModalVisible(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'agora';
    } else if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays === 1) {
        return '1d';
      } else if (diffInDays < 7) {
        return `${diffInDays}d`;
      } else {
        return date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit'
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
            color={userLikedQuery?.data ? COLORS.accent : COLORS.text}
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
          <Text style={styles.commentsTitle}>
            Comentários
          </Text>
        </View>
      </View>
    );
  };

  const loadMoreComments = useCallback(async () => {
    if (loadingMore || !hasMoreComments) return;
    
    setLoadingMore(true);
    try {
      // This would be implemented with actual pagination in the backend
      // For now, we'll just simulate it
      setTimeout(() => {
        setLoadingMore(false);
        setHasMoreComments(false); // No more comments to load
      }, 1000);
    } catch (error) {
      console.error('Error loading more comments:', error);
      setLoadingMore(false);
    }
  }, [loadingMore, hasMoreComments]);

  const toggleRepliesExpansion = (commentId: string) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const renderEmptyComments = () => (
    <View style={styles.emptyContainer}>
      <MessageCircle size={48} color={COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>Nenhum comentário ainda</Text>
      <Text style={styles.emptyMessage}>
        Seja o primeiro a comentar!
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
      user_type: type === 'news' ? item.user_type : item.users?.user_type,
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
            <View style={styles.commentContent}>
              <View style={styles.commentMeta}>
                <UserDisplayName
                  displayName={comment.full_name || comment.username || 'Usuário'}
                  username={comment.username}
                  userType={comment.user_type as UserType || 'normal'}
                  size="small"
                  showUsername={false}
                />
                <Text style={styles.commentTime}>{formatDate(comment.created_at)}</Text>
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
                  <Text style={[
                    styles.commentActionText,
                    comment.user_liked ? styles.commentActionTextLiked : null,
                  ]}>
                    {comment.like_count > 0 ? `${comment.like_count} curtidas` : 'Curtir'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.commentActionButton} 
                  onPress={() => handleReply(comment)} 
                  testID={`reply-${comment.id}`}
                >
                  <Text style={styles.commentActionText}>Responder</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.commentMenuButton}
            onPress={() => handleCommentMenu(comment)}
            testID={`comment-menu-${comment.id}`}
          >
            <MoreVertical size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {Array.isArray(comment.replies) && comment.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {/* Show first reply or all if expanded */}
            {(expandedReplies.has(comment.id) ? comment.replies : comment.replies.slice(0, 1)).map((replyItem: any) => {
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
                user_type: type === 'news' ? replyItem.user_type : replyItem.users?.user_type,
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
                          <Text style={styles.commentAvatarTextSmall}>
                            {(reply.full_name || reply.username || 'U')?.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.commentContent}>
                        <View style={styles.commentMeta}>
                          <UserDisplayName
                            displayName={reply.full_name || reply.username || 'Usuário'}
                            username={reply.username}
                            userType={reply.user_type as UserType || 'normal'}
                            size="small"
                            showUsername={false}
                          />
                          <Text style={styles.commentTime}>{formatDate(reply.created_at)}</Text>
                        </View>
                        <Text style={styles.commentText}>{reply.content}</Text>
                        <View style={styles.commentActions}>
                          <TouchableOpacity
                            style={styles.commentActionButton}
                            onPress={() => handleToggleCommentLike(reply.id)}
                            testID={`like-${reply.id}`}
                          >
                            <Text style={[
                              styles.commentActionText,
                              reply.user_liked ? styles.commentActionTextLiked : null,
                            ]}>
                              {reply.like_count > 0 ? `${reply.like_count} curtidas` : 'Curtir'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.commentActionButton} 
                            onPress={() => handleReply(comment)} 
                            testID={`reply-to-${comment.id}`}
                          >
                            <Text style={styles.commentActionText}>Responder</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={styles.commentMenuButton}
                      onPress={() => handleCommentMenu({ ...reply, replies_count: 0, parent_comment_id: null, replies: [] })}
                      testID={`comment-menu-${reply.id}`}
                    >
                      <MoreVertical size={16} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
            
            {/* Show "Ver mais respostas" button if there are more than 1 reply */}
            {comment.replies.length > 1 && !expandedReplies.has(comment.id) && (
              <TouchableOpacity 
                style={styles.viewMoreRepliesButton}
                onPress={() => toggleRepliesExpansion(comment.id)}
                testID={`view-more-replies-${comment.id}`}
              >
                <Text style={styles.viewMoreRepliesText}>
                  Ver mais {comment.replies.length - 1} respostas
                </Text>
              </TouchableOpacity>
            )}
            
            {/* Show "Ver menos" button if expanded */}
            {comment.replies.length > 1 && expandedReplies.has(comment.id) && (
              <TouchableOpacity 
                style={styles.viewMoreRepliesButton}
                onPress={() => toggleRepliesExpansion(comment.id)}
                testID={`view-less-replies-${comment.id}`}
              >
                <Text style={styles.viewMoreRepliesText}>Ver menos</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };



  const scrollContentInset = useMemo(() => {
    // Calculate proper padding to prevent content from going behind input
    const baseInputHeight = 60;
    const replyBannerHeight = replyTo ? 40 : 0;
    const safeAreaBottom = insets.bottom || 0;
    const totalInputHeight = baseInputHeight + replyBannerHeight + safeAreaBottom;
    
    return {
      paddingBottom: totalInputHeight + 40 // Extra padding to ensure content doesn't hide
    };
  }, [replyTo, insets.bottom]);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={renderComment}
        contentContainerStyle={scrollContentInset}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onEndReached={loadMoreComments}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={() => (
          <View>
            {renderContent && renderContent()}
            {renderHeader()}
          </View>
        )}
        ListEmptyComponent={() => {
          if (commentsQuery.isLoading) {
            return (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.accent} />
                <Text style={styles.loadingText}>Carregando comentários...</Text>
              </View>
            );
          }
          if (commentsQuery.error) {
            return (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Erro ao carregar comentários</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => commentsQuery.refetch()}
                >
                  <Text style={styles.retryText}>Tentar novamente</Text>
                </TouchableOpacity>
              </View>
            );
          }
          return renderEmptyComments();
        }}
        ListFooterComponent={() => {
          if (loadingMore) {
            return (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.accent} />
                <Text style={styles.loadingText}>Carregando mais comentários...</Text>
              </View>
            );
          }
          return null;
        }}
      />
      
      {/* Fixed Input Container */}
      <View 
        style={[
          styles.fixedInputContainer,
          {
            bottom: Platform.OS === 'android' ? (keyboardHeight > 0 ? keyboardHeight : insets.bottom) : (keyboardHeight > 0 ? keyboardHeight : insets.bottom),
            paddingBottom: Platform.OS === 'android' ? (insets.bottom > 0 ? insets.bottom : 8) : 8,
            // Ensure input container has proper background and shadow
            backgroundColor: COLORS.background,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 8,
          }
        ]}
      >
        {replyTo && (
          <View style={styles.replyBanner} testID="reply-banner">
            <Text style={styles.replyText} numberOfLines={1}>
              Respondendo a {replyTo.full_name || replyTo.username || 'Usuário'}
            </Text>
            <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.replyCancel} testID="cancel-reply">
              <X size={14} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.inputRow}>
          {user?.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.userAvatar} />
          ) : (
            <View style={styles.userAvatarPlaceholder}>
              <Text style={styles.userAvatarText}>
                {(user?.displayName || user?.username || 'U')?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={replyTo ? `Responder a ${replyTo.full_name || replyTo.username || 'usuário'}...` : 'Adicione um comentário...'}
            placeholderTextColor={COLORS.textSecondary}
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={1000}
            testID="comment-input"
            returnKeyType="send"
            onSubmitEditing={handleSubmitComment}
          />
          
          {newComment.trim().length > 0 && (
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmitComment}
              disabled={isSubmitting}
              activeOpacity={0.7}
              testID="submit-comment"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={COLORS.text} />
              ) : (
                <Send size={18} color={COLORS.accent} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Report Modal */}
      {commentToReport && (
        <ReportCommentModal
          visible={reportModalVisible}
          onClose={() => {
            setReportModalVisible(false);
            setCommentToReport(null);
          }}
          commentId={commentToReport.id}
          commentContent={commentToReport.content}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flex: 1,
  },
  viewMoreRepliesButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  viewMoreRepliesText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  engagementSection: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 8,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  likeText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 8,
    fontWeight: '600',
  },
  likeTextActive: {
    color: COLORS.accent,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  
  // Comment Item Styles
  commentItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  commentUserInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  commentAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  commentContent: {
    flex: 1,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 8,
  },
  commentTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  commentText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 18,
    marginBottom: 8,
  },
  editedLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentActionButton: {
    marginRight: 16,
    paddingVertical: 2,
  },
  commentActionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  commentActionTextLiked: {
    color: COLORS.accent,
  },
  commentMenuButton: {
    padding: 4,
    marginLeft: 8,
  },
  
  // Reply Styles
  repliesContainer: {
    marginTop: 8,
    marginLeft: 44,
  },
  replyItem: {
    paddingVertical: 8,
  },
  commentAvatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  commentAvatarPlaceholderSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  commentAvatarTextSmall: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text,
  },
  
  // Fixed Input Container
  fixedInputContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  replyBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  replyText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 12,
    marginRight: 12,
  },
  replyCancel: {
    padding: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  userAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: COLORS.text,
    fontSize: 14,
    maxHeight: 100,
    minHeight: 36,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  submitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Loading and Error States
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
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
});