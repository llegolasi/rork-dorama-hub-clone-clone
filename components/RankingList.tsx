import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ArrowUp, Star } from "lucide-react-native";

import { COLORS } from "@/constants/colors";
import { POSTER_SIZE, TMDB_IMAGE_BASE_URL } from "@/constants/config";
import { Drama } from "@/types/drama";

import { getDramaDetails } from "@/services/api";
import { useUserRankings } from "@/hooks/useUserStore";

interface RankedDrama extends Drama {
  rank: number;
}

interface RankingListProps {
  title?: string;
  editable?: boolean;
}

export default function RankingList({ 
  title = "My Top 10 K-Dramas", 
  editable = false 
}: RankingListProps) {
  const router = useRouter();
  const { rankings } = useUserRankings();
  const [rankedDramas, setRankedDramas] = useState<RankedDrama[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  useEffect(() => {
    const fetchRankedDramas = async () => {
      setIsLoading(true);
      
      try {
        // Fetch details for each ranked drama
        const dramaPromises = rankings.map(async (ranking) => {
          const details = await getDramaDetails(ranking.dramaId);
          return {
            ...details,
            rank: ranking.rank
          };
        });
        
        const dramas = await Promise.all(dramaPromises);
        
        // Sort by rank
        dramas.sort((a, b) => a.rank - b.rank);
        
        setRankedDramas(dramas);
      } catch (error) {
        console.error("Error fetching ranked dramas:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRankedDramas();
  }, [rankings]);
  
  const handleDramaPress = (dramaId: number) => {
    router.push(`/drama/${dramaId}`);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  if (rankedDramas.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No rankings yet</Text>
        <Text style={styles.emptyText}>
          Add your favorite K-dramas to your ranking list to see them here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      <FlatList
        data={rankedDramas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.rankItem}
            onPress={() => handleDramaPress(item.id)}
            activeOpacity={0.7}
            testID={`ranked-drama-${item.id}`}
          >
            <View style={styles.rankBadge}>
              <Text style={styles.rankNumber}>{item.rank}</Text>
            </View>
            
            <Image
              source={{ 
                uri: item.poster_path 
                  ? `${TMDB_IMAGE_BASE_URL}/${POSTER_SIZE}${item.poster_path}` 
                  : "https://via.placeholder.com/92x138/1C1C1E/8E8E93?text=No+Poster" 
              }}
              style={styles.poster}
              contentFit="cover"
              transition={300}
            />
            
            <View style={styles.infoContainer}>
              <Text style={styles.dramaTitle} numberOfLines={2}>
                {item.name}
              </Text>
              
              <View style={styles.metaContainer}>
                {item.first_air_date && (
                  <Text style={styles.year}>
                    {new Date(item.first_air_date).getFullYear()}
                  </Text>
                )}
                
                {item.vote_average > 0 && (
                  <View style={styles.ratingContainer}>
                    <Star size={12} color={COLORS.accent} fill={COLORS.accent} />
                    <Text style={styles.rating}>{item.vote_average.toFixed(1)}</Text>
                  </View>
                )}
              </View>
            </View>
            
            {editable && (
              <View style={styles.dragHandle}>
                <ArrowUp size={20} color={COLORS.textSecondary} />
              </View>
            )}
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  rankItem: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    alignItems: "center",
  },
  rankBadge: {
    width: 30,
    height: 30,
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  rankNumber: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 14,
  },
  poster: {
    width: 60,
    height: 90,
    borderRadius: 8,
    marginVertical: 12,
    marginLeft: 12,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    justifyContent: "center",
  },
  dramaTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  year: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  rating: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginLeft: 4,
  },
  dragHandle: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
});