import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { COLORS } from "@/constants/colors";
import { UserList } from "@/types/user";
import { useUserLists } from "@/hooks/useUserStore";
import { Trash2, Settings } from "lucide-react-native";

import { EmptyState } from "./EmptyState";
import ReviewModal from "@/components/ReviewModal";
import EpisodeManagementModal from "@/components/EpisodeManagementModal";

interface WatchingListProps {
  dramas: UserList[];
}

export function WatchingList({ dramas }: WatchingListProps) {
  const { updateProgress, removeFromList, addToList, refreshUserProfile } = useUserLists();
  const [reviewModalVisible, setReviewModalVisible] = useState<boolean>(false);
  const [selectedDrama, setSelectedDrama] = useState<UserList | null>(null);
  const [showEpisodeModal, setShowEpisodeModal] = useState<boolean>(false);
  const [selectedDramaForEpisodes, setSelectedDramaForEpisodes] = useState<UserList | null>(null);
  const queryClient = useQueryClient();

  const handleProgressUpdate = async (dramaId: number, newEpisode: number) => {
    console.log(`Updating progress for drama ${dramaId} to episode ${newEpisode}`);
    try {
      await updateProgress(dramaId, newEpisode);
      console.log('Progress updated successfully, refreshing data...');
      
      // Refresh user profile data to get updated stats
      await refreshUserProfile();
      
      // Invalidate and refetch queries to refresh data immediately
      await queryClient.invalidateQueries({ queryKey: ["watching-dramas"] });
      await queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      
      // Force refetch to ensure fresh data
      await queryClient.refetchQueries({ queryKey: ["watching-dramas"] });
      
      console.log('Data refresh completed');
    } catch (error) {
      console.error('Error updating progress:', error);
      throw error;
    }
  };

  const handleRemove = (dramaId: number) => {
    removeFromList(dramaId, "watching");
  };

  const handleComplete = async (userListItem: UserList) => {
    try {
      // Mark all episodes as watched before completing
      const totalEpisodes = userListItem.total_episodes || 16;
      await updateProgress(userListItem.dramaId, totalEpisodes);
      
      setSelectedDrama(userListItem);
      setReviewModalVisible(true);
    } catch (error) {
      console.error('Error completing drama:', error);
      setSelectedDrama(userListItem);
      setReviewModalVisible(true);
    }
  };

  const handleReviewSubmitted = async () => {
    if (selectedDrama) {
      console.log('Completing drama from watching list:', selectedDrama.dramaId);
      
      try {
        // First remove from watching list
        await removeFromList(selectedDrama.dramaId, "watching");
        
        // Then add to completed list
        await addToList(selectedDrama.dramaId, "completed", selectedDrama.total_episodes || 16);
        
        console.log('Drama completion process finished successfully');
        
        // Refresh user profile data to get updated stats
        await refreshUserProfile();
        // Invalidate queries to refresh data
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



  const handleDataUpdated = async () => {
    console.log('handleDataUpdated called, refreshing all data...');
    try {
      // Refresh user profile data
      await refreshUserProfile();
      
      // Invalidate and refetch queries to refresh data immediately
      await queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      
      console.log('All data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const renderItem = ({ item }: { item: UserList }) => {
    const progressPercentage = item.current_episode && item.total_episodes
      ? (item.current_episode / item.total_episodes) * 100
      : 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/drama/${item.dramaId}`)}
        testID={`drama-card-${item.dramaId}`}
      >
        <View style={styles.cardContent}>
          {/* Drama Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.title} numberOfLines={2}>
              Drama ID: {item.dramaId}
            </Text>
            
            <Text style={styles.subtitle} numberOfLines={1}>
              {item.total_episodes || 16} episódios
            </Text>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressPercentage}%` },
                  ]}
                />
              </View>
              <View style={styles.episodeInfo}>
                <TouchableOpacity
                  style={styles.episodeButton}
                  onPress={() => handleProgressUpdate(item.dramaId, (item.current_episode || 0) + 1)}
                  testID={`episode-button-${item.dramaId}`}
                >
                  <Text style={styles.episodeText}>
                    Episódio {(item.current_episode || 0) + 1} de {item.total_episodes || 16}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.watchTimeText}>
                  {Math.round(item.watched_minutes || 0)}min assistidos
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={styles.episodeManageButton}
                onPress={() => {
                  setSelectedDramaForEpisodes(item);
                  setShowEpisodeModal(true);
                }}
                testID={`manage-episodes-${item.dramaId}`}
              >
                <Settings size={16} color={COLORS.accent} />
                <Text style={styles.episodeManageButtonText}>Episódios</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemove(item.dramaId)}
                testID={`remove-${item.dramaId}`}
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
        data={dramas}
        renderItem={renderItem}
        keyExtractor={(item) => item.dramaId.toString()}
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
          dramaId={selectedDrama.dramaId}
          dramaName={`Drama ${selectedDrama.dramaId}`}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}
      
      {selectedDramaForEpisodes && (
        <EpisodeManagementModal
          visible={showEpisodeModal}
          onClose={() => {
            setShowEpisodeModal(false);
            setSelectedDramaForEpisodes(null);
          }}
          drama={{ id: selectedDramaForEpisodes.dramaId, name: `Drama ${selectedDramaForEpisodes.dramaId}`, number_of_episodes: selectedDramaForEpisodes.total_episodes || 16 } as any}
          userListItem={selectedDramaForEpisodes}
          onProgressUpdate={(newEpisode) => handleProgressUpdate(selectedDramaForEpisodes.dramaId, newEpisode)}
          onComplete={() => handleComplete(selectedDramaForEpisodes)}
          onDataUpdated={handleDataUpdated}
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
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  episodeInfo: {
    flexDirection: "column",
    gap: 4,
  },
  episodeButton: {
    alignSelf: "flex-start",
  },
  episodeText: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: "600",
  },
  watchTimeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "400",
  },
  actionContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: "auto",
  },
  episodeManageButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.accent,
    gap: 4,
  },
  episodeManageButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.accent,
  },
  removeButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: "transparent",
    marginLeft: "auto",
  },
});