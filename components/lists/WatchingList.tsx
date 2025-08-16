import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { COLORS } from "@/constants/colors";
import { UserList } from "@/types/user";
import { Drama, DramaDetails } from "@/types/drama";
import { getDramaDetails, calculateDramaTotalRuntime } from "@/services/api";
import { useUserLists } from "@/hooks/useUserStore";
import { trpc } from "@/lib/trpc";
import { ListCard } from "./ListCard";
import { EmptyState } from "./EmptyState";
import ReviewModal from "@/components/ReviewModal";

interface WatchingListProps {
  dramas: UserList[];
}

export function WatchingList({ dramas }: WatchingListProps) {
  const { updateProgress, removeFromList, addToList, refreshUserProfile } = useUserLists();
  const [reviewModalVisible, setReviewModalVisible] = useState<boolean>(false);
  const [selectedDrama, setSelectedDrama] = useState<DramaDetails | null>(null);
  const queryClient = useQueryClient();

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

  const handleProgressUpdate = async (dramaId: number, newEpisode: number) => {
    console.log(`Updating progress for drama ${dramaId} to episode ${newEpisode}`);
    try {
      await updateProgress(dramaId, newEpisode);
      // Refresh user profile data to get updated stats
      await refreshUserProfile();
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["watching-dramas"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
    } catch (error) {
      console.error('Error updating progress:', error);
      throw error;
    }
  };

  const handleRemove = (dramaId: number) => {
    removeFromList(dramaId, "watching");
  };

  const handleComplete = async (drama: Drama) => {
    try {
      // Get full drama details to have number_of_episodes
      const dramaDetails = await getDramaDetails(drama.id);
      
      // Mark all episodes as watched before completing
      const totalEpisodes = dramaDetails.number_of_episodes || 16;
      await updateProgress(drama.id, totalEpisodes);
      
      setSelectedDrama(dramaDetails);
      setReviewModalVisible(true);
    } catch (error) {
      console.error('Error fetching drama details for completion:', error);
      // Fallback to basic drama info
      setSelectedDrama(drama as DramaDetails);
      setReviewModalVisible(true);
    }
  };

  const completeDramaMutation = trpc.completions.completeDrama.useMutation();

  const handleReviewSubmitted = async () => {
    if (selectedDrama) {
      console.log('Completing drama from watching list:', selectedDrama.id);
      
      try {
        // Calculate total runtime
        const totalRuntimeMinutes = await calculateDramaTotalRuntime(selectedDrama.id);
        console.log(`Calculated runtime for drama ${selectedDrama.id}: ${totalRuntimeMinutes} minutes`);
        
        // First remove from watching list
        await removeFromList(selectedDrama.id, "watching");
        
        // Then add to completed list with proper metadata
        await addToList(selectedDrama.id, "completed", selectedDrama.number_of_episodes, {
          name: selectedDrama.name,
          poster_path: selectedDrama.poster_path,
          first_air_date: selectedDrama.first_air_date,
          number_of_episodes: selectedDrama.number_of_episodes
        });
        
        // Call the completion procedure to update stats and create completion record
        await completeDramaMutation.mutateAsync({
          dramaId: selectedDrama.id,
          dramaName: selectedDrama.name,
          totalRuntimeMinutes,
        });
        
        console.log('Drama completion process finished successfully');
        
        // Refresh user profile data to get updated stats
        await refreshUserProfile();
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["watching-dramas"] });
        queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      } catch (error) {
        console.error('Error completing drama:', error);
        throw error;
      }
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

  const handleDataUpdated = () => {
    // Refresh user profile data
    refreshUserProfile();
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ["watching-dramas"] });
    queryClient.invalidateQueries({ queryKey: ["user-stats"] });
  };

  const renderItem = ({ item }: { item: { drama: Drama; userListItem: UserList } }) => (
    <ListCard
      drama={item.drama}
      userListItem={item.userListItem}
      showProgress={true}
      onProgressUpdate={(newEpisode) => handleProgressUpdate(item.drama.id, newEpisode)}
      onRemove={() => handleRemove(item.drama.id)}
      onComplete={() => handleComplete(item.drama)}
      onDataUpdated={handleDataUpdated}
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