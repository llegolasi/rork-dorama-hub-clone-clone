import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  ActionSheetIOS,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Heart, MessageCircle, MoreVertical } from 'lucide-react-native';
import { Image } from 'expo-image';
import { COLORS } from '@/constants/colors';

import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/useAuth';
import InstagramStyleComments from '@/components/InstagramStyleComments';
import { UserDisplayName } from '@/components/UserTypeComponents';
import { UserType } from '@/types/user';


export default function RankingCommentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

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

  const deleteRankingMutation = trpc.rankings.deleteRanking.useMutation({
    onSuccess: () => {
      router.back();
    },
    onError: (error: any) => {
      console.error('Error deleting ranking:', error);
      Alert.alert('Erro', 'Não foi possível deletar o ranking. Tente novamente.');
    }
  });


  
  const ranking = rankingData?.ranking;
  const comments = rankingData?.comments || [];



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

  const handleDeleteRanking = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancelar', 'Deletar ranking'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            deleteRankingMutation.mutate({ rankingId: id! });
          }
        }
      );
    } else {
      Alert.alert(
        'Deletar ranking',
        'Tem certeza que deseja deletar este ranking?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Deletar',
            style: 'destructive',
            onPress: () => deleteRankingMutation.mutate({ rankingId: id! })
          }
        ]
      );
    }
  };





  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Comentários',
          headerStyle: { 
            backgroundColor: COLORS.background
          },
          headerTintColor: COLORS.text,
          headerTitleStyle: {
            marginTop: 20
          },
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
        <InstagramStyleComments 
          rankingId={id!} 
          type="ranking" 
          renderContent={() => (
            <View style={styles.contentHeader}>
              {/* Ranking Section */}
              <View style={styles.rankingSection}>
                <View style={styles.rankingHeader}>
                  <Image
                    source={{ uri: ranking.users?.profile_image || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face' }}
                    style={styles.userAvatar}
                    contentFit="cover"
                  />
                  <View style={styles.rankingHeaderInfo}>
                    <Text style={styles.rankingTitle}>{ranking.title}</Text>
                    <View style={styles.authorRow}>
                      <Text style={styles.rankingAuthorPrefix}>por </Text>
                      <UserDisplayName
                        displayName={ranking.users?.display_name || ranking.users?.username || 'Usuário'}
                        username={ranking.users?.username}
                        userType={ranking.users?.user_type as UserType || 'normal'}
                        size="small"
                        showUsername={false}
                      />
                    </View>
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
                  {ranking.user_id === user?.id && (
                    <TouchableOpacity 
                      style={styles.menuButton}
                      onPress={handleDeleteRanking}
                      testID={`ranking-menu-${ranking.id}`}
                    >
                      <MoreVertical size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  )}
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
            </View>
          )}
        />
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Ranking não encontrado</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentHeader: {
    padding: 16,
    paddingBottom: 20,
  },
  commentsSection: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  commentItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentContentWrap: {
    flex: 1,
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
  commentActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  replyTextAction: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  repliesContainer: {
    marginTop: 8,
    paddingLeft: 44,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.border,
    gap: 8,
  },
  replyItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
  },
  commentInputContainer: {
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  replyingToText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 14,
    marginRight: 12,
  },
  cancelReplyBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  cancelReplyText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
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
  menuButton: {
    padding: 8,
    marginLeft: 8,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
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
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rankingAuthorPrefix: {
    fontSize: 14,
    color: COLORS.textSecondary,
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
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
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