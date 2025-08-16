import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, Platform } from "react-native";
import { BookOpen, Check, Eye } from "lucide-react-native";

import { COLORS } from "@/constants/colors";
import { ListType } from "@/types/user";
import { useUserLists } from "@/hooks/useUserStore";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { calculateDramaTotalRuntime, getDramaDetails } from "@/services/api";
import CompletionShareModal from "@/components/CompletionShareModal";
import CompletionShareModalAndroid from "@/components/CompletionShareModal.android";

interface ListToggleProps {
  dramaId: number;
  totalEpisodes?: number;
}

export default function ListToggle({ dramaId, totalEpisodes }: ListToggleProps) {
  const { addToList, removeFromList, getCurrentList } = useUserLists();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);
  
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
      
      // Show completion modal
      setShowCompletionModal(true);
    } catch (error) {
      console.error('Error handling completion share:', error);
    }
  };
  
  const handleToggle = async (listType: ListType) => {
    setIsLoading(true);
    
    try {
      const wasNotCompleted = currentList !== 'completed';
      const isNowCompleted = listType === 'completed';
      
      if (currentList === listType) {
        // Remove from current list
        removeFromList(dramaId, listType);
      } else if (currentList) {
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
  
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  const CompletionModal = Platform.OS === 'android' ? CompletionShareModalAndroid : CompletionShareModal;
  
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
      
      {/* Completion Share Modal */}
      {user && (
        <CompletionModal
          visible={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          dramaId={dramaId}
          userName={user.displayName || user.username}
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