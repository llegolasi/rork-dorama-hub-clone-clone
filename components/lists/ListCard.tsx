import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Play, Check, Trash2 } from "lucide-react-native";
import { COLORS } from "@/constants/colors";
import { Drama } from "@/types/drama";
import { UserList } from "@/types/user";

const IMAGE_WIDTH = 80;
const IMAGE_HEIGHT = 120;

interface ListCardProps {
  drama: Drama;
  userListItem: UserList;
  showProgress?: boolean;
  onProgressUpdate?: (newEpisode: number) => void;
  onRemove?: () => void;
  onMoveToWatching?: () => void;
  onComplete?: () => void;
}

export function ListCard({
  drama,
  userListItem,
  showProgress = false,
  onProgressUpdate,
  onRemove,
  onMoveToWatching,
  onComplete,
}: ListCardProps) {
  const imageUrl = drama.poster_path
    ? `https://image.tmdb.org/t/p/w300${drama.poster_path}`
    : null;

  const year = drama.first_air_date
    ? new Date(drama.first_air_date).getFullYear()
    : "N/A";

  const handleCardPress = () => {
    router.push(`/drama/${drama.id}`);
  };

  const handleProgressPress = () => {
    if (userListItem.progress && onProgressUpdate) {
      const nextEpisode = userListItem.progress.currentEpisode + 1;
      if (nextEpisode <= userListItem.progress.totalEpisodes) {
        onProgressUpdate(nextEpisode);
      }
    }
  };

  const progressPercentage = userListItem.progress
    ? (userListItem.progress.currentEpisode / userListItem.progress.totalEpisodes) * 100
    : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handleCardPress}
      testID={`drama-card-${drama.id}`}
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
            {drama.name}
          </Text>
          
          <Text style={styles.subtitle} numberOfLines={1}>
            {year} • {drama.origin_country.join(", ")}
          </Text>

          {drama.overview && (
            <Text style={styles.overview} numberOfLines={3}>
              {drama.overview}
            </Text>
          )}

          {/* Progress Bar for Watching List */}
          {showProgress && userListItem.progress && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressPercentage}%` },
                  ]}
                />
              </View>
              <TouchableOpacity
                style={styles.progressButton}
                onPress={handleProgressPress}
                testID={`progress-button-${drama.id}`}
              >
                <Text style={styles.progressText}>
                  Episódio {userListItem.progress.currentEpisode}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            {onMoveToWatching && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onMoveToWatching}
                testID={`move-to-watching-${drama.id}`}
              >
                <Play size={16} color={COLORS.background} />
                <Text style={styles.primaryButtonText}>Começar</Text>
              </TouchableOpacity>
            )}
            
            {onComplete && (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={onComplete}
                testID={`complete-${drama.id}`}
              >
                <Check size={16} color={COLORS.background} />
                <Text style={styles.completeButtonText}>Concluir</Text>
              </TouchableOpacity>
            )}
            
            {onRemove && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={onRemove}
                testID={`remove-${drama.id}`}
              >
                <Trash2 size={14} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
  progressButton: {
    alignSelf: "flex-start",
  },
  progressText: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: "500",
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
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#10B981",
    gap: 4,
  },
  completeButtonText: {
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