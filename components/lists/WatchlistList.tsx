import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { COLORS } from "@/constants/colors";
import { UserList } from "@/types/user";
import { useUserLists } from "@/hooks/useUserStore";
import { EmptyState } from "./EmptyState";
import { Play, Trash2 } from "lucide-react-native";

interface WatchlistListProps {
  dramas: UserList[];
}

export function WatchlistList({ dramas }: WatchlistListProps) {
  const { addToList, removeFromList } = useUserLists();

  const handleMoveToWatching = (userListItem: UserList) => {
    // Remove from watchlist
    removeFromList(userListItem.dramaId, "watchlist");
    // Add to watching list
    addToList(userListItem.dramaId, "watching", userListItem.total_episodes || 16);
  };

  const handleRemove = (dramaId: number) => {
    removeFromList(dramaId, "watchlist");
  };

  if (dramas.length === 0) {
    return (
      <EmptyState
        title="Sua lista está vazia"
        subtitle="Adicione dramas que você quer assistir para não esquecer"
        actionText="Descobrir Dramas"
        icon="search"
        onAction={() => {
          // Navigate to discover or search
        }}
      />
    );
  }



  const renderItem = ({ item }: { item: UserList }) => {
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

            <Text style={styles.addedDate} numberOfLines={1}>
              Adicionado em: {new Date(item.addedAt).toLocaleDateString('pt-BR')}
            </Text>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => handleMoveToWatching(item)}
                testID={`move-to-watching-${item.dramaId}`}
              >
                <Play size={16} color={COLORS.background} />
                <Text style={styles.primaryButtonText}>Começar</Text>
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
        testID="watchlist-list"
      />
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
  addedDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  actionContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: "auto",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    gap: 4,
  },
  primaryButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.background,
  },
  removeButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: "transparent",
    marginLeft: "auto",
  },
});