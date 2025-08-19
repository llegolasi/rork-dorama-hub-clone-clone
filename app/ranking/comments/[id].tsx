import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Heart, MessageCircle } from 'lucide-react-native';
import { Image } from 'expo-image';
import { COLORS } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/useAuth';
import NewsCommentSection from '@/components/NewsCommentSection';


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
        <ScrollView
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 84 }]}
        >
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
          <NewsCommentSection rankingId={id!} type="ranking" />
        </ScrollView>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Ranking não encontrado</Text>
        </View>
      )}
      

    </KeyboardAvoidingView>
  );
}

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