import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { COLORS } from "@/constants/colors";
import { ListType } from "@/types/user";
import { useUserLists } from "@/hooks/useUserStore";
import { useAuth } from "@/hooks/useAuth";
import { Bookmark, BookmarkCheck, Plus, X, Eye } from "lucide-react-native";
import { trpc } from "@/lib/trpc";
import { calculateDramaTotalRuntime, getDramaDetails } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import CompletionShareModal from "@/components/CompletionShareModal";
import CompletionShareModalAndroid from "@/components/CompletionShareModal.android";
import CompleteDramaModal from "@/components/CompleteDramaModal";

interface ListToggleProps {
  dramaId: number;
  totalEpisodes?: number;
  size?: "small" | "medium" | "large";
}

export function ListToggle({ 
  dramaId, 
  totalEpisodes = 16, 
  size = "medium" 
}: ListToggleProps) {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);
  const [showCompleteDramaModal, setShowCompleteDramaModal] = useState<boolean>(false);
  const { addToList, removeFromList, getCurrentList, deleteUserReview, refreshUserProfile } = useUserLists();
  const { user } = useAuth();
  
  const completeDramaMutation = trpc.completions.completeDrama.useMutation();

  // Fetch drama details for the modal
  const { data: dramaDetails } = useQuery({
    queryKey: ["drama-details", dramaId],
    queryFn: () => getDramaDetails(dramaId),
    enabled: !!dramaId,
  });

  const currentList = getCurrentList(dramaId);
  const isInAnyList = currentList !== null;

  const handleToggle = () => {
    if (isInAnyList) {
      if (currentList === 'completed' || currentList === 'watching') {
        Alert.alert(
          'Remover da lista',
          'Se você remover este dorama de Concluído ou Assistindo, suas avaliações serão deletadas. Deseja continuar?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Remover', style: 'destructive', onPress: async () => {
              await deleteUserReview(dramaId);
              await removeFromList(dramaId, currentList!);
            } }
          ]
        );
      } else {
        removeFromList(dramaId, currentList!);
      }
    } else {
      setShowModal(true);
    }
  };

  const handleCompletionShare = async () => {
    if (!user) return;
    
    try {
      console.log('Handling completion share for drama:', dramaId);
      
      // Get drama details and calculate runtime
      const [dramaDetails, totalRuntimeMinutes] = await Promise.all([
        getDramaDetails(dramaId),
        calculateDramaTotalRuntime(dramaId),
      ]);
      
      // Save completion to database
      await completeDramaMutation.mutateAsync({
        dramaId,
        dramaName: dramaDetails.name,
        totalRuntimeMinutes,
      });
      
      // Show completion modal - DISABLED
      // setShowCompletionModal(true);
    } catch (error) {
      console.error('Error handling completion share:', error);
    }
  };

  const handleAddToList = async (listType: ListType) => {
    const wasNotCompleted = getCurrentList(dramaId) !== 'completed';
    const isNowCompleted = listType === 'completed';
    
    setShowModal(false);
    
    // If user is marking as completed directly, show the complete drama modal
    if (isNowCompleted && wasNotCompleted) {
      setShowCompleteDramaModal(true);
      return;
    }
    
    // For other list types, add directly
    addToList(dramaId, listType, listType === "watching" ? totalEpisodes : undefined);
  };

  const handleCompleteDramaSuccess = async () => {
    // This will be called after the CompleteDramaModal successfully completes the drama
    setShowCompleteDramaModal(false);
    
    // Refresh user profile to update the button state
    await refreshUserProfile();
    
    // Show completion sharing modal
    if (user) {
      setTimeout(() => {
        handleCompletionShare();
      }, 500);
    }
  };

  const getButtonStyle = () => {
    switch (size) {
      case "small":
        return styles.buttonSmall;
      case "large":
        return styles.buttonLarge;
      default:
        return styles.buttonMedium;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case "small":
        return 16;
      case "large":
        return 24;
      default:
        return 20;
    }
  };

  const getTextStyle = () => {
    switch (size) {
      case "small":
        return styles.textSmall;
      case "large":
        return styles.textLarge;
      default:
        return styles.textMedium;
    }
  };

  const getListDisplayName = (listType: ListType) => {
    switch (listType) {
      case "watching":
        return "Assistindo";
      case "watchlist":
        return "Quero Assistir";
      case "completed":
        return "Concluído";
      default:
        return "";
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.button,
          getButtonStyle(),
          size === "large" && styles.buttonFullWidth,
          currentList === "watching" && styles.buttonWatching,
          currentList === "watchlist" && styles.buttonWatchlist,
          currentList === "completed" && styles.buttonCompleted,
        ]}
        onPress={handleToggle}
        testID={`list-toggle-${dramaId}`}
      >
        {currentList === "watching" ? (
          <Eye 
            size={getIconSize()} 
            color={COLORS.text} 
          />
        ) : currentList === "watchlist" ? (
          <Bookmark 
            size={getIconSize()} 
            color={COLORS.text} 
          />
        ) : currentList === "completed" ? (
          <BookmarkCheck 
            size={getIconSize()} 
            color={COLORS.text} 
            fill={COLORS.text}
          />
        ) : (
          <Bookmark 
            size={getIconSize()} 
            color={COLORS.accent} 
          />
        )}
        
        {size !== "small" && (
          <Text style={[styles.buttonText, getTextStyle()]}>
            {isInAnyList ? getListDisplayName(currentList!) : "Adicionar à Lista"}
          </Text>
        )}
      </TouchableOpacity>

      {/* List Selection Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adicionar à Lista</Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.closeButton}
                testID="close-modal"
              >
                <X size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.listOptions}>
              <TouchableOpacity
                style={styles.listOption}
                onPress={() => handleAddToList("watchlist")}
                testID="add-to-watchlist"
              >
                <Bookmark size={20} color={COLORS.accent} />
                <View style={styles.listOptionText}>
                  <Text style={styles.listOptionTitle}>Quero Assistir</Text>
                  <Text style={styles.listOptionSubtitle}>
                    Adicionar à sua lista de desejos
                  </Text>
                </View>
                <Plus size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.listOption}
                onPress={() => handleAddToList("watching")}
                testID="add-to-watching"
              >
                <BookmarkCheck size={20} color={COLORS.accent} />
                <View style={styles.listOptionText}>
                  <Text style={styles.listOptionTitle}>Estou Assistindo</Text>
                  <Text style={styles.listOptionSubtitle}>
                    Começar a acompanhar o progresso
                  </Text>
                </View>
                <Plus size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.listOption}
                onPress={() => handleAddToList("completed")}
                testID="add-to-completed"
              >
                <BookmarkCheck size={20} color={COLORS.accent} fill={COLORS.accent} />
                <View style={styles.listOptionText}>
                  <Text style={styles.listOptionTitle}>Concluído</Text>
                  <Text style={styles.listOptionSubtitle}>
                    Marcar como assistido completamente
                  </Text>
                </View>
                <Plus size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
      
      {/* Complete Drama Modal */}
      <CompleteDramaModal
        visible={showCompleteDramaModal}
        onClose={() => setShowCompleteDramaModal(false)}
        dramaId={dramaId}
        dramaName={dramaDetails?.name || `Drama ${dramaId}`}
        totalEpisodes={totalEpisodes}
        onSuccess={handleCompleteDramaSuccess}
        posterPath={dramaDetails?.poster_path || undefined}
        posterImage={dramaDetails?.poster_path || undefined}
        dramaYear={dramaDetails?.first_air_date ? new Date(dramaDetails.first_air_date).getFullYear() : undefined}
        totalRuntimeMinutes={dramaDetails ? (dramaDetails.number_of_episodes || totalEpisodes) * (dramaDetails.episode_run_time?.[0] || 60) : undefined}
        episodeRuntimeMinutes={dramaDetails?.episode_run_time?.[0] || 60}
      />
      
      {/* Completion Share Modal - DISABLED
      {user && (
        <>  
          {Platform.OS === 'android' ? (
            <CompletionShareModalAndroid
              visible={showCompletionModal}
              onClose={() => setShowCompletionModal(false)}
              dramaId={dramaId}
              userName={user.displayName || user.username}
            />
          ) : (
            <CompletionShareModal
              visible={showCompletionModal}
              onClose={() => setShowCompletionModal(false)}
              dramaId={dramaId}
              userName={user.displayName || user.username}
            />
          )}
        </>
      )}
      */}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonSmall: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  buttonMedium: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonLarge: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonFullWidth: {
    width: "100%",
  },
  buttonWatching: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  buttonWatchlist: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  buttonCompleted: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  buttonText: {
    color: COLORS.text,
    fontWeight: "500",
    marginLeft: 8,
  },
  textSmall: {
    fontSize: 12,
  },
  textMedium: {
    fontSize: 14,
  },
  textLarge: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    padding: 0,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  listOptions: {
    padding: 20,
  },
  listOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    marginBottom: 12,
  },
  listOptionText: {
    flex: 1,
    marginLeft: 12,
  },
  listOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  listOptionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});