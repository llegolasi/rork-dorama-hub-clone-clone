import React from "react";
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
import { DramaDetails } from "@/types/drama";
import { getDramaDetails } from "@/services/api";
import { useUserLists } from "@/hooks/useUserStore";
import { EmptyState } from "./EmptyState";
import { Play, Trash2 } from "lucide-react-native";

interface WatchlistListProps {
  dramas: UserList[];
}

export function WatchlistList({ dramas }: WatchlistListProps) {
  const { addToList, removeFromList } = useUserLists();

  const { data: dramaDetails, isLoading } = useQuery({
    queryKey: ["watchlist-dramas", dramas.map(d => d.dramaId)],
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
      return details.filter(Boolean) as { drama: DramaDetails; userListItem: UserList }[];
    },
    enabled: dramas.length > 0,
  });

  const handleMoveToWatching = (dramaId: number, totalEpisodes: number) => {
    // Remove from watchlist
    removeFromList(dramaId, "watchlist");
    // Add to watching list
    addToList(dramaId, "watching", totalEpisodes);
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Carregando sua lista...</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: { drama: DramaDetails; userListItem: UserList } }) => {
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
              <Text style={styles.overview} numberOfLines={3}>
                {item.drama.overview}
              </Text>
            )}

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => handleMoveToWatching(item.drama.id, item.drama.number_of_episodes || 16)}
                testID={`move-to-watching-${item.drama.id}`}
              >
                <Play size={16} color={COLORS.background} />
                <Text style={styles.primaryButtonText}>Começar</Text>
              </TouchableOpacity>
              
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
        testID="watchlist-list"
      />
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