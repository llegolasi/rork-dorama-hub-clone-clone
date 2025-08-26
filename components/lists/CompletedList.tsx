import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { COLORS } from "@/constants/colors";
import { UserList } from "@/types/user";
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
  const [selectedDrama, setSelectedDrama] = useState<UserList | null>(null);
  const [existingReview, setExistingReview] = useState<any>(null);

  const { data: dramaReviews, refetch } = useQuery({
    queryKey: ["completed-dramas-reviews", dramas.map(d => d.dramaId), user],
    queryFn: async () => {
      if (!user) return [];
      
      const reviews = await Promise.all(
        dramas.map(async (userListItem) => {
          try {
            // Fetch existing review
            const { data: reviewData } = await supabase
              .from('drama_reviews' as any)
              .select('*')
              .eq('user_id', user.id)
              .eq('drama_id', userListItem.dramaId)
              .single();
            
            return { userListItem, review: reviewData };
          } catch {
            return { userListItem, review: null };
          }
        })
      );
      return reviews;
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

  const handleEditReview = async (userListItem: UserList, existingReview?: any) => {
    if (!user) return;
    
    setSelectedDrama(userListItem);
    setExistingReview(existingReview);
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



  const renderItem = ({ item }: { 
    item: { 
      userListItem: UserList; 
      review?: any 
    } 
  }) => {
    const completedDate = new Date(item.userListItem.addedAt).toLocaleDateString('pt-BR');

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/drama/${item.userListItem.dramaId}`)}
        testID={`drama-card-${item.userListItem.dramaId}`}
      >
        <View style={styles.cardContent}>
          {/* Drama Poster */}
          {item.userListItem.poster_image && (
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: `https://image.tmdb.org/t/p/w300${item.userListItem.poster_image}` }} 
                style={styles.image} 
              />
            </View>
          )}

          {/* Drama Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.title} numberOfLines={2}>
              {item.userListItem.drama_name || `Drama ${item.userListItem.dramaId}`}
            </Text>
            
            <Text style={styles.subtitle} numberOfLines={1}>
              {item.userListItem.drama_year && `${item.userListItem.drama_year} • `}{item.userListItem.total_episodes || 16} episódios • {Math.round((item.userListItem.total_runtime_minutes || 0) / 60)}h
            </Text>

            <Text style={styles.completedDate} numberOfLines={1}>
              Concluído em: {completedDate}
            </Text>

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
                    onPress={() => handleEditReview(item.userListItem, item.review)}
                    testID={`edit-review-${item.userListItem.dramaId}`}
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
                onPress={() => handleEditReview(item.userListItem)}
                testID={`add-review-${item.userListItem.dramaId}`}
              >
                <Star size={16} color={COLORS.accent} />
                <Text style={styles.addReviewText}>Adicionar Avaliação</Text>
              </TouchableOpacity>
            )}

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemove(item.userListItem.dramaId)}
                testID={`remove-${item.userListItem.dramaId}`}
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
        data={dramaReviews || []}
        renderItem={renderItem}
        keyExtractor={(item) => item.userListItem.dramaId.toString()}
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
          dramaId={selectedDrama.dramaId}
          dramaName={selectedDrama.drama_name || `Drama ${selectedDrama.dramaId}`}
          onReviewSubmitted={handleReviewSubmitted}
          existingReview={existingReview}
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
    marginRight: 12,
  },
  image: {
    width: 60,
    height: 90,
    borderRadius: 8,
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
  completedDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
});