import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ThumbsUp, ThumbsDown, Star, Heart } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import ReviewModal from '@/components/ReviewModal';

interface Review {
  id: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    profileImage?: string;
    isPremium: boolean;
  };
  recommendationType: 'recommend' | 'not_recommend';
  reviewText?: string;
  rating?: number;
  likesCount: number;
  helpfulCount: number;
  createdAt: string;
}

export default function DramaReviewsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dramaId = parseInt(id || '0', 10);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const { user } = useAuth();

  // TODO: Replace with actual tRPC queries
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['drama-reviews', dramaId],
    queryFn: async () => {
      // Mock data for now
      return [];
    },
    enabled: !!dramaId,
  });

  const { data: canReview } = useQuery({
    queryKey: ['can-review-drama', dramaId, user?.id],
    queryFn: async () => {
      // TODO: Check if user completed the drama
      return true;
    },
    enabled: !!dramaId && !!user,
  });

  const handleReviewSubmitted = () => {
    // TODO: Refetch reviews
    console.log('Review submitted, refetching...');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  const renderReviewItem = ({ item }: { item: Review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.userInfo}>
          <Image
            source={{ 
              uri: item.user.profileImage || 'https://via.placeholder.com/40x40/333/fff?text=U' 
            }}
            style={styles.userAvatar}
          />
          <View style={styles.userDetails}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>{item.user.displayName}</Text>
              {item.user.isPremium && (
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumText}>+</Text>
                </View>
              )}
            </View>
            <Text style={styles.reviewDate}>
              {new Date(item.createdAt).toLocaleDateString('pt-BR')}
            </Text>
          </View>
        </View>
        
        <View style={styles.recommendationBadge}>
          {item.recommendationType === 'recommend' ? (
            <ThumbsUp size={20} color={COLORS.accent} fill={COLORS.accent} />
          ) : (
            <ThumbsDown size={20} color={COLORS.error} fill={COLORS.error} />
          )}
        </View>
      </View>

      {item.rating && (
        <View style={styles.ratingRow}>
          <Star size={16} color={COLORS.accent} fill={COLORS.accent} />
          <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
        </View>
      )}

      {item.reviewText && (
        <Text style={styles.reviewText}>
          {item.reviewText}
        </Text>
      )}

      <View style={styles.reviewActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Heart size={16} color={COLORS.textSecondary} />
          <Text style={styles.actionText}>{item.likesCount}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.helpfulText}>
            Útil ({item.helpfulCount})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Avaliações',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: '700' },
          headerRight: () => (
            canReview ? (
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => setShowReviewModal(true)}
              >
                <Text style={styles.headerButtonText}>Avaliar</Text>
              </TouchableOpacity>
            ) : null
          ),
        }} 
      />
      
      {reviews && reviews.length > 0 ? (
        <FlatList
          data={reviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Ainda não há avaliações para este drama
          </Text>
          {canReview && (
            <TouchableOpacity 
              style={styles.firstReviewButton}
              onPress={() => setShowReviewModal(true)}
            >
              <Text style={styles.firstReviewButtonText}>
                Seja o primeiro a avaliar!
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ReviewModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        dramaId={dramaId}
        dramaName="Drama Name" // TODO: Get from drama details
        onReviewSubmitted={handleReviewSubmitted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  headerButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 16,
  },
  headerButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  reviewCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reviewHeader: {
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
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  premiumBadge: {
    backgroundColor: COLORS.accent,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  premiumText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
  },
  reviewDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  recommendationBadge: {
    padding: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 6,
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.text,
    marginBottom: 16,
  },
  reviewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  helpfulText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  firstReviewButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  firstReviewButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
});