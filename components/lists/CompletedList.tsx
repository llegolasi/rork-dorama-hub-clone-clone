import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { COLORS } from "@/constants/colors";
import { UserList } from "@/types/user";
import { Drama } from "@/types/drama";
import { getDramaDetails } from "@/services/api";
import { useUserLists } from "@/hooks/useUserStore";
import { EmptyState } from "./EmptyState";
import { Star, Edit3, Trash2 } from "lucide-react-native";
import ReviewModal from "@/components/ReviewModal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface CompletedListProps {
  dramas: UserList[];
}

export function CompletedList({ dramas }: CompletedListProps) {
  const { removeFromList } = useUserLists();
  const { user } = useAuth();
  const [reviewModalVisible, setReviewModalVisible] = useState<boolean>(false);
  const [selectedDrama, setSelectedDrama] = useState<Drama | null>(null);
  const [existingReview, setExistingReview] = useState<any>(null);

  const { data: dramaDetails, isLoading, refetch } = useQuery({
    queryKey: ["completed-dramas", dramas.map(d => d.dramaId)],
    queryFn: async () => {
      const details = await Promise.all(
        dramas.map(async (userListItem) => {
          try {
            const drama = await getDramaDetails(userListItem.dramaId);
            
            // Fetch existing review
            let review = null;
            if (user) {
              const { data: reviewData } = await supabase
                .from('drama_reviews' as any)
                .select('*')
                .eq('user_id', user.id)
                .eq('drama_id', drama.id)
                .single();
              review = reviewData;
            }
            
            return { drama, userListItem, review };
          } catch (error) {
            console.error(`Error fetching drama ${userListItem.dramaId}:`, error);
            return null;
          }
        })
      );
      return details.filter(Boolean) as { 
        drama: Drama; 
        userListItem: UserList; 
        review?: any 
      }[];
    },
    enabled: dramas.length > 0 && !!user,
  });

  const handleRemove = async (dramaId: number) => {
    // Remove review if exists
    if (user) {
      await supabase
        .from('drama_reviews' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('drama_id', dramaId);
    }
    removeFromList(dramaId, "completed");
  };

  const handleEditReview = async (drama: Drama) => {
    if (!user) return;
    
    // Fetch existing review
    const { data: reviewData } = await supabase
      .from('drama_reviews' as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('drama_id', drama.id)
      .single();
    
    setSelectedDrama(drama);
    setExistingReview(reviewData);
    setReviewModalVisible(true);
  };

  const handleReviewSubmitted = () => {
    setReviewModalVisible(false);
    setSelectedDrama(null);
    setExistingReview(null);
    refetch();
  };

  if (dramas.length === 0) {
    return (
      <EmptyState
        title="Nenhum drama concluído"
        subtitle="Complete alguns dramas para vê-los aqui e poder avaliá-los"
        actionText="Explorar Dramas"
        icon="film"
        onAction={() => {
          // Navigate to home
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Carregando dramas concluídos...</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { 
    item: { 
      drama: Drama; 
      userListItem: UserList; 
      review?: any 
    } 
  }) => {
    const imageUrl = item.drama.poster_path
      ? `https://image.tmdb.org/t/p/w300${item.drama.poster_path}`
      : null;

    const year = item.drama.first_air_date
      ? new Date(item.drama.first_air_date).getFullYear()
      : "N/A";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/drama/${item.drama.id}`)}
        testID={`drama-card-${item.drama.id}`}
      >
        <View style={styles.cardContent}>
          {/* Drama Poster */}
          <View style={styles.imageContainer}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.placeholderImage]}>
                <Text style={styles.placeholderText}>No Image</Text>
              </View>
            )}
          </View>

          {/* Drama Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.title} numberOfLines={2}>
              {item.drama.name}
            </Text>
            
            <Text style={styles.subtitle} numberOfLines={1}>
              {year} • {item.drama.origin_country.join(", ")}
            </Text>

            {item.drama.overview && (
              <Text style={styles.overview} numberOfLines={2}>
                {item.drama.overview}
              </Text>
            )}

            {/* Review Section */}
            {item.review ? (
              <View style={styles.reviewContainer}>
                <View style={styles.reviewHeader}>
                  <View style={styles.ratingDisplay}>
                    <Star size={14} color={COLORS.accent} fill={COLORS.accent} />
                    <Text style={styles.ratingText}>
                      {item.review.rating ? `${item.review.rating}/10` : 'Sem nota'}
                    </Text>
                    <Text style={styles.recommendText}>
                      • {item.review.recommendation_type === 'recommend' ? 'Recomendo' : 'Não recomendo'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditReview(item.drama)}
                    testID={`edit-review-${item.drama.id}`}
                  >
                    <Edit3 size={14} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
                {item.review.review_text && (
                  <Text style={styles.reviewText} numberOfLines={2}>
                    {item.review.review_text}
                  </Text>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addReviewButton}
                onPress={() => handleEditReview(item.drama)}
                testID={`add-review-${item.drama.id}`}
              >
                <Star size={16} color={COLORS.accent} />
                <Text style={styles.addReviewText}>Adicionar Avaliação</Text>
              </TouchableOpacity>
            )}

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemove(item.drama.id)}
                testID={`remove-${item.drama.id}`}
              >
                <Trash2 size={14} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={dramaDetails || []}
        renderItem={renderItem}
        keyExtractor={(item) => item.drama.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        testID="completed-list"
      />
      
      {selectedDrama && (
        <ReviewModal
          visible={reviewModalVisible}
          onClose={() => {
            setReviewModalVisible(false);
            setSelectedDrama(null);
            setExistingReview(null);
          }}
          dramaId={selectedDrama.id}
          dramaName={selectedDrama.name}
          onReviewSubmitted={handleReviewSubmitted}
          existingReview={existingReview}
        />
      )}
    </View>
  );
}

const IMAGE_WIDTH = 80;
const IMAGE_HEIGHT = 120;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
    textAlign: "center",
  },
  listContent: {
    paddingVertical: 8,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    padding: 16,
  },
  imageContainer: {
    marginRight: 16,
  },
  image: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    borderRadius: 8,
  },
  placeholderImage: {
    backgroundColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: "center",
  },
  infoContainer: {
    flex: 1,
    justifyContent: "flex-start",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  overview: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  reviewContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingDisplay: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.text,
    marginLeft: 4,
    fontWeight: "500",
  },
  recommendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  editButton: {
    padding: 4,
  },
  reviewText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  addReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  addReviewText: {
    fontSize: 12,
    color: COLORS.accent,
    marginLeft: 6,
    fontWeight: "500",
  },
  actionContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: "auto",
  },
  removeButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  ratingContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  rateButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 8,
    marginTop: -8,
    alignSelf: "flex-start",
  },
  rateButtonText: {
    fontSize: 14,
    color: COLORS.accent,
    marginLeft: 8,
    fontWeight: "500",
  },
});