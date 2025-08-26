import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Play, Trash2, Settings } from "lucide-react-native";
import { COLORS } from "@/constants/colors";
import { Drama } from "@/types/drama";
import { UserList } from "@/types/user";
import EpisodeManagementModal from "@/components/EpisodeManagementModal";

const IMAGE_WIDTH = 80;
const IMAGE_HEIGHT = 120;

interface ListCardProps {
  drama: Drama;
  userListItem: UserList;
  showProgress?: boolean;
  onProgressUpdate?: (newEpisode: number) => Promise<void>;
  onRemove?: () => void;
  onMoveToWatching?: () => void;
  onComplete?: () => Promise<void>;
  onDataUpdated?: () => void;
}

export function ListCard({
  drama,
  userListItem,
  showProgress = false,
  onProgressUpdate,
  onRemove,
  onMoveToWatching,
  onComplete,
  onDataUpdated,
}: ListCardProps) {
  const [showEpisodeModal, setShowEpisodeModal] = useState<boolean>(false);
  
  const imageUrl = drama.poster_path
    ? `https://image.tmdb.org/t/p/w300${drama.poster_path}`
    : null;

  const year = drama.first_air_date
    ? new Date(drama.first_air_date).getFullYear()
    : "N/A";

  const handleCardPress = () => {
    router.push(`/drama/${drama.id}`);
  };



  const handleEpisodePress = (episodeNumber: number) => {
    if (onProgressUpdate) {
      onProgressUpdate(episodeNumber);
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
              <View style={styles.episodeInfo}>
                <TouchableOpacity
                  style={styles.episodeButton}
                  onPress={() => handleEpisodePress(userListItem.progress!.currentEpisode + 1)}
                  testID={`episode-button-${drama.id}`}
                >
                  <Text style={styles.episodeText}>
                    Episódio {userListItem.progress.currentEpisode + 1} de {userListItem.progress.totalEpisodes}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.watchTimeText}>
                  {Math.round((userListItem.progress.currentEpisode * (userListItem.progress.totalWatchTimeMinutes / userListItem.progress.totalEpisodes)) || 0)}min assistidos
                </Text>
              </View>
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
            
            {showProgress && onProgressUpdate && onComplete && (
              <TouchableOpacity
                style={styles.episodeManageButton}
                onPress={() => setShowEpisodeModal(true)}
                testID={`manage-episodes-${drama.id}`}
              >
                <Settings size={16} color={COLORS.accent} />
                <Text style={styles.episodeManageButtonText}>Episódios</Text>
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
      
      {showProgress && onProgressUpdate && onComplete && (
        <EpisodeManagementModal
          visible={showEpisodeModal}
          onClose={() => setShowEpisodeModal(false)}
          drama={drama}
          userListItem={userListItem}
          onProgressUpdate={onProgressUpdate}
          onComplete={onComplete}
          onDataUpdated={onDataUpdated}
        />
      )}
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
});