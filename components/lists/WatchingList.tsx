import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { COLORS } from "@/constants/colors";
import { UserList } from "@/types/user";
import { Drama } from "@/types/drama";
import { getDramaDetails } from "@/services/api";
import { useUserLists } from "@/hooks/useUserStore";
import { ListCard } from "./ListCard";
import { EmptyState } from "./EmptyState";
import ReviewModal from "@/components/ReviewModal";

interface WatchingListProps {
  dramas: UserList[];
}

export function WatchingList({ dramas }: WatchingListProps) {
  const { updateProgress, removeFromList, addToList } = useUserLists();
  const [reviewModalVisible, setReviewModalVisible] = useState<boolean>(false);
  const [selectedDrama, setSelectedDrama] = useState<Drama | null>(null);

  const { data: dramaDetails, isLoading } = useQuery({
    queryKey: ["watching-dramas", dramas.map(d => d.dramaId)],
    queryFn: async () => {
      const details = await Promise.all(
        dramas.map(async (userListItem) => {
          try {
            const drama = await getDramaDetails(userListItem.dramaId);
            return { drama, userListItem };
          } catch (error) {
            console.error(`Error fetching drama ${userListItem.dramaId}:`, error);
            return null;
          }
        })
      );
      return details.filter(Boolean) as { drama: Drama; userListItem: UserList }[];
    },
    enabled: dramas.length > 0,
  });

  const handleProgressUpdate = (dramaId: number, newEpisode: number) => {
    updateProgress(dramaId, newEpisode);
  };

  const handleRemove = (dramaId: number) => {
    removeFromList(dramaId, "watching");
  };

  const handleComplete = (drama: Drama) => {
    setSelectedDrama(drama);
    setReviewModalVisible(true);
  };

  const handleReviewSubmitted = () => {
    if (selectedDrama) {
      removeFromList(selectedDrama.id, "watching");
      addToList(selectedDrama.id, "completed");
    }
    setReviewModalVisible(false);
    setSelectedDrama(null);
  };

  if (dramas.length === 0) {
    return (
      <EmptyState
        title="Nenhum drama em andamento"
        subtitle="Adicione dramas que você está assistindo para acompanhar seu progresso"
        actionText="Explorar Dramas"
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
        <Text style={styles.loadingText}>Carregando seus dramas...</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: { drama: Drama; userListItem: UserList } }) => (
    <ListCard
      drama={item.drama}
      userListItem={item.userListItem}
      showProgress={true}
      onProgressUpdate={(newEpisode) => handleProgressUpdate(item.drama.id, newEpisode)}
      onRemove={() => handleRemove(item.drama.id)}
      onComplete={() => handleComplete(item.drama)}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={dramaDetails || []}
        renderItem={renderItem}
        keyExtractor={(item) => item.drama.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        testID="watching-list"
      />
      
      {selectedDrama && (
        <ReviewModal
          visible={reviewModalVisible}
          onClose={() => {
            setReviewModalVisible(false);
            setSelectedDrama(null);
          }}
          dramaId={selectedDrama.id}
          dramaName={selectedDrama.name}
          onReviewSubmitted={handleReviewSubmitted}
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
});