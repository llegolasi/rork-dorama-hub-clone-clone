import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BookOpen, Check, Eye } from "lucide-react-native";

import { COLORS } from "@/constants/colors";
import { ListType } from "@/types/user";
import { useUserLists } from "@/hooks/useUserStore";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { calculateDramaTotalRuntime, getDramaDetails } from "@/services/api";
import ListManagementModal from "@/components/ListManagementModal";

interface ListToggleProps {
  dramaId: number;
  totalEpisodes?: number;
  dramaTitle?: string;
}

export default function ListToggle({ dramaId, totalEpisodes, dramaTitle }: ListToggleProps) {
  const { addToList, removeFromList, getCurrentList } = useUserLists();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showManagementModal, setShowManagementModal] = useState<boolean>(false);
  
  const currentList = getCurrentList(dramaId);
  
  const completeDramaMutation = trpc.completions.completeDrama.useMutation();
  
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
  
  const handleToggle = async (listType: ListType) => {
    // Se já está na lista, abrir modal de gerenciamento
    if (currentList === listType) {
      setShowManagementModal(true);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const wasNotCompleted = currentList !== 'completed';
      const isNowCompleted = listType === 'completed';
      
      if (currentList) {
        // Move from one list to another
        removeFromList(dramaId, currentList);
        addToList(dramaId, listType, totalEpisodes);
      } else {
        // Add to new list
        addToList(dramaId, listType, totalEpisodes);
      }
      
      // If user just completed the drama, show completion sharing modal
      if (wasNotCompleted && isNowCompleted && user) {
        // Small delay to ensure the UI updates first
        setTimeout(() => {
          handleCompletionShare();
        }, 500);
      }
    } catch (error) {
      console.error("Error toggling list:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleChangeList = async (newList: ListType) => {
    setIsLoading(true);
    
    try {
      const wasNotCompleted = currentList !== 'completed';
      const isNowCompleted = newList === 'completed';
      
      if (currentList) {
        removeFromList(dramaId, currentList);
      }
      addToList(dramaId, newList, totalEpisodes);
      
      // If user just completed the drama, show completion sharing modal
      if (wasNotCompleted && isNowCompleted && user) {
        setTimeout(() => {
          handleCompletionShare();
        }, 500);
      }
    } catch (error) {
      console.error("Error changing list:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRemoveFromList = () => {
    if (currentList) {
      removeFromList(dramaId, currentList);
    }
  };
  
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          currentList === "watching" && styles.activeButton
        ]}
        onPress={() => handleToggle("watching")}
        activeOpacity={0.7}
        testID="toggle-watching"
      >
        {currentList === "watching" ? (
          <Eye size={18} color={COLORS.text} />
        ) : (
          <Eye size={18} color={COLORS.accent} />
        )}
        <Text 
          style={[
            styles.buttonText,
            currentList === "watching" && styles.activeButtonText
          ]}
        >
          Watching
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.button,
          currentList === "watchlist" && styles.activeButton
        ]}
        onPress={() => handleToggle("watchlist")}
        activeOpacity={0.7}
        testID="toggle-watchlist"
      >
        {currentList === "watchlist" ? (
          <BookOpen size={18} color={COLORS.text} />
        ) : (
          <BookOpen size={18} color={COLORS.accent} />
        )}
        <Text 
          style={[
            styles.buttonText,
            currentList === "watchlist" && styles.activeButtonText
          ]}
        >
          Want to Watch
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.button,
          currentList === "completed" && styles.activeButton
        ]}
        onPress={() => handleToggle("completed")}
        activeOpacity={0.7}
        testID="toggle-completed"
      >
        {currentList === "completed" ? (
          <Check size={18} color={COLORS.text} />
        ) : (
          <Check size={18} color={COLORS.accent} />
        )}
        <Text 
          style={[
            styles.buttonText,
            currentList === "completed" && styles.activeButtonText
          ]}
        >
          Completed
        </Text>
      </TouchableOpacity>
      </View>
      
      {/* Completion Share Modal - DISABLED
      {user && (
        <CompletionModal
          visible={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          dramaId={dramaId}
          userName={user.displayName || user.username}
        />
      )}
      */}
      
      {currentList && (
        <ListManagementModal
          visible={showManagementModal}
          onClose={() => setShowManagementModal(false)}
          currentList={currentList}
          onChangeList={handleChangeList}
          onRemove={handleRemoveFromList}
          dramaTitle={dramaTitle}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1,
    marginHorizontal: 4,
  },
  activeButton: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  buttonText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  activeButtonText: {
    color: COLORS.text,
  },
});