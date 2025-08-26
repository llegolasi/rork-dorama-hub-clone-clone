import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight, ThumbsUp, ThumbsDown, Star } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/colors';

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

interface ReviewsSectionProps {
  dramaId: number;
  reviews: Review[];
  totalReviews: number;
  recommendPercentage: number;
  onRatePress: () => void;
  canUserReview: boolean;
  hasUserReviewed: boolean;
}

export default function ReviewsSection({
  dramaId,
  reviews,
  totalReviews,
  recommendPercentage,
  onRatePress,
  canUserReview,
  hasUserReviewed,
}: ReviewsSectionProps) {
  const router = useRouter();

  const handleViewAllReviews = () => {
    router.push(`/drama/${dramaId}/reviews`);
  };

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
            <ThumbsUp size={16} color={COLORS.accent} fill={COLORS.accent} />
          ) : (
            <ThumbsDown size={16} color={COLORS.error} fill={COLORS.error} />
          )}
        </View>
      </View>

      {item.rating && (
        <View style={styles.ratingRow}>
          <Star size={14} color={COLORS.accent} fill={COLORS.accent} />
          <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
        </View>
      )}

      {item.reviewText && (
        <Text style={styles.reviewText} numberOfLines={3}>
          {item.reviewText}
        </Text>
      )}

      <View style={styles.reviewActions}>
        <Text style={styles.helpfulText}>
          {item.helpfulCount} acharam útil
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionTitle}>Avaliações</Text>
          <View style={styles.statsRow}>
            <Text style={styles.totalReviews}>{totalReviews} avaliações</Text>
            <View style={styles.statsDivider} />
            <Text style={styles.recommendPercentage}>
              {recommendPercentage}% recomendam
            </Text>
          </View>
        </View>
        
        {canUserReview && !hasUserReviewed && (
          <TouchableOpacity 
            style={styles.rateButton}
            onPress={onRatePress}
          >
            <Text style={styles.rateButtonText}>Avaliar</Text>
          </TouchableOpacity>
        )}
      </View>

      {reviews.length > 0 ? (
        <>
          <FlatList
            data={reviews.slice(0, 3)}
            renderItem={renderReviewItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
          
          {totalReviews > 3 && (
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={handleViewAllReviews}
            >
              <Text style={styles.viewAllText}>Ver todas as avaliações</Text>
              <ChevronRight size={16} color={COLORS.accent} />
            </TouchableOpacity>
          )}
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            Ainda não há avaliações para este drama
          </Text>
          {canUserReview && !hasUserReviewed && (
            <Text style={styles.emptySubtext}>
              Seja o primeiro a avaliar!
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalReviews: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statsDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textSecondary,
    marginHorizontal: 8,
  },
  recommendPercentage: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
  },
  rateButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rateButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  reviewCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  premiumBadge: {
    backgroundColor: COLORS.accent,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
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
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 4,
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text,
    marginBottom: 12,
  },
  reviewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helpfulText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  viewAllText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.accent,
    textAlign: 'center',
  },
});