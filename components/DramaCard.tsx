import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Star } from "lucide-react-native";
import OptimizedImage from './OptimizedImage';

import { COLORS } from "@/constants/colors";
import { POSTER_SIZE, TMDB_IMAGE_BASE_URL } from "@/constants/config";
import { Drama } from "@/types/drama";

interface DramaCardProps {
  drama: Drama;
  size?: "small" | "medium" | "large";
  width?: number;
}

function DramaCard({ drama, size = "medium", width }: DramaCardProps) {
  const router = useRouter();
  
  const handlePress = () => {
    console.log('DramaCard pressed:', { id: drama.id, name: drama.name });
    router.push(`/drama/${drama.id}`);
  };
  
  // Format the release year
  const releaseYear = drama.first_air_date 
    ? new Date(drama.first_air_date).getFullYear() 
    : null;
  
  // Format the rating to one decimal place
  const rating = drama.vote_average ? drama.vote_average.toFixed(1) : null;
  
  // Determine image dimensions based on size
  const getCardStyle = () => {
    const baseStyle = {
      backgroundColor: COLORS.card,
      borderRadius: 12,
      overflow: "hidden" as const,
      marginBottom: 16,
    };
    
    if (width) {
      return { ...baseStyle, width };
    }
    
    switch (size) {
      case "small":
        return { ...baseStyle, ...styles.cardSmall };
      case "large":
        return { ...baseStyle, ...styles.cardLarge };
      default:
        return { ...baseStyle, ...styles.cardMedium };
    }
  };
  
  const getImageStyle = () => {
    // Se uma largura customizada foi fornecida, calcular altura proporcionalmente
    if (width) {
      // Proporção padrão dos posters: 2:3 (largura:altura)
      const aspectRatio = 2 / 3;
      const calculatedHeight = width / aspectRatio;
      return { height: calculatedHeight };
    }
    
    switch (size) {
      case "small":
        return styles.imageSmall;
      case "large":
        return styles.imageLarge;
      default:
        return styles.imageMedium;
    }
  };
  
  const getTitleStyle = () => {
    switch (size) {
      case "small":
        return styles.titleSmall;
      case "large":
        return styles.titleLarge;
      default:
        return styles.titleMedium;
    }
  };

  return (
    <TouchableOpacity 
      style={getCardStyle()} 
      onPress={handlePress}
      activeOpacity={0.7}
      testID={`drama-card-${drama.id}`}
    >
      <OptimizedImage
        source={{ 
          uri: drama.poster_path 
            ? `${TMDB_IMAGE_BASE_URL}/${POSTER_SIZE}${drama.poster_path}` 
            : "https://via.placeholder.com/342x513/1C1C1E/8E8E93?text=No+Poster" 
        }}
        style={[styles.image, getImageStyle()]}
        contentFit="cover"
        priority={Platform.OS === 'android' ? 'low' : 'normal'}
        cachePolicy={Platform.OS === 'android' ? 'disk' : 'memory-disk'}
        placeholder="https://via.placeholder.com/342x513/1C1C1E/8E8E93?text=Loading"
      />
      
      <View style={styles.infoContainer}>
        <Text style={[styles.title, getTitleStyle()]} numberOfLines={2}>
          {drama.name}
        </Text>
        
        <View style={styles.metaContainer}>
          {releaseYear && (
            <Text style={styles.year}>{releaseYear}</Text>
          )}
          
          {rating && rating !== "0.0" && (
            <View style={styles.ratingContainer}>
              <Star size={12} color={COLORS.accent} fill={COLORS.accent} />
              <Text style={styles.rating}>{rating}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  cardSmall: {
    width: 120,
    marginRight: 12,
  },
  cardMedium: {
    width: 160,
    marginRight: 16,
  },
  cardLarge: {
    width: 180,
    marginRight: 16,
  },
  image: {
    backgroundColor: COLORS.border,
  },
  imageSmall: {
    height: 180,
  },
  imageMedium: {
    height: 240,
  },
  imageLarge: {
    height: 270,
  },
  infoContainer: {
    padding: 10,
  },
  title: {
    color: COLORS.text,
    fontWeight: "600",
  },
  titleSmall: {
    fontSize: 13,
  },
  titleMedium: {
    fontSize: 14,
  },
  titleLarge: {
    fontSize: 15,
  },
  metaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  year: {
    color: COLORS.textSecondary,
    fontSize: 12,
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
});

export default memo(DramaCard);